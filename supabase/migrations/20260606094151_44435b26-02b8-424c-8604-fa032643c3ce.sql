
-- Availability slots
CREATE TABLE public.doctor_availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_booked boolean NOT NULL DEFAULT false,
  consultation_id uuid REFERENCES public.consultations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_slots_doctor ON public.doctor_availability_slots(doctor_id, starts_at);
GRANT SELECT ON public.doctor_availability_slots TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.doctor_availability_slots TO authenticated;
GRANT ALL ON public.doctor_availability_slots TO service_role;
ALTER TABLE public.doctor_availability_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views slots" ON public.doctor_availability_slots FOR SELECT USING (true);
CREATE POLICY "Doctor manages own slots" ON public.doctor_availability_slots
  FOR ALL TO authenticated USING (doctor_id = auth.uid()) WITH CHECK (doctor_id = auth.uid());
CREATE POLICY "Patient books slot" ON public.doctor_availability_slots
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Doctor reviews
CREATE TABLE public.doctor_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL UNIQUE REFERENCES public.consultations(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_doctor_reviews_doctor ON public.doctor_reviews(doctor_id);
GRANT SELECT ON public.doctor_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.doctor_reviews TO authenticated;
GRANT ALL ON public.doctor_reviews TO service_role;
ALTER TABLE public.doctor_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads doctor reviews" ON public.doctor_reviews FOR SELECT USING (true);
CREATE POLICY "Patient writes own review" ON public.doctor_reviews
  FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Patient updates own review" ON public.doctor_reviews
  FOR UPDATE TO authenticated USING (patient_id = auth.uid());

-- Update doctor avg rating when a review is inserted
CREATE OR REPLACE FUNCTION public.update_doctor_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.doctor_profiles
  SET rating = COALESCE((SELECT AVG(rating)::numeric(3,2) FROM public.doctor_reviews WHERE doctor_id = NEW.doctor_id), 0)
  WHERE user_id = NEW.doctor_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_update_doctor_rating
AFTER INSERT OR UPDATE ON public.doctor_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_doctor_rating();

-- Consultation follow-ups
CREATE TABLE public.consultation_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'check_in',
  due_at timestamptz NOT NULL DEFAULT (now() + interval '3 days'),
  message text NOT NULL DEFAULT 'Como te sentes após a tua consulta? Lembra-te de seguir as recomendações médicas.',
  dismissed_at timestamptz,
  rebooked_consultation_id uuid REFERENCES public.consultations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_followups_patient ON public.consultation_followups(patient_id, due_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_followups TO authenticated;
GRANT ALL ON public.consultation_followups TO service_role;
ALTER TABLE public.consultation_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patient or doctor sees followups" ON public.consultation_followups
  FOR SELECT TO authenticated USING (patient_id = auth.uid() OR doctor_id = auth.uid());
CREATE POLICY "Patient updates own followup" ON public.consultation_followups
  FOR UPDATE TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "System inserts followups" ON public.consultation_followups
  FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid() OR doctor_id = auth.uid());

-- Auto-create follow-up when consultation completes
CREATE OR REPLACE FUNCTION public.create_followup_on_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    INSERT INTO public.consultation_followups (consultation_id, patient_id, doctor_id, due_at)
    VALUES (NEW.id, NEW.patient_id, NEW.doctor_id, now() + interval '3 days')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_followup_on_complete
AFTER UPDATE ON public.consultations
FOR EACH ROW EXECUTE FUNCTION public.create_followup_on_complete();

-- Attachment metadata
ALTER TABLE public.consultation_messages ADD COLUMN IF NOT EXISTS attachment_type text;
ALTER TABLE public.consultation_messages ADD COLUMN IF NOT EXISTS attachment_name text;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_followups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_availability_slots;
