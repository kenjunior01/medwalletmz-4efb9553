-- ============================================================================
-- MedWallet MZ — DIAGNÓSTICO: descobre o que está e o que falta
-- ============================================================================
-- Cola no SQL Editor → Run. Manda-me a saída (mesmo que dê erro).
-- ============================================================================

-- A) Tabelas novas existem?
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('place_proposals', 'place_distance_cache', 'place_proposal_settings')
order by table_name;

-- B) Funções SQL minhas existem?
select proname
from pg_proc
where proname in ('bootstrap_admin', 'approve_proposal', 'reject_proposal')
order by proname;

-- C) Função set_updated_at (helper) existe?
select proname, prosrc
from pg_proc
where proname = 'set_updated_at';

-- D) Policies criadas?
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('place_proposals', 'place_distance_cache', 'place_proposal_settings')
order by tablename, policyname;

-- E) Settings seeded?
select key, value
from public.place_proposal_settings;

-- F) Existem admins?
select count(*) as admins
from public.user_roles
where role = 'admin';

-- G) Existem transacções wallet com reference_type place_proposal?
--    (devia estar vazio — para confirmar que o patch anterior não inseriu nada parcial)
select count(*) as tx_place_proposal
from public.wallet_transactions
where reference_type = 'place_proposal';