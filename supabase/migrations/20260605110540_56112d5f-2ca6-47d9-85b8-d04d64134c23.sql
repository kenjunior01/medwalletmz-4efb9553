
-- Patient manages own files in medical-records bucket (path prefix = user_id)
CREATE POLICY "Patient uploads own medical files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'medical-records'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Patient reads own medical files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'medical-records'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Patient deletes own medical files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'medical-records'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Doctor reads shared medical files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'medical-records'
    AND EXISTS (
      SELECT 1
      FROM public.medical_record_shares s
      JOIN public.medical_records r ON r.id = s.record_id
      WHERE s.doctor_id = auth.uid()
        AND s.revoked_at IS NULL
        AND r.file_url = storage.objects.name
    )
  );
