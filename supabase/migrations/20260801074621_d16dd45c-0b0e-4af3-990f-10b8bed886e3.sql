-- ============ 1. Fix mutable search_path on all public functions ============
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig,'{}'::text[])) c WHERE c LIKE 'search_path=%')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
  END LOOP;
END $$;

-- ============ 2. Lock down SECURITY DEFINER function execution ============
-- 2a. Trigger functions must never be callable directly
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- 2b. Remove anonymous execute on every SECURITY DEFINER function
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- 2c. Re-grant the few helpers that legitimately need anonymous access
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_professional(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_country_manager(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_currency_for_country(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.professional_min_balance() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_prescription(text) TO anon, authenticated;

-- 2d. Internal / server-only routines: no signed-in execute either
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
      AND p.proname IN (
        'check_rate_limit','clear_rate_limit','cleanup_expired_rate_limits','login_rate_check',
        'get_audit_log','get_profiles_for_manager','list_profiles_admin',
        'award_referral_bonus','checkout_debit_order','create_order_atomic','rider_credit_earnings',
        'enqueue_email','delete_email','read_email_batch','move_to_dlq',
        'email_queue_dispatch','email_queue_wake','ensure_wallet',
        'register_driver_vehicle','update_vehicle_photos','reward_blood_donation'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- ============ 3. Sensitive health records: scope SELECT ============
DROP POLICY IF EXISTS "ape public read" ON public.ape_visits;
CREATE POLICY "ape_visits_scoped_read" ON public.ape_visits
FOR SELECT TO authenticated
USING (
  ape_user_id = auth.uid() OR patient_user_id = auth.uid()
  OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager')
);

DROP POLICY IF EXISTS "art read" ON public.art_adherence_logs;
CREATE POLICY "art_scoped_read" ON public.art_adherence_logs
FOR SELECT TO authenticated
USING (
  patient_user_id = auth.uid()
  OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager')
);

DROP POLICY IF EXISTS "malaria read" ON public.malaria_cases;
CREATE POLICY "malaria_scoped_read" ON public.malaria_cases
FOR SELECT TO authenticated
USING (
  patient_user_id = auth.uid() OR ape_user_id = auth.uid()
  OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager')
);

DROP POLICY IF EXISTS "tb dot read" ON public.tb_dot_records;
CREATE POLICY "tb_dot_scoped_read" ON public.tb_dot_records
FOR SELECT TO authenticated
USING (
  patient_user_id = auth.uid() OR observer_user_id = auth.uid()
  OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager')
);

-- ============ 4. Blood donors / requests PII ============
DROP POLICY IF EXISTS "Authenticated read active donors" ON public.blood_donors;
CREATE POLICY "blood_donors_scoped_read" ON public.blood_donors
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR EXISTS (
    SELECT 1 FROM public.blood_donation_matches m
    JOIN public.blood_requests r ON r.id = m.request_id
    WHERE m.donor_user_id = public.blood_donors.user_id
      AND r.created_by = auth.uid()
  )
);

CREATE OR REPLACE VIEW public.blood_donors_public
WITH (security_invoker = off) AS
  SELECT blood_type, city, neighborhood, is_available, is_active
  FROM public.blood_donors
  WHERE is_active = true;
GRANT SELECT ON public.blood_donors_public TO anon, authenticated;

DROP POLICY IF EXISTS "Authenticated view open requests" ON public.blood_requests;
CREATE POLICY "blood_requests_scoped_read" ON public.blood_requests
FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR EXISTS (
    SELECT 1 FROM public.blood_donation_matches m
    WHERE m.request_id = public.blood_requests.id AND m.donor_user_id = auth.uid()
  )
);

CREATE OR REPLACE VIEW public.blood_requests_public
WITH (security_invoker = off) AS
  SELECT id, blood_type, city, urgency, units_needed, units_received, status, deadline, created_at
  FROM public.blood_requests
  WHERE status = 'open';
GRANT SELECT ON public.blood_requests_public TO anon, authenticated;

-- ============ 5. Doctor licence fields ============
REVOKE SELECT (license_number, license_url) ON public.doctor_profiles FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_doctor_license(_doctor_id uuid)
RETURNS TABLE(license_number text, license_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.license_number, d.license_url
  FROM public.doctor_profiles d
  WHERE d.user_id = _doctor_id
    AND (auth.uid() = _doctor_id OR public.has_role(auth.uid(),'admin'));
$$;
REVOKE ALL ON FUNCTION public.get_doctor_license(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_doctor_license(uuid) TO authenticated, service_role;

-- ============ 6. user_roles enumeration ============
DROP POLICY IF EXISTS "user_roles_select_public" ON public.user_roles;

-- ============ 7. Storage: stop listing of public vehicle-photos bucket ============
DROP POLICY IF EXISTS "anyone_view_vehicle_photos" ON storage.objects;

-- ============ 8. Overly permissive write policies ============
DROP POLICY IF EXISTS "rate_limits_insert_fn" ON public.rate_limits;
DROP POLICY IF EXISTS "audit_log_insert_trigger" ON public.audit_log;

DROP POLICY IF EXISTS "wa insert" ON public.whatsapp_messages;
CREATE POLICY "wa_insert_admin" ON public.whatsapp_messages
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));

DROP POLICY IF EXISTS "gc insert" ON public.google_cloud_integrations;
CREATE POLICY "gc_insert_own" ON public.google_cloud_integrations
FOR INSERT TO authenticated
WITH CHECK (called_by = auth.uid() OR public.has_role(auth.uid(),'admin'));