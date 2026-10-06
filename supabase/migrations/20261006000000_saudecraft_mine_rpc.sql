-- ═══════════════════════════════════════════════════════════════════════════
-- F41 — SaúdeCraft: jogo de mineração estilo Minecraft (web + APK)
-- ═══════════════════════════════════════════════════════════════════════════
-- O jogador minera blocos de saúde (cada toque = 1 golpe de picareta).
-- O cliente joga 100% offline-first e sincroniza sessões via RPC; o SERVIDOR
-- é a única fonte de verdade para quantias:
--   • O cliente envia APENAS a contagem de golpes da sessão;
--   • Moedas/XP são calculados no servidor (taxa por nível, nunca do cliente);
--   • Tecto diário duro: 400 golpes/dia por utilizador (anti-abuso/anti-bot);
--   • Sessões concorrentes são protegidas por FOR UPDATE na linha do dia.
--
-- Taxa: coins = floor(golpes × (0.5 + 0.02 × nível)), tecto 1.0/golpe.
-- XP:   1 XP por golpe (mesma regra dos Pulse points: 500 XP = +1 nível).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Livro diário de mineração (quota + auditoria) ──────────────────────
CREATE TABLE IF NOT EXISTS public.game_mine_daily (
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day        date        NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  blocks     integer     NOT NULL DEFAULT 0,
  coins      integer     NOT NULL DEFAULT 0,
  xp         integer     NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
CREATE INDEX IF NOT EXISTS game_mine_daily_day_idx
  ON public.game_mine_daily (day);

ALTER TABLE public.game_mine_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own mine quota" ON public.game_mine_daily;
CREATE POLICY "Users read own mine quota"
  ON public.game_mine_daily FOR SELECT
  USING (auth.uid() = user_id);
-- Sem políticas INSERT/UPDATE/DELETE: escritas apenas via RPC (SECURITY DEFINER).
GRANT SELECT ON public.game_mine_daily TO authenticated;

-- ── 2. RPC submit_mine_session — sincroniza golpes e credita Joy Coins ────
CREATE OR REPLACE FUNCTION public.submit_mine_session(p_blocks_mined integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user        uuid := auth.uid();
  v_requested   integer := LEAST(GREATEST(COALESCE(p_blocks_mined, 0), 0), 400);
  v_daily_cap   constant integer := 400;
  v_prev_blocks integer := 0;
  v_room        integer;
  v_credited    integer := 0;
  v_rate        numeric;
  v_level_now   integer;
  v_coins       integer := 0;
  v_xp          integer := 0;
  v_total_coins integer;
  v_total_xp    integer;
  v_level       integer;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF v_requested <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'empty_session');
  END IF;

  -- Taxa por nível actual do jogador (500 XP = 1 nível, tecto nível 25)
  SELECT experience_points
    INTO v_level_now
    FROM public.user_gamification
   WHERE user_id = v_user;
  v_level_now := GREATEST(1, FLOOR(COALESCE(v_level_now, 0) / 500.0)::int + 1);
  v_rate := LEAST(0.5 + 0.02 * v_level_now, 1.0);

  BEGIN
    -- Trava a linha do dia para corridas entre dispositivos/abas
    SELECT blocks
      INTO v_prev_blocks
      FROM public.game_mine_daily
     WHERE user_id = v_user
       AND day = (now() AT TIME ZONE 'utc')::date
       FOR UPDATE;

    IF FOUND THEN
      v_room := v_daily_cap - v_prev_blocks;
      IF v_room <= 0 THEN
        RETURN json_build_object(
          'success', true,
          'blocks_credited', 0,
          'blocks_remaining_today', 0,
          'coins_awarded', 0,
          'xp_awarded', 0,
          'reason', 'daily_cap_reached');
      END IF;
      v_credited := LEAST(v_requested, v_room);
      v_coins    := FLOOR(v_credited * v_rate)::int;
      v_xp       := v_credited; -- 1 XP por golpe
      UPDATE public.game_mine_daily
         SET blocks     = blocks + v_credited,
             coins      = coins + v_coins,
             xp         = xp + v_xp,
             updated_at = now()
       WHERE user_id = v_user
         AND day = (now() AT TIME ZONE 'utc')::date;
    ELSE
      v_credited := v_requested;
      v_coins    := FLOOR(v_credited * v_rate)::int;
      v_xp       := v_credited;
      INSERT INTO public.game_mine_daily (user_id, day, blocks, coins, xp)
      VALUES (v_user, (now() AT TIME ZONE 'utc')::date, v_credited, v_coins, v_xp);
    END IF;
  EXCEPTION WHEN unique_violation THEN
    -- Corrida na 1.ª sessão do dia: devolve 0 (a outra sessão creditou)
    RETURN json_build_object('success', true, 'blocks_credited', 0,
                             'reason', 'concurrent_first_session');
  END;

  IF v_credited <= 0 THEN
    RETURN json_build_object('success', true, 'blocks_credited', 0,
                             'coins_awarded', 0, 'reason', 'daily_cap_reached');
  END IF;

  -- Crédito em user_gamification (user_id UNIQUE → upsert seguro)
  UPDATE public.user_gamification
     SET joy_coins         = joy_coins + v_coins,
         experience_points = experience_points + v_xp,
         updated_at        = now()
   WHERE user_id = v_user;
  IF NOT FOUND THEN
    INSERT INTO public.user_gamification (user_id, joy_coins, experience_points)
    VALUES (v_user, v_coins, v_xp);
  END IF;

  -- Contabilidade de Joy Coins (1 linha por sessão sincronizada)
  IF v_coins > 0 THEN
    INSERT INTO public.joy_coin_transactions
      (user_id, amount, transaction_type, description, reference_id)
    VALUES
      (v_user, v_coins, 'game_mining',
       'SaúdeCraft: ' || v_credited || ' blocos minerados', NULL);
  END IF;

  -- Recalcular nível (fórmula única: 500 XP por nível)
  SELECT joy_coins, experience_points
    INTO v_total_coins, v_total_xp
    FROM public.user_gamification
   WHERE user_id = v_user;
  v_level := GREATEST(1, FLOOR(v_total_xp / 500.0)::int + 1);
  UPDATE public.user_gamification
     SET current_level = v_level
   WHERE user_id = v_user;

  RETURN json_build_object(
    'success', true,
    'blocks_credited', v_credited,
    'coins_awarded', v_coins,
    'xp_awarded', v_xp,
    'blocks_remaining_today', GREATEST(0, v_daily_cap - v_prev_blocks - v_credited),
    'total_joy_coins', v_total_coins,
    'total_xp', v_total_xp,
    'level', v_level);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_mine_session(integer) TO authenticated;
