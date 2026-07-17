-- ============================================================
-- MedWallet Global — CONSOLIDAÇÃO TOTAL MULTINACIONAL
-- ============================================================

-- 1. ESTRUTURA DE COMPLIANCE E RESTRIÇÕES POR PAÍS
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS compliance_config jsonb DEFAULT '{
    "require_doctor_id": true,
    "require_prescription_upload": true,
    "tax_name": "IVA",
    "tax_rate": 16,
    "data_residency": "local"
}'::jsonb;

-- 2. SEED DEFINITIVO PARA TODOS OS MERCADOS SOLICITADOS
-- Brasil
INSERT INTO public.countries (id, name, currency_code, currency_symbol, phone_prefix, default_locale, supported_locales, config, commission_rates, branding_config, compliance_config)
VALUES ('BR', 'Brasil', 'BRL', 'R$', '+55', 'pt', ARRAY['pt', 'en'],
'{
    "payment_methods": [
        {"id": "pix", "name": "PIX", "type": "instant", "icon": "💎", "requires_phone": true},
        {"id": "stripe", "name": "Cartão de Crédito", "type": "card", "icon": "💳"},
        {"id": "wallet", "name": "Carteira MedWallet", "type": "wallet", "icon": "👛"}
    ]
}'::jsonb,
'{"pharmacy": 15, "doctor": 20, "lab": 15, "delivery": 10}'::jsonb,
'{"primary_color": "#22c55e", "accent_color": "#eab308", "home_banner_url": "https://images.unsplash.com/photo-1579154235602-3c75cf706197?q=80&w=2070"}'::jsonb,
'{"require_doctor_id": true, "tax_name": "ISS/ICMS", "tax_rate": 18, "doctor_reg_name": "CRM"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, branding_config = EXCLUDED.branding_config, compliance_config = EXCLUDED.compliance_config;

-- Reino Unido (UK)
INSERT INTO public.countries (id, name, currency_code, currency_symbol, phone_prefix, default_locale, supported_locales, config, commission_rates, branding_config, compliance_config)
VALUES ('GB', 'United Kingdom', 'GBP', '£', '+44', 'en', ARRAY['en'],
'{
    "payment_methods": [
        {"id": "stripe", "name": "Credit/Debit Card", "type": "card", "icon": "💳"},
        {"id": "apple_pay", "name": "Apple Pay", "type": "wallet", "icon": "🍎"},
        {"id": "wallet", "name": "MedWallet (GBP)", "type": "wallet", "icon": "👛"}
    ]
}'::jsonb,
'{"pharmacy": 20, "doctor": 25, "lab": 20, "delivery": 15}'::jsonb,
'{"primary_color": "#1e3a8a", "accent_color": "#dc2626", "home_banner_url": "https://images.unsplash.com/photo-1512675845772-b96274e1a036?q=80&w=2070"}'::jsonb,
'{"require_doctor_id": true, "tax_name": "VAT", "tax_rate": 20, "doctor_reg_name": "GMC"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, branding_config = EXCLUDED.branding_config, compliance_config = EXCLUDED.compliance_config;

-- Índia
INSERT INTO public.countries (id, name, currency_code, currency_symbol, phone_prefix, default_locale, supported_locales, config, commission_rates, branding_config, compliance_config)
VALUES ('IN', 'India', 'INR', '₹', '+91', 'en', ARRAY['en', 'hi'],
'{
    "payment_methods": [
        {"id": "upi", "name": "UPI (PhonePe/GPay)", "type": "instant", "icon": "📱", "requires_phone": true},
        {"id": "razorpay", "name": "Razorpay", "type": "card", "icon": "💳"},
        {"id": "wallet", "name": "MedWallet (INR)", "type": "wallet", "icon": "👛"}
    ]
}'::jsonb,
'{"pharmacy": 8, "doctor": 10, "lab": 8, "delivery": 5}'::jsonb,
'{"primary_color": "#ea580c", "accent_color": "#16a34a", "home_banner_url": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=2070"}'::jsonb,
'{"require_doctor_id": true, "tax_name": "GST", "tax_rate": 18, "doctor_reg_name": "MCI"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, branding_config = EXCLUDED.branding_config, compliance_config = EXCLUDED.compliance_config;

-- África do Sul
INSERT INTO public.countries (id, name, currency_code, currency_symbol, phone_prefix, default_locale, supported_locales, config, commission_rates, branding_config, compliance_config)
VALUES ('ZA', 'South Africa', 'ZAR', 'R', '+27', 'en', ARRAY['en', 'af'],
'{
    "payment_methods": [
        {"id": "paystack", "name": "Paystack", "type": "card", "icon": "💳"},
        {"id": "ozow", "name": "Ozow (EFT)", "type": "instant", "icon": "🏦"},
        {"id": "wallet", "name": "MedWallet (ZAR)", "type": "wallet", "icon": "👛"}
    ]
}'::jsonb,
'{"pharmacy": 12, "doctor": 15, "lab": 12, "delivery": 8}'::jsonb,
'{"primary_color": "#065f46", "accent_color": "#fbbf24", "home_banner_url": "https://images.unsplash.com/photo-1599423300746-b62533397364?q=80&w=2070"}'::jsonb,
'{"require_doctor_id": true, "tax_name": "VAT", "tax_rate": 15, "doctor_reg_name": "HPCSA"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, branding_config = EXCLUDED.branding_config, compliance_config = EXCLUDED.compliance_config;

-- 3. SEGURANÇA MÁXIMA (RLS) - FILTRAGEM AUTOMÁTICA
-- Garantir que qualquer dado criado tenha o país do usuário

CREATE OR REPLACE FUNCTION public.get_user_country()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT country_id FROM public.profiles WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger para auto-atribuir país em novas inserções
CREATE OR REPLACE FUNCTION public.auto_set_country()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.country_id IS NULL THEN
    NEW.country_id := public.get_user_country();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar o trigger em tabelas críticas
DROP TRIGGER IF EXISTS trg_auto_country_orders ON public.orders;
CREATE TRIGGER trg_auto_country_orders BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.auto_set_country();

DROP TRIGGER IF EXISTS trg_auto_country_stores ON public.stores;
CREATE TRIGGER trg_auto_country_stores BEFORE INSERT ON public.stores FOR EACH ROW EXECUTE FUNCTION public.auto_set_country();

-- 4. POLÍTICAS DE ISOLAMENTO (Ninguém vê dados de outro país sem ser Admin Global)
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('orders', 'stores', 'clinics', 'doctor_profiles', 'wallets', 'place_proposals')
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Global isolation" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Global isolation" ON public.%I FOR ALL USING (
            public.is_global_admin() OR country_id = public.get_user_country()
        )', t);
    END LOOP;
END $$;
