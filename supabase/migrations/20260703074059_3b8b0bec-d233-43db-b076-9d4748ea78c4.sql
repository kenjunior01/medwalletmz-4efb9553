
CREATE OR REPLACE FUNCTION public.list_profiles_admin_full()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.profiles ORDER BY created_at DESC;
END; $$;
REVOKE ALL ON FUNCTION public.list_profiles_admin_full() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_profiles_admin_full() TO authenticated;
