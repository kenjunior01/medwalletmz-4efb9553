
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_professional(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_coupon(text, uuid, text, text, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_proposal(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_proposal(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bootstrap_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resolve_withdrawal(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.moderate_ad(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.moderate_lab(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.lab_order_set_result(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.wallet_admin_adjust(uuid, numeric, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
