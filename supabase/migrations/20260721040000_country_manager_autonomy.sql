-- ============================================================
-- MedWallet Global — Autonomia do Gestor de País (CM)
-- ============================================================

-- 1. Adicionar colunas de configuração autônoma
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS commission_rates jsonb DEFAULT '{
    "pharmacy": 10,
    "doctor": 15,
    "lab": 12,
    "delivery": 5
}'::jsonb;

ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS branding_config jsonb DEFAULT '{
    "primary_color": "#047857",
    "secondary_color": "#064e3b",
    "accent_color": "#fbbf24",
    "home_banner_url": null
}'::jsonb;

-- 2. Tabela de Log de Alterações de Configuração (Auditoria)
CREATE TABLE IF NOT EXISTS public.country_config_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id TEXT REFERENCES public.countries(id),
    changed_by uuid REFERENCES auth.users(id),
    old_config jsonb,
    new_config jsonb,
    config_type TEXT, -- 'commission' ou 'branding'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS para Gestores de País editarem suas próprias configurações
-- Já temos a função is_manager_of_country(country_id) criada anteriormente.

CREATE POLICY "Country Managers can update their country config"
ON public.countries
FOR UPDATE
TO authenticated
USING (public.is_manager_of_country(id))
WITH CHECK (public.is_manager_of_country(id));

-- 4. Função para calcular comissão dinâmica baseada no país
CREATE OR REPLACE FUNCTION get_country_commission(p_country_id TEXT, p_entity_type TEXT)
RETURNS NUMERIC AS $$
DECLARE
    v_rates jsonb;
    v_rate NUMERIC;
BEGIN
    SELECT commission_rates INTO v_rates FROM public.countries WHERE id = p_country_id;

    v_rate := (v_rates->>p_entity_type)::NUMERIC;

    RETURN COALESCE(v_rate, 10); -- Default 10% se não encontrado
END;
$$ LANGUAGE plpgsql STABLE;
