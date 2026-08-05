ALTER TABLE public.manager_applications
  ADD COLUMN IF NOT EXISTS phase_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cv_url text,
  ADD COLUMN IF NOT EXISTS simulation jsonb NOT NULL DEFAULT '{}'::jsonb;