-- ═══════════════════════════════════════════════════════════════════════════
-- F45 — Torre de Controlo Global (padrão Uber Ops Command Center)
-- ═══════════════════════════════════════════════════════════════════════════
-- Gestão mundial num só round-trip: um RPC devolve totais globais, métricas
-- por país e séries diárias (14 dias); outro devolve o feed de atividade ao
-- vivo. O cliente NUNCA agrega — tudo no servidor (padrão Uber: live
-- monitoring centralizado de marketplace health).
--
-- Segurança: SECURITY DEFINER com guarda has_role(_user_id,'admin').
-- Idempotente: CREATE OR REPLACE — seguro para re-executar.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. global_ops_stats() — totais globais + por país + séries de 14 dias
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.global_ops_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user      uuid := auth.uid();
  v_totals    json;
  v_countries json;
  v_series    json;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF NOT public.has_role(v_user, 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  -- Totais globais (uma passada por tabela-chave)
  SELECT json_build_object(
    'users',                 (SELECT COUNT(*) FROM profiles),
    'doctors',               (SELECT COUNT(*) FROM doctor_profiles),
    'consultations',         (SELECT COUNT(*) FROM consultations),
    'active_consultations',  (SELECT COUNT(*) FROM consultations
                               WHERE completed_at IS NULL AND COALESCE(status,'') <> 'cancelled'),
    'prescriptions',         (SELECT COUNT(*) FROM prescriptions),
    'orders',                (SELECT COUNT(*) FROM orders),
    'pending_orders',        (SELECT COUNT(*) FROM orders WHERE status = 'pending'),
    'completed_orders',      (SELECT COUNT(*) FROM orders WHERE status = 'completed'),
    'gmv',                   (SELECT COALESCE(SUM(total),0) FROM orders WHERE COALESCE(status,'') <> 'cancelled'),
    'wallet_balance',        (SELECT COALESCE(SUM(balance_mzn),0) FROM wallets),
    'wallet_holders',        (SELECT COUNT(*) FROM wallets)
  ) INTO v_totals;

  -- Por país (hierarquia mundial; comércio usa country_id, saúde via bridge
  -- doctor_profiles↔profiles porque consultations não tem country_id)
  WITH per_country AS (
    SELECT co.id                     AS country_id,
           co.name                   AS country_name,
           COALESCE(co.flag_url,'')  AS flag_url,
           COALESCE(co.currency_symbol, co.currency_code, '') AS currency,
           (SELECT COUNT(*) FROM profiles p
             WHERE p.country_id = co.id)                                   AS users,
           (SELECT COUNT(*) FROM doctor_profiles dp
              JOIN profiles p ON p.id = dp.id
             WHERE p.country_id = co.id)                                   AS doctors,
           (SELECT COUNT(*) FROM orders o
             WHERE o.country_id = co.id)                                   AS orders,
           (SELECT COALESCE(SUM(o.total),0) FROM orders o
             WHERE o.country_id = co.id
               AND COALESCE(o.status,'') <> 'cancelled')                   AS gmv,
           (SELECT COALESCE(SUM(w.balance_mzn),0) FROM wallets w
             WHERE w.country_id = co.id)                                   AS wallet_balance,
           (SELECT COUNT(*) FROM consultations c
              WHERE c.doctor_id IN (
                SELECT dp2.id FROM doctor_profiles dp2
                  JOIN profiles p2 ON p2.id = dp2.id
                 WHERE p2.country_id = co.id))                             AS consultations,
           (SELECT COUNT(*) FROM profiles p3
             WHERE p3.country_id = co.id
               AND p3.created_at >= now() - interval '30 days')            AS new_users_30d
    FROM countries co
    WHERE COALESCE(co.is_active, true)
  )
  SELECT COALESCE(json_agg(row_to_json(t.*)), '[]'::json) INTO v_countries
  FROM (SELECT * FROM per_country ORDER BY gmv DESC NULLS LAST, users DESC) t;

  -- Séries diárias (14 dias) — crescimento visível à la Uber
  WITH days AS (
    SELECT generate_series(current_date - 13, current_date, interval '1 day')::date AS d
  )
  SELECT json_build_object(
    'signups', (
      SELECT COALESCE(json_agg(json_build_object('day', days.d, 'n', COALESCE(s.n,0)) ORDER BY days.d), '[]'::json)
        FROM days
        LEFT JOIN (
          SELECT created_at::date AS d, COUNT(*) AS n
            FROM profiles WHERE created_at >= current_date - 13 GROUP BY 1
        ) s ON s.d = days.d
    ),
    'orders', (
      SELECT COALESCE(json_agg(json_build_object('day', days.d, 'n', COALESCE(o.n,0), 'gmv', COALESCE(o.gmv,0)) ORDER BY days.d), '[]'::json)
        FROM days
        LEFT JOIN (
          SELECT created_at::date AS d, COUNT(*) AS n, SUM(total) AS gmv
            FROM orders WHERE created_at >= current_date - 13 GROUP BY 1
        ) o ON o.d = days.d
    ),
    'consultations', (
      SELECT COALESCE(json_agg(json_build_object('day', days.d, 'n', COALESCE(c.n,0)) ORDER BY days.d), '[]'::json)
        FROM days
        LEFT JOIN (
          SELECT created_at::date AS d, COUNT(*) AS n
            FROM consultations WHERE created_at >= current_date - 13 GROUP BY 1
        ) c ON c.d = days.d
    )
  ) INTO v_series;

  RETURN json_build_object(
    'success',     true,
    'totals',      v_totals,
    'countries',   v_countries,
    'series',      v_series,
    'computed_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSZ')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.global_ops_stats() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. global_activity_feed(p_limit) — atividade ao vivo (UNION ALL)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.global_activity_feed(p_limit integer DEFAULT 30)
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
  IF NOT public.has_role(v_user, 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  WITH events AS (
    SELECT 'signup'       AS kind,
           'Novo utilizador: ' || COALESCE(p.full_name, 'Anónimo') AS title,
           p.country_id     AS country_id,
           p.created_at     AS at
      FROM profiles p
    UNION ALL
    SELECT 'order',
           'Encomenda ' || COALESCE(o.status,'—') || ' · ' || COALESCE(o.total,0)::text || ' MZN',
           o.country_id,
           o.created_at
      FROM orders o
    UNION ALL
    SELECT 'consultation',
           'Consulta ' || COALESCE(c.consultation_type,'') ,
           (SELECT p2.country_id FROM profiles p2 WHERE p2.id = c.doctor_id),
           c.created_at
      FROM consultations c
    UNION ALL
    SELECT 'prescription',
           'Prescrição emitida',
           (SELECT p3.country_id FROM profiles p3 WHERE p3.id = pr.doctor_id),
           pr.created_at
      FROM prescriptions pr
    UNION ALL
    SELECT 'wallet',
           'Carteira · ' || wt.type || ' · ' || wt.amount::text || ' MZN',
           (SELECT p4.country_id FROM profiles p4 WHERE p4.id = wt.user_id),
           wt.created_at
      FROM wallet_transactions wt
     WHERE COALESCE(wt.status,'completed') = 'completed' AND wt.amount > 0
  )
  SELECT COALESCE(
           json_agg(json_build_object(
             'kind', e.kind, 'title', e.title,
             'country_id', e.country_id, 'at', e.at) ORDER BY e.at DESC),
           '[]'::json)
    INTO v_items
  FROM (
    SELECT * FROM events
     ORDER BY at DESC
     LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 30), 100))
  ) e;

  RETURN json_build_object('success', true, 'items', v_items);
END;
$$;

GRANT EXECUTE ON FUNCTION public.global_activity_feed(integer) TO authenticated;
