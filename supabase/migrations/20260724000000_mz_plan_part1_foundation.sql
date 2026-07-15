-- =====================================================================
-- MZ DOMINATION PLAN — PART 1
-- 1) 10 gestores provinciais (Maputo, Matola, Beira, Nampula, Pemba,
--    Quelimane, Tete, Chimoio, Xai-Xai, Inhambane, Lichinga)
-- 2) 5 novas tabelas verticals (ape_visits, tb_dot_records,
--    art_adherence_logs, malaria_cases, maternal_profiles)
-- 3) 8 regulatory frameworks Moçambique (MISAU, CMED, INS, INEM, INSS,
--    Lei 18/2014, Política Farmacêutica Nacional, CRM)
-- 4) MZ-specific micro-insurance products
-- =====================================================================

-- ---------- 1. ADD province/city scope column to country_management ----------
ALTER TABLE public.country_management
  ADD COLUMN IF NOT EXISTS province_scope TEXT,
  ADD COLUMN IF NOT EXISTS city_scope TEXT;

COMMENT ON COLUMN public.country_management.province_scope IS 'When country_id=MZ, optionally restrict manager to a specific province (e.g. Maputo, Sofala).';

-- ---------- 2. CREATE VERTICAL TABLES ----------

-- 2a. APE visits (Agentes Polivalentes Elementares)
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
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ape_visits_country  ON public.ape_visits(country_id);
CREATE INDEX IF NOT EXISTS idx_ape_visits_province ON public.ape_visits(province);
CREATE INDEX IF NOT EXISTS idx_ape_visits_date     ON public.ape_visits(visit_date DESC);
ALTER TABLE public.ape_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ape public read" ON public.ape_visits FOR SELECT TO authenticated USING (true);
CREATE POLICY "ape insert own"  ON public.ape_visits FOR INSERT TO authenticated WITH CHECK (ape_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
CREATE POLICY "ape update own"  ON public.ape_visits FOR UPDATE TO authenticated USING (ape_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.ape_visits TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ape_visits TO authenticated;

-- 2b. TB DOT records (Directly Observed Treatment)
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
  daily_meds      JSONB, -- [{day:1,med:'RHZE',taken:true,observed_at:'...',method:'video'|'in_person'}]
  adherence_pct   NUMERIC(5,2) DEFAULT 0,
  last_taken_at   TIMESTAMPTZ,
  missed_doses    INT DEFAULT 0,
  abandonment_risk TEXT CHECK (abandonment_risk IN ('low','medium','high')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tb_dot_country ON public.tb_dot_records(country_id);
CREATE INDEX IF NOT EXISTS idx_tb_dot_patient ON public.tb_dot_records(patient_user_id);
ALTER TABLE public.tb_dot_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tb dot read"   ON public.tb_dot_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "tb dot insert" ON public.tb_dot_records FOR INSERT TO authenticated WITH CHECK (observer_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
CREATE POLICY "tb dot update" ON public.tb_dot_records FOR UPDATE TO authenticated USING (observer_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.tb_dot_records TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tb_dot_records TO authenticated;

-- 2c. ART adherence logs (HIV ARV adherence)
CREATE TABLE IF NOT EXISTS public.art_adherence_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  country_id      TEXT REFERENCES public.countries(id) DEFAULT 'MZ',
  province        TEXT,
  art_regimen     TEXT, -- TDF+3TC+DTG, etc.
  art_start_date  DATE,
  last_viral_load NUMERIC(10,2),
  last_viral_load_date DATE,
  last_cd4_count  INT,
  last_cd4_date   DATE,
  adherence_pct   NUMERIC(5,2) DEFAULT 0,
  refill_due_date DATE,
  last_refill_date DATE,
  missed_doses_30d INT DEFAULT 0,
  support_group_id UUID,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_art_country ON public.art_adherence_logs(country_id);
CREATE INDEX IF NOT EXISTS idx_art_patient ON public.art_adherence_logs(patient_user_id);
ALTER TABLE public.art_adherence_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "art read"   ON public.art_adherence_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "art insert" ON public.art_adherence_logs FOR INSERT TO authenticated WITH CHECK (patient_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
CREATE POLICY "art update" ON public.art_adherence_logs FOR UPDATE TO authenticated USING (patient_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.art_adherence_logs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.art_adherence_logs TO authenticated;

-- 2d. Malaria cases
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
  treatment_given TEXT, -- Coartem, ASAQ, injectable artesunate
  treatment_start DATE,
  treatment_completed BOOLEAN DEFAULT false,
  referral_to     TEXT,
  outcome         TEXT CHECK (outcome IN ('recovering','cured','referred','death','lost')),
  gps_lat         DOUBLE PRECISION,
  gps_lng         DOUBLE PRECISION,
  reported_to_pnm BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_malaria_country ON public.malaria_cases(country_id);
CREATE INDEX IF NOT EXISTS idx_malaria_province ON public.malaria_cases(province);
CREATE INDEX IF NOT EXISTS idx_malaria_date ON public.malaria_cases(case_date DESC);
ALTER TABLE public.malaria_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "malaria read"   ON public.malaria_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "malaria insert" ON public.malaria_cases FOR INSERT TO authenticated WITH CHECK (ape_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
CREATE POLICY "malaria update" ON public.malaria_cases FOR UPDATE TO authenticated USING (ape_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.malaria_cases TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.malaria_cases TO authenticated;

-- 2e. Maternal profiles
CREATE TABLE IF NOT EXISTS public.maternal_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  country_id      TEXT REFERENCES public.countries(id) DEFAULT 'MZ',
  province        TEXT,
  district        TEXT,
  lmp_date        DATE, -- Last Menstrual Period
  edd_date        DATE, -- Estimated Due Date
  gravida         INT,  -- number of pregnancies
  para            INT,  -- number of births
  blood_type      TEXT,
  risk_level      TEXT CHECK (risk_level IN ('low','medium','high')),
  anc_visits_done INT DEFAULT 0,
  anc_visits_due  JSONB, -- [{visit:1,due_date:'...',done:true}, ...]
  partner_name    TEXT,
  partner_phone   TEXT,
  preferred_facility TEXT,
  last_bp_systolic INT,
  last_bp_diastolic INT,
  last_weight_kg  NUMERIC(5,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_maternal_country ON public.maternal_profiles(country_id);
CREATE INDEX IF NOT EXISTS idx_maternal_edd ON public.maternal_profiles(edd_date);
ALTER TABLE public.maternal_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maternal read"   ON public.maternal_profiles FOR SELECT TO authenticated USING (patient_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
CREATE POLICY "maternal insert" ON public.maternal_profiles FOR INSERT TO authenticated WITH CHECK (patient_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'country_manager'));
CREATE POLICY "maternal update" ON public.maternal_profiles FOR UPDATE TO authenticated USING (patient_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.maternal_profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.maternal_profiles TO authenticated;

-- ---------- 3. MZ REGULATORY FRAMEWORKS ----------
INSERT INTO public.regulatory_frameworks (country_id, region_group, name, authority, description, framework_url, key_requirements, mandatory_for, tier_required, effective_date, next_review_date)
VALUES
  ('MZ','PALOP','Registo Sanitário MISAU','MISAU','Licença obrigatória para todo estabelecimento de saúde em Moçambique. Emitida pelo Departamento de Farmácia do MISAU.','https://www.misau.gov.mz',
   '["Licença de operação MISAU","Inspeção sanitária anual","Responsável técnico farmacêutico","Plano de gestão de resíduos","Sistema de farmacovigilância"]'::jsonb,
   ARRAY['pharmacy','hospital','clinic','lab'],'platinum','1975-06-25'::date,'2026-06-25'::date),
  ('MZ','PALOP','CMED — Conselho de Medicamentos e Estupefacientes','MISAU/CMED','Autoridade que regula o registo, importação e distribuição de medicamentos controlados em Moçambique.','https://www.misau.gov.mz/cmed',
   '["Licença CMED para medicamentos controlados","Registo de medicamentos","Relatório trimestral de movimentos","Sistema de rastreabilidade","Controlo de Schedule 1-4"]'::jsonb,
   ARRAY['pharmacy','hospital','lab'],'platinum','1992-12-31'::date,'2026-12-31'::date),
  ('MZ','PALOP','Ordem dos Médicos de Moçambique (OMM)','OMM','Registo profissional obrigatório para todos os médicos que exercem em Moçambique.','https://www.ordemdosmedicos.org.mz',
   '["Registo OMM vigente","Cédula profissional","Seguro de responsabilidade civil","Formação médica contínua (50h/ano)","Cumprimento do código de ética"]'::jsonb,
   ARRAY['doctor','clinic','hospital'],'gold','1998-04-08'::date,'2026-04-08'::date),
  ('MZ','PALOP','INS — Instituto Nacional de Saúde','INS','Sistema de vigilância epidemiológica e reporte obrigatório de doenças transmissíveis.','https://www.ins.gov.mz',
   '["Reporte semanal de casos","Notificação de surtos em 24h","Integração com DHIS2","Vigilância sentinel de malaria/HIV/TB","Boletim epidemiológico mensal"]'::jsonb,
   ARRAY['hospital','clinic','lab'],'platinum','1977-09-21'::date,'2026-09-21'::date),
  ('MZ','PALOP','INEM — Instituto Nacional de Emergência Médica','INEM','Regulação e coordenação de emergências médicas pré-hospitalares em Moçambique.','https://www.inem.gov.mz',
   '["Linha 117 activa","Plano de evacuação médica","Tripulação certificada","Ambulância equipada","Protocolo de triagem INEM"]'::jsonb,
   ARRAY['hospital','clinic'],'gold','1999-11-30'::date,'2026-11-30'::date),
  ('MZ','PALOP','INSS — Instituto Nacional de Segurança Social','INSS','Cobertura obrigatória de segurança social para profissionais de saúde.','https://www.inss.gov.mz',
   '["Registo INSS empregador","Contribuições mensais","Seguro acidentes de trabalho","Plano de pensões","Relatório anual NUIT"]'::jsonb,
   ARRAY['pharmacy','hospital','clinic','lab','insurance'],'silver','1989-08-19'::date,'2026-08-19'::date),
  ('MZ','PALOP','Lei 18/2014 — Lei da Saúde','Assembleia da República','Lei-quadro do Sistema Nacional de Saúde. Define princípios, organização e direitos dos utentes.','https://www.portaldogoverno.gov.mz',
   '["Direito à informação do utente","Consentimento informado","Confidencialidade médica","Queixa formal mecanismo","Direito a segunda opinião"]'::jsonb,
   ARRAY['pharmacy','hospital','clinic','lab','insurance','doctor'],'platinum','2014-08-18'::date,'2026-08-18'::date),
  ('MZ','PALOP','Política Farmacêutica Nacional 2017','MISAU','Política nacional para garantir acesso a medicamentos seguros, eficazes e de qualidade.','https://www.misau.gov.mz/pharma',
   '["Implementação da lista UME","Padrões de qualidade farmacêutica","Sistema de aprovisionamento","Uso racional de medicamentos","Farmacovigilância nacional"]'::jsonb,
   ARRAY['pharmacy','hospital','clinic','lab'],'gold','2017-03-15'::date,'2027-03-15'::date)
ON CONFLICT DO NOTHING;

-- ---------- 4. MZ-SPECIFIC MICRO-INSURANCE PRODUCTS ----------
INSERT INTO public.micro_insurance_products (country_id, name, code, description, premium_amount, premium_currency, coverage_amount, coverage_currency, payout_trigger_hours, payout_auto, active)
VALUES
  ('MZ','Seguro Maternidade MZ','SEGMAT_MZ','Cobertura completa de pré-natal (4+ consultas), parto e pós-parto. Inclui emergência obstétrica e evacuação INEM.',200,'MZN',50000,'MZN',1,false,true),
  ('MZ','Seguro TB Tratamento Completo','SEGTB_MZ','Cobertura de tratamento TB completo (6 meses DOT). Inclui exames e transporte para UCS.',150,'MZN',25000,'MZN',1,false,true),
  ('MZ','Seguro Malaria Familiar','SEGMAL_MZ','Cobertura familiar (5 pessoas) para tratamento de malaria. Inclui RDT, Coartem e consulta.',100,'MZN',10000,'MZN',1,true,true),
  ('MZ','Seguro HIV ARV Adherence','SEGHIV_MZ','Cobertura mensal de ARV, exames CD4/carga viral e consultas de adesão.',250,'MZN',30000,'MZN',1,false,true),
  ('MZ','MedCash Consulta SLA','SEGCASH_MZ','Reembolso automático se tempo de espera > 2h para consulta marcada. Pagamento via M-Pesa.',50,'MZN',500,'MZN',1,true,true),
  ('MZ','MedCash Farmácia SLA','SEGCASHF_MZ','Reembolso se entrega de farmácia > 90 min após prometido. Pagamento via M-Pesa.',30,'MZN',300,'MZN',1,true,true)
ON CONFLICT DO NOTHING;

-- ---------- 5. CREATE 10 PROVINCIAL MANAGERS ----------
-- Passwords: GestorMaputo2026, GestorBeira2026, ... GestorLichinga2026
-- Email pattern: gestor_<city>@medwalletmz.online

DO $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_city text;
  v_province text;
  v_password text;
  v_full_name text;
  v_provinces jsonb := '[
    {"city":"Maputo","province":"Maputo Cidade","email":"gestor_maputo@medwalletmz.online","pw":"GestorMaputo2026","name":"Gestor Maputo Cidade"},
    {"city":"Matola","province":"Maputo Província","email":"gestor_matola@medwalletmz.online","pw":"GestorMatola2026","name":"Gestor Matola"},
    {"city":"Beira","province":"Sofala","email":"gestor_beira@medwalletmz.online","pw":"GestorBeira2026","name":"Gestor Beira"},
    {"city":"Nampula","province":"Nampula","email":"gestor_nampula@medwalletmz.online","pw":"GestorNampula2026","name":"Gestor Nampula"},
    {"city":"Pemba","province":"Cabo Delgado","email":"gestor_pemba@medwalletmz.online","pw":"GestorPemba2026","name":"Gestor Pemba"},
    {"city":"Quelimane","province":"Zambézia","email":"gestor_quelimane@medwalletmz.online","pw":"GestorQuelimane2026","name":"Gestor Quelimane"},
    {"city":"Tete","province":"Tete","email":"gestor_tete@medwalletmz.online","pw":"GestorTete2026","name":"Gestor Tete"},
    {"city":"Chimoio","province":"Manica","email":"gestor_chimoio@medwalletmz.online","pw":"GestorChimoio2026","name":"Gestor Chimoio"},
    {"city":"Xai-Xai","province":"Gaza","email":"gestor_xaixai@medwalletmz.online","pw":"GestorXaiXai2026","name":"Gestor Xai-Xai"},
    {"city":"Inhambane","province":"Inhambane","email":"gestor_inhambane@medwalletmz.online","pw":"GestorInhambane2026","name":"Gestor Inhambane"},
    {"city":"Lichinga","province":"Niassa","email":"gestor_lichinga@medwalletmz.online","pw":"GestorLichinga2026","name":"Gestor Lichinga"}
  ]'::jsonb;
  v_rec jsonb;
BEGIN
  FOR v_rec IN SELECT * FROM jsonb_array_elements(v_provinces)
  LOOP
    v_email    := v_rec->>'email';
    v_city     := v_rec->>'city';
    v_province := v_rec->>'province';
    v_password := v_rec->>'pw';
    v_full_name:= v_rec->>'name';

    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    IF v_user_id IS NULL THEN
      INSERT INTO auth.users (
        instance_id, id, aud, role, email,
        encrypted_password, email_confirmed_at,
        created_at, updated_at, last_sign_in_at,
        raw_app_meta_data, raw_user_meta_data,
        phone, phone_change_token, email_change, email_change_token, email_change_confirm_status,
        recovery_token, confirmation_token, confirmation_sent_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        v_email,
        crypt(v_password, gen_salt('bf', 10)),
        now(), now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', v_full_name, 'country_id','MZ','role','country_manager','province', v_province),
        '', '', '', '', 0, '', '', now()
      )
      RETURNING id INTO v_user_id;
    END IF;

    -- Profile with default_city set to provincial capital
    INSERT INTO public.profiles (user_id, full_name, phone, default_city, country_id, avatar_url)
    VALUES (v_user_id, v_full_name, '+258840000000', v_city, 'MZ',
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200')
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      default_city = EXCLUDED.default_city,
      country_id = 'MZ';

    -- country_manager role scoped to MZ
    INSERT INTO public.user_roles (user_id, role, country_id)
    VALUES (v_user_id, 'country_manager', 'MZ')
    ON CONFLICT (user_id, role, country_id) DO NOTHING;

    -- Country management with province scope
    INSERT INTO public.country_management (user_id, country_id, province_scope, city_scope, permissions)
    VALUES (v_user_id, 'MZ', v_province, v_city,
      '{"can_approve_doctors":true,"can_view_revenue":true,"can_manage_stores":true,"can_manage_clinics":true,"can_manage_labs":true,"can_view_compliance":true,"can_issue_insurance":true,"can_view_ape_data":true,"can_manage_tb_dot":true,"can_manage_art":true,"can_manage_malaria":true,"can_manage_maternal":true}'::jsonb)
    ON CONFLICT (user_id, country_id) DO UPDATE SET
      province_scope = EXCLUDED.province_scope,
      city_scope = EXCLUDED.city_scope,
      permissions = EXCLUDED.permissions;
  END LOOP;
END $$;

SELECT 'MZ Plan Part 1 complete — 5 vertical tables + 8 frameworks + 6 micro-insurance + 11 provincial managers' as result;
