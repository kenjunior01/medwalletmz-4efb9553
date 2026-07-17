
-- Restore full column grants (RLS will enforce row visibility)
GRANT SELECT ON public.profiles TO authenticated;

-- Drop the wide "everyone can read basic fields" policy added earlier
DROP POLICY IF EXISTS "Authenticated can read basic profile fields" ON public.profiles;

-- Recreate profiles_public as a SECURITY DEFINER view (view owner bypasses RLS)
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public AS
  SELECT user_id, full_name, avatar_url, default_city, referral_code, created_at
  FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- get_my_profile is no longer strictly needed (owner RLS covers it), but keep it as a convenience RPC.
