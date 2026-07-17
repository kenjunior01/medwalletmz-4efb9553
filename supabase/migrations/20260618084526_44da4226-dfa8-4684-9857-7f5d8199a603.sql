
-- License URL columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS license_carta_url text,
  ADD COLUMN IF NOT EXISTS license_viatura_url text;

ALTER TABLE public.doctor_profiles
  ADD COLUMN IF NOT EXISTS license_url text;

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS license_url text;

-- Geo coordinates for nearby providers
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

ALTER TABLE public.doctor_profiles
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

CREATE INDEX IF NOT EXISTS idx_stores_geo ON public.stores(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_geo ON public.doctor_profiles(latitude, longitude);

-- Storage RLS for licenses bucket (path layout: {user_id}/{filename})
DROP POLICY IF EXISTS "Users read own licenses" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own licenses" ON storage.objects;
DROP POLICY IF EXISTS "Users update own licenses" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own licenses" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage all licenses" ON storage.objects;

CREATE POLICY "Users read own licenses" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'licenses' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own licenses" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'licenses' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own licenses" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'licenses' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own licenses" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'licenses' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins manage all licenses" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'licenses' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'licenses' AND public.has_role(auth.uid(), 'admin'));

-- Register superadmin email
INSERT INTO public.platform_settings (key, value, description)
VALUES ('superadmin_email', to_jsonb('ernestoventuramjunior@gmail.com'::text), 'Email auto-promovido a admin no signup')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Update handle_new_user to auto-grant admin role to the superadmin email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  super_email text;
BEGIN
  INSERT INTO public.profiles (user_id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  INSERT INTO public.patient_profiles (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;

  SELECT (value #>> '{}')::text INTO super_email FROM public.platform_settings WHERE key = 'superadmin_email';
  IF super_email IS NOT NULL AND lower(NEW.email) = lower(super_email) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
