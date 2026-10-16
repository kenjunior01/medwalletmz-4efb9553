-- =====================================================================
-- F42 — REA "Aplicar tudo": Vouchers de Saúde familiares + Poupança de
--       Saúde com metas + Check-in diário real
-- Metodologia REA (Reverse Engineer Anything — github.com/morluto/rea):
--   Fase 1  Escolher features: vouchers de saúde p/ entes queridos
--           (MediWallet.co.za — seen), poupança de saúde + metas
--           (M-TIBA/CarePay — inferred), streak/check-in (Duolingo — seen).
--   Fase 2  Roteamento pela stack: Supabase Postgres + RLS + RPCs
--           SECURITY DEFINER; cliente nunca envia user_id nem quantias
--           derivadas de confiança.
--   Fase 4  Rótulos: seen = comportamento confirmado nos sites oficiais;
--           inferred = modelo CarePay reconstruído por conhecimento
--           público; unknown = regras exatas de juros/cashback (não
--           copiamos — adaptámo-las ao contexto MZN/M-Pesa).
--   Fase 5  Reconstruir + testar: nenhuma linha/asset copiada — tudo
--           reconstruído nativamente para o ADN MedWallet MZ.
--
-- Requer aplicação no Supabase (Dashboard → SQL Editor ou supabase db push).
-- Idempotente: seguro para re-executar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. user_gamification.last_check_in_date (streak real)
-- ---------------------------------------------------------------------
ALTER TABLE public.user_gamification
  ADD COLUMN IF NOT EXISTS last_check_in_date date;

-- ---------------------------------------------------------------------
-- 1. health_vouchers — voucher de saúde enviado a um ente querido
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.health_vouchers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL UNIQUE,
  sender_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_phone   text,
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount            numeric(12,2) NOT NULL CHECK (amount >= 10 AND amount <= 50000),
  category          text NOT NULL DEFAULT 'qualquer'
                    CHECK (category IN ('farmacia','consulta','exames','qualquer')),
  message           text,
  status            text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','redeemed','cancelled','expired')),
  redeemed_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at       timestamptz,
  expires_at        date,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_vouchers_sender  ON public.health_vouchers (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_vouchers_redeem  ON public.health_vouchers (redeemed_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_vouchers_code    ON public.health_vouchers (upper(code));

ALTER TABLE public.health_vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vouchers read own" ON public.health_vouchers;
CREATE POLICY "Vouchers read own"
  ON public.health_vouchers FOR SELECT
  USING (
    sender_id = auth.uid()
    OR redeemed_by = auth.uid()
    OR recipient_user_id = auth.uid()
  );
-- INSERT/UPDATE/DELETE apenas via RPC SECURITY DEFINER (sem políticas = negado).

-- ---------------------------------------------------------------------
-- 2. savings_goals + savings_transactions — poupança de saúde (M-TIBA)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  category      text NOT NULL DEFAULT 'outro'
                CHECK (category IN ('parto','cirurgia','medicacao','consulta','exames','equipamento','outro')),
  target_amount numeric(12,2) NOT NULL CHECK (target_amount >= 50),
  saved_amount  numeric(12,2) NOT NULL DEFAULT 0 CHECK (saved_amount >= 0),
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON public.savings_goals (user_id, status, created_at DESC);

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Goals own all" ON public.savings_goals;
CREATE POLICY "Goals own all"
  ON public.savings_goals FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.savings_transactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id    uuid NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount     numeric(12,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_savings_tx_goal ON public.savings_transactions (goal_id, created_at DESC);

ALTER TABLE public.savings_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Savings tx own read" ON public.savings_transactions;
CREATE POLICY "Savings tx own read"
  ON public.savings_transactions FOR SELECT
  USING (user_id = auth.uid());
-- INSERT apenas via RPC deposit_savings (definer).

-- ---------------------------------------------------------------------
-- 3. RPC daily_check_in — streak real + recompensa diária
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.daily_check_in()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user      uuid := auth.uid();
  v_row       user_gamification;
  v_today     date := current_date;
  v_yesterday date := current_date - interval '1 day';
  v_coins     int := 5;
  v_xp        int := 15;
  v_old_level int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  INSERT INTO user_gamification (user_id) VALUES (v_user)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_row FROM user_gamification WHERE user_id = v_user FOR UPDATE;

  IF v_row.last_check_in_date = v_today THEN
    RETURN json_build_object(
      'already', true,
      'streak_days', COALESCE(v_row.streak_days, 0)
    );
  END IF;

  v_old_level := v_row.current_level;

  UPDATE user_gamification
  SET streak_days = CASE WHEN v_row.last_check_in_date = v_yesterday
                         THEN COALESCE(v_row.streak_days, 0) + 1 ELSE 1 END,
      last_check_in_date = v_today,
      joy_coins = COALESCE(v_row.joy_coins, 0) + v_coins,
      experience_points = COALESCE(v_row.experience_points, 0) + v_xp,
      current_level = GREATEST(1, FLOOR((COALESCE(v_row.experience_points, 0) + v_xp) / 500.0)::int + 1),
      updated_at = now()
  WHERE user_id = v_user
  RETURNING * INTO v_row;

  INSERT INTO streak_log (user_id, activity_date)
  VALUES (v_user, v_today)
  ON CONFLICT (user_id, activity_date) DO NOTHING;

  INSERT INTO joy_coin_transactions (user_id, amount, transaction_type, description)
  VALUES (v_user, v_coins, 'earned', 'Check-in diário — presença cuidada');

  RETURN json_build_object(
    'already', false,
    'streak_days', v_row.streak_days,
    'coins', v_coins,
    'xp', v_xp,
    'leveled_up', v_row.current_level > v_old_level,
    'level', v_row.current_level
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.daily_check_in() TO authenticated;

-- ---------------------------------------------------------------------
-- 4. RPC create_health_voucher — debita carteira e emite voucher
--    (cliente envia APENAS dados do voucher; user_id vem de auth.uid())
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_health_voucher(
  p_amount           numeric,
  p_category         text DEFAULT 'qualquer',
  p_message          text DEFAULT NULL,
  p_recipient_phone  text DEFAULT NULL,
  p_days_valid       int DEFAULT 60
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user    uuid := auth.uid();
  v_code    text;
  v_id      uuid;
  v_expires date;
  v_msg     text := NULLIF(left(trim(COALESCE(p_message, '')), 160), '');
  v_phone   text := NULLIF(regexp_replace(COALESCE(p_recipient_phone, ''), '[^0-9+]', '', 'g'), '');
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_amount IS NULL OR p_amount < 10 OR p_amount > 50000 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;
  IF p_category NOT IN ('farmacia','consulta','exames','qualquer') THEN
    RAISE EXCEPTION 'INVALID_CATEGORY';
  END IF;

  -- Débito atómico da carteira (FOR UPDATE evita corridas)
  UPDATE wallets
  SET balance_mzn = balance_mzn - p_amount,
      total_spent = total_spent + p_amount
  WHERE user_id = v_user AND balance_mzn >= p_amount;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  v_expires := CASE WHEN p_days_valid BETWEEN 1 AND 365
                    THEN current_date + p_days_valid ELSE current_date + 60 END;

  v_code := 'MW-' ||
    upper(substr(md5(random()::text || clock_timestamp()::text || v_user::text), 1, 4)) || '-' ||
    upper(substr(md5(clock_timestamp()::text || random()::text || v_id::text), 1, 4));

  INSERT INTO health_vouchers (code, sender_id, recipient_phone, amount, category, message, expires_at)
  VALUES (v_code, v_user, v_phone, p_amount, p_category, v_msg, v_expires)
  RETURNING id INTO v_id;

  -- Gamificação: cuidar da família dá XP
  UPDATE user_gamification
  SET experience_points = COALESCE(experience_points, 0) + 25,
      current_level = GREATEST(1, FLOOR((COALESCE(experience_points, 0) + 25) / 500.0)::int + 1),
      updated_at = now()
  WHERE user_id = v_user;

  RETURN json_build_object(
    'id', v_id,
    'code', v_code,
    'amount', p_amount,
    'category', p_category,
    'expires_at', v_expires
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_health_voucher(numeric, text, text, text, int) TO authenticated;

-- ---------------------------------------------------------------------
-- 5. RPC redeem_health_voucher — credita carteira de quem resgata
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_health_voucher(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user    uuid := auth.uid();
  v_voucher health_vouchers;
  v_old_level int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT * INTO v_voucher
  FROM health_vouchers
  WHERE upper(code) = upper(trim(COALESCE(p_code, '')))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VOUCHER_NOT_FOUND';
  END IF;
  IF v_voucher.sender_id = v_user THEN
    RAISE EXCEPTION 'SELF_REDEEM';
  END IF;
  IF v_voucher.status <> 'active' THEN
    RAISE EXCEPTION 'VOUCHER_NOT_ACTIVE';
  END IF;
  IF v_voucher.expires_at IS NOT NULL AND v_voucher.expires_at < current_date THEN
    UPDATE health_vouchers SET status = 'expired' WHERE id = v_voucher.id;
    RAISE EXCEPTION 'VOUCHER_EXPIRED';
  END IF;

  v_old_level := (SELECT current_level FROM user_gamification WHERE user_id = v_user);

  UPDATE health_vouchers
  SET status = 'redeemed', redeemed_by = v_user, redeemed_at = now(), recipient_user_id = v_user
  WHERE id = v_voucher.id;

  -- Crédito na carteira de quem resgata (auto-cria se não existir)
  UPDATE wallets
  SET balance_mzn = balance_mzn + v_voucher.amount,
      total_deposited = total_deposited + v_voucher.amount
  WHERE user_id = v_user;
  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, country_id, currency, balance_mzn, total_deposited, total_spent)
    SELECT v_user, w.country_id, w.currency, v_voucher.amount, v_voucher.amount, 0
    FROM wallets w WHERE w.user_id = v_voucher.sender_id LIMIT 1;
  END IF;

  -- XP de quem recebe cuidado
  INSERT INTO user_gamification (user_id) VALUES (v_user)
  ON CONFLICT (user_id) DO NOTHING;
  UPDATE user_gamification
  SET experience_points = COALESCE(experience_points, 0) + 15,
      current_level = GREATEST(1, FLOOR((COALESCE(experience_points, 0) + 15) / 500.0)::int + 1),
      updated_at = now()
  WHERE user_id = v_user;

  RETURN json_build_object(
    'amount', v_voucher.amount,
    'category', v_voucher.category,
    'sender_message', v_voucher.message
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_health_voucher(text) TO authenticated;

-- ---------------------------------------------------------------------
-- 6. RPC cancel_health_voucher — emissor cancela e reembolsa
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_health_voucher(p_voucher_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user    uuid := auth.uid();
  v_voucher health_vouchers;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT * INTO v_voucher FROM health_vouchers WHERE id = p_voucher_id FOR UPDATE;

  IF NOT FOUND OR v_voucher.sender_id <> v_user THEN
    RAISE EXCEPTION 'VOUCHER_NOT_YOURS';
  END IF;
  IF v_voucher.status <> 'active' THEN
    RAISE EXCEPTION 'VOUCHER_NOT_ACTIVE';
  END IF;

  UPDATE health_vouchers SET status = 'cancelled' WHERE id = v_voucher.id;

  UPDATE wallets
  SET balance_mzn = balance_mzn + v_voucher.amount,
      total_spent = GREATEST(0, total_spent - v_voucher.amount)
  WHERE user_id = v_user;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_health_voucher(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 7. RPC deposit_savings — deposita numa meta (debita carteira)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deposit_savings(p_goal_id uuid, p_amount numeric)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user  uuid := auth.uid();
  v_goal  savings_goals;
  v_done  boolean := false;
  v_bonus int := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_amount IS NULL OR p_amount < 10 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  SELECT * INTO v_goal FROM savings_goals WHERE id = p_goal_id FOR UPDATE;
  IF NOT FOUND OR v_goal.user_id <> v_user THEN
    RAISE EXCEPTION 'GOAL_NOT_YOURS';
  END IF;
  IF v_goal.status <> 'active' THEN
    RAISE EXCEPTION 'GOAL_NOT_ACTIVE';
  END IF;

  UPDATE wallets
  SET balance_mzn = balance_mzn - p_amount,
      total_spent = total_spent + p_amount
  WHERE user_id = v_user AND balance_mzn >= p_amount;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  INSERT INTO savings_transactions (goal_id, user_id, amount)
  VALUES (v_goal.id, v_user, p_amount);

  UPDATE savings_goals
  SET saved_amount = saved_amount + p_amount
  WHERE id = v_goal.id
  RETURNING * INTO v_goal;

  IF v_goal.saved_amount >= v_goal.target_amount THEN
    v_done := true;
    v_bonus := 50;
    UPDATE savings_goals
    SET status = 'completed', completed_at = now()
    WHERE id = v_goal.id;
  END IF;

  -- XP: +10 por depósito, +50 bónus ao concluir a meta
  INSERT INTO user_gamification (user_id) VALUES (v_user)
  ON CONFLICT (user_id) DO NOTHING;
  UPDATE user_gamification
  SET experience_points = COALESCE(experience_points, 0) + 10 + v_bonus,
      current_level = GREATEST(1, FLOOR((COALESCE(experience_points, 0) + 10 + v_bonus) / 500.0)::int + 1),
      updated_at = now()
  WHERE user_id = v_user;

  RETURN json_build_object(
    'saved_amount', v_goal.saved_amount,
    'target_amount', v_goal.target_amount,
    'completed', v_done,
    'bonus_xp', v_bonus
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.deposit_savings(uuid, numeric) TO authenticated;
