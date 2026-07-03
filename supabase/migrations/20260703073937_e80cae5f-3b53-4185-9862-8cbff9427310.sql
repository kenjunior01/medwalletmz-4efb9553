
-- Remove SECURITY DEFINER view (fixed by moving to column grants + RPC)
DROP VIEW IF EXISTS public.profiles_public;

-- Add a permissive SELECT policy: any authenticated can query rows, column ACL limits fields
DROP POLICY IF EXISTS "Authenticated can read basic profile fields" ON public.profiles;
CREATE POLICY "Authenticated can read basic profile fields" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Column-level restriction: only safe columns exposed to authenticated
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (
  user_id, id, full_name, avatar_url, default_city, referral_code, created_at, updated_at,
  vehicle_type, is_available, is_verified_driver, health_certified, verified_at
) ON public.profiles TO authenticated;

-- Provide a private RPC for owners/admins to read the full profile (phone, mkesh, licenses...)
CREATE OR REPLACE FUNCTION public.get_profile_private(_user_id uuid)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT (auth.uid() = _user_id OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.profiles WHERE user_id = _user_id;
END; $$;

REVOKE ALL ON FUNCTION public.get_profile_private(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_private(uuid) TO authenticated;

-- Drop the earlier helper we no longer need
DROP FUNCTION IF EXISTS public.get_my_profile();
