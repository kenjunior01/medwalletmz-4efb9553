REVOKE SELECT ON public.health_worker_profiles FROM anon, authenticated;

GRANT SELECT (id, user_id, country_code, full_name, profile_photo_url, bio, profession, specialization, years_of_experience, certificates, is_available, availability_hours, home_visits_enabled, telehealth_enabled, service_radius_km, base_location, base_address, service_zones, languages, conditions_treated, consultation_fee, home_visit_fee, telehealth_fee, currency, is_verified, verified_at, rating, total_bookings, response_time_avg_min, created_at, updated_at)
ON public.health_worker_profiles TO anon;

GRANT SELECT (id, user_id, country_code, full_name, profile_photo_url, bio, profession, specialization, years_of_experience, certificates, is_available, availability_hours, home_visits_enabled, telehealth_enabled, service_radius_km, base_location, base_address, service_zones, languages, conditions_treated, consultation_fee, home_visit_fee, telehealth_fee, currency, is_verified, verified_at, verified_by, verification_notes, rejection_reason, rating, total_bookings, total_earnings, response_time_avg_min, onboarding_step, onboarding_progress, created_at, updated_at)
ON public.health_worker_profiles TO authenticated;

GRANT ALL ON public.health_worker_profiles TO service_role;

DROP POLICY IF EXISTS "Public reads verified workers" ON public.health_worker_profiles;
CREATE POLICY "Public reads verified workers"
ON public.health_worker_profiles
FOR SELECT
TO anon, authenticated
USING (is_verified = true AND is_available = true);

CREATE OR REPLACE FUNCTION public.health_worker_sensitive(_worker_id uuid)
RETURNS TABLE (id uuid, license_number text, license_url text, id_document_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id, w.license_number, w.license_url, w.id_document_url
  FROM public.health_worker_profiles w
  WHERE w.id = _worker_id
    AND (w.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
$$;

REVOKE EXECUTE ON FUNCTION public.health_worker_sensitive(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.health_worker_sensitive(uuid) TO authenticated;