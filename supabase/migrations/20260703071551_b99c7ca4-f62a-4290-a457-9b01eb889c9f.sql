
-- Add 'insurance' role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'insurance';

-- Insurance companies
CREATE TABLE IF NOT EXISTS public.insurance_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  slug text UNIQUE,
  logo_url text,
  cover_url text,
  description text,
  email text,
  phone text,
  website text,
  address text,
  city text,
  cities text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  is_verified boolean NOT NULL DEFAULT false,
  rating numeric(3,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.insurance_companies TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.insurance_companies TO authenticated;
GRANT ALL ON public.insurance_companies TO service_role;
ALTER TABLE public.insurance_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insurance_public_read" ON public.insurance_companies FOR SELECT USING (is_active = true OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "insurance_owner_insert" ON public.insurance_companies FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "insurance_owner_update" ON public.insurance_companies FOR UPDATE USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "insurance_admin_delete" ON public.insurance_companies FOR DELETE USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_insurance_companies_updated BEFORE UPDATE ON public.insurance_companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insurance plans
CREATE TABLE IF NOT EXISTS public.insurance_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.insurance_companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  monthly_price_mzn numeric(12,2) NOT NULL DEFAULT 0,
  yearly_price_mzn numeric(12,2),
  coverage_percent numeric(5,2) NOT NULL DEFAULT 0,
  max_coverage_mzn numeric(12,2),
  covered_services text[] DEFAULT '{consultation,pharmacy,exam}',
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.insurance_plans TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.insurance_plans TO authenticated;
GRANT ALL ON public.insurance_plans TO service_role;
ALTER TABLE public.insurance_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_public_read" ON public.insurance_plans FOR SELECT USING (is_active = true OR EXISTS(SELECT 1 FROM public.insurance_companies c WHERE c.id = company_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "plans_owner_manage" ON public.insurance_plans FOR ALL USING (EXISTS(SELECT 1 FROM public.insurance_companies c WHERE c.id = company_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin')) WITH CHECK (EXISTS(SELECT 1 FROM public.insurance_companies c WHERE c.id = company_id AND c.owner_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_insurance_plans_updated BEFORE UPDATE ON public.insurance_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User memberships
CREATE TABLE IF NOT EXISTS public.user_insurance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.insurance_plans(id) ON DELETE CASCADE,
  member_number text,
  status text NOT NULL DEFAULT 'pending',
  activated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, plan_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_insurance TO authenticated;
GRANT ALL ON public.user_insurance TO service_role;
ALTER TABLE public.user_insurance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ui_self_read" ON public.user_insurance FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM public.insurance_plans p JOIN public.insurance_companies c ON c.id=p.company_id WHERE p.id=plan_id AND c.owner_id=auth.uid()));
CREATE POLICY "ui_self_insert" ON public.user_insurance FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "ui_self_update" ON public.user_insurance FOR UPDATE USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_user_insurance_updated BEFORE UPDATE ON public.user_insurance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Advertisements
CREATE TABLE IF NOT EXISTS public.advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  image_url text,
  price_mzn numeric(12,2),
  contact_phone text,
  contact_whatsapp text,
  city text,
  neighborhood text,
  status text NOT NULL DEFAULT 'pending',
  views integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.advertisements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.advertisements TO authenticated;
GRANT ALL ON public.advertisements TO service_role;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads_public_read" ON public.advertisements FOR SELECT USING (status = 'approved' OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ads_self_insert" ON public.advertisements FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "ads_self_update" ON public.advertisements FOR UPDATE USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "ads_self_delete" ON public.advertisements FOR DELETE USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_advertisements_updated BEFORE UPDATE ON public.advertisements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_ads_status_city ON public.advertisements(status, city);
CREATE INDEX IF NOT EXISTS idx_ads_user ON public.advertisements(user_id);
