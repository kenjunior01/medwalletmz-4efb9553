-- ============================================================================
-- MedWallet MZ — Round 2: Curation Places + Submissão Utilizadores
--                       Distance Matrix hooks + Bootstrap Admin
-- ============================================================================
-- Cobre 4 pedidos:
--   1) Curadoria Google Places: resultados ficam como "propostas" (rascunhos)
--      que o admin revê/edita/aprova antes de publicar nas tabelas finais.
--   2) Submissão de clínicas/farmácias por utilizadores — quem sugere ganha
--      um saldo / Joy Coins quando o admin aprovar.
--   3) Distance Matrix do Google — prepara-se coluna para caching das distâncias
--      em tempo real (tráfego) na widget Nearby Providers.
--   4) Bootstrap admin — uma rota protegida para o primeiro utilizador
--      se auto-promover a admin sem precisar mexer no SQL.
-- ============================================================================

-- ============================================================
-- 1) place_proposals  (curadoria unificada — Google OR user)
-- ============================================================
create table if not exists public.place_proposals (
  id uuid primary key default gen_random_uuid(),

  -- Origem da proposta
  source text not null default 'google_places' check (source in ('google_places', 'user_submit')),

  -- Categoria do local proposto
  entity_type text not null check (entity_type in ('pharmacy', 'clinic', 'hospital', 'doctor', 'lab', 'other')),

  -- Campos "rich" directos (mapeados para stores/clinics ao aprovar)
  name text not null,
  address text,
  city text not null,
  neighborhood text,           -- bairro / ponto de referência próximo
  reference_point text,         -- ex: "perto do mercado municipal"
  phone text,
  website text,
  description text,
  image_url text,
  latitude double precision,
  longitude double precision,

  -- Para agrupar pesquisas do Places (mesma passagem do import-places)
  external_id text,            -- google places id
  raw_payload jsonb,           -- payload original completo (Google Places)
  search_meta jsonb,           -- {city, query, imported_at, ...}

  -- Quem propôs (null para Google Places "oficial")
  proposed_by uuid references auth.users(id) on delete set null,

  -- Recompensa por submissão aprovada
  reward_mzn numeric(10,2) default 25,
  reward_joy_coins int default 50,
  reward_paid boolean default false,

  -- Workflow de curadoria
  status text not null default 'pending'
       check (status in ('pending', 'in_review', 'approved', 'rejected', 'duplicate', 'merged')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  publish_target text check (publish_target in ('stores', 'clinics', 'doctor_profiles') or publish_target is null),
  published_id uuid,           -- id da row gerada após aprovação
  review_notes text,

  -- Métricas
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

-- Trigger updated_at
drop trigger if exists trg_place_proposals_updated on public.place_proposals;
create trigger trg_place_proposals_updated
  before update on public.place_proposals
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2) RLS para place_proposals
-- ============================================================
alter table public.place_proposals enable row level security;

-- Submissão pública (qualquer autenticado pode sugerir)
drop policy if exists "proposals_insert_authenticated" on public.place_proposals;
create policy "proposals_insert_authenticated" on public.place_proposals
  for insert to authenticated with check (
    proposed_by = auth.uid()  -- só pode submeter em nome próprio
    or (proposed_by is null AND source = 'google_places')  -- edge func pode inserir Places sem user
  );

-- Utilizador vê apenas as suas próprias submissões (status + reward_paid)
drop policy if exists "proposals_self_read" on public.place_proposals;
create policy "proposals_self_read" on public.place_proposals
  for select to authenticated using (proposed_by = auth.uid());

-- Edge function `import-places` insere com service_role (não passa por RLS).
-- Mas para o caso da Places API, queremos que o admin também consiga ver tudo:
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
-- 3) bootstrap_admin()  — promove o caller a admin SE ainda não houver admin.
--    Cobre o caso "não consigo entrar como admin" — o primeiro user a logar-se
--    pode auto-promover-se para destrancar o painel. Quando já houver admin,
--    a função recusa-se.
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
  new_role public.user_roles;
begin
  if caller is null then
    raise exception 'not authenticated';
  end if;

  select count(*) into existing_admins from public.user_roles where role = 'admin';
  if existing_admins > 0 then
    raise exception 'Já existe admin no sistema. Pede ao admin atual para te promover.';
  end if;

  -- Verifica se caller já é admin (idempotente)
  perform 1 from public.user_roles where user_id = caller and role = 'admin';
  if found then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  insert into public.user_roles (user_id, role) values (caller, 'admin');

  return jsonb_build_object('ok', true, 'promoted', caller);
end; $$;

grant execute on function public.bootstrap_admin to authenticated;

-- ============================================================
-- 4) approve_proposal()  — workflow de publicação com reward
--    Chama o admin via UI; a função publica na tabela final
--    correcta e (se veio de user_submit) credita a reward.
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
  wallet_id uuid;
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

  -- Determinar tabela alvo
  if prop.entity_type in ('pharmacy') then
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
      phone, logo_url, description, is_active, is_verified, owner_id,
      type  -- se a coluna existir, mantenha; senão ignore
    ) values (
      prop.name, coalesce(prop.address,''), prop.city,
      prop.latitude, prop.longitude,
      coalesce(prop.phone,''),
      coalesce(prop.image_url,''),
      coalesce(prop.description, case when prop.entity_type='hospital' then 'Hospital' else 'Clínica' end),
      true, true, caller,
      prop.entity_type
    )
    returning id into new_id;
  else
    -- por agora, não publicamos doctors/labs/others — ficam approved sem publish_target.
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

  -- Recompensar quem propôs (se for submissão de utilizador e houver reward)
  if prop.source = 'user_submit' and prop.proposed_by is not null and not prop.reward_paid then
    -- Credita MZN na wallet_medwallet (se existir)
    select id into wallet_id from public.wallets where user_id = prop.proposed_by limit 1;
    if wallet_id is not null and coalesce(prop.reward_mzn,0) > 0 then
      update public.wallets set balance_mzn = coalesce(balance_mzn,0) + prop.reward_mzn
      where id = wallet_id;

      insert into public.wallet_transactions (wallet_id, amount, kind, description, ref)
      values (wallet_id, prop.reward_mzn, 'credit', 'Sugestão aprovada: ' || prop.name, 'place_proposal:'||p_id::text);
    end if;

    -- Joy Coins
    insert into public.joy_coin_transactions (user_id, amount, transaction_type, description)
    values (prop.proposed_by, coalesce(prop.reward_joy_coins, 50), 'earn', 'Sugestão aprovada: ' || prop.name);

    update public.user_gamification
       set joy_coins = coalesce(joy_coins,0) + coalesce(prop.reward_joy_coins,50)
     where user_id = prop.proposed_by;

    update public.place_proposals set reward_paid = true where id = p_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'published_id', new_id,
    'publish_target', target_table,
    'reward_paid', prop.source = 'user_submit' and prop.proposed_by is not null
  );
end; $$;

grant execute on function public.approve_proposal(uuid,text) to authenticated;

-- ============================================================
-- 5) reject_proposal() — rejeição sem publicar, opcionalmente com notas
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
-- 6) place_distance_cache — cache das chamadas Distance Matrix
--    (reduz custo + latência no widget "Perto de ti")
-- ============================================================
create table if not exists public.place_distance_cache (
  id uuid primary key default gen_random_uuid(),
  origin_lat double precision not null,
  origin_lng double precision not null,
  dest_kind text not null,
  dest_id uuid not null,
  duration_seconds int,           -- duração da rota em condições actuais de tráfego
  distance_meters int,            -- distância real (não em linha recta)
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

-- Limpeza periódica das entries expiradas (chamada pelo cliente / edge func)
drop policy if exists "distance_cache_admin_write" on public.place_distance_cache;
create policy "distance_cache_admin_write" on public.place_distance_cache
  for all to authenticated using (
    exists (select 1 from public.user_roles
            where user_roles.user_id = auth.uid() and user_roles.role = 'admin')
  );

-- ============================================================
-- 7) place_proposal_settings — configurar recompensas e limites
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
-- 8) Comentários (changelog)
-- ============================================================
comment on table public.place_proposals is
  'Propostas curadas de locais (Google Places + submissões de utilizadores). Status pending/approved/rejected.';
comment on function public.bootstrap_admin is
  'Auto-promove o caller a admin APENAS se não existir nenhum admin ainda (uso único).';
comment on function public.approve_proposal is
  'Publica a proposta na tabela final (stores/clinics) e, se for submissão de utilizador, credita MZN+JoyCoins.';
comment on function public.reject_proposal is
  'Rejeita uma proposta sem publicar (admin only).';
comment on table public.place_distance_cache is
  'Cache de chamadas Distance Matrix para ordenar prestadores por rota/tempo real.';
comment on table public.place_proposal_settings is
  'Configurações editáveis (admin): rewards, limites, auto-dedupe.';