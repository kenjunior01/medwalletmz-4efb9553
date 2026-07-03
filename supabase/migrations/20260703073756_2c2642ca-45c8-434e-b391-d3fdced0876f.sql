
-- =========================================================
-- 1) platform_settings: remove public read, expose safe view
-- =========================================================
DROP POLICY IF EXISTS "Anyone read settings" ON public.platform_settings;

CREATE OR REPLACE VIEW public.platform_settings_public
WITH (security_invoker = on) AS
  SELECT key, value, updated_at
  FROM public.platform_settings
  WHERE key NOT ILIKE '%email%'
    AND key NOT ILIKE '%secret%'
    AND key NOT ILIKE '%token%'
    AND key NOT ILIKE '%password%'
    AND key NOT ILIKE '%api_key%'
    AND key <> 'superadmin_email';

GRANT SELECT ON public.platform_settings_public TO anon, authenticated;

-- Allow the view to read the base table for any role (RLS still applies to base for non-admins).
-- We add a permissive SELECT policy that only exposes safe keys, so the view can materialize rows.
CREATE POLICY "Public safe settings readable" ON public.platform_settings
  FOR SELECT TO anon, authenticated
  USING (
    key NOT ILIKE '%email%'
    AND key NOT ILIKE '%secret%'
    AND key NOT ILIKE '%token%'
    AND key NOT ILIKE '%password%'
    AND key NOT ILIKE '%api_key%'
    AND key <> 'superadmin_email'
  );

-- =========================================================
-- 2) profiles: remove wide auth read, expose safe view
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can view basic profiles" ON public.profiles;

CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
  SELECT user_id, full_name, avatar_url, default_city, referral_code, created_at
  FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Base table needs a SELECT policy so the invoker view can read only the safe columns.
CREATE POLICY "Authenticated can read basic profile fields" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);
-- NOTE: The view uses security_invoker so the caller's RLS applies. Since we
-- cannot enforce column-level restrictions with RLS alone, we deny direct
-- selection of sensitive columns by revoking column-level SELECT below.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (user_id, full_name, avatar_url, default_city, referral_code, created_at, updated_at) ON public.profiles TO authenticated;
-- Owner still needs full SELECT for own row via the existing "Users can view own profile" policy;
-- give owners access to all their columns explicitly:
GRANT SELECT ON public.profiles TO authenticated; -- broad grant, but restricted by RLS "Users can view own profile" (auth.uid()=user_id) OR the new safe-fields policy above.
-- Re-tighten: revoke broad and grant column subset again to enforce column ACL.
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (user_id, full_name, avatar_url, default_city, referral_code, created_at, updated_at) ON public.profiles TO authenticated;

-- Keep INSERT/UPDATE/DELETE grants for the owner flows:
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Since column-level SELECT hides sensitive fields from non-owners, we also need
-- a way for owners to read their own sensitive columns. Provide a SECURITY DEFINER
-- function so the client can fetch the full own profile safely.
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- =========================================================
-- 3) coupons: only applicable coupons visible
-- =========================================================
DROP POLICY IF EXISTS "Coupons are publicly readable" ON public.coupons;
DROP POLICY IF EXISTS "Authenticated read active coupons" ON public.coupons;

CREATE POLICY "Coupons visible to eligible users" ON public.coupons
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (assigned_to_user IS NULL OR assigned_to_user = auth.uid())
  );

-- =========================================================
-- 4) doctor_availability_slots: strict update policy
-- =========================================================
DROP POLICY IF EXISTS "Patient books slot" ON public.doctor_availability_slots;

CREATE POLICY "Patient books or cancels slot" ON public.doctor_availability_slots
  FOR UPDATE TO authenticated
  USING (
    is_booked = false
    OR (
      consultation_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.consultations c
        WHERE c.id = doctor_availability_slots.consultation_id
          AND c.patient_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    -- After update: either the slot is now linked to a consultation owned by the caller,
    -- or the slot is being freed (is_booked=false and consultation_id NULL).
    (
      consultation_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.consultations c
        WHERE c.id = doctor_availability_slots.consultation_id
          AND c.patient_id = auth.uid()
      )
    )
    OR (is_booked = false AND consultation_id IS NULL)
  );

-- =========================================================
-- 5) Fix mutable search_path on trigger helper functions
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

-- update_updated_at_column already had search_path set, but re-apply to be sure:
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

-- =========================================================
-- 6) Restrict EXECUTE on SECURITY DEFINER functions
-- =========================================================
-- Revoke public execution from all sensitive definer functions
REVOKE ALL ON FUNCTION public.apply_referral_bonus() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_followup_on_complete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_place_proposal_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_doctor_rating() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ensure_wallet(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_credit(uuid, numeric, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_debit(uuid, numeric, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_deposit(uuid, numeric, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_refund(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_coupon(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.video_session_add_participant(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.video_session_end(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pay_service(uuid, text, uuid, numeric, uuid, text, uuid) FROM PUBLIC, anon, authenticated;

-- Client-callable RPCs and policy-invoked helpers: allow authenticated
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_professional(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, uuid, text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_proposal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_proposal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_withdrawal(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_ad(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_lab(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lab_order_set_result(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_admin_adjust(uuid, numeric, text, text) TO authenticated;

-- service_role keeps full execute
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
