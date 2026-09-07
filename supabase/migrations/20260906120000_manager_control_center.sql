-- ============================================================
-- MedWallet Global — Manager Control Center (Centro de Controlo
-- de Gestores Regionais + Admin Global)
--
-- Objectivos:
--   1) Corrigir o enum app_role (roles de gestor em falta nas policies)
--   2) Alargar CHECKs da wallet_transactions (withdrawal_hold / confirmed)
--   3) profiles.managed_country (usado por AssignCountryManager)
--   4) Tabela manager_permissions (permissões + limites por gestor)
--   5) Corrigir policies "mortas" das tabelas regional_* (roles fora do enum)
--   6) RPCs: my_manager_permissions, upsert_manager_permissions,
--           manager_approvals_today, create_regional_content_safe
--
-- Tudo ADITIVO e idempotente — zero breaking changes.
-- ============================================================

-- ------------------------------------------------------------
-- 1. app_role: valores de gestor usados em policies antigas
--    (20260730*, 20260827*, 20260828*, 20260829*) mas nunca adicionados
-- ------------------------------------------------------------
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'regional_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'regional_ceo';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'provincial_manager';

-- ------------------------------------------------------------
-- 2. wallet_transactions — alargar CHECK de type/status
--    (request_withdrawal insere 'withdrawal_hold'; pay_service insere 'confirmed')
-- ------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint c
    WHERE c.conrelid = 'public.wallet_transactions'::regclass
      AND c.contype = 'c'
      AND (pg_get_constraintdef(c.oid) ILIKE '%(type)%'
           OR pg_get_constraintdef(c.oid) ILIKE '%(status)%')
  LOOP
    EXECUTE format('ALTER TABLE public.wallet_transactions DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN ('deposit','debit','credit','refund','bonus','commission','referral','withdrawal','withdrawal_hold'));

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_status_check
  CHECK (status IN ('pending','confirmed','completed','failed','reversed'));

-- ------------------------------------------------------------
-- 3. profiles.managed_country — coluna usada pelos painéis de
--    atribuição/permissões de gestores (AssignCountryManager)
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS managed_country TEXT REFERENCES public.countries(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Admins can set managed_country" ON public.profiles;
CREATE POLICY "Admins can set managed_country" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------
-- 4. manager_permissions — permissões granulares + limites por gestor
--    (a UI web já consultava esta tabela; agora passa a existir)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manager_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  country_id text REFERENCES public.countries(id) ON DELETE SET NULL,
  -- Aprovações
  can_approve_doctors      boolean NOT NULL DEFAULT false,
  can_approve_pharmacies   boolean NOT NULL DEFAULT false,
  can_approve_institutions boolean NOT NULL DEFAULT false,
  -- Operação
  can_view_financials      boolean NOT NULL DEFAULT false,
  can_export_data          boolean NOT NULL DEFAULT false,
  can_manage_drivers       boolean NOT NULL DEFAULT false,
  can_manage_coupons       boolean NOT NULL DEFAULT false,
  can_manage_settings      boolean NOT NULL DEFAULT false,
  can_manage_content       boolean NOT NULL DEFAULT false,
  -- Limites (restrições quantitativas)
  daily_approval_limit     integer NOT NULL DEFAULT 100 CHECK (daily_approval_limit BETWEEN 0 AND 100000),
  max_active_content       integer NOT NULL DEFAULT 30  CHECK (max_active_content BETWEEN 1 AND 500),
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manager_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage manager permissions" ON public.manager_permissions;
CREATE POLICY "Admins manage manager permissions" ON public.manager_permissions
  FOR ALL TO authenticated
  USING (public.is_global_admin())
  WITH CHECK (public.is_global_admin());

DROP POLICY IF EXISTS "Managers read own permissions" ON public.manager_permissions;
CREATE POLICY "Managers read own permissions" ON public.manager_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_global_admin());

DROP TRIGGER IF EXISTS trg_manager_permissions_updated ON public.manager_permissions;
CREATE TRIGGER trg_manager_permissions_updated
  BEFORE UPDATE ON public.manager_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: dar permissões base (o que os gestores já conseguiam fazer)
-- a todos os country managers existentes, sem perder comportamento actual.
INSERT INTO public.manager_permissions (user_id, country_id, can_approve_doctors, can_approve_pharmacies, can_approve_institutions, can_view_financials, can_manage_content)
SELECT ur.user_id, ur.country_id, true, true, true, true, true
FROM public.user_roles ur
WHERE ur.role = 'country_manager'
ON CONFLICT (user_id) DO NOTHING;

-- ------------------------------------------------------------
-- 5. Corrigir policies "mortas" (referiam roles fora do enum)
--    Agora: admin global OU gestor do próprio país, com escopo por linha.
-- ------------------------------------------------------------
-- regional_kpis
DROP POLICY IF EXISTS "Admins can write regional KPIs" ON public.regional_kpis;
CREATE POLICY "Admins and country managers write regional KPIs" ON public.regional_kpis
  FOR ALL TO authenticated
  USING (public.is_global_admin() OR public.is_manager_of_country(country_code))
  WITH CHECK (public.is_global_admin() OR public.is_manager_of_country(country_code));

-- regional_goals
DROP POLICY IF EXISTS "Regional CEOs and admins can manage goals" ON public.regional_goals;
CREATE POLICY "Admins and country managers manage goals" ON public.regional_goals
  FOR ALL TO authenticated
  USING (public.is_global_admin() OR public.is_manager_of_country(country_code))
  WITH CHECK (public.is_global_admin() OR public.is_manager_of_country(country_code));

-- regional_content (gestores leem também conteúdo inactivo do seu país)
DROP POLICY IF EXISTS "Regional managers and admins can manage content" ON public.regional_content;
CREATE POLICY "Managers read own country content" ON public.regional_content
  FOR SELECT TO authenticated
  USING (public.is_global_admin() OR public.is_manager_of_country(country_code));

DROP POLICY IF EXISTS "Managers and admins manage regional content" ON public.regional_content;
CREATE POLICY "Managers and admins manage regional content" ON public.regional_content
  FOR ALL TO authenticated
  USING (public.is_global_admin() OR public.is_manager_of_country(country_code))
  WITH CHECK (public.is_global_admin() OR public.is_manager_of_country(country_code));

-- regional_rankings
DROP POLICY IF EXISTS "Admins can update rankings" ON public.regional_rankings;
CREATE POLICY "Admins and country managers update rankings" ON public.regional_rankings
  FOR UPDATE TO authenticated
  USING (public.is_global_admin() OR public.is_manager_of_country(country_code))
  WITH CHECK (public.is_global_admin() OR public.is_manager_of_country(country_code));

-- country_onboarding (admin ou CEO regional atribuído)
DROP POLICY IF EXISTS "Admins can manage country onboarding" ON public.country_onboarding;
CREATE POLICY "Admins and regional CEOs manage onboarding" ON public.country_onboarding
  FOR ALL TO authenticated
  USING (
    public.is_global_admin()
    OR regional_ceo_user_id = auth.uid()
    OR public.is_manager_of_country(country_code)
  )
  WITH CHECK (
    public.is_global_admin()
    OR regional_ceo_user_id = auth.uid()
    OR public.is_manager_of_country(country_code)
  );

-- ------------------------------------------------------------
-- 6. RPCs do Centro de Controlo
-- ------------------------------------------------------------

-- 6.a. Permissões efectivas do utilizador autenticado (merge de
--      manager_permissions + country_management.permissions)
CREATE OR REPLACE FUNCTION public.my_manager_permissions()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_country text;
  v_cm jsonb;
  v_row public.manager_permissions%ROWTYPE;
  v_true  boolean := true;
  v_false boolean := false;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;

  IF public.is_global_admin() THEN
    RETURN jsonb_build_object(
      'is_global', true,
      'managed', true,
      'country_id', NULL,
      'permissions', jsonb_build_object(
        'can_approve_doctors', v_true, 'can_approve_pharmacies', v_true,
        'can_approve_institutions', v_true, 'can_view_financials', v_true,
        'can_export_data', v_true, 'can_manage_drivers', v_true,
        'can_manage_coupons', v_true, 'can_manage_settings', v_true,
        'can_manage_content', v_true
      ),
      'limits', jsonb_build_object(
        'daily_approval_limit', NULL,   -- NULL = ilimitado
        'max_active_content', NULL
      )
    );
  END IF;

  SELECT cm.country_id, cm.permissions
    INTO v_country, v_cm
    FROM public.country_management cm
    WHERE cm.user_id = v_uid
    ORDER BY cm.country_id
    LIMIT 1;

  IF v_country IS NULL THEN
    RETURN jsonb_build_object('is_global', false, 'managed', false);
  END IF;

  SELECT * INTO v_row FROM public.manager_permissions WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'is_global', false,
    'managed', true,
    'country_id', v_country,
    'permissions', jsonb_build_object(
      'can_approve_doctors',
        COALESCE(v_row.can_approve_doctors, v_false) OR COALESCE((v_cm->>'can_approve_doctors')::boolean, v_false),
      'can_approve_pharmacies',
        COALESCE(v_row.can_approve_pharmacies, v_false) OR COALESCE((v_cm->>'can_approve_pharmacies')::boolean, v_false),
      'can_approve_institutions',
        COALESCE(v_row.can_approve_institutions, v_false) OR COALESCE((v_cm->>'can_approve_institutions')::boolean, v_false),
      'can_view_financials',
        COALESCE(v_row.can_view_financials, v_false) OR COALESCE((v_cm->>'can_view_financials')::boolean, v_false),
      'can_export_data',
        COALESCE(v_row.can_export_data, v_false) OR COALESCE((v_cm->>'can_export_data')::boolean, v_false),
      'can_manage_drivers',
        COALESCE(v_row.can_manage_drivers, v_false) OR COALESCE((v_cm->>'can_manage_drivers')::boolean, v_false),
      'can_manage_coupons',
        COALESCE(v_row.can_manage_coupons, v_false) OR COALESCE((v_cm->>'can_manage_coupons')::boolean, v_false),
      'can_manage_settings',
        COALESCE(v_row.can_manage_settings, v_false) OR COALESCE((v_cm->>'can_manage_settings')::boolean, v_false),
      'can_manage_content',
        COALESCE(v_row.can_manage_content, v_false) OR COALESCE((v_cm->>'can_manage_content')::boolean, v_false)
    ),
    'limits', jsonb_build_object(
      'daily_approval_limit', COALESCE(v_row.daily_approval_limit, 100),
      'max_active_content', COALESCE(v_row.max_active_content, 30)
    )
  );
END $$;

GRANT EXECUTE ON FUNCTION public.my_manager_permissions() TO authenticated;

-- 6.b. Upsert de permissões/limites (só admin global)
CREATE OR REPLACE FUNCTION public.upsert_manager_permissions(
  p_user_id uuid,
  p_country_id text DEFAULT NULL,
  p_permissions jsonb DEFAULT '{}'::jsonb,
  p_daily_approval_limit integer DEFAULT NULL,
  p_max_active_content integer DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_global_admin() THEN
    RAISE EXCEPTION 'forbidden: apenas o gestor global edita permissões';
  END IF;

  INSERT INTO public.manager_permissions (
    user_id, country_id,
    can_approve_doctors, can_approve_pharmacies, can_approve_institutions,
    can_view_financials, can_export_data, can_manage_drivers,
    can_manage_coupons, can_manage_settings, can_manage_content,
    daily_approval_limit, max_active_content, notes
  ) VALUES (
    p_user_id, p_country_id,
    COALESCE((p_permissions->>'can_approve_doctors')::boolean, false),
    COALESCE((p_permissions->>'can_approve_pharmacies')::boolean, false),
    COALESCE((p_permissions->>'can_approve_institutions')::boolean, false),
    COALESCE((p_permissions->>'can_view_financials')::boolean, false),
    COALESCE((p_permissions->>'can_export_data')::boolean, false),
    COALESCE((p_permissions->>'can_manage_drivers')::boolean, false),
    COALESCE((p_permissions->>'can_manage_coupons')::boolean, false),
    COALESCE((p_permissions->>'can_manage_settings')::boolean, false),
    COALESCE((p_permissions->>'can_manage_content')::boolean, false),
    COALESCE(p_daily_approval_limit, 100),
    COALESCE(p_max_active_content, 30),
    p_notes
  )
  ON CONFLICT (user_id) DO UPDATE SET
    country_id              = COALESCE(EXCLUDED.country_id, manager_permissions.country_id),
    can_approve_doctors     = COALESCE((p_permissions->>'can_approve_doctors')::boolean, manager_permissions.can_approve_doctors),
    can_approve_pharmacies  = COALESCE((p_permissions->>'can_approve_pharmacies')::boolean, manager_permissions.can_approve_pharmacies),
    can_approve_institutions= COALESCE((p_permissions->>'can_approve_institutions')::boolean, manager_permissions.can_approve_institutions),
    can_view_financials     = COALESCE((p_permissions->>'can_view_financials')::boolean, manager_permissions.can_view_financials),
    can_export_data         = COALESCE((p_permissions->>'can_export_data')::boolean, manager_permissions.can_export_data),
    can_manage_drivers      = COALESCE((p_permissions->>'can_manage_drivers')::boolean, manager_permissions.can_manage_drivers),
    can_manage_coupons      = COALESCE((p_permissions->>'can_manage_coupons')::boolean, manager_permissions.can_manage_coupons),
    can_manage_settings     = COALESCE((p_permissions->>'can_manage_settings')::boolean, manager_permissions.can_manage_settings),
    can_manage_content      = COALESCE((p_permissions->>'can_manage_content')::boolean, manager_permissions.can_manage_content),
    daily_approval_limit    = COALESCE(p_daily_approval_limit, manager_permissions.daily_approval_limit),
    max_active_content      = COALESCE(p_max_active_content, manager_permissions.max_active_content),
    notes                   = COALESCE(p_notes, manager_permissions.notes),
    updated_at              = now();

  RETURN jsonb_build_object('ok', true, 'user_id', p_user_id);
END $$;

GRANT EXECUTE ON FUNCTION public.upsert_manager_permissions(uuid, text, jsonb, integer, integer, text) TO authenticated;

-- 6.c. Aprovações do gestor hoje (para o widget de limite diário)
CREATE OR REPLACE FUNCTION public.manager_approvals_today()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT count(*)::integer
  FROM public.place_proposals
  WHERE status = 'approved'
    AND reviewed_by = auth.uid()
    AND reviewed_at::date = current_date;
$$;

GRANT EXECUTE ON FUNCTION public.manager_approvals_today() TO authenticated;

-- 6.d. Publicação de banners/conteúdo regional com validação de
--      permissão + limite de itens activos (can_manage_content / max_active_content)
CREATE OR REPLACE FUNCTION public.create_regional_content_safe(
  p_country_code text,
  p_content_type text,
  p_title text,
  p_description text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_accent_color text DEFAULT NULL,
  p_cta_label text DEFAULT NULL,
  p_cta_url text DEFAULT NULL,
  p_is_pinned boolean DEFAULT false,
  p_starts_at timestamptz DEFAULT NULL,
  p_ends_at timestamptz DEFAULT NULL,
  p_audience_tags text[] DEFAULT NULL,
  p_language text DEFAULT 'pt'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_limit integer;
  v_active integer;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  v_is_admin := public.is_global_admin();

  IF NOT v_is_admin AND NOT public.is_manager_of_country(p_country_code) THEN
    RAISE EXCEPTION 'forbidden: não gere este país';
  END IF;

  IF p_content_type NOT IN ('health_campaign','partner_highlight','emergency_notice','holiday_schedule','local_tip') THEN
    RAISE EXCEPTION 'invalid_content_type: %', p_content_type;
  END IF;

  -- Limite de itens activos por país (gestores; admin ilimitado)
  IF NOT v_is_admin THEN
    SELECT mp.max_active_content INTO v_limit
      FROM public.manager_permissions mp WHERE mp.user_id = v_uid;
    v_limit := COALESCE(v_limit, 30);

    SELECT count(*) INTO v_active
      FROM public.regional_content
      WHERE country_code = p_country_code AND is_active = true;

    IF v_active >= v_limit THEN
      RAISE EXCEPTION 'content_limit_reached: máximo % itens activos (tem %)', v_limit, v_active;
    END IF;
  END IF;

  INSERT INTO public.regional_content (
    country_code, content_type, title, description, image_url,
    accent_color, cta_label, cta_url, is_pinned,
    starts_at, ends_at, audience_tags, language, created_by
  ) VALUES (
    p_country_code, p_content_type, p_title, p_description, p_image_url,
    p_accent_color, p_cta_label, p_cta_url, p_is_pinned,
    COALESCE(p_starts_at, now()), p_ends_at, p_audience_tags,
    COALESCE(p_language, 'pt'), v_uid
  ) RETURNING id INTO v_id;

  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.create_regional_content_safe(
  text, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, text[], text
) TO authenticated;
