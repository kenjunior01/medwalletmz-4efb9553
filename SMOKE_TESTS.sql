-- ============================================================================
-- MedWallet MZ — Smoke tests (cola DEPOIS de aplicar INSTALL.sql)
-- ============================================================================
-- Cada bloco devolve uma linha por query. Se passares o cursor pelos
-- resultados, sabes exactamente o que está OK e o que falta.
-- ============================================================================

-- 1) Tabelas novas existem?
--    Esperado: 3 linhas (place_distance_cache, place_proposal_settings, place_proposals)
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('place_proposals', 'place_distance_cache', 'place_proposal_settings')
order by table_name;

-- 2) Funções SQL existem?
--    Esperado: 3 linhas (approve_proposal, bootstrap_admin, reject_proposal)
select proname
from pg_proc
where proname in ('bootstrap_admin', 'approve_proposal', 'reject_proposal')
order by proname;

-- 3) Settings foram seeded?
--    Esperado: 4 linhas com reward_mzn_per_approval=25, reward_joy_coins=50, etc.
select key, value
from public.place_proposal_settings
order by key;

-- 4) RLS activo nas tabelas novas?
--    Esperado: rowsecurity = true em todas as 3
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('place_proposals', 'place_distance_cache', 'place_proposal_settings')
order by tablename;

-- 5) Quantos admins existem neste momento?
--    Esperado: 0 (se ainda ninguém se promoveu).  Se for >0, a rota
--    /admin/bootstrap vai recusar — terás de pedir a outro admin.
select count(*) as admins_antes_bootstrap
from public.user_roles
where role = 'admin';

-- 6) Policies criadas?
--    Esperado: ~10 linhas (4 place_proposals + 2 distance_cache + 2 pps + 2 self)
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('place_proposals', 'place_distance_cache', 'place_proposal_settings')
order by tablename, policyname;

-- ============================================================================
-- 7) TESTE OPCIONAL: inserir uma proposta como um user real teu
--    (substituir <TEU_USER_UUID> pelo teu user_id — vê em Authentication → Users)
-- ============================================================================
/*
insert into public.place_proposals (source, entity_type, name, city, proposed_by, status)
values ('user_submit', 'pharmacy', 'Farmacia Teste MZ', 'Maputo',
        '<TEU_USER_UUID>', 'pending')
returning id, name, status, reward_mzn, reward_joy_coins;
-- Esperado: linha devolvida com id, name='Farmacia Teste MZ', status='pending',
--           reward_mzn=25, reward_joy_coins=50
*/

-- ============================================================================
-- 8) TESTE OPCIONAL: aprovar a proposta (requer sessão de admin)
--    Clica "Aprovar" no /admin/curation — depois verifica:
-- ============================================================================
/*
select id, name, status, published_id, publish_target, reward_paid
from public.place_proposals
where source = 'user_submit'
order by created_at desc
limit 1;
-- Esperado: status='approved', published_id NÃO null, publish_target='stores',
--           reward_paid=true
*/