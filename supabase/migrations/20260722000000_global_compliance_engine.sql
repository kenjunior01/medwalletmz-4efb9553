-- ============================================================
-- MedWallet Global · Compliance Engine v1.0
-- Migration: 20260722000000_global_compliance_engine.sql
-- Cria: regulatory_frameworks, partner_certifications,
--       compliance_documents, compliance_audit_trail,
--       micro_insurance_products, micro_insurance_policies,
--       micro_insurance_claims
-- ============================================================

-- ============================================================
-- 1. REGULATORY FRAMEWORKS (catálogo por país/região)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.regulatory_frameworks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id      TEXT NOT NULL, -- ISO 3166-1 alpha-2 (MZ, BR, NG, ID, AE, ...)
  region_group    TEXT NOT NULL, -- 'PALOP' | 'SUB_SAHARAN_AFRICA' | 'LATAM' | 'SEA' | 'MENA' | 'EUROPE'
  framework_code  TEXT NOT NULL, -- 'ANVISA' | 'SADC_HARMONIZED' | 'GDPR' | 'PDPA_ID' | 'NHFAP_UAE' | 'HIPAA'
  framework_name  TEXT NOT NULL,
  authority       TEXT NOT NULL, -- ex: "Agência Nacional de Vigilância Sanitária"
  authority_url   TEXT,
  description     TEXT,
  compliance_score INTEGER DEFAULT 0 CHECK (compliance_score BETWEEN 0 AND 100),
  mandatory       BOOLEAN DEFAULT TRUE,
  last_audit_date DATE,
  next_audit_date DATE,
  requirements    JSONB DEFAULT '{}'::jsonb,
  -- requirements: array de {code, label, status: 'compliant'|'partial'|'missing', evidence_url}
  penalties       JSONB DEFAULT '{}'::jsonb,
  -- penalties: {max_fine_usd, license_revocation: bool, criminal_liability: bool}
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (country_id, framework_code)
);

CREATE INDEX IF NOT EXISTS idx_reg_frameworks_country ON public.regulatory_frameworks(country_id);
CREATE INDEX IF NOT EXISTS idx_reg_frameworks_region ON public.regulatory_frameworks(region_group);

-- ============================================================
-- 2. PARTNER CERTIFICATIONS (Farmácias/Clínicas/Labs/Doctors)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.partner_certifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_type        TEXT NOT NULL CHECK (partner_type IN ('store','clinic','hospital','lab','doctor','veterinary','insurance')),
  country_id          TEXT NOT NULL,
  certification_tier  TEXT NOT NULL CHECK (certification_tier IN ('bronze','silver','gold','platinum')),
  -- Tier logic:
  --   bronze   = registado + verificado
  --   silver   = + 50 transações + 4.0+ rating
  --   gold     = + 500 transações + 4.5+ rating + SLA 95%
  --   platinum = + 5000 transações + 4.8+ rating + SLA 99% + ISO 9001
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','suspended','revoked')),
  verified_at         TIMESTAMPTZ,
  verified_by         UUID REFERENCES auth.users(id),
  expires_at          DATE,
  total_transactions  INTEGER DEFAULT 0,
  avg_rating          NUMERIC(2,2) DEFAULT 0,
  sla_compliance      NUMERIC(5,2) DEFAULT 0, -- percent
  iso_certified       BOOLEAN DEFAULT FALSE,
  iso_certificate_no  TEXT,
  jci_accredited      BOOLEAN DEFAULT FALSE, -- Joint Commission International
  metadata            JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_cert_country ON public.partner_certifications(country_id);
CREATE INDEX IF NOT EXISTS idx_partner_cert_tier   ON public.partner_certifications(certification_tier);
CREATE INDEX IF NOT EXISTS idx_partner_cert_status ON public.partner_certifications(status);

-- ============================================================
-- 3. COMPLIANCE DOCUMENTS (Cofre de licenças com expiração)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.compliance_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  country_id        TEXT NOT NULL,
  document_type     TEXT NOT NULL CHECK (document_type IN (
    'pharmacy_license','medical_license','lab_license','veterinary_license',
    'insurance_license','tax_certificate','fire_safety','health_permit',
    'drug_control_permit','radiation_safety','iso_certificate','data_protection'
  )),
  document_number   TEXT,
  issuing_authority TEXT NOT NULL,
  issue_date        DATE NOT NULL,
  expiry_date       DATE NOT NULL,
  file_url          TEXT,
  file_hash         TEXT, -- SHA-256 do conteúdo para integridade
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected','expired')),
  verified_by       UUID REFERENCES auth.users(id),
  verified_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comp_doc_expiry  ON public.compliance_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_comp_doc_partner ON public.compliance_documents(partner_user_id);
CREATE INDEX IF NOT EXISTS idx_comp_doc_status  ON public.compliance_documents(verification_status);

-- ============================================================
-- 4. COMPLIANCE AUDIT TRAIL (log imutável com hash chain)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.compliance_audit_trail (
  id              BIGSERIAL PRIMARY KEY,
  event_type      TEXT NOT NULL CHECK (event_type IN (
    'certification_granted','certification_revoked','tier_upgraded','tier_downgraded',
    'document_uploaded','document_verified','document_rejected','document_expired',
    'framework_compliance_changed','insurance_policy_issued','insurance_claim_paid',
    'data_accessed','data_exported','consent_changed','breach_detected'
  )),
  actor_user_id   UUID REFERENCES auth.users(id),
  partner_user_id UUID REFERENCES auth.users(id),
  country_id      TEXT,
  event_metadata  JSONB DEFAULT '{}'::jsonb,
  ip_address      INET,
  user_agent      TEXT,
  previous_hash   TEXT, -- hash da linha anterior (blockchain-style)
  event_hash      TEXT NOT NULL, -- SHA-256(id || event_type || actor || partner || country || metadata::text || previous_hash)
  created_at      TIMESTAMPTZ DEFAULT now(),
  -- Garantir imutabilidade: nunca UPDATE nem DELETE
  CONSTRAINT no_update CHECK (true),
  CONSTRAINT no_delete CHECK (true)
);

CREATE INDEX IF NOT EXISTS idx_audit_country ON public.compliance_audit_trail(country_id);
CREATE INDEX IF NOT EXISTS idx_audit_partner ON public.compliance_audit_trail(partner_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_event   ON public.compliance_audit_trail(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.compliance_audit_trail(created_at DESC);

-- Trigger: calcular hash automaticamente em INSERT
CREATE OR REPLACE FUNCTION public.fn_compute_audit_hash()
RETURNS TRIGGER AS $$
DECLARE
  last_hash TEXT;
BEGIN
  SELECT event_hash INTO last_hash
  FROM public.compliance_audit_trail
  ORDER BY id DESC
  LIMIT 1;

  NEW.previous_hash := COALESCE(last_hash, '0'.repeat(64));
  NEW.event_hash := encode(
    digest(
      COALESCE(NEW.id::text, '') || '|' ||
      NEW.event_type || '|' ||
      COALESCE(NEW.actor_user_id::text, '') || '|' ||
      COALESCE(NEW.partner_user_id::text, '') || '|' ||
      COALESCE(NEW.country_id, '') || '|' ||
      COALESCE(NEW.event_metadata::text, '{}') || '|' ||
      COALESCE(NEW.previous_hash, ''),
      'sha256'
    ),
    'hex'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_compute_audit_hash ON public.compliance_audit_trail;
CREATE TRIGGER trg_compute_audit_hash
  BEFORE INSERT ON public.compliance_audit_trail
  FOR EACH ROW EXECUTE FUNCTION public.fn_compute_audit_hash();

-- Bloquear UPDATE e DELETE na audit trail
CREATE OR REPLACE FUNCTION public.fn_block_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'compliance_audit_trail is append-only. UPDATE/DELETE not allowed.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_audit_update ON public.compliance_audit_trail;
CREATE TRIGGER trg_block_audit_update
  BEFORE UPDATE ON public.compliance_audit_trail
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_audit_modification();

DROP TRIGGER IF EXISTS trg_block_audit_delete ON public.compliance_audit_trail;
CREATE TRIGGER trg_block_audit_delete
  BEFORE DELETE ON public.compliance_audit_trail
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_audit_modification();

-- ============================================================
-- 5. MICRO-INSURANCE PRODUCTS (seguros paramétricos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.micro_insurance_products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id        TEXT NOT NULL,
  product_code      TEXT NOT NULL,
  product_name      TEXT NOT NULL,
  insurer_name      TEXT NOT NULL,
  insurer_license   TEXT,
  premium_amount    NUMERIC(12,2) NOT NULL,
  premium_currency  TEXT NOT NULL DEFAULT 'USD',
  coverage_amount   NUMERIC(12,2) NOT NULL,
  -- Parametric triggers (pagamento automático se condição for satisfeita)
  trigger_type      TEXT NOT NULL CHECK (trigger_type IN (
    'consultation_no_show','delivery_delay','pharmacy_stockout',
    'appointment_cancelled','telemedicine_downtime','cold_chain_breach'
  )),
  trigger_threshold JSONB DEFAULT '{}'::jsonb,
  -- ex: {"delay_minutes": 30} para delivery_delay
  waiting_period_hours INTEGER DEFAULT 24,
  payout_auto       BOOLEAN DEFAULT TRUE, -- payout automático sem necessidade de claim manual
  active            BOOLEAN DEFAULT TRUE,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (country_id, product_code)
);

CREATE INDEX IF NOT EXISTS idx_ins_prod_country ON public.micro_insurance_products(country_id);
CREATE INDEX IF NOT EXISTS idx_ins_prod_trigger ON public.micro_insurance_products(trigger_type);

-- ============================================================
-- 6. MICRO-INSURANCE POLICIES (apólices ativas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.micro_insurance_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES public.micro_insurance_products(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_id      TEXT NOT NULL,
  policy_number   TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled','claimed')),
  start_date      TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date        TIMESTAMPTZ,
  premium_paid    NUMERIC(12,2) NOT NULL DEFAULT 0,
  coverage_used   NUMERIC(12,2) NOT NULL DEFAULT 0,
  payout_count    INTEGER DEFAULT 0,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ins_pol_user    ON public.micro_insurance_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_ins_pol_product ON public.micro_insurance_policies(product_id);
CREATE INDEX IF NOT EXISTS idx_ins_pol_status  ON public.micro_insurance_policies(status);

-- ============================================================
-- 7. MICRO-INSURANCE CLAIMS (sinistros)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.micro_insurance_claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id       UUID NOT NULL REFERENCES public.micro_insurance_policies(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_id      TEXT NOT NULL,
  claim_type      TEXT NOT NULL,
  trigger_data    JSONB DEFAULT '{}'::jsonb,
  amount_requested NUMERIC(12,2) NOT NULL,
  amount_paid     NUMERIC(12,2),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','auto_approved','approved','rejected','paid')),
  payout_tx_id    UUID, -- referencia a transação na carteira
  approved_by     UUID REFERENCES auth.users(id),
  approved_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ins_claim_policy ON public.micro_insurance_claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_ins_claim_status ON public.micro_insurance_claims(status);

-- ============================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.regulatory_frameworks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_certifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audit_trail    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_insurance_products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_insurance_policies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_insurance_claims    ENABLE ROW LEVEL SECURITY;

-- Helper: verificar se user é admin global ou country_manager do país indicado
CREATE OR REPLACE FUNCTION public.fn_user_can_manage_country(p_country_id TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'country_manager'
      AND (ur.country_id = p_country_id OR ur.metadata->>'managed_countries' LIKE '%' || p_country_id || '%')
  );
$$;

-- Helper: obter país gerido pelo country_manager atual
CREATE OR REPLACE FUNCTION public.fn_my_managed_country()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT country_id FROM public.user_roles
  WHERE user_id = auth.uid() AND role = 'country_manager'
  LIMIT 1;
$$;

-- regulatory_frameworks: leitura pública para países que o user pode gerir
DROP POLICY IF EXISTS "rf_select_managed" ON public.regulatory_frameworks;
CREATE POLICY "rf_select_managed" ON public.regulatory_frameworks
  FOR SELECT USING (
    public.fn_user_can_manage_country(country_id) OR country_id = public.fn_my_managed_country()
  );

DROP POLICY IF EXISTS "rf_modify_admin" ON public.regulatory_frameworks;
CREATE POLICY "rf_modify_admin" ON public.regulatory_frameworks
  FOR ALL USING (public.fn_user_can_manage_country(country_id))
  WITH CHECK (public.fn_user_can_manage_country(country_id));

-- partner_certifications: gestores vêem do seu país; parceiro vê as suas
DROP POLICY IF EXISTS "pc_select" ON public.partner_certifications;
CREATE POLICY "pc_select" ON public.partner_certifications
  FOR SELECT USING (
    partner_user_id = auth.uid() OR
    public.fn_user_can_manage_country(country_id)
  );

DROP POLICY IF EXISTS "pc_modify" ON public.partner_certifications;
CREATE POLICY "pc_modify" ON public.partner_certifications
  FOR ALL USING (public.fn_user_can_manage_country(country_id))
  WITH CHECK (public.fn_user_can_manage_country(country_id));

-- compliance_documents: parceiro vê os seus; gestores vêem do país
DROP POLICY IF EXISTS "cd_select" ON public.compliance_documents;
CREATE POLICY "cd_select" ON public.compliance_documents
  FOR SELECT USING (
    partner_user_id = auth.uid() OR
    public.fn_user_can_manage_country(country_id)
  );

DROP POLICY IF EXISTS "cd_modify" ON public.compliance_documents;
CREATE POLICY "cd_modify" ON public.compliance_documents
  FOR ALL USING (
    partner_user_id = auth.uid() OR
    public.fn_user_can_manage_country(country_id)
  )
  WITH CHECK (
    partner_user_id = auth.uid() OR
    public.fn_user_can_manage_country(country_id)
  );

-- compliance_audit_trail: leitura para gestores do país; inserção por qualquer autenticado
DROP POLICY IF EXISTS "cat_select" ON public.compliance_audit_trail;
CREATE POLICY "cat_select" ON public.compliance_audit_trail
  FOR SELECT USING (
    public.fn_user_can_manage_country(country_id) OR
    actor_user_id = auth.uid() OR
    partner_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "cat_insert" ON public.compliance_audit_trail;
CREATE POLICY "cat_insert" ON public.compliance_audit_trail
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- micro_insurance_products: gestores gerem do seu país
DROP POLICY IF EXISTS "mip_select" ON public.micro_insurance_products;
CREATE POLICY "mip_select" ON public.micro_insurance_products
  FOR SELECT USING (active = TRUE OR public.fn_user_can_manage_country(country_id));

DROP POLICY IF EXISTS "mip_modify" ON public.micro_insurance_products;
CREATE POLICY "mip_modify" ON public.micro_insurance_products
  FOR ALL USING (public.fn_user_can_manage_country(country_id))
  WITH CHECK (public.fn_user_can_manage_country(country_id));

-- micro_insurance_policies: user vê as suas; gestores vêem do país
DROP POLICY IF EXISTS "mipo_select" ON public.micro_insurance_policies;
CREATE POLICY "mipo_select" ON public.micro_insurance_policies
  FOR SELECT USING (
    user_id = auth.uid() OR public.fn_user_can_manage_country(country_id)
  );

DROP POLICY IF EXISTS "mipo_insert" ON public.micro_insurance_policies;
CREATE POLICY "mipo_insert" ON public.micro_insurance_policies
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- micro_insurance_claims: user vê os seus; gestores vêem do país
DROP POLICY IF EXISTS "mic_select" ON public.micro_insurance_claims;
CREATE POLICY "mic_select" ON public.micro_insurance_claims
  FOR SELECT USING (
    user_id = auth.uid() OR public.fn_user_can_manage_country(country_id)
  );

DROP POLICY IF EXISTS "mic_insert" ON public.micro_insurance_claims;
CREATE POLICY "mic_insert" ON public.micro_insurance_claims
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "mic_update" ON public.micro_insurance_claims;
CREATE POLICY "mic_update" ON public.micro_insurance_claims
  FOR UPDATE USING (public.fn_user_can_manage_country(country_id));

-- ============================================================
-- 9. SEED INITIAL REGULATORY FRAMEWORKS (5 regiões-alvo)
-- ============================================================
INSERT INTO public.regulatory_frameworks
  (country_id, region_group, framework_code, framework_name, authority, authority_url, description, mandatory, requirements, penalties)
VALUES
  -- PALOP
  ('MZ','PALOP','SADC_HARMONIZED','SADC Harmonised Medicines Registration','Medicines Control Authority of Mozambique','https://www.misau.gov.mz','Framework harmonizado da SADC para registo de medicamentos.',TRUE,
    '{"items":[{"code":"GMP","label":"Good Manufacturing Practice","status":"compliant"},{"code":"GDP","label":"Good Distribution Practice","status":"partial"}]}',
    '{"max_fine_usd":50000,"license_revocation":true}'),
  ('AO','PALOP','INFARMED_AO','Autoridade Nacional de Medicamentos e Equipamentos de Saúde','INFARMED Angola','https://www.infarmed.ao','Reguladora angolana para medicamentos e dispositivos médicos.',TRUE,
    '{"items":[{"code":"AUTH","label":"Autorização de Operação","status":"compliant"}]}',
    '{"max_fine_usd":75000,"license_revocation":true}'),
  ('CV','PALOP','ARFA_CV','Agência de Regulação e Supervisão de Produtos Farmacêuticos e Alimentares','ARFA Cabo Verde','https://www.arfa.gov.cv','Regula produtos farmacêuticos em Cabo Verde.',TRUE,
    '{"items":[{"code":"REG","label":"Registo Sanitário","status":"missing"}]}',
    '{"max_fine_usd":15000}'),
  -- Sub-Saariana
  ('NG','SUB_SAHARAN_AFRICA','NAFDAC','National Agency for Food and Drug Administration and Control','NAFDAC Nigeria','https://www.nafdac.gov.ng','Agência nigeriana para alimentos e medicamentos.',TRUE,
    '{"items":[{"code":"NAFDAC_REG","label":"NAFDAC Registration","status":"partial"},{"code":"GMP_NG","label":"GMP Certificate","status":"missing"}]}',
    '{"max_fine_usd":200000,"license_revocation":true,"criminal_liability":true}'),
  ('KE','SUB_SAHARAN_AFRICA','PPB_KE','Pharmacy and Poisons Board Kenya','PPB Kenya','https://www.pharmacyboard.go.ke','Regula farmácias e medicamentos no Quénia.',TRUE,
    '{"items":[{"code":"PPB_LIC","label":"PPB License","status":"compliant"},{"code":"KEPHC","label":"Kenya Quality Health Certification","status":"partial"}]}',
    '{"max_fine_usd":30000}'),
  ('GH','SUB_SAHARAN_AFRICA','FDA_GH','Food and Drugs Authority Ghana','FDA Ghana','https://www.fdaghana.gov.gh','Autoridade de alimentos e medicamentos do Gana.',TRUE,
    '{"items":[{"code":"FDA_REG","label":"FDA Registration","status":"compliant"}]}',
    '{"max_fine_usd":25000}'),
  -- LATAM
  ('BR','LATAM','ANVISA','Agência Nacional de Vigilância Sanitária','ANVISA Brasil','https://www.gov.br/anvisa','Regula produtos sujeitos à vigilância sanitária no Brasil.',TRUE,
    '{"items":[{"code":"ANVISA_REG","label":"Registro ANVISA","status":"compliant"},{"code":"LGPD","label":"Lei Geral de Proteção de Dados","status":"compliant"},{"code":"CFE","label":"Certificado de Boas Práticas","status":"partial"}]}',
    '{"max_fine_usd":50000000,"license_revocation":true,"criminal_liability":true}'),
  ('MX','LATAM','COFEPRIS','Comisión Federal para la Protección contra Riesgos Sanitarios','COFEPRIS México','https://www.gob.mx/cofepris','Reguladora sanitária mexicana.',TRUE,
    '{"items":[{"code":"COFEPRIS_REG","label":"Registro COFEPRIS","status":"missing"},{"code":"LFPDPPP","label":"Lei de Proteção de Dados MX","status":"partial"}]}',
    '{"max_fine_usd":1500000}'),
  ('CO','LATAM','INVIMA','Instituto Nacional de Vigilancia de Medicamentos y Alimentos','INVIMA Colombia','https://www.invima.gov.co','Reguladora de medicamentos e alimentos na Colômbia.',TRUE,
    '{"items":[{"code":"INVIMA_REG","label":"Registro INVIMA","status":"compliant"},{"code":"HABEAS_DATA","label":"Lei 1581 Habeas Data","status":"compliant"}]}',
    '{"max_fine_usd":500000}'),
  -- SEA
  ('ID','SEA','BPOM_ID','Badan Pengawas Obat dan Makanan','BPOM Indonesia','https://www.bpom.go.id','Agência indonésia de alimentos e medicamentos.',TRUE,
    '{"items":[{"code":"BPOM_REG","label":"Nomor Izin Edar BPOM","status":"partial"},{"code":"PDP_LAW","label":"Lei de Proteção de Dados Pessoais (PDP)","status":"missing"}]}',
    '{"max_fine_usd":1000000,"license_revocation":true}'),
  ('PH','SEA','FDA_PH','Food and Drug Administration Philippines','FDA Philippines','https://www.fda.gov.ph','Reguladora filipina.',TRUE,
    '{"items":[{"code":"LTO","label":"License to Operate","status":"compliant"},{"code":"DPA","label":"Data Privacy Act","status":"partial"}]}',
    '{"max_fine_usd":50000}'),
  ('VN','SEA','MOH_VN','Bộ Y Tế Vietnam Ministry of Health','MOH Vietnam','https://moh.gov.vn','Ministério da Saúde do Vietnã.',TRUE,
    '{"items":[{"code":"MOH_REG","label":"MOH Registration","status":"missing"},{"code":"PDPD","label":"Decree on Personal Data Protection","status":"missing"}]}',
    '{"max_fine_usd":30000}'),
  -- MENA
  ('AE','MENA','NHFAP_AE','National Health Facility Assessment Program','MOHAP UAE','https://mohap.gov.ae','Programa de avaliação de estabelecimentos de saúde dos EAU.',TRUE,
    '{"items":[{"code":"MOHAP_LIC","label":"MOHAP License","status":"compliant"},{"code":"DHA","label":"Dubai Health Authority Approval","status":"compliant"},{"code":"UAE_PDPL","label":"UAE Personal Data Protection Law","status":"partial"}]}',
    '{"max_fine_usd":270000,"license_revocation":true}'),
  ('SA','MENA','SFDA_SA','Saudi Food and Drug Authority','SFDA Saudi Arabia','https://www.sfda.gov.sa','Autoridade saudita para alimentos e medicamentos.',TRUE,
    '{"items":[{"code":"SFDA_REG","label":"SFDA Registration","status":"compliant"},{"code":"PDPL_SA","label":"Personal Data Protection Law","status":"compliant"}]}',
    '{"max_fine_usd":5000000,"criminal_liability":true}'),
  ('QA','MENA','MOPH_QA','Ministry of Public Health Qatar','MOPH Qatar','https://www.moph.gov.qa','Ministério da Saúde do Catar.',TRUE,
    '{"items":[{"code":"MOPH_LIC","label":"MOPH License","status":"compliant"},{"code":"PDPL_QA","label":"Data Privacy Law","status":"partial"}]}',
    '{"max_fine_usd":500000}'),
  -- Europa (portugal como base)
  ('PT','EUROPE','INFARMED_PT','Autoridade Nacional do Medicamento e Produtos de Saúde','INFARMED Portugal','https://www.infarmed.pt','Reguladora portuguesa.',TRUE,
    '{"items":[{"code":"INFARMED_LIC","label":"Licença INFARMED","status":"compliant"},{"code":"GDPR","label":"RGPD/GDPR","status":"compliant"}]}',
    '{"max_fine_usd":20000000,"criminal_liability":true}'),
  ('ES','EUROPE','AEMES','Agencia Española de Medicamentos y Productos Sanitarios','AEMPS Espanha','https://www.aemps.gob.es','Reguladora espanhola.',TRUE,
    '{"items":[{"code":"AEMPS_LIC","label":"Licencia AEMPS","status":"partial"},{"code":"GDPR","label":"RGPD","status":"compliant"}]}',
    '{"max_fine_usd":20000000}')
ON CONFLICT (country_id, framework_code) DO NOTHING;

-- ============================================================
-- 10. SEED MICRO-INSURANCE PRODUCTS (1 por país)
-- ============================================================
INSERT INTO public.micro_insurance_products
  (country_id, product_code, product_name, insurer_name, insurer_license, premium_amount, premium_currency, coverage_amount, trigger_type, trigger_threshold, waiting_period_hours, payout_auto, metadata)
VALUES
  ('MZ','MZ_CONSULT_GUARD','MedWallet Consulta Guard','Vida Companhia de Seguros','ICMC-001-2026',25.00,'USD',100.00,'consultation_no_show','{"delay_minutes":15}'::jsonb,1,TRUE,'{"description":"Reembolso automático se médico não comparecer em 15min"}'::jsonb),
  ('BR','BR_DELIVERY_SHIELD','MedWallet Entrega Segura','Porto Seguro Saúde','SUSEP-002-2026',5.00,'BRL',50.00,'delivery_delay','{"delay_minutes":30}'::jsonb,0,TRUE,'{"description":"Reembolso se entrega atrasar mais de 30min"}'::jsonb),
  ('NG','NG_STOCKOUT_COVER','MedWallet Stockout Cover','AXA Mansard','NAICOM-003-2026',200.00,'NGN',2000.00,'pharmacy_stockout','{"alternatives_offered":false}'::jsonb,2,TRUE,'{"description":"Pagamento se farmácia não tiver o medicamento prescrito"}'::jsonb),
  ('ID','ID_TELEMED_GUARD','MedWallet Telemed Guard','Allianz Indonesia','OJK-004-2026',3000.00,'IDR',50000.00,'telemedicine_downtime','{"downtime_minutes":60}'::jsonb,1,TRUE,'{"description":"Pagamento se plataforma telemedicina cair durante consulta"}'::jsonb),
  ('AE','AE_APPT_PROTECT','MedWallet Appointment Protect','Daman Health Insurance','DHA-005-2026',10.00,'AED',150.00,'appointment_cancelled','{"hours_notice":2}'::jsonb,1,TRUE,'{"description":"Reembolso se clínica cancelar com menos de 2h de aviso"}'::jsonb),
  ('PT','PT_COLD_CHAIN','MedWallet Cold Chain Guard','Fidelidade Saúde','ASP-006-2026',2.00,'EUR',30.00,'cold_chain_breach','{"temp_celsius_max":8,"duration_minutes":15}'::jsonb,1,TRUE,'{"description":"Pagamento se vacina/insulina sair da cadeia de frio"}'::jsonb)
ON CONFLICT (country_id, product_code) DO NOTHING;

-- ============================================================
-- 11. VIEWS PARA DASHBOARDS
-- ============================================================
CREATE OR REPLACE VIEW public.v_compliance_overview AS
SELECT
  c.id AS country_id,
  c.name AS country_name,
  COUNT(DISTINCT rf.id) AS total_frameworks,
  COUNT(DISTINCT CASE WHEN rf.compliance_score >= 80 THEN rf.id END) AS compliant_frameworks,
  COALESCE(AVG(rf.compliance_score), 0)::int AS avg_compliance_score,
  COUNT(DISTINCT pc.id) AS total_partners_certified,
  COUNT(DISTINCT CASE WHEN pc.certification_tier = 'platinum' THEN pc.id END) AS platinum_partners,
  COUNT(DISTINCT CASE WHEN pc.certification_tier = 'gold' THEN pc.id END) AS gold_partners,
  COUNT(DISTINCT CASE WHEN pc.certification_tier = 'silver' THEN pc.id END) AS silver_partners,
  COUNT(DISTINCT CASE WHEN pc.certification_tier = 'bronze' THEN pc.id END) AS bronze_partners,
  COUNT(DISTINCT CASE WHEN pc.status = 'verified' THEN pc.id END) AS verified_partners,
  COUNT(DISTINCT CASE WHEN pc.status = 'suspended' THEN pc.id END) AS suspended_partners,
  COUNT(DISTINCT cd.id) AS total_documents,
  COUNT(DISTINCT CASE WHEN cd.verification_status = 'expired' OR cd.expiry_date < now()::date THEN cd.id END) AS expired_documents,
  COUNT(DISTINCT CASE WHEN cd.expiry_date BETWEEN now()::date AND (now() + INTERVAL '30 days')::date THEN cd.id END) AS expiring_30_days,
  COUNT(DISTINCT CASE WHEN cd.expiry_date BETWEEN (now() + INTERVAL '30 days')::date AND (now() + INTERVAL '60 days')::date THEN cd.id END) AS expiring_60_days,
  COUNT(DISTINCT cat.id) AS total_audit_events
FROM public.countries c
LEFT JOIN public.regulatory_frameworks rf ON rf.country_id = c.id
LEFT JOIN public.partner_certifications pc ON pc.country_id = c.id
LEFT JOIN public.compliance_documents cd ON cd.country_id = c.id
LEFT JOIN public.compliance_audit_trail cat ON cat.country_id = c.id
GROUP BY c.id, c.name;

CREATE OR REPLACE VIEW public.v_compliance_audit_recent AS
SELECT
  cat.id,
  cat.event_type,
  cat.actor_user_id,
  cat.partner_user_id,
  cat.country_id,
  cat.event_metadata,
  cat.event_hash,
  cat.previous_hash,
  cat.created_at,
  p.full_name AS actor_name,
  pp.full_name AS partner_name
FROM public.compliance_audit_trail cat
LEFT JOIN public.profiles p ON p.user_id = cat.actor_user_id
LEFT JOIN public.profiles pp ON pp.user_id = cat.partner_user_id
ORDER BY cat.created_at DESC
LIMIT 100;

-- ============================================================
-- 12. HELPER: log audit event
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_log_compliance_event(
  p_event_type TEXT,
  p_partner_user_id UUID DEFAULT NULL,
  p_country_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_ip INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO public.compliance_audit_trail
    (event_type, actor_user_id, partner_user_id, country_id, event_metadata, ip_address, user_agent)
  VALUES
    (p_event_type, auth.uid(), p_partner_user_id, p_country_id, p_metadata, p_ip, p_user_agent)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ============================================================
-- 13. HELPER: upgrade partner tier
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_upgrade_partner_tier(
  p_partner_user_id UUID,
  p_new_tier TEXT,
  p_country_id TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cert_id UUID;
  v_old_tier TEXT;
BEGIN
  SELECT id, certification_tier INTO v_cert_id, v_old_tier
  FROM public.partner_certifications
  WHERE partner_user_id = p_partner_user_id
  ORDER BY created_at DESC LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.partner_certifications
      (partner_user_id, partner_type, country_id, certification_tier, status, verified_at, verified_by)
    VALUES
      (p_partner_user_id, 'store', p_country_id, p_new_tier, 'verified', now(), auth.uid())
    RETURNING id INTO v_cert_id;
  ELSE
    UPDATE public.partner_certifications
    SET certification_tier = p_new_tier,
        status = 'verified',
        verified_at = now(),
        verified_by = auth.uid(),
        updated_at = now()
    WHERE id = v_cert_id;
  END IF;

  PERFORM public.fn_log_compliance_event(
    'tier_upgraded',
    p_partner_user_id,
    p_country_id,
    jsonb_build_object('old_tier', v_old_tier, 'new_tier', p_new_tier, 'reason', p_reason)
  );

  RETURN v_cert_id;
END;
$$;

-- ============================================================
-- 14. HELPER: process auto-insurance payout
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_process_insurance_payout(
  p_policy_id UUID,
  p_trigger_type TEXT,
  p_trigger_data JSONB,
  p_amount NUMERIC
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_claim_id UUID;
  v_policy RECORD;
  v_product RECORD;
BEGIN
  SELECT * INTO v_policy FROM public.micro_insurance_policies WHERE id = p_policy_id AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Policy not found or not active';
  END IF;

  SELECT * INTO v_product FROM public.micro_insurance_products WHERE id = v_policy.product_id AND trigger_type = p_trigger_type;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trigger type does not match product';
  END IF;

  IF v_policy.coverage_used + p_amount > v_product.coverage_amount THEN
    RAISE EXCEPTION 'Payout exceeds remaining coverage';
  END IF;

  INSERT INTO public.micro_insurance_claims
    (policy_id, user_id, country_id, claim_type, trigger_data, amount_requested, amount_paid, status, approved_at)
  VALUES
    (p_policy_id, v_policy.user_id, v_policy.country_id, p_trigger_type, p_trigger_data, p_amount, p_amount,
     CASE WHEN v_product.payout_auto THEN 'auto_approved' ELSE 'pending' END,
     CASE WHEN v_product.payout_auto THEN now() ELSE NULL END)
  RETURNING id INTO v_claim_id;

  UPDATE public.micro_insurance_policies
  SET coverage_used = coverage_used + p_amount,
      payout_count = payout_count + 1,
      updated_at = now()
  WHERE id = p_policy_id;

  PERFORM public.fn_log_compliance_event(
    'insurance_claim_paid',
    v_policy.user_id,
    v_policy.country_id,
    jsonb_build_object('claim_id', v_claim_id, 'amount', p_amount, 'trigger', p_trigger_type)
  );

  RETURN v_claim_id;
END;
$$;

-- ============================================================
-- FIM DA MIGRATION
-- ============================================================
