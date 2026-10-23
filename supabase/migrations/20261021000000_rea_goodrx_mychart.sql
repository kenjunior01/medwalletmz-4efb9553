-- ═══════════════════════════════════════════════════════════════════════════
-- F46 — REA GoodRx + MyChart/Epic (padrões dos melhores do mundo)
-- ═══════════════════════════════════════════════════════════════════════════
-- 1) compare_med_prices(p_query, p_country_id, p_limit)  — padrão GOODRX:
--    transparência total de preços de medicamentos. Procura o medicamento em
--    TODAS as farmácias activas, devolve a MELHOR oferta por farmácia
--    (DISTINCT ON), estatísticas (mínimo/médio/máximo + poupança %) e o preço
--    de referência MISAU/WHO do catálogo essential_medicines quando existe
--    correspondência. Leitura pública (dados já públicos via RLS).
-- 2) health_timeline(p_limit)  — padrão MYCHART: linha temporal única com
--    tudo o que aconteceu ao paciente: consultas, análises (com estado do
--    resultado), prescrições, registos clínicos e entradas do diário.
--    SECURITY DEFINER com auth.uid() — o paciente só vê a sua vida.
-- 3) Índices trigram (pg_trgm) para pesquisa ILIKE '%...%' rápida.
--    Envolvido em DO/EXCEPTION: se a extensão não estiver disponível,
--    tudo continua a funcionar (só perde performance).
--
-- Idempotente: CREATE OR REPLACE / IF NOT EXISTS — seguro para re-executar.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. compare_med_prices() — Comparador de Preços (padrão GoodRx)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compare_med_prices(
  p_query      text,
  p_country_id text    DEFAULT NULL,
  p_limit      integer DEFAULT 30
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q            text := COALESCE(trim(p_query), '');
  v_offers     json;
  v_count      integer;
  v_lowest     numeric;
  v_highest    numeric;
  v_avg        numeric;
  v_savings    integer;
  v_ref_saving integer;
  v_med        record;
BEGIN
  IF length(q) < 2 THEN
    RETURN json_build_object('success', false, 'error', 'query_too_short');
  END IF;

  -- Melhor oferta por farmácia (DISTINCT ON store), depois ordenada por preço
  WITH best AS (
    SELECT DISTINCT ON (s.id)
           p.id AS product_id, p.name AS product_name, p.price, p.image_url,
           p.category,
           s.id AS store_id, s.name AS store_name, s.city, s.rating,
           s.delivery_fee, s.delivery_time, s.image_url AS store_image
      FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
     WHERE s.type = 'pharmacy'
       AND COALESCE(s.is_active, true)
       AND COALESCE(p.is_available, true)
       AND (p.name ILIKE '%' || q || '%'
            OR COALESCE(p.description, '') ILIKE '%' || q || '%'
            OR COALESCE(p.category, '') ILIKE '%' || q || '%')
       AND (p_country_id IS NULL OR s.country_id = p_country_id)
     ORDER BY s.id, p.price ASC
  ),
  ranked AS (
    SELECT * FROM best
     ORDER BY price ASC
     LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 30), 50))
  )
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json),
         (SELECT COUNT(*)  FROM best),
         (SELECT MIN(price) FROM best),
         (SELECT MAX(price) FROM best),
         (SELECT ROUND(AVG(price), 2) FROM best)
    INTO v_offers, v_count, v_lowest, v_highest, v_avg
  FROM ranked t;

  IF v_count IS NULL OR v_count = 0 THEN
    RETURN json_build_object(
      'success', true,
      'query', q,
      'offers', '[]'::json,
      'stats', json_build_object('count', 0));
  END IF;

  IF v_highest > 0 AND v_highest > v_lowest THEN
    v_savings := ROUND((v_highest - v_lowest) * 100.0 / v_highest);
  END IF;

  -- Preço de referência MISAU/WHO (catálogo de medicamentos essenciais)
  BEGIN
    SELECT name, generic_name, form, strength, reference_price_mzn
      INTO v_med
      FROM public.essential_medicines
     WHERE (name ILIKE '%' || q || '%' OR generic_name ILIKE '%' || q || '%')
       AND (p_country_id IS NULL OR country_id = p_country_id)
     ORDER BY length(name) ASC
     LIMIT 1;

    IF FOUND AND v_med.reference_price_mzn IS NOT NULL
       AND v_med.reference_price_mzn > 0 AND v_lowest < v_med.reference_price_mzn THEN
      v_ref_saving := ROUND((v_med.reference_price_mzn - v_lowest) * 100.0
                            / v_med.reference_price_mzn);
    END IF;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    -- Catálogo indisponível nesta BD — segue sem referência (não quebra)
    v_med := NULL;
  END;

  RETURN json_build_object(
    'success', true,
    'query', q,
    'offers', v_offers,
    'stats', json_build_object(
      'count',     v_count,
      'lowest',    v_lowest,
      'highest',   v_highest,
      'average',   v_avg,
      'savings_pct', COALESCE(v_savings, 0)),
    'reference', CASE WHEN v_med IS NOT NULL THEN json_build_object(
      'name', v_med.name,
      'generic_name', v_med.generic_name,
      'form', v_med.form,
      'strength', v_med.strength,
      'reference_price_mzn', v_med.reference_price_mzn,
      'savings_vs_reference_pct', COALESCE(v_ref_saving, 0)) END);
END;
$$;

GRANT EXECUTE ON FUNCTION public.compare_med_prices(text, text, integer) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. health_timeline() — Linha Temporal de Saúde (padrão MyChart)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.health_timeline(p_limit integer DEFAULT 60)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user  uuid := auth.uid();
  v_items json;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  BEGIN
    WITH events AS (
      SELECT 'consultation' AS kind,
             'Consulta ' || COALESCE(c.consultation_type, '') AS title,
             COALESCE(NULLIF(trim(COALESCE(c.reason, '')), ''),
                      'Consulta na MedWallet') AS detail,
             COALESCE(c.scheduled_at, c.created_at) AS at,
             json_build_object('status', COALESCE(c.status, ''),
                               'fee', COALESCE(c.fee, 0)) AS meta
        FROM public.consultations c
       WHERE c.patient_id = v_user
      UNION ALL
      SELECT 'lab',
             'Análises clínicas',
             COALESCE(cl.name, 'Laboratório') || ' · ' || COALESCE(lo.status, ''),
             lo.created_at,
             json_build_object('status', COALESCE(lo.status, ''),
                               'total', COALESCE(lo.total_mzn, 0),
                               'has_result', lo.result_uploaded_at IS NOT NULL)
        FROM public.lab_exam_orders lo
        LEFT JOIN public.clinics cl ON cl.id = lo.lab_id
       WHERE lo.user_id = v_user
      UNION ALL
      SELECT 'prescription',
             'Prescrição médica',
             COALESCE(NULLIF(trim(COALESCE(pr.notes, '')), ''),
                      'Receita emitida pelo médico'),
             pr.created_at,
             json_build_object('status', COALESCE(pr.status, ''))
        FROM public.prescriptions pr
       WHERE pr.patient_id = v_user
      UNION ALL
      SELECT 'record',
             COALESCE(mr.title, 'Registo clínico'),
             COALESCE(mr.description, mr.record_type, ''),
             COALESCE(mr.issued_at::timestamptz, mr.created_at),
             json_build_object('record_type', COALESCE(mr.record_type, ''),
                               'file_url', COALESCE(mr.file_url, ''))
        FROM public.medical_records mr
       WHERE mr.patient_id = v_user
      UNION ALL
      SELECT 'journal',
             'Diário de saúde',
             CASE WHEN hj.mood IS NOT NULL
                  THEN 'Humor ' || hj.mood::text || '/5'
                  ELSE 'Entrada do diário' END
             || COALESCE(' · ' || NULLIF(trim(COALESCE(hj.notes, '')), ''), ''),
             hj.entry_date::timestamptz,
             json_build_object('mood', COALESCE(hj.mood, 0),
                               'energy', COALESCE(hj.energy, 0))
        FROM public.health_journal hj
       WHERE hj.user_id = v_user
    )
    SELECT COALESCE(
             json_agg(json_build_object(
               'kind', e.kind, 'title', e.title, 'detail', e.detail,
               'at', e.at, 'meta', e.meta) ORDER BY e.at DESC),
             '[]'::json)
      INTO v_items
    FROM (
      SELECT * FROM events
       ORDER BY at DESC
       LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 60), 200))
    ) e;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    RETURN json_build_object('success', false, 'error', 'schema_missing',
                             'items', '[]'::json);
  END;

  RETURN json_build_object('success', true, 'items', v_items);
END;
$$;

GRANT EXECUTE ON FUNCTION public.health_timeline(integer) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Índices trigram para pesquisa rápida (opcional — falha suave)
-- ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_products_name_trgm
             ON public.products USING gin (name gin_trgm_ops)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_essmed_name_trgm
             ON public.essential_medicines USING gin (name gin_trgm_ops)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_essmed_generic_trgm
             ON public.essential_medicines USING gin (generic_name gin_trgm_ops)';
EXCEPTION WHEN OTHERS THEN
  -- Sem pg_trgm tudo continua a funcionar (só perde performance na pesquisa)
  NULL;
END $$;
