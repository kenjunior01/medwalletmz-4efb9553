
DROP POLICY IF EXISTS "mpesa proofs owner upload" ON storage.objects;
CREATE POLICY "mpesa proofs owner upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mpesa-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "mpesa proofs owner read" ON storage.objects;
CREATE POLICY "mpesa proofs owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'mpesa-proofs' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'country_manager')
  ));

DROP POLICY IF EXISTS "mpesa proofs owner delete" ON storage.objects;
CREATE POLICY "mpesa proofs owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'mpesa-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
