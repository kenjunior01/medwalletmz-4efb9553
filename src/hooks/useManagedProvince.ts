import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProvince } from '@/themes';
import { useCountry } from '@/contexts/CountryContext';

/**
 * useManagedProvince — isolamento de dados a nível provincial.
 *
 * Equivalente provincial de `useManagedCountry`. Retorna o province_id
 * que o gestor provincial pode gerir e um objeto de filtros pronto
 * para usar em queries Supabase.
 *
 * - Admin e country_manager podem ver todas as províncias (sem restrição).
 * - Provincial manager fica restrito à província atribuída em user_roles.
 *
 * Uso:
 *   const { managedProvinceId, provinceFilter, canManageProvince } = useManagedProvince();
 *
 *   const { data } = await supabase
 *     .from('facilities')
 *     .select('*')
 *     .match(provinceFilter);
 */
export function useManagedProvince() {
  const { user, userRoles, hasRole, loading } = useAuth();
  const { province } = useProvince();
  const { country } = useCountry();

  // ── Verificação de papéis ──────────────────────────────────────────────
  const isProvincialManager = hasRole('provincial_manager');
  const isCountryManager = hasRole('country_manager');
  const isGlobalAdmin = hasRole('admin');

  // ── Province_id gerido ─────────────────────────────────────────────────
  // Admin e country_manager não têm restrição provincial (null = todas)
  // Provincial manager fica restrito à província atribuída no user_roles
  const managedProvinceId = useMemo<string | null>(() => {
    if (isGlobalAdmin || isCountryManager) return null;
    const role = userRoles.find(r => r.role === 'provincial_manager');
    return role?.province_id || null;
  }, [isGlobalAdmin, isCountryManager, userRoles]);

  // ── Filtro Supabase pré-pronto para queries ─────────────────────────────
  const provinceFilter = useMemo<Record<string, string>>(() => {
    if (!managedProvinceId) return {};
    return { province_id: managedProvinceId };
  }, [managedProvinceId]);

  // ── Permissão de gestão provincial ──────────────────────────────────────
  // true se admin, country_manager ou provincial_manager com acesso à província
  const canManageProvince = useMemo(() => {
    if (isGlobalAdmin || isCountryManager) return true;
    if (isProvincialManager && managedProvinceId) return true;
    return false;
  }, [isGlobalAdmin, isCountryManager, isProvincialManager, managedProvinceId]);

  return {
    /** ID da província gerida (null = sem restrição / todas) */
    managedProvinceId,
    /** Filtro para Supabase `.match(provinceFilter)` */
    provinceFilter,
    /** Utilizador tem permissão para gerir dados provinciais */
    canManageProvince,
    /** O utilizador é gestor provincial */
    isProvincialManager,
    /** O utilizador é gestor de país */
    isCountryManager,
    /** O utilizador é admin global */
    isGlobalAdmin,
    /** Tema da província atual (do context) */
    province,
    /** Dados do país atual (do context) */
    country,
    /** Estado de carregamento da autenticação */
    loading,
  };
}
