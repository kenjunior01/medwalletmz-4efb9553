-- ============================================================================
-- MedWallet Global — INSTALL COMPLETO v3 (Multi-Região & Segurança Regional)
-- ============================================================================
-- Este script configura o banco de dados para suportar múltiplos países com
-- isolamento de dados (RLS) e gestão regional autónoma.
--
-- ⚠️ INSTRUÇÕES:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Cola TODO este bloco (Ctrl+A no ficheiro → Ctrl+V no editor)
--   3. Clica "Run" (Ctrl+Enter)
-- ============================================================================

-- ============================================================
-- 0) Funções Auxiliares de Segurança
-- ============================================================

-- Verifica se o utilizador é um administrador global
CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin' AND country_id IS NULL
  );
END; $$;

-- Verifica se o utilizador é gestor de um país específico
CREATE OR REPLACE FUNCTION public.is_manager_of_country(p_country_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND (
      (role = 'admin' AND country_id IS NULL) -- Admin global pode tudo
      OR (role = 'country_manager' AND country_id = p_country_id)
    )
  );
END; $$;

-- ============================================================
-- 1) place_proposals — Curadoria Multi-Região
-- ============================================
CREATE TABLE IF NOT EXISTS public.place_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id text NOT NULL REFERENCES public.countries(id) DEFAULT 'MZ',

  source text NOT NULL DEFAULT 'google_places' CHECK (source IN ('google_places', 'user_submit')),
  entity_type text NOT NULL CHECK (entity_type IN ('pharmacy', 'clinic', 'hospital', 'doctor', 'lab', 'veterinary', 'other')),

  name text NOT NULL,
  address text,
  city text NOT NULL,
  neighborhood text,
  reference_point text,
  phone text,
  website text,
  description text,
  image_url text,
  latitude double precision,
  longitude double precision,

  external_id text,
  raw_payload jsonb,
  search_meta jsonb,

  proposed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  reward_mzn numeric(10,2) DEFAULT 25,
  reward_joy_coins int DEFAULT 50,
  reward_paid boolean DEFAULT false,

  status text NOT NULL DEFAULT 'pending'
       CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'duplicate', 'merged')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  publish_target text CHECK (publish_target IN ('stores', 'clinics', 'doctor_profiles') OR publish_target IS NULL),
  published_id uuid,
  review_notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS para place_proposals
ALTER TABLE public.place_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposals_read_policy" ON public.place_proposals;
CREATE POLICY "proposals_read_policy" ON public.place_proposals
  FOR SELECT TO authenticated USING (
    proposed_by = auth.uid()
    OR public.is_global_admin()
    OR public.is_manager_of_country(country_id)
  );

DROP POLICY IF EXISTS "proposals_manage_policy" ON public.place_proposals;
CREATE POLICY "proposals_manage_policy" ON public.place_proposals
  FOR ALL TO authenticated USING (
    public.is_global_admin()
    OR public.is_manager_of_country(country_id)
  );

-- ============================================================
-- 2) Função de Aprovação (Gestor Regional pode aprovar seu país)
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_proposal(p_id uuid, p_notes text default null)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  prop public.place_proposals;
  target_table text;
  new_id uuid;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO prop FROM public.place_proposals WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'proposal not found'; END IF;

  -- Segurança: Apenas gestor daquela região ou admin global
  IF NOT (public.is_global_admin() OR public.is_manager_of_country(prop.country_id)) THEN
    RAISE EXCEPTION 'forbidden: you do not manage this region';
  END IF;

  IF prop.status NOT IN ('pending','in_review') THEN
    RAISE EXCEPTION 'proposal already in terminal status: %', prop.status;
  END IF;

  -- Inserir na tabela final respeitando o country_id
  IF prop.entity_type = 'pharmacy' THEN
    target_table := 'stores';
    INSERT INTO public.stores (
      name, type, city, address, latitude, longitude, image_url,
      description, phone, is_active, rating, delivery_fee, delivery_time, country_id
    ) VALUES (
      prop.name, 'pharmacy', prop.city, prop.address, prop.latitude, prop.longitude,
      COALESCE(prop.image_url, prop.raw_payload->>'image_url'),
      COALESCE(prop.description, 'Curado pela equipa MedWallet'),
      COALESCE(prop.phone, ''), true, 0, 50, '30-45 min', prop.country_id
    ) RETURNING id INTO new_id;
  ELSIF prop.entity_type IN ('clinic','hospital','veterinary') THEN
    target_table := 'clinics';
    INSERT INTO public.clinics (
      name, address, city, latitude, longitude, phone, logo_url,
      description, is_active, is_verified, type, country_id
    ) VALUES (
      prop.name, COALESCE(prop.address,''), prop.city, prop.latitude, prop.longitude,
      COALESCE(prop.phone,''), COALESCE(prop.image_url,''),
      COALESCE(prop.description, prop.entity_type),
      true, true, prop.entity_type, prop.country_id
    ) RETURNING id INTO new_id;
  END IF;

  UPDATE public.place_proposals SET
    status = 'approved', reviewed_by = caller, reviewed_at = now(),
    publish_target = target_table, published_id = new_id,
    review_notes = COALESCE(p_notes, review_notes)
  WHERE id = p_id;

  -- Recompensa (Se implementado no sistema de carteiras global)
  IF prop.source = 'user_submit' AND prop.proposed_by IS NOT NULL AND NOT prop.reward_paid THEN
    -- Creditar bónus aqui (chamar função de carteira se existir)
    UPDATE public.place_proposals SET reward_paid = true WHERE id = p_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'published_id', new_id, 'target', target_table);
END; $$;

-- ============================================================
-- 3) Bootstrap Admin (Auto-promoção inicial)
-- ============================================================
CREATE OR REPLACE FUNCTION public.bootstrap_admin()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'O sistema já possui administradores.';
  END IF;

  INSERT INTO public.user_roles (user_id, role, country_id)
  VALUES (auth.uid(), 'admin', NULL); -- Global Admin

  RETURN jsonb_build_object('ok', true, 'message', 'Promovido a Administrador Global.');
END; $$;

GRANT EXECUTE ON FUNCTION public.approve_proposal TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin TO authenticated;

-- ============================================================
-- FIM. Script executado com sucesso.
-- ============================================================
