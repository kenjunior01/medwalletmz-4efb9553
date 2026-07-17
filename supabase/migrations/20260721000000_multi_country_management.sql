-- ============================================================
-- MedWallet Global — Estrutura de Multi-País e Gestores Locais
-- ============================================================

-- 1. Tabela de Países
CREATE TABLE IF NOT EXISTS public.countries (
    id TEXT PRIMARY KEY, -- ISO 3166-1 alpha-2 (MZ, AO, ZA, PT, etc)
    name TEXT NOT NULL,
    currency_code TEXT NOT NULL DEFAULT 'MZN',
    currency_symbol TEXT NOT NULL DEFAULT 'MT',
    phone_prefix TEXT,
    flag_url TEXT,
    is_active BOOLEAN DEFAULT true,
    config jsonb DEFAULT '{}'::jsonb, -- Configurações específicas (gateways, features ativas)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ativar RLS para countries
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Países são legíveis por todos" ON public.countries FOR SELECT USING (true);
CREATE POLICY "Apenas admin global gere países" ON public.countries FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin' AND country_id IS NULL)
);

-- Seed Inicial: Moçambique
INSERT INTO public.countries (id, name, currency_code, currency_symbol, phone_prefix)
VALUES ('MZ', 'Moçambique', 'MZN', 'MT', '+258')
ON CONFLICT (id) DO NOTHING;

-- 2. Atualizar Enum de Roles
-- Nota: 'admin' sem country_id será considerado ADMIN GLOBAL.
-- 'country_manager' requer country_id.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'country_manager';

-- 3. Ajustar user_roles para suporte a país
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id);

-- Ajustar a restrição única: um utilizador pode ter diferentes roles ou o mesmo role em países diferentes
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_country_key UNIQUE (user_id, role, country_id);

-- 4. Adicionar country_id às entidades principais
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id) DEFAULT 'MZ';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id) DEFAULT 'MZ';
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id) DEFAULT 'MZ';
ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id) DEFAULT 'MZ';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id) DEFAULT 'MZ';
ALTER TABLE public.place_proposals ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id) DEFAULT 'MZ';
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id) DEFAULT 'MZ';

-- 5. Funções de Auxílio para RLS
CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    AND country_id IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_manager_of_country(p_country_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND (
      (role = 'country_manager' AND country_id = p_country_id) OR
      (role = 'admin' AND (country_id = p_country_id OR country_id IS NULL))
    )
  );
$$;

-- 6. Atualizar Políticas de RLS para incluir Country Managers

-- STORES
DROP POLICY IF EXISTS "Country managers can manage stores in their country" ON public.stores;
CREATE POLICY "Country managers can manage stores in their country"
ON public.stores
FOR ALL
TO authenticated
USING (
    public.is_manager_of_country(country_id)
)
WITH CHECK (
    public.is_manager_of_country(country_id)
);

-- CLINICS
DROP POLICY IF EXISTS "Country managers can manage clinics in their country" ON public.clinics;
CREATE POLICY "Country managers can manage clinics in their country"
ON public.clinics
FOR ALL
TO authenticated
USING (
    public.is_manager_of_country(country_id)
)
WITH CHECK (
    public.is_manager_of_country(country_id)
);

-- DOCTOR PROFILES
DROP POLICY IF EXISTS "Country managers can manage doctors in their country" ON public.doctor_profiles;
CREATE POLICY "Country managers can manage doctors in their country"
ON public.doctor_profiles
FOR ALL
TO authenticated
USING (
    public.is_manager_of_country(country_id)
)
WITH CHECK (
    public.is_manager_of_country(country_id)
);

-- PLACE PROPOSALS
DROP POLICY IF EXISTS "Country managers can manage proposals in their country" ON public.place_proposals;
CREATE POLICY "Country managers can manage proposals in their country"
ON public.place_proposals
FOR ALL
TO authenticated
USING (
    public.is_manager_of_country(country_id)
)
WITH CHECK (
    public.is_manager_of_country(country_id)
);

-- ORDERS (Gestores de país podem ver todas as ordens do seu país)
DROP POLICY IF EXISTS "Country managers can view orders in their country" ON public.orders;
CREATE POLICY "Country managers can view orders in their country"
ON public.orders
FOR SELECT
TO authenticated
USING (
    public.is_manager_of_country(country_id)
);

-- Comentários
COMMENT ON TABLE public.countries IS 'Lista de países onde a MedWallet opera.';
COMMENT ON COLUMN public.user_roles.country_id IS 'ID do país para gestores locais. NULL significa Admin Global.';
