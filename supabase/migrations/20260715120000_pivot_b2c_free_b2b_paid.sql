-- =====================================================================
-- MEDWALLET MZ — PIVOT MODELO DE NEGÓCIO (B2C FREE + B2B PAID)
-- Migration: 20260715120000_pivot_b2c_free_b2b_paid.sql
-- =====================================================================
-- PIVOT ESTRATÉGICO — modelo marketplace (tipo Uber/Bolt/LinkedIn):
--   - Pacientes (B2C) = 0 MZN para sempre, sem cartão, sem trial
--   - Profissionais (médico/vet/driver) = planos Pro pagos
--   - Instituições (clínica/farmácia/lab/hospital) = SaaS B2B pagos
--
-- Este migration alinha a BD com o commit b51c895 (pivot em código).
-- =====================================================================

BEGIN;

-- ---------- 1. CHECK CONSTRAINT expandido ----------
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

-- ---------- 2. Coluna period_months (já existe na maioria das BDs) ----------
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS period_months integer NOT NULL DEFAULT 1;

-- ---------- 3. PLANO PATIENT-FREE (slug estável) ----------
INSERT INTO public.subscription_plans
  (slug, name, description, price_mzn, billing_period, target_audience,
   features, badge, is_active, sort_order, period_months)
VALUES
  (
    'patient-free',
    'Paciente (Grátis para sempre)',
    'Triagem IA ilimitada, prontuário, lembretes, SOS, wallet — tudo grátis. Sem cartão, sem trial.',
    0, 'monthly', 'patient',
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
    'GRÁTIS', true, 0, 1
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

-- ---------- 4. DESACTIVAR PLANOS B2C PAGOS ANTIGOS ----------
UPDATE public.subscription_plans
  SET is_active = false,
      badge = 'Descontinuado',
      updated_at = now()
  WHERE slug IN (
    'plus-individual','plus-familia','plus-gravida','plus-cronico',
    'premium-individual','premium-familia',
    'health-pass-basic','health-pass-premium'
  );

-- ---------- 5. CONFIRMAR PLANOS B2B ACTIVOS ----------
UPDATE public.subscription_plans
  SET is_active = true, updated_at = now()
  WHERE slug IN (
    'doctor-pro','doctor-elite','clinica-basic','clinica-pro',
    'hospital-enterprise','pharmacy-pro','lab-pro','driver-plus'
  );

-- ---------- 6. CONCEDER SUBSCRIÇÃO FREE A PACIENTES EXISTENTES ----------
DO $$
DECLARE
  v_plan_id uuid;
  v_count_inserted integer := 0;
BEGIN
  SELECT id INTO v_plan_id FROM public.subscription_plans WHERE slug = 'patient-free' LIMIT 1;
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plano patient-free não foi criado';
  END IF;

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
  RAISE NOTICE 'Subscrições free criadas: %', v_count_inserted;
END $$;

-- ---------- 7. TRIGGER: auto-conceder FREE em novos signups ----------
CREATE OR REPLACE FUNCTION public.auto_grant_patient_free_sub()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id uuid;
  v_user_role text;
BEGIN
  SELECT role INTO v_user_role
    FROM public.user_roles
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC LIMIT 1;
  IF v_user_role IS NULL THEN v_user_role := 'customer'; END IF;
  IF v_user_role <> 'customer' THEN RETURN NEW; END IF;

  SELECT id INTO v_plan_id
    FROM public.subscription_plans
    WHERE slug = 'patient-free' AND is_active = true LIMIT 1;
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

-- ---------- 8. REEMBOLSO OPCIONAL DE PACIENTES QUE PAGARAM ----------
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
END $$;

-- ---------- 9. VIEW DE MONITORIZAÇÃO ----------
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
    AS planos_activos_total
;

COMMENT ON VIEW public.pivot_stats IS
  'KPIs do pivot B2C-free + B2B-paid. SELECT * FROM public.pivot_stats;';

-- ---------- 10. AUDITORIA ----------
CREATE TABLE IF NOT EXISTS public.pivot_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pivot_version text NOT NULL,
  executed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

INSERT INTO public.pivot_audit (pivot_version, notes)
VALUES ('v1.0-b2c-free', 'Pivot B2C free para sempre + B2B paid. Patient-free plan created, 6 B2C paid plans deactivated, 8 B2B plans confirmed active, auto-grant trigger created, optional refunds processed.');

COMMIT;

SELECT 'Pivot B2C free + B2B paid migration applied — ver SELECT * FROM public.pivot_stats;' AS result;
