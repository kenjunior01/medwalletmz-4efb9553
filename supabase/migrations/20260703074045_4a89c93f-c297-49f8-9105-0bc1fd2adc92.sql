
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (
  user_id, id, full_name, phone, avatar_url, default_city, referral_code, created_at, updated_at,
  vehicle_type, is_available, is_verified_driver, health_certified, verified_at, referred_by
) ON public.profiles TO authenticated;
