
CREATE TABLE IF NOT EXISTS public.consultation_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  remind_at timestamptz NOT NULL,
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.consultation_reminders TO authenticated;
GRANT ALL ON public.consultation_reminders TO service_role;

ALTER TABLE public.consultation_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients view own reminders" ON public.consultation_reminders
  FOR SELECT TO authenticated USING (auth.uid() = patient_id OR auth.uid() = doctor_id);
CREATE POLICY "patients insert own reminders" ON public.consultation_reminders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "service updates reminders" ON public.consultation_reminders
  FOR UPDATE TO authenticated USING (auth.uid() = patient_id);

CREATE INDEX IF NOT EXISTS idx_consult_reminders_due ON public.consultation_reminders (remind_at) WHERE sent_at IS NULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_reminders;
ALTER TABLE public.consultation_reminders REPLICA IDENTITY FULL;
