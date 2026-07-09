-- Inserir os mercados estratégicos
INSERT INTO public.countries (id, name, currency_code, currency_symbol, phone_code, config)
VALUES
('BR', 'Brasil', 'BRL', 'R$', '+55', '{"payments": ["pix", "card"], "tax": 0.10}'),
('AO', 'Angola', 'AOA', 'Kz', '+244', '{"payments": ["multicaixa", "unitel_money"], "tax": 0.05}'),
('ZA', 'África do Sul', 'ZAR', 'R', '+27', '{"payments": ["payfast", "ozow"], "tax": 0.08}'),
('IN', 'Índia', 'INR', '₹', '+91', '{"payments": ["upi", "razorpay"], "tax": 0.05}'),
('US', 'Estados Unidos', 'USD', '$', '+1', '{"payments": ["stripe", "apple_pay"], "tax": 0.12}'),
('GB', 'Inglaterra', 'GBP', '£', '+44', '{"payments": ["stripe", "paypal"], "tax": 0.12}'),
('PT', 'Portugal', 'EUR', '€', '+351', '{"payments": ["mbway", "stripe"], "tax": 0.15}')
ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config;

-- Criar a tabela de Instituições de Saúde (Generalizada)
-- Para que não seja apenas focado em farmácias
CREATE TABLE IF NOT EXISTS public.health_facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id TEXT REFERENCES public.countries(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'hospital', 'clinic', 'pharmacy', 'lab', 'blood_bank'
    status TEXT DEFAULT 'active',
    rating DOUBLE PRECISION DEFAULT 5.0,
    address JSONB,
    contact JSONB,
    services TEXT[], -- ['emergencia', 'pediatria', 'x-ray']
    branding_color TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Mover dados de farmácias e hospitais existentes para a nova estrutura unificada
-- (Opcional: Pode-se manter as tabelas separadas mas criar uma VIEW de unificação)
