-- ============================================================
-- Fix: Gestor global vê TODOS os utilizadores
--       Gestor regional vê APENAS os do seu país
-- ============================================================

-- 1. Actualizar RPC para aceitar qualquer admin (não só country_id IS NULL)
--    Antes: is_global_admin() exigia country_id IS NULL → admins com país ficavam bloqueados
--    Agora: qualquer role='admin' vê tudo; country_manager vê só o seu país
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
  -- Verificar se o chamador é QUALQUER admin (global ou com país atribuído)
  v_is_admin := EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );

  -- Obter o país que o gestor gere (se for country_manager)
  SELECT country_id INTO v_managed_country
  FROM public.user_roles
  WHERE user_id = auth.uid() AND role = 'country_manager'
  LIMIT 1;

  -- Admins: vêem tudo, opcionalmente filtrados por país
  IF v_is_admin THEN
    IF p_country_id IS NOT NULL THEN
      RETURN QUERY SELECT * FROM public.profiles
        WHERE country_id = p_country_id
        ORDER BY created_at DESC;
    ELSE
      RETURN QUERY SELECT * FROM public.profiles
        ORDER BY created_at DESC;
    END IF;

  -- Country Managers: vêem APENAS o seu país
  ELSIF v_managed_country IS NOT NULL THEN
    -- Não permite ver outro país que não o seu
    IF p_country_id IS NOT NULL AND p_country_id <> v_managed_country THEN
      RAISE EXCEPTION 'forbidden: you can only manage country %', v_managed_country;
    END IF;
    RETURN QUERY SELECT * FROM public.profiles
      WHERE country_id = v_managed_country
      ORDER BY created_at DESC;

  ELSE
    RAISE EXCEPTION 'forbidden: insufficient permissions';
  END IF;
END; $$;

-- 2. Re-grant execução (segurança)
REVOKE ALL ON FUNCTION public.list_profiles_admin_full(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_profiles_admin_full(TEXT) TO authenticated;
