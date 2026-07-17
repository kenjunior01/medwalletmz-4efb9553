-- ============================================================
-- MedWallet Global — Fix Registration & Regional Adaptation
-- ============================================================

-- 1. Melhorar a função handle_new_user para suportar metadados de Google e Country ID
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    super_email text;
    bonus_amt numeric;
    v_country_id text;
    v_full_name text;
BEGIN
    -- Extrair country_id dos metadados ou usar default MZ
    v_country_id := COALESCE(NEW.raw_user_meta_data->>'country_id', 'MZ');

    -- Extrair nome (Google usa 'name', Email usa 'full_name')
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Utilizador MedWallet');

    -- Inserir Perfil com Country ID correto
    INSERT INTO public.profiles (user_id, full_name, country_id)
    VALUES (NEW.id, v_full_name, v_country_id)
    ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        country_id = EXCLUDED.country_id;

    -- Inserir Role Inicial
    INSERT INTO public.user_roles (user_id, role, country_id)
    VALUES (NEW.id, 'customer', v_country_id)
    ON CONFLICT DO NOTHING;

    -- Inserir Perfil de Paciente
    INSERT INTO public.patient_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;

    -- Inserir Carteira com a moeda correta do país
    INSERT INTO public.wallets (user_id, country_id, currency)
    SELECT NEW.id, v_country_id, currency_code
    FROM public.countries WHERE id = v_country_id
    ON CONFLICT DO NOTHING;

    -- Bónus de Boas-Vindas (configurável por país se necessário, aqui usa o global por agora)
    SELECT COALESCE((value::text)::numeric, 0) INTO bonus_amt
    FROM public.platform_settings
    WHERE key = 'welcome_bonus_' || lower(v_country_id) OR key = 'welcome_bonus_mzn';

    IF COALESCE(bonus_amt, 0) > 0 THEN
        BEGIN
            PERFORM public.wallet_credit(NEW.id, bonus_amt, 'bonus', NULL, 'Bónus de boas-vindas MedWallet');
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Falha ao creditar bónus: %', SQLERRM;
        END;
    END IF;

    -- Atribuição de Superadmin
    SELECT (value #>> '{}')::text INTO super_email FROM public.platform_settings WHERE key = 'superadmin_email';
    IF super_email IS NOT NULL AND lower(NEW.email) = lower(super_email) THEN
        INSERT INTO public.user_roles (user_id, role, country_id)
        VALUES (NEW.id, 'admin', NULL) -- NULL country_id means Global Admin
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END; $$;

-- 2. Garantir que a tabela wallets tem a coluna currency e country_id
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MZN';
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id) DEFAULT 'MZ';

-- 3. Atualizar bónus para ser mais genérico
DELETE FROM public.platform_settings WHERE key = 'welcome_bonus_mzn';
INSERT INTO public.platform_settings (key, value, description)
VALUES ('welcome_bonus_mzn', '100'::jsonb, 'Bónus de boas-vindas padrão')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 4. Corrigir erro comum de RLS em profiles para novos registros
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Permitir que o trigger (SECURITY DEFINER) insira perfis mesmo que o user_id ainda não esteja na sessão de forma estável
-- (O trigger já é SECURITY DEFINER, então isto é mais para redundância e manual inserts)
