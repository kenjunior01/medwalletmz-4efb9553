-- 1) Allow 'veterinary' in place_proposals.entity_type
ALTER TABLE public.place_proposals DROP CONSTRAINT IF EXISTS place_proposals_entity_type_check;
ALTER TABLE public.place_proposals ADD CONSTRAINT place_proposals_entity_type_check
  CHECK (entity_type = ANY (ARRAY['pharmacy','clinic','hospital','doctor','lab','laboratory','veterinary','other']));

-- 2) Seed / update Brazil branding + config
UPDATE public.countries SET
  branding_config = jsonb_build_object(
    'primary_color', '#009C3B',
    'secondary_color', '#FFDF00',
    'accent_color', '#002776',
    'home_banner_url', ''
  ),
  config = jsonb_build_object(
    'cities', jsonb_build_array(
      'São Paulo','Rio de Janeiro','Belo Horizonte','Brasília','Salvador',
      'Fortaleza','Curitiba','Recife','Porto Alegre','Manaus','Belém',
      'Goiânia','Campinas','Guarulhos','Florianópolis','Vitória','Natal',
      'João Pessoa','Maceió','Cuiabá','Campo Grande','Teresina','Aracaju',
      'São Luís','Palmas','Rio Branco','Boa Vista','Macapá','Porto Velho'
    ),
    'phone_placeholder', '+55 (XX) 9XXXX-XXXX',
    'tax', 10,
    'registration_defaults', jsonb_build_object(
      'consultation_fee', 150,
      'delivery_fee', 15,
      'vehicle_plate', 'ABC1D23'
    ),
    'payment_methods', jsonb_build_array(
      jsonb_build_object('id','pix','name','PIX','type','mobile_money','icon','💎','description','Pagamento instantâneo BCB','requires_phone', true, 'badge','Instantâneo'),
      jsonb_build_object('id','stripe','name','Cartão de Crédito','type','card','icon','💳','description','Visa/Mastercard/Elo via Stripe'),
      jsonb_build_object('id','boleto','name','Boleto Bancário','type','bank','icon','🏦','description','Compensação em até 3 dias úteis'),
      jsonb_build_object('id','wallet','name','Carteira MedWallet','type','wallet','icon','👛','description','Saldo em Reais (BRL)')
    ),
    'support', jsonb_build_object(
      'whatsapp','5511999999999',
      'phone','+55 11 99999-9999',
      'email','suporte.br@medwallet.com'
    ),
    'health_categories', jsonb_build_array('pharmacy','clinic','hospital','laboratory','veterinary')
  ),
  is_active = true
WHERE id = 'BR';

-- 3) Update approve_proposal to route 'veterinary' proposals to clinics with type='veterinary'
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
  cfg_mzn numeric;
  cfg_coins integer;
begin
  if caller is null then raise exception 'not authenticated'; end if;
  select exists (select 1 from public.user_roles where user_id = caller and role = 'admin') into is_admin;
  if not is_admin then raise exception 'forbidden: admin only'; end if;

  select * into prop from public.place_proposals where id = p_id;
  if not found then raise exception 'proposal not found'; end if;
  if prop.status not in ('pending','in_review') then
    raise exception 'proposal already in terminal status: %', prop.status;
  end if;

  SELECT (value::text)::numeric INTO cfg_mzn FROM public.place_proposal_settings WHERE key='reward_mzn_per_approval';
  SELECT (value::text)::integer INTO cfg_coins FROM public.place_proposal_settings WHERE key='reward_joy_coins_per_approval';
  reward_amount := LEAST(COALESCE(cfg_mzn, 25), 500);
  reward_coins  := LEAST(COALESCE(cfg_coins, 50), 1000);

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
  elsif prop.entity_type in ('clinic','hospital','laboratory','lab','veterinary') then
    target_table := 'clinics';
    clinic_type := case prop.entity_type
      when 'lab' then 'laboratory'
      else prop.entity_type
    end;
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
          when 'lab' then 'Laboratório de análises'
          when 'veterinary' then 'Clínica veterinária'
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
    review_notes = coalesce(p_notes, review_notes),
    reward_mzn = reward_amount,
    reward_joy_coins = reward_coins
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