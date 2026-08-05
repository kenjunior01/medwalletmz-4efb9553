CREATE OR REPLACE FUNCTION public.manager_performance_ranking(_days integer DEFAULT 30)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  role text,
  country_id text,
  province_id text,
  scope_label text,
  total_users bigint,
  new_users bigint,
  active_users bigint,
  consultations_completed bigint,
  revenue numeric,
  manager_commission numeric,
  art_adherence numeric,
  ape_visits bigint,
  revenue_recent numeric,
  revenue_previous numeric,
  users_recent bigint,
  users_previous bigint,
  declining boolean,
  score numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _since timestamptz := now() - make_interval(days => GREATEST(_days, 1));
  _w1 timestamptz := now() - interval '14 days';
  _w2 timestamptz := now() - interval '28 days';
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH managers AS (
    SELECT DISTINCT ON (ur.user_id, ur.role, ur.country_id, ur.province_id)
      ur.user_id, ur.role::text AS role, ur.country_id, ur.province_id
    FROM public.user_roles ur
    WHERE ur.role::text IN ('country_manager','provincial_manager','regional_manager','regional_ceo')
  ),
  scoped AS (
    SELECT m.*,
      COALESCE(m.province_id, m.country_id, '—') AS scope_label,
      ARRAY(
        SELECT p.user_id FROM public.profiles p
        WHERE (m.province_id IS NOT NULL AND p.province_id = m.province_id)
           OR (m.province_id IS NULL AND m.country_id IS NOT NULL AND p.country_id = m.country_id)
      ) AS members
    FROM managers m
  ),
  agg AS (
    SELECT s.*,
      COALESCE(array_length(s.members, 1), 0)::bigint AS total_users,
      (SELECT count(*) FROM public.profiles p WHERE p.user_id = ANY(s.members) AND p.created_at >= _since)::bigint AS new_users,
      (SELECT count(*) FROM public.profiles p WHERE p.user_id = ANY(s.members) AND p.last_login >= _since)::bigint AS active_users,
      (SELECT count(*) FROM public.consultations c WHERE c.patient_id = ANY(s.members) AND c.status = 'completed' AND c.created_at >= _since)::bigint AS consultations_completed,
      (SELECT COALESCE(sum(o.total), 0) FROM public.orders o WHERE o.user_id = ANY(s.members) AND o.created_at >= _since) AS revenue,
      (SELECT COALESCE(sum(o.total), 0) FROM public.orders o WHERE o.user_id = ANY(s.members) AND o.created_at >= _w1) AS revenue_recent,
      (SELECT COALESCE(sum(o.total), 0) FROM public.orders o WHERE o.user_id = ANY(s.members) AND o.created_at >= _w2 AND o.created_at < _w1) AS revenue_previous,
      (SELECT count(*) FROM public.profiles p WHERE p.user_id = ANY(s.members) AND p.created_at >= _w1)::bigint AS users_recent,
      (SELECT count(*) FROM public.profiles p WHERE p.user_id = ANY(s.members) AND p.created_at >= _w2 AND p.created_at < _w1)::bigint AS users_previous,
      (SELECT ROUND(COALESCE(avg(a.adherence_pct), 0)::numeric, 1) FROM public.art_adherence_logs a
        WHERE (s.province_id IS NOT NULL AND a.province = s.province_id)
           OR (s.province_id IS NULL AND a.country_id = s.country_id)) AS art_adherence,
      (SELECT count(*) FROM public.ape_visits v
        WHERE v.visit_date >= _since::date
          AND ((s.province_id IS NOT NULL AND v.province = s.province_id)
            OR (s.province_id IS NULL AND v.country_id = s.country_id)))::bigint AS ape_visits
    FROM scoped s
  )
  SELECT
    a.user_id,
    pr.full_name,
    pr.email,
    a.role,
    a.country_id,
    a.province_id,
    a.scope_label,
    a.total_users,
    a.new_users,
    a.active_users,
    a.consultations_completed,
    a.revenue,
    ROUND(a.revenue * 0.6, 2) AS manager_commission,
    a.art_adherence,
    a.ape_visits,
    a.revenue_recent,
    a.revenue_previous,
    a.users_recent,
    a.users_previous,
    (a.revenue_recent < a.revenue_previous AND a.users_recent < a.users_previous) AS declining,
    ROUND(
      (a.active_users * 2)
      + (a.new_users * 3)
      + (a.consultations_completed * 5)
      + (a.ape_visits * 2)
      + (a.revenue / 100.0)
      + (a.art_adherence * 2)
    , 1) AS score
  FROM agg a
  LEFT JOIN public.profiles pr ON pr.user_id = a.user_id
  ORDER BY score DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.manager_performance_ranking(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manager_performance_ranking(integer) TO authenticated;