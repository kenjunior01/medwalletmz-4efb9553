-- ============================================================
-- MedWallet Global — Sistema de Recompensas Multi-Moeda
-- ============================================================

-- 1. Tornar a tabela de propostas agnóstica a moeda
ALTER TABLE public.place_proposals ADD COLUMN IF NOT EXISTS reward_amount NUMERIC(10,2);
ALTER TABLE public.place_proposals ADD COLUMN IF NOT EXISTS reward_currency TEXT;

-- Migrar dados existentes de reward_mzn para os novos campos
UPDATE public.place_proposals
SET
  reward_amount = COALESCE(reward_mzn, 25),
  reward_currency = COALESCE(reward_currency, 'MZN')
WHERE reward_amount IS NULL;

-- 2. Atualizar a função de aprovação para usar a moeda do país da proposta
CREATE OR REPLACE FUNCTION public.approve_proposal(p_id uuid, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  prop public.place_proposals;
  target_table text;
  new_id uuid;
  v_currency text;
  v_reward_val numeric;
begin
  if caller is null then
    raise exception 'not authenticated';
  end if;

  select * into prop from public.place_proposals where id = p_id;
  if not found then
    raise exception 'proposal not found';
  end if;

  -- Segurança Regional
  if not (public.is_global_admin() OR public.is_manager_of_country(prop.country_id)) then
    raise exception 'forbidden: you do not manage this region';
  end if;

  if prop.status not in ('pending','in_review') then
    raise exception 'proposal already in terminal status: %', prop.status;
  end if;

  -- Determinar tabela alvo
  if prop.entity_type in ('pharmacy') then
    target_table := 'stores';
    insert into public.stores (name, type, city, address, latitude, longitude, country_id, is_active)
    values (prop.name, 'pharmacy', prop.city, prop.address, prop.latitude, prop.longitude, prop.country_id, true)
    returning id into new_id;
  elsif prop.entity_type in ('clinic','hospital','veterinary') then
    target_table := 'clinics';
    insert into public.clinics (name, type, city, address, latitude, longitude, country_id, is_active, is_verified, owner_id)
    values (prop.name, prop.entity_type, prop.city, prop.address, prop.latitude, prop.longitude, prop.country_id, true, true, caller)
    returning id into new_id;
  else
    target_table := null;
    new_id := null;
  end if;

  -- Atualizar estado da proposta
  update public.place_proposals set
    status = 'approved',
    reviewed_by = caller,
    reviewed_at = now(),
    publish_target = target_table,
    published_id = new_id,
    review_notes = coalesce(p_notes, review_notes)
  where id = p_id;

  -- Recompensar quem propôs usando a moeda correta
  if prop.source = 'user_submit' and prop.proposed_by is not null and not prop.reward_paid then

    -- Descobrir a moeda do país
    SELECT currency_code INTO v_currency FROM public.countries WHERE id = prop.country_id;
    v_reward_val := COALESCE(prop.reward_amount, 25);

    BEGIN
        -- A função wallet_credit agora deve ser inteligente para creditar na carteira do país correto
        PERFORM public.wallet_credit(
            prop.proposed_by,
            v_reward_val,
            'bonus',
            NULL,
            'Sugestão aprovada (' || v_currency || '): ' || prop.name
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Falha ao creditar bónus: %', SQLERRM;
    END;

    update public.place_proposals set reward_paid = true where id = p_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'published_id', new_id,
    'currency', v_currency,
    'reward_amount', v_reward_val
  );
end; $$;

-- 3. Garantir que o valor padrão da recompensa venha da config do país se não definido
CREATE OR REPLACE FUNCTION public.tr_on_proposal_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_def_reward numeric;
    v_currency text;
BEGIN
    SELECT currency_code, (config->'registration_defaults'->>'reward_amount')::numeric
    INTO v_currency, v_def_reward
    FROM public.countries WHERE id = NEW.country_id;

    NEW.reward_amount := COALESCE(NEW.reward_amount, v_def_reward, 25);
    NEW.reward_currency := COALESCE(NEW.reward_currency, v_currency, 'MZN');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_fill_proposal_rewards ON public.place_proposals;
CREATE TRIGGER tr_fill_proposal_rewards
BEFORE INSERT ON public.place_proposals
FOR EACH ROW EXECUTE FUNCTION public.tr_on_proposal_insert();
