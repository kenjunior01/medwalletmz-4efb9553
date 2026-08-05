-- 1) Column-level protection for doctor licence fields
REVOKE SELECT ON public.doctor_profiles FROM authenticated, anon;
GRANT SELECT (id, user_id, specialty_id, bio, consultation_fee, years_experience, languages, avatar_url, is_verified, is_available, rating, total_consultations, created_at, updated_at, latitude, longitude) ON public.doctor_profiles TO authenticated, anon;
GRANT SELECT (license_number, license_url) ON public.doctor_profiles TO service_role;
GRANT ALL ON public.doctor_profiles TO service_role;

-- 2) Revoke anon EXECUTE on SECURITY DEFINER functions not meant for public use
REVOKE ALL ON FUNCTION public.award_professional_referral() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.set_order_country() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.book_consultation_atomic(uuid, text, uuid, boolean) FROM anon, public;
REVOKE ALL ON FUNCTION public.get_or_create_direct_thread(uuid, text, text, uuid, text) FROM anon, public;
REVOKE ALL ON FUNCTION public.redeem_referral_code(text) FROM anon, public;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_country_manager(uuid, text) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_professional(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.professional_min_balance() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.wallet_currency_for_country(text) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.wallet_debit(uuid, numeric, text, uuid, text) FROM anon, public;

-- keep RLS helper functions callable by signed-in users (needed by policies)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_country_manager(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_professional(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.book_consultation_atomic(uuid, text, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_thread(uuid, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_referral_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_debit(uuid, numeric, text, uuid, text) TO authenticated;

-- 3) Revoke authenticated EXECUTE on internal-only SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.get_driver_vehicles(uuid) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.get_user_roles(uuid) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.pay_service(uuid, text, uuid, numeric, uuid, text, uuid) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.redeem_coupon(uuid, uuid) FROM anon, authenticated, public;