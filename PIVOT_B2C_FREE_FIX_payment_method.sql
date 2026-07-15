-- =====================================================================
-- FIX: PIVOT B2C FREE — Corrigir CHECK constraint de payment_method
-- =====================================================================
-- ERRO ORIGINAL:
--   ERROR: 23514: new row for relation "subscriptions" violates
--   check constraint "subscriptions_payment_method_check"
--   Failing row contains (..., none, AUTO-FREE-PIVOT, ...)
--
-- CAUSA:
--   A coluna subscriptions.payment_method tem CHECK que só permite
--   ('mpesa','emola','mkesh','manual'). O valor 'none' usado pelo
--   PIVOT_B2C_FREE_SQL_EDITOR.sql para subscrições grátis não é aceito.
--
-- O QUE ESTE FIX FAZ:
--   1. DROP + ADD CHECK constraint para incluir 'none' e 'free'
--   2. Re-executa a concessão de subscrição FREE a pacientes existentes
--      (idempotente — não duplica os que já foram criados)
--   3. Re-executa a função do trigger auto-grant (usa 'none' agora válido)
--
-- COMO USAR:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Colar TODO este ficheiro
--   3. Run (pode executar múltiplas vezes — é idempotente)
-- =====================================================================

BEGIN;

-- =====================================================================
-- PARTE 1 — CORRIGIR CHECK CONSTRAINT DE payment_method
-- =====================================================================

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_payment_method_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_payment_method_check
  CHECK (payment_method IN (
    'mpesa', 'emola', 'mkesh', 'manual',
    'none',    -- subscrição grátis (pivot B2C free)
    'free',    -- alias alternativo para grátis
    'voucher', -- pago via voucher/rede de créditos
    'admin'    -- concedido manualmente por admin
  ));

-- =====================================================================
-- PARTE 2 — CONCEDER SUBSCRIÇÃO FREE AOS PACIENTES (re-execução)
-- =====================================================================
-- Isto executa a parte que falhou no PIVOT_B2C_FREE_SQL_EDITOR.sql.
-- É idempotente: só cria subscrições para quem ainda não tem.

DO $$
DECLARE
  v_plan_id uuid;
  v_count_inserted integer := 0;
  v_count_existing integer := 0;
BEGIN
  -- Busca o UUID do plano patient-free
  SELECT id INTO v_plan_id
    FROM public.subscription_plans
    WHERE slug = 'patient-free'
    LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plano patient-free não existe. Corre primeiro a Parte 1 e 3 do PIVOT_B2C_FREE_SQL_EDITOR.sql (criação do plano).';
  END IF;

  -- Quantos já têm (para confirmação)
  SELECT COUNT(*) INTO v_count_existing
    FROM public.subscriptions
    WHERE plan_id = v_plan_id AND status = 'active';

  -- Insere subscrições FREE para todos os pacientes que ainda não têm
  INSERT INTO public.subscriptions
    (user_id, plan_id, status, started_at, expires_at,
     payment_method, payment_reference, amount_paid,
     admin_notes, created_at, updated_at)
  SELECT DISTINCT u.id, v_plan_id, 'active', now(), NULL,
     'none', 'AUTO-FREE-PIVOT', 0,
     'Subscrição grátis concedida automaticamente pelo pivot B2C free.',
     now(), now()
  FROM auth.users u
  WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = u.id AND ur.role = 'customer'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = u.id
          AND ur.role IN ('doctor','store_owner','driver','admin',
                          'hospital','lab','insurance','veterinary',
                          'country_manager','clinic')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.subscriptions s
        WHERE s.user_id = u.id AND s.plan_id = v_plan_id AND s.status = 'active'
    )
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_count_inserted = ROW_COUNT;

  RAISE NOTICE '================ FIX CONCLUÍDO ================';
  RAISE NOTICE 'Subscrições free já existentes (antes): %', v_count_existing;
  RAISE NOTICE 'Novas subscrições free criadas agora: %', v_count_inserted;
  RAISE NOTICE 'Total esperado após: %', v_count_existing + v_count_inserted;
  RAISE NOTICE '===============================================';
END $$;

-- =====================================================================
-- PARTE 3 — ACTUALIZAR A FUNÇÃO DO TRIGGER (para usar 'none')
-- =====================================================================
-- O trigger que cria FREE em novos signups também usava 'none'.
-- Re-cria a função para garantir que está consistente.

CREATE OR REPLACE FUNCTION public.auto_grant_patient_free_sub()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id uuid;
  v_user_role text;
BEGIN
  SELECT role INTO v_user_role
    FROM public.user_roles
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 1;
  IF v_user_role IS NULL THEN v_user_role := 'customer'; END IF;
  IF v_user_role <> 'customer' THEN RETURN NEW; END IF;

  SELECT id INTO v_plan_id
    FROM public.subscription_plans
    WHERE slug = 'patient-free' AND is_active = true
    LIMIT 1;
  IF v_plan_id IS NULL THEN RETURN NEW; END IF;

  PERFORM 1 FROM public.subscriptions
    WHERE user_id = NEW.user_id AND plan_id = v_plan_id AND status = 'active';
  IF FOUND THEN RETURN NEW; END IF;

  INSERT INTO public.subscriptions
    (user_id, plan_id, status, started_at, expires_at,
     payment_method, payment_reference, amount_paid,
     admin_notes, created_at, updated_at)
  VALUES
    (NEW.user_id, v_plan_id, 'active', now(), NULL,
     'none', 'AUTO-FREE-SIGNUP', 0,
     'Subscrição grátis automática no signup (pivot B2C free).',
     now(), now())
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que os triggers estão criados (idempotente)
DROP TRIGGER IF EXISTS trg_auto_grant_patient_free ON public.patient_profiles;
CREATE TRIGGER trg_auto_grant_patient_free
  AFTER INSERT ON public.patient_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_grant_patient_free_sub();

DROP TRIGGER IF EXISTS trg_auto_grant_patient_free_role ON public.user_roles;
CREATE TRIGGER trg_auto_grant_patient_free_role
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  WHEN (NEW.role = 'customer')
  EXECUTE FUNCTION public.auto_grant_patient_free_sub();

-- =====================================================================
-- PARTE 4 — REEMBOLSAR PACIENTES QUE PAGARAM B2C ANTES DO PIVOT
-- =====================================================================
-- Se a Parte 6 do SQL original também falhou, isto re-executa os
-- reembolsos (idempotente — não duplica).

DO $$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO public.wallet_transactions
    (user_id, type, amount, currency, description, metadata, created_at)
  SELECT
    s.user_id, 'bonus', COALESCE(s.amount_paid, 0), 'MZN',
    'Reembolso pivot B2C free — Plano: ' || p.slug,
    jsonb_build_object(
      'source', 'pivot_b2c_free',
      'original_subscription_id', s.id,
      'original_plan_slug', p.slug,
      'original_amount', s.amount_paid,
      'reason', 'Paciente pagou antes do pivot; agora é grátis para sempre.'
    ),
    now()
  FROM public.subscriptions s
  JOIN public.subscription_plans p ON p.id = s.plan_id
  WHERE p.slug IN (
      'plus-individual','plus-familia','plus-gravida','plus-cronico',
      'premium-individual','premium-familia',
      'health-pass-basic','health-pass-premium'
    )
    AND s.status IN ('active','expired')
    AND COALESCE(s.amount_paid, 0) > 0
    AND NOT EXISTS (
      SELECT 1 FROM public.wallet_transactions wt
        WHERE wt.user_id = s.user_id
          AND wt.metadata->>'original_subscription_id' = s.id::text
          AND wt.description LIKE 'Reembolso pivot B2C free%'
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Reembolsos criados: %', v_count;

  -- Atualiza saldos das wallets
  UPDATE public.wallets w
    SET balance_mzn = balance_mzn + sub.total_refund,
        total_deposited = total_deposited + sub.total_refund,
        updated_at = now()
  FROM (
    SELECT wt.user_id, SUM(wt.amount) AS total_refund
    FROM public.wallet_transactions wt
    WHERE wt.description LIKE 'Reembolso pivot B2C free%'
      AND wt.created_at > now() - interval '5 minutes'
    GROUP BY wt.user_id
  ) sub
  WHERE w.user_id = sub.user_id;

  RAISE NOTICE 'Wallets actualizadas com reembolsos.';
END $$;

-- =====================================================================
-- PARTE 5 — VERIFICAÇÃO FINAL
-- =====================================================================

DO $$
DECLARE
  v_free_count integer;
  v_b2b_count integer;
  v_total_mrr numeric;
BEGIN
  SELECT COUNT(*) INTO v_free_count
    FROM public.subscriptions s
    JOIN public.subscription_plans p ON p.id = s.plan_id
    WHERE p.slug = 'patient-free' AND s.status = 'active';

  SELECT COUNT(*) INTO v_b2b_count
    FROM public.subscriptions s
    JOIN public.subscription_plans p ON p.id = s.plan_id
    WHERE p.slug IN (
      'doctor-pro','doctor-elite','clinica-basic','clinica-pro',
      'hospital-enterprise','pharmacy-pro','lab-pro','driver-plus'
    ) AND s.status = 'active';

  SELECT COALESCE(SUM(s.amount_paid), 0) INTO v_total_mrr
    FROM public.subscriptions s
    JOIN public.subscription_plans p ON p.id = s.plan_id
    WHERE p.slug IN (
      'doctor-pro','doctor-elite','clinica-basic','clinica-pro',
      'hospital-enterprise','pharmacy-pro','lab-pro','driver-plus'
    ) AND s.status = 'active';

  RAISE NOTICE '================ KPIs PÓS-FIX ================';
  RAISE NOTICE 'Pacientes FREE activos: %', v_free_count;
  RAISE NOTICE 'Profissionais/Instituições pagos: %', v_b2b_count;
  RAISE NOTICE 'MRR estimado B2B: % MZN', v_total_mrr;
  RAISE NOTICE '================================================';
END $$;

COMMIT;

-- =====================================================================
-- FIM DO FIX
-- =====================================================================
-- Ver KPIs:
--   SELECT * FROM public.pivot_stats;
--
-- Ver subscrições free:
--   SELECT u.email, s.started_at, s.payment_method
--   FROM public.subscriptions s
--   JOIN public.subscription_plans p ON p.id = s.plan_id
--   JOIN auth.users u ON u.id = s.user_id
--   WHERE p.slug = 'patient-free' AND s.status = 'active'
--   ORDER BY s.started_at DESC LIMIT 20;
-- =====================================================================
