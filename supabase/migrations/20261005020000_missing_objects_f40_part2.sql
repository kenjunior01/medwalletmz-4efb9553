-- ═══════════════════════════════════════════════════════════════════════════
-- F40 (parte 2) — Views, RPCs e buckets de storage
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 9. VIEW referrals — RoleBasedHome lê id/referral_code/status/reward_amount;
--     mapeia 1:1 sobre user_referrals (RLS security_invoker herda as
--     políticas existentes: referrer OU referred veem as próprias linhas).
--     Robusto: só recria se o nome estiver livre ou for mesmo uma view.
-- ─────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'referrals' AND c.relkind IN ('v','m')
  ) THEN
    DROP VIEW IF EXISTS public.referrals;
  END IF;
  IF to_regclass('public.referrals') IS NULL THEN
    CREATE VIEW public.referrals
    WITH (security_invoker = true) AS
    SELECT ur.id,
           ur.referrer_id,
           ur.referral_code,
           ur.status,
           ur.created_at,
           0::numeric AS reward_amount
      FROM public.user_referrals ur;
  END IF;
END $$;
GRANT SELECT ON public.referrals TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 10. VIEW triage_sessions — o APK (/impact) conta sessões de triagem;
--      mapeia sobre triage_logs (já existente) para o contador refletir
--      atividade REAL em vez de ficar a zero.
-- ─────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF to_regclass('public.triage_sessions') IS NULL THEN
    CREATE VIEW public.triage_sessions
    WITH (security_invoker = true) AS
    SELECT id, patient_id, created_at
      FROM public.triage_logs;
  END IF;
END $$;
GRANT SELECT ON public.triage_sessions TO authenticated, anon;

-- ─────────────────────────────────────────────────────────────────────────
-- 11. RPC increment_content_views / increment_content_clicks
--      regionalContent.ts chama com { content_id }; contadores anónimos
--      permitidos (regional_content tem leitura pública) via SECURITY DEFINER.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_content_views(content_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.regional_content
     SET views_count = COALESCE(views_count, 0) + 1
   WHERE id = content_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_content_clicks(content_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.regional_content
     SET clicks_count = COALESCE(clicks_count, 0) + 1
   WHERE id = content_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_content_views(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_content_clicks(uuid) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 12. RPC checkout_debit_order — versionamento (produção já tem uma versão;
--      só criamos se NÃO existir nenhuma, para nunca sobrescrever produção).
--      Debita a wallet do próprio utilizador (auth.uid() = _user_id) de
--      forma atómica e registra a transação (convenção wallet_debit).
-- ─────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'checkout_debit_order'
) THEN
  CREATE FUNCTION public.checkout_debit_order(
    _user_id     uuid,
    _order_id    uuid,
    _amount      numeric,
    _description text DEFAULT NULL
  )
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $fn$
  DECLARE
    v_cur numeric;
    v_new numeric;
  BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
      RETURN jsonb_build_object('success', false, 'error_message', 'not_authenticated');
    END IF;
    IF _amount IS NULL OR _amount <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error_message', 'invalid_amount');
    END IF;
    PERFORM public.ensure_wallet(_user_id);
    SELECT balance_mzn INTO v_cur
      FROM public.wallets
     WHERE user_id = _user_id
       FOR UPDATE;
    IF v_cur IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error_message', 'wallet_not_found');
    END IF;
    IF v_cur < _amount THEN
      RETURN jsonb_build_object('success', false, 'error_message', 'insufficient_balance', 'balance', v_cur);
    END IF;
    UPDATE public.wallets
       SET balance_mzn  = balance_mzn - _amount,
           total_spent  = total_spent + _amount,
           updated_at   = now()
     WHERE user_id = _user_id
    RETURNING balance_mzn INTO v_new;
    INSERT INTO public.wallet_transactions
      (user_id, type, amount, balance_after, reference_type, reference_id, description, status, payment_method)
    VALUES
      (_user_id, 'debit', _amount, v_new, 'order', _order_id,
       COALESCE(_description, 'Pagamento de pedido'), 'completed', 'wallet');
    RETURN jsonb_build_object('success', true, 'new_balance', v_new);
  END;
  $fn$;
END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 13. RPC register_driver_vehicle — versionamento (mesma proteção: só cria
--      se não existir; produção já devolve o id do veículo criado).
-- ─────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'register_driver_vehicle'
) THEN
  CREATE FUNCTION public.register_driver_vehicle(
    p_driver_id           uuid,
    p_vehicle_type        text,
    p_brand               text,
    p_model               text,
    p_color               text DEFAULT NULL,
    p_year                integer DEFAULT NULL,
    p_license_plate       text DEFAULT NULL,
    p_photo_front         text DEFAULT NULL,
    p_photo_side          text DEFAULT NULL,
    p_photo_back          text DEFAULT NULL,
    p_license_carta_url   text DEFAULT NULL,
    p_license_viatura_url text DEFAULT NULL
  )
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $fn$
  DECLARE
    v_id uuid;
  BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> p_driver_id THEN
      RAISE EXCEPTION 'not_authenticated';
    END IF;
    INSERT INTO public.driver_vehicles
      (driver_id, vehicle_type, brand, model, color, year,
       license_plate, photo_front, photo_side, photo_back,
       license_carta_url, license_viatura_url)
    VALUES
      (p_driver_id, p_vehicle_type, p_brand, p_model, p_color, p_year,
       p_license_plate, p_photo_front, p_photo_side, p_photo_back,
       p_license_carta_url, p_license_viatura_url)
    RETURNING id INTO v_id;
    RETURN v_id;
  END;
  $fn$;
END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 14. Buckets de storage usados pelo código sem CREATE na repo
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('licenses', 'licenses', false)
ON CONFLICT (id) DO NOTHING;

-- Policies do avatars: leitura pública; escrita apenas na própria pasta <uid>/...
DROP POLICY IF EXISTS "Anyone reads avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;

CREATE POLICY "Anyone reads avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
