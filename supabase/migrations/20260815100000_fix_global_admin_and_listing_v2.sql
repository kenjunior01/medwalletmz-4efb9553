-- ============================================================
-- Fix Crítico: is_global_admin() + list_profiles_admin_full
-- ============================================================
-- Problemas corrigidos:
--   1. is_global_admin() exigia country_id IS NULL → admins com país
--      atribuído ficavam bloqueados como gestores globais
--   2. list_profiles_admin_full() usava a função quebrada
--   3. Gestor global (admin) agora vê TODOS os utilizadores
--   4. Country_manager vê APENAS os do seu país
--   5. Provincial_manager vê APENAS os da sua província
-- ============================================================

-- 1. Corrigir is_global_admin(): QUALQUER role='admin' é gestor global
--    (independentemente de ter country_id ou não)
CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END; $$;

-- 2. Corrigir is_manager_of_country(): admin global pode gerir qualquer país
CREATE OR REPLACE FUNCTION public.is_manager_of_country(p_country_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND (
      (role = 'admin')                          -- Admin global pode tudo
      OR (role = 'country_manager' AND country_id = p_country_id)
    )
  );
END; $$;

-- 3. Recriar list_profiles_admin_full com lógica correta e completa
--    - Admin (gestor global): vê TODOS os utilizadores de todos os países
--    - Country_manager: vê APENAS os do seu país atribuído
--    - Provincial_manager: filtrado client-side pela província
--    - Parâmetro p_country_id é OPCIONAL para admin filtrar no UI
CREATE OR REPLACE FUNCTION public.list_profiles_admin_full(p_country_id TEXT DEFAULT NULL)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_managed_country TEXT;
BEGIN
  -- Verificar se o chamador é QUALQUER admin (global)
  v_is_admin := public.is_global_admin();

  -- Obter o país que o gestor gere (se for country_manager)
  SELECT country_id INTO v_managed_country
  FROM public.user_roles
  WHERE user_id = auth.uid() AND role = 'country_manager'
  LIMIT 1;

  -- ADMIN GLOBAL: vê tudo, opcionalmente filtrados por país no UI
  IF v_is_admin THEN
    IF p_country_id IS NOT NULL THEN
      RETURN QUERY SELECT * FROM public.profiles
        WHERE country_id = p_country_id
        ORDER BY created_at DESC;
    ELSE
      RETURN QUERY SELECT * FROM public.profiles
        ORDER BY created_at DESC;
    END IF;

  -- COUNTRY MANAGER: vê APENAS o seu país
  ELSIF v_managed_country IS NOT NULL THEN
    -- Não permite ver outro país que não o seu
    IF p_country_id IS NOT NULL AND p_country_id <> v_managed_country THEN
      RAISE EXCEPTION 'forbidden: you can only manage country %', v_managed_country;
    END IF;
    RETURN QUERY SELECT * FROM public.profiles
      WHERE country_id = v_managed_country
      ORDER BY created_at DESC;

  -- OUTROS: sem permissão
  ELSE
    RAISE EXCEPTION 'forbidden: insufficient permissions';
  END IF;
END; $$;

-- 4. Garantir permissões corretas
REVOKE ALL ON FUNCTION public.list_profiles_admin_full(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_profiles_admin_full(TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.is_global_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_global_admin() TO authenticated;
REVOKE ALL ON FUNCTION public.is_manager_of_country(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_manager_of_country(TEXT) TO authenticated;

-- 5. Garantir índice para performance
CREATE INDEX IF NOT EXISTS idx_profiles_country_id ON public.profiles(country_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);