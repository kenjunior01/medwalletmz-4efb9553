-- ============================================================
-- MedWallet Global — Expansão Brasil e Tradução Automática
-- ============================================================

-- 1. Inserir Brasil (BR) - O maior mercado da América Latina
-- Foco em PIX (essencial) e Cartão via Pagar.me/Stripe
INSERT INTO public.countries (id, name, currency_code, currency_symbol, phone_prefix, default_locale, supported_locales, config)
VALUES ('BR', 'Brasil', 'BRL', 'R$', '+55', 'pt', ARRAY['pt', 'en'], '{
    "payment_methods": [
        {"id": "pix", "name": "PIX", "type": "instant_payment", "icon": "💎", "description": "Pagamento instantâneo via QR Code ou Chave"},
        {"id": "stripe", "name": "Cartão de Crédito", "type": "card", "icon": "💳", "description": "Até 12x no cartão"},
        {"id": "wallet", "name": "Carteira MedWallet (R$)", "type": "wallet", "icon": "👛", "description": "Saldo em Reais"}
    ],
    "features": {
        "telemedicine": true,
        "e_pharmacy": true,
        "blood_hub": true,
        "health_insurance_integration": true
    }
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config;

-- 2. Tabela de Logs de Tradução (Para auditoria da IA)
CREATE TABLE IF NOT EXISTS public.ai_translation_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_text TEXT,
    target_locale TEXT,
    api_used TEXT,
    tokens_used INT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Função de Segurança para Country Managers acessarem seu Dashboard
-- Esta view simplifica o acesso a métricas por país
CREATE OR REPLACE VIEW public.country_metrics AS
SELECT
    c.id as country_id,
    c.name as country_name,
    (SELECT count(*) FROM public.profiles p WHERE p.country_id = c.id) as total_users,
    (SELECT count(*) FROM public.orders o WHERE o.country_id = c.id) as total_orders,
    (SELECT coalesce(sum(total), 0) FROM public.orders o WHERE o.country_id = c.id AND o.status = 'delivered') as total_revenue,
    (SELECT count(*) FROM public.doctor_profiles d WHERE d.country_id = c.id AND d.is_active = true) as active_doctors
FROM public.countries c;

-- RLS para a view de métricas
ALTER VIEW public.country_metrics OWNER TO postgres;
-- Nota: Views no Postgres não têm RLS direto, mas as tabelas base sim.
-- O Country Manager filtrará no código usando a is_manager_of_country().
