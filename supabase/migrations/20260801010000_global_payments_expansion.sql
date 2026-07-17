-- ============================================================
-- MedWallet Global — EXPANSÃO DE MÉTODOS DE PAGAMENTO REGIONAIS
-- ============================================================

-- 1. PORTUGAL (MB WAY + Multibanco)
UPDATE public.countries SET config = jsonb_set(config, '{payment_methods}', '[
    {"id": "mbway", "name": "MB WAY", "type": "mobile_money", "icon": "📲", "requires_phone": true, "badge": "Popular"},
    {"id": "multibanco", "name": "Multibanco", "type": "bank_transfer", "icon": "🏦", "description": "Entidade e Referência"},
    {"id": "stripe", "name": "Cartão (Stripe)", "type": "card", "icon": "💳"},
    {"id": "paypal", "name": "PayPal", "type": "wallet", "icon": "🅿️"}
]'::jsonb) WHERE id = 'PT';

-- 2. ESPANHA (Bizum + Card)
INSERT INTO public.countries (id, name, currency_code, currency_symbol, phone_prefix, default_locale, supported_locales, config, compliance_config)
VALUES ('ES', 'España', 'EUR', '€', '+34', 'es', ARRAY['es', 'en'],
'{
    "payment_methods": [
        {"id": "bizum", "name": "Bizum", "type": "instant", "icon": "📱", "requires_phone": true, "badge": "Rápido"},
        {"id": "stripe", "name": "Tarjeta", "type": "card", "icon": "💳"},
        {"id": "paypal", "name": "PayPal", "type": "wallet", "icon": "🅿️"}
    ]
}'::jsonb,
'{"tax_name": "IVA", "tax_rate": 21, "require_doctor_id": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config;

-- 3. FRANÇA (Carte Bancaire + Lydia)
INSERT INTO public.countries (id, name, currency_code, currency_symbol, phone_prefix, default_locale, supported_locales, config, compliance_config)
VALUES ('FR', 'France', 'EUR', '€', '+33', 'fr', ARRAY['fr', 'en'],
'{
    "payment_methods": [
        {"id": "stripe", "name": "Carte Bancaire", "type": "card", "icon": "💳"},
        {"id": "lydia", "name": "Lydia", "type": "mobile_money", "icon": "🤳", "requires_phone": true},
        {"id": "paypal", "name": "PayPal", "type": "wallet", "icon": "🅿️"}
    ]
}'::jsonb,
'{"tax_name": "TVA", "tax_rate": 20, "require_doctor_id": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config;

-- 4. USA (Venmo + Zelle)
UPDATE public.countries SET config = jsonb_set(config, '{payment_methods}', '[
    {"id": "stripe", "name": "Credit Card", "type": "card", "icon": "💳"},
    {"id": "zelle", "name": "Zelle", "type": "instant", "icon": "⚡"},
    {"id": "venmo", "name": "Venmo", "type": "wallet", "icon": "💙"},
    {"id": "apple_pay", "name": "Apple Pay", "type": "wallet", "icon": "🍎"},
    {"id": "paypal", "name": "PayPal", "type": "wallet", "icon": "🅿️"}
]'::jsonb) WHERE id = 'US';

-- 5. ENGLAND/UK (Revolut + Direct Debit)
UPDATE public.countries SET config = jsonb_set(config, '{payment_methods}', '[
    {"id": "stripe", "name": "Debit/Credit Card", "type": "card", "icon": "💳"},
    {"id": "revolut", "name": "Revolut Pay", "type": "wallet", "icon": "R", "badge": "Fast"},
    {"id": "paypal", "name": "PayPal", "type": "wallet", "icon": "🅿️"},
    {"id": "apple_pay", "name": "Apple Pay", "type": "wallet", "icon": "🍎"}
]'::jsonb) WHERE id = 'GB';

-- 6. ÁFRICA DO SUL (EFT + SnapScan)
UPDATE public.countries SET config = jsonb_set(config, '{payment_methods}', '[
    {"id": "paystack", "name": "Card (Visa/Master)", "type": "card", "icon": "💳"},
    {"id": "ozow", "name": "Ozow Instant EFT", "type": "instant", "icon": "🏦", "badge": "Secure"},
    {"id": "snapscan", "name": "SnapScan", "type": "qr", "icon": "🤳"},
    {"id": "paypal", "name": "PayPal", "type": "wallet", "icon": "🅿️"}
]'::jsonb) WHERE id = 'ZA';
