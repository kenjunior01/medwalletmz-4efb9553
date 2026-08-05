ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_prefs jsonb NOT NULL DEFAULT '{"welcome": true, "orders": true, "alerts": true}'::jsonb;