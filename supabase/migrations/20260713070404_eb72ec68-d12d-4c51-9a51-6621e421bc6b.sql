CREATE OR REPLACE FUNCTION public.wallet_currency_for_country(_country_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT currency_code FROM public.countries WHERE id = COALESCE(_country_id, 'MZ') LIMIT 1),
    CASE COALESCE(_country_id, 'MZ')
      WHEN 'BR' THEN 'BRL'
      WHEN 'AO' THEN 'AOA'
      WHEN 'ZA' THEN 'ZAR'
      WHEN 'PT' THEN 'EUR'
      WHEN 'IN' THEN 'INR'
      ELSE 'MZN'
    END
  )
$$;

CREATE OR REPLACE FUNCTION public.ensure_wallet(_user_id uuid)
RETURNS wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  w public.wallets;
  profile_country text;
  wallet_country text;
  wallet_currency text;
BEGIN
  SELECT COALESCE(country_id, 'MZ') INTO profile_country
  FROM public.profiles
  WHERE user_id = _user_id;

  profile_country := COALESCE(profile_country, 'MZ');
  wallet_currency := public.wallet_currency_for_country(profile_country);

  INSERT INTO public.wallets (user_id, country_id, currency, balance_mzn, total_deposited, total_spent)
  VALUES (_user_id, profile_country, wallet_currency, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT COALESCE(country_id, profile_country), COALESCE(currency, wallet_currency)
    INTO wallet_country, wallet_currency
  FROM public.wallets
  WHERE user_id = _user_id;

  IF wallet_country IS DISTINCT FROM profile_country OR wallet_currency IS DISTINCT FROM public.wallet_currency_for_country(profile_country) THEN
    UPDATE public.wallets
    SET country_id = profile_country,
        currency = public.wallet_currency_for_country(profile_country),
        updated_at = now()
    WHERE user_id = _user_id;
  END IF;

  SELECT * INTO w FROM public.wallets WHERE user_id = _user_id;
  RETURN w;
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_deposit(_user_id uuid, _amount numeric, _method text DEFAULT 'wallet'::text, _ref uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_bal NUMERIC;
  bonus_pct NUMERIC;
  bonus NUMERIC;
  w public.wallets;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  w := public.ensure_wallet(_user_id);
  SELECT COALESCE((value::text)::numeric, 0) INTO bonus_pct FROM public.platform_settings WHERE key = 'deposit_bonus_percent';
  bonus := ROUND(_amount * COALESCE(bonus_pct,0) / 100, 2);

  UPDATE public.wallets
    SET balance_mzn = balance_mzn + _amount + bonus,
        total_deposited = total_deposited + _amount,
        country_id = w.country_id,
        currency = w.currency,
        updated_at = now()
    WHERE user_id = _user_id
    RETURNING balance_mzn INTO new_bal;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, description, payment_method)
  VALUES (_user_id, 'deposit', _amount, new_bal - bonus, 'deposit', _ref, 'Depósito via ' || _method, _method);

  IF bonus > 0 THEN
    INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_type, description)
    VALUES (_user_id, 'bonus', bonus, new_bal, 'deposit_bonus', 'Bónus de depósito ' || bonus_pct || '%');
  END IF;

  RETURN jsonb_build_object('balance', new_bal, 'bonus', bonus, 'currency', w.currency, 'country_id', w.country_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_debit(_user_id uuid, _amount numeric, _service_type text, _ref_id uuid, _description text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cur_bal NUMERIC;
  new_bal NUMERIC;
  w public.wallets;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  w := public.ensure_wallet(_user_id);
  SELECT balance_mzn INTO cur_bal FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF cur_bal < _amount THEN
    RAISE EXCEPTION 'Saldo insuficiente. Atual: % %, requerido: % %', cur_bal, w.currency, _amount, w.currency;
  END IF;

  UPDATE public.wallets
    SET balance_mzn = balance_mzn - _amount,
        total_spent = total_spent + _amount,
        country_id = w.country_id,
        currency = w.currency,
        updated_at = now()
    WHERE user_id = _user_id
    RETURNING balance_mzn INTO new_bal;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, description)
  VALUES (_user_id, 'debit', _amount, new_bal, _service_type, _ref_id, COALESCE(_description, 'Pagamento ' || _service_type));

  RETURN jsonb_build_object('balance', new_bal, 'currency', w.currency, 'country_id', w.country_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_credit(_user_id uuid, _amount numeric, _type text DEFAULT 'credit'::text, _ref_id uuid DEFAULT NULL::uuid, _description text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_bal NUMERIC;
  w public.wallets;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  w := public.ensure_wallet(_user_id);
  UPDATE public.wallets
    SET balance_mzn = balance_mzn + _amount,
        country_id = w.country_id,
        currency = w.currency,
        updated_at = now()
    WHERE user_id = _user_id
    RETURNING balance_mzn INTO new_bal;
  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, description)
  VALUES (_user_id, _type, _amount, new_bal, _type, _ref_id, COALESCE(_description, 'Crédito'));
  RETURN jsonb_build_object('balance', new_bal, 'currency', w.currency, 'country_id', w.country_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.pay_service(_user_id uuid, _service_type text, _ref_id uuid, _gross_amount numeric, _coupon_id uuid DEFAULT NULL::uuid, _description text DEFAULT NULL::text, _provider_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  discount NUMERIC := 0;
  final NUMERIC;
  pct NUMERIC := 0;
  commission NUMERIC := 0;
  bal NUMERIC;
  c public.coupons;
  w public.wallets;
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

  w := public.ensure_wallet(_user_id);
  SELECT balance_mzn INTO bal FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF bal < final THEN RAISE EXCEPTION 'Saldo insuficiente. Atual: % %, requerido: % %', bal, w.currency, final, w.currency; END IF;

  UPDATE public.wallets SET balance_mzn = balance_mzn - final, total_spent = total_spent + final, country_id = w.country_id, currency = w.currency, updated_at = now()
    WHERE user_id = _user_id RETURNING balance_mzn INTO bal;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, description, status, metadata)
  VALUES (_user_id, 'debit', final, bal, _service_type, _ref_id,
    COALESCE(_description, 'Pagamento ' || _service_type), 'confirmed',
    jsonb_build_object('gross', _gross_amount, 'discount', discount, 'coupon_id', _coupon_id));

  IF _coupon_id IS NOT NULL AND c IS NOT NULL THEN
    PERFORM public.redeem_coupon(_coupon_id, _user_id);
  END IF;

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

  RETURN jsonb_build_object('balance', bal, 'paid', final, 'discount', discount, 'gross', _gross_amount, 'commission', commission, 'currency', w.currency, 'country_id', w.country_id);
END;
$$;