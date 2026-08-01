
-- Settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('professional_signup_bonus', '1000'),
  ('professional_promo_until', to_jsonb((now() + interval '2 months')::text)),
  ('professional_min_balance', '50')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Helper: minimum balance a professional must keep
CREATE OR REPLACE FUNCTION public.professional_min_balance()
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT (value #>> '{}')::numeric FROM public.platform_settings WHERE key = 'professional_min_balance'), 0);
$$;

GRANT EXECUTE ON FUNCTION public.professional_min_balance() TO authenticated, anon;

-- Booking: patient pays directly (no wallet debit); professional must have balance
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
  doc_bal numeric;
  min_bal numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  UPDATE public.doctor_availability_slots
     SET is_booked = true
   WHERE id = _slot_id AND is_booked = false
  RETURNING id, doctor_id, starts_at INTO slot;

  IF slot IS NULL THEN
    RAISE EXCEPTION 'slot_unavailable';
  END IF;

  SELECT user_id, consultation_fee
    INTO doc
    FROM public.doctor_profiles
   WHERE user_id = slot.doctor_id;

  gross := COALESCE(doc.consultation_fee, 0);

  -- Professional must keep a minimum wallet balance for the consultation to be accepted
  min_bal := public.professional_min_balance();
  IF min_bal > 0 THEN
    PERFORM public.ensure_wallet(slot.doctor_id);
    SELECT COALESCE(balance_mzn, 0) INTO doc_bal FROM public.wallets WHERE user_id = slot.doctor_id;
    IF COALESCE(doc_bal, 0) < min_bal THEN
      UPDATE public.doctor_availability_slots
         SET is_booked = false
       WHERE id = slot.id;
      RAISE EXCEPTION 'professional_insufficient_balance';
    END IF;
  END IF;

  INSERT INTO public.consultations (doctor_id, patient_id, scheduled_at, consultation_type, reason, fee, status)
  VALUES (slot.doctor_id, uid, slot.starts_at, 'chat', _reason, gross, 'scheduled')
  RETURNING id INTO cons_id;

  UPDATE public.doctor_availability_slots
     SET consultation_id = cons_id
   WHERE id = slot.id;

  RETURN jsonb_build_object(
    'ok', true,
    'consultation_id', cons_id,
    'fee', gross,
    'payment', 'direct'
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.book_consultation_atomic(uuid, text, uuid) TO authenticated;

-- Promo: 1000 MT welcome balance for professionals registering during the promo window
CREATE OR REPLACE FUNCTION public.grant_professional_signup_bonus()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  bonus numeric;
  promo_until timestamptz;
  already int;
BEGIN
  IF NEW.role::text NOT IN ('doctor','clinic','hospital','lab','pharmacist','insurance','veterinary','store_owner','driver') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE((SELECT (value #>> '{}')::numeric FROM public.platform_settings WHERE key = 'professional_signup_bonus'), 0) INTO bonus;
  SELECT (SELECT (value #>> '{}')::timestamptz FROM public.platform_settings WHERE key = 'professional_promo_until') INTO promo_until;

  IF bonus <= 0 OR promo_until IS NULL OR now() > promo_until THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO already
    FROM public.wallet_transactions
   WHERE user_id = NEW.user_id AND type = 'professional_promo';

  IF already > 0 THEN RETURN NEW; END IF;

  PERFORM public.wallet_credit(NEW.user_id, bonus, 'professional_promo', NULL,
    'Bónus de boas-vindas para profissionais (promoção 2 meses)');

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_professional_signup_bonus ON public.user_roles;
CREATE TRIGGER trg_professional_signup_bonus
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.grant_professional_signup_bonus();
