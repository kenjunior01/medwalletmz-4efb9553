-- ═══════════════════════════════════════════════════════════════════════════
-- F47 — REA mPharma (padrão do melhor do mundo em acesso a medicamentos)
-- ═══════════════════════════════════════════════════════════════════════════
-- mPharma ganhou fama por responder UMA pergunta que ninguém respondia em
-- África: "ESTE medicamento existe em stock AGORA, onde e porquanto?"
-- Este bloco traz esse padrão para a MedWallet:
--
-- 1) products.stock_quantity (integer, nullable)
--    null = farmácia não controla stock (cai para is_available);
--    0 = esgotado; 1-5 = últimas unidades; >5 = em stock.
--
-- 2) med_availability(p_query, p_city, p_country_id, p_limit)
--    "Onde há stock?" — por farmácia: estado do stock, preço, cidade,
--    tempo de entrega + estatísticas + alternativas do catálogo MISAU/WHO
--    (mesmo genérico) quando a pesquisa corresponde a um medicamento essencial.
--
-- 3) med_reservations + reserve_med_pickup()
--    Padrão mPharma "reserva para levantar": o paciente reserva o medicamento
--    na farmácia, recebe um CÓDIGO de levantamento e a reserva vale 24h.
--    Stock é decrementado na reserva e reposto no cancelamento/expiração.
--
-- 4) price_watch + add/remove/my_price_watches + check_price_watches()
--    Padrão GoodRx Price Alert: vigiar um medicamento e saber quando o melhor
--    preço desce abaixo do alvo. (Consultável na página; sem infra de push.)
--
-- 5) expire_reservations()
--    Expira reservas vencidas (24h) e repõe o stock — chamada lazy pelas RPCs.
--
-- Segurança: RLS own-only nas novas tabelas (dono da loja vê reservas da sua
-- loja); RPCs SECURITY DEFINER com auth.uid(); GRANTs com ASSINATURAS
-- COMPLETAS (lição do erro 42883).
-- Idempotente: IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Coluna de stock nos produtos
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_quantity integer;

COMMENT ON COLUMN public.products.stock_quantity IS
  'F47 (mPharma): quantidade em stock. NULL = não controlado (usa is_available); 0 = esgotado; 1-5 = últimas unidades; >5 = em stock.';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Tabela med_reservations (reserva para levantar — padrão mPharma)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.med_reservations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id     UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  quantity     integer NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 10),
  status       text NOT NULL DEFAULT 'reserved'
               CHECK (status IN ('reserved','ready','collected','cancelled','expired')),
  pickup_code  text NOT NULL,
  price_at_reservation numeric(12,2),
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  resolved_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_medres_user     ON public.med_reservations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medres_store    ON public.med_reservations(store_id, status);
CREATE INDEX IF NOT EXISTS idx_medres_open     ON public.med_reservations(expires_at)
  WHERE status IN ('reserved','ready');
CREATE UNIQUE INDEX IF NOT EXISTS uq_medres_pickup_code ON public.med_reservations(pickup_code);

ALTER TABLE public.med_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "medres select own" ON public.med_reservations;
CREATE POLICY "medres select own" ON public.med_reservations
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR store_id IN (SELECT s.id FROM public.stores s WHERE s.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "medres insert own" ON public.med_reservations;
CREATE POLICY "medres insert own" ON public.med_reservations
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "medres update own" ON public.med_reservations;
CREATE POLICY "medres update own" ON public.med_reservations
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR store_id IN (SELECT s.id FROM public.stores s WHERE s.owner_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE ON public.med_reservations TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Tabela price_watch (vigiar preço — padrão GoodRx Price Alert)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.price_watch (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  query             text NOT NULL CHECK (length(trim(query)) >= 2),
  target_price      numeric(12,2),
  country_id        text,
  active            boolean NOT NULL DEFAULT true,
  last_lowest_price numeric(12,2),
  last_checked_at   timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pricewatch_user_query
  ON public.price_watch(user_id, lower(trim(query)));
CREATE INDEX IF NOT EXISTS idx_pricewatch_user ON public.price_watch(user_id, created_at DESC);

ALTER TABLE public.price_watch ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricewatch all own" ON public.price_watch;
CREATE POLICY "pricewatch all own" ON public.price_watch
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_watch TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. med_availability() — "Onde há stock?" (padrão mPharma)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.med_availability(
  p_query      text,
  p_city       text    DEFAULT NULL,
  p_country_id text    DEFAULT NULL,
  p_limit      integer DEFAULT 40
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q             text := COALESCE(trim(p_query), '');
  v_offers      json;
  v_count       integer;
  v_in_stock    integer;
  v_lowest      numeric;
  v_ref         record;
  v_alts        json := '[]'::json;
BEGIN
  IF length(q) < 2 THEN
    RETURN json_build_object('success', false, 'error', 'query_too_short');
  END IF;

  WITH best AS (
    SELECT DISTINCT ON (s.id)
           p.id AS product_id, p.name AS product_name, p.price,
           p.image_url, p.category, p.stock_quantity,
           CASE
             WHEN p.stock_quantity IS NOT NULL AND p.stock_quantity <= 0 THEN 'out_of_stock'
             WHEN p.stock_quantity IS NOT NULL AND p.stock_quantity <= 5 THEN 'low_stock'
             WHEN COALESCE(p.is_available, true) THEN 'in_stock'
             ELSE 'out_of_stock'
           END AS stock_status,
           s.id AS store_id, s.name AS store_name, s.city, s.phone,
           s.rating, s.delivery_fee, s.delivery_time
      FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
     WHERE s.type = 'pharmacy'
       AND COALESCE(s.is_active, true)
       AND (p.name ILIKE '%' || q || '%'
            OR COALESCE(p.description, '') ILIKE '%' || q || '%'
            OR COALESCE(p.category, '') ILIKE '%' || q || '%')
       AND (p_city IS NULL OR p_city = '' OR s.city ILIKE '%' || p_city || '%')
       AND (p_country_id IS NULL OR s.country_id = p_country_id)
     ORDER BY s.id,
              (CASE
                 WHEN p.stock_quantity IS NOT NULL AND p.stock_quantity <= 0 THEN 1
                 WHEN COALESCE(p.is_available, true) THEN 0
                 ELSE 1
               END) ASC,
              p.price ASC
  ),
  ranked AS (
    SELECT * FROM best
     ORDER BY (stock_status = 'out_of_stock') ASC, price ASC
     LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 40), 60))
  )
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json),
           (SELECT COUNT(*) FROM best),
           (SELECT COUNT(*) FROM best WHERE stock_status <> 'out_of_stock'),
           (SELECT MIN(price) FROM best WHERE stock_status <> 'out_of_stock')
    INTO v_offers, v_count, v_in_stock, v_lowest
  FROM ranked t;

  -- Alternativas: mesmo genérico no catálogo MISAU/WHO (padrão mPharma de
  -- sugerir equivalente quando falta o medicamento pedido)
  BEGIN
    SELECT * INTO v_ref
      FROM public.essential_medicines
     WHERE (name ILIKE '%' || q || '%' OR COALESCE(generic_name, '') ILIKE '%' || q || '%')
       AND (p_country_id IS NULL OR country_id = p_country_id)
     ORDER BY length(name) ASC
     LIMIT 1;

    IF FOUND AND v_ref.generic_name IS NOT NULL THEN
      WITH alt AS (
        SELECT DISTINCT ON (em.id)
               em.name, em.generic_name, em.form, em.strength,
               em.reference_price_mzn
          FROM public.essential_medicines em
         WHERE em.generic_name = v_ref.generic_name
           AND em.name <> v_ref.name
           AND (p_country_id IS NULL OR em.country_id = p_country_id)
         ORDER BY em.id, em.reference_price_mzn ASC NULLS LAST
         LIMIT 5
      )
      SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json) INTO v_alts FROM alt a;
    END IF;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_ref := NULL;
    v_alts := '[]'::json;
  END;

  RETURN json_build_object(
    'success', true,
    'query', q,
    'offers', v_offers,
    'stats', json_build_object(
      'count', v_count,
      'pharmacies_with_stock', COALESCE(v_in_stock, 0),
      'lowest_available', v_lowest),
    'reference', CASE WHEN v_ref IS NOT NULL THEN json_build_object(
      'name', v_ref.name,
      'generic_name', v_ref.generic_name,
      'form', v_ref.form,
      'strength', v_ref.strength,
      'reference_price_mzn', v_ref.reference_price_mzn) END,
    'alternatives', v_alts);
END;
$$;

GRANT EXECUTE ON FUNCTION public.med_availability(text, text, text, integer) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. expire_reservations() — expira vencidas e repõe stock (helper interno)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.expire_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  WITH expired AS (
    UPDATE public.med_reservations
       SET status = 'expired', resolved_at = now()
     WHERE status IN ('reserved','ready')
       AND expires_at < now()
    RETURNING product_id, quantity
  ), restored AS (
    UPDATE public.products p
       SET stock_quantity = COALESCE(p.stock_quantity, 0) + e.quantity
      FROM expired e
     WHERE p.id = e.product_id
       AND p.stock_quantity IS NOT NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM restored;
  RETURN v_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. reserve_med_pickup() — reservar para levantar (mPharma "pele já")
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reserve_med_pickup(
  p_product_id uuid,
  p_quantity   integer DEFAULT 1
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user      uuid := auth.uid();
  v_qty       integer := GREATEST(1, LEAST(COALESCE(p_quantity, 1), 10));
  v_prod      record;
  v_code      text;
  v_res       public.med_reservations;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Expira reservas vencidas antes de contabilizar stock
  PERFORM public.expire_reservations();

  SELECT p.id, p.name, p.price, p.stock_quantity, COALESCE(p.is_available, true) AS is_available,
         s.id AS store_id, s.name AS store_name, s.city, s.phone, s.type
    INTO v_prod
    FROM public.products p
    JOIN public.stores s ON s.id = p.store_id
   WHERE p.id = p_product_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'product_not_found');
  END IF;
  IF v_prod.type <> 'pharmacy' THEN
    RETURN json_build_object('success', false, 'error', 'not_a_pharmacy');
  END IF;
  IF NOT v_prod.is_available THEN
    RETURN json_build_object('success', false, 'error', 'out_of_stock');
  END IF;
  IF v_prod.stock_quantity IS NOT NULL AND v_prod.stock_quantity < v_qty THEN
    RETURN json_build_object(
      'success', false, 'error', 'insufficient_stock',
      'available', COALESCE(v_prod.stock_quantity, 0));
  END IF;

  -- Máximo de 3 reservas activas por utilizador (anti-abuso)
  IF (SELECT COUNT(*) FROM public.med_reservations
       WHERE user_id = v_user AND status IN ('reserved','ready')) >= 3 THEN
    RETURN json_build_object('success', false, 'error', 'too_many_active_reservations');
  END IF;

  v_code := 'MW-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  INSERT INTO public.med_reservations
    (user_id, product_id, store_id, quantity, pickup_code, price_at_reservation)
  VALUES
    (v_user, v_prod.id, v_prod.store_id, v_qty, v_code, v_prod.price)
  RETURNING * INTO v_res;

  UPDATE public.products
     SET stock_quantity = GREATEST(COALESCE(stock_quantity, 0) - v_qty, 0)
   WHERE id = v_prod.id AND stock_quantity IS NOT NULL;

  RETURN json_build_object(
    'success', true,
    'reservation', json_build_object(
      'id',           v_res.id,
      'pickup_code',  v_res.pickup_code,
      'quantity',     v_res.quantity,
      'status',       v_res.status,
      'expires_at',   v_res.expires_at,
      'price',        v_res.price_at_reservation,
      'product_name', v_prod.name,
      'store_name',   v_prod.store_name,
      'store_city',   v_prod.city,
      'store_phone',  v_prod.phone));
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_med_pickup(uuid, integer) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 7. my_med_reservations() — as minhas reservas (com expiração lazy)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.my_med_reservations()
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

  PERFORM public.expire_reservations();

  SELECT COALESCE(json_agg(json_build_object(
           'id', r.id,
           'status', r.status,
           'quantity', r.quantity,
           'pickup_code', r.pickup_code,
           'price', r.price_at_reservation,
           'created_at', r.created_at,
           'expires_at', r.expires_at,
           'product_id', p.id,
           'product_name', p.name,
           'product_image', p.image_url,
           'store_id', s.id,
           'store_name', s.name,
           'store_city', s.city,
           'store_phone', s.phone) ORDER BY r.created_at DESC), '[]'::json)
    INTO v_items
    FROM public.med_reservations r
    JOIN public.products p ON p.id = r.product_id
    JOIN public.stores   s ON s.id = r.store_id
   WHERE r.user_id = v_user;

  RETURN json_build_object('success', true, 'items', v_items);
END;
$$;

GRANT EXECUTE ON FUNCTION public.my_med_reservations() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 8. cancel_med_reservation() — cancelar e repor stock
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_med_reservation(p_reservation_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_res  record;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_res
    FROM public.med_reservations
   WHERE id = p_reservation_id AND user_id = v_user;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;
  IF v_res.status NOT IN ('reserved','ready') THEN
    RETURN json_build_object('success', false, 'error', 'not_cancellable',
                             'status', v_res.status);
  END IF;

  UPDATE public.med_reservations
     SET status = 'cancelled', resolved_at = now()
   WHERE id = v_res.id;

  UPDATE public.products
     SET stock_quantity = COALESCE(stock_quantity, 0) + v_res.quantity
   WHERE id = v_res.product_id AND stock_quantity IS NOT NULL;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_med_reservation(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 9. Vigiar preço (GoodRx Price Alert): add / remove / list / check
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_price_watch(
  p_query        text,
  p_target_price numeric DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user  uuid := auth.uid();
  v_q     text := trim(COALESCE(p_query, ''));
  v_row   public.price_watch;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF length(v_q) < 2 THEN
    RETURN json_build_object('success', false, 'error', 'query_too_short');
  END IF;
  IF (SELECT COUNT(*) FROM public.price_watch WHERE user_id = v_user AND active) >= 10 THEN
    RETURN json_build_object('success', false, 'error', 'too_many_watches');
  END IF;

  INSERT INTO public.price_watch (user_id, query, target_price)
  VALUES (v_user, v_q, p_target_price)
  ON CONFLICT (user_id, lower(trim(query)))
    DO UPDATE SET active = true,
                  target_price = EXCLUDED.target_price
  RETURNING * INTO v_row;

  RETURN json_build_object('success', true, 'watch', json_build_object(
    'id', v_row.id, 'query', v_row.query,
    'target_price', v_row.target_price, 'active', v_row.active));
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_price_watch(text, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_price_watch(p_watch_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  DELETE FROM public.price_watch
   WHERE id = p_watch_id AND user_id = v_user;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;
  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_price_watch(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_price_watches()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_out  json;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  WITH best AS (
    SELECT w.id, w.query, w.target_price, w.active, w.created_at,
           (SELECT MIN(p.price)
              FROM public.products p
              JOIN public.stores s ON s.id = p.store_id
             WHERE s.type = 'pharmacy'
               AND COALESCE(s.is_active, true)
               AND COALESCE(p.is_available, true)
               AND (p.name ILIKE '%' || w.query || '%'
                    OR COALESCE(p.description, '') ILIKE '%' || w.query || '%'
                    OR COALESCE(p.category, '') ILIKE '%' || w.query || '%')
               AND (w.country_id IS NULL OR s.country_id = w.country_id)
           ) AS current_lowest
      FROM public.price_watch w
     WHERE w.user_id = v_user
     ORDER BY w.created_at DESC
  )
  SELECT COALESCE(json_agg(json_build_object(
           'id', b.id, 'query', b.query, 'target_price', b.target_price,
           'active', b.active, 'created_at', b.created_at,
           'current_lowest', b.current_lowest,
           'triggered', b.target_price IS NOT NULL
                        AND b.current_lowest IS NOT NULL
                        AND b.current_lowest <= b.target_price)),
         '[]'::json)
    INTO v_out
    FROM best b;

  RETURN json_build_object('success', true, 'items', v_out);
END;
$$;

GRANT EXECUTE ON FUNCTION public.my_price_watches() TO authenticated;
