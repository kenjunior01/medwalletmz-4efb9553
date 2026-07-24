
-- ============================================================
-- 1. PRESCRIPTIONS: verification code + signature hash
-- ============================================================
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS verification_code text,
  ADD COLUMN IF NOT EXISTS signature_hash text;

-- Generate unique short verification code for existing rows and future inserts
CREATE OR REPLACE FUNCTION public.gen_prescription_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
  tries int := 0;
BEGIN
  LOOP
    code := upper(substr(encode(gen_random_bytes(6), 'base64'), 1, 8));
    code := regexp_replace(code, '[^A-Z0-9]', 'X', 'g');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.prescriptions WHERE verification_code = code);
    tries := tries + 1;
    IF tries > 10 THEN
      code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
      EXIT;
    END IF;
  END LOOP;
  RETURN code;
END; $$;

CREATE OR REPLACE FUNCTION public.set_prescription_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.verification_code IS NULL OR NEW.verification_code = '' THEN
    NEW.verification_code := public.gen_prescription_code();
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_prescription_code ON public.prescriptions;
CREATE TRIGGER trg_prescription_code
  BEFORE INSERT ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_prescription_code();

-- Backfill
UPDATE public.prescriptions
   SET verification_code = public.gen_prescription_code()
 WHERE verification_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS prescriptions_verification_code_key
  ON public.prescriptions(verification_code);

-- Public verification RPC (limited data, no PII)
CREATE OR REPLACE FUNCTION public.verify_prescription(_code text)
RETURNS TABLE (
  code text,
  doctor_name text,
  doctor_license text,
  patient_initials text,
  emitted_at timestamptz,
  expires_at timestamptz,
  status text,
  items_count int,
  signature_hash text,
  is_valid boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.verification_code,
    dp.full_name,
    d.license_number,
    upper(left(coalesce(pp.full_name, 'A'), 1)) || '.' AS patient_initials,
    p.created_at,
    p.expires_at,
    p.status,
    (SELECT count(*)::int FROM public.prescription_items WHERE prescription_id = p.id),
    p.signature_hash,
    (p.status = 'active' AND (p.expires_at IS NULL OR p.expires_at > now()))
  FROM public.prescriptions p
  LEFT JOIN public.profiles dp ON dp.user_id = p.doctor_id
  LEFT JOIN public.doctor_profiles d ON d.user_id = p.doctor_id
  LEFT JOIN public.profiles pp ON pp.user_id = p.patient_id
  WHERE p.verification_code = _code
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_prescription(text) TO anon, authenticated;

-- ============================================================
-- 2. ATOMIC SLOT BOOKING
-- ============================================================
CREATE OR REPLACE FUNCTION public.book_consultation_atomic(
  _slot_id uuid,
  _reason text DEFAULT NULL,
  _coupon_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  slot record;
  doc record;
  gross numeric;
  cons_id uuid;
  pay jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  -- Atomic reserve
  UPDATE public.doctor_availability_slots
     SET is_booked = true
   WHERE id = _slot_id AND is_booked = false
  RETURNING id, doctor_id, starts_at INTO slot;

  IF slot IS NULL THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  -- Doctor fee
  SELECT user_id, consultation_fee
    INTO doc
    FROM public.doctor_profiles
   WHERE user_id = slot.doctor_id;

  gross := COALESCE(doc.consultation_fee, 0);

  -- Create consultation
  INSERT INTO public.consultations (doctor_id, patient_id, scheduled_at, consultation_type, reason, fee, status)
  VALUES (slot.doctor_id, uid, slot.starts_at, 'chat', _reason, gross, 'scheduled')
  RETURNING id INTO cons_id;

  -- Link slot to consultation
  UPDATE public.doctor_availability_slots
     SET consultation_id = cons_id
   WHERE id = slot.id;

  -- Charge wallet
  BEGIN
    pay := public.pay_service(uid, 'consultation', cons_id, gross, _coupon_id,
      'Consulta médica', slot.doctor_id);
  EXCEPTION WHEN OTHERS THEN
    -- Rollback slot and consultation on payment failure
    DELETE FROM public.consultations WHERE id = cons_id;
    UPDATE public.doctor_availability_slots
       SET is_booked = false, consultation_id = NULL
     WHERE id = slot.id;
    RAISE;
  END;

  RETURN jsonb_build_object(
    'consultation_id', cons_id,
    'balance', pay->'balance',
    'paid', pay->'paid',
    'currency', pay->'currency'
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.book_consultation_atomic(uuid, text, uuid) TO authenticated;

-- ============================================================
-- 3. AUTO-COMPLETE CONSULTATION
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_consultation_completed(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO c FROM public.consultations WHERE id = _id;
  IF c IS NULL THEN RAISE EXCEPTION 'consultation_not_found'; END IF;
  IF c.doctor_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF c.status = 'completed' THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;
  UPDATE public.consultations
     SET status = 'completed', completed_at = COALESCE(completed_at, now())
   WHERE id = _id;
  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.mark_consultation_completed(uuid) TO authenticated;

-- Ensure completed_at column exists
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- ============================================================
-- 4. MPESA MANUAL PAYMENTS: proof, owner linkage
-- ============================================================
ALTER TABLE public.mpesa_manual_payments
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS proof_url text,
  ADD COLUMN IF NOT EXISTS wallet_tx_id uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE INDEX IF NOT EXISTS idx_mpesa_user ON public.mpesa_manual_payments(user_id);

-- Owner can read their own by user_id (in addition to phone match)
DROP POLICY IF EXISTS "mpesa owner read by user" ON public.mpesa_manual_payments;
CREATE POLICY "mpesa owner read by user" ON public.mpesa_manual_payments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "mpesa owner insert" ON public.mpesa_manual_payments;
DROP POLICY IF EXISTS "mpesa insert" ON public.mpesa_manual_payments;
CREATE POLICY "mpesa owner insert" ON public.mpesa_manual_payments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Confirm RPC — admin/country_manager credits wallet
CREATE OR REPLACE FUNCTION public.confirm_mpesa_payment(_id uuid, _mpesa_tx_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
  credited jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'country_manager')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO p FROM public.mpesa_manual_payments WHERE id = _id FOR UPDATE;
  IF p IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF p.status <> 'pending' THEN RAISE EXCEPTION 'already_%', p.status; END IF;
  IF p.user_id IS NULL THEN RAISE EXCEPTION 'no_user_linked'; END IF;

  credited := public.wallet_deposit(p.user_id, p.amount_mzn, 'mpesa_manual', _id);

  UPDATE public.mpesa_manual_payments
     SET status = 'confirmed',
         confirmed_at = now(),
         confirmed_by = auth.uid(),
         mpesa_transaction_id = COALESCE(_mpesa_tx_id, mpesa_transaction_id)
   WHERE id = _id;

  RETURN jsonb_build_object('ok', true, 'balance', credited->'balance');
END; $$;

GRANT EXECUTE ON FUNCTION public.confirm_mpesa_payment(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_mpesa_payment(_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'country_manager')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.mpesa_manual_payments
     SET status = 'rejected',
         rejection_reason = _reason,
         confirmed_at = now(),
         confirmed_by = auth.uid()
   WHERE id = _id AND status = 'pending';
  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.reject_mpesa_payment(uuid, text) TO authenticated;

-- ============================================================
-- 5. INSTITUTION REVIEWS + RANKING
-- ============================================================
CREATE TABLE IF NOT EXISTS public.institution_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('clinic','hospital','pharmacy','laboratory','veterinary','store','doctor')),
  entity_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  order_id uuid,
  consultation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);

GRANT SELECT ON public.institution_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.institution_reviews TO authenticated;
GRANT ALL ON public.institution_reviews TO service_role;

ALTER TABLE public.institution_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews public read" ON public.institution_reviews;
CREATE POLICY "reviews public read" ON public.institution_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "reviews owner insert" ON public.institution_reviews;
CREATE POLICY "reviews owner insert" ON public.institution_reviews
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "reviews owner update" ON public.institution_reviews;
CREATE POLICY "reviews owner update" ON public.institution_reviews
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "reviews owner delete" ON public.institution_reviews;
CREATE POLICY "reviews owner delete" ON public.institution_reviews
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_inst_reviews_entity ON public.institution_reviews(entity_type, entity_id);

-- Rating aggregate columns on target tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clinics') THEN
    EXECUTE 'ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS reviews_count int DEFAULT 0';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='hospitals') THEN
    EXECUTE 'ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS reviews_count int DEFAULT 0';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pharmacies') THEN
    EXECUTE 'ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS reviews_count int DEFAULT 0';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='laboratories') THEN
    EXECUTE 'ALTER TABLE public.laboratories ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS reviews_count int DEFAULT 0';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='veterinary_clinics') THEN
    EXECUTE 'ALTER TABLE public.veterinary_clinics ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS reviews_count int DEFAULT 0';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='stores') THEN
    EXECUTE 'ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS reviews_count int DEFAULT 0';
  END IF;
END $$;

-- Aggregation trigger
CREATE OR REPLACE FUNCTION public.recalc_institution_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  et text;
  eid uuid;
  avg_r numeric;
  cnt int;
  tbl text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    et := OLD.entity_type; eid := OLD.entity_id;
  ELSE
    et := NEW.entity_type; eid := NEW.entity_id;
  END IF;

  SELECT round(avg(rating)::numeric, 2), count(*)
    INTO avg_r, cnt
    FROM public.institution_reviews
   WHERE entity_type = et AND entity_id = eid;

  tbl := CASE et
    WHEN 'clinic' THEN 'clinics'
    WHEN 'hospital' THEN 'hospitals'
    WHEN 'pharmacy' THEN 'pharmacies'
    WHEN 'laboratory' THEN 'laboratories'
    WHEN 'veterinary' THEN 'veterinary_clinics'
    WHEN 'store' THEN 'stores'
    ELSE NULL
  END;

  IF tbl IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.%I SET avg_rating = COALESCE(%L, 0), reviews_count = %L WHERE id = %L',
      tbl, avg_r, cnt, eid
    );
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_recalc_institution_rating ON public.institution_reviews;
CREATE TRIGGER trg_recalc_institution_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.institution_reviews
  FOR EACH ROW EXECUTE FUNCTION public.recalc_institution_rating();

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_inst_reviews_touch ON public.institution_reviews;
CREATE TRIGGER trg_inst_reviews_touch
  BEFORE UPDATE ON public.institution_reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
