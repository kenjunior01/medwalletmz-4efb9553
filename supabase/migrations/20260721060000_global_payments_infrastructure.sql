-- ============================================================
-- MedWallet Global — Infraestrutura de Pagamentos PIX e UPI
-- ============================================================

-- 1. Estender a tabela de pagamentos com metadados para pagamentos globais
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS qr_code_base64 TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS external_reference TEXT;

-- 2. Tabela de Configurações de Gateways por País (Segredo do Admin Global)
CREATE TABLE IF NOT EXISTS public.payment_gateways (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id TEXT REFERENCES public.countries(id),
    provider TEXT NOT NULL, -- 'stripe', 'razorpay', 'pagarme', 'mpesa'
    api_key_public TEXT,
    api_key_secret_encrypted TEXT,
    is_active BOOLEAN DEFAULT true,
    is_test_mode BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(country_id, provider)
);

-- Ativar RLS
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins globais gerem gateways" ON public.payment_gateways FOR ALL USING (public.is_global_admin());

-- 3. Inserir Gateways de Exemplo (Simulação)
INSERT INTO public.payment_gateways (country_id, provider, is_test_mode)
VALUES
('BR', 'pagarme', true), -- Para PIX e Cartão no Brasil
('IN', 'razorpay', true), -- Para UPI na Índia
('GB', 'stripe', true),   -- Para UK
('PT', 'stripe', true);   -- Para Portugal

-- 4. Função para validar se o pagamento expirou (ex: PIX expira em 30 min)
CREATE OR REPLACE FUNCTION public.check_payment_expiry()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'pending' AND (NEW.created_at < now() - interval '1 hour') THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_payment_expiry
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.check_payment_expiry();
