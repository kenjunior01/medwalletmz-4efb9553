-- ═══════════════════════════════════════════════════════════════════════════
-- F39 — Recompensas do lado do servidor (quizzes Pulse + desafios)
-- ═══════════════════════════════════════════════════════════════════════════
-- Problema: a web chama rpc('claim_challenge_reward') que NÃO existia no
-- servidor (erro runtime ao reclamar recompensa de desafio concluído), e os
-- pontos Pulse dos quizzes da Educação em Saúde (F35) viviam só em
-- localStorage/SharedPreferences — sem sincronização entre dispositivos.
--
-- Solução 100% aditiva e idempotente:
--   1) RPC claim_challenge_reward(p_challenge_id)  — valida progresso,
--      janela activa e anti-duplo-claim (UPDATE condicional), credita
--      joy_coins + xp em user_gamification e registra joy_coin_transactions.
--   2) Tabelas edu_quiz_results (melhor score por quiz, dedup) e
--      edu_quiz_awards (livro diário p/ tecto anti-abuso) + RPC
--      award_pulse_points(p_article_id, p_correct) — credita apenas o
--      MELHOR resultado de cada quiz e limita a 120 pontos/dia; os pontos
--      entram em experience_points (XP) e recalculam current_level.
--
-- Segurança: todas as escritas passam por funções SECURITY DEFINER com
-- auth.uid() — o cliente nunca envia quantias nem manipula saldos.
-- Nível: current_level = GREATEST(1, FLOOR(experience_points / 500) + 1).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Recompensa de desafio (desafios do useGamification) ─────────────────
CREATE OR REPLACE FUNCTION public.claim_challenge_reward(p_challenge_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user      uuid := auth.uid();
  v_challenge public.challenges%ROWTYPE;
  v_uc        public.user_challenges%ROWTYPE;
  v_reward    integer;
  v_xp        integer;
  v_updated   integer;
  v_coins     integer;
  v_total_xp  integer;
  v_level     integer;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_challenge FROM public.challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'challenge_not_found');
  END IF;

  SELECT * INTO v_uc
    FROM public.user_challenges
   WHERE user_id = v_user AND challenge_id = p_challenge_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'not_enrolled');
  END IF;

  IF v_uc.completed_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'already_claimed');
  END IF;

  IF COALESCE(v_uc.current_value, 0) < v_challenge.target_value THEN
    RETURN json_build_object('success', false, 'error', 'target_not_reached');
  END IF;

  IF v_challenge.is_active IS NOT NULL AND v_challenge.is_active = false THEN
    RETURN json_build_object('success', false, 'error', 'challenge_not_active');
  END IF;
  IF v_challenge.starts_at IS NOT NULL AND now() < v_challenge.starts_at THEN
    RETURN json_build_object('success', false, 'error', 'challenge_not_active');
  END IF;
  IF v_challenge.ends_at IS NOT NULL AND now() > v_challenge.ends_at THEN
    RETURN json_build_object('success', false, 'error', 'challenge_expired');
  END IF;

  -- Claim atómico: só passa se completed_at ainda for NULL (corrida segura)
  UPDATE public.user_challenges
     SET completed_at = now()
   WHERE id = v_uc.id
     AND completed_at IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN json_build_object('success', false, 'error', 'already_claimed');
  END IF;

  v_reward := COALESCE(v_challenge.joy_coins_reward, 0);
  v_xp     := COALESCE(v_challenge.xp_reward, 0);

  -- Crédito em user_gamification (user_id tem UNIQUE — ON CONFLICT seguro)
  UPDATE public.user_gamification
     SET joy_coins         = joy_coins + v_reward,
         experience_points = experience_points + v_xp,
         updated_at        = now()
   WHERE user_id = v_user;
  IF NOT FOUND THEN
    INSERT INTO public.user_gamification (user_id, joy_coins, experience_points)
    VALUES (v_user, v_reward, v_xp);
  END IF;

  -- Registo na contabilidade de Joy Coins
  IF v_reward > 0 THEN
    INSERT INTO public.joy_coin_transactions
      (user_id, amount, transaction_type, description, reference_id)
    VALUES
      (v_user, v_reward, 'challenge_reward',
       'Recompensa do desafio: ' || COALESCE(v_challenge.title, 'desafio'),
       v_challenge.id::text);
  END IF;

  -- Recalcular nível (fórmula única: 500 xp por nível)
  SELECT joy_coins, experience_points
    INTO v_coins, v_total_xp
    FROM public.user_gamification
   WHERE user_id = v_user;
  v_level := GREATEST(1, FLOOR(v_total_xp / 500.0)::int + 1);
  UPDATE public.user_gamification
     SET current_level = v_level
   WHERE user_id = v_user;

  RETURN json_build_object(
    'success', true,
    'joy_coins_awarded', v_reward,
    'xp_awarded', v_xp,
    'total_joy_coins', v_coins,
    'total_xp', v_total_xp,
    'level', v_level);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_challenge_reward(uuid) TO authenticated;

-- ── 2. Sincronização servidor dos pontos Pulse (quizzes F35) ───────────────
-- Melhor score por utilizador/quiz — dedup: repetir o mesmo quiz NÃO dá
-- pontos extra (só a melhoria sobre o recorde é creditada).
CREATE TABLE IF NOT EXISTS public.edu_quiz_results (
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id     text        NOT NULL,
  best_correct   integer     NOT NULL DEFAULT 0,
  points_awarded integer     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, article_id)
);
ALTER TABLE public.edu_quiz_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own quiz results" ON public.edu_quiz_results;
CREATE POLICY "Users read own quiz results"
  ON public.edu_quiz_results FOR SELECT
  USING (auth.uid() = user_id);
-- Sem políticas INSERT/UPDATE/DELETE: escritas apenas via RPC (SECURITY DEFINER).

-- Livro diário de pontos concedidos — suporte ao tecto anti-abuso (120/dia).
CREATE TABLE IF NOT EXISTS public.edu_quiz_awards (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id text        NOT NULL,
  points     integer     NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS edu_quiz_awards_user_day_idx
  ON public.edu_quiz_awards (user_id, created_at);
ALTER TABLE public.edu_quiz_awards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own quiz awards" ON public.edu_quiz_awards;
CREATE POLICY "Users read own quiz awards"
  ON public.edu_quiz_awards FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.award_pulse_points(
  p_article_id          text,
  p_correct             integer,
  p_points_per_correct  integer DEFAULT 10
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user      uuid := auth.uid();
  v_per       integer := LEAST(GREATEST(COALESCE(p_points_per_correct, 10), 1), 10);
  v_correct   integer := LEAST(GREATEST(COALESCE(p_correct, 0), 0), 10);
  v_potential integer;
  v_prev_best integer;
  v_prev_pts  integer;
  v_delta     integer;
  v_today     integer;
  v_daily_cap constant integer := 120;
  v_total_xp  integer;
  v_level     integer;
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF p_article_id IS NULL OR length(trim(p_article_id)) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'invalid_article');
  END IF;

  v_potential := v_correct * v_per;
  IF v_potential <= 0 THEN
    RETURN json_build_object('success', true, 'points_awarded', 0, 'best_correct', 0);
  END IF;

  BEGIN
    -- Trava a linha (ou detecta 1.ª vez) para corridas simultâneas
    SELECT best_correct, points_awarded
      INTO v_prev_best, v_prev_pts
      FROM public.edu_quiz_results
     WHERE user_id = v_user AND article_id = p_article_id
       FOR UPDATE;

    IF FOUND THEN
      IF v_correct <= v_prev_best THEN
        RETURN json_build_object(
          'success', true,
          'points_awarded', 0,
          'best_correct', v_prev_best,
          'reason', 'not_better_than_best');
      END IF;
      v_delta := v_potential - COALESCE(v_prev_pts, 0);
      UPDATE public.edu_quiz_results
         SET best_correct   = v_correct,
             points_awarded = v_potential,
             updated_at     = now()
       WHERE user_id = v_user AND article_id = p_article_id;
    ELSE
      v_delta := v_potential;
      INSERT INTO public.edu_quiz_results
        (user_id, article_id, best_correct, points_awarded)
      VALUES
        (v_user, p_article_id, v_correct, v_potential);
    END IF;
  EXCEPTION WHEN unique_violation THEN
    -- Corrida dupla na 1.ª tentativa: ignora (pontos já creditados pela outra)
    RETURN json_build_object('success', true, 'points_awarded', 0, 'reason', 'concurrent');
  END;

  -- Tecto diário anti-abuso
  IF v_delta > 0 THEN
    SELECT COALESCE(SUM(points), 0)
      INTO v_today
      FROM public.edu_quiz_awards
     WHERE user_id = v_user
       AND created_at >= date_trunc('day', now());
    IF v_today + v_delta > v_daily_cap THEN
      v_delta := v_daily_cap - v_today;
    END IF;
  END IF;

  IF v_delta <= 0 THEN
    RETURN json_build_object(
      'success', true,
      'points_awarded', 0,
      'best_correct', v_correct,
      'reason', 'daily_cap_reached');
  END IF;

  INSERT INTO public.edu_quiz_awards (user_id, article_id, points)
  VALUES (v_user, p_article_id, v_delta);

  -- Pulse points entram como XP (moeda dura fica nos desafios/atividade)
  UPDATE public.user_gamification
     SET experience_points = experience_points + v_delta,
         updated_at        = now()
   WHERE user_id = v_user;
  IF NOT FOUND THEN
    INSERT INTO public.user_gamification (user_id, experience_points)
    VALUES (v_user, v_delta);
  END IF;

  SELECT experience_points
    INTO v_total_xp
    FROM public.user_gamification
   WHERE user_id = v_user;
  v_level := GREATEST(1, FLOOR(v_total_xp / 500.0)::int + 1);
  UPDATE public.user_gamification
     SET current_level = v_level
   WHERE user_id = v_user;

  RETURN json_build_object(
    'success', true,
    'points_awarded', v_delta,
    'best_correct', v_correct,
    'total_xp', v_total_xp,
    'level', v_level);
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_pulse_points(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_pulse_points(text, integer) TO authenticated;
GRANT SELECT ON public.edu_quiz_results TO authenticated;
GRANT SELECT ON public.edu_quiz_awards TO authenticated;
