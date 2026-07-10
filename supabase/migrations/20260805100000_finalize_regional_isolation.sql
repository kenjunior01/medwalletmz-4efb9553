-- ============================================================
-- MedWallet Global — Finalização de Isolamento Regional
-- ============================================================

-- 1. Melhorar a listagem de perfis para suportar gestores regionais
CREATE OR REPLACE FUNCTION public.list_profiles_admin_full(p_country_id TEXT DEFAULT NULL)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se for admin global (country_id IS NULL em user_roles), pode ver tudo ou filtrar por país
  IF public.is_global_admin() THEN
    IF p_country_id IS NOT NULL THEN
      RETURN QUERY SELECT * FROM public.profiles WHERE country_id = p_country_id ORDER BY created_at DESC;
    ELSE
      RETURN QUERY SELECT * FROM public.profiles ORDER BY created_at DESC;
    END IF;
  -- Se for manager regional, vê apenas o seu país
  ELSIF p_country_id IS NOT NULL AND public.is_manager_of_country(p_country_id) THEN
    RETURN QUERY SELECT * FROM public.profiles WHERE country_id = p_country_id ORDER BY created_at DESC;
  ELSE
    RAISE EXCEPTION 'forbidden: insufficient permissions for this region';
  END IF;
END; $$;

-- 2. Atualizar função de aprovação para propagar o country_id
CREATE OR REPLACE FUNCTION public.approve_proposal(p_id uuid, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  is_admin boolean;
  prop public.place_proposals;
  target_table text;
  new_id uuid;
  wallet_id uuid;
begin
  if caller is null then
    raise exception 'not authenticated';
  end if;

  -- Verifica se é admin global ou manager do país da proposta
  select * into prop from public.place_proposals where id = p_id;
  if not found then
    raise exception 'proposal not found';
  end if;

  if not (public.is_global_admin() OR public.is_manager_of_country(prop.country_id)) then
    raise exception 'forbidden: you do not manage this region';
  end if;

  if prop.status not in ('pending','in_review') then
    raise exception 'proposal already in terminal status: %', prop.status;
  end if;

  -- Determinar tabela alvo e inserir com country_id
  if prop.entity_type in ('pharmacy') then
    target_table := 'stores';
    insert into public.stores (
      name, type, city, address, latitude, longitude,
      image_url, description, phone, is_active, rating, delivery_fee, delivery_time,
      country_id
    ) values (
      prop.name, 'pharmacy', prop.city, prop.address,
      prop.latitude, prop.longitude,
      coalesce(prop.image_url, prop.raw_payload->>'image_url'),
      coalesce(prop.description, 'Curado pela equipa MedWallet'),
      coalesce(prop.phone, ''),
      true, 0, 50, '30-45 min',
      prop.country_id
    )
    returning id into new_id;
  elsif prop.entity_type in ('clinic','hospital') then
    target_table := 'clinics';
    insert into public.clinics (
      name, address, city, latitude, longitude,
      phone, logo_url, description, is_active, is_verified, owner_id,
      type, country_id
    ) values (
      prop.name, coalesce(prop.address,''), prop.city,
      prop.latitude, prop.longitude,
      coalesce(prop.phone,''),
      coalesce(prop.image_url,''),
      coalesce(prop.description, case when prop.entity_type='hospital' then 'Hospital' else 'Clínica' end),
      true, true, caller,
      prop.entity_type,
      prop.country_id
    )
    returning id into new_id;
  else
    target_table := null;
    new_id := null;
  end if;

  -- Actualizar estado da proposta
  update public.place_proposals set
    status = 'approved',
    reviewed_by = caller,
    reviewed_at = now(),
    publish_target = target_table,
    published_id = new_id,
    review_notes = coalesce(p_notes, review_notes)
  where id = p_id;

  -- Recompensar quem propôs
  if prop.source = 'user_submit' and prop.proposed_by is not null and not prop.reward_paid then
    -- Credita na carteira do utilizador (a função wallet_credit lida com conversão se necessário)
    BEGIN
        PERFORM public.wallet_credit(prop.proposed_by, coalesce(prop.reward_mzn, 25), 'bonus', NULL, 'Sugestão aprovada: ' || prop.name);
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Falha ao creditar bónus: %', SQLERRM;
    END;

    update public.place_proposals set reward_paid = true where id = p_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'published_id', new_id,
    'publish_target', target_table,
    'reward_paid', prop.source = 'user_submit' and prop.proposed_by is not null
  );
end; $$;

-- 3. Garantir função de rejeição em massa com segurança regional
CREATE OR REPLACE FUNCTION public.reject_proposals_bulk(_ids uuid[], _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  processed_count int := 0;
  failed_count int := 0;
  target_id uuid;
  v_country_id text;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  FOREACH target_id IN ARRAY _ids LOOP
    SELECT country_id INTO v_country_id FROM public.place_proposals WHERE id = target_id;

    IF v_country_id IS NOT NULL AND (public.is_global_admin() OR public.is_manager_of_country(v_country_id)) THEN
      UPDATE public.place_proposals
      SET status = 'rejected', reviewed_by = caller, reviewed_at = now(), review_notes = coalesce(_notes, 'Rejeitado em massa')
      WHERE id = target_id AND status IN ('pending', 'in_review');

      IF found THEN processed_count := processed_count + 1; ELSE failed_count := failed_count + 1; END IF;
    ELSE
      failed_count := failed_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', processed_count, 'fail', failed_count);
END; $$;

-- 4. Adicionar Índices para Performance Regional
CREATE INDEX IF NOT EXISTS idx_profiles_country_id ON public.profiles(country_id);
CREATE INDEX IF NOT EXISTS idx_stores_country_id ON public.stores(country_id);
CREATE INDEX IF NOT EXISTS idx_clinics_country_id ON public.clinics(country_id);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_country_id ON public.doctor_profiles(country_id);
CREATE INDEX IF NOT EXISTS idx_orders_country_id ON public.orders(country_id);
CREATE INDEX IF NOT EXISTS idx_place_proposals_country_id ON public.place_proposals(country_id);
