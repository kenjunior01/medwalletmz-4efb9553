
-- Allow anonymous and authenticated users to execute helper functions used in RLS policies.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_professional(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_country_manager(uuid, text) TO anon, authenticated;

-- Add missing polyline column so route caching works.
ALTER TABLE public.place_distance_cache
  ADD COLUMN IF NOT EXISTS polyline text;
