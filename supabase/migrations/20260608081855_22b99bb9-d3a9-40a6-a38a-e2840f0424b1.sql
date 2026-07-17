
-- Pharmacy linkage on prescriptions
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS suggested_pharmacy_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chosen_pharmacy_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pharmacy_confirmed_at timestamptz;

-- Follow-up rebooking: link to a new scheduled consultation
ALTER TABLE public.consultation_followups
  ADD COLUMN IF NOT EXISTS rebooked_consultation_id uuid REFERENCES public.consultations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rebooked_at timestamptz;

-- Allow patient to confirm/choose pharmacy on their own prescription
DROP POLICY IF EXISTS "Patients can confirm pharmacy on their prescriptions" ON public.prescriptions;
CREATE POLICY "Patients can confirm pharmacy on their prescriptions"
  ON public.prescriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);
