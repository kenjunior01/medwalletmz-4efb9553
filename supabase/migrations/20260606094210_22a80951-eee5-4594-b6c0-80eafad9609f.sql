
CREATE POLICY "Participants upload consultation attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'consultation-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Participants read consultation attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'consultation-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE (c.doctor_id = auth.uid() OR c.patient_id = auth.uid())
        AND (storage.foldername(name))[2] = c.id::text
    )
  )
);
