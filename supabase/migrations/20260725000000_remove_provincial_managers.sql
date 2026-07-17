-- =====================================================================
-- REMOVE PROVINCIAL MANAGERS — KEEP ONLY NATIONAL (COUNTRY-LEVEL) MGMT
-- =====================================================================
-- Contexto: O utilizador pediu para remover os 11 gestores provinciais
-- (Maputo, Matola, Beira, Nampula, Pemba, Quelimane, Tete, Chimoio,
--  Xai-Xai, Inhambane, Lichinga) e manter APENAS gestão nacional por país.
--
-- Acções:
--   1. Remover os 11 utilizadores auth.users + profiles + user_roles +
--      country_management entries com emails gestor_<city>@medwalletmz.online
--   2. DROP province_scope, city_scope columns de country_management
--   3. Limpar campo "province" do raw_user_meta_data em auth.users que
--      ainda tenham role=country_manager (caso existam outros)
--   4. Atualizar micro-insurance products MZ para remover menções a
--      "M-Pesa" das descrições (mantém coverage_amount)
-- =====================================================================

-- ---------- 1. REMOVER 11 GESTORES PROVINCIAIS ----------
-- Lista de emails dos gestores provinciais a remover
WITH gestores_provinciais AS (
  SELECT id, email
  FROM auth.users
  WHERE email IN (
    'gestor_maputo@medwalletmz.online',
    'gestor_matola@medwalletmz.online',
    'gestor_beira@medwalletmz.online',
    'gestor_nampula@medwalletmz.online',
    'gestor_pemba@medwalletmz.online',
    'gestor_quelimane@medwalletmz.online',
    'gestor_tete@medwalletmz.online',
    'gestor_chimoio@medwalletmz.online',
    'gestor_xaixai@medwalletmz.online',
    'gestor_inhambane@medwalletmz.online',
    'gestor_lichinga@medwalletmz.online'
  )
)
-- Remove country_management entries
DELETE FROM public.country_management
WHERE user_id IN (SELECT id FROM gestores_provinciais);

-- Remove user_roles entries
DELETE FROM public.user_roles
WHERE user_id IN (SELECT id FROM gestores_provinciais);

-- Remove profiles entries
DELETE FROM public.profiles
WHERE user_id IN (SELECT id FROM gestores_provinciais);

-- Remove auth.users entries (cascades identities, sessions, etc.)
DELETE FROM auth.users
WHERE id IN (SELECT id FROM gestores_provinciais);

-- ---------- 2. DROP province_scope / city_scope COLUMNS ----------
ALTER TABLE public.country_management
  DROP COLUMN IF EXISTS province_scope,
  DROP COLUMN IF EXISTS city_scope;

-- ---------- 3. LIMPAR raw_user_meta_data: remove campo "province" ----------
-- Para qualquer country_manager restante, remover o campo "province"
-- do raw_user_meta_data (já não há scoped-by-province)
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'province',
    updated_at = now()
WHERE raw_user_meta_data ? 'province'
  AND id IN (
    SELECT user_id FROM public.user_roles WHERE role = 'country_manager'
  );

-- ---------- 4. ATUALIZAR MICRO-INSURANCE PRODUCTS MZ ----------
-- Remover menções a "M-Pesa" das descrições (mantém coverage_amount)
UPDATE public.micro_insurance_products
SET description = 'Reembolso automático se tempo de espera > 2h para consulta marcada. Pagamento via carteira MedWallet.'
WHERE code = 'SEGCASH_MZ' AND country_id = 'MZ';

UPDATE public.micro_insurance_products
SET description = 'Reembolso se entrega de farmácia > 90 min após prometido. Pagamento via carteira MedWallet.'
WHERE code = 'SEGCASHF_MZ' AND country_id = 'MZ';

-- ---------- 5. VERIFICAR CONSISTÊNCIA ----------
-- Confirmar que não há country_management com province_scope (coluna já removida)
-- Confirmar que não há users com emails gestor_<city>@medwalletmz.online

SELECT 'Migration complete — provincial managers removed, country_management simplified to national-only scope' as result;
