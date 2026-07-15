-- Ensure country_id column exists on user_roles (idempotent re-apply)
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS country_id TEXT REFERENCES public.countries(id);
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_role_country_key'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_country_key UNIQUE (user_id, role, country_id);
  END IF;
END $$;

-- Add veterinary role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'veterinary';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hospital';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lab';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'insurance';