
-- =========================================================
-- FASE 3: Solidariedade Ampliada & Notificações Inteligentes
-- =========================================================

-- Tabela de Pedidos de Apoio Médico (Solidariedade)
CREATE TABLE IF NOT EXISTS public.medical_aid_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),

  title text NOT NULL,
  patient_name text NOT NULL,
  patient_age int,
  condition_description text NOT NULL,
  urgency_level text DEFAULT 'normal' CHECK (urgency_level IN ('normal', 'urgent', 'critical')),

  hospital_name text NOT NULL,
  treating_doctor text,

  goal_amount_mzn numeric(12,2) NOT NULL,
  collected_amount_mzn numeric(12,2) DEFAULT 0,

  contact_phone text,
  contact_email text,

  image_url text,
  document_url text, -- Relatórios médicos, orçamentos, etc.
  video_url text,

  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),

  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  admin_notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS para medical_aid_requests
ALTER TABLE public.medical_aid_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requests public read" ON public.medical_aid_requests
  FOR SELECT USING (status = 'approved' OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create requests" ON public.medical_aid_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own requests" ON public.medical_aid_requests
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Tabela de Doações para Solidariedade
CREATE TABLE IF NOT EXISTS public.medical_aid_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.medical_aid_requests(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),

  amount_mzn numeric(12,2) NOT NULL,
  donor_name text DEFAULT 'Anónimo',
  message text,

  payment_method text, -- mpesa, emola, wallet
  payment_reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),

  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS para donations
ALTER TABLE public.medical_aid_donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Donations read" ON public.medical_aid_donations FOR SELECT USING (true);
CREATE POLICY "Public can donate" ON public.medical_aid_donations FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Tabela de Logs de Engagement (Notificações)
CREATE TABLE IF NOT EXISTS public.user_engagement_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  type text NOT NULL, -- referral, blood, education, profile, etc.
  action text NOT NULL, -- shown, clicked, dismissed
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_engagement_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own logs" ON public.user_engagement_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert logs" ON public.user_engagement_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Trigger para atualizar collected_amount
CREATE OR REPLACE FUNCTION public.update_aid_collected_amount()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE public.medical_aid_requests
    SET collected_amount_mzn = collected_amount_mzn + NEW.amount_mzn
    WHERE id = NEW.request_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_aid_collected
  AFTER UPDATE ON public.medical_aid_donations
  FOR EACH ROW EXECUTE FUNCTION public.update_aid_collected_amount();

-- Adicionar role insurance se não existir na constraint (já existe no enum app_role mas bom garantir)
-- Nota: Enums não podem ser alterados facilmente dentro de transações em algumas versões de Postgres,
-- mas aqui o app_role já tem 'insurance' conforme visto no types.ts.

-- Adicionar link para Dashboard de Seguradora no RoleHero
-- (Isso será feito no código React)
