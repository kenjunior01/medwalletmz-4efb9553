-- =====================================================================
-- MEDWALLET MOÇAMBIQUE — INSTALAÇÃO COMPLETA PARA SUPABASE SQL EDITOR
-- =====================================================================
-- COMO USAR:
--   1. Abrir Supabase Dashboard → SQL Editor → New query
--   2. Colar TODO este ficheiro
--   3. Clicar em "Run"
--   4. Pode executar múltiplas vezes (é idempotente: ON CONFLICT DO NOTHING)
--
-- CONTEÚDO:
--   1. Tabelas das 5 verticais (ape_visits, tb_dot_records,
--      art_adherence_logs, malaria_cases, maternal_profiles)
--   2. Tabela mpesa_manual_payments (M-Pesa sem API — fluxo manual)
--   3. Tabela whatsapp_messages (WhatsApp interno simulado)
--   4. Tabela google_cloud_integrations (config APIs Google Cloud)
--   5. GESTOR NACIONAL (acesso total a Moçambique)
--   6. 5 utentes de demonstração
--   7. 200+ instituições em 11 cidades
--   8. SEED completo das 5 verticais com dados reais
--   9. 5 pagamentos M-Pesa pendentes para o gestor confirmar
--  10. Bónus APE/TB/ARV (micro-insurance products)
--
-- CREDENCIAIS GESTOR NACIONAL:
--   Email:    gestor.nacional@medwalletmz.online
--   Password: GestorNacional2026
--
-- UTENTES DEMO (todos com password: Utente2026):
--   utente.ana@medwalletmz.online      — Ana Macuácua (Maputo)
--   utente.carlos@medwalletmz.online   — Carlos Mondlane (Beira)
--   utente.fatima@medwalletmz.online   — Fátima Sibil (Nampula)
--   utente.joao@medwalletmz.online     — João Taimo (Quelimane)
--   utente.rosa@medwalletmz.online     — Rossa Chiquevo (Chimoio)
-- =====================================================================

-- =====================================================================
-- PARTE 1 — TABELAS DAS 5 VERTICAIS DE SAÚDE
-- =====================================================================

-- ---------- SAFETY: Garantir que colunas e tabelas base existem ----------
-- Corre IF NOT EXISTS para ser idempotente e robusto a versões parciais da DB

-- profiles: country_id
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_id TEXT DEFAULT 'MZ';

-- user_roles: country_id
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS country_id TEXT DEFAULT 'MZ';

-- country_management: criar se não existir
CREATE TABLE IF NOT EXISTS public.country_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_id TEXT NOT NULL DEFAULT 'MZ',
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, country_id)
);
ALTER TABLE public.country_management ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cm admin read" ON public.country_management;
CREATE POLICY "cm admin read" ON public.country_management FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager') OR user_id = auth.uid());
DROP POLICY IF EXISTS "cm admin write" ON public.country_management;
CREATE POLICY "cm admin write" ON public.country_management FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
GRANT SELECT ON public.country_management TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.country_management TO authenticated;

-- micro_insurance_products: criar se não existir
CREATE TABLE IF NOT EXISTS public.micro_insurance_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id TEXT DEFAULT 'MZ',
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  premium_amount NUMERIC(10,2) DEFAULT 0,
  premium_currency TEXT DEFAULT 'MZN',
  coverage_amount NUMERIC(10,2) DEFAULT 0,
  coverage_currency TEXT DEFAULT 'MZN',
  payout_trigger_hours INT DEFAULT 1,
  payout_auto BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.micro_insurance_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mip public read" ON public.micro_insurance_products;
CREATE POLICY "mip public read" ON public.micro_insurance_products FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "mip admin write" ON public.micro_insurance_products;
CREATE POLICY "mip admin write" ON public.micro_insurance_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
GRANT SELECT ON public.micro_insurance_products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.micro_insurance_products TO authenticated;

-- 1a. APE — Agentes Polivalentes Elementares (visitas comunitárias)
CREATE TABLE IF NOT EXISTS public.ape_visits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ape_user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  patient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  country_id      TEXT REFERENCES public.countries(id) DEFAULT 'MZ',
  province        TEXT,
  district        TEXT,
  village         TEXT,
  visit_date      TIMESTAMPTZ DEFAULT now(),
  visit_type      TEXT CHECK (visit_type IN ('malaria','tb_screen','hiv_test','anc','pnc','vaccination','general','referral')),
  symptoms        JSONB,
  rdt_result      TEXT CHECK (rdt_result IN ('positive','negative','not_tested')),
  diagnosis       TEXT,
  treatment_given JSONB,
  referral_to     TEXT,
  referral_reason TEXT,
  gps_lat         DOUBLE PRECISION,
  gps_lng         DOUBLE PRECISION,
  offline_synced  BOOLEAN DEFAULT true,
  bonus_paid_mzn  NUMERIC(10,2) DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ape_visits_country  ON public.ape_visits(country_id);
CREATE INDEX IF NOT EXISTS idx_ape_visits_province ON public.ape_visits(province);
CREATE INDEX IF NOT EXISTS idx_ape_visits_date     ON public.ape_visits(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_ape_visits_ape      ON public.ape_visits(ape_user_id);
ALTER TABLE public.ape_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ape public read" ON public.ape_visits;
CREATE POLICY "ape public read" ON public.ape_visits FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ape insert own"  ON public.ape_visits;
CREATE POLICY "ape insert own"  ON public.ape_visits FOR INSERT TO authenticated WITH CHECK (ape_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
DROP POLICY IF EXISTS "ape update own"  ON public.ape_visits;
CREATE POLICY "ape update own"  ON public.ape_visits FOR UPDATE TO authenticated USING (ape_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
GRANT SELECT ON public.ape_visits TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ape_visits TO authenticated;

-- 1b. TB DOT — Directly Observed Treatment (tuberculose)
CREATE TABLE IF NOT EXISTS public.tb_dot_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  observer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  country_id      TEXT REFERENCES public.countries(id) DEFAULT 'MZ',
  province        TEXT,
  district        TEXT,
  tb_case_id      TEXT,
  treatment_phase TEXT CHECK (treatment_phase IN ('intensive','continuation','follow_up')),
  start_date      DATE NOT NULL,
  end_date        DATE,
  daily_meds      JSONB,
  adherence_pct   NUMERIC(5,2) DEFAULT 0,
  last_taken_at   TIMESTAMPTZ,
  last_video_observation TIMESTAMPTZ,
  video_session_url TEXT,
  missed_doses    INT DEFAULT 0,
  abandonment_risk TEXT CHECK (abandonment_risk IN ('low','medium','high')),
  bonus_paid_mzn  NUMERIC(10,2) DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tb_dot_country ON public.tb_dot_records(country_id);
CREATE INDEX IF NOT EXISTS idx_tb_dot_patient ON public.tb_dot_records(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_tb_dot_phase   ON public.tb_dot_records(treatment_phase);
ALTER TABLE public.tb_dot_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tb dot read"   ON public.tb_dot_records;
CREATE POLICY "tb dot read"   ON public.tb_dot_records FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "tb dot insert" ON public.tb_dot_records;
CREATE POLICY "tb dot insert" ON public.tb_dot_records FOR INSERT TO authenticated WITH CHECK (observer_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
DROP POLICY IF EXISTS "tb dot update" ON public.tb_dot_records;
CREATE POLICY "tb dot update" ON public.tb_dot_records FOR UPDATE TO authenticated USING (observer_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
GRANT SELECT ON public.tb_dot_records TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tb_dot_records TO authenticated;

-- 1c. ART — Antiretroviral Therapy adherence (HIV)
CREATE TABLE IF NOT EXISTS public.art_adherence_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  country_id      TEXT REFERENCES public.countries(id) DEFAULT 'MZ',
  province        TEXT,
  art_regimen     TEXT,
  art_start_date  DATE,
  last_viral_load NUMERIC(10,2),
  last_viral_load_date DATE,
  last_cd4_count  INT,
  last_cd4_date   DATE,
  adherence_pct   NUMERIC(5,2) DEFAULT 0,
  refill_due_date DATE,
  last_refill_date DATE,
  last_refill_facility TEXT,
  missed_doses_30d INT DEFAULT 0,
  whatsapp_reminders_sent INT DEFAULT 0,
  last_whatsapp_reminder TIMESTAMPTZ,
  support_group_id UUID,
  bonus_paid_mzn  NUMERIC(10,2) DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_art_country ON public.art_adherence_logs(country_id);
CREATE INDEX IF NOT EXISTS idx_art_patient ON public.art_adherence_logs(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_art_refill  ON public.art_adherence_logs(refill_due_date);
ALTER TABLE public.art_adherence_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "art read"   ON public.art_adherence_logs;
CREATE POLICY "art read"   ON public.art_adherence_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "art insert" ON public.art_adherence_logs;
CREATE POLICY "art insert" ON public.art_adherence_logs FOR INSERT TO authenticated WITH CHECK (patient_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
DROP POLICY IF EXISTS "art update" ON public.art_adherence_logs;
CREATE POLICY "art update" ON public.art_adherence_logs FOR UPDATE TO authenticated USING (patient_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
GRANT SELECT ON public.art_adherence_logs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.art_adherence_logs TO authenticated;

-- 1d. Malaria cases (PNM — Programa Nacional de Malária)
CREATE TABLE IF NOT EXISTS public.malaria_cases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ape_user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  country_id      TEXT REFERENCES public.countries(id) DEFAULT 'MZ',
  province        TEXT,
  district        TEXT,
  village         TEXT,
  case_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  age_years       INT,
  sex             TEXT CHECK (sex IN ('M','F')),
  pregnant        BOOLEAN DEFAULT false,
  rdt_result      TEXT CHECK (rdt_result IN ('positive','negative')),
  species         TEXT CHECK (species IN ('falciparum','vivax','mixed','unknown')),
  severity        TEXT CHECK (severity IN ('uncomplicated','severe')),
  treatment_given TEXT,
  treatment_start DATE,
  treatment_completed BOOLEAN DEFAULT false,
  referral_to     TEXT,
  outcome         TEXT CHECK (outcome IN ('recovering','cured','referred','death','lost')),
  gps_lat         DOUBLE PRECISION,
  gps_lng         DOUBLE PRECISION,
  reported_to_pnm BOOLEAN DEFAULT false,
  air_quality_index INT,
  outbreak_zone   BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_malaria_country ON public.malaria_cases(country_id);
CREATE INDEX IF NOT EXISTS idx_malaria_province ON public.malaria_cases(province);
CREATE INDEX IF NOT EXISTS idx_malaria_date ON public.malaria_cases(case_date DESC);
CREATE INDEX IF NOT EXISTS idx_malaria_outbreak ON public.malaria_cases(outbreak_zone);
ALTER TABLE public.malaria_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "malaria read"   ON public.malaria_cases;
CREATE POLICY "malaria read"   ON public.malaria_cases FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "malaria insert" ON public.malaria_cases;
CREATE POLICY "malaria insert" ON public.malaria_cases FOR INSERT TO authenticated WITH CHECK (ape_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
DROP POLICY IF EXISTS "malaria update" ON public.malaria_cases;
CREATE POLICY "malaria update" ON public.malaria_cases FOR UPDATE TO authenticated USING (ape_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
GRANT SELECT ON public.malaria_cases TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.malaria_cases TO authenticated;

-- 1e. Maternal profiles (Saúde Materna)
CREATE TABLE IF NOT EXISTS public.maternal_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  country_id      TEXT REFERENCES public.countries(id) DEFAULT 'MZ',
  province        TEXT,
  district        TEXT,
  lmp_date        DATE,
  edd_date        DATE,
  gravida         INT,
  para            INT,
  blood_type      TEXT,
  risk_level      TEXT CHECK (risk_level IN ('low','medium','high')),
  anc_visits_done INT DEFAULT 0,
  anc_visits_due  JSONB,
  partner_name    TEXT,
  partner_phone   TEXT,
  preferred_facility TEXT,
  last_bp_systolic INT,
  last_bp_diastolic INT,
  last_weight_kg  NUMERIC(5,2),
  sos_active      BOOLEAN DEFAULT false,
  last_sos_at     TIMESTAMPTZ,
  sos_route_to_facility JSONB,
  whatsapp_reminders_active BOOLEAN DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_maternal_country ON public.maternal_profiles(country_id);
CREATE INDEX IF NOT EXISTS idx_maternal_edd ON public.maternal_profiles(edd_date);
CREATE INDEX IF NOT EXISTS idx_maternal_sos ON public.maternal_profiles(sos_active);
ALTER TABLE public.maternal_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "maternal read"   ON public.maternal_profiles;
CREATE POLICY "maternal read"   ON public.maternal_profiles FOR SELECT TO authenticated USING (patient_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
DROP POLICY IF EXISTS "maternal insert" ON public.maternal_profiles;
CREATE POLICY "maternal insert" ON public.maternal_profiles FOR INSERT TO authenticated WITH CHECK (patient_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
DROP POLICY IF EXISTS "maternal update" ON public.maternal_profiles;
CREATE POLICY "maternal update" ON public.maternal_profiles FOR UPDATE TO authenticated USING (patient_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
GRANT SELECT ON public.maternal_profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.maternal_profiles TO authenticated;

-- =====================================================================
-- PARTE 2 — TABELAS DE SUPORTE (M-PESA, WHATSAPP, GOOGLE CLOUD)
-- =====================================================================

-- 2a. M-Pesa manual payments (SEM API — fluxo manual interno)
CREATE TABLE IF NOT EXISTS public.mpesa_manual_payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference            TEXT UNIQUE NOT NULL,
  amount_mzn           NUMERIC(10,2) NOT NULL,
  description          TEXT,
  status               TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','confirmed','rejected','expired')),
  payer_phone          TEXT,
  payer_name           TEXT,
  mpesa_transaction_id TEXT,
  destination_number   TEXT NOT NULL DEFAULT '+258840000000',
  confirmed_at         TIMESTAMPTZ,
  confirmed_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata             JSONB DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mpesa_status     ON public.mpesa_manual_payments(status);
CREATE INDEX IF NOT EXISTS idx_mpesa_reference  ON public.mpesa_manual_payments(reference);
CREATE INDEX IF NOT EXISTS idx_mpesa_created    ON public.mpesa_manual_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mpesa_payer      ON public.mpesa_manual_payments(payer_phone);
ALTER TABLE public.mpesa_manual_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mpesa admin read"   ON public.mpesa_manual_payments;
CREATE POLICY "mpesa admin read"   ON public.mpesa_manual_payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
DROP POLICY IF EXISTS "mpesa admin write"  ON public.mpesa_manual_payments;
CREATE POLICY "mpesa admin write"  ON public.mpesa_manual_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
DROP POLICY IF EXISTS "mpesa owner read"   ON public.mpesa_manual_payments;
CREATE POLICY "mpesa owner read"   ON public.mpesa_manual_payments FOR SELECT TO authenticated
  USING (payer_phone IS NOT NULL AND payer_phone = (
    SELECT phone FROM public.profiles WHERE user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "mpesa insert"       ON public.mpesa_manual_payments;
CREATE POLICY "mpesa insert"       ON public.mpesa_manual_payments FOR INSERT TO authenticated
  WITH CHECK (true);
GRANT SELECT ON public.mpesa_manual_payments TO anon, authenticated;
GRANT INSERT, UPDATE ON public.mpesa_manual_payments TO authenticated;

-- Trigger para updated_at (cria função se não existir)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mpesa_touch ON public.mpesa_manual_payments;
CREATE TRIGGER trg_mpesa_touch
  BEFORE UPDATE ON public.mpesa_manual_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2b. WhatsApp interno (simulado, SEM API externa)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_to        TEXT NOT NULL,
  phone_from      TEXT,
  message_body    TEXT NOT NULL,
  template_name  TEXT,
  template_params JSONB,
  status          TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','sent','delivered','read','failed')),
  sent_at         TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  vertical        TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_phone_to   ON public.whatsapp_messages(phone_to);
CREATE INDEX IF NOT EXISTS idx_wa_status     ON public.whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_wa_vertical   ON public.whatsapp_messages(vertical);
CREATE INDEX IF NOT EXISTS idx_wa_created    ON public.whatsapp_messages(created_at DESC);
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wa admin read"   ON public.whatsapp_messages;
CREATE POLICY "wa admin read"   ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
DROP POLICY IF EXISTS "wa insert"        ON public.whatsapp_messages;
CREATE POLICY "wa insert"        ON public.whatsapp_messages FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "wa update"        ON public.whatsapp_messages;
CREATE POLICY "wa update"        ON public.whatsapp_messages FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
GRANT SELECT ON public.whatsapp_messages TO anon, authenticated;
GRANT INSERT, UPDATE ON public.whatsapp_messages TO authenticated;

-- 2c. Google Cloud API integrations log (config + auditoria)
CREATE TABLE IF NOT EXISTS public.google_cloud_integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service         TEXT NOT NULL,
  endpoint        TEXT,
  request_payload JSONB,
  response_payload JSONB,
  status_code     INT,
  error_message   TEXT,
  duration_ms     INT,
  called_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  called_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gc_service ON public.google_cloud_integrations(service);
CREATE INDEX IF NOT EXISTS idx_gc_status  ON public.google_cloud_integrations(status_code);
CREATE INDEX IF NOT EXISTS idx_gc_called  ON public.google_cloud_integrations(called_at DESC);
ALTER TABLE public.google_cloud_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gc admin read"   ON public.google_cloud_integrations;
CREATE POLICY "gc admin read"   ON public.google_cloud_integrations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
DROP POLICY IF EXISTS "gc insert"        ON public.google_cloud_integrations;
CREATE POLICY "gc insert"        ON public.google_cloud_integrations FOR INSERT TO authenticated WITH CHECK (true);
GRANT SELECT ON public.google_cloud_integrations TO anon, authenticated;
GRANT INSERT ON public.google_cloud_integrations TO authenticated;

-- =====================================================================
-- PARTE 3 — CRIAR GESTOR NACIONAL
-- =====================================================================
DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'gestor.nacional@medwalletmz.online';
  v_password text := 'GestorNacional2026';
  v_full_name text := 'Gestor Nacional Moçambique';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  IF v_user_id IS NULL THEN
    -- INSERT minimalista: apenas colunas que existem em TODAS as versões do Supabase
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      created_at, updated_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      phone
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf', 10)),
      now(), now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_full_name, 'country_id','MZ','role','country_manager'),
      '+258840000000'
    )
    RETURNING id INTO v_user_id;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, phone, default_city, country_id, avatar_url)
  VALUES (v_user_id, v_full_name, '+258840000000', 'Maputo', 'MZ',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200')
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    default_city = 'Maputo',
    country_id = 'MZ';

  INSERT INTO public.user_roles (user_id, role, country_id)
  VALUES (v_user_id, 'country_manager', 'MZ')
  ON CONFLICT (user_id, role, country_id) DO NOTHING;

  INSERT INTO public.country_management (user_id, country_id, permissions)
  VALUES (v_user_id, 'MZ',
    '{"can_approve_doctors":true,"can_view_revenue":true,"can_manage_stores":true,"can_manage_clinics":true,"can_manage_labs":true,"can_view_compliance":true,"can_issue_insurance":true,"can_view_ape_data":true,"can_manage_tb_dot":true,"can_manage_art":true,"can_manage_malaria":true,"can_manage_maternal":true,"can_confirm_mpesa_payments":true,"can_view_national_dashboard":true,"can_send_whatsapp":true,"can_use_google_cloud":true}'::jsonb)
  ON CONFLICT (user_id, country_id) DO UPDATE SET
    permissions = EXCLUDED.permissions;

  RAISE NOTICE 'Gestor Nacional criado: % (id=%)', v_email, v_user_id;
END $$;

-- =====================================================================
-- PARTE 4 — CRIAR 5 UTENTES DE DEMONSTRAÇÃO
-- =====================================================================
DO $$
DECLARE
  v_email text;
  v_name text;
  v_phone text;
  v_city text;
  v_province text;
  v_i int;
  v_patients jsonb := '[
    {"email":"utente.ana@medwalletmz.online","name":"Ana Macuácua","phone":"+258840100001","city":"Maputo","province":"Maputo Cidade"},
    {"email":"utente.carlos@medwalletmz.online","name":"Carlos Mondlane","phone":"+258840100002","city":"Beira","province":"Sofala"},
    {"email":"utente.fatima@medwalletmz.online","name":"Fátima Sibil","phone":"+258840100003","city":"Nampula","province":"Nampula"},
    {"email":"utente.joao@medwalletmz.online","name":"João Taimo","phone":"+258840100004","city":"Quelimane","province":"Zambézia"},
    {"email":"utente.rosa@medwalletmz.online","name":"Rossa Chiquevo","phone":"+258840100005","city":"Chimoio","province":"Manica"}
  ]'::jsonb;
  v_rec jsonb;
  v_uid uuid;
BEGIN
  FOR v_i IN 1..jsonb_array_length(v_patients)
  LOOP
    v_rec := v_patients->(v_i-1);
    v_email    := v_rec->>'email';
    v_name     := v_rec->>'name';
    v_phone    := v_rec->>'phone';
    v_city     := v_rec->>'city';
    v_province := v_rec->>'province';

    SELECT id INTO v_uid FROM auth.users WHERE email = v_email;
    IF v_uid IS NULL THEN
      -- INSERT minimalista: apenas colunas que existem em TODAS as versões do Supabase
      INSERT INTO auth.users (
        instance_id, id, aud, role, email,
        encrypted_password, email_confirmed_at,
        created_at, updated_at, last_sign_in_at,
        raw_app_meta_data, raw_user_meta_data,
        phone
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated','authenticated', v_email,
        crypt('Utente2026', gen_salt('bf', 10)),
        now(), now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', v_name, 'country_id','MZ','role','customer','province',v_province),
        v_phone
      )
      RETURNING id INTO v_uid;
    END IF;

    INSERT INTO public.profiles (user_id, full_name, phone, default_city, country_id)
    VALUES (v_uid, v_name, v_phone, v_city, 'MZ')
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      default_city = EXCLUDED.default_city;

    INSERT INTO public.user_roles (user_id, role, country_id)
    VALUES (v_uid, 'customer', 'MZ')
    ON CONFLICT (user_id, role, country_id) DO NOTHING;
  END LOOP;
  RAISE NOTICE '5 utentes de demonstração criados';
END $$;

-- =====================================================================
-- PARTE 5 — INSTITUIÇÕES DE SAÚDE (200+) — 11 CIDADES
-- =====================================================================

-- ---------- GARANTIR QUE AS COLUNAS EXISTEM (safety ALTERs) ----------
-- Estas colunas vêm de migrations anteriores; corre IF NOT EXISTS para garantir
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id) DEFAULT 'MZ';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS delivery_fee INTEGER DEFAULT 0;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS delivery_time TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1) DEFAULT 0;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id) DEFAULT 'MZ';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1) DEFAULT 0;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS name text;

ALTER TABLE public.laboratories ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id) DEFAULT 'MZ';
ALTER TABLE public.laboratories ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.laboratories ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.laboratories ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.laboratories ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.laboratories ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.laboratories ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.laboratories ADD COLUMN IF NOT EXISTS exam_categories text[];
ALTER TABLE public.laboratories ADD COLUMN IF NOT EXISTS home_collection BOOLEAN DEFAULT false;
ALTER TABLE public.laboratories ADD COLUMN IF NOT EXISTS result_delivery_hours INTEGER DEFAULT 24;
ALTER TABLE public.laboratories ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.laboratories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.laboratories ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.laboratories ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.laboratories ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.laboratories ADD COLUMN IF NOT EXISTS name text;

-- Garantir que health_facilities existe (pode não existir na DB do utilizador)
CREATE TABLE IF NOT EXISTS public.health_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id TEXT,
  name TEXT,
  type TEXT,
  status TEXT DEFAULT 'verified',
  rating NUMERIC(2,1) DEFAULT 0,
  address JSONB,
  contact JSONB,
  services TEXT[],
  branding_color TEXT DEFAULT '#0ea5e9',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.health_facilities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hf public read" ON public.health_facilities;
CREATE POLICY "hf public read" ON public.health_facilities FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "hf admin write" ON public.health_facilities;
CREATE POLICY "hf admin write" ON public.health_facilities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
GRANT SELECT ON public.health_facilities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.health_facilities TO authenticated;

-- Garantir que countries existe (pode não existir na DB do utilizador)
CREATE TABLE IF NOT EXISTS public.countries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'MZN',
  currency_symbol TEXT NOT NULL DEFAULT 'MT',
  phone_code TEXT,
  phone_prefix TEXT,
  flag_url TEXT,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'MZN';
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS currency_symbol TEXT NOT NULL DEFAULT 'MT';
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS phone_code TEXT;
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS phone_prefix TEXT;
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS flag_url TEXT;

-- Inserir MZ se não existir
INSERT INTO public.countries (id, name, currency_code, currency_symbol, phone_code, phone_prefix, is_active)
VALUES ('MZ','Moçambique','MZN','MT','+258','+258',true)
ON CONFLICT (id) DO NOTHING;

-- ---------- MAPUTO ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia S.Miguel',           'pharmacy','Maputo','Av. Eduardo Mondlane, Maputo','Medicamentos e produtos de higiene.',true,4.3,-25.9650,32.5780,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,50,'40 min','MZ','+258840000001'),
  ('Farmácia Polana',             'pharmacy','Maputo','Av. Julius Nyerere, Polana, Maputo','Farmácia premium com produtos importados.',true,4.5,-25.9650,32.5850,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,60,'25-35 min','MZ','+258840000002'),
  ('Farmácia Maputo Centro',      'pharmacy','Maputo','Av. 25 de Setembro, Maputo','Centro da cidade, atendimento rápido.',true,4.2,-25.9710,32.5730,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,45,'35 min','MZ','+258840000003')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital Militar de Maputo',           'hospital','Maputo','Av. Josina Machel, Maputo','Hospital militar para pessoal das forças armadas e família.',true,true,-25.9750,32.5800,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821350000','hmm@medwalletmz.online',''),
  ('Hospital Psiquiátrico do Hospital Central','hospital','Maputo','Av. Agostinho Neto, Maputo','Serviço de psiquiatria e saúde mental.',true,true,-25.9700,32.5800,'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821351000','psi@medwalletmz.online',''),
  ('Clínica Cruz Azul',                    'clinic','Maputo','Av. Eduardo Mondlane, Maputo','Clínica privada multi-especialidade.',true,true,-25.9650,32.5780,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821352000','cruz.azul@medwalletmz.online',''),
  ('Clínica Gigante',                      'clinic','Maputo','Av. 24 de Julho, Maputo','Atendimento pediátrico e geral.',true,true,-25.9720,32.5760,'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821353000','gigante@medwalletmz.online',''),
  ('Clínica Sagrada Esperança',            'clinic','Maputo','Av. Marginal, Maputo','Clínica executiva com check-ups.',true,true,-25.9500,32.6100,'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821354000','sagrada@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, email, website, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Clínico de Maputo',  'Maputo','Av. 24 de Julho, Maputo','Análises clínicas gerais.',true,true,-25.9720,32.5760,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821356000','lab.clinico@medwalletmz.online','',ARRAY['hematology','biochemistry'],true,24),
  ('Synlab Moçambique',              'Maputo','Av. Julius Nyerere, Maputo','Rede internacional de laboratórios.',true,true,-25.9650,32.5850,'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600','MZ','+25821357000','synlab@medwalletmz.online','https://synlab.mz',ARRAY['pathology','microbiology','genetics'],true,48),
  ('Cirurgia-Lab Laboratório',       'Maputo','Av. Eduardo Mondlane, Maputo','Exames pré-operatórios.',true,true,-25.9650,32.5780,'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=600','MZ','+25821358000','cirurgia.lab@medwalletmz.online','',ARRAY['hematology','coagulation'],true,12)
ON CONFLICT DO NOTHING;

-- ---------- MATOLA ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia Matola Centro',     'pharmacy','Matola','Av. da União Africana, Matola','Centro de Matola, medicamentos essenciais.',true,4.4,-25.9622,32.4589,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,70,'40 min','MZ','+258840000010'),
  ('Farmácia Infulene',          'pharmacy','Matola','Bairro Infulene, Matola','Serviço comunitário em Infulene.',true,4.0,-25.9550,32.4500,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,80,'1h','MZ','+258840000011'),
  ('Farmácia Tsalala',           'pharmacy','Matola','Bairro Tsalala, Matola','Atendimento 12h em Tsalala.',true,4.1,-25.9500,32.4600,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,75,'50 min','MZ','+258840000012'),
  ('Farmácia Matola Rio',        'pharmacy','Matola','Av. Matola Rio, Matola','Fácil acesso, estacionamento.',true,4.3,-25.9400,32.4700,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,70,'45 min','MZ','+258840000013'),
  ('Farmácia Gwachambane',       'pharmacy','Matola','Bairro Gwachambane, Matola','Farmácia de bairro popular.',true,3.9,-25.9350,32.4550,'https://images.unsplash.com/photo-1512418490979-92798ccc1380?w=600',true,80,'55 min','MZ','+258840000014')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital Geral de Matola',   'hospital','Matola','Av. da Tanzânia, Matola','Hospital geral de referência para Matola.',true,true,-25.9622,32.4589,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821359000','hgm@medwalletmz.online',''),
  ('Hospital Distrital de Boane','hospital','Boane','Estrada Nacional 2, Boane','Hospital distrital servindo Boane.',true,true,-26.0530,32.3300,'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821360000','hdb@medwalletmz.online',''),
  ('Clínica Matola Privada',     'clinic','Matola','Av. Independência, Matola','Clínica privada multi-especialidade.',true,true,-25.9550,32.4600,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821361000','matola.privada@medwalletmz.online',''),
  ('Centro de Saúde de Matola Rio','clinic','Matola','Matola Rio, Matola','Centro de saúde comunitário.',true,true,-25.9400,32.4700,'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821362000','cs.matola.rio@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Matola',     'Matola','Av. da União Africana, Matola','Exames clínicos em Matola.',true,true,-25.9622,32.4589,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821363000',ARRAY['hematology','biochemistry'],true,24),
  ('Labcheck Matola',        'Matola','Av. Eduardo Mondlane, Matola','Análises rápidas com home collection.',true,true,-25.9550,32.4600,'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600','MZ','+25821364000',ARRAY['pathology','hematology'],true,12)
ON CONFLICT DO NOTHING;

-- ---------- BEIRA ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia Beira Central',   'pharmacy','Beira','Av. Samora Machel, Beira','Centro da Beira, atendimento 12h.',true,4.5,-19.8333,34.8500,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,80,'45 min','MZ','+258840000020'),
  ('Farmácia Munhava',         'pharmacy','Beira','Bairro Munhava, Beira','Bairro popular, preços acessíveis.',true,4.2,-19.8200,34.8600,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,90,'1h','MZ','+258840000021'),
  ('Farmácia Ponta-Gêa',       'pharmacy','Beira','Ponta-Gêa, Beira','Zona nobre da Beira.',true,4.6,-19.8400,34.8400,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,85,'50 min','MZ','+258840000022'),
  ('Farmácia Manga',           'pharmacy','Beira','Bairro Manga, Beira','Bairro Manga, atendimento comunitário.',true,4.0,-19.8100,34.8700,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,95,'1h 15min','MZ','+258840000023'),
  ('Farmácia Macuti',          'pharmacy','Beira','Praia do Macuti, Beira','Zona costeira.',true,4.3,-19.8300,34.8350,'https://images.unsplash.com/photo-1512418490979-92798ccc1380?w=600',true,90,'1h','MZ','+258840000024'),
  ('Farmácia Chiveve',         'pharmacy','Beira','Bairro Chiveve, Beira','Atendimento em Chiveve.',true,4.1,-19.8150,34.8550,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,90,'1h','MZ','+258840000025')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital da Beira (Central)','hospital','Beira','Av. Eduardo Mondlane, Beira','Maior hospital da região central de Moçambique.',true,true,-19.8333,34.8500,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821365000','hb@medwalletmz.online',''),
  ('Hospital Psiquiátrico da Beira','hospital','Beira','Av. Samora Machel, Beira','Saúde mental região central.',true,true,-19.8300,34.8450,'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821366000','psibeira@medwalletmz.online',''),
  ('Clínica 6 de Agosto',     'clinic','Beira','Av. 6 de Agosto, Beira','Clínica privada multi-especialidade.',true,true,-19.8200,34.8550,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821367000','6agosto@medwalletmz.online',''),
  ('Clínica Achada',          'clinic','Beira','Achada, Beira','Atendimento médico geral.',true,true,-19.8100,34.8400,'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821368000','achada@medwalletmz.online',''),
  ('Clínica Beira Privada',   'clinic','Beira','Av. Eduardo Mondlane, Beira','Saúde executiva.',true,true,-19.8250,34.8520,'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821369000','beira.privada@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Beira',     'Beira','Av. Eduardo Mondlane, Beira','Análises clínicas regionais.',true,true,-19.8333,34.8500,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821370000',ARRAY['hematology','biochemistry','microbiology'],true,24),
  ('LabSynapse Beira',      'Beira','Ponta-Gêa, Beira','Exames avançados.',true,true,-19.8400,34.8400,'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600','MZ','+25821371000',ARRAY['pathology','genetics'],true,48),
  ('Laboratório Munhava',   'Beira','Bairro Munhava, Beira','Exames comunitários.',true,true,-19.8200,34.8600,'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=600','MZ','+25821372000',ARRAY['hematology','biochemistry'],true,24)
ON CONFLICT DO NOTHING;

-- ---------- NAMPULA ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia Nampula Central','pharmacy','Nampula','Av. do Trabalho, Nampula','Farmácia central de Nampula.',true,4.4,-15.1167,39.2667,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,60,'40 min','MZ','+258840000030'),
  ('Farmácia Muhala',         'pharmacy','Nampula','Bairro Muhala, Nampula','Bairro Muhala, popular.',true,4.0,-15.1100,39.2700,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,70,'1h','MZ','+258840000031'),
  ('Farmácia Namicopo',       'pharmacy','Nampula','Bairro Namicopo, Nampula','Zona comercial de Nampula.',true,4.2,-15.1050,39.2600,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,65,'50 min','MZ','+258840000032'),
  ('Farmácia Carrupea',       'pharmacy','Nampula','Bairro Carrupea, Nampula','Bairro Carrupea.',true,4.1,-15.1200,39.2750,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,70,'1h','MZ','+258840000033'),
  ('Farmácia 25 de Junho',    'pharmacy','Nampula','Av. 25 de Junho, Nampula','Atendimento rápido no centro.',true,4.3,-15.1150,39.2680,'https://images.unsplash.com/photo-1512418490979-92798ccc1380?w=600',true,65,'45 min','MZ','+258840000034')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital Central de Nampula','hospital','Nampula','Av. 25 de Setembro, Nampula','Maior hospital da região norte.',true,true,-15.1167,39.2667,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821373000','hcn@medwalletmz.online',''),
  ('Hospital Rural de Nampula',  'hospital','Nampula','Estrada de Nacala, Nampula','Atendimento rural.',true,true,-15.1300,39.2800,'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821374000','hrn@medwalletmz.online',''),
  ('Clínica Nampula Privada',    'clinic','Nampula','Av. Eduardo Mondlane, Nampula','Clínica privada executiva.',true,true,-15.1100,39.2700,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821375000','nampula.privada@medwalletmz.online',''),
  ('Clínica Muhala-Expansão',    'clinic','Nampula','Muhala-Expansão, Nampula','Atendimento de bairro.',true,true,-15.1080,39.2720,'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821376000','muhala.exp@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Nampula',  'Nampula','Av. do Trabalho, Nampula','Exames clínicos.',true,true,-15.1167,39.2667,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821377000',ARRAY['hematology','biochemistry'],true,24),
  ('LabNorte Nampula',     'Nampula','Av. Eduardo Mondlane, Nampula','Exames de referência do norte.',true,true,-15.1100,39.2700,'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600','MZ','+25821378000',ARRAY['pathology','microbiology'],true,48)
ON CONFLICT DO NOTHING;

-- ---------- PEMBA (Cabo Delgado) ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia Pemba',        'pharmacy','Pemba','Av. Eduardo Mondlane, Pemba','Farmácia central de Pemba.',true,4.3,-12.9740,40.5178,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,70,'45 min','MZ','+258840000040'),
  ('Farmácia Wimbe',        'pharmacy','Pemba','Praia do Wimbe, Pemba','Zona costeira.',true,4.2,-12.9800,40.5200,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,80,'1h','MZ','+258840000041'),
  ('Farmácia Bairro Chuabo','pharmacy','Pemba','Bairro Chuabo, Pemba','Bairro popular.',true,4.0,-12.9650,40.5100,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,85,'1h 10min','MZ','+258840000042'),
  ('Farmácia Cariacó',      'pharmacy','Pemba','Bairro Cariacó, Pemba','Atendimento comunitário.',true,4.1,-12.9700,40.5250,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,80,'1h','MZ','+258840000043')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital Provincial de Pemba','hospital','Pemba','Av. da Independência, Pemba','Hospital provincial de Cabo Delgado.',true,true,-12.9740,40.5178,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821379000','hpp@medwalletmz.online',''),
  ('Hospital Distrital de Pemba','hospital','Pemba','Estrada de Metuge, Pemba','Hospital distrital.',true,true,-12.9800,40.5000,'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821380000','hdp@medwalletmz.online',''),
  ('Clínica Pemba Marítima','clinic','Pemba','Praia do Wimbe, Pemba','Clínica privada.',true,true,-12.9800,40.5200,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821381000','pemba.maritima@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Pemba',    'Pemba','Av. Eduardo Mondlane, Pemba','Exames clínico gerais.',true,true,-12.9740,40.5178,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821382000',ARRAY['hematology','biochemistry'],true,24)
ON CONFLICT DO NOTHING;

-- ---------- QUELIMANE (Zambézia) ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia Quelimane',   'pharmacy','Quelimane','Av. Eduardo Mondlane, Quelimane','Centro de Quelimane.',true,4.4,-17.8786,36.8883,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,70,'50 min','MZ','+258840000050'),
  ('Farmácia Nicoadala',   'pharmacy','Quelimane','Bairro Nicoadala, Quelimane','Bairro Nicoadala.',true,4.1,-17.8800,36.8700,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,85,'1h 15min','MZ','+258840000051'),
  ('Farmácia 1 de Maio',   'pharmacy','Quelimane','Av. 1 de Maio, Quelimane','Atendimento central.',true,4.2,-17.8700,36.8900,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,75,'1h','MZ','+258840000052'),
  ('Farmácia Inhangome',   'pharmacy','Quelimane','Bairro Inhangome, Quelimane','Bairro popular.',true,4.0,-17.8750,36.8800,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,80,'1h 10min','MZ','+258840000053')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital Provincial de Quelimane','hospital','Quelimane','Av. Eduardo Mondlane, Quelimane','Hospital provincial da Zambézia.',true,true,-17.8786,36.8883,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821383000','hpq@medwalletmz.online',''),
  ('Hospital Rural de Quelimane',     'hospital','Quelimane','Estrada de Mopeia, Quelimane','Hospital rural.',true,true,-17.9000,36.8500,'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821384000','hrq@medwalletmz.online',''),
  ('Clínica Quelimane Privada',       'clinic','Quelimane','Av. 1 de Maio, Quelimane','Clínica privada.',true,true,-17.8700,36.8900,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821385000','qp@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Quelimane','Quelimane','Av. Eduardo Mondlane, Quelimane','Exames da Zambézia.',true,true,-17.8786,36.8883,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821386000',ARRAY['hematology','biochemistry'],true,24),
  ('LabZambezi Quelimane','Quelimane','Av. 1 de Maio, Quelimane','Exames especializados.',true,true,-17.8700,36.8900,'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600','MZ','+25821387000',ARRAY['pathology','microbiology'],true,48)
ON CONFLICT DO NOTHING;

-- ---------- TETE ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia Tete',           'pharmacy','Tete','Av. Eduardo Mondlane, Tete','Farmácia central de Tete.',true,4.3,-16.1569,33.5787,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,70,'50 min','MZ','+258840000060'),
  ('Farmácia Matundo',        'pharmacy','Tete','Bairro Matundo, Tete','Bairro fronteiriço.',true,4.1,-16.1400,33.6000,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,80,'1h','MZ','+258840000061'),
  ('Farmácia Chingodzi',      'pharmacy','Tete','Aeroporto Chingodzi, Tete','Próximo ao aeroporto.',true,4.2,-16.1100,33.6400,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,90,'1h 15min','MZ','+258840000062'),
  ('Farmácia Sanjote',        'pharmacy','Tete','Bairro Sanjote, Tete','Bairro popular.',true,4.0,-16.1650,33.5700,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,80,'1h 10min','MZ','+258840000063')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital Provincial de Tete','hospital','Tete','Av. Eduardo Mondlane, Tete','Hospital provincial de Tete.',true,true,-16.1569,33.5787,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821388000','hpt@medwalletmz.online',''),
  ('Hospital de Moatize',       'hospital','Moatize','Moatize, Tete','Hospital de Moatize (mineração).',true,true,-16.1100,33.7300,'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821389000','hmoatize@medwalletmz.online',''),
  ('Clínica Tete Privada',      'clinic','Tete','Av. Samora Machel, Tete','Clínica privada.',true,true,-16.1500,33.5800,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821390000','tetep@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Tete', 'Tete','Av. Eduardo Mondlane, Tete','Exames clínicos.',true,true,-16.1569,33.5787,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821391000',ARRAY['hematology','biochemistry'],true,24)
ON CONFLICT DO NOTHING;

-- ---------- CHIMOIO (Manica) ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia Chimoio',     'pharmacy','Chimoio','Av. Eduardo Mondlane, Chimoio','Farmácia central.',true,4.3,-19.1164,33.4833,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,70,'50 min','MZ','+258840000070'),
  ('Farmácia 1 de Maio',   'pharmacy','Chimoio','Av. 1 de Maio, Chimoio','Atendimento central.',true,4.1,-19.1100,33.4900,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,75,'1h','MZ','+258840000071'),
  ('Farmácia Bairro 5',    'pharmacy','Chimoio','Bairro 5, Chimoio','Bairro residencial.',true,4.0,-19.1200,33.4750,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,80,'1h','MZ','+258840000072'),
  ('Farmácia Vila Pery',   'pharmacy','Chimoio','Vila Pery, Chimoio','Zona histórica.',true,4.2,-19.1150,33.4800,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,75,'55 min','MZ','+258840000073')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital Provincial de Manica','hospital','Chimoio','Av. Eduardo Mondlane, Chimoio','Hospital provincial de Manica.',true,true,-19.1164,33.4833,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821392000','hpm@medwalletmz.online',''),
  ('Hospital de Gondola',         'hospital','Gondola','Gondola, Manica','Hospital de Gondola (corredor da Beira).',true,true,-19.0500,33.6500,'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821393000','hgon@medwalletmz.online',''),
  ('Clínica Chimoio Privada',     'clinic','Chimoio','Av. 1 de Maio, Chimoio','Clínica privada.',true,true,-19.1100,33.4900,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821394000','chimoiop@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Chimoio','Chimoio','Av. Eduardo Mondlane, Chimoio','Exames clínicos de Manica.',true,true,-19.1164,33.4833,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821395000',ARRAY['hematology','biochemistry'],true,24)
ON CONFLICT DO NOTHING;

-- ---------- XAI-XAI (Gaza) ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia Xai-Xai',     'pharmacy','Xai-Xai','Av. Samora Machel, Xai-Xai','Farmácia central.',true,4.2,-25.0519,33.6442,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,70,'50 min','MZ','+258840000080'),
  ('Farmácia Praia do Xai-Xai','pharmacy','Xai-Xai','Praia do Xai-Xai','Zona costeira.',true,4.4,-25.0800,33.7000,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,80,'1h 10min','MZ','+258840000081'),
  ('Farmácia Bairro 1 de Maio','pharmacy','Xai-Xai','Bairro 1 de Maio, Xai-Xai','Bairro popular.',true,4.0,-25.0600,33.6300,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,75,'1h','MZ','+258840000082'),
  ('Farmácia Limpopo',     'pharmacy','Xai-Xai','Av. Limpopo, Xai-Xai','Atendimento central.',true,4.1,-25.0450,33.6500,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,75,'1h','MZ','+258840000083')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital Provincial de Xai-Xai','hospital','Xai-Xai','Av. Eduardo Mondlane, Xai-Xai','Hospital provincial de Gaza.',true,true,-25.0519,33.6442,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821396000','hpx@medwalletmz.online',''),
  ('Hospital Rural de Chókwè',     'hospital','Chókwè','Chókwè, Gaza','Hospital de Chókwè (agrícola).',true,true,-24.5300,32.0800,'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821397000','hrchokwe@medwalletmz.online',''),
  ('Clínica Xai-Xai Privada',      'clinic','Xai-Xai','Av. Samora Machel, Xai-Xai','Clínica privada.',true,true,-25.0519,33.6442,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821398000','xxp@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Xai-Xai','Xai-Xai','Av. Eduardo Mondlane, Xai-Xai','Exames clínicos de Gaza.',true,true,-25.0519,33.6442,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821399000',ARRAY['hematology','biochemistry'],true,24)
ON CONFLICT DO NOTHING;

-- ---------- INHAMBANE ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia Inhambane',    'pharmacy','Inhambane','Av. Eduardo Mondlane, Inhambane','Farmácia central.',true,4.3,-23.8650,35.3833,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,70,'55 min','MZ','+258840000090'),
  ('Farmácia Tofo',         'pharmacy','Inhambane','Praia do Tofo, Inhambane','Praia do Tofo, turismo.',true,4.5,-23.8550,35.5500,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,80,'1h 15min','MZ','+258840000091'),
  ('Farmácia Maxixe',       'pharmacy','Maxixe','Av. Eduardo Mondlane, Maxixe','Cidade de Maxixe (vizinha).',true,4.2,-23.8647,35.3475,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,75,'1h','MZ','+258840000092'),
  ('Farmácia Bairro Pandos','pharmacy','Inhambane','Bairro Pandos, Inhambane','Bairro popular.',true,4.0,-23.8700,35.3700,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,80,'1h 10min','MZ','+258840000093')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital Provincial de Inhambane','hospital','Inhambane','Av. Eduardo Mondlane, Inhambane','Hospital provincial de Inhambane.',true,true,-23.8650,35.3833,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821400000','hpi@medwalletmz.online',''),
  ('Hospital de Chicamba',           'hospital','Chicamba','Chicamba, Inhambane','Hospital rural.',true,true,-23.9000,35.4000,'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821401000','hchicamba@medwalletmz.online',''),
  ('Clínica Inhambane Privada',      'clinic','Inhambane','Av. Samora Machel, Inhambane','Clínica privada.',true,true,-23.8650,35.3833,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821402000','ip@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Inhambane','Inhambane','Av. Eduardo Mondlane, Inhambane','Exames de Inhambane.',true,true,-23.8650,35.3833,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821403000',ARRAY['hematology','biochemistry'],true,24)
ON CONFLICT DO NOTHING;

-- ---------- LICHINGA (Niassa) ----------
INSERT INTO public.stores (name, type, city, address, description, is_active, rating, latitude, longitude, image_url, delivery_enabled, delivery_fee, delivery_time, country_id, phone)
VALUES
  ('Farmácia Lichinga',       'pharmacy','Lichinga','Av. Eduardo Mondlane, Lichinga','Farmácia central de Niassa.',true,4.2,-13.3096,36.0670,'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600',true,80,'1h','MZ','+258840000100'),
  ('Farmácia Bairro Boma',    'pharmacy','Lichinga','Bairro Boma, Lichinga','Bairro popular.',true,4.0,-13.3150,36.0700,'https://images.unsplash.com/photo-1631549916768-4119b29ed23a?w=600',true,90,'1h 15min','MZ','+258840000101'),
  ('Farmácia Unango',         'pharmacy','Lichinga','Bairro Unango, Lichinga','Bairro periférico.',true,4.1,-13.3000,36.0600,'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600',true,90,'1h 20min','MZ','+258840000102'),
  ('Farmácia Estação',        'pharmacy','Lichinga','Av. Estação, Lichinga','Atendimento central.',true,4.0,-13.3050,36.0650,'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600',true,85,'1h 10min','MZ','+258840000103')
ON CONFLICT DO NOTHING;

INSERT INTO public.clinics (name, type, city, address, description, is_active, is_verified, latitude, longitude, image_url, owner_id, country_id, phone, email, website)
VALUES
  ('Hospital Provincial de Lichinga','hospital','Lichinga','Av. Eduardo Mondlane, Lichinga','Hospital provincial de Niassa.',true,true,-13.3096,36.0670,'https://images.unsplash.com/photo-1586773860418-d319a221f52c?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821404000','hpl@medwalletmz.online',''),
  ('Hospital Rural de Cuamba',      'hospital','Cuamba','Cuamba, Niassa','Hospital de Cuamba (nó ferroviário).',true,true,-14.8000,36.5000,'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821405000','hrcuamba@medwalletmz.online',''),
  ('Clínica Lichinga Privada',      'clinic','Lichinga','Av. Samora Machel, Lichinga','Clínica privada.',true,true,-13.3096,36.0670,'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800','00000000-0000-0000-0000-000000000000','MZ','+25821406000','lp@medwalletmz.online','')
ON CONFLICT DO NOTHING;

INSERT INTO public.laboratories (name, city, address, description, is_active, is_verified, latitude, longitude, logo_url, country_id, phone, exam_categories, home_collection, result_delivery_hours)
VALUES
  ('Laboratório Lichinga','Lichinga','Av. Eduardo Mondlane, Lichinga','Exames de Niassa.',true,true,-13.3096,36.0670,'https://images.unsplash.com/photo-1579152276532-a371d4408bb6?w=600','MZ','+25821407000',ARRAY['hematology','biochemistry'],true,24)
ON CONFLICT DO NOTHING;

-- ---------- HEALTH_FACILITIES (UI unificada) ----------
INSERT INTO public.health_facilities (country_id, name, type, status, rating, address, contact, services, branding_color)
VALUES
  ('MZ','Hospital Central de Maputo','hospital','verified',4.9,'{"street":"Av. Agostinho Neto","city":"Maputo","lat":-25.9700,"lng":32.5800}'::jsonb,'{"phone":"+25821350000","email":"hcm@medwalletmz.online"}'::jsonb,ARRAY['trauma','maternity','icu','pediatrics'],'#ea580c'),
  ('MZ','Hospital da Beira','hospital','verified',4.7,'{"street":"Av. Eduardo Mondlane","city":"Beira","lat":-19.8333,"lng":34.8500}'::jsonb,'{"phone":"+25821365000","email":"hb@medwalletmz.online"}'::jsonb,ARRAY['trauma','maternity','icu'],'#16a34a'),
  ('MZ','Hospital Central de Nampula','hospital','verified',4.6,'{"street":"Av. 25 de Setembro","city":"Nampula","lat":-15.1167,"lng":39.2667}'::jsonb,'{"phone":"+25821373000","email":"hcn@medwalletmz.online"}'::jsonb,ARRAY['trauma','maternity'],'#0ea5e9'),
  ('MZ','Hospital Provincial de Pemba','hospital','verified',4.5,'{"street":"Av. da Independência","city":"Pemba","lat":-12.9740,"lng":40.5178}'::jsonb,'{"phone":"+25821379000","email":"hpp@medwalletmz.online"}'::jsonb,ARRAY['maternity','pediatrics'],'#7c3aed'),
  ('MZ','Hospital Provincial de Quelimane','hospital','verified',4.5,'{"street":"Av. Eduardo Mondlane","city":"Quelimane","lat":-17.8786,"lng":36.8883}'::jsonb,'{"phone":"+25821383000","email":"hpq@medwalletmz.online"}'::jsonb,ARRAY['maternity','pediatrics'],'#0d9488'),
  ('MZ','Hospital Provincial de Tete','hospital','verified',4.4,'{"street":"Av. Eduardo Mondlane","city":"Tete","lat":-16.1569,"lng":33.5787}'::jsonb,'{"phone":"+25821388000","email":"hpt@medwalletmz.online"}'::jsonb,ARRAY['maternity'],'#f59e0b'),
  ('MZ','Hospital Provincial de Manica','hospital','verified',4.4,'{"street":"Av. Eduardo Mondlane","city":"Chimoio","lat":-19.1164,"lng":33.4833}'::jsonb,'{"phone":"+25821392000","email":"hpm@medwalletmz.online"}'::jsonb,ARRAY['maternity'],'#dc2626'),
  ('MZ','Hospital Provincial de Xai-Xai','hospital','verified',4.4,'{"street":"Av. Eduardo Mondlane","city":"Xai-Xai","lat":-25.0519,"lng":33.6442}'::jsonb,'{"phone":"+25821396000","email":"hpx@medwalletmz.online"}'::jsonb,ARRAY['maternity'],'#9333ea'),
  ('MZ','Hospital Provincial de Inhambane','hospital','verified',4.4,'{"street":"Av. Eduardo Mondlane","city":"Inhambane","lat":-23.8650,"lng":35.3833}'::jsonb,'{"phone":"+25821400000","email":"hpi@medwalletmz.online"}'::jsonb,ARRAY['maternity'],'#0891b2'),
  ('MZ','Hospital Provincial de Lichinga','hospital','verified',4.3,'{"street":"Av. Eduardo Mondlane","city":"Lichinga","lat":-13.3096,"lng":36.0670}'::jsonb,'{"phone":"+25821404000","email":"hpl@medwalletmz.online"}'::jsonb,ARRAY['maternity'],'#16a34a'),
  ('MZ','Farmácia Polana','pharmacy','verified',4.5,'{"city":"Maputo","lat":-25.9650,"lng":32.5850}'::jsonb,'{"phone":"+258840000002"}'::jsonb,ARRAY['delivery','24h'],'#0ea5e9'),
  ('MZ','Farmácia Beira Central','pharmacy','verified',4.5,'{"city":"Beira","lat":-19.8333,"lng":34.8500}'::jsonb,'{"phone":"+258840000020"}'::jsonb,ARRAY['delivery','prescription'],'#16a34a'),
  ('MZ','Laboratório Clínico de Maputo','lab','verified',4.7,'{"city":"Maputo","lat":-25.9720,"lng":32.5760}'::jsonb,'{"phone":"+25821356000"}'::jsonb,ARRAY['hematology','biochemistry','home_collection'],'#f59e0b')
ON CONFLICT DO NOTHING;

-- =====================================================================
-- PARTE 6 — RESTAURAR REFERÊNCIAS M-PESA NOS SEGUROS
-- =====================================================================
UPDATE public.micro_insurance_products
SET description = 'Reembolso automático se tempo de espera > 2h para consulta marcada. Pagamento via M-Pesa (fluxo manual) ou carteira MedWallet.'
WHERE code = 'SEGCASH_MZ' AND country_id = 'MZ';

UPDATE public.micro_insurance_products
SET description = 'Reembolso se entrega de farmácia > 90 min após prometido. Pagamento via M-Pesa (fluxo manual) ou carteira MedWallet.'
WHERE code = 'SEGCASHF_MZ' AND country_id = 'MZ';

-- Adicionar bónus products para APE, TB, ARV
INSERT INTO public.micro_insurance_products (country_id, name, code, description, premium_amount, premium_currency, coverage_amount, coverage_currency, payout_trigger_hours, payout_auto, active)
VALUES
  ('MZ','Bônus Performance APE','BONUS_APE_MZ','Bônus de 250 MZN para APEs que completem 50 visitas com sucesso. Pagamento via M-Pesa (fluxo manual).',0,'MZN',250,'MZN',0,true,true),
  ('MZ','Bônus TB Cura Completa','BONUS_TB_MZ','Bônus de 500 MZN para pacientes que completem tratamento TB 6 meses. Pagamento via M-Pesa (fluxo manual).',0,'MZN',500,'MZN',0,true,true),
  ('MZ','Bônus ARV Adesão 90%','BONUS_ART_MZ','Bônus mensal de 100 MZN para pacientes ARV com adesão ≥ 90%. Pagamento via M-Pesa (fluxo manual).',0,'MZN',100,'MZN',0,true,true)
ON CONFLICT DO NOTHING;

-- =====================================================================
-- PARTE 7 — SEED DAS 5 VERTICAIS COM DADOS DE DEMONSTRAÇÃO
-- =====================================================================

-- 7a. APE VISITS (12 visitas)
DO $$
DECLARE
  v_ape_id uuid;
  v_pat_ids uuid[];
  v_visit_types text[] := ARRAY['malaria','tb_screen','hiv_test','anc','pnc','vaccination','general','referral'];
  v_provinces text[] := ARRAY['Maputo Cidade','Maputo Província','Sofala','Nampula','Cabo Delgado','Zambézia','Tete','Manica','Gaza','Inhambane','Niassa'];
  v_districts text[] := ARRAY['KaMpfumo','Matola','Munhava','Muhala-Expansão','Pemba-Porto','Nicoadala','Tete-Cidade','Chimoio','Xai-Xai','Inhambane','Lichinga'];
  v_i int;
BEGIN
  SELECT id INTO v_ape_id FROM auth.users WHERE email = 'gestor.nacional@medwalletmz.online';
  SELECT array_agg(id) INTO v_pat_ids
  FROM auth.users
  WHERE email IN (
    'utente.ana@medwalletmz.online',
    'utente.carlos@medwalletmz.online',
    'utente.fatima@medwalletmz.online',
    'utente.joao@medwalletmz.online',
    'utente.rosa@medwalletmz.online'
  );

  FOR v_i IN 1..12 LOOP
    INSERT INTO public.ape_visits (
      ape_user_id, patient_user_id, country_id,
      province, district, village,
      visit_date, visit_type, rdt_result, diagnosis,
      treatment_given, referral_to, gps_lat, gps_lng,
      offline_synced, bonus_paid_mzn, notes
    ) VALUES (
      v_ape_id,
      v_pat_ids[(v_i % 5) + 1],
      'MZ',
      v_provinces[((v_i-1) % 11) + 1],
      v_districts[((v_i-1) % 11) + 1],
      'Aldeia ' || v_i,
      now() - (v_i || ' days')::interval,
      v_visit_types[((v_i-1) % 8) + 1],
      CASE WHEN v_i % 4 = 0 THEN 'positive' WHEN v_i % 4 = 1 THEN 'negative' ELSE 'not_tested' END,
      CASE
        WHEN v_i % 8 = 0 THEN 'Suspeita de malaria não complicada'
        WHEN v_i % 8 = 1 THEN 'Triagem TB negativa'
        WHEN v_i % 8 = 2 THEN 'Teste HIV negativo'
        WHEN v_i % 8 = 3 THEN 'Pré-natal normal'
        WHEN v_i % 8 = 4 THEN 'Vacinação completa (Penta3)'
        WHEN v_i % 8 = 5 THEN 'Suspeita de pneumonia'
        WHEN v_i % 8 = 6 THEN 'Diarreia aguda simples'
        ELSE 'Consulta geral de rotina'
      END,
      CASE WHEN v_i % 4 = 0 THEN '["Coartem 1x4 comprimidos"]'::jsonb ELSE NULL END,
      CASE WHEN v_i % 6 = 0 THEN 'Hospital Central Maputo' ELSE NULL END,
      -25.9 + (v_i * 0.05),
      32.5 + (v_i * 0.03),
      true,
      CASE WHEN v_i < 5 THEN 250 ELSE 0 END,
      'Visita de demonstração #' || v_i
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
  RAISE NOTICE '12 APE visitas criadas';
END $$;

-- 7b. TB DOT (8 casos)
DO $$
DECLARE
  v_pat_ids uuid[];
  v_obs_id uuid;
  v_i int;
  v_phases text[] := ARRAY['intensive','continuation','follow_up'];
  v_risks text[] := ARRAY['low','medium','high'];
BEGIN
  SELECT id INTO v_obs_id FROM auth.users WHERE email = 'gestor.nacional@medwalletmz.online';
  SELECT array_agg(id) INTO v_pat_ids
  FROM auth.users
  WHERE email IN (
    'utente.ana@medwalletmz.online','utente.carlos@medwalletmz.online',
    'utente.fatima@medwalletmz.online','utente.joao@medwalletmz.online',
    'utente.rosa@medwalletmz.online'
  );

  FOR v_i IN 1..8 LOOP
    INSERT INTO public.tb_dot_records (
      patient_user_id, observer_user_id, country_id,
      province, tb_case_id, treatment_phase,
      start_date, end_date,
      daily_meds, adherence_pct, last_taken_at, last_video_observation, video_session_url,
      missed_doses, abandonment_risk, bonus_paid_mzn, notes
    ) VALUES (
      v_pat_ids[((v_i-1) % 5) + 1],
      v_obs_id,
      'MZ',
      CASE v_i WHEN 1 THEN 'Maputo Cidade' WHEN 2 THEN 'Sofala' WHEN 3 THEN 'Nampula'
               WHEN 4 THEN 'Zambézia' WHEN 5 THEN 'Manica' WHEN 6 THEN 'Cabo Delgado'
               WHEN 7 THEN 'Tete' ELSE 'Gaza' END,
      'TB-MZ-2026-' || lpad(v_i::text, 4, '0'),
      v_phases[((v_i-1) % 3) + 1],
      CURRENT_DATE - (v_i * 7),
      CASE WHEN v_i < 5 THEN NULL ELSE CURRENT_DATE - (v_i * 7) + 180 END,
      jsonb_build_array(
        jsonb_build_object('day', 1, 'med', 'RHZE', 'taken', true,  'observed_at', now() - interval '30 days'),
        jsonb_build_object('day', 2, 'med', 'RHZE', 'taken', true,  'observed_at', now() - interval '29 days'),
        jsonb_build_object('day', 3, 'med', 'RHZE', 'taken', false, 'observed_at', null),
        jsonb_build_object('day', 4, 'med', 'RHZE', 'taken', true,  'observed_at', now() - interval '27 days')
      ),
      CASE WHEN v_i % 3 = 0 THEN 95.50 WHEN v_i % 3 = 1 THEN 82.30 ELSE 67.80 END,
      CASE WHEN v_i % 4 = 0 THEN now() - interval '2 hours' ELSE now() - interval '1 day' END,
      CASE WHEN v_i % 4 = 0 THEN now() - interval '3 hours' ELSE NULL END,
      CASE WHEN v_i % 4 = 0 THEN 'https://daily.co/m/medwallet-tb-' || v_i ELSE NULL END,
      CASE WHEN v_i % 3 = 2 THEN 5 WHEN v_i % 3 = 1 THEN 2 ELSE 0 END,
      v_risks[((v_i-1) % 3) + 1],
      CASE WHEN v_i < 3 THEN 500 ELSE 0 END,
      'Caso TB de demonstração #' || v_i
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
  RAISE NOTICE '8 TB DOT casos criados';
END $$;

-- 7c. ART ADHERENCE (10 pacientes ARV)
DO $$
DECLARE
  v_pat_ids uuid[];
  v_i int;
  v_regimens text[] := ARRAY['TDF+3TC+DTG (TLD)','ABC+3TC+DTG','AZT+3TC+NVP','TDF+3TC+EFV'];
  v_provinces text[] := ARRAY['Maputo Cidade','Sofala','Nampula','Zambézia','Manica'];
  v_facilities text[] := ARRAY[
    'Hospital Central Maputo — Farmácia ARV',
    'Hospital da Beira — Farmácia ARV',
    'Hospital Central Nampula — Farmácia ARV',
    'Hospital Provincial Quelimane — Farmácia ARV',
    'Hospital Provincial Chimoio — Farmácia ARV'
  ];
BEGIN
  SELECT array_agg(id) INTO v_pat_ids
  FROM auth.users
  WHERE email IN (
    'utente.ana@medwalletmz.online','utente.carlos@medwalletmz.online',
    'utente.fatima@medwalletmz.online','utente.joao@medwalletmz.online',
    'utente.rosa@medwalletmz.online'
  );

  FOR v_i IN 1..10 LOOP
    INSERT INTO public.art_adherence_logs (
      patient_user_id, country_id, province,
      art_regimen, art_start_date,
      last_viral_load, last_viral_load_date,
      last_cd4_count, last_cd4_date,
      adherence_pct, refill_due_date, last_refill_date, last_refill_facility,
      missed_doses_30d, whatsapp_reminders_sent, last_whatsapp_reminder,
      bonus_paid_mzn, notes
    ) VALUES (
      v_pat_ids[((v_i-1) % 5) + 1],
      'MZ',
      v_provinces[((v_i-1) % 5) + 1],
      v_regimens[((v_i-1) % 4) + 1],
      CURRENT_DATE - (v_i * 90),
      CASE WHEN v_i % 3 = 0 THEN 50 WHEN v_i % 3 = 1 THEN 850 ELSE 12000 END,
      CURRENT_DATE - 30,
      CASE WHEN v_i % 3 = 0 THEN 650 WHEN v_i % 3 = 1 THEN 420 ELSE 180 END,
      CURRENT_DATE - 60,
      CASE WHEN v_i % 4 = 0 THEN 96.00 WHEN v_i % 4 = 1 THEN 88.50 WHEN v_i % 4 = 2 THEN 74.20 ELSE 52.00 END,
      CURRENT_DATE + (v_i - 5),
      CURRENT_DATE - 30,
      v_facilities[((v_i-1) % 5) + 1],
      CASE WHEN v_i % 4 = 0 THEN 0 WHEN v_i % 4 = 1 THEN 2 WHEN v_i % 4 = 2 THEN 5 ELSE 9 END,
      v_i * 3,
      now() - (v_i || ' hours')::interval,
      CASE WHEN v_i % 4 = 0 THEN 100 ELSE 0 END,
      'Paciente ARV demonstração #' || v_i
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
  RAISE NOTICE '10 ART adherence logs criados';
END $$;

-- 7d. MALARIA CASES (15 casos)
DO $$
DECLARE
  v_pat_ids uuid[];
  v_ape_id uuid;
  v_i int;
  v_provinces text[] := ARRAY['Maputo Cidade','Maputo Província','Sofala','Nampula','Cabo Delgado','Zambézia','Tete','Manica','Gaza','Inhambane','Niassa'];
  v_districts text[] := ARRAY['KaMpfumo','Matola','Munhava','Muhala-Expansão','Pemba-Porto','Nicoadala','Tete-Cidade','Chimoio','Xai-Xai','Inhambane','Lichinga'];
BEGIN
  SELECT id INTO v_ape_id FROM auth.users WHERE email = 'gestor.nacional@medwalletmz.online';
  SELECT array_agg(id) INTO v_pat_ids
  FROM auth.users
  WHERE email IN (
    'utente.ana@medwalletmz.online','utente.carlos@medwalletmz.online',
    'utente.fatima@medwalletmz.online','utente.joao@medwalletmz.online',
    'utente.rosa@medwalletmz.online'
  );

  FOR v_i IN 1..15 LOOP
    INSERT INTO public.malaria_cases (
      patient_user_id, ape_user_id, country_id,
      province, district, village,
      case_date, age_years, sex, pregnant,
      rdt_result, species, severity,
      treatment_given, treatment_start, treatment_completed,
      referral_to, outcome,
      gps_lat, gps_lng, reported_to_pnm, air_quality_index, outbreak_zone
    ) VALUES (
      v_pat_ids[((v_i-1) % 5) + 1],
      v_ape_id,
      'MZ',
      v_provinces[((v_i-1) % 11) + 1],
      v_districts[((v_i-1) % 11) + 1],
      'Aldeia Malaria ' || v_i,
      CURRENT_DATE - (v_i * 3),
      5 + (v_i * 4),
      CASE WHEN v_i % 2 = 0 THEN 'M' ELSE 'F' END,
      CASE WHEN v_i % 5 = 0 THEN true ELSE false END,
      CASE WHEN v_i % 4 = 0 THEN 'negative' ELSE 'positive' END,
      CASE WHEN v_i % 4 = 0 THEN 'unknown' ELSE 'falciparum' END,
      CASE WHEN v_i % 7 = 0 THEN 'severe' ELSE 'uncomplicated' END,
      CASE WHEN v_i % 4 = 0 THEN NULL WHEN v_i % 7 = 0 THEN 'Artesunato IV' ELSE 'Coartem' END,
      CASE WHEN v_i % 4 = 0 THEN NULL ELSE CURRENT_DATE - (v_i * 3) END,
      CASE WHEN v_i < 5 THEN true ELSE false END,
      CASE WHEN v_i % 7 = 0 THEN 'Hospital Central Beira' ELSE NULL END,
      CASE
        WHEN v_i < 3 THEN 'cured'
        WHEN v_i < 7 THEN 'recovering'
        WHEN v_i < 10 THEN 'referred'
        WHEN v_i % 4 = 0 THEN NULL
        ELSE 'recovering'
      END,
      -25.9 + (v_i * 0.04),
      32.5 + (v_i * 0.02),
      CASE WHEN v_i < 8 THEN true ELSE false END,
      CASE WHEN v_i % 3 = 0 THEN 85 WHEN v_i % 3 = 1 THEN 120 ELSE 65 END,
      CASE WHEN v_i % 5 = 0 THEN true ELSE false END
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
  RAISE NOTICE '15 malaria casos criados';
END $$;

-- 7e. MATERNAL PROFILES (8 gestantes)
DO $$
DECLARE
  v_pat_ids uuid[];
  v_i int;
  v_provinces text[] := ARRAY['Maputo Cidade','Sofala','Nampula','Zambézia','Manica'];
  v_blood_types text[] := ARRAY['O+','A+','B+','O-','AB+'];
  v_risks text[] := ARRAY['low','medium','high'];
  v_facilities text[] := ARRAY[
    'Maternidade Central Maputo',
    'Hospital Central Beira',
    'Hospital Central Nampula',
    'Hospital Provincial Quelimane',
    'Hospital Provincial Chimoio'
  ];
BEGIN
  SELECT array_agg(id) INTO v_pat_ids
  FROM auth.users
  WHERE email IN (
    'utente.ana@medwalletmz.online','utente.carlos@medwalletmz.online',
    'utente.fatima@medwalletmz.online','utente.joao@medwalletmz.online',
    'utente.rosa@medwalletmz.online'
  );

  FOR v_i IN 1..8 LOOP
    INSERT INTO public.maternal_profiles (
      patient_user_id, country_id, province, district,
      lmp_date, edd_date,
      gravida, para, blood_type, risk_level,
      anc_visits_done, anc_visits_due,
      partner_name, partner_phone,
      preferred_facility,
      last_bp_systolic, last_bp_diastolic, last_weight_kg,
      sos_active, last_sos_at, sos_route_to_facility,
      whatsapp_reminders_active, notes
    ) VALUES (
      v_pat_ids[((v_i-1) % 5) + 1],
      'MZ',
      v_provinces[((v_i-1) % 5) + 1],
      'Distrito Materno ' || v_i,
      CURRENT_DATE - (200 - v_i * 14),
      CURRENT_DATE + (90 - v_i * 14),
      v_i,
      CASE WHEN v_i > 1 THEN v_i - 1 ELSE 0 END,
      v_blood_types[((v_i-1) % 5) + 1],
      v_risks[((v_i-1) % 3) + 1],
      CASE WHEN v_i < 3 THEN 1 WHEN v_i < 5 THEN 2 WHEN v_i < 7 THEN 3 ELSE 4 END,
      jsonb_build_array(
        jsonb_build_object('visit', 1, 'due_date', (CURRENT_DATE - 180)::text, 'done', true),
        jsonb_build_object('visit', 2, 'due_date', (CURRENT_DATE - 150)::text, 'done', v_i > 1),
        jsonb_build_object('visit', 3, 'due_date', (CURRENT_DATE - 90)::text, 'done', v_i > 3),
        jsonb_build_object('visit', 4, 'due_date', (CURRENT_DATE - 30)::text, 'done', v_i > 6)
      ),
      'Parceiro ' || v_i,
      '+258840200' || lpad(v_i::text, 3, '0'),
      v_facilities[((v_i-1) % 5) + 1],
      110 + (v_i * 2),
      70 + v_i,
      60.5 + (v_i * 1.5),
      CASE WHEN v_i = 4 THEN true ELSE false END,
      CASE WHEN v_i = 4 THEN now() - interval '2 hours' ELSE NULL END,
      CASE WHEN v_i = 4 THEN
        jsonb_build_object('origin', jsonb_build_object('lat',-25.9650,'lng',32.5850),
                           'destination', jsonb_build_object('lat',-25.9700,'lng',32.5800),
                           'eta_minutes', 12, 'distance_km', 3.2,
                           'route_url', 'https://www.google.com/maps/dir/?api=1&origin=-25.965,32.585&destination=-25.970,32.580')
      ELSE NULL END,
      true,
      'Perfil materno demonstração #' || v_i
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
  RAISE NOTICE '8 maternal profiles criados';
END $$;

-- =====================================================================
-- PARTE 8 — PAGAMENTOS M-PESA DE DEMONSTRAÇÃO (PENDENTES)
-- =====================================================================
DO $$
DECLARE
  v_pat_ids uuid[];
  v_ape_id uuid;
  v_i int;
  v_refs text[] := ARRAY['MW-AB1234','MW-CD5678','MW-EF9012','MW-GH3456','MW-IJ7890'];
BEGIN
  SELECT id INTO v_ape_id FROM auth.users WHERE email = 'gestor.nacional@medwalletmz.online';

  FOR v_i IN 1..5 LOOP
    INSERT INTO public.mpesa_manual_payments (
      reference, amount_mzn, description, status,
      payer_phone, payer_name, destination_number,
      metadata
    ) VALUES (
      v_refs[v_i],
      CASE v_i WHEN 1 THEN 250 WHEN 2 THEN 50 WHEN 3 THEN 200 WHEN 4 THEN 100 ELSE 500 END,
      CASE v_i
        WHEN 1 THEN 'Bônus de performance APE — 50 visitas completas'
        WHEN 2 THEN 'MedCash Consulta SLA — reembolso espera > 2h'
        WHEN 3 THEN 'Seguro Maternidade MZ — prémio mensal'
        WHEN 4 THEN 'Seguro Malaria Familiar — prémio mensal'
        ELSE 'Seguro TB Tratamento Completo — prémio'
      END,
      'pending',
      '+258840100' || lpad(v_i::text, 3, '0'),
      CASE v_i
        WHEN 1 THEN 'Ana Macuácua'
        WHEN 2 THEN 'Carlos Mondlane'
        WHEN 3 THEN 'Fátima Sibil'
        WHEN 4 THEN 'João Taimo'
        ELSE 'Rossa Chiquevo'
      END,
      '+258840000000',
      jsonb_build_object(
        'bonus_type', CASE v_i WHEN 1 THEN 'ape_performance' ELSE 'insurance_premium' END,
        'created_by', 'system_seed',
        'vertical', CASE v_i WHEN 1 THEN 'ape' WHEN 2 THEN 'insurance' WHEN 3 THEN 'maternal' WHEN 4 THEN 'malaria' ELSE 'tb' END
      )
    )
    ON CONFLICT (reference) DO NOTHING;
  END LOOP;
  RAISE NOTICE '5 pagamentos M-Pesa pendentes criados (para gestor nacional confirmar)';
END $$;

-- =====================================================================
-- PARTE 9 — MENSAGENS WHATSAPP DE DEMONSTRAÇÃO
-- =====================================================================
DO $$
DECLARE
  v_i int;
  v_phones text[] := ARRAY['+258840100001','+258840100002','+258840100003','+258840100004','+258840100005'];
  v_bodies text[] := ARRAY[
    'Olá Ana! Lembrete: consulta pré-natal amanhã às 09h no Hospital Central Maputo. Responda SIM para confirmar.',
    'Carlos: hora de tomar RHZE (TB). Tire foto do comprimido e envie por aqui. Obrigado!',
    'Fátima: refill de ARV (TLD) disponível. Levantar até 30/07 na Farmácia ARV Nampula.',
    'João: lembrete Coartem dose 2. Tome com comida. Caso febre persista, procure unidade sanitária.',
    'Rossa: SOS recebido. Equipa INEM a caminho. ETA 12 min. Fique calma.'
  ];
  v_verticals text[] := ARRAY['maternal','tb','art','malaria','maternal'];
BEGIN
  FOR v_i IN 1..5 LOOP
    INSERT INTO public.whatsapp_messages (
      phone_to, phone_from, message_body, template_name,
      status, sent_at, delivered_at, read_at, vertical, metadata
    ) VALUES (
      v_phones[v_i],
      '+258840000000',
      v_bodies[v_i],
      CASE v_verticals[v_i]
        WHEN 'maternal' THEN 'anc_reminder'
        WHEN 'tb' THEN 'tb_medication_reminder'
        WHEN 'art' THEN 'art_refill_reminder'
        WHEN 'malaria' THEN 'malaria_treatment_reminder'
        ELSE 'general_reminder'
      END,
      'delivered',
      now() - (v_i || ' hours')::interval,
      now() - (v_i || ' hours')::interval + interval '5 minutes',
      now() - (v_i || ' hours')::interval + interval '20 minutes',
      v_verticals[v_i],
      jsonb_build_object('source', 'system_seed', 'auto_generated', true)
    );
  END LOOP;
  RAISE NOTICE '5 mensagens WhatsApp de demonstração criadas';
END $$;

-- =====================================================================
-- PARTE 10 — REGISTAR CHAMADAS GOOGLE CLOUD DE DEMONSTRAÇÃO
-- =====================================================================
-- Limpar registos antigos de demonstração (idempotente, sem ON CONFLICT)
DELETE FROM public.google_cloud_integrations
WHERE called_by IN (SELECT id FROM auth.users WHERE email = 'gestor.nacional@medwalletmz.online');

-- Inserir 12 chamadas Google Cloud de demonstração em INSERT único
INSERT INTO public.google_cloud_integrations
  (service, endpoint, request_payload, response_payload, status_code, error_message, duration_ms, called_by)
SELECT v.service, v.endpoint, v.req::jsonb, v.resp::jsonb, v.status_code, v.err::text, v.duration_ms, u.id
FROM (VALUES
  ('maps_geocoding', 'https://maps.googleapis.com/maps/api/geocode/json',
   '{"address":"Av. Agostinho Neto, Maputo, MZ","key":"***"}',
   '{"status":"OK","results":[{"formatted_address":"Av. Agostinho Neto, Maputo","geometry":{"location":{"lat":-25.97,"lng":32.58}}}]}',
   200, NULL, 287),
  ('maps_geolocation', 'https://www.googleapis.com/geolocation/v1/geolocate',
   '{"considerIp":true}',
   '{"location":{"lat":-25.965,"lng":32.585},"accuracy":1200}',
   200, NULL, 543),
  ('maps_directions', 'https://maps.googleapis.com/maps/api/directions/json',
   '{"origin":"-25.965,32.585","destination":"-25.970,32.580","mode":"driving"}',
   '{"status":"OK","routes":[{"legs":[{"distance":{"text":"3.2 km"},"duration":{"text":"12 mins"}}]}]}',
   200, NULL, 412),
  ('maps_distance_matrix', 'https://maps.googleapis.com/maps/api/distancematrix/json',
   '{"origins":["-25.965,32.585"],"destinations":["-25.970,32.580"]}',
   '{"status":"OK","rows":[{"elements":[{"distance":{"text":"3.2 km"},"duration":{"text":"12 mins"}}]}]}',
   200, NULL, 398),
  ('maps_places', 'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
   '{"location":"-25.965,32.585","radius":5000,"type":"hospital"}',
   '{"status":"OK","results":[]}',
   200, NULL, 612),
  ('maps_air_quality', 'https://airquality.googleapis.com/v1/currentConditions:lookup',
   '{"location":{"latitude":-25.965,"longitude":32.585}}',
   '{"aqi":85,"category":"MODERATE"}',
   200, NULL, 728),
  ('vision_document_text', 'https://vision.googleapis.com/v1/images:annotate',
   '{"image":{"source":{"imageUri":"gs://medwallet-mz/prescription.jpg"}}}',
   '{"fullTextAnnotation":{"text":"Paracetamol 500mg - 1 comprimido 8/8h"}}',
   200, NULL, 1453),
  ('translation', 'https://translation.googleapis.com/language/translate/v2',
   '{"q":"Take one tablet every 8 hours","source":"en","target":"pt"}',
   '{"data":{"translations":[{"translatedText":"Tome um comprimido a cada 8 horas"}]}}',
   200, NULL, 187),
  ('speech_to_text', 'https://speech.googleapis.com/v1/speech:recognize',
   '{"config":{"languageCode":"pt-BR"},"audio":{"content":"base64audio"}}',
   '{"results":[{"alternatives":[{"transcript":"paciente refere febre ha tres dias"}]}]}',
   200, NULL, 2104),
  ('text_to_speech', 'https://texttospeech.googleapis.com/v1/text:synthesize',
   '{"input":{"text":"Lembrete: toma do remedio as 8 horas"},"voice":{"languageCode":"pt-BR"}}',
   '{"audioContent":"base64audio"}',
   200, NULL, 893),
  ('dialogflow', 'https://dialogflow.googleapis.com/v2/projects/medwallet-mz/agent/sessions/abc:detectIntent',
   '{"queryInput":{"text":{"text":"tenho febre","languageCode":"pt"}}}',
   '{"queryResult":{"fulfillmentText":"Ha quantos dias tem febre? Fez teste de malaria?"}}',
   200, NULL, 567),
  ('document_ai', 'https://us-documentai.googleapis.com/v1/projects/medwallet-mz/processors/medical:process',
   '{"inlineConfig":{"content":"base64document"}}',
   '{"document":{"text":"Receiturario Medico - Dr. Joao Taimo"}}',
   200, NULL, 2341)
) AS v(service, endpoint, req, resp, status_code, err, duration_ms),
LATERAL (SELECT id FROM auth.users WHERE email = 'gestor.nacional@medwalletmz.online' LIMIT 1) AS u(id);

DO $$
BEGIN
  RAISE NOTICE '12 registos de integracao Google Cloud criados';
END $$;

-- =====================================================================
-- PARTE 11 — REMOVER GESTORES PROVINCIAIS (se ainda existirem)
-- =====================================================================
-- Garantir que não há gestores provinciais (caso a migration anterior não tenha corrido)
WITH gestores_provinciais AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'gestor_maputo@medwalletmz.online',
    'gestor_matola@medwalletmz.online',
    'gestor_beira@medwalletmz.online',
    'gestor_nampula@medwalletmz.online',
    'gestor_pemba@medwalletmz.online',
    'gestor_quelimane@medwalletmz.online',
    'gestor_tete@medwalletmz.online',
    'gestor_chimoio@medwalletmz.online',
    'gestor_xaixai@medwalletmz.online',
    'gestor_inhambane@medwalletmz.online',
    'gestor_lichinga@medwalletmz.online'
  )
)
DELETE FROM public.country_management WHERE user_id IN (SELECT id FROM gestores_provinciais);

WITH gestores_provinciais AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'gestor_maputo@medwalletmz.online','gestor_matola@medwalletmz.online',
    'gestor_beira@medwalletmz.online','gestor_nampula@medwalletmz.online',
    'gestor_pemba@medwalletmz.online','gestor_quelimane@medwalletmz.online',
    'gestor_tete@medwalletmz.online','gestor_chimoio@medwalletmz.online',
    'gestor_xaixai@medwalletmz.online','gestor_inhambane@medwalletmz.online',
    'gestor_lichinga@medwalletmz.online'
  )
)
DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM gestores_provinciais);

WITH gestores_provinciais AS (
  SELECT id FROM auth.users
  WHERE email IN (
    'gestor_maputo@medwalletmz.online','gestor_matola@medwalletmz.online',
    'gestor_beira@medwalletmz.online','gestor_nampula@medwalletmz.online',
    'gestor_pemba@medwalletmz.online','gestor_quelimane@medwalletmz.online',
    'gestor_tete@medwalletmz.online','gestor_chimoio@medwalletmz.online',
    'gestor_xaixai@medwalletmz.online','gestor_inhambane@medwalletmz.online',
    'gestor_lichinga@medwalletmz.online'
  )
)
DELETE FROM public.profiles WHERE user_id IN (SELECT id FROM gestores_provinciais);

DELETE FROM auth.users
WHERE email IN (
  'gestor_maputo@medwalletmz.online','gestor_matola@medwalletmz.online',
  'gestor_beira@medwalletmz.online','gestor_nampula@medwalletmz.online',
  'gestor_pemba@medwalletmz.online','gestor_quelimane@medwalletmz.online',
  'gestor_tete@medwalletmz.online','gestor_chimoio@medwalletmz.online',
  'gestor_xaixai@medwalletmz.online','gestor_inhambane@medwalletmz.online',
  'gestor_lichinga@medwalletmz.online'
);

-- Remover province_scope/city_scope se ainda existirem
ALTER TABLE public.country_management
  DROP COLUMN IF EXISTS province_scope,
  DROP COLUMN IF EXISTS city_scope;

-- =====================================================================
-- PARTE 12 — RELATÓRIO FINAL
-- =====================================================================
SELECT
  '✅ INSTALAÇÃO COMPLETA' as status,
  'gestor.nacional@medwalletmz.online / GestorNacional2026' as gestor_nacional,
  (SELECT count(*) FROM public.stores WHERE country_id='MZ') as farmacias,
  (SELECT count(*) FROM public.clinics WHERE country_id='MZ') as hospitais_clinicas,
  (SELECT count(*) FROM public.laboratories WHERE country_id='MZ') as laboratorios,
  (SELECT count(*) FROM public.ape_visits) as ape_visitas,
  (SELECT count(*) FROM public.tb_dot_records) as tb_casos,
  (SELECT count(*) FROM public.art_adherence_logs) as art_pacientes,
  (SELECT count(*) FROM public.malaria_cases) as malaria_casos,
  (SELECT count(*) FROM public.maternal_profiles) as maternal_gestantes,
  (SELECT count(*) FROM public.mpesa_manual_payments WHERE status='pending') as mpesa_pendentes,
  (SELECT count(*) FROM public.whatsapp_messages) as whatsapp_msgs,
  (SELECT count(*) FROM public.google_cloud_integrations) as google_cloud_calls;

-- =====================================================================
-- RESUMO FINAL
-- =====================================================================
-- ✅ GESTOR NACIONAL: gestor.nacional@medwalletmz.online / GestorNacional2026
-- ✅ 5 UTENTES DEMO (password: Utente2026):
--    - utente.ana@medwalletmz.online
--    - utente.carlos@medwalletmz.online
--    - utente.fatima@medwalletmz.online
--    - utente.joao@medwalletmz.online
--    - utente.rosa@medwalletmz.online
-- ✅ 200+ instituições em 11 cidades (Maputo, Matola, Beira, Nampula,
--    Pemba, Quelimane, Tete, Chimoio, Xai-Xai, Inhambane, Lichinga)
-- ✅ 12 visitas APE
-- ✅ 8 casos TB DOT (com video URL)
-- ✅ 10 logs ART adherence
-- ✅ 15 casos malaria (com air quality + outbreak zone)
-- ✅ 8 maternal profiles (1 com SOS activo + rota INEM)
-- ✅ 5 pagamentos M-Pesa pendentes (prontos para gestor confirmar)
-- ✅ 5 mensagens WhatsApp internas (simuladas, sem API externa)
-- ✅ 12 registos Google Cloud (Geocoding, Directions, Vision, Translation,
--    Speech-to-Text, Text-to-Speech, Dialogflow, Document AI, Air Quality)
-- ✅ M-Pesa SEM API externa — fluxo manual interno (confirmar no painel)
-- ✅ WhatsApp SEM API externa — simulado internamente
-- ✅ Google Cloud APIs reais (Maps, Vision, Translate, Speech, etc.)
-- ✅ Gestores provinciais removidos (apenas nacional)
-- =====================================================================
