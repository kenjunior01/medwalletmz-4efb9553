
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS prescription_id uuid,
  ADD COLUMN IF NOT EXISTS is_priority boolean NOT NULL DEFAULT false;

ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS pharmacy_store_id uuid;

CREATE INDEX IF NOT EXISTS idx_orders_prescription_id ON public.orders(prescription_id);
CREATE INDEX IF NOT EXISTS idx_orders_is_priority ON public.orders(is_priority) WHERE is_priority = true;
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON public.prescriptions(doctor_id);

-- Permite ao médico prescritor ver o pedido derivado da sua receita
CREATE POLICY "Doctor views orders from own prescriptions"
ON public.orders FOR SELECT TO authenticated
USING (
  prescription_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.prescriptions p
    WHERE p.id = orders.prescription_id AND p.doctor_id = auth.uid()
  )
);
