
-- ============ WALLET ============
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_mzn NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (balance_mzn >= 0),
  currency TEXT NOT NULL DEFAULT 'MZN',
  total_deposited NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own wallet" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own wallet" ON public.wallets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all wallets" ON public.wallets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage wallets" ON public.wallets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ WALLET TRANSACTIONS ============
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit','debit','credit','refund','bonus','commission','referral')),
  amount NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','reversed')),
  payment_method TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own transactions" ON public.wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own transactions" ON public.wallet_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all transactions" ON public.wallet_transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_wallet_tx_user ON public.wallet_transactions(user_id, created_at DESC);

-- ============ PLATFORM SETTINGS ============
CREATE TABLE public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO authenticated, anon;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone read settings" ON public.platform_settings FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Admins manage settings" ON public.platform_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('default_commission_percent', '10'::jsonb, 'Comissão padrão da plataforma (%)'),
  ('deposit_bonus_percent', '5'::jsonb, 'Bónus em % quando utilizador deposita saldo'),
  ('min_deposit_mzn', '50'::jsonb, 'Depósito mínimo na carteira (MZN)'),
  ('referral_bonus_mzn', '100'::jsonb, 'Bónus em MZN ao concluir uma referência'),
  ('referral_bonus_coins', '100'::jsonb, 'Bónus em Joy Coins ao concluir uma referência'),
  ('referral_referred_coins', '50'::jsonb, 'Joy Coins para o convidado'),
  ('wallet_required_for_services', 'false'::jsonb, 'Se true, serviços só podem ser pagos via carteira');

-- ============ SERVICE COMMISSIONS ============
CREATE TABLE public.service_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL CHECK (service_type IN ('consultation','prescription','pharmacy_order','delivery','subscription')),
  role app_role NOT NULL,
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_type, role)
);
GRANT SELECT ON public.service_commissions TO authenticated;
GRANT ALL ON public.service_commissions TO service_role;
ALTER TABLE public.service_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read commissions" ON public.service_commissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage commissions" ON public.service_commissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_service_commissions_updated_at BEFORE UPDATE ON public.service_commissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.service_commissions (service_type, role, percentage) VALUES
  ('consultation','doctor', 12),
  ('consultation','clinic', 10),
  ('consultation','customer', 0),
  ('prescription','doctor', 5),
  ('pharmacy_order','store_owner', 8),
  ('delivery','driver', 15),
  ('subscription','customer', 0);

-- ============ COUPON BATCHES ============
CREATE TABLE public.coupon_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  total_codes INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_batches TO authenticated;
GRANT ALL ON public.coupon_batches TO service_role;
ALTER TABLE public.coupon_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage batches" ON public.coupon_batches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ COUPONS extension ============
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS target_roles app_role[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_services TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'manual' CHECK (event_type IN ('manual','first_purchase','birthday','referral','campaign','welcome')),
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.coupon_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to_user UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Allow authenticated to read active coupons (for browsing)
DROP POLICY IF EXISTS "Authenticated read active coupons" ON public.coupons;
CREATE POLICY "Authenticated read active coupons" ON public.coupons FOR SELECT TO authenticated USING (is_active = true);

-- ============ USER REFERRALS extension ============
ALTER TABLE public.user_referrals
  ADD COLUMN IF NOT EXISTS bonus_mzn NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_coins INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- ============ CONSULTATION REMINDERS extension ============
ALTER TABLE public.consultation_reminders
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','sent','cancelled'));

-- ============ FUNCTIONS ============

-- Ensure wallet exists
CREATE OR REPLACE FUNCTION public.ensure_wallet(_user_id UUID)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.wallets;
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO w FROM public.wallets WHERE user_id = _user_id;
  RETURN w;
END;
$$;

-- Deposit (with optional bonus)
CREATE OR REPLACE FUNCTION public.wallet_deposit(
  _user_id UUID, _amount NUMERIC, _method TEXT DEFAULT 'mpesa', _ref UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_bal NUMERIC;
  bonus_pct NUMERIC;
  bonus NUMERIC;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  PERFORM public.ensure_wallet(_user_id);
  SELECT COALESCE((value::text)::numeric, 0) INTO bonus_pct FROM public.platform_settings WHERE key = 'deposit_bonus_percent';
  bonus := ROUND(_amount * COALESCE(bonus_pct,0) / 100, 2);

  UPDATE public.wallets
    SET balance_mzn = balance_mzn + _amount + bonus,
        total_deposited = total_deposited + _amount
    WHERE user_id = _user_id
    RETURNING balance_mzn INTO new_bal;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, description, payment_method)
  VALUES (_user_id, 'deposit', _amount, new_bal - bonus, 'deposit', _ref, 'Depósito via ' || _method, _method);

  IF bonus > 0 THEN
    INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_type, description)
    VALUES (_user_id, 'bonus', bonus, new_bal, 'deposit_bonus', 'Bónus de depósito ' || bonus_pct || '%');
  END IF;

  RETURN jsonb_build_object('balance', new_bal, 'bonus', bonus);
END;
$$;

-- Debit (used for service payments). Applies commission % based on (service_type, role of beneficiary).
CREATE OR REPLACE FUNCTION public.wallet_debit(
  _user_id UUID, _amount NUMERIC, _service_type TEXT, _ref_id UUID, _description TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  cur_bal NUMERIC;
  new_bal NUMERIC;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  PERFORM public.ensure_wallet(_user_id);
  SELECT balance_mzn INTO cur_bal FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF cur_bal < _amount THEN
    RAISE EXCEPTION 'Saldo insuficiente. Atual: % MZN, requerido: % MZN', cur_bal, _amount;
  END IF;

  UPDATE public.wallets
    SET balance_mzn = balance_mzn - _amount,
        total_spent = total_spent + _amount
    WHERE user_id = _user_id
    RETURNING balance_mzn INTO new_bal;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, description)
  VALUES (_user_id, 'debit', _amount, new_bal, _service_type, _ref_id, COALESCE(_description, 'Pagamento ' || _service_type));

  RETURN jsonb_build_object('balance', new_bal);
END;
$$;

-- Credit (e.g., admin adjustment, refund)
CREATE OR REPLACE FUNCTION public.wallet_credit(
  _user_id UUID, _amount NUMERIC, _type TEXT DEFAULT 'credit', _ref_id UUID DEFAULT NULL, _description TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_bal NUMERIC;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  PERFORM public.ensure_wallet(_user_id);
  UPDATE public.wallets SET balance_mzn = balance_mzn + _amount WHERE user_id = _user_id RETURNING balance_mzn INTO new_bal;
  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, description)
  VALUES (_user_id, _type, _amount, new_bal, _type, _ref_id, COALESCE(_description, 'Crédito'));
  RETURN jsonb_build_object('balance', new_bal);
END;
$$;

-- Apply referral bonus when referral completes
CREATE OR REPLACE FUNCTION public.apply_referral_bonus()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  bonus_mzn NUMERIC;
  bonus_coins INTEGER;
  referred_coins INTEGER;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT (value::text)::numeric INTO bonus_mzn FROM public.platform_settings WHERE key='referral_bonus_mzn';
    SELECT (value::text)::integer INTO bonus_coins FROM public.platform_settings WHERE key='referral_bonus_coins';
    SELECT (value::text)::integer INTO referred_coins FROM public.platform_settings WHERE key='referral_referred_coins';

    -- Wallet credit referrer
    PERFORM public.wallet_credit(NEW.referrer_id, COALESCE(bonus_mzn,0), 'referral', NEW.id, 'Bónus por convidar amigo');
    -- Wallet credit a smaller amount to referred (welcome) — half of referrer
    PERFORM public.wallet_credit(NEW.referred_id, ROUND(COALESCE(bonus_mzn,0)/2,2), 'referral', NEW.id, 'Bónus boas-vindas');

    -- Joy coins
    INSERT INTO public.joy_coin_transactions (user_id, amount, type, reference_type, reference_id, description)
    VALUES (NEW.referrer_id, COALESCE(bonus_coins,0), 'earned', 'referral', NEW.id, 'Convite concluído');
    INSERT INTO public.joy_coin_transactions (user_id, amount, type, reference_type, reference_id, description)
    VALUES (NEW.referred_id, COALESCE(referred_coins,0), 'earned', 'referral', NEW.id, 'Boas-vindas');

    NEW.bonus_mzn := COALESCE(bonus_mzn,0);
    NEW.bonus_coins := COALESCE(bonus_coins,0);
    NEW.paid_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_referral_bonus ON public.user_referrals;
CREATE TRIGGER trg_apply_referral_bonus
  BEFORE UPDATE ON public.user_referrals
  FOR EACH ROW EXECUTE FUNCTION public.apply_referral_bonus();

-- Auto-create wallet on new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  INSERT INTO public.patient_profiles (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Enable Realtime for wallets and transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
