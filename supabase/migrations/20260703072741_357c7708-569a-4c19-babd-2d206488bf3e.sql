
-- Lab exam catalog
CREATE TABLE public.lab_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lab_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  description TEXT,
  price_mzn NUMERIC(10,2) NOT NULL DEFAULT 0,
  prep_instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lab_exams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_exams TO authenticated;
GRANT ALL ON public.lab_exams TO service_role;
ALTER TABLE public.lab_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_exams_public_read" ON public.lab_exams FOR SELECT USING (is_active = true);
CREATE POLICY "lab_exams_lab_owner_manage" ON public.lab_exams FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = lab_id AND c.owner_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = lab_id AND c.owner_id = auth.uid())
  );

CREATE TRIGGER trg_lab_exams_updated BEFORE UPDATE ON public.lab_exams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_lab_exams_lab ON public.lab_exams(lab_id);
CREATE INDEX idx_lab_exams_category ON public.lab_exams(category);

-- Lab exam orders
CREATE TABLE public.lab_exam_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lab_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE RESTRICT,
  patient_name TEXT NOT NULL,
  patient_phone TEXT,
  scheduled_at TIMESTAMPTZ,
  home_collection BOOLEAN NOT NULL DEFAULT false,
  collection_address TEXT,
  collection_city TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_mzn NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  result_url TEXT,
  result_uploaded_at TIMESTAMPTZ,
  wallet_tx_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_exam_orders TO authenticated;
GRANT ALL ON public.lab_exam_orders TO service_role;
ALTER TABLE public.lab_exam_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_orders_patient_read" ON public.lab_exam_orders FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = lab_id AND c.owner_id = auth.uid())
  );
CREATE POLICY "lab_orders_patient_insert" ON public.lab_exam_orders FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "lab_orders_update" ON public.lab_exam_orders FOR UPDATE
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = lab_id AND c.owner_id = auth.uid())
  );

CREATE TRIGGER trg_lab_exam_orders_updated BEFORE UPDATE ON public.lab_exam_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_lab_orders_user ON public.lab_exam_orders(user_id);
CREATE INDEX idx_lab_orders_lab ON public.lab_exam_orders(lab_id);
CREATE INDEX idx_lab_orders_status ON public.lab_exam_orders(status);

-- Admin actions for advertisements
CREATE OR REPLACE FUNCTION public.moderate_ad(_id uuid, _action text, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas admin';
  END IF;
  IF _action NOT IN ('approved','rejected','suspended','pending') THEN
    RAISE EXCEPTION 'Ação inválida';
  END IF;
  UPDATE public.advertisements SET status = _action, admin_notes = COALESCE(_notes, admin_notes), updated_at = now()
    WHERE id = _id;
  RETURN jsonb_build_object('ok', true, 'status', _action);
END; $$;
