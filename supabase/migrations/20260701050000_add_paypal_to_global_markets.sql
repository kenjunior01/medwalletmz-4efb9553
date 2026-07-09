-- Adicionar PayPal aos mercados globais que o utilizam
UPDATE public.countries
SET config = jsonb_set(
    config,
    '{payments}',
    (config->'payments') || '["paypal"]'::jsonb
)
WHERE id IN ('US', 'GB', 'PT', 'BR', 'AO', 'ZA', 'IN');

-- Adicionar detalhes do PayPal na configuração de métodos de pagamento globais se existir uma tabela de tipos
-- Como o Checkout.tsx usa a config do país para mapear, vamos garantir que a estrutura esteja completa

-- Exemplo de atualização para Portugal
UPDATE public.countries
SET config = '{
  "payments": ["mbway", "stripe", "paypal"],
  "tax": 0.15,
  "payment_methods": [
    {"id": "mbway", "name": "MB WAY", "icon": "📲", "description": "Pagamento imediato via telemóvel", "type": "mobile_money", "requires_phone": true},
    {"id": "stripe", "name": "Cartão de Crédito/Débito", "icon": "💳", "description": "Visa, Mastercard, Amex via Stripe", "type": "card"},
    {"id": "paypal", "name": "PayPal", "icon": "🅿️", "description": "Pagamento seguro global via PayPal", "type": "wallet", "badge": "Global"}
  ]
}'::jsonb
WHERE id = 'PT';

-- Exemplo para EUA
UPDATE public.countries
SET config = '{
  "payments": ["stripe", "apple_pay", "paypal"],
  "tax": 0.12,
  "payment_methods": [
    {"id": "stripe", "name": "Credit/Debit Card", "icon": "💳", "description": "Visa, Mastercard, Amex, Discover", "type": "card"},
    {"id": "apple_pay", "name": "Apple Pay", "icon": "🍎", "description": "Fast and secure checkout", "type": "wallet", "badge": "Fast"},
    {"id": "paypal", "name": "PayPal", "icon": "🅿️", "description": "Pay with your PayPal account", "type": "wallet", "badge": "Global"}
  ]
}'::jsonb
WHERE id = 'US';

-- Exemplo para Brasil
UPDATE public.countries
SET config = '{
  "payments": ["pix", "card", "paypal"],
  "tax": 0.10,
  "payment_methods": [
    {"id": "pix", "name": "PIX", "icon": "💎", "description": "Pagamento instantâneo via QR Code", "type": "instant"},
    {"id": "card", "name": "Cartão de Crédito", "icon": "💳", "description": "Até 12x via Pagar.me", "type": "card"},
    {"id": "paypal", "name": "PayPal", "icon": "🅿️", "description": "Pagamento seguro com PayPal", "type": "wallet", "badge": "Global"}
  ]
}'::jsonb
WHERE id = 'BR';
