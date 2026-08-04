-- 1. Security definer views -> invoker
ALTER VIEW public.blood_requests_public SET (security_invoker = on);
ALTER VIEW public.blood_donors_public SET (security_invoker = on);

-- 2. Trigger-only / internal functions must not be callable via the API
REVOKE ALL ON FUNCTION public.award_professional_referral() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.set_order_country() FROM anon, authenticated;

-- 3. Sensitive RPCs should require an authenticated session
REVOKE ALL ON FUNCTION public.book_consultation_atomic(uuid, text, uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.get_or_create_direct_thread(uuid, text, text, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.redeem_referral_code(text) FROM anon;

-- 4. Money-minting wallet functions: internal/admin only
REVOKE ALL ON FUNCTION public.wallet_credit(uuid, numeric, text, uuid, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_deposit(uuid, numeric, text, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_refund(uuid, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_admin_adjust(uuid, numeric, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_credit(uuid, numeric, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wallet_deposit(uuid, numeric, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.wallet_refund(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wallet_admin_adjust(uuid, numeric, text, text) TO service_role;

-- 5. M-Pesa: drop phone-match leak policy
DROP POLICY IF EXISTS "mpesa owner read" ON public.mpesa_manual_payments;