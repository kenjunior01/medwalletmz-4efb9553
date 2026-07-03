
-- Path convention: {lab_id}/{order_id}.pdf
CREATE POLICY "lab_results_owner_admin_write" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'lab-results' AND (
      public.has_role(auth.uid(), 'admin') OR
      EXISTS(SELECT 1 FROM public.clinics c WHERE c.id::text = (storage.foldername(name))[1] AND c.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    bucket_id = 'lab-results' AND (
      public.has_role(auth.uid(), 'admin') OR
      EXISTS(SELECT 1 FROM public.clinics c WHERE c.id::text = (storage.foldername(name))[1] AND c.owner_id = auth.uid())
    )
  );

CREATE POLICY "lab_results_patient_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'lab-results' AND EXISTS(
      SELECT 1 FROM public.lab_exam_orders o
      WHERE o.lab_id::text = (storage.foldername(name))[1]
        AND o.user_id = auth.uid()
        AND o.status = 'completed'
        AND o.result_url IS NOT NULL
    )
  );
