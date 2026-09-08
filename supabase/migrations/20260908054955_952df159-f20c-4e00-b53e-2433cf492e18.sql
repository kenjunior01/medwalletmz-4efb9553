CREATE OR REPLACE FUNCTION public.list_public_doctors(_specialty_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  specialty_id uuid,
  bio text,
  consultation_fee integer,
  years_experience integer,
  languages text[],
  avatar_url text,
  is_verified boolean,
  is_available boolean,
  rating numeric,
  total_consultations integer,
  latitude numeric,
  longitude numeric,
  full_name text,
  profile_avatar_url text,
  default_city text,
  specialty_name text,
  specialty_icon text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id,
    d.user_id,
    d.specialty_id,
    d.bio,
    d.consultation_fee,
    d.years_experience,
    d.languages,
    d.avatar_url,
    d.is_verified,
    d.is_available,
    d.rating,
    d.total_consultations,
    d.latitude,
    d.longitude,
    p.full_name,
    p.avatar_url AS profile_avatar_url,
    p.default_city,
    s.name AS specialty_name,
    s.icon AS specialty_icon
  FROM public.doctor_profiles d
  LEFT JOIN public.profiles p ON p.user_id = d.user_id
  LEFT JOIN public.medical_specialties s ON s.id = d.specialty_id
  WHERE d.is_available = true
    AND (_specialty_id IS NULL OR d.specialty_id = _specialty_id)
  ORDER BY d.is_verified DESC, d.rating DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.list_public_doctors(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_doctors(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_public_clinic_doctors(_clinic_id uuid)
RETURNS TABLE (
  id uuid,
  clinic_id uuid,
  doctor_id uuid,
  role text,
  joined_at timestamptz,
  full_name text,
  avatar_url text,
  specialty_name text,
  is_verified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cd.id,
    cd.clinic_id,
    cd.doctor_id,
    cd.role,
    cd.joined_at,
    p.full_name,
    COALESCE(d.avatar_url, p.avatar_url) AS avatar_url,
    s.name AS specialty_name,
    d.is_verified
  FROM public.clinic_doctors cd
  JOIN public.doctor_profiles d ON d.user_id = cd.doctor_id
  LEFT JOIN public.profiles p ON p.user_id = cd.doctor_id
  LEFT JOIN public.medical_specialties s ON s.id = d.specialty_id
  WHERE cd.clinic_id = _clinic_id
    AND d.is_available = true
  ORDER BY d.is_verified DESC, p.full_name;
$$;

REVOKE ALL ON FUNCTION public.list_public_clinic_doctors(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_clinic_doctors(uuid) TO anon, authenticated, service_role;

GRANT SELECT ON public.hospitals TO anon, authenticated;
GRANT SELECT ON public.pharmacies TO anon, authenticated;
GRANT ALL ON public.hospitals TO service_role;
GRANT ALL ON public.pharmacies TO service_role;