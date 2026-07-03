
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'clinic';
CREATE INDEX IF NOT EXISTS idx_clinics_type_city ON public.clinics(type, city) WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.approve_proposal(p_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  caller uuid := auth.uid();
  is_admin boolean;
  prop public.place_proposals;
  target_table text;
  new_id uuid;
  new_balance numeric(12,2);
  reward_amount numeric(10,2);
  reward_coins int;
  clinic_type text;
begin
  if caller is null then raise exception 'not authenticated'; end if;
  select exists (select 1 from public.user_roles where user_id = caller and role = 'admin') into is_admin;
  if not is_admin then raise exception 'forbidden: admin only'; end if;

  select * into prop from public.place_proposals where id = p_id;
  if not found then raise exception 'proposal not found'; end if;
  if prop.status not in ('pending','in_review') then
    raise exception 'proposal already in terminal status: %', prop.status;
  end if;

  reward_amount := coalesce(prop.reward_mzn, 25);
  reward_coins  := coalesce(prop.reward_joy_coins, 50);

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
      coalesce(prop.phone, ''), true, 0, 50, '30-45 min'
    ) returning id into new_id;
  elsif prop.entity_type in ('clinic','hospital','laboratory') then
    target_table := 'clinics';
    clinic_type := prop.entity_type;
    insert into public.clinics (
      name, address, city, latitude, longitude,
      phone, logo_url, description, is_active, is_verified, owner_id, type
    ) values (
      prop.name, coalesce(prop.address,''), prop.city,
      prop.latitude, prop.longitude,
      coalesce(prop.phone,''), coalesce(prop.image_url,''),
      coalesce(prop.description,
        case prop.entity_type
          when 'hospital' then 'Hospital'
          when 'laboratory' then 'Laboratório de análises'
          else 'Clínica' end),
      true, true, caller, clinic_type
    ) returning id into new_id;
  else
    target_table := null;
    new_id := null;
  end if;

  update public.place_proposals set
    status = 'approved',
    reviewed_by = caller,
    reviewed_at = now(),
    publish_target = target_table,
    published_id = new_id,
    review_notes = coalesce(p_notes, review_notes)
  where id = p_id;

  if prop.source = 'user_submit' and prop.proposed_by is not null and not prop.reward_paid then
    if reward_amount > 0 then
      insert into public.wallets (user_id, balance_mzn, total_deposited, total_spent)
      values (prop.proposed_by, 0, 0, 0) on conflict (user_id) do nothing;
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
        'Sugestao aprovada: ' || prop.name, 'completed', 'system'
      );
    end if;
    if reward_coins > 0 then
      insert into public.joy_coin_transactions (user_id, amount, transaction_type, description, reference_id)
      values (prop.proposed_by, reward_coins, 'earn', 'Sugestao aprovada: ' || prop.name, p_id);
      insert into public.user_gamification (user_id, joy_coins)
      values (prop.proposed_by, reward_coins)
      on conflict (user_id) do update
        set joy_coins = public.user_gamification.joy_coins + reward_coins;
    end if;
    update public.place_proposals set reward_paid = true where id = p_id;
  end if;

  return jsonb_build_object(
    'ok', true, 'published_id', new_id,
    'publish_target', target_table,
    'reward_paid', prop.source = 'user_submit' and prop.proposed_by is not null,
    'reward_amount_mzn', reward_amount, 'reward_joy_coins', reward_coins
  );
end; $function$;
