
-- Ensure default status
ALTER TABLE public.wallet_transactions ALTER COLUMN status SET DEFAULT 'confirmed';
UPDATE public.wallet_transactions SET status = 'confirmed' WHERE status IS NULL;

-- user_coupons unique to prevent double redemption
CREATE UNIQUE INDEX IF NOT EXISTS user_coupons_user_coupon_uidx ON public.user_coupons(user_id, coupon_id);

-- ===== wallet_refund =====
CREATE OR REPLACE FUNCTION public.wallet_refund(_tx_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx public.wallet_transactions;
  new_bal NUMERIC;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas admin pode reembolsar';
  END IF;
  SELECT * INTO tx FROM public.wallet_transactions WHERE id = _tx_id FOR UPDATE;
  IF tx IS NULL THEN RAISE EXCEPTION 'Transação não encontrada'; END IF;
  IF tx.status = 'refunded' THEN RAISE EXCEPTION 'Já reembolsada'; END IF;
  IF tx.type <> 'debit' THEN RAISE EXCEPTION 'Apenas débitos podem ser reembolsados'; END IF;

  PERFORM public.ensure_wallet(tx.user_id);
  UPDATE public.wallets SET balance_mzn = balance_mzn + tx.amount,
    total_spent = GREATEST(0, total_spent - tx.amount)
    WHERE user_id = tx.user_id RETURNING balance_mzn INTO new_bal;

  UPDATE public.wallet_transactions SET status = 'refunded' WHERE id = tx.id;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, description, status, metadata)
  VALUES (tx.user_id, 'refund', tx.amount, new_bal, tx.reference_type, tx.reference_id,
    COALESCE(_reason, 'Reembolso de ' || COALESCE(tx.description, tx.reference_type)),
    'confirmed', jsonb_build_object('refund_of', tx.id));

  RETURN jsonb_build_object('balance', new_bal);
END;
$$;

-- ===== wallet_admin_adjust =====
CREATE OR REPLACE FUNCTION public.wallet_admin_adjust(_user_id uuid, _amount numeric, _direction text, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_bal NUMERIC; cur_bal NUMERIC;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas admin';
  END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  PERFORM public.ensure_wallet(_user_id);
  IF _direction = 'credit' THEN
    UPDATE public.wallets SET balance_mzn = balance_mzn + _amount WHERE user_id = _user_id RETURNING balance_mzn INTO new_bal;
    INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_type, description, status, metadata)
    VALUES (_user_id, 'credit', _amount, new_bal, 'admin_adjust', COALESCE(_reason, 'Ajuste manual'), 'confirmed',
      jsonb_build_object('admin_id', auth.uid()));
  ELSIF _direction = 'debit' THEN
    SELECT balance_mzn INTO cur_bal FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
    IF cur_bal < _amount THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;
    UPDATE public.wallets SET balance_mzn = balance_mzn - _amount WHERE user_id = _user_id RETURNING balance_mzn INTO new_bal;
    INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_type, description, status, metadata)
    VALUES (_user_id, 'debit', _amount, new_bal, 'admin_adjust', COALESCE(_reason, 'Ajuste manual'), 'confirmed',
      jsonb_build_object('admin_id', auth.uid()));
  ELSE
    RAISE EXCEPTION 'Direção inválida';
  END IF;
  RETURN jsonb_build_object('balance', new_bal);
END;
$$;

-- ===== validate_coupon =====
CREATE OR REPLACE FUNCTION public.validate_coupon(
  _code text, _user_id uuid, _service_type text, _event_type text DEFAULT NULL, _order_value numeric DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.coupons;
  user_role app_role;
  already_used BOOLEAN;
  discount NUMERIC;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE upper(code) = upper(_code) LIMIT 1;
  IF c IS NULL THEN RETURN jsonb_build_object('valid', false, 'error', 'Cupão não encontrado'); END IF;
  IF NOT COALESCE(c.is_active, true) THEN RETURN jsonb_build_object('valid', false, 'error', 'Cupão inativo'); END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupão expirado'); END IF;
  IF c.max_uses IS NOT NULL AND COALESCE(c.used_count,0) >= c.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Limite de utilizações atingido'); END IF;
  IF c.min_order_value IS NOT NULL AND _order_value < c.min_order_value THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Valor mínimo: ' || c.min_order_value || ' MZN'); END IF;

  IF c.target_services IS NOT NULL AND array_length(c.target_services,1) > 0
    AND NOT (_service_type = ANY(c.target_services)) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupão não válido para este serviço'); END IF;

  IF c.event_type IS NOT NULL AND c.event_type <> '' AND COALESCE(_event_type,'') <> c.event_type THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupão só válido em: ' || c.event_type); END IF;

  IF c.target_roles IS NOT NULL AND array_length(c.target_roles,1) > 0 THEN
    SELECT role INTO user_role FROM public.user_roles WHERE user_id = _user_id
      AND role::text = ANY(c.target_roles) LIMIT 1;
    IF user_role IS NULL THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Cupão não disponível para o seu perfil'); END IF;
  END IF;

  IF c.assigned_to_user IS NOT NULL AND c.assigned_to_user <> _user_id THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupão atribuído a outro utilizador'); END IF;

  SELECT EXISTS(SELECT 1 FROM public.user_coupons WHERE user_id = _user_id AND coupon_id = c.id) INTO already_used;
  IF already_used THEN RETURN jsonb_build_object('valid', false, 'error', 'Já utilizaste este cupão'); END IF;

  IF c.discount_type = 'percentage' THEN
    discount := ROUND(_order_value * c.discount_value / 100, 2);
  ELSE
    discount := LEAST(c.discount_value, _order_value);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', c.id,
    'code', c.code,
    'discount_type', c.discount_type,
    'discount_value', c.discount_value,
    'discount', discount,
    'final_value', _order_value - discount
  );
END;
$$;

-- ===== redeem_coupon (marks usage) =====
CREATE OR REPLACE FUNCTION public.redeem_coupon(_coupon_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_coupons (user_id, coupon_id, used_at)
    VALUES (_user_id, _coupon_id, now())
    ON CONFLICT (user_id, coupon_id) DO NOTHING;
  UPDATE public.coupons SET used_count = COALESCE(used_count,0) + 1 WHERE id = _coupon_id;
END;
$$;

-- ===== pay_service: integrated debit + commission + coupon =====
CREATE OR REPLACE FUNCTION public.pay_service(
  _user_id uuid, _service_type text, _ref_id uuid, _gross_amount numeric,
  _coupon_id uuid DEFAULT NULL, _description text DEFAULT NULL, _provider_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  discount NUMERIC := 0;
  final NUMERIC;
  pct NUMERIC := 0;
  commission NUMERIC := 0;
  bal NUMERIC;
  c public.coupons;
BEGIN
  IF _gross_amount <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;

  IF _coupon_id IS NOT NULL THEN
    SELECT * INTO c FROM public.coupons WHERE id = _coupon_id;
    IF c IS NOT NULL THEN
      IF c.discount_type = 'percentage' THEN discount := ROUND(_gross_amount * c.discount_value / 100, 2);
      ELSE discount := LEAST(c.discount_value, _gross_amount); END IF;
    END IF;
  END IF;

  final := GREATEST(_gross_amount - discount, 0);

  PERFORM public.ensure_wallet(_user_id);
  SELECT balance_mzn INTO bal FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF bal < final THEN RAISE EXCEPTION 'Saldo insuficiente. Atual: % MZN, requerido: % MZN', bal, final; END IF;

  UPDATE public.wallets SET balance_mzn = balance_mzn - final, total_spent = total_spent + final
    WHERE user_id = _user_id RETURNING balance_mzn INTO bal;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, description, status, metadata)
  VALUES (_user_id, 'debit', final, bal, _service_type, _ref_id,
    COALESCE(_description, 'Pagamento ' || _service_type), 'confirmed',
    jsonb_build_object('gross', _gross_amount, 'discount', discount, 'coupon_id', _coupon_id));

  IF _coupon_id IS NOT NULL AND c IS NOT NULL THEN
    PERFORM public.redeem_coupon(_coupon_id, _user_id);
  END IF;

  -- credit provider net (minus commission) if provider given
  IF _provider_id IS NOT NULL THEN
    SELECT percentage INTO pct FROM public.service_commissions
      WHERE service_type = _service_type AND is_active = true ORDER BY created_at DESC LIMIT 1;
    commission := ROUND(final * COALESCE(pct,0) / 100, 2);
    IF final - commission > 0 THEN
      PERFORM public.wallet_credit(_provider_id, final - commission, 'credit', _ref_id,
        'Recebimento ' || _service_type || ' (líquido)');
    END IF;
    IF commission > 0 THEN
      INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, description, status)
      VALUES (_provider_id, 'commission', commission, 0, _service_type, _ref_id,
        'Comissão plataforma ' || pct || '%', 'confirmed');
    END IF;
  END IF;

  RETURN jsonb_build_object('balance', bal, 'paid', final, 'discount', discount, 'gross', _gross_amount, 'commission', commission);
END;
$$;
