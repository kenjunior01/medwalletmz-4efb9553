
-- 1) Fix stores schema: add phone column used by approve_proposal
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS phone text;

-- 2) Withdrawal requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL,
  destination text NOT NULL,
  destination_name text,
  user_notes text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  processed_by uuid,
  processed_at timestamptz,
  wallet_tx_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own withdrawals" ON public.withdrawal_requests
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own withdrawals" ON public.withdrawal_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update withdrawals" ON public.withdrawal_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_withdrawal_updated_at BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Helper: is user a professional?
CREATE OR REPLACE FUNCTION public.is_professional(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('doctor','clinic','store_owner','driver','admin')
  )
$$;

-- 4) Request withdrawal RPC (debits wallet, holds funds)
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _amount numeric, _method text, _destination text,
  _destination_name text DEFAULT NULL, _notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  uid uuid := auth.uid();
  bal numeric;
  new_bal numeric;
  min_amt numeric;
  tx_id uuid;
  wr_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.is_professional(uid) THEN
    RAISE EXCEPTION 'Apenas profissionais podem pedir levantamentos';
  END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;

  SELECT COALESCE((value::text)::numeric, 100) INTO min_amt
    FROM public.platform_settings WHERE key = 'withdrawal_min_mzn';
  IF _amount < COALESCE(min_amt, 100) THEN
    RAISE EXCEPTION 'Valor mínimo de levantamento: % MZN', COALESCE(min_amt,100);
  END IF;

  PERFORM public.ensure_wallet(uid);
  SELECT balance_mzn INTO bal FROM public.wallets WHERE user_id = uid FOR UPDATE;
  IF bal < _amount THEN
    RAISE EXCEPTION 'Saldo insuficiente. Atual: % MZN', bal;
  END IF;

  UPDATE public.wallets SET balance_mzn = balance_mzn - _amount
    WHERE user_id = uid RETURNING balance_mzn INTO new_bal;

  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_type, description, status, payment_method, metadata)
  VALUES (uid, 'withdrawal_hold', _amount, new_bal, 'withdrawal', 'Pedido de levantamento via ' || _method, 'pending', _method,
    jsonb_build_object('destination', _destination))
  RETURNING id INTO tx_id;

  INSERT INTO public.withdrawal_requests (user_id, amount, method, destination, destination_name, user_notes, wallet_tx_id)
  VALUES (uid, _amount, _method, _destination, _destination_name, _notes, tx_id)
  RETURNING id INTO wr_id;

  RETURN jsonb_build_object('ok', true, 'id', wr_id, 'balance', new_bal);
END; $$;

-- 5) Admin resolve withdrawal (paid or rejected)
CREATE OR REPLACE FUNCTION public.resolve_withdrawal(
  _id uuid, _action text, _notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  wr public.withdrawal_requests;
  new_bal numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas admin';
  END IF;
  SELECT * INTO wr FROM public.withdrawal_requests WHERE id = _id FOR UPDATE;
  IF wr IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF wr.status <> 'pending' THEN RAISE EXCEPTION 'Pedido já processado'; END IF;

  IF _action = 'paid' THEN
    UPDATE public.withdrawal_requests SET status='paid', admin_notes=_notes,
      processed_by=auth.uid(), processed_at=now() WHERE id=_id;
    UPDATE public.wallet_transactions SET status='confirmed',
      type='withdrawal', description='Levantamento pago via ' || wr.method
      WHERE id = wr.wallet_tx_id;
    UPDATE public.wallets SET total_spent = total_spent + wr.amount WHERE user_id = wr.user_id;
    RETURN jsonb_build_object('ok', true, 'status', 'paid');
  ELSIF _action = 'rejected' THEN
    -- refund the wallet
    UPDATE public.wallets SET balance_mzn = balance_mzn + wr.amount
      WHERE user_id = wr.user_id RETURNING balance_mzn INTO new_bal;
    INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference_type, reference_id, description, status, metadata)
    VALUES (wr.user_id, 'refund', wr.amount, new_bal, 'withdrawal', _id,
      'Levantamento rejeitado: ' || COALESCE(_notes,'sem motivo'), 'confirmed',
      jsonb_build_object('withdrawal_id', _id));
    UPDATE public.wallet_transactions SET status='refunded' WHERE id = wr.wallet_tx_id;
    UPDATE public.withdrawal_requests SET status='rejected', admin_notes=_notes,
      processed_by=auth.uid(), processed_at=now() WHERE id=_id;
    RETURN jsonb_build_object('ok', true, 'status', 'rejected', 'balance', new_bal);
  ELSE
    RAISE EXCEPTION 'Ação inválida (paid|rejected)';
  END IF;
END; $$;

-- 6) Default setting
INSERT INTO public.platform_settings (key, value, description)
VALUES ('withdrawal_min_mzn', '100'::jsonb, 'Valor mínimo por pedido de levantamento (MZN)')
ON CONFLICT (key) DO NOTHING;
