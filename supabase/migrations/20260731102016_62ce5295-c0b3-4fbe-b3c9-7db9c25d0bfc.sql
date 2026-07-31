DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_read_authenticated') THEN
    CREATE POLICY "avatars_read_authenticated" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_insert_own') THEN
    CREATE POLICY "avatars_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_update_own') THEN
    CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND owner = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_delete_own') THEN
    CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND owner = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='licenses_insert_own') THEN
    CREATE POLICY "licenses_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'licenses' AND owner = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='licenses_read_own') THEN
    CREATE POLICY "licenses_read_own" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'licenses' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)));
  END IF;
END $$;