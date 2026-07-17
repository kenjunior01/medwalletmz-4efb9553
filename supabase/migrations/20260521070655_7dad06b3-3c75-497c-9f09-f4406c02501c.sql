
-- 1. Subscription plans
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  target_audience text NOT NULL CHECK (target_audience IN ('patient','doctor','clinic')),
  description text,
  price_mzn integer NOT NULL DEFAULT 0,
  billing_period text NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly','quarterly','yearly','one_time')),
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  badge text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are publicly readable" ON public.subscription_plans
  FOR SELECT USING (is_active = true OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage plans" ON public.subscription_plans
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_subscription_plans_updated
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','rejected','cancelled')),
  started_at timestamptz,
  expires_at timestamptz,
  payment_method text CHECK (payment_method IN ('mpesa','emola','mkesh','manual')),
  payment_reference text,
  payment_phone text,
  payment_proof_url text,
  amount_paid integer,
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own subscriptions" ON public.subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own pending subscriptions" ON public.subscriptions
  FOR UPDATE TO authenticated USING (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Admins manage all subscriptions" ON public.subscriptions
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_subscriptions_updated
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Helper: active subscription check
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid, _audience text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.subscription_plans p ON p.id = s.plan_id
    WHERE s.user_id = _user_id
      AND s.status = 'active'
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND p.target_audience = _audience
  )
$$;

-- 4. Clinics
CREATE TABLE public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  address text,
  city text NOT NULL DEFAULT 'Maputo',
  phone text,
  email text,
  logo_url text,
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinics are publicly readable" ON public.clinics FOR SELECT USING (is_active = true);
CREATE POLICY "Owners manage own clinic" ON public.clinics
  FOR ALL TO authenticated USING (owner_id = auth.uid() OR has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_clinics_updated
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Clinic doctors
CREATE TABLE public.clinic_doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'doctor' CHECK (role IN ('owner','doctor','assistant')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, doctor_id)
);

ALTER TABLE public.clinic_doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic doctors publicly readable" ON public.clinic_doctors FOR SELECT USING (true);
CREATE POLICY "Clinic owner manages members" ON public.clinic_doctors
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = clinic_id AND c.owner_id = auth.uid()) OR has_role(auth.uid(),'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = clinic_id AND c.owner_id = auth.uid()) OR has_role(auth.uid(),'admin'));

-- 6. Platform payment accounts (admin sets receiving numbers)
CREATE TABLE public.platform_payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  method text NOT NULL CHECK (method IN ('mpesa','emola','mkesh','bank')),
  account_name text NOT NULL,
  account_number text NOT NULL,
  instructions text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_payment_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active accounts publicly readable" ON public.platform_payment_accounts
  FOR SELECT USING (is_active = true OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage payment accounts" ON public.platform_payment_accounts
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- 7. Add user payment contacts to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mpesa_number text,
  ADD COLUMN IF NOT EXISTS emola_number text,
  ADD COLUMN IF NOT EXISTS mkesh_number text;

-- 8. Storage bucket for payment proofs (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own payment proofs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users view own payment proofs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(),'admin')));

CREATE POLICY "Users update own payment proofs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 9. Seed default plans
INSERT INTO public.subscription_plans (name, slug, target_audience, description, price_mzn, billing_period, features, badge, sort_order) VALUES
  ('Health Pass Básico', 'health-pass-basic', 'patient', 'Acesso prioritário a consultas e descontos em farmácia.', 250, 'monthly', '["10% desconto em consultas","Entregas prioritárias de receitas","Suporte 24/7"]'::jsonb, NULL, 1),
  ('Health Pass Premium', 'health-pass-premium', 'patient', 'Tudo do básico + consultas ilimitadas com clínico geral.', 750, 'monthly', '["Consultas ilimitadas (clínico geral)","20% desconto em especialistas","30% desconto em farmácia","Cadeia de frio incluída","Suporte VIP"]'::jsonb, 'Mais Popular', 2),
  ('Médico Pro', 'doctor-pro', 'doctor', 'Visibilidade destacada e ferramentas de gestão para médicos.', 1500, 'monthly', '["Perfil destacado","Receitas digitais ilimitadas","Dashboard analítico","Sem comissão até 50 consultas"]'::jsonb, NULL, 10),
  ('Clínica Pro', 'clinic-pro', 'clinic', 'Portal completo para clínicas com múltiplos médicos.', 5000, 'monthly', '["Até 10 médicos","Gestão de agenda integrada","Branding da clínica","Relatórios financeiros","Suporte dedicado"]'::jsonb, NULL, 20)
ON CONFLICT (slug) DO NOTHING;

-- 10. Realtime for subscriptions (admin reviews)
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
