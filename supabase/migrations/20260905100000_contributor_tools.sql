-- ═══════════════════════════════════════════════════════════════════
-- 20260905100000_contributor_tools.sql
-- MedWallet — ferramentas do contribuidor + gestor regional
-- (MIGRAÇÃO 100% ADITIVA e IDEMPOTENTE — não altera nada existente)
--
-- Aplica com: supabase db push   (ou cola no SQL Editor do projecto
-- pfqruzusjjxyidhqkiob)
--
-- 1) Bucket público `proposal-photos` — fotos do exterior (3–4) das
--    instituições submetidas pela comunidade em place_proposals.
--    Público de propósito: após aprovação, o URL vai para image_url da
--    instituição publicada e é renderizado também pela versão web.
-- 2) Policies de storage: cada contribuidor escreve só na sua pasta
--    {user_id}/{proposal_id}/…
-- 3) Realtime: publica `automated_notifications` (pipeline de entrega
--    notificação-a-notificação) e `triage_logs` (histórico de triagem
--    em tempo real na app Flutter).
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Bucket ───────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'proposal-photos',
  'proposal-photos',
  true,
  5242880, -- 5 MB
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

-- ── 2. Policies de storage (idempotentes via drop+create) ───────────
drop policy if exists "contributor_upload_own_folder" on storage.objects;
create policy "contributor_upload_own_folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'proposal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "contributor_update_own_folder" on storage.objects;
create policy "contributor_update_own_folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'proposal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "contributor_delete_own_folder" on storage.objects;
create policy "contributor_delete_own_folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'proposal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "proposal_photos_authenticated_read" on storage.objects;
create policy "proposal_photos_authenticated_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'proposal-photos');

-- ── 3. Realtime ─────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename  = 'automated_notifications'
  ) then
    alter publication supabase_realtime add table public.automated_notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename  = 'triage_logs'
  ) then
    alter publication supabase_realtime add table public.triage_logs;
  end if;
end $$;

-- ── 4. Garantia de execução do RPC de entrega (best-effort) ────────
do $$
begin
  begin
    grant execute on function public.mark_notification_sent(uuid, text) to authenticated;
  exception when undefined_function then
    null; -- função não existe nesta base — ignorar
  end;
end $$;
