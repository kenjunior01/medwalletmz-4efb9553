-- Migration: add health_onboarding_completed_at column to patient_profiles
-- Purpose: persist that the user has completed (or dismissed) the health onboarding
--          modal so it does NOT reappear on every Home visit.
-- Strategy:
--   * Adds a nullable timestamp column `health_onboarding_completed_at`.
--   * Back-fills existing rows that already have blood_type set (they completed
--     onboarding in a previous version that used blood_type as the completion flag).
--   * RLS stays unchanged (users can only update their own row).
--   * Frontend has a fallback that uses `blood_type != null` when this column
--     does not exist yet, so the migration is non-breaking.

ALTER TABLE public.patient_profiles
  ADD COLUMN IF NOT EXISTS health_onboarding_completed_at timestamptz;

-- Backfill rows that already completed the previous onboarding (had blood_type)
UPDATE public.patient_profiles
SET health_onboarding_completed_at = COALESCE(updated_at, now())
WHERE blood_type IS NOT NULL
  AND health_onboarding_completed_at IS NULL;

-- Helpful index for admin reporting
CREATE INDEX IF NOT EXISTS idx_patient_profiles_health_onboarding_completed_at
  ON public.patient_profiles (health_onboarding_completed_at)
  WHERE health_onboarding_completed_at IS NOT NULL;
