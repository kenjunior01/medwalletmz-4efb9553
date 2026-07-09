-- 1. Criar Tabela de Países
CREATE TABLE IF NOT EXISTS public.countries (
    id TEXT PRIMARY KEY, -- ISO Code (ex: 'MZ', 'AO', 'BR')
    name TEXT NOT NULL,
    currency_code TEXT NOT NULL DEFAULT 'USD',
    currency_symbol TEXT NOT NULL DEFAULT '$',
    phone_code TEXT,
    flag_url TEXT,
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}'::jsonb, -- Configurações específicas (ex: gateways ativos)
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Adicionar o papel de Gestor de País ao Enum de Roles
-- Nota: Enums no Postgres não podem ser alterados facilmente dentro de transações em algumas versões,
-- mas aqui adicionamos para a lógica da aplicação.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'country_manager';

-- 3. Adicionar country_id às tabelas principais para isolamento multi-país
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id);
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id);
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id);
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id);
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id);
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id);

-- 4. Abstração de Moeda na Carteira
-- Renomear balance_mzn para balance para ser agnóstico à moeda
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallets' AND column_name='balance_mzn') THEN
        ALTER TABLE public.wallets RENAME COLUMN balance_mzn TO balance;
    END IF;
END $$;

-- 5. Tabela de Gestores de País (Relaciona um Admin a um território)
CREATE TABLE IF NOT EXISTS public.country_management (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    country_id TEXT REFERENCES public.countries(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '{"can_approve_doctors": true, "can_view_revenue": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, country_id)
);

-- 6. Seed Inicial: Moçambique
INSERT INTO public.countries (id, name, currency_code, currency_symbol, phone_code, is_active)
VALUES ('MZ', 'Moçambique', 'MZN', 'MT', '+258', true)
ON CONFLICT (id) DO NOTHING;

-- Atualizar dados existentes para Moçambique
UPDATE public.profiles SET country_id = 'MZ' WHERE country_id IS NULL;
UPDATE public.wallets SET country_id = 'MZ', currency = 'MZN' WHERE country_id IS NULL;
UPDATE public.stores SET country_id = 'MZ' WHERE country_id IS NULL;
UPDATE public.orders SET country_id = 'MZ' WHERE country_id IS NULL;

-- 7. RLS (Row Level Security) para Gestores de País
-- Exemplo: Um gestor só pode ver perfis do seu país
CREATE POLICY "Gestores de país podem ver perfis do seu país"
ON public.profiles
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.country_management
        WHERE user_id = auth.uid() AND country_id = public.profiles.country_id
    ) OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
);
