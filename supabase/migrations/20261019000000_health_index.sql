-- ═══════════════════════════════════════════════════════════════════════════
-- F44 — Índice de Saúde (Health Score) — padrão Vitality dos melhores do nicho
-- ═══════════════════════════════════════════════════════════════════════════
-- Um índice 0–100 que resume a saúde digital do utilizador em 4 pilares,
-- calculado 100% NO SERVIDOR a partir de dados reais da plataforma:
--   1. Perfil de Emergência (25) — sangue, alergias, condições, contacto ICE
--      (tabela patient_profiles)
--   2. Adesão à Medicação (30) — razão toma/pulou nos últimos 7 dias
--      (tabela medication_logs; 15 pts neutros se ainda sem registos)
--   3. Hábitos (25) — streak de check-in (máx 7 dias) + quizzes de educação
--      (tabelas user_gamification + edu_quiz_results; guarda se a tabela
--      ainda não existir)
--   4. Cuidado Contínuo (20) — registos médicos, consultas (90 dias) e
--      diário de saúde (30 dias) (medical_records, consultations,
--      health_journal)
--
-- Segurança: SECURITY DEFINER com auth.uid(); o cliente não envia nada.
-- Idempotente: CREATE OR REPLACE — seguro para re-executar.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.health_index()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user      uuid := auth.uid();
  v_pp        patient_profiles%ROWTYPE;
  v_has_pp    boolean := false;
  v_streak    integer := 0;
  v_taken     integer := 0;
  v_skipped   integer := 0;
  v_quizzes   integer := 0;
  v_cons      integer := 0;
  v_recs      integer := 0;
  v_journal   integer := 0;
  v_perfil    integer := 0;
  v_adesao    integer := 0;
  v_habitos   integer := 0;
  v_cuidado   integer := 0;
  v_score     integer;
  v_grade     text;
  v_tips_perfil   text[] := ARRAY[]::text[];
  v_tips_adesao   text[] := ARRAY[]::text[];
  v_tips_habitos  text[] := ARRAY[]::text[];
  v_tips_cuidado  text[] := ARRAY[]::text[];
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- ── Pilar 1: Perfil de Emergência (25) ────────────────────────────────────
  SELECT * INTO v_pp FROM patient_profiles WHERE user_id = v_user;
  v_has_pp := FOUND;
  IF v_has_pp THEN
    IF COALESCE(v_pp.blood_type, '') <> '' THEN
      v_perfil := v_perfil + 8;
    ELSE
      v_tips_perfil := v_tips_perfil || 'Adicione o seu tipo sanguíneo no Perfil de Saúde';
    END IF;
    IF COALESCE(array_length(v_pp.allergies, 1), 0) > 0 THEN
      v_perfil := v_perfil + 7;
    ELSE
      v_tips_perfil := v_tips_perfil || 'Declare as suas alergias (ou confirme que não tem)';
    END IF;
    IF COALESCE(array_length(v_pp.chronic_conditions, 1), 0) > 0 THEN
      v_perfil := v_perfil + 4;
    ELSE
      v_tips_perfil := v_tips_perfil || 'Registe condições crónicas (diabetes, tensão…) para cuidados melhores';
    END IF;
    IF COALESCE(v_pp.emergency_contact_name, '') <> ''
       AND COALESCE(v_pp.emergency_contact_phone, '') <> '' THEN
      v_perfil := v_perfil + 6;
    ELSE
      v_tips_perfil := v_tips_perfil || 'Defina um contacto de emergência (ICE)';
    END IF;
  ELSE
    v_tips_perfil := v_tips_perfil
      || 'Complete o seu Perfil de Saúde (tipo sanguíneo, alergias, ICE)';
  END IF;

  -- ── Pilar 2: Adesão à Medicação (30) — últimos 7 dias ────────────────────
  SELECT
    COUNT(*) FILTER (WHERE taken_at IS NOT NULL AND NOT COALESCE(skipped, false)),
    COUNT(*) FILTER (WHERE COALESCE(skipped, false))
    INTO v_taken, v_skipped
    FROM medication_logs
   WHERE user_id = v_user
     AND logged_date >= current_date - 6;
  IF v_taken + v_skipped = 0 THEN
    v_adesao := 15; -- neutro: ainda sem plano de medicação
    v_tips_adesao := v_tips_adesao
      || 'Adicione a sua medicação no Plano de Medicação para acompanhar a adesão';
  ELSE
    v_adesao := ROUND(30.0 * v_taken / (v_taken + v_skipped));
    IF v_adesao < 30 THEN
      v_tips_adesao := v_tips_adesao
        || 'Marque as tomas diárias — cada toma registada sobe o seu índice';
    END IF;
  END IF;

  -- ── Pilar 3: Hábitos (25) — check-in streak + literacia (quizzes) ────────
  SELECT COALESCE(streak_days, 0) INTO v_streak
    FROM user_gamification WHERE user_id = v_user;
  v_habitos := ROUND(15.0 * LEAST(COALESCE(v_streak, 0), 7) / 7.0);
  IF v_streak < 7 THEN
    v_tips_habitos := v_tips_habitos || 'Faça check-in diário — 7 dias seguidos dão o máximo deste pilar';
  END IF;

  BEGIN
    SELECT COUNT(DISTINCT article_id) INTO v_quizzes
      FROM edu_quiz_results WHERE user_id = v_user;
  EXCEPTION WHEN undefined_table THEN
    v_quizzes := 0;
  END;
  v_habitos := v_habitos + LEAST(v_quizzes, 5) * 2;
  IF v_quizzes < 5 THEN
    v_tips_habitos := v_tips_habitos || 'Complete quizzes na Educação em Saúde (+2 pts cada, até 5)';
  END IF;

  -- ── Pilar 4: Cuidado Contínuo (20) ────────────────────────────────────────
  SELECT COUNT(*) INTO v_recs FROM medical_records WHERE patient_id = v_user;
  v_cuidado := LEAST(v_recs, 3) * 3;
  IF v_recs < 3 THEN
    v_tips_cuidado := v_tips_cuidado || 'Guarde os seus documentos médicos na Carteira de Saúde (+3 pts cada, até 3)';
  END IF;

  SELECT COUNT(*) INTO v_cons
    FROM consultations
   WHERE patient_id = v_user
     AND created_at >= now() - interval '90 days';
  v_cuidado := v_cuidado + LEAST(v_cons, 2) * 4;
  IF v_cons = 0 THEN
    v_tips_cuidado := v_tips_cuidado || 'Faça uma consulta (presencial ou video) — 90 dias de cuidado valem +8';
  END IF;

  SELECT COUNT(*) INTO v_journal
    FROM health_journal
   WHERE user_id = v_user
     AND created_at >= now() - interval '30 days';
  v_cuidado := v_cuidado + LEAST(v_journal, 3);
  IF v_journal < 3 THEN
    v_tips_cuidado := v_tips_cuidado || 'Escreva no Diário de Saúde (+1 pt por registo, até 3 no mês)';
  END IF;

  -- ── Total + classe ────────────────────────────────────────────────────────
  v_score := LEAST(100, v_perfil + v_adesao + v_habitos + v_cuidado);
  v_grade := CASE
    WHEN v_score >= 85 THEN 'Excelente'
    WHEN v_score >= 70 THEN 'Bom'
    WHEN v_score >= 50 THEN 'Atenção'
    ELSE 'A melhorar'
  END;

  RETURN json_build_object(
    'success', true,
    'score', v_score,
    'grade', v_grade,
    'has_profile', v_has_pp,
    'components', json_build_array(
      json_build_object('key', 'perfil',  'label', 'Perfil de Emergência', 'score', v_perfil,  'max', 25, 'tips', to_json(v_tips_perfil)),
      json_build_object('key', 'adesao',  'label', 'Adesão à Medicação',   'score', v_adesao,  'max', 30, 'tips', to_json(v_tips_adesao)),
      json_build_object('key', 'habitos', 'label', 'Hábitos Saudáveis',    'score', v_habitos, 'max', 25, 'tips', to_json(v_tips_habitos)),
      json_build_object('key', 'cuidado', 'label', 'Cuidado Contínuo',     'score', v_cuidado, 'max', 20, 'tips', to_json(v_tips_cuidado))
    ),
    'computed_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSZ')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.health_index() TO authenticated;
