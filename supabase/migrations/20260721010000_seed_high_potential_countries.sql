-- ============================================================
-- MedWallet Global — Seeding Países de Alta Adesão
-- ============================================================

-- 1. África do Sul (ZA) - Mercado maduro e gigante em fintech
INSERT INTO public.countries (id, name, currency_code, currency_symbol, phone_prefix, config)
VALUES ('ZA', 'South Africa', 'ZAR', 'R', '+27', '{
  "payment_methods": [
    {"id": "paystack", "name": "Paystack", "type": "card", "icon": "💳", "description": "Card or Bank Transfer"},
    {"id": "wallet", "name": "MedWallet (ZAR)", "type": "wallet", "icon": "👛", "description": "Pay with ZAR balance"}
  ],
  "features": {
    "telemedicine": true,
    "e_pharmacy": true,
    "blood_hub": false
  }
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config;

-- 2. Angola (AO) - Mercado em forte crescimento e lusófono
INSERT INTO public.countries (id, name, currency_code, currency_symbol, phone_prefix, config)
VALUES ('AO', 'Angola', 'AOA', 'Kz', '+244', '{
  "payment_methods": [
    {"id": "unitel_money", "name": "Unitel Money", "type": "mobile_money", "icon": "📱", "description": "Pagamento Unitel"},
    {"id": "aki", "name": "Aki", "type": "mobile_money", "icon": "💰", "description": "Pagamento Aki"},
    {"id": "multicaixa", "name": "Multicaixa Express", "type": "bank", "icon": "🏦", "description": "Referência Multicaixa"},
    {"id": "wallet", "name": "Carteira MedWallet (Kz)", "type": "wallet", "icon": "👛", "description": "Saldo em Kwanzas"}
  ],
  "features": {
    "telemedicine": true,
    "e_pharmacy": true,
    "blood_hub": true
  }
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config;

-- 3. Portugal (PT) - Estratégico para parcerias e consultas remotas
INSERT INTO public.countries (id, name, currency_code, currency_symbol, phone_prefix, config)
VALUES ('PT', 'Portugal', 'EUR', '€', '+351', '{
  "payment_methods": [
    {"id": "mbway", "name": "MB WAY", "type": "mobile_money", "icon": "📱", "description": "Pagamento MB WAY"},
    {"id": "stripe", "name": "Stripe", "type": "card", "icon": "💳", "description": "Cartão de Crédito/Débito"},
    {"id": "wallet", "name": "Carteira MedWallet (€)", "type": "wallet", "icon": "👛", "description": "Saldo em Euros"}
  ],
  "features": {
    "telemedicine": true,
    "e_pharmacy": false,
    "blood_hub": false
  }
}'::jsonb)
ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config;

-- Atualizar Moçambique (MZ) para o novo padrão de config
UPDATE public.countries
SET config = '{
  "payment_methods": [
    {"id": "mpesa", "name": "M-Pesa", "type": "mobile_money", "icon": "📱", "description": "Vodacom M-Pesa", "requires_phone": true},
    {"id": "emola", "name": "e-Mola", "type": "mobile_money", "icon": "💰", "description": "Movitel e-Mola", "requires_phone": true},
    {"id": "mkesh", "name": "Mkesh", "type": "mobile_money", "icon": "🏦", "description": "BCI Mkesh", "requires_phone": true},
    {"id": "wallet", "name": "Carteira MedWallet", "type": "wallet", "icon": "💳", "description": "Débito do saldo MZN", "badge": "Instantâneo"}
  ],
  "features": {
    "telemedicine": true,
    "e_pharmacy": true,
    "blood_hub": true
  }
}'::jsonb
WHERE id = 'MZ';
