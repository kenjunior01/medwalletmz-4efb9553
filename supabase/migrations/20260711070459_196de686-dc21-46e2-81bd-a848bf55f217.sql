
-- 1) Extend app_role enum with country_manager
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname='app_role' AND e.enumlabel='country_manager') THEN
    ALTER TYPE public.app_role ADD VALUE 'country_manager';
  END IF;
END $$;

-- 2) countries master table
CREATE TABLE IF NOT EXISTS public.countries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  currency_symbol TEXT NOT NULL DEFAULT '',
  phone_code TEXT NOT NULL DEFAULT '',
  flag_url TEXT,
  default_locale TEXT NOT NULL DEFAULT 'en',
  supported_locales TEXT[] NOT NULL DEFAULT ARRAY['en']::text[],
  timezone TEXT NOT NULL DEFAULT 'UTC',
  branding_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.countries TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.countries TO authenticated;
GRANT ALL ON public.countries TO service_role;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active countries" ON public.countries;
CREATE POLICY "Public can read active countries" ON public.countries FOR SELECT USING (is_active = true OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins manage countries" ON public.countries;
CREATE POLICY "Admins manage countries" ON public.countries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS trg_countries_updated ON public.countries;
CREATE TRIGGER trg_countries_updated BEFORE UPDATE ON public.countries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) country_management: which user manages which country
CREATE TABLE IF NOT EXISTS public.country_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_id TEXT NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, country_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.country_management TO authenticated;
GRANT ALL ON public.country_management TO service_role;
ALTER TABLE public.country_management ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage country managers" ON public.country_management;
CREATE POLICY "Admins manage country managers" ON public.country_management FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Managers see their own assignments" ON public.country_management;
CREATE POLICY "Managers see their own assignments" ON public.country_management FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS trg_country_management_updated ON public.country_management;
CREATE TRIGGER trg_country_management_updated BEFORE UPDATE ON public.country_management FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) profiles.country_id + wallets.country_id
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_id TEXT DEFAULT 'MZ';
ALTER TABLE public.wallets  ADD COLUMN IF NOT EXISTS country_id TEXT DEFAULT 'MZ';

-- 5) Helper: is_country_manager
CREATE OR REPLACE FUNCTION public.is_country_manager(_user_id UUID, _country_id TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path='public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.country_management WHERE user_id = _user_id AND country_id = _country_id)
$$;
REVOKE EXECUTE ON FUNCTION public.is_country_manager(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_country_manager(uuid, text) TO authenticated, service_role;

-- 6) Seed 6 countries
INSERT INTO public.countries (id, name, currency_code, currency_symbol, phone_code, default_locale, supported_locales, timezone, config) VALUES
 ('MZ','Moçambique','MZN','MT','258','pt',ARRAY['pt','en'],'Africa/Maputo','{}'::jsonb),
 ('BR','Brasil','BRL','R$','55','pt-BR',ARRAY['pt-BR','en','es'],'America/Sao_Paulo','{}'::jsonb),
 ('AO','Angola','AOA','Kz','244','pt',ARRAY['pt','en'],'Africa/Luanda','{}'::jsonb),
 ('ZA','South Africa','ZAR','R','27','en',ARRAY['en','af'],'Africa/Johannesburg','{}'::jsonb),
 ('PT','Portugal','EUR','€','351','pt',ARRAY['pt','en'],'Europe/Lisbon','{}'::jsonb),
 ('IN','India','INR','₹','91','hi',ARRAY['hi','en'],'Asia/Kolkata','{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
