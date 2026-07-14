-- Add onboarding_completed flag to profiles and backfill existing users
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Backfill: existing users are considered onboarded so they don't get prompted again
UPDATE public.profiles SET onboarding_completed = true WHERE onboarding_completed = false;