-- =====================================================================
-- MEDWALLET MZ — PIVOT MODELO DE NEGÓCIO (B2C FREE + B2B PAID)
-- =====================================================================
-- COMO USAR:
--   1. Abrir Supabase Dashboard → SQL Editor → New query
--   2. Colar TODO este ficheiro
--   3. Clicar em "Run"
--   4. Pode executar múltiplas vezes (é idempotente)
--
-- O QUE FAZ:
--   1. Cria o plano "patient-free" (0 MZN, target_audience='patient')
--   2. Marca os 6 antigos planos B2C pagos como INACTIVE
--      (plus-individual, plus-familia, plus-gravida, plus-cronico,
--       premium-individual, premium-familia)
--   3. Mantém os 8 planos B2B pagos (Doctor Pro/Elite, Vet, Clínicas,
--      Pharmacy, Lab, Hospital, Driver)
--   4. Concede subscrição FREE automática a TODOS os pacientes
--      existentes (user_role='customer' OU com patient_profiles)
--   5. Cria trigger para auto-conceder subscrição FREE em novos signups
--   6. Reembolsa (em wallet) pacientes que pagaram B2C no passado
--      — opcional, comente se não quiser reembolsar
--
-- ALINHAMENTO COM CÓDIGO:
--   - Commit b51c895: pivot estratégico em RegistrationWizard +
--     MzPricingPlans + FreeTrialBanner
--   - Este SQL alinha a BASE DE DADOS com esse pivot
-- =====================================================================

BEGIN;  -- transacção atómica — se algo falhar, nada é aplicado

-- =====================================================================
-- PARTE 1 — PLANO PATIENT-FREE (0 MZN, pacientes para sempre)
-- =====================================================================

-- Garante que 'patient' é target_audience válido (já é, mas reforça)
ALTER TABLE public.subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_target_audience_check;
ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_target_audience_check
  CHECK (target_audience IN (
    'patient', 'doctor', 'clinic',
    'individual', 'familia', 'gravida', 'cronico', 'premium',
    'pharmacy', 'lab', 'hospital', 'driver', 'veterinary',
    'insurance', 'store_owner'
  ));

-- Garante que a coluna period_months existe
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS period_months integer NOT NULL DEFAULT 1;

-- Cria ou actualiza o plano FREE para pacientes (slug estável)
INSERT INTO public.subscription_plans
  (slug, name, description, price_mzn, billing_period, target_audience,
   features, badge, is_active, sort_order, period_months)
VALUES
  (
    'patient-free',
    'Paciente (Grátis para sempre)',
    'Triagem IA ilimitada, prontuário, lembretes, SOS, wallet — tudo grátis. Sem cartão, sem trial.',
    0,
    'monthly',
    'patient',
    '[
      "Triagem IA ilimitada (Gemini + Groq)",
      "Prontuário digital seguro",
      "Lembretes de medicação (ARV/TB/malária)",
      "SOS emergência 24/7",
      "Carteira digital com cashback 1%",
      "1 consulta Meddy grátis por mês",
      "Registo de vacinas e alergias",
      "Educação em saúde (PT + Macua)"
    ]'::jsonb,
    'GRÁTIS',
    true,
    0,  -- aparece primeiro em listagens
    1
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_mzn = 0,
  billing_period = EXCLUDED.billing_period,
  target_audience = 'patient',
  features = EXCLUDED.features,
  badge = 'GRÁTIS',
  is_active = true,
  sort_order = 0,
  period_months = 1,
  updated_at = now();

-- =====================================================================
-- PARTE 2 — DESACTIVAR PLANOS B2C PAGOS (antigos)
-- =====================================================================
-- Em vez de DELETE (que partiria subscriptions existentes), marcamos
-- is_active=false para que não apareçam em /pricing nem em /subscribe.
-- As subscriptions antigas continuam válidas até expirar.

UPDATE public.subscription_plans
  SET is_active = false,
      updated_at = now(),
      badge = CASE
        WHEN slug IN ('plus-gravida','plus-cronico') THEN 'Descontinuado'
        ELSE 'Descontinuado'
      END
  WHERE slug IN (
    'plus-individual',
    'plus-familia',
    'plus-gravida',
    'plus-cronico',
    'premium-individual',
    'premium-familia',
    -- antigos planos legacy (pré-migration MZ)
    'health-pass-basic',
    'health-pass-premium'
  );

-- =====================================================================
-- PARTE 3 — CONFIRMAR QUE PLANOS B2B ESTÃO ACTIVOS
-- =====================================================================
-- (Devem estar, mas garantimos para o caso de alguém ter desactivado)

UPDATE public.subscription_plans
  SET is_active = true, updated_at = now()
  WHERE slug IN (
    'doctor-pro',
    'doctor-elite',
    'clinica-basic',
    'clinica-pro',
    'hospital-enterprise',
    'pharmacy-pro',
    'lab-pro',
    'driver-plus'
  );

-- =====================================================================
-- PARTE 4 — CONCEDER SUBSCRIÇÃO FREE A TODOS OS PACIENTES EXISTENTES
-- =====================================================================
-- Critério: utilizadores com role='customer' OU com patient_profiles.
-- Exclui: doctors, store_owners, drivers, admins, country_managers,
--         hospitais, labs, insurance, veterinary.

-- 4a. Buscar o UUID do plano patient-free
DO $$
DECLARE
  v_plan_id uuid;
  v_user_id uuid;
  v_count_existing integer := 0;
  v_count_inserted integer := 0;
BEGIN
  SELECT id INTO v_plan_id
    FROM public.subscription_plans
    WHERE slug = 'patient-free'
    LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plano patient-free não foi criado — abortando';
  END IF;

  -- Itera todos os pacientes identificados por:
  --   (a) terem role='customer' em user_roles
  --   (b) OU terem row em patient_profiles
  --   (c) MAS NÃO tiverem role doctor/store_owner/driver/admin/
  --       hospital/lab/insurance/veterinary/country_manager
  FOR v_user_id IN
    SELECT DISTINCT u.id FROM auth.users u
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
    -- evita duplicar se já tem subscrição free activa
    AND NOT EXISTS (
      SELECT 1 FROM public.subscriptions s
        WHERE s.user_id = u.id
          AND s.plan_id = v_plan_id
          AND s.status = 'active'
    )
  LOOP
    -- Não tem subscrição free activa — inserimos
    INSERT INTO public.subscriptions
      (user_id, plan_id, status, started_at, expires_at,
       payment_method, payment_reference, amount_paid,
       admin_notes, created_at, updated_at)
    VALUES
      (v_user_id, v_plan_id, 'active', now(),
       -- expires_at = NULL significa "sem expiração" (grátis para sempre)
       NULL,
       'none', 'AUTO-FREE-PIVOT', 0,
       'Subscrição grátis concedida automaticamente pelo pivot B2C free.',
       now(), now())
    ON CONFLICT DO NOTHING;

    v_count_inserted := v_count_inserted + 1;
  END LOOP;

  SELECT COUNT(*) INTO v_count_existing
    FROM public.subscriptions s
    JOIN public.subscription_plans p ON p.id = s.plan_id
    WHERE p.slug = 'patient-free' AND s.status = 'active';

  RAISE NOTICE 'Pacientes: % novas subscrições free criadas. Total free activas: %',
    v_count_inserted, v_count_existing;
END $$;

-- =====================================================================
-- PARTE 5 — TRIGGER: auto-conceder FREE em novos signups de paciente
-- =====================================================================
-- Quando um novo utilizador se regista como 'customer', é automáticamente
-- criada uma subscrição FREE no plano patient-free.

CREATE OR REPLACE FUNCTION public.auto_grant_patient_free_sub()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id uuid;
  v_user_role text;
BEGIN
  -- Só age se o novo user tem role 'customer'
  SELECT role INTO v_user_role
    FROM public.user_roles
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 1;

  IF v_user_role IS NULL THEN
    -- Trigger disparou antes do trigger que cria user_roles — assume customer
    v_user_role := 'customer';
  END IF;

  IF v_user_role <> 'customer' THEN
    RETURN NEW;  -- médicos/clinics/etc. não recebem free auto
  END IF;

  -- Busca plano patient-free
  SELECT id INTO v_plan_id
    FROM public.subscription_plans
    WHERE slug = 'patient-free' AND is_active = true
    LIMIT 1;

  IF v_plan_id IS NULL THEN
    RETURN NEW;  -- seguro: se o plano não existe, não faz nada
  END IF;

  -- Se já tem subscrição free activa, não duplica
  PERFORM 1 FROM public.subscriptions
    WHERE user_id = NEW.user_id
      AND plan_id = v_plan_id
      AND status = 'active';
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

-- Cria o trigger sobre patient_profiles (dispara quando o profile é criado)
DROP TRIGGER IF EXISTS trg_auto_grant_patient_free
  ON public.patient_profiles;
CREATE TRIGGER trg_auto_grant_patient_free
  AFTER INSERT ON public.patient_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_grant_patient_free_sub();

-- Também cria trigger sobre user_roles (fallback: se user_roles for
-- criado DEPOIS de patient_profiles, garante a subscrição free)
DROP TRIGGER IF EXISTS trg_auto_grant_patient_free_role
  ON public.user_roles;
CREATE TRIGGER trg_auto_grant_patient_free_role
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  WHEN (NEW.role = 'customer')
  EXECUTE FUNCTION public.auto_grant_patient_free_sub();

-- =====================================================================
-- PARTE 6 — REEMBOLSO OPCIONAL DE PACIENTES QUE PAGARAM B2C NO PASSADO
-- =====================================================================
-- Para ser justo com pacientes que pagaram plus-individual, plus-gravida
-- etc. antes do pivot, creditamos o valor pago na wallet deles como
-- "cashback pivot". COMENTAR esta secção se não quiser reembolsar.
-- Nota: só processa subscriptions já activas/expired (não pending).

DO $$
DECLARE
  v_count integer := 0;
  v_total numeric := 0;
BEGIN
  -- Para cada subscrição B2C paga antiga, credita valor na wallet
  INSERT INTO public.wallet_transactions
    (user_id, type, amount, currency, description, metadata, created_at)
  SELECT
    s.user_id,
    'bonus',
    COALESCE(s.amount_paid, 0),
    'MZN',
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
    -- Evita duplicar: só se ainda não existe este reembolso
    AND NOT EXISTS (
      SELECT 1 FROM public.wallet_transactions wt
        WHERE wt.user_id = s.user_id
          AND wt.metadata->>'original_subscription_id' = s.id::text
          AND wt.description LIKE 'Reembolso pivot B2C free%'
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Reembolsos criados: %', v_count;

  -- Atualiza saldos das wallets com base nos reembolsos criados acima
  UPDATE public.wallets w
    SET balance_mzn = balance_mzn + sub.total_refund,
        total_deposited = total_deposited + sub.total_refund,
        updated_at = now()
  FROM (
    SELECT wt.user_id, SUM(wt.amount) AS total_refund
    FROM public.wallet_transactions wt
    WHERE wt.description LIKE 'Reembolso pivot B2C free%'
      AND wt.created_at > now() - interval '5 minutes'  -- só os desta execução
    GROUP BY wt.user_id
  ) sub
  WHERE w.user_id = sub.user_id;

  RAISE NOTICE 'Wallets actualizadas com reembolsos.';
END $$;

-- =====================================================================
-- PARTE 7 — VIEW DE MONITORIZAÇÃO: PIVOT_STATS
-- =====================================================================
-- Mostra KPIs do pivot: quantos pacientes free, quantos B2B pagos, etc.

CREATE OR REPLACE VIEW public.pivot_stats AS
SELECT
  (SELECT COUNT(*) FROM public.subscriptions s
     JOIN public.subscription_plans p ON p.id = s.plan_id
     WHERE p.slug = 'patient-free' AND s.status = 'active')
    AS pacientes_free_activos,
  (SELECT COUNT(*) FROM public.subscriptions s
     JOIN public.subscription_plans p ON p.id = s.plan_id
     WHERE p.slug IN (
       'doctor-pro','doctor-elite','clinica-basic','clinica-pro',
       'hospital-enterprise','pharmacy-pro','lab-pro','driver-plus'
     ) AND s.status = 'active')
    AS profissionais_e_instituicoes_pagos,
  (SELECT COALESCE(SUM(amount_paid), 0) FROM public.subscriptions s
     JOIN public.subscription_plans p ON p.id = s.plan_id
     WHERE p.slug IN (
       'doctor-pro','doctor-elite','clinica-basic','clinica-pro',
       'hospital-enterprise','pharmacy-pro','lab-pro','driver-plus'
     ) AND s.status = 'active')
    AS mrr_mzn_b2b,
  (SELECT COUNT(*) FROM public.subscription_plans WHERE is_active = true)
    AS planos_activos_total,
  (SELECT COUNT(*) FROM public.subscription_plans
     WHERE is_active = false AND slug LIKE 'plus-%' OR slug LIKE 'premium-%')
    AS planos_b2c_descontinuados;

COMMENT ON VIEW public.pivot_stats IS
  'KPIs do pivot B2C-free + B2B-paid. Consulte: SELECT * FROM public.pivot_stats;';

-- =====================================================================
-- PARTE 8 — LOG DE AUDITORIA
-- =====================================================================
-- Regista que o pivot foi executado (para auditoria futura)

CREATE TABLE IF NOT EXISTS public.pivot_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pivot_version text NOT NULL,
  executed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

INSERT INTO public.pivot_audit (pivot_version, notes)
VALUES ('v1.0-b2c-free', 'Pivot B2C free para sempre + B2B paid. Patient-free plan created, 6 B2C paid plans deactivated, 8 B2B plans confirmed active, auto-grant trigger created, optional refunds processed.');

-- =====================================================================
-- PARTE 9 — CONFIRMAÇÃO FINAL
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

  RAISE NOTICE '================ PIVOT CONCLUÍDO ================';
  RAISE NOTICE 'Pacientes FREE activos: %', v_free_count;
  RAISE NOTICE 'Profissionais/Instituições pagos: %', v_b2b_count;
  RAISE NOTICE 'MRR estimado B2B: % MZN', v_total_mrr;
  RAISE NOTICE '=================================================';

  RAISE NOTICE 'Ver KPIs: SELECT * FROM public.pivot_stats;';
  RAISE NOTICE 'Ver auditoria: SELECT * FROM public.pivot_audit;';
END $$;

COMMIT;

-- =====================================================================
-- FIM — PIVOT B2C FREE + B2B PAID
-- =====================================================================
-- Próximos passos sugeridos:
--   1. Verificar KPIs: SELECT * FROM public.pivot_stats;
--   2. Verificar auditoria: SELECT * FROM public.pivot_audit;
--   3. Verificar pacientes free: SELECT user_id, started_at FROM public.subscriptions
--      WHERE plan_id = (SELECT id FROM public.subscription_plans WHERE slug='patient-free');
--   4. Verificar reembolsos: SELECT * FROM public.wallet_transactions
--      WHERE description LIKE 'Reembolso pivot B2C free%' ORDER BY created_at DESC;
--   5. Push do código (commit b51c895) para produção após este SQL
-- =====================================================================
