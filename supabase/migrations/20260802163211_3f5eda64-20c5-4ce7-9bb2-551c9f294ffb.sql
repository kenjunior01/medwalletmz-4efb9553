-- =====================================================================
-- 1. PAYMENT RECEIPTS
-- =====================================================================
CREATE SEQUENCE IF NOT EXISTS public.receipt_number_seq START 1000;

CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text NOT NULL UNIQUE,
  payer_id uuid NOT NULL,
  payee_id uuid,
  service_type text NOT NULL DEFAULT 'consultation',
  reference_id uuid,
  gross_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  net_payout numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'MZN',
  payment_method text NOT NULL DEFAULT 'wallet',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_receipts TO authenticated;
GRANT ALL ON public.payment_receipts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.receipt_number_seq TO service_role;

ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "receipts_owner_read" ON public.payment_receipts;
CREATE POLICY "receipts_owner_read" ON public.payment_receipts
  FOR SELECT TO authenticated
  USING (payer_id = auth.uid() OR payee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_payment_receipts_updated ON public.payment_receipts;
CREATE TRIGGER trg_payment_receipts_updated
  BEFORE UPDATE ON public.payment_receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_receipts_payer ON public.payment_receipts(payer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_payee ON public.payment_receipts(payee_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_unique_ref
  ON public.payment_receipts(service_type, reference_id) WHERE reference_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.issue_payment_receipt(
  _payer uuid, _payee uuid, _service_type text, _reference_id uuid,
  _gross numeric, _discount numeric, _paid numeric,
  _commission_rate numeric, _payment_method text, _currency text,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS public.payment_receipts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.payment_receipts;
  comm numeric := round(COALESCE(_paid,0) * COALESCE(_commission_rate,0) / 100.0, 2);
BEGIN
  INSERT INTO public.payment_receipts (
    receipt_number, payer_id, payee_id, service_type, reference_id,
    gross_amount, discount_amount, amount_paid, commission_rate,
    commission_amount, net_payout, currency, payment_method, metadata
  ) VALUES (
    'MW-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('public.receipt_number_seq')::text, 6, '0'),
    _payer, _payee, _service_type, _reference_id,
    COALESCE(_gross,0), COALESCE(_discount,0), COALESCE(_paid,0), COALESCE(_commission_rate,0),
    comm, GREATEST(COALESCE(_paid,0) - comm, 0), COALESCE(_currency,'MZN'),
    COALESCE(_payment_method,'wallet'), COALESCE(_metadata,'{}'::jsonb)
  )
  ON CONFLICT (service_type, reference_id) DO UPDATE SET updated_at = now()
  RETURNING * INTO r;
  RETURN r;
END; $$;

REVOKE ALL ON FUNCTION public.issue_payment_receipt(uuid,uuid,text,uuid,numeric,numeric,numeric,numeric,text,text,jsonb) FROM PUBLIC, anon, authenticated;

-- =====================================================================
-- 2. BOOKING WITH COMMISSION + RECEIPT
-- =====================================================================
DROP FUNCTION IF EXISTS public.book_consultation_atomic(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.book_consultation_atomic(
  _slot_id uuid, _reason text DEFAULT NULL, _coupon_id uuid DEFAULT NULL, _use_wallet boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  slot record; doc record;
  gross numeric; cons_id uuid;
  doc_bal numeric; min_bal numeric; pat_bal numeric;
  pay_method text := 'direct'; pay_status text := 'pending';
  comm_rate numeric := 0; comm numeric := 0; net numeric := 0;
  cur text := 'MZN'; rc public.payment_receipts;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  UPDATE public.doctor_availability_slots SET is_booked = true
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
    SELECT COALESCE(balance_mzn, 0), COALESCE(currency,'MZN') INTO pat_bal, cur
      FROM public.wallets WHERE user_id = uid;
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
    SELECT COALESCE(percentage, 0) INTO comm_rate
      FROM public.service_commissions
     WHERE service_type = 'consultation' AND is_active = true
     LIMIT 1;
    comm_rate := COALESCE(comm_rate, 0);
    comm := round(gross * comm_rate / 100.0, 2);
    net := GREATEST(gross - comm, 0);

    PERFORM public.wallet_debit(uid, gross, 'consultation', cons_id, 'Pagamento de consulta (saldo da carteira)');
    IF net > 0 THEN
      PERFORM public.wallet_credit(slot.doctor_id, net, 'consultation_payout', cons_id,
        'Liquidacao de consulta pela plataforma');
    END IF;

    SELECT * INTO rc FROM public.issue_payment_receipt(
      uid, slot.doctor_id, 'consultation', cons_id,
      gross, 0, gross, comm_rate, 'wallet', cur,
      jsonb_build_object('scheduled_at', slot.starts_at)
    );
  END IF;

  UPDATE public.doctor_availability_slots SET consultation_id = cons_id WHERE id = slot.id;

  RETURN jsonb_build_object(
    'ok', true, 'consultation_id', cons_id, 'fee', gross, 'payment', pay_method,
    'receipt_id', rc.id, 'receipt_number', rc.receipt_number,
    'commission', comm, 'net_payout', net
  );
END; $$;

-- =====================================================================
-- 3. REFERRAL ANTI-ABUSE
-- =====================================================================
DELETE FROM public.user_referrals a
 USING public.user_referrals b
 WHERE a.referred_id = b.referred_id AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_referrals_referred_unique
  ON public.user_referrals(referred_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_tx_referral_unique
  ON public.wallet_transactions(user_id, reference_type, reference_id)
  WHERE reference_type = 'referral_professional' AND reference_id IS NOT NULL;

INSERT INTO public.platform_settings (key, value)
VALUES ('referral_max_per_day', '10'::jsonb), ('referral_redeem_window_days', '30'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.redeem_referral_code(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  norm text := upper(trim(coalesce(p_code, '')));
  referrer uuid; new_ref uuid;
  is_pro boolean; bonus numeric;
  acct_created timestamptz; win_days int; max_day int; today_count int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF norm = '' THEN RETURN jsonb_build_object('ok', false, 'error', 'Codigo vazio'); END IF;

  SELECT user_id INTO referrer FROM public.profiles WHERE upper(referral_code) = norm LIMIT 1;
  IF referrer IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Codigo invalido ou expirado'); END IF;
  IF referrer = uid THEN RETURN jsonb_build_object('ok', false, 'error', 'Nao podes usar o teu proprio codigo'); END IF;

  IF EXISTS (SELECT 1 FROM public.user_referrals WHERE referred_id = uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este codigo ja foi usado nesta conta');
  END IF;

  SELECT COALESCE((SELECT (value #>> '{}')::int FROM public.platform_settings WHERE key = 'referral_redeem_window_days'), 30) INTO win_days;
  SELECT created_at INTO acct_created FROM public.profiles WHERE user_id = uid;
  IF acct_created IS NOT NULL AND acct_created < now() - (win_days || ' days')::interval THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Prazo para resgatar convites expirou');
  END IF;

  SELECT COALESCE((SELECT (value #>> '{}')::int FROM public.platform_settings WHERE key = 'referral_max_per_day'), 10) INTO max_day;
  SELECT count(*) INTO today_count FROM public.user_referrals
   WHERE referrer_id = referrer AND created_at > now() - interval '1 day';
  IF today_count >= max_day THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este codigo atingiu o limite diario de convites');
  END IF;

  BEGIN
    INSERT INTO public.user_referrals (referrer_id, referred_id, referral_code, status)
    VALUES (referrer, uid, norm, 'completed')
    RETURNING id INTO new_ref;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este codigo ja foi usado nesta conta');
  END;

  UPDATE public.profiles SET referred_by = referrer WHERE user_id = uid AND referred_by IS NULL;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = uid
       AND role::text IN ('doctor','clinic','hospital','lab','pharmacist','insurance','veterinary','store_owner','driver')
  ) INTO is_pro;

  IF is_pro THEN
    SELECT COALESCE((SELECT (value #>> '{}')::numeric FROM public.platform_settings WHERE key = 'referral_professional_bonus_mzn'), 50) INTO bonus;
    IF COALESCE(bonus, 0) > 0 THEN
      BEGIN
        PERFORM public.wallet_credit(referrer, bonus, 'referral_professional', new_ref,
          'Bonus por convidar um profissional de saude');
        UPDATE public.user_referrals
           SET professional_bonus_paid = true, professional_bonus_mzn = bonus,
               completed_at = now(), paid_at = now()
         WHERE id = new_ref AND professional_bonus_paid = false;
      EXCEPTION WHEN unique_violation THEN NULL;
      END;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'referral_id', new_ref, 'professional_bonus', COALESCE(bonus, 0));
END; $$;

CREATE OR REPLACE FUNCTION public.award_professional_referral()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bonus numeric; ref record;
BEGIN
  IF NEW.role::text NOT IN ('doctor','clinic','hospital','lab','pharmacist','insurance','veterinary','store_owner','driver') THEN
    RETURN NEW;
  END IF;

  SELECT * INTO ref FROM public.user_referrals
   WHERE referred_id = NEW.user_id AND professional_bonus_paid = false
   FOR UPDATE LIMIT 1;
  IF ref IS NULL THEN RETURN NEW; END IF;
  IF ref.referrer_id = NEW.user_id THEN RETURN NEW; END IF;

  SELECT COALESCE((SELECT (value #>> '{}')::numeric FROM public.platform_settings WHERE key = 'referral_professional_bonus_mzn'), 50) INTO bonus;
  IF COALESCE(bonus, 0) <= 0 THEN RETURN NEW; END IF;

  PERFORM public.wallet_credit(ref.referrer_id, bonus, 'referral_professional', ref.id,
    'Bonus por convidar um profissional de saude');

  UPDATE public.user_referrals
     SET professional_bonus_paid = true, professional_bonus_mzn = bonus,
         referred_role = NEW.role::text, status = 'completed',
         completed_at = COALESCE(completed_at, now()), paid_at = now()
   WHERE id = ref.id AND professional_bonus_paid = false;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'award_professional_referral failed: %', SQLERRM;
  RETURN NEW;
END; $$;

-- =====================================================================
-- 4. UNIFIED CHAT
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'direct',
  title text,
  context_type text,
  context_id uuid,
  created_by uuid NOT NULL,
  last_message text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text,
  kind text NOT NULL DEFAULT 'text',
  attachment_url text,
  attachment_type text,
  attachment_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.chat_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_participants TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_threads, public.chat_participants, public.chat_messages TO service_role;

CREATE OR REPLACE FUNCTION public.is_thread_participant(_thread uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_participants WHERE thread_id = _thread AND user_id = _user);
$$;
REVOKE ALL ON FUNCTION public.is_thread_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_thread_participant(uuid, uuid) TO authenticated, service_role;

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "threads_read" ON public.chat_threads;
CREATE POLICY "threads_read" ON public.chat_threads FOR SELECT TO authenticated
  USING (public.is_thread_participant(id, auth.uid()));
DROP POLICY IF EXISTS "threads_insert" ON public.chat_threads;
CREATE POLICY "threads_insert" ON public.chat_threads FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS "threads_update" ON public.chat_threads;
CREATE POLICY "threads_update" ON public.chat_threads FOR UPDATE TO authenticated
  USING (public.is_thread_participant(id, auth.uid()))
  WITH CHECK (public.is_thread_participant(id, auth.uid()));

DROP POLICY IF EXISTS "participants_read" ON public.chat_participants;
CREATE POLICY "participants_read" ON public.chat_participants FOR SELECT TO authenticated
  USING (public.is_thread_participant(thread_id, auth.uid()));
DROP POLICY IF EXISTS "participants_insert" ON public.chat_participants;
CREATE POLICY "participants_insert" ON public.chat_participants FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND t.created_by = auth.uid())
  );
DROP POLICY IF EXISTS "participants_update_self" ON public.chat_participants;
CREATE POLICY "participants_update_self" ON public.chat_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "messages_read" ON public.chat_messages;
CREATE POLICY "messages_read" ON public.chat_messages FOR SELECT TO authenticated
  USING (public.is_thread_participant(thread_id, auth.uid()));
DROP POLICY IF EXISTS "messages_insert" ON public.chat_messages;
CREATE POLICY "messages_insert" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_thread_participant(thread_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON public.chat_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON public.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_last ON public.chat_threads(last_message_at DESC);

CREATE OR REPLACE FUNCTION public.chat_touch_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.chat_threads
     SET last_message_at = NEW.created_at,
         last_message = left(COALESCE(NEW.body, NEW.attachment_name, 'Anexo'), 160),
         updated_at = now()
   WHERE id = NEW.thread_id;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.chat_touch_thread() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_chat_touch_thread ON public.chat_messages;
CREATE TRIGGER trg_chat_touch_thread AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.chat_touch_thread();

CREATE OR REPLACE FUNCTION public.get_or_create_direct_thread(
  _other uuid, _kind text DEFAULT 'direct', _context_type text DEFAULT NULL,
  _context_id uuid DEFAULT NULL, _title text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); tid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _other IS NULL OR _other = uid THEN RAISE EXCEPTION 'invalid_participant'; END IF;

  SELECT t.id INTO tid FROM public.chat_threads t
   WHERE COALESCE(t.context_type,'') = COALESCE(_context_type,'')
     AND COALESCE(t.context_id, '00000000-0000-0000-0000-000000000000'::uuid)
         = COALESCE(_context_id, '00000000-0000-0000-0000-000000000000'::uuid)
     AND EXISTS (SELECT 1 FROM public.chat_participants p WHERE p.thread_id = t.id AND p.user_id = uid)
     AND EXISTS (SELECT 1 FROM public.chat_participants p WHERE p.thread_id = t.id AND p.user_id = _other)
   ORDER BY t.created_at LIMIT 1;

  IF tid IS NOT NULL THEN RETURN tid; END IF;

  INSERT INTO public.chat_threads (kind, title, context_type, context_id, created_by)
  VALUES (COALESCE(_kind,'direct'), _title, _context_type, _context_id, uid)
  RETURNING id INTO tid;

  INSERT INTO public.chat_participants (thread_id, user_id, role)
  VALUES (tid, uid, 'owner'), (tid, _other, 'member')
  ON CONFLICT DO NOTHING;

  RETURN tid;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_thread(uuid, text, text, uuid, text) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;