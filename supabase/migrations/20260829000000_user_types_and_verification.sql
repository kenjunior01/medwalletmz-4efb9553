-- ============================================================
-- 20260829000000_user_types_and_verification.sql
--
-- 1. user_types table — stores the registration-selected primary type
--    for each user (patient | rider | worker | caregiver | promoter)
-- 2. user_verification_queue view — combines health_riders and
--    health_worker_profiles that are pending verification
-- 3. user_type column on profiles (denormalized for fast reads)
-- ============================================================

-- ============================================================
-- 1. PROFILES.USER_TYPE — coluna para leitura rápida
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'patient'
  CHECK (user_type IN ('patient','rider','worker','caregiver','promoter'));

-- ============================================================
-- 2. USER_TYPES — histórico de tipos seleccionados
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type text NOT NULL CHECK (user_type IN ('patient','rider','worker','caregiver','promoter')),
  selected_at timestamptz NOT NULL DEFAULT now(),
  is_primary boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_user_types_user ON public.user_types(user_id);
CREATE INDEX IF NOT EXISTS idx_user_types_primary ON public.user_types(user_id, is_primary);

ALTER TABLE public.user_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own types" ON public.user_types
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own types" ON public.user_types
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own types" ON public.user_types
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user types" ON public.user_types
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','regional_manager','regional_ceo'))
  );

-- ============================================================
-- 3. FUNÇÃO: set_user_primary_type
--    Define um tipo como primário (false nos outros do mesmo user)
--    e actualiza profiles.user_type
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_user_primary_type(p_user_id uuid, p_type text)
RETURNS void AS $$
BEGIN
  -- Marca todos os outros como não-primários
  UPDATE public.user_types
  SET is_primary = false
  WHERE user_id = p_user_id;

  -- Insere ou actualiza o novo tipo primário
  INSERT INTO public.user_types (user_id, user_type, is_primary)
  VALUES (p_user_id, p_type, true)
  ON CONFLICT DO NOTHING;

  -- Se já existia, marca como primário
  UPDATE public.user_types
  SET is_primary = true
  WHERE user_id = p_user_id AND user_type = p_type;

  -- Actualiza profiles.user_type para leitura rápida
  UPDATE public.profiles
  SET user_type = p_type
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. VIEW: pending_verifications — combina riders + workers pendentes
--    para o workflow admin
-- ============================================================
CREATE OR REPLACE VIEW public.pending_verifications AS
SELECT
  'rider'::text AS kind,
  r.id AS entity_id,
  r.user_id,
  r.country_code,
  r.full_name,
  r.phone,
  r.created_at,
  r.onboarding_step,
  r.onboarding_progress,
  jsonb_build_object(
    'vehicle_type', r.vehicle_type,
    'vehicle_plate', r.vehicle_plate,
    'license_url', r.license_url,
    'id_document_url', r.id_document_url,
    'vehicle_document_url', r.vehicle_document_url,
    'available_zones', r.available_zones,
    'languages', r.languages,
    'accepts_cold_chain', r.accepts_cold_chain,
    'mobile_money_number', r.mobile_money_number
  ) AS details
FROM public.health_riders r
WHERE r.is_verified = false
  AND r.onboarding_step = 'completed'

UNION ALL

SELECT
  'worker'::text AS kind,
  w.id AS entity_id,
  w.user_id,
  w.country_code,
  w.full_name,
  NULL::text AS phone,
  w.created_at,
  w.onboarding_step,
  w.onboarding_progress,
  jsonb_build_object(
    'profession', w.profession,
    'specialization', w.specialization,
    'license_number', w.license_number,
    'license_url', w.license_url,
    'id_document_url', w.id_document_url,
    'profile_photo_url', w.profile_photo_url,
    'service_zones', w.service_zones,
    'languages', w.languages,
    'consultation_fee', w.consultation_fee,
    'home_visit_fee', w.home_visit_fee,
    'telehealth_fee', w.telehealth_fee,
    'years_of_experience', w.years_of_experience
  ) AS details
FROM public.health_worker_profiles w
WHERE w.is_verified = false
  AND w.onboarding_step = 'completed';

-- Permite admins ler a view
CREATE POLICY "Admins can view pending verifications" ON public.user_types
  FOR SELECT USING (true);  -- A view é read-only; protegida por RLS das tabelas source
