
-- ============================================================
-- 1. BLOOD_DONORS: hide sensitive PII from unauthenticated
-- ============================================================
DROP POLICY IF EXISTS "Public read active donors" ON public.blood_donors;

CREATE POLICY "Authenticated read active donors"
ON public.blood_donors
FOR SELECT
TO authenticated
USING (is_active = true);

-- ============================================================
-- 2. BLOOD_REQUESTS: hide patient contact from unauthenticated
-- ============================================================
DROP POLICY IF EXISTS "Anyone can see open requests" ON public.blood_requests;

CREATE POLICY "Authenticated view open requests"
ON public.blood_requests
FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- 3. PROFILES: replace broad SELECT with column-restricted policy
--    Sensitive columns (phone, payment IDs, license URLs) now only
--    visible to the row owner or admins.
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can read basic profile fields" ON public.profiles;

-- Revoke column-level SELECT on sensitive fields from authenticated;
-- keep the broad row policy so the app can still look up names/avatars.
REVOKE SELECT (phone, mpesa_number, emola_number, mkesh_number,
               license_carta_url, license_viatura_url,
               is_verified_driver, health_certified, verified_at,
               referral_code, referred_by)
ON public.profiles FROM authenticated;

REVOKE SELECT (phone, mpesa_number, emola_number, mkesh_number,
               license_carta_url, license_viatura_url,
               is_verified_driver, health_certified, verified_at,
               referral_code, referred_by)
ON public.profiles FROM anon;

-- Grant back only the safe public columns to authenticated
GRANT SELECT (id, user_id, full_name, avatar_url, default_city,
              vehicle_type, is_available, created_at, updated_at)
ON public.profiles TO authenticated;

-- Re-add a narrow SELECT policy limited to safe columns via row-level policy.
-- Authenticated users can read any profile row but only the columns granted above.
CREATE POLICY "Authenticated read public profile fields"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- 4. DOCTOR_PROFILES: hide license fields from other users
-- ============================================================
-- Revoke column-level SELECT on license fields from authenticated;
-- Doctors reading their own license go through row policy for their own row.
-- The owner + admin policies (with ALL) still allow full column access via
-- the doctor's/admin's own policy path since those policies grant ALL and
-- column privileges combine — however to keep authenticated broad reads clean
-- we drop the broad policy and add a narrower one.

DROP POLICY IF EXISTS "Authenticated can view doctor profiles" ON public.doctor_profiles;

REVOKE SELECT (license_number, license_url)
ON public.doctor_profiles FROM authenticated;
REVOKE SELECT (license_number, license_url)
ON public.doctor_profiles FROM anon;

GRANT SELECT (id, user_id, specialty_id, bio, consultation_fee,
              years_experience, languages, avatar_url, is_verified,
              is_available, rating, total_consultations, latitude, longitude,
              created_at, updated_at)
ON public.doctor_profiles TO authenticated;

CREATE POLICY "Authenticated view doctor public info"
ON public.doctor_profiles
FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- 5. CLINIC_DOCTORS: restrict to authenticated only
-- ============================================================
DROP POLICY IF EXISTS "Clinic doctors publicly readable" ON public.clinic_doctors;

CREATE POLICY "Authenticated read clinic doctors"
ON public.clinic_doctors
FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- 6. DOCTOR_AVAILABILITY_SLOTS: restrict to authenticated only
-- ============================================================
DROP POLICY IF EXISTS "Anyone views slots" ON public.doctor_availability_slots;

CREATE POLICY "Authenticated view slots"
ON public.doctor_availability_slots
FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- 7. PLACE_PROPOSALS: prevent reward spoofing
--    - Client-supplied reward values are ignored (server sets from settings)
--    - Safety cap via CHECK constraint
--    - approve_proposal always reads from place_proposal_settings
-- ============================================================

-- Safety cap: no proposal reward can exceed sane maxima
ALTER TABLE public.place_proposals
  DROP CONSTRAINT IF EXISTS place_proposals_reward_mzn_check;
ALTER TABLE public.place_proposals
  ADD CONSTRAINT place_proposals_reward_mzn_check
  CHECK (reward_mzn IS NULL OR (reward_mzn >= 0 AND reward_mzn <= 500));

ALTER TABLE public.place_proposals
  DROP CONSTRAINT IF EXISTS place_proposals_reward_joy_coins_check;
ALTER TABLE public.place_proposals
  ADD CONSTRAINT place_proposals_reward_joy_coins_check
  CHECK (reward_joy_coins IS NULL OR (reward_joy_coins >= 0 AND reward_joy_coins <= 1000));

-- Trigger that always overrides client-supplied reward with server settings on INSERT.
CREATE OR REPLACE FUNCTION public.enforce_place_proposal_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg_mzn NUMERIC;
  cfg_coins INTEGER;
BEGIN
  SELECT (value::text)::numeric INTO cfg_mzn
    FROM public.place_proposal_settings
    WHERE key = 'reward_mzn_per_approval';
  SELECT (value::text)::integer INTO cfg_coins
    FROM public.place_proposal_settings
    WHERE key = 'reward_joy_coins_per_approval';

  NEW.reward_mzn := COALESCE(cfg_mzn, 25);
  NEW.reward_joy_coins := COALESCE(cfg_coins, 50);
  NEW.reward_paid := false;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_reward_on_insert ON public.place_proposals;
CREATE TRIGGER enforce_reward_on_insert
  BEFORE INSERT ON public.place_proposals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_place_proposal_reward();

-- Recompute approve_proposal to ignore stored reward and always use settings
CREATE OR REPLACE FUNCTION public.approve_proposal(p_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  caller uuid := auth.uid();
  is_admin boolean;
  prop public.place_proposals;
  target_table text;
  new_id uuid;
  new_balance numeric(12,2);
  reward_amount numeric(10,2);
  reward_coins int;
  clinic_type text;
  cfg_mzn numeric;
  cfg_coins integer;
begin
  if caller is null then raise exception 'not authenticated'; end if;
  select exists (select 1 from public.user_roles where user_id = caller and role = 'admin') into is_admin;
  if not is_admin then raise exception 'forbidden: admin only'; end if;

  select * into prop from public.place_proposals where id = p_id;
  if not found then raise exception 'proposal not found'; end if;
  if prop.status not in ('pending','in_review') then
    raise exception 'proposal already in terminal status: %', prop.status;
  end if;

  -- Always read reward from settings, ignoring any stored value on the proposal
  SELECT (value::text)::numeric INTO cfg_mzn FROM public.place_proposal_settings WHERE key='reward_mzn_per_approval';
  SELECT (value::text)::integer INTO cfg_coins FROM public.place_proposal_settings WHERE key='reward_joy_coins_per_approval';
  reward_amount := LEAST(COALESCE(cfg_mzn, 25), 500);
  reward_coins  := LEAST(COALESCE(cfg_coins, 50), 1000);

  if prop.entity_type = 'pharmacy' then
    target_table := 'stores';
    insert into public.stores (
      name, type, city, address, latitude, longitude,
      image_url, description, phone, is_active, rating, delivery_fee, delivery_time
    ) values (
      prop.name, 'pharmacy', prop.city, prop.address,
      prop.latitude, prop.longitude,
      coalesce(prop.image_url, prop.raw_payload->>'image_url'),
      coalesce(prop.description, 'Curado pela equipa MedWallet'),
      coalesce(prop.phone, ''), true, 0, 50, '30-45 min'
    ) returning id into new_id;
  elsif prop.entity_type in ('clinic','hospital','laboratory') then
    target_table := 'clinics';
    clinic_type := prop.entity_type;
    insert into public.clinics (
      name, address, city, latitude, longitude,
      phone, logo_url, description, is_active, is_verified, owner_id, type
    ) values (
      prop.name, coalesce(prop.address,''), prop.city,
      prop.latitude, prop.longitude,
      coalesce(prop.phone,''), coalesce(prop.image_url,''),
      coalesce(prop.description,
        case prop.entity_type
          when 'hospital' then 'Hospital'
          when 'laboratory' then 'Laboratório de análises'
          else 'Clínica' end),
      true, true, caller, clinic_type
    ) returning id into new_id;
  else
    target_table := null;
    new_id := null;
  end if;

  update public.place_proposals set
    status = 'approved',
    reviewed_by = caller,
    reviewed_at = now(),
    publish_target = target_table,
    published_id = new_id,
    review_notes = coalesce(p_notes, review_notes),
    reward_mzn = reward_amount,
    reward_joy_coins = reward_coins
  where id = p_id;

  if prop.source = 'user_submit' and prop.proposed_by is not null and not prop.reward_paid then
    if reward_amount > 0 then
      insert into public.wallets (user_id, balance_mzn, total_deposited, total_spent)
      values (prop.proposed_by, 0, 0, 0) on conflict (user_id) do nothing;
      update public.wallets
         set balance_mzn = coalesce(balance_mzn, 0) + reward_amount
       where user_id = prop.proposed_by
      returning balance_mzn into new_balance;
      insert into public.wallet_transactions (
        user_id, type, amount, balance_after,
        reference_type, reference_id, description, status, payment_method
      ) values (
        prop.proposed_by, 'credit', reward_amount, new_balance,
        'place_proposal', p_id::text,
        'Sugestao aprovada: ' || prop.name, 'completed', 'system'
      );
    end if;
    if reward_coins > 0 then
      insert into public.joy_coin_transactions (user_id, amount, transaction_type, description, reference_id)
      values (prop.proposed_by, reward_coins, 'earn', 'Sugestao aprovada: ' || prop.name, p_id);
      insert into public.user_gamification (user_id, joy_coins)
      values (prop.proposed_by, reward_coins)
      on conflict (user_id) do update
        set joy_coins = public.user_gamification.joy_coins + reward_coins;
    end if;
    update public.place_proposals set reward_paid = true where id = p_id;
  end if;

  return jsonb_build_object(
    'ok', true, 'published_id', new_id,
    'publish_target', target_table,
    'reward_paid', prop.source = 'user_submit' and prop.proposed_by is not null,
    'reward_amount_mzn', reward_amount, 'reward_joy_coins', reward_coins
  );
end; $function$;

-- ============================================================
-- 8. Lock search_path on functions currently missing it
-- ============================================================
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;

-- ============================================================
-- 9. Revoke EXECUTE on internal / trigger-only / worker functions
--    from anon and authenticated. These should only be callable by
--    triggers (owner) or the service_role (edge functions with SR key).
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reward_blood_donation() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reject_proposals_bulk(uuid[], text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.enforce_place_proposal_reward() FROM anon, authenticated, public;

-- Also revoke anon from other definer functions that should require auth
REVOKE EXECUTE ON FUNCTION public.approve_proposal(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reject_proposal(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.bootstrap_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_professional(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_profile_private(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_profiles_admin(uuid[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_profiles_admin_full() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_patients_for_doctor(uuid[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.moderate_ad(uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.moderate_lab(uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.lab_order_set_result(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.resolve_withdrawal(uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.validate_coupon(text, uuid, text, text, numeric) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.wallet_admin_adjust(uuid, numeric, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.wallet_refund(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.video_session_add_participant(uuid, uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.video_session_end(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.wallet_credit(uuid, numeric, text, uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.wallet_debit(uuid, numeric, text, uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.wallet_deposit(uuid, numeric, text, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.pay_service(uuid, text, uuid, numeric, uuid, text, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.ensure_wallet(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.redeem_coupon(uuid, uuid) FROM anon, authenticated, public;
