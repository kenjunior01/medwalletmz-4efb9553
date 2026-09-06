-- ============================================================================
-- MedWallet MZ — Chat com Instituições (farmácias, clínicas, laboratórios,
-- hospitais e veterinárias) + Envio de receitas por anexo.
--
-- Migração 100% ADITIVA: não altera nenhuma tabela existente da versão web.
-- Fontes de instituições (já existentes na base): stores, clinics,
-- veterinary_clinics — o app NÃO expõe produtos, apenas diretório + chat.
--
-- Aplicar no MESMO projeto Supabase da versão web:
--   supabase link --project-ref pfqruzusjjxyidhqkiob
--   supabase db push
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Conversas utilizador ↔ instituição
--    source identifica a tabela de origem: store | clinic | veterinary
-- ----------------------------------------------------------------------------
create table if not exists public.facility_conversations (
  id                uuid primary key default gen_random_uuid(),
  source            text not null check (source in ('store', 'clinic', 'veterinary')),
  entity_id         uuid not null,
  user_id           uuid not null references auth.users(id) on delete cascade,
  facility_name     text,
  created_at        timestamptz not null default now(),
  last_message_at   timestamptz,
  last_message_text text,
  last_sender_role  text check (last_sender_role in ('customer', 'facility')),
  user_last_read_at timestamptz not null default now(),
  unique (source, entity_id, user_id)
);

create index if not exists idx_fac_conv_user on public.facility_conversations(user_id, last_message_at desc);
create index if not exists idx_fac_conv_entity on public.facility_conversations(source, entity_id);

alter table public.facility_conversations enable row level security;

-- Dono da instituição (função reutilizável, security definer para RLS)
create or replace function public.is_facility_owner(p_source text, p_entity_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select case p_source
    when 'store'      then exists (select 1 from public.stores s where s.id = p_entity_id and s.owner_id = auth.uid())
    when 'clinic'     then exists (select 1 from public.clinics c where c.id = p_entity_id and c.owner_id = auth.uid())
    when 'veterinary' then exists (select 1 from public.veterinary_clinics v where v.id = p_entity_id and v.owner_id = auth.uid())
    else false
  end
$$;

drop policy if exists "fac conv participant read" on public.facility_conversations;
create policy "fac conv participant read" on public.facility_conversations
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_facility_owner(source, entity_id)
    or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "fac conv customer insert" on public.facility_conversations;
create policy "fac conv customer insert" on public.facility_conversations
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "fac conv customer read-update" on public.facility_conversations;
create policy "fac conv customer read-update" on public.facility_conversations
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. Mensagens da conversa (texto + anexo: foto de receita / documento)
-- ----------------------------------------------------------------------------
create table if not exists public.facility_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.facility_conversations(id) on delete cascade,
  sender_id       uuid not null references auth.users(id) on delete cascade,
  sender_role     text not null default 'customer' check (sender_role in ('customer', 'facility')),
  body            text,
  attachment_url  text,
  attachment_kind text check (attachment_kind in ('image', 'pdf')),
  created_at      timestamptz not null default now()
);

create index if not exists idx_fac_msg_conv on public.facility_messages(conversation_id, created_at);

alter table public.facility_messages enable row level security;

drop policy if exists "fac msg participant read" on public.facility_messages;
create policy "fac msg participant read" on public.facility_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.facility_conversations c
      where c.id = conversation_id
        and (c.user_id = auth.uid()
             or public.is_facility_owner(c.source, c.entity_id)
             or public.has_role(auth.uid(), 'admin'))
    )
  );

drop policy if exists "fac msg participant insert" on public.facility_messages;
create policy "fac msg participant insert" on public.facility_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      sender_role = 'customer'
      or exists (
        select 1 from public.facility_conversations c
        where c.id = conversation_id and public.is_facility_owner(c.source, c.entity_id)
      )
    )
    and exists (
      select 1 from public.facility_conversations c
      where c.id = conversation_id
        and (c.user_id = auth.uid()
             or public.is_facility_owner(c.source, c.entity_id)
             or public.has_role(auth.uid(), 'admin'))
    )
  );

-- ----------------------------------------------------------------------------
-- 3. Trigger: mantém preview da última mensagem na conversa
-- ----------------------------------------------------------------------------
create or replace function public.facility_message_after_insert()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.facility_conversations
     set last_message_at   = new.created_at,
         last_message_text = coalesce(
           new.body,
           case when new.attachment_kind = 'pdf' then 'Documento enviado' else 'Foto enviada' end
         ),
         last_sender_role  = new.sender_role
   where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists trg_facility_message_after_insert on public.facility_messages;
create trigger trg_facility_message_after_insert
  after insert on public.facility_messages
  for each row execute function public.facility_message_after_insert();

-- ----------------------------------------------------------------------------
-- 4. RPC: abre (ou reutiliza) a conversa do utilizador com uma instituição
-- ----------------------------------------------------------------------------
create or replace function public.open_facility_conversation(
  p_source text,
  p_entity_id uuid,
  p_facility_name text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id  uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Nao autenticado';
  end if;
  if p_source not in ('store', 'clinic', 'veterinary') then
    raise exception 'Origem invalida';
  end if;

  select id into v_id
    from public.facility_conversations
   where source = p_source and entity_id = p_entity_id and user_id = v_uid
   limit 1;

  if v_id is null then
    insert into public.facility_conversations (source, entity_id, user_id, facility_name)
    values (p_source, p_entity_id, v_uid, p_facility_name)
    returning id into v_id;
  end if;

  return v_id;
end $$;

grant execute on function public.open_facility_conversation(text, uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Realtime (mesma publicação da versão web)
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'facility_conversations'
  ) then
    alter publication supabase_realtime add table public.facility_conversations;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'facility_messages'
  ) then
    alter publication supabase_realtime add table public.facility_messages;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 6. Storage privado para anexos (receitas fotografadas, documentos)
--    Caminho: {conversation_id}/{timestamp}_{ficheiro}
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;

drop policy if exists "chat attach upload" on storage.objects;
create policy "chat attach upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from public.facility_conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (c.user_id = auth.uid()
             or public.is_facility_owner(c.source, c.entity_id)
             or public.has_role(auth.uid(), 'admin'))
    )
  );

drop policy if exists "chat attach read" on storage.objects;
create policy "chat attach read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from public.facility_conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (c.user_id = auth.uid()
             or public.is_facility_owner(c.source, c.entity_id)
             or public.has_role(auth.uid(), 'admin'))
    )
  );

drop policy if exists "chat attach delete own" on storage.objects;
create policy "chat attach delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from public.facility_conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (c.user_id = auth.uid()
             or public.is_facility_owner(c.source, c.entity_id)
             or public.has_role(auth.uid(), 'admin'))
    )
  );
