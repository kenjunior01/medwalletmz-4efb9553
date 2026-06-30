-- ============================================================================
-- MedWallet MZ — INSTALL COMPLETO v2 (Round 2 + fix wallet_transactions)
-- ============================================================================
-- Este script é IDEMPOTENTE. Podes correr várias vezes sem estragar nada.
--
-- Já inclui o fix: approve_proposal() usa a schema real de wallet_transactions
-- (user_id, type, balance_after, reference_type, reference_id, status).
--
-- ⚠️ INSTRUÇÕES:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Cola TODO este bloco (Ctrl+A no ficheiro → Ctrl+V no editor)
--   3. Clica "Run" (Ctrl+Enter)
--   4. Deves ver "Success. No rows returned"
-- ============================================================================

-- ============================================================
-- 0) Helper: set_updated_at (CREATE OR REPLACE — seguro)
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ============================================================
-- 1) place_proposals — curadoria unificada
-- ============================================================
create table if not exists public.place_proposals (
  id uuid primary key default gen_random_uuid(),

  source text not null default 'google_places' check (source in ('google_places', 'user_submit')),
  entity_type text not null check (entity_type in ('pharmacy', 'clinic', 'hospital', 'doctor', 'lab', 'other')),

  name text not null,
  address text,
  city text not null,
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

  proposed_by uuid references auth.users(id) on delete set null,

  reward_mzn numeric(10,2) default 25,
  reward_joy_coins int default 50,
  reward_paid boolean default false,

  status text not null default 'pending'
       check (status in ('pending', 'in_review', 'approved', 'rejected', 'duplicate', 'merged')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  publish_target text check (publish_target in ('stores', 'clinics', 'doctor_profiles') or publish_target is null),
  published_id uuid,
  review_notes text,

  views_count int default 0,
  reports_count int default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_proposals_status_created on public.place_proposals (status, created_at desc);
create index if not exists idx_proposals_source on public.place_proposals (source, status);
create index if not exists idx_proposals_proposer on public.place_proposals (proposed_by);
create index if not exists idx_proposals_city on public.place_proposals (city);
create index if not exists idx_proposals_external on public.place_proposals (external_id, source);

drop trigger if exists trg_place_proposals_updated on public.place_proposals;
create trigger trg_place_proposals_updated
  before update on public.place_proposals
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2) RLS para place_proposals
-- ============================================================
alter table public.place_proposals enable row level security;

drop policy if exists "proposals_insert_authenticated" on public.place_proposals;
create policy "proposals_insert_authenticated" on public.place_proposals
  for insert to authenticated with check (
    proposed_by = auth.uid()
    or (proposed_by is null and source = 'google_places')
  );

drop policy if exists "proposals_self_read" on public.place_proposals;
create policy "proposals_self_read" on public.place_proposals
  for select to authenticated using (proposed_by = auth.uid());

drop policy if exists "proposals_admin_read" on public.place_proposals;
create policy "proposals_admin_read" on public.place_proposals
  for select to authenticated using (
    exists (select 1 from public.user_roles
            where user_roles.user_id = auth.uid() and user_roles.role = 'admin')
  );

drop policy if exists "proposals_admin_update" on public.place_proposals;
create policy "proposals_admin_update" on public.place_proposals
  for update to authenticated using (
    exists (select 1 from public.user_roles
            where user_roles.user_id = auth.uid() and user_roles.role = 'admin')
  );

drop policy if exists "proposals_admin_delete" on public.place_proposals;
create policy "proposals_admin_delete" on public.place_proposals
  for delete to authenticated using (
    exists (select 1 from public.user_roles
            where user_roles.user_id = auth.uid() and user_roles.role = 'admin')
  );

-- ============================================================
-- 3) bootstrap_admin() — auto-promove o caller (se não existir admin)
-- ============================================================
create or replace function public.bootstrap_admin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  existing_admins int;
begin
  if caller is null then
    raise exception 'not authenticated';
  end if;

  select count(*) into existing_admins from public.user_roles where role = 'admin';
  if existing_admins > 0 then
    raise exception 'Ja existe admin no sistema. Pede ao admin atual para te promover.';
  end if;

  perform 1 from public.user_roles where user_id = caller and role = 'admin';
  if found then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  insert into public.user_roles (user_id, role) values (caller, 'admin');

  return jsonb_build_object('ok', true, 'promoted', caller);
end; $$;

grant execute on function public.bootstrap_admin to authenticated;

-- ============================================================
-- 4) approve_proposal() — COM FIX wallet_transactions
--    Schema correcta: user_id, type, balance_after (NOT NULL),
--    reference_type, reference_id, status, payment_method.
-- ============================================================
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

  -- ============================================================
  -- Recompensa (só para submissões de utilizadores)
  -- ============================================================
  if prop.source = 'user_submit' and prop.proposed_by is not null and not prop.reward_paid then

    if reward_amount > 0 then
      -- upsert defensivo
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
    'ok', true,
    'published_id', new_id,
    'publish_target', target_table,
    'reward_paid', prop.source = 'user_submit' and prop.proposed_by is not null,
    'reward_amount_mzn', reward_amount,
    'reward_joy_coins', reward_coins
  );
end; $$;

grant execute on function public.approve_proposal(uuid,text) to authenticated;

-- ============================================================
-- 5) reject_proposal()
-- ============================================================
create or replace function public.reject_proposal(p_id uuid, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  is_admin boolean;
begin
  if caller is null then raise exception 'not authenticated'; end if;
  select exists (select 1 from public.user_roles where user_id = caller and role = 'admin') into is_admin;
  if not is_admin then raise exception 'forbidden'; end if;

  update public.place_proposals set
    status = 'rejected',
    reviewed_by = caller,
    reviewed_at = now(),
    review_notes = p_notes
  where id = p_id and status in ('pending','in_review');

  if not found then raise exception 'not found or already reviewed'; end if;
  return jsonb_build_object('ok', true);
end; $$;

grant execute on function public.reject_proposal(uuid,text) to authenticated;

-- ============================================================
-- 6) place_distance_cache
-- ============================================================
create table if not exists public.place_distance_cache (
  id uuid primary key default gen_random_uuid(),
  origin_lat double precision not null,
  origin_lng double precision not null,
  dest_kind text not null,
  dest_id uuid not null,
  duration_seconds int,
  distance_meters int,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '1 hour'),
  unique (origin_lat, origin_lng, dest_kind, dest_id)
);

create index if not exists idx_distance_cache_lookup
  on public.place_distance_cache (dest_kind, dest_id, fetched_at desc);

alter table public.place_distance_cache enable row level security;

drop policy if exists "distance_cache_public_read" on public.place_distance_cache;
create policy "distance_cache_public_read" on public.place_distance_cache
  for select using (true);

drop policy if exists "distance_cache_admin_write" on public.place_distance_cache;
create policy "distance_cache_admin_write" on public.place_distance_cache
  for all to authenticated using (
    exists (select 1 from public.user_roles
            where user_roles.user_id = auth.uid() and user_roles.role = 'admin')
  );

-- ============================================================
-- 7) place_proposal_settings (com seed)
-- ============================================================
create table if not exists public.place_proposal_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

insert into public.place_proposal_settings (key, value, description) values
  ('reward_mzn_per_approval', '25'::jsonb, 'Saldo MZN creditado por proposta aprovada'),
  ('reward_joy_coins_per_approval', '50'::jsonb, 'Joy Coins creditados por proposta aprovada'),
  ('max_pending_per_user', '20'::jsonb, 'Limite de propostas pendentes por utilizador'),
  ('auto_dedupe_enabled', 'true'::jsonb, 'Detectar duplicados automaticamente')
on conflict (key) do nothing;

alter table public.place_proposal_settings enable row level security;
drop policy if exists "pps_read_all" on public.place_proposal_settings;
create policy "pps_read_all" on public.place_proposal_settings for select using (true);
drop policy if exists "pps_admin_write" on public.place_proposal_settings;
create policy "pps_admin_write" on public.place_proposal_settings for all using (
  exists (select 1 from public.user_roles
          where user_roles.user_id = auth.uid() and user_roles.role = 'admin')
);

-- ============================================================
-- 8) Comentários
-- ============================================================
comment on table public.place_proposals is 'Propostas curadas de locais (Google Places + submissoes de utilizadores).';
comment on function public.bootstrap_admin is 'Auto-promove o caller a admin APENAS se nao existir nenhum admin ainda.';
comment on function public.approve_proposal is 'Publica a proposta na tabela final e, se for submissao de utilizador, credita MZN+JoyCoins.';
comment on function public.reject_proposal is 'Rejeita uma proposta sem publicar (admin only).';
comment on table public.place_distance_cache is 'Cache de chamadas Distance Matrix.';
comment on table public.place_proposal_settings is 'Configuracoes editaveis (admin): rewards, limites, auto-dedupe.';

-- ============================================================================
-- FIM. Deves ver "Success. No rows returned".
-- ============================================================================