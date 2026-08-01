-- 1. Fix wallet_credit (was inserting into non-existent columns wallet_id/ref_id)
CREATE OR REPLACE FUNCTION public.wallet_credit(_user_id uuid, _amount numeric, _type text DEFAULT 'credit'::text, _ref_id uuid DEFAULT NULL::uuid, _description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _new_balance NUMERIC;
BEGIN
  IF _user_id IS NULL OR _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parametros invalidos');
  END IF;

  PERFORM public.ensure_wallet(_user_id);

  UPDATE public.wallets
     SET balance_mzn = COALESCE(balance_mzn, 0) + _amount,
         total_deposited = COALESCE(total_deposited, 0) +
           CASE WHEN _type IN ('credit','deposit','referral','bonus','professional_promo','referral_professional') THEN _amount ELSE 0 END,
         updated_at = now()
   WHERE user_id = _user_id
  RETURNING balance_mzn INTO _new_balance;

  INSERT INTO public.wallet_transactions (
    user_id, type, amount, balance_after, reference_type, reference_id, description, status
  ) VALUES (
    _user_id, _type, _amount, _new_balance, _type, _ref_id, COALESCE(_description, 'Credito'), 'completed'
  );

  RETURN jsonb_build_object('success', true, 'new_balance', _new_balance, 'balance', _new_balance);
END;
$function$;

-- 2. Referral tracking columns
ALTER TABLE public.user_referrals
  ADD COLUMN IF NOT EXISTS referred_role text,
  ADD COLUMN IF NOT EXISTS professional_bonus_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS professional_bonus_mzn numeric NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS user_referrals_referred_unique ON public.user_referrals (referred_id);

-- 3. Consultation payment columns
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- 4. Platform settings
INSERT INTO public.platform_settings (key, value, description)
VALUES ('referral_professional_bonus_mzn', to_jsonb(50), 'Bonus em MZN para quem convida um profissional de saude')
ON CONFLICT (key) DO NOTHING;

-- 5. Award referral bonus when the invited user becomes a professional
CREATE OR REPLACE FUNCTION public.award_professional_referral()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  bonus numeric;
  ref record;
BEGIN
  IF NEW.role::text NOT IN ('doctor','clinic','hospital','lab','pharmacist','insurance','veterinary','store_owner','driver') THEN
    RETURN NEW;
  END IF;

  SELECT * INTO ref
    FROM public.user_referrals
   WHERE referred_id = NEW.user_id
     AND professional_bonus_paid = false
   LIMIT 1;

  IF ref IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE((SELECT (value #>> '{}')::numeric FROM public.platform_settings WHERE key = 'referral_professional_bonus_mzn'), 50)
    INTO bonus;

  IF COALESCE(bonus, 0) <= 0 THEN RETURN NEW; END IF;

  PERFORM public.wallet_credit(
    ref.referrer_id, bonus, 'referral_professional', ref.id,
    'Bonus por convidar um profissional de saude'
  );

  UPDATE public.user_referrals
     SET professional_bonus_paid = true,
         professional_bonus_mzn = bonus,
         referred_role = NEW.role::text,
         status = 'completed',
         completed_at = COALESCE(completed_at, now()),
         paid_at = now()
   WHERE id = ref.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'award_professional_referral failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_award_professional_referral ON public.user_roles;
CREATE TRIGGER trg_award_professional_referral
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.award_professional_referral();

REVOKE EXECUTE ON FUNCTION public.award_professional_referral() FROM anon, authenticated;

-- 6. Manual redemption of an invite code by a logged-in user
CREATE OR REPLACE FUNCTION public.redeem_referral_code(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  norm text := upper(trim(coalesce(p_code, '')));
  referrer uuid;
  new_ref uuid;
  is_professional boolean;
  bonus numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF norm = '' THEN RETURN jsonb_build_object('ok', false, 'error', 'Codigo vazio'); END IF;

  SELECT user_id INTO referrer FROM public.profiles WHERE upper(referral_code) = norm LIMIT 1;
  IF referrer IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Codigo invalido'); END IF;
  IF referrer = uid THEN RETURN jsonb_build_object('ok', false, 'error', 'Nao podes usar o teu proprio codigo'); END IF;

  IF EXISTS (SELECT 1 FROM public.user_referrals WHERE referred_id = uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ja tens um convite associado');
  END IF;

  INSERT INTO public.user_referrals (referrer_id, referred_id, referral_code, status)
  VALUES (referrer, uid, norm, 'completed')
  RETURNING id INTO new_ref;

  UPDATE public.profiles SET referred_by = referrer WHERE user_id = uid AND referred_by IS NULL;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = uid
       AND role::text IN ('doctor','clinic','hospital','lab','pharmacist','insurance','veterinary','store_owner','driver')
  ) INTO is_professional;

  IF is_professional THEN
    SELECT COALESCE((SELECT (value #>> '{}')::numeric FROM public.platform_settings WHERE key = 'referral_professional_bonus_mzn'), 50)
      INTO bonus;
    IF COALESCE(bonus, 0) > 0 THEN
      PERFORM public.wallet_credit(referrer, bonus, 'referral_professional', new_ref,
        'Bonus por convidar um profissional de saude');
      UPDATE public.user_referrals
         SET professional_bonus_paid = true, professional_bonus_mzn = bonus,
             completed_at = now(), paid_at = now()
       WHERE id = new_ref;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'referral_id', new_ref, 'professional_bonus', COALESCE(bonus, 0));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.redeem_referral_code(text) TO authenticated;

-- 7. Booking with optional wallet payment (platform pays the professional)
CREATE OR REPLACE FUNCTION public.book_consultation_atomic(_slot_id uuid, _reason text DEFAULT NULL::text, _coupon_id uuid DEFAULT NULL::uuid, _use_wallet boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  slot record;
  doc record;
  gross numeric;
  cons_id uuid;
  doc_bal numeric;
  min_bal numeric;
  pat_bal numeric;
  pay_method text := 'direct';
  pay_status text := 'pending';
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  UPDATE public.doctor_availability_slots
     SET is_booked = true
   WHERE id = _slot_id AND is_booked = false
  RETURNING id, doctor_id, starts_at INTO slot;

  IF slot IS NULL THEN RAISE EXCEPTION 'slot_unavailable'; END IF;

  SELECT user_id, consultation_fee INTO doc
    FROM public.doctor_profiles WHERE user_id = slot.doctor_id;

  gross := COALESCE(doc.consultation_fee, 0);

  min_bal := public.professional_min_balance();
  IF min_bal > 0 THEN
    PERFORM public.ensure_wallet(slot.doctor_id);
    SELECT COALESCE(balance_mzn, 0) INTO doc_bal FROM public.wallets WHERE user_id = slot.doctor_id;
    IF COALESCE(doc_bal, 0) < min_bal THEN
      UPDATE public.doctor_availability_slots SET is_booked = false WHERE id = slot.id;
      RAISE EXCEPTION 'professional_insufficient_balance';
    END IF;
  END IF;

  IF _use_wallet AND gross > 0 THEN
    PERFORM public.ensure_wallet(uid);
    SELECT COALESCE(balance_mzn, 0) INTO pat_bal FROM public.wallets WHERE user_id = uid;
    IF COALESCE(pat_bal, 0) < gross THEN
      UPDATE public.doctor_availability_slots SET is_booked = false WHERE id = slot.id;
      RAISE EXCEPTION 'patient_insufficient_balance';
    END IF;
    pay_method := 'wallet';
    pay_status := 'paid';
  END IF;

  INSERT INTO public.consultations (doctor_id, patient_id, scheduled_at, consultation_type, reason, fee, status, payment_method, payment_status, paid_at)
  VALUES (slot.doctor_id, uid, slot.starts_at, 'chat', _reason, gross, 'scheduled', pay_method, pay_status,
          CASE WHEN pay_status = 'paid' THEN now() ELSE NULL END)
  RETURNING id INTO cons_id;

  IF pay_method = 'wallet' THEN
    -- Patient pays from wallet balance; the platform credits the professional.
    PERFORM public.wallet_debit(uid, gross, 'consultation', cons_id, 'Pagamento de consulta (saldo da carteira)');
    PERFORM public.wallet_credit(slot.doctor_id, gross, 'consultation_payout', cons_id,
      'Pagamento de consulta liquidado pela plataforma');
  END IF;

  UPDATE public.doctor_availability_slots SET consultation_id = cons_id WHERE id = slot.id;

  RETURN jsonb_build_object(
    'ok', true,
    'consultation_id', cons_id,
    'fee', gross,
    'payment', pay_method
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.book_consultation_atomic(uuid, text, uuid, boolean) TO authenticated;