-- ============================================================================
-- MedWallet MZ — PATCH: corrige colunas erradas em approve_proposal()
-- ============================================================================
-- Sintoma:  new row for relation "wallet_transactions" violates check
--           constraint "wallet_transactions_status_check"
--
-- Causa:    A versão original da função approve_proposal() usava colunas
--           inexistentes (wallet_id, kind, ref) em vez das reais:
--             • wallet_id   → user_id
--             • kind        → type
--             • ref         → reference_id + reference_type
--           Também faltava o campo NOT NULL `balance_after`.
--
-- Aplicação:
--   1. Supabase SQL Editor → New query
--   2. Cola este bloco inteiro → Run
--   3. Deves ver "Success. No rows returned"
-- ============================================================================

-- Recriar approve_proposal com schema correcta
create or replace function public.approve_proposal(p_id uuid, p_notes text default null)
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
  new_balance numeric(12,2);
  reward_amount numeric(10,2);
  reward_coins int;
begin
  if caller is null then
    raise exception 'not authenticated';
  end if;

  select exists (
    select 1 from public.user_roles where user_id = caller and role = 'admin'
  ) into is_admin;

  if not is_admin then
    raise exception 'forbidden: admin only';
  end if;

  select * into prop from public.place_proposals where id = p_id;
  if not found then
    raise exception 'proposal not found';
  end if;
  if prop.status not in ('pending','in_review') then
    raise exception 'proposal already in terminal status: %', prop.status;
  end if;

  -- Defaults da reward (caso null em propostas antigas)
  reward_amount := coalesce(prop.reward_mzn, 25);
  reward_coins  := coalesce(prop.reward_joy_coins, 50);

  -- ============================================================
  -- Publicar na tabela final (stores / clinics)
  -- ============================================================
  if prop.entity_type = 'pharmacy' then
    target_table := 'stores';
    insert into public.stores (
      name, type, city, address, latitude, longitude,
      image_url, description, phone, is_active, rating, delivery_fee, delivery_time
    ) values (
      prop.name, 'pharmacy', prop.city, prop.address,
      prop.latitude, prop.longitude,
      coalesce(prop.image_url, prop.raw_payload->>'image_url'),
      coalesce(prop.description, 'Curado pela equipa MedWallet'),
      coalesce(prop.phone, ''),
      true, 0, 50, '30-45 min'
    )
    returning id into new_id;
  elsif prop.entity_type in ('clinic','hospital') then
    target_table := 'clinics';
    insert into public.clinics (
      name, address, city, latitude, longitude,
      phone, logo_url, description, is_active, is_verified, owner_id
    ) values (
      prop.name, coalesce(prop.address,''), prop.city,
      prop.latitude, prop.longitude,
      coalesce(prop.phone,''),
      coalesce(prop.image_url,''),
      coalesce(prop.description, case when prop.entity_type='hospital' then 'Hospital' else 'Clinica' end),
      true, true, caller
    )
    returning id into new_id;
  else
    -- por agora, não publicamos doctors/labs/others
    target_table := null;
    new_id := null;
  end if;

  -- Marcar proposta como aprovada
  update public.place_proposals set
    status = 'approved',
    reviewed_by = caller,
    reviewed_at = now(),
    publish_target = target_table,
    published_id = new_id,
    review_notes = coalesce(p_notes, review_notes)
  where id = p_id;

  -- ============================================================
  -- Recompensa (apenas para submissões de utilizadores)
  -- ============================================================
  if prop.source = 'user_submit' and prop.proposed_by is not null and not prop.reward_paid then

    -- 1) Creditar MZN na wallet (se existir) + registar transacção
    if reward_amount > 0 then
      -- upsert defensivo (se wallet não existir, cria)
      insert into public.wallets (user_id, balance_mzn, total_deposited, total_spent)
      values (prop.proposed_by, 0, 0, 0)
      on conflict (user_id) do nothing;

      update public.wallets
         set balance_mzn = coalesce(balance_mzn, 0) + reward_amount
       where user_id = prop.proposed_by
      returning balance_mzn into new_balance;

      insert into public.wallet_transactions (
        user_id, type, amount, balance_after,
        reference_type, reference_id, description, status, payment_method
      ) values (
        prop.proposed_by, 'credit', reward_amount, new_balance,
        'place_proposal', p_id::text,
        'Sugestao aprovada: ' || prop.name,
        'completed', 'system'
      );
    end if;

    -- 2) Creditar Joy Coins
    if reward_coins > 0 then
      insert into public.joy_coin_transactions (user_id, amount, transaction_type, description, reference_id)
      values (
        prop.proposed_by,
        reward_coins,
        'earn',
        'Sugestao aprovada: ' || prop.name,
        p_id
      );

      -- upsert no user_gamification
      insert into public.user_gamification (user_id, joy_coins)
      values (prop.proposed_by, reward_coins)
      on conflict (user_id) do update
        set joy_coins = public.user_gamification.joy_coins + reward_coins;
    end if;

    update public.place_proposals set reward_paid = true where id = p_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'published_id', new_id,
    'publish_target', target_table,
    'reward_paid', prop.source = 'user_submit' and prop.proposed_by is not null,
    'reward_amount_mzn', reward_amount,
    'reward_joy_coins', reward_coins
  );
end; $$;

grant execute on function public.approve_proposal(uuid,text) to authenticated;

-- ============================================================================
-- (Opcional) Limpar transacções que ficaram pela metade antes do patch.
-- Se já aprovaste alguma proposta e a wallet_transactions ficou inconsistente,
-- corre este query manual no SQL Editor para ver:
--
--   select id, user_id, type, amount, balance_after, status, created_at
--   from public.wallet_transactions
--   where reference_type = 'place_proposal'
--   order by created_at desc;
--
-- Se encontrares transacções com balance_after null ou status errado,
-- apaga-as com:
--
--   delete from public.wallet_transactions
--   where reference_type = 'place_proposal' and balance_after is null;
-- ============================================================================