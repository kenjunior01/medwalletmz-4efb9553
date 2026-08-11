-- =====================================================================
-- MEDWALLET MZ — FLYWHEELS COMPLETO PARA SUPABASE SQL EDITOR
-- =====================================================================
-- COMO USAR:
--   1. Abrir Supabase Dashboard → SQL Editor → New query
--   2. Colar TODO este ficheiro
--   3. Clicar em "Run"
--   4. Pode executar múltiplas vezes (idempotente)
--
-- PRÉ-REQUISITO: Tabelas base (wallets, wallet_transactions, profiles,
--   user_roles, countries, user_gamification, joy_coin_transactions,
--   achievements, user_achievements, challenges, user_challenges)
--   devem existir. Se faltar algo, execute MEDWALLET_MZ_SQL_EDITOR.sql primeiro.
--
-- CONTEÚDO:
--   PARTE A — 5 Tabelas Verticais (ape_visits, tb_dot_records,
--              art_adherence_logs, malaria_cases, maternal_profiles)
--   PARTE B — Tabelas de Suporte (m-pesa, whatsapp, google cloud)
--   PARTE C — Tabelas dos Flywheels (12 novas tabelas)
--   PARTE D — Funções RPC dos 5 Flywheels (15 funções)
--   PARTE E — Triggers automáticos
-- =====================================================================

-- =====================================================================
-- PARTE A — 5 TABELAS VERTICAIS DE SAÚDE
-- =====================================================================

-- A0. Safety: ensure wallet_transactions accepts cashback type
-- (base migration only has: deposit, debit, credit, refund, bonus, commission, referral)
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN ('deposit','debit','credit','refund','bonus','commission','referral','cashback'));

-- A0b. Ensure countries table exists (needed by FKs)
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
INSERT INTO public.countries (id, name, currency_code, currency_symbol, is_active)
VALUES ('MZ','Moçambique','MZN','MT',true)
ON CONFLICT (id) DO NOTHING;

-- A0c. Remove FK on country_id for vertical tables (countries may not have all refs)
-- We use TEXT country_id with DEFAULT 'MZ' instead of FK to keep it robust

-- A1. APE — Agentes Polivalentes Elementares
CREATE TABLE IF NOT EXISTS public.ape_visits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ape_user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  patient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  country_id      TEXT DEFAULT 'MZ',
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
CREATE POLICY "ape insert own"  ON public.ape_visits FOR INSERT TO authenticated WITH CHECK (ape_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'country_manager'::app_role));
DROP POLICY IF EXISTS "ape update own"  ON public.ape_visits;
CREATE POLICY "ape update own"  ON public.ape_visits FOR UPDATE TO authenticated USING (ape_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'country_manager'::app_role));
GRANT SELECT ON public.ape_visits TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ape_visits TO authenticated;

-- A2. TB DOT
CREATE TABLE IF NOT EXISTS public.tb_dot_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  observer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  country_id      TEXT DEFAULT 'MZ',
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
CREATE POLICY "tb dot insert" ON public.tb_dot_records FOR INSERT TO authenticated WITH CHECK (observer_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'country_manager'::app_role));
DROP POLICY IF EXISTS "tb dot update" ON public.tb_dot_records;
CREATE POLICY "tb dot update" ON public.tb_dot_records FOR UPDATE TO authenticated USING (observer_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'country_manager'::app_role));
GRANT SELECT ON public.tb_dot_records TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tb_dot_records TO authenticated;

-- A3. ART Adherence
CREATE TABLE IF NOT EXISTS public.art_adherence_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  country_id      TEXT DEFAULT 'MZ',
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
CREATE POLICY "art insert" ON public.art_adherence_logs FOR INSERT TO authenticated WITH CHECK (patient_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'country_manager'::app_role));
DROP POLICY IF EXISTS "art update" ON public.art_adherence_logs;
CREATE POLICY "art update" ON public.art_adherence_logs FOR UPDATE TO authenticated USING (patient_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'country_manager'::app_role));
GRANT SELECT ON public.art_adherence_logs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.art_adherence_logs TO authenticated;

-- A4. Malaria Cases
CREATE TABLE IF NOT EXISTS public.malaria_cases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ape_user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  country_id      TEXT DEFAULT 'MZ',
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
CREATE POLICY "malaria insert" ON public.malaria_cases FOR INSERT TO authenticated WITH CHECK (ape_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'country_manager'::app_role));
DROP POLICY IF EXISTS "malaria update" ON public.malaria_cases;
CREATE POLICY "malaria update" ON public.malaria_cases FOR UPDATE TO authenticated USING (ape_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'country_manager'::app_role));
GRANT SELECT ON public.malaria_cases TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.malaria_cases TO authenticated;

-- A5. Maternal Profiles
CREATE TABLE IF NOT EXISTS public.maternal_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  country_id      TEXT DEFAULT 'MZ',
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
CREATE POLICY "maternal read"   ON public.maternal_profiles FOR SELECT TO authenticated USING (patient_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'country_manager'::app_role));
DROP POLICY IF EXISTS "maternal insert" ON public.maternal_profiles;
CREATE POLICY "maternal insert" ON public.maternal_profiles FOR INSERT TO authenticated WITH CHECK (patient_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'country_manager'::app_role));
DROP POLICY IF EXISTS "maternal update" ON public.maternal_profiles;
CREATE POLICY "maternal update" ON public.maternal_profiles FOR UPDATE TO authenticated USING (patient_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'country_manager'::app_role));
GRANT SELECT ON public.maternal_profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.maternal_profiles TO authenticated;

-- =====================================================================
-- PARTE B — TABELAS DE SUPORTE
-- =====================================================================

-- B1. touch_updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- B2. M-Pesa manual payments
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
CREATE INDEX IF NOT EXISTS idx_mpesa_status ON public.mpesa_manual_payments(status);
ALTER TABLE public.mpesa_manual_payments ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_mpesa_touch ON public.mpesa_manual_payments;
CREATE TRIGGER trg_mpesa_touch BEFORE UPDATE ON public.mpesa_manual_payments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP POLICY IF EXISTS "mpesa admin all" ON public.mpesa_manual_payments;
CREATE POLICY "mpesa admin all" ON public.mpesa_manual_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'country_manager'::app_role));
GRANT SELECT ON public.mpesa_manual_payments TO anon, authenticated;
GRANT INSERT, UPDATE ON public.mpesa_manual_payments TO authenticated;

-- B3. WhatsApp messages
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
CREATE INDEX IF NOT EXISTS idx_wa_phone_to ON public.whatsapp_messages(phone_to);
CREATE INDEX IF NOT EXISTS idx_wa_status   ON public.whatsapp_messages(status);
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wa admin all" ON public.whatsapp_messages;
CREATE POLICY "wa admin all" ON public.whatsapp_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'country_manager'::app_role));
GRANT SELECT ON public.whatsapp_messages TO anon, authenticated;
GRANT INSERT, UPDATE ON public.whatsapp_messages TO authenticated;

-- =====================================================================
-- PARTE C — TABELAS DOS FLYWHEELS (12 novas tabelas)
-- =====================================================================

-- C1. APE compensation ledger (Flywheel 1)
CREATE TABLE IF NOT EXISTS public.ape_compensation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ape_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_id UUID NOT NULL REFERENCES public.ape_visits(id) ON DELETE CASCADE,
  amount_mzn NUMERIC(10,2) NOT NULL CHECK (amount_mzn >= 0),
  reason TEXT NOT NULL DEFAULT 'visit',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processed','rejected','voided')),
  processed_at TIMESTAMPTZ,
  wallet_transaction_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ape_comp_ape    ON public.ape_compensation(ape_user_id);
CREATE INDEX IF NOT EXISTS idx_ape_comp_status  ON public.ape_compensation(status);
CREATE INDEX IF NOT EXISTS idx_ape_comp_visit   ON public.ape_compensation(visit_id);
ALTER TABLE public.ape_compensation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ape_comp_select_own" ON public.ape_compensation;
CREATE POLICY "ape_comp_select_own" ON public.ape_compensation FOR SELECT TO authenticated
  USING (ape_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'country_manager'::app_role));
GRANT SELECT ON public.ape_compensation TO authenticated;

-- C2. Malaria surveillance alerts (Flywheel 1)
CREATE TABLE IF NOT EXISTS public.malaria_surveillance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id TEXT NOT NULL,
  district TEXT,
  alert_level TEXT NOT NULL CHECK (alert_level IN ('watch','warning','emergency')),
  threshold_cases INT NOT NULL DEFAULT 10,
  actual_cases INT NOT NULL DEFAULT 0,
  period_days INT NOT NULL DEFAULT 7,
  message TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_malaria_alerts_province ON public.malaria_surveillance_alerts(province_id);
CREATE INDEX IF NOT EXISTS idx_malaria_alerts_level   ON public.malaria_surveillance_alerts(alert_level);
CREATE INDEX IF NOT EXISTS idx_malaria_alerts_created  ON public.malaria_surveillance_alerts(created_at DESC);
ALTER TABLE public.malaria_surveillance_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "malaria_alerts_select" ON public.malaria_surveillance_alerts;
CREATE POLICY "malaria_alerts_select" ON public.malaria_surveillance_alerts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "malaria_alerts_insert" ON public.malaria_surveillance_alerts;
CREATE POLICY "malaria_alerts_insert" ON public.malaria_surveillance_alerts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'country_manager'::app_role));
GRANT SELECT ON public.malaria_surveillance_alerts TO anon, authenticated;
GRANT INSERT, UPDATE ON public.malaria_surveillance_alerts TO authenticated;

-- C3. APE patient referrals (Flywheel 1)
CREATE TABLE IF NOT EXISTS public.ape_patient_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ape_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_phone TEXT,
  referral_reason TEXT DEFAULT 'new_patient',
  converted BOOLEAN DEFAULT false,
  converted_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  reward_joy_coins INT DEFAULT 50,
  reward_mzn NUMERIC(10,2) DEFAULT 25,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ape_ref_ape      ON public.ape_patient_referrals(ape_user_id);
CREATE INDEX IF NOT EXISTS idx_ape_ref_converted ON public.ape_patient_referrals(converted);
ALTER TABLE public.ape_patient_referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ape_ref_select_own" ON public.ape_patient_referrals;
CREATE POLICY "ape_ref_select_own" ON public.ape_patient_referrals FOR SELECT TO authenticated
  USING (ape_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));
GRANT SELECT, INSERT ON public.ape_patient_referrals TO authenticated;

-- C4. Automated notifications queue (Flywheel 1 + 3)
CREATE TABLE IF NOT EXISTS public.automated_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  channel TEXT NOT NULL DEFAULT 'push' CHECK (channel IN ('push','whatsapp','sms','in_app')),
  title TEXT,
  body TEXT NOT NULL,
  vertical TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','cancelled')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_anotif_status  ON public.automated_notifications(status);
CREATE INDEX IF NOT EXISTS idx_anotif_scheduled ON public.automated_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_anotif_user ON public.automated_notifications(user_id);
ALTER TABLE public.automated_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anotif_service_all" ON public.automated_notifications;
CREATE POLICY "anotif_service_all" ON public.automated_notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'country_manager'::app_role));
GRANT SELECT, INSERT, UPDATE ON public.automated_notifications TO authenticated;

-- C5. Community challenges (Flywheel 4)
CREATE TABLE IF NOT EXISTS public.community_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL DEFAULT 'visits' CHECK (challenge_type IN ('visits','shares','checkins','referrals','orders','reviews')),
  target_value INT NOT NULL DEFAULT 10,
  joy_coins_reward INT NOT NULL DEFAULT 100,
  mzn_reward NUMERIC(10,2) DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  is_active BOOLEAN DEFAULT true,
  province TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.community_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comm_chal_select" ON public.community_challenges;
CREATE POLICY "comm_chal_select" ON public.community_challenges FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.community_challenges TO anon, authenticated;

-- C6. ART check-ins (Flywheel 3 — 1-touch check-in)
CREATE TABLE IF NOT EXISTS public.art_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adherence_log_id UUID NOT NULL REFERENCES public.art_adherence_logs(id) ON DELETE CASCADE,
  patient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  taken BOOLEAN DEFAULT true,
  notes TEXT,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_art_checkin_log   ON public.art_checkins(adherence_log_id);
CREATE INDEX IF NOT EXISTS idx_art_checkin_date  ON public.art_checkins(checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_art_checkin_user  ON public.art_checkins(patient_user_id);
ALTER TABLE public.art_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "art_checkin_own" ON public.art_checkins;
CREATE POLICY "art_checkin_own" ON public.art_checkins FOR ALL TO authenticated
  USING (patient_user_id = auth.uid());
GRANT SELECT, INSERT ON public.art_checkins TO authenticated;

-- C7. ART monthly reports (Flywheel 3 — auto-generated)
CREATE TABLE IF NOT EXISTS public.art_monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  adherence_log_id UUID NOT NULL REFERENCES public.art_adherence_logs(id) ON DELETE CASCADE,
  report_month DATE NOT NULL,
  total_checkins INT DEFAULT 0,
  missed_doses INT DEFAULT 0,
  adherence_pct NUMERIC(5,2) DEFAULT 0,
  viral_load NUMERIC(10,2),
  cd4_count INT,
  risk_level TEXT CHECK (risk_level IN ('good','warning','critical')),
  referral_needed BOOLEAN DEFAULT false,
  referral_id UUID,
  generated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_art_report_user  ON public.art_monthly_reports(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_art_report_month ON public.art_monthly_reports(report_month DESC);
ALTER TABLE public.art_monthly_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "art_report_own" ON public.art_monthly_reports;
CREATE POLICY "art_report_own" ON public.art_monthly_reports FOR SELECT TO authenticated
  USING (patient_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));
GRANT SELECT ON public.art_monthly_reports TO authenticated;

-- C8. Medication stock reports (Flywheel 2)
CREATE TABLE IF NOT EXISTS public.medication_stock_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id UUID,
  product_name TEXT NOT NULL,
  store_id UUID,
  store_name TEXT,
  province TEXT,
  city TEXT,
  in_stock BOOLEAN NOT NULL,
  price_mzn NUMERIC(10,2),
  quantity_available INT,
  reporter_reward_coins INT DEFAULT 10,
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_med_stock_product ON public.medication_stock_reports(product_name);
CREATE INDEX IF NOT EXISTS idx_med_stock_city    ON public.medication_stock_reports(city);
CREATE INDEX IF NOT EXISTS idx_med_stock_date    ON public.medication_stock_reports(created_at DESC);
ALTER TABLE public.medication_stock_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "med_stock_select" ON public.medication_stock_reports;
CREATE POLICY "med_stock_select" ON public.medication_stock_reports FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "med_stock_insert" ON public.medication_stock_reports;
CREATE POLICY "med_stock_insert" ON public.medication_stock_reports FOR INSERT TO authenticated WITH CHECK (true);
GRANT SELECT, INSERT ON public.medication_stock_reports TO anon, authenticated;

-- C9. Health content shares (Flywheel 4 — viral tracking)
CREATE TABLE IF NOT EXISTS public.health_content_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL DEFAULT 'health_tip' CHECK (content_type IN ('health_tip','morning_vibe','malaria_alert','art_reminder','community_challenge')),
  content_id UUID,
  share_channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (share_channel IN ('whatsapp','sms','copy_link','native_share')),
  recipient_phone TEXT,
  deep_link_used TEXT,
  recipient_signed_up BOOLEAN DEFAULT false,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joy_coins_earned INT DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hcs_user    ON public.health_content_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_hcs_content ON public.health_content_shares(content_type);
CREATE INDEX IF NOT EXISTS idx_hcs_date    ON public.health_content_shares(created_at DESC);
ALTER TABLE public.health_content_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hcs_own" ON public.health_content_shares;
CREATE POLICY "hcs_own" ON public.health_content_shares FOR ALL TO authenticated USING (user_id = auth.uid());
GRANT SELECT, INSERT ON public.health_content_shares TO authenticated;

-- C10. Auto top-up configs (Flywheel 5)
CREATE TABLE IF NOT EXISTS public.auto_topup_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  min_balance_mzn NUMERIC(10,2) NOT NULL DEFAULT 100,
  topup_amount_mzn NUMERIC(10,2) NOT NULL DEFAULT 500,
  payment_method TEXT NOT NULL DEFAULT 'mpesa' CHECK (payment_method IN ('mpesa','emola','mkesh')),
  is_active BOOLEAN DEFAULT true,
  last_topup_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.auto_topup_configs ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_autotopup_touch ON public.auto_topup_configs;
CREATE TRIGGER trg_autotopup_touch BEFORE UPDATE ON public.auto_topup_configs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
-- Ensure UNIQUE on user_id for upsert support (safe for existing tables)
DO $$ BEGIN
  ALTER TABLE public.auto_topup_configs ADD CONSTRAINT auto_topup_configs_user_id_key UNIQUE (user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DROP POLICY IF EXISTS "atop_own" ON public.auto_topup_configs;
CREATE POLICY "atop_own" ON public.auto_topup_configs FOR ALL TO authenticated USING (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE ON public.auto_topup_configs TO authenticated;

-- C11. Cashback transactions (Flywheel 5)
CREATE TABLE IF NOT EXISTS public.cashback_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('order','consultation','pharmacy','insurance')),
  source_id UUID,
  cashback_pct NUMERIC(5,2) NOT NULL DEFAULT 5,
  cashback_amount_mzn NUMERIC(10,2) NOT NULL,
  credited_to_wallet BOOLEAN DEFAULT false,
  wallet_transaction_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cashback_user ON public.cashback_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cashback_date ON public.cashback_transactions(created_at DESC);
ALTER TABLE public.cashback_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cashback_own" ON public.cashback_transactions;
CREATE POLICY "cashback_own" ON public.cashback_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT SELECT ON public.cashback_transactions TO authenticated;

-- C12. Health finance scores (Flywheel 5)
CREATE TABLE IF NOT EXISTS public.health_finance_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 50 CHECK (score BETWEEN 0 AND 100),
  wallet_consistency INT DEFAULT 50,
  appointment_attendance INT DEFAULT 50,
  medication_adherence INT DEFAULT 50,
  preventive_care INT DEFAULT 50,
  insurance_active INT DEFAULT 50,
  last_calculated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.health_finance_scores ENABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_hfs_touch ON public.health_finance_scores;
CREATE TRIGGER trg_hfs_touch BEFORE UPDATE ON public.health_finance_scores FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP POLICY IF EXISTS "hfs_own" ON public.health_finance_scores;
CREATE POLICY "hfs_own" ON public.health_finance_scores FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT SELECT ON public.health_finance_scores TO authenticated;

-- =====================================================================
-- PARTE D — FUNÇÕES RPC DOS 5 FLYWHEELS
-- =====================================================================

-- ──────────────────────────────────────────────────────────────────────
-- FLYWHEEL 1: APE MOTOR — Auto-compensation + Dashboard
-- ──────────────────────────────────────────────────────────────────────

-- D1. Process APE visit compensation (atomic)
CREATE OR REPLACE FUNCTION public.process_ape_visit_compensation(
  _visit_id UUID,
  _bonus_amount NUMERIC DEFAULT 0,
  _reason TEXT DEFAULT 'visit_completed'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit RECORD;
  v_ape_id UUID;
  v_amount NUMERIC(10,2);
  v_comp_id UUID;
  v_tx_id UUID;
  v_new_balance NUMERIC(12,2);
  v_joy_coins INT;
BEGIN
  -- 1. Get visit
  SELECT * INTO v_visit FROM public.ape_visits WHERE id = _visit_id;
  IF v_visit IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Visita nao encontrada');
  END IF;
  v_ape_id := v_visit.ape_user_id;
  IF v_ape_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Visita sem APE');
  END IF;

  -- 2. Check not already compensated
  SELECT id INTO v_comp_id FROM public.ape_compensation
    WHERE visit_id = _visit_id AND status = 'processed';
  IF v_comp_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ja compensada');
  END IF;

  -- 3. Calculate amount: base + visit_type bonus + optional extra
  v_amount := 25; -- base MZN per visit
  IF v_visit.visit_type = 'malaria' THEN v_amount := v_amount + 15; END IF;
  IF v_visit.visit_type = 'anc' THEN v_amount := v_amount + 10; END IF;
  IF v_visit.visit_type = 'hiv_test' THEN v_amount := v_amount + 20; END IF;
  IF v_visit.rdt_result = 'positive' THEN v_amount := v_amount + 10; END IF;
  v_amount := v_amount + COALESCE(_bonus_amount, 0);

  -- 4. Create compensation record
  INSERT INTO public.ape_compensation (ape_user_id, visit_id, amount_mzn, reason, status)
  VALUES (v_ape_id, _visit_id, v_amount, _reason, 'processed')
  RETURNING id INTO v_comp_id;

  -- 5. Credit wallet
  INSERT INTO public.wallets (user_id, balance_mzn, total_deposited)
  VALUES (v_ape_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.wallets
  SET balance_mzn = balance_mzn + v_amount,
      total_deposited = total_deposited + v_amount,
      updated_at = now()
  WHERE user_id = v_ape_id
  RETURNING balance_mzn INTO v_new_balance;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, description, status, payment_method)
  VALUES (v_ape_id, 'bonus', v_amount, COALESCE(v_new_balance, 0), 'ape_compensation', v_comp_id,
          'Compensacao APE: ' || _reason, 'completed', 'wallet');

  -- 6. Award joy coins
  v_joy_coins := 10;
  INSERT INTO public.user_gamification (user_id, joy_coins, experience_points)
  VALUES (v_ape_id, 0, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.user_gamification SET joy_coins = joy_coins + v_joy_coins, updated_at = now() WHERE user_id = v_ape_id;
  INSERT INTO public.joy_coin_transactions (user_id, amount, transaction_type, description, reference_id)
  VALUES (v_ape_id, v_joy_coins, 'bonus', 'Compensacao APE', v_comp_id);

  -- 7. Update visit bonus
  UPDATE public.ape_visits SET bonus_paid_mzn = v_amount WHERE id = _visit_id;

  RETURN jsonb_build_object(
    'success', true,
    'compensation_id', v_comp_id,
    'amount_mzn', v_amount,
    'new_balance', v_new_balance,
    'joy_coins', v_joy_coins,
    'reason', _reason
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.process_ape_visit_compensation(UUID, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_ape_visit_compensation(UUID, NUMERIC, TEXT) TO authenticated;

-- D2. APE Dashboard stats
CREATE OR REPLACE FUNCTION public.get_ape_dashboard(
  _ape_user_id UUID
)
RETURNS TABLE(
  total_visits BIGINT,
  this_month_visits BIGINT,
  total_earned NUMERIC,
  pending_compensations BIGINT,
  total_referrals BIGINT,
  converted_referrals BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*)::bigint FROM public.ape_visits WHERE ape_user_id = _ape_user_id),
    (SELECT count(*)::bigint FROM public.ape_visits WHERE ape_user_id = _ape_user_id AND visit_date >= date_trunc('month', now())),
    (SELECT COALESCE(sum(amount_mzn), 0) FROM public.ape_compensation WHERE ape_user_id = _ape_user_id AND status = 'processed'),
    (SELECT count(*)::bigint FROM public.ape_compensation WHERE ape_user_id = _ape_user_id AND status = 'pending'),
    (SELECT count(*)::bigint FROM public.ape_patient_referrals WHERE ape_user_id = _ape_user_id),
    (SELECT count(*)::bigint FROM public.ape_patient_referrals WHERE ape_user_id = _ape_user_id AND converted = true)
$$;
REVOKE EXECUTE ON FUNCTION public.get_ape_dashboard(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ape_dashboard(UUID) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- FLYWHEEL 1: MALARIA SURVEILLANCE — Outbreak detection
-- ──────────────────────────────────────────────────────────────────────

-- D3. Run malaria surveillance (cron job)
CREATE OR REPLACE FUNCTION public.run_malaria_surveillance()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alerts_created INT := 0;
  v_alerts_resolved INT := 0;
  v_outbreaks_marked INT := 0;
  v_row_count INT;
  v_rec RECORD;
  v_threshold INT := 10; -- cases per province per 7 days
BEGIN
  -- 1. Count positive cases per province in last 7 days
  FOR v_rec IN
    SELECT province, count(*)::int AS cases
    FROM public.malaria_cases
    WHERE rdt_result = 'positive'
      AND case_date >= CURRENT_DATE - 7
      AND country_id = 'MZ'
      AND province IS NOT NULL
    GROUP BY province
    HAVING count(*) >= v_threshold
  LOOP
    -- 2. Check if alert already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.malaria_surveillance_alerts
      WHERE province_id = v_rec.province AND resolved_at IS NULL
        AND created_at >= CURRENT_DATE - 7
    ) THEN
      -- Determine level
      v_alerts_created := v_alerts_created + 1;

      INSERT INTO public.malaria_surveillance_alerts (province_id, alert_level, threshold_cases, actual_cases, message)
      VALUES (v_rec.province,
        CASE WHEN v_rec.cases >= 50 THEN 'emergency' WHEN v_rec.cases >= 25 THEN 'warning' ELSE 'watch' END,
        v_threshold, v_rec.cases,
        'Surto de malaria detectado em ' || v_rec.province || ': ' || v_rec.cases || ' casos em 7 dias (limiar: ' || v_threshold || ')'
      );

      -- 3. Mark cases in outbreak zone
      UPDATE public.malaria_cases SET outbreak_zone = true
        WHERE province = v_rec.province
          AND case_date >= CURRENT_DATE - 7
          AND rdt_result = 'positive'
          AND outbreak_zone = false;
      GET DIAGNOSTICS v_row_count = ROW_COUNT;
      v_outbreaks_marked := v_outbreaks_marked + v_row_count;

      -- 4. Queue notifications for APEs in that province
      INSERT INTO public.automated_notifications (phone, channel, title, body, vertical, priority)
      SELECT DISTINCT p.phone, 'whatsapp',
        'Alerta Malaria — ' || v_rec.province,
        'Surto detectado: ' || v_rec.cases || ' casos em ' || v_rec.province || '. Reforce o rastreio na sua area.',
        'malaria', 'high'
      FROM public.profiles p
      JOIN public.user_roles r ON r.user_id = p.user_id AND r.role::text = 'health_worker'
      WHERE p.country_id = 'MZ' AND p.phone IS NOT NULL
        AND p.default_city ILIKE '%' || v_rec.province || '%';

    END IF;
  END LOOP;

  -- 5. Auto-resolve old alerts
  UPDATE public.malaria_surveillance_alerts SET resolved_at = now()
    WHERE resolved_at IS NULL AND created_at < CURRENT_DATE - 14;
  GET DIAGNOSTICS v_alerts_resolved = ROW_COUNT;

  RETURN jsonb_build_object(
    'alerts_created', v_alerts_created,
    'alerts_resolved', v_alerts_resolved,
    'cases_marked_outbreak', v_outbreaks_marked,
    'ran_at', now()
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.run_malaria_surveillance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_malaria_surveillance() TO service_role;

-- ──────────────────────────────────────────────────────────────────────
-- FLYWHEEL 3: ART ADHERENCE — Reminders + Check-in + Reports
-- ──────────────────────────────────────────────────────────────────────

-- D4. Generate TARV/ART reminders (cron)
CREATE OR REPLACE FUNCTION public.generate_tarv_reminders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT a.id, a.patient_user_id, a.refill_due_date, a.adherence_pct, a.missed_doses_30d, p.phone
    FROM public.art_adherence_logs a
    JOIN public.profiles p ON p.user_id = a.patient_user_id
    WHERE a.country_id = 'MZ'
      AND a.refill_due_date IS NOT NULL
      AND (a.refill_due_date <= CURRENT_DATE + 3 OR a.missed_doses_30d > 3)
      AND (a.last_whatsapp_reminder IS NULL OR a.last_whatsapp_reminder < now() - INTERVAL '3 days')
  LOOP
    INSERT INTO public.automated_notifications (user_id, phone, channel, title, body, vertical, priority)
    VALUES (
      v_rec.patient_user_id, v_rec.phone, 'whatsapp', 'Lembrete TARV',
      CASE
        WHEN v_rec.missed_doses_30d > 5 THEN 'Aviso URGENTE: ' || v_rec.missed_doses_30d || ' doses falhadas. Contacte a sua unidade de saude imediatamente.'
        WHEN v_rec.missed_doses_30d > 3 THEN 'Lembrete TARV: Tem ' || v_rec.missed_doses_30d || ' doses falhadas. Mantenha a adesao ao tratamento.'
        ELSE 'Lembrete TARV: O seu levantamento esta proximo. Dirija-se a farmacia.'
      END,
      'art',
      CASE WHEN v_rec.missed_doses_30d > 5 THEN 'urgent' WHEN v_rec.missed_doses_30d > 3 THEN 'high' ELSE 'normal' END
    );

    UPDATE public.art_adherence_logs
      SET whatsapp_reminders_sent = whatsapp_reminders_sent + 1,
          last_whatsapp_reminder = now()
      WHERE id = v_rec.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('reminders_generated', v_count, 'ran_at', now());
END;
$$;
REVOKE EXECUTE ON FUNCTION public.generate_tarv_reminders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_tarv_reminders() TO service_role;

-- D5. Process ART 1-touch check-in
CREATE OR REPLACE FUNCTION public.process_art_checkin(
  _patient_user_id UUID,
  _adherence_log_id UUID,
  _taken BOOLEAN DEFAULT true,
  _notes TEXT DEFAULT NULL,
  _gps_lat DOUBLE PRECISION DEFAULT NULL,
  _gps_lng DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkin_id UUID;
  v_joy_coins INT := 5;
BEGIN
  -- 1. Insert check-in
  INSERT INTO public.art_checkins (adherence_log_id, patient_user_id, taken, notes, gps_lat, gps_lng)
  VALUES (_adherence_log_id, _patient_user_id, _taken, _notes, _gps_lat, _gps_lng)
  RETURNING id INTO v_checkin_id;

  -- 2. Update adherence log
  IF _taken THEN
    UPDATE public.art_adherence_logs
    SET missed_doses_30d = GREATEST(0, missed_doses_30d - 1),
        adherence_pct = LEAST(100, adherence_pct + 2),
        updated_at = now()
    WHERE id = _adherence_log_id AND patient_user_id = _patient_user_id;
  ELSE
    UPDATE public.art_adherence_logs
    SET missed_doses_30d = missed_doses_30d + 1,
        adherence_pct = GREATEST(0, adherence_pct - 5),
        updated_at = now()
    WHERE id = _adherence_log_id AND patient_user_id = _patient_user_id;
  END IF;

  -- 3. Award joy coins for taking medication
  IF _taken THEN
    INSERT INTO public.user_gamification (user_id, joy_coins, experience_points, streak_days)
    VALUES (_patient_user_id, 0, 0, 0) ON CONFLICT (user_id) DO NOTHING;
    UPDATE public.user_gamification SET joy_coins = joy_coins + v_joy_coins, updated_at = now() WHERE user_id = _patient_user_id;
    INSERT INTO public.joy_coin_transactions (user_id, amount, transaction_type, description, reference_id)
    VALUES (_patient_user_id, v_joy_coins, 'bonus', 'ART check-in', v_checkin_id);
  END IF;

  -- 4. Check if adherence is critical and queue alert
  IF EXISTS (
    SELECT 1 FROM public.art_adherence_logs
    WHERE id = _adherence_log_id AND missed_doses_30d > 5
  ) THEN
    INSERT INTO public.automated_notifications (user_id, channel, title, body, vertical, priority)
    SELECT _patient_user_id, 'whatsapp', 'Alerta Adesao TARV',
      'A sua adesao ao TARV esta critica. Um profissional de saude entrara em contacto.',
      'art', 'urgent';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'checkin_id', v_checkin_id,
    'taken', _taken,
    'joy_coins_earned', CASE WHEN _taken THEN v_joy_coins ELSE 0 END
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.process_art_checkin(UUID, UUID, BOOLEAN, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_art_checkin(UUID, UUID, BOOLEAN, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

-- D6. Generate ART monthly report
CREATE OR REPLACE FUNCTION public.generate_art_monthly_report(
  _patient_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reported INT := 0;
  v_rec RECORD;
  v_report_month DATE := date_trunc('month', now())::date;
  v_checkins_count INT;
  v_missed INT;
  v_adherence NUMERIC(5,2);
  v_risk TEXT;
BEGIN
  FOR v_rec IN
    SELECT a.id AS log_id, a.patient_user_id, a.adherence_pct, a.missed_doses_30d,
           a.last_viral_load, a.last_cd4_count
    FROM public.art_adherence_logs a
    WHERE a.country_id = 'MZ'
      AND (_patient_user_id IS NULL OR a.patient_user_id = _patient_user_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.art_monthly_reports r
        WHERE r.adherence_log_id = a.id AND r.report_month = v_report_month
      )
  LOOP
    v_risk := 'good';
    SELECT count(*), count(*) FILTER (WHERE taken = false)
    INTO v_checkins_count, v_missed
    FROM public.art_checkins
    WHERE adherence_log_id = v_rec.log_id
      AND checkin_date >= v_report_month;

    v_adherence := CASE WHEN v_checkins_count > 0
      THEN ROUND((v_checkins_count - v_missed)::numeric / v_checkins_count * 100, 2)
      ELSE v_rec.adherence_pct END;

    IF v_adherence < 50 THEN v_risk := 'critical';
    ELSIF v_adherence < 80 THEN v_risk := 'warning';
    END IF;

    INSERT INTO public.art_monthly_reports (
      patient_user_id, adherence_log_id, report_month,
      total_checkins, missed_doses, adherence_pct, viral_load, cd4_count,
      risk_level, referral_needed
    ) VALUES (
      v_rec.patient_user_id, v_rec.log_id, v_report_month,
      v_checkins_count, COALESCE(v_missed, 0), v_adherence,
      v_rec.last_viral_load, v_rec.last_cd4_count,
      v_risk, v_risk = 'critical'
    );
    v_reported := v_reported + 1;
  END LOOP;

  RETURN jsonb_build_object('reports_generated', v_reported, 'month', v_report_month, 'ran_at', now());
END;
$$;
REVOKE EXECUTE ON FUNCTION public.generate_art_monthly_report(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_art_monthly_report(UUID) TO service_role, authenticated;

-- D7. Check adherence and auto-alert (cron)
CREATE OR REPLACE FUNCTION public.check_adherence_and_alert()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_critical_count INT := 0;
  v_low_count INT := 0;
BEGIN
  -- 1. Low adherence patients (50-80%) — warning
  INSERT INTO public.automated_notifications (user_id, channel, title, body, vertical, priority)
  SELECT a.patient_user_id, 'push', 'Aviso de Adesao',
    'A sua adesao ao TARV esta em ' || a.adherence_pct || '%. Continue a tomar correctamente.',
    'art', 'normal'
  FROM public.art_adherence_logs a
  WHERE a.country_id = 'MZ'
    AND a.adherence_pct BETWEEN 50 AND 80
    AND (a.last_whatsapp_reminder IS NULL OR a.last_whatsapp_reminder < now() - INTERVAL '7 days');
  GET DIAGNOSTICS v_low_count = ROW_COUNT;

  -- Update last_whatsapp_reminder for low adherence to prevent duplicate alerts
  UPDATE public.art_adherence_logs SET last_whatsapp_reminder = now()
    WHERE country_id = 'MZ'
      AND adherence_pct BETWEEN 50 AND 80
      AND (last_whatsapp_reminder IS NULL OR last_whatsapp_reminder < now() - INTERVAL '7 days');

  -- 2. Critical adherence patients (<50%) — urgent + referral
  INSERT INTO public.automated_notifications (user_id, channel, title, body, vertical, priority, metadata)
  SELECT a.patient_user_id, 'whatsapp', 'URGENTE: Adesao Critica TARV',
    'A sua adesao ao TARV esta em ' || a.adherence_pct || '%. Contacte urgentemente a sua unidade de saude. Vamos encaminha-lo.',
    'art', 'urgent', jsonb_build_object('needs_referral', true, 'adherence_pct', a.adherence_pct)
  FROM public.art_adherence_logs a
  WHERE a.country_id = 'MZ'
    AND a.adherence_pct < 50
    AND (a.last_whatsapp_reminder IS NULL OR a.last_whatsapp_reminder < now() - INTERVAL '3 days');
  GET DIAGNOSTICS v_critical_count = ROW_COUNT;

  -- Update last_whatsapp_reminder for critical adherence to prevent duplicate alerts
  UPDATE public.art_adherence_logs SET last_whatsapp_reminder = now()
    WHERE country_id = 'MZ'
      AND adherence_pct < 50
      AND (last_whatsapp_reminder IS NULL OR last_whatsapp_reminder < now() - INTERVAL '3 days');

  RETURN jsonb_build_object(
    'low_adherence_alerts', v_low_count,
    'critical_alerts', v_critical_count,
    'ran_at', now()
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.check_adherence_and_alert() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_adherence_and_alert() TO service_role;

-- ──────────────────────────────────────────────────────────────────────
-- FLYWHEEL 2: MEDICATION DATA — Stock reports + Prices
-- ──────────────────────────────────────────────────────────────────────

-- D8. Report medication stock (user-submitted)
CREATE OR REPLACE FUNCTION public.report_medication_stock(
  _reporter_user_id UUID,
  _product_name TEXT,
  _store_name TEXT,
  _in_stock BOOLEAN,
  _price_mzn NUMERIC DEFAULT NULL,
  _province TEXT DEFAULT NULL,
  _city TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id UUID;
  v_joy_coins INT := 10;
BEGIN
  INSERT INTO public.medication_stock_reports (reporter_user_id, product_name, store_name, in_stock, price_mzn, province, city)
  VALUES (_reporter_user_id, _product_name, _store_name, _in_stock, _price_mzn, _province, _city)
  RETURNING id INTO v_report_id;

  -- Reward joy coins
  INSERT INTO public.user_gamification (user_id, joy_coins, experience_points)
  VALUES (_reporter_user_id, 0, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.user_gamification SET joy_coins = joy_coins + v_joy_coins, updated_at = now() WHERE user_id = _reporter_user_id;
  INSERT INTO public.joy_coin_transactions (user_id, amount, transaction_type, description, reference_id)
  VALUES (_reporter_user_id, v_joy_coins, 'bonus', 'Reporte de stock', v_report_id);

  -- If out of stock, alert users who recently searched
  IF NOT _in_stock THEN
    INSERT INTO public.automated_notifications (channel, title, body, vertical, priority, metadata)
    VALUES ('push', 'Stock Indisponivel', _product_name || ' indisponivel em ' || COALESCE(_store_name, _city, ''),
      'medication', 'normal', jsonb_build_object('product_name', _product_name, 'city', COALESCE(_city, '')));
  END IF;

  RETURN jsonb_build_object('success', true, 'report_id', v_report_id, 'joy_coins_earned', v_joy_coins);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.report_medication_stock(UUID, TEXT, TEXT, BOOLEAN, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_medication_stock(UUID, TEXT, TEXT, BOOLEAN, NUMERIC, TEXT, TEXT) TO authenticated;

-- D9. Suggest Farmacia Popular (nearest with stock)
CREATE OR REPLACE FUNCTION public.suggest_farmacia_popular(
  _product_name TEXT,
  _province TEXT DEFAULT NULL,
  _city TEXT DEFAULT NULL
)
RETURNS TABLE(
  store_name TEXT,
  city TEXT,
  province TEXT,
  price_mzn NUMERIC,
  in_stock BOOLEAN,
  reported_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sr.store_name, sr.city, sr.province, sr.price_mzn, sr.in_stock, sr.created_at AS reported_at
  FROM public.medication_stock_reports sr
  WHERE sr.product_name ILIKE '%' || _product_name || '%'
    AND sr.in_stock = true
    AND (_province IS NULL OR sr.province = _province)
    AND (_city IS NULL OR sr.city = _city)
    AND sr.created_at >= now() - INTERVAL '7 days'
  ORDER BY sr.created_at DESC
  LIMIT 10
$$;
REVOKE EXECUTE ON FUNCTION public.suggest_farmacia_popular(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suggest_farmacia_popular(TEXT, TEXT, TEXT) TO anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- FLYWHEEL 4: COMMUNITY VIRAL — Shares + Gamification
-- ──────────────────────────────────────────────────────────────────────

-- D10. Track content share
CREATE OR REPLACE FUNCTION public.track_content_share(
  _user_id UUID,
  _content_type TEXT DEFAULT 'health_tip',
  _content_id UUID DEFAULT NULL,
  _share_channel TEXT DEFAULT 'whatsapp',
  _recipient_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share_id UUID;
  v_joy_coins INT := 5;
BEGIN
  INSERT INTO public.health_content_shares (user_id, content_type, content_id, share_channel, recipient_phone)
  VALUES (_user_id, _content_type, _content_id, _share_channel, _recipient_phone)
  RETURNING id INTO v_share_id;

  -- Award joy coins
  INSERT INTO public.user_gamification (user_id, joy_coins, experience_points)
  VALUES (_user_id, 0, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.user_gamification SET joy_coins = joy_coins + v_joy_coins, updated_at = now() WHERE user_id = _user_id;
  INSERT INTO public.joy_coin_transactions (user_id, amount, transaction_type, description, reference_id)
  VALUES (_user_id, v_joy_coins, 'bonus', 'Partilha de conteudo', v_share_id);

  RETURN jsonb_build_object('success', true, 'share_id', v_share_id, 'joy_coins_earned', v_joy_coins);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.track_content_share(UUID, TEXT, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_content_share(UUID, TEXT, UUID, TEXT, TEXT) TO authenticated;

-- D11. Generate weekly challenge
CREATE OR REPLACE FUNCTION public.generate_weekly_challenge()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_types TEXT[] := ARRAY['visits','shares','checkins','referrals','orders','reviews'];
  v_type TEXT;
  v_chal_id UUID;
  v_title TEXT;
BEGIN
  -- Random type
  v_type := v_types[1 + (floor(random() * 6))::int];

  v_title := CASE v_type
    WHEN 'visits' THEN 'Desafio Semanal: Visitas Comunitarias'
    WHEN 'shares' THEN 'Desafio Semanal: Partilha de Saude'
    WHEN 'checkins' THEN 'Desafio Semanal: Check-in TARV'
    WHEN 'referrals' THEN 'Desafio Semanal: Indicacoes'
    WHEN 'orders' THEN 'Desafio Semanal: Pedidos de Medicamento'
    WHEN 'reviews' THEN 'Desafio Semanal: Avaliacoes'
  END;

  INSERT INTO public.community_challenges (title, description, challenge_type, target_value, joy_coins_reward, mzn_reward, starts_at, ends_at)
  VALUES (v_title,
    'Complete ' || (5 + (floor(random() * 15))::int) || ' acoes de ' || v_type || ' esta semana para ganhar Joy Coins!',
    v_type, 5 + (floor(random() * 15))::int, 100 + (floor(random() * 200))::int, 25,
    date_trunc('week', now()), date_trunc('week', now()) + INTERVAL '7 days'
  ) RETURNING id INTO v_chal_id;

  -- Notify active users
  INSERT INTO public.automated_notifications (channel, title, body, vertical, priority)
  VALUES ('push', v_title,
    'Novo desafio comunitario! Participe e ganhe Joy Coins e MZN.',
    'community', 'normal');

  RETURN jsonb_build_object('challenge_id', v_chal_id, 'type', v_type, 'title', v_title, 'created_at', now());
END;
$$;
REVOKE EXECUTE ON FUNCTION public.generate_weekly_challenge() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_weekly_challenge() TO service_role;

-- ──────────────────────────────────────────────────────────────────────
-- FLYWHEEL 5: PAYMENTS & INSURANCE — Auto-topup + Cashback + Score
-- ──────────────────────────────────────────────────────────────────────

-- D12. Process auto top-up (cron)
CREATE OR REPLACE FUNCTION public.process_auto_topups()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT c.user_id, c.min_balance_mzn, c.topup_amount_mzn, c.payment_method, w.balance_mzn
    FROM public.auto_topup_configs c
    JOIN public.wallets w ON w.user_id = c.user_id
    WHERE c.is_active = true
      AND w.balance_mzn < c.min_balance_mzn
      AND (c.last_topup_at IS NULL OR c.last_topup_at < now() - INTERVAL '1 day')
  LOOP
    -- Queue notification for top-up
    INSERT INTO public.automated_notifications (user_id, channel, title, body, vertical, priority, metadata)
    VALUES (v_rec.user_id, 'push', 'Auto Top-up Necessario',
      'O seu saldo esta em ' || v_rec.balance_mzn || ' MZN. Top-up automatico de ' || v_rec.topup_amount_mzn || ' MZN via ' || v_rec.payment_method || '.',
      'payments', 'normal',
      jsonb_build_object('amount', v_rec.topup_amount_mzn, 'method', v_rec.payment_method)
    );

    UPDATE public.auto_topup_configs SET last_topup_at = now() WHERE user_id = v_rec.user_id;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('topups_queued', v_count, 'ran_at', now());
END;
$$;
REVOKE EXECUTE ON FUNCTION public.process_auto_topups() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_auto_topups() TO service_role;

-- D13. Process cashback for an order/payment
CREATE OR REPLACE FUNCTION public.process_cashback(
  _user_id UUID,
  _source_type TEXT,
  _source_id UUID,
  _amount_mzn NUMERIC,
  _cashback_pct NUMERIC DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cb_amount NUMERIC(10,2);
  v_cb_id UUID;
  v_wtx_id UUID;
  v_new_balance NUMERIC(12,2);
BEGIN
  v_cb_amount := ROUND(_amount_mzn * _cashback_pct / 100, 2);

  IF v_cb_amount < 1 THEN
    RETURN jsonb_build_object('success', true, 'cashback', 0, 'note', 'Abaixo do minimo');
  END IF;

  INSERT INTO public.cashback_transactions (user_id, source_type, source_id, cashback_pct, cashback_amount_mzn)
  VALUES (_user_id, _source_type, _source_id, _cashback_pct, v_cb_amount)
  RETURNING id INTO v_cb_id;

  -- Credit wallet
  INSERT INTO public.wallets (user_id, balance_mzn, total_deposited) VALUES (_user_id, 0, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET balance_mzn = balance_mzn + v_cb_amount, updated_at = now() WHERE user_id = _user_id RETURNING balance_mzn INTO v_new_balance;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, description, status, payment_method)
  VALUES (_user_id, 'cashback', v_cb_amount, v_new_balance, 'cashback', v_cb_id, 'Cashback ' || _cashback_pct || '%', 'completed', 'wallet')
  RETURNING id INTO v_wtx_id;

  UPDATE public.cashback_transactions SET credited_to_wallet = true, wallet_transaction_id = v_wtx_id WHERE id = v_cb_id;

  RETURN jsonb_build_object('success', true, 'cashback_amount', v_cb_amount, 'new_balance', v_new_balance);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.process_cashback(UUID, TEXT, UUID, NUMERIC, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_cashback(UUID, TEXT, UUID, NUMERIC, NUMERIC) TO authenticated, service_role;

-- D14. Calculate health finance score
CREATE OR REPLACE FUNCTION public.calculate_health_finance_score(
  _user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_score INT := 50;
  v_appointment_score INT := 50;
  v_medication_score INT := 50;
  v_preventive_score INT := 50;
  v_insurance_score INT := 50;
  v_total NUMERIC(5,2);
BEGIN
  -- Wallet consistency: has wallet + positive balance + regular activity
  IF EXISTS (SELECT 1 FROM public.wallets WHERE user_id = _user_id AND balance_mzn > 0) THEN
    v_wallet_score := 70;
    IF (SELECT count(*) FROM public.wallet_transactions WHERE user_id = _user_id AND created_at >= now() - INTERVAL '30 days') > 3 THEN
      v_wallet_score := 90;
    END IF;
  END IF;

  -- Appointment attendance
  IF EXISTS (SELECT 1 FROM public.consultations WHERE patient_id = _user_id AND status = 'completed' AND created_at >= now() - INTERVAL '90 days') THEN
    v_appointment_score := 80;
  END IF;

  -- Medication adherence (ART)
  SELECT COALESCE(adherence_pct, 50)::int INTO v_medication_score
    FROM public.art_adherence_logs WHERE patient_user_id = _user_id LIMIT 1;

  -- Preventive care: ANC visits, vaccinations, check-ups
  IF EXISTS (SELECT 1 FROM public.ape_visits WHERE patient_user_id = _user_id AND visit_type IN ('vaccination','anc') AND created_at >= now() - INTERVAL '180 days') THEN
    v_preventive_score := 85;
  END IF;

  -- Insurance active
  IF EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = _user_id AND status = 'active') THEN
    v_insurance_score := 90;
  END IF;

  v_total := (v_wallet_score + v_appointment_score + v_medication_score + v_preventive_score + v_insurance_score) / 5;

  INSERT INTO public.health_finance_scores (user_id, score, wallet_consistency, appointment_attendance, medication_adherence, preventive_care, insurance_active)
  VALUES (_user_id, v_total, v_wallet_score, v_appointment_score, v_medication_score, v_preventive_score, v_insurance_score)
  ON CONFLICT (user_id) DO UPDATE SET
    score = EXCLUDED.score,
    wallet_consistency = EXCLUDED.wallet_consistency,
    appointment_attendance = EXCLUDED.appointment_attendance,
    medication_adherence = EXCLUDED.medication_adherence,
    preventive_care = EXCLUDED.preventive_care,
    insurance_active = EXCLUDED.insurance_active,
    last_calculated = now();

  RETURN jsonb_build_object(
    'user_id', _user_id,
    'total_score', v_total,
    'wallet_consistency', v_wallet_score,
    'appointment_attendance', v_appointment_score,
    'medication_adherence', v_medication_score,
    'preventive_care', v_preventive_score,
    'insurance_active', v_insurance_score
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.calculate_health_finance_score(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_health_finance_score(UUID) TO authenticated, service_role;

-- D15. Retry pending compensations (cron)
-- Properly credits wallet + joy coins for each pending compensation
CREATE OR REPLACE FUNCTION public.retry_pending_compensations()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_rec RECORD;
  v_new_balance NUMERIC(12,2);
  v_joy_coins INT := 10;
BEGIN
  FOR v_rec IN
    SELECT id, ape_user_id, amount_mzn, visit_id
    FROM public.ape_compensation
    WHERE status = 'pending'
      AND created_at < now() - INTERVAL '1 hour'
    LIMIT 200
  LOOP
    -- Ensure wallet exists
    INSERT INTO public.wallets (user_id, balance_mzn, total_deposited)
    VALUES (v_rec.ape_user_id, 0, 0) ON CONFLICT (user_id) DO NOTHING;

    -- Credit wallet
    UPDATE public.wallets
      SET balance_mzn = balance_mzn + v_rec.amount_mzn,
          total_deposited = total_deposited + v_rec.amount_mzn,
          updated_at = now()
      WHERE user_id = v_rec.ape_user_id
      RETURNING balance_mzn INTO v_new_balance;

    -- Record wallet transaction
    INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, description, status, payment_method)
    VALUES (v_rec.ape_user_id, 'bonus', v_rec.amount_mzn, COALESCE(v_new_balance, 0), 'ape_compensation', v_rec.id,
            'Compensacao APE (retry)', 'completed', 'wallet');

    -- Award joy coins
    INSERT INTO public.user_gamification (user_id, joy_coins, experience_points)
    VALUES (v_rec.ape_user_id, 0, 0) ON CONFLICT (user_id) DO NOTHING;
    UPDATE public.user_gamification SET joy_coins = joy_coins + v_joy_coins, updated_at = now()
      WHERE user_id = v_rec.ape_user_id;
    INSERT INTO public.joy_coin_transactions (user_id, amount, transaction_type, description, reference_id)
    VALUES (v_rec.ape_user_id, v_joy_coins, 'bonus', 'Compensacao APE (retry)', v_rec.id);

    -- Mark as processed
    UPDATE public.ape_compensation SET status = 'processed', processed_at = now()
      WHERE id = v_rec.id;

    -- Update visit bonus
    UPDATE public.ape_visits SET bonus_paid_mzn = v_rec.amount_mzn WHERE id = v_rec.visit_id;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('compensations_processed', v_count, 'ran_at', now());
END;
$$;
REVOKE EXECUTE ON FUNCTION public.retry_pending_compensations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retry_pending_compensations() TO service_role;

-- D16. Get pending notifications for dispatch (cron helper)
CREATE OR REPLACE FUNCTION public.get_pending_notifications(
  _limit INT DEFAULT 100
)
RETURNS SETOF public.automated_notifications
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.automated_notifications
  WHERE status = 'pending'
    AND (scheduled_for IS NULL OR scheduled_for <= now())
  ORDER BY priority DESC, created_at ASC
  LIMIT _limit
$$;
REVOKE EXECUTE ON FUNCTION public.get_pending_notifications(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pending_notifications(INT) TO service_role;

-- D17. Mark notification as sent
CREATE OR REPLACE FUNCTION public.mark_notification_sent(
  _notification_id UUID,
  _status TEXT DEFAULT 'sent'
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.automated_notifications
  SET status = _status, sent_at = now()
  WHERE id = _notification_id
$$;
REVOKE EXECUTE ON FUNCTION public.mark_notification_sent(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notification_sent(UUID, TEXT) TO service_role;

-- =====================================================================
-- PARTE E — TRIGGERS AUTOMÁTICOS
-- =====================================================================

-- E1. Auto-create wallet when user gets first compensation
CREATE OR REPLACE FUNCTION public.auto_ensure_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_wallet_ape ON public.ape_compensation;
CREATE TRIGGER trg_auto_wallet_ape BEFORE INSERT ON public.ape_compensation
  FOR EACH ROW EXECUTE FUNCTION public.auto_ensure_wallet();

-- E2. Auto-create gamification record on first joy coin transaction
-- NOTE: Function MUST be created BEFORE trigger that references it
CREATE OR REPLACE FUNCTION public.auto_ensure_gamification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_gamification (user_id) VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_gamification ON public.joy_coin_transactions;
CREATE TRIGGER trg_auto_gamification BEFORE INSERT ON public.joy_coin_transactions
  FOR EACH ROW EXECUTE FUNCTION public.auto_ensure_gamification();

-- =====================================================================
-- VERIFICAÇÃO FINAL
-- =====================================================================
SELECT 'FLYWHEELS COMPLETE — Tabelas criadas: ' || count(*) AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'ape_visits','tb_dot_records','art_adherence_logs','malaria_cases','maternal_profiles',
    'mpesa_manual_payments','whatsapp_messages',
    'ape_compensation','malaria_surveillance_alerts','ape_patient_referrals',
    'automated_notifications','community_challenges',
    'art_checkins','art_monthly_reports',
    'medication_stock_reports','health_content_shares',
    'auto_topup_configs','cashback_transactions','health_finance_scores'
  );

SELECT 'Funcoes RPC criadas: ' || count(*) AS status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'process_ape_visit_compensation','get_ape_dashboard','run_malaria_surveillance',
    'generate_tarv_reminders','process_art_checkin','generate_art_monthly_report',
    'check_adherence_and_alert','report_medication_stock','suggest_farmacia_popular',
    'track_content_share','generate_weekly_challenge','process_auto_topups',
    'process_cashback','calculate_health_finance_score','retry_pending_compensations',
    'get_pending_notifications','mark_notification_sent',
    'touch_updated_at','auto_ensure_wallet','auto_ensure_gamification'
  );