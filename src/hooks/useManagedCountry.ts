import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { useNavigate } from 'react-router-dom';

/**
 * useManagedCountry — isolamento total de dados para o gestor regional.
 *
 * Retorna o country_id que o gestor pode gerir e um objeto de filtros
 * pronto para usar em queries Supabase. Se o utilizador não for gestor,
 * redireciona para /auth.
 *
 * Uso:
 *   const { managedCountryId, countryFilter, isManager } = useManagedCountry();
 *
 *   const { data } = await supabase
 *     .from('profiles')
 *     .select('*')
 *     .eq('country_id', managedCountryId);
 */
export function useManagedCountry() {
  const { user, userRoles, hasRole, loading } = useAuth();
  const { country, setCountryById } = useCountry();
  const navigate = useNavigate();

  const isManager = hasRole('country_manager');
  const isGlobalAdmin = hasRole('admin');

  // O country_id que este gestor pode gerir
  const managedCountryId = useMemo(() => {
    if (isGlobalAdmin) return country?.id || null; // Admin global vê o país selecionado
    const role = userRoles.find(r => r.role === 'country_manager');
    return role?.country_id || null;
  }, [isGlobalAdmin, userRoles, country?.id]);

  // Garantir que o contexto do país está correto
  if (!loading && !isGlobalAdmin && managedCountryId && country?.id !== managedCountryId) {
    setCountryById(managedCountryId);
  }

  // Filtro Supabase pré-pronto para queries
  const countryFilter = useMemo(() => {
    if (!managedCountryId) return {};
    return { country_id: managedCountryId };
  }, [managedCountryId]);

  return {
    managedCountryId,
    countryFilter,
    isManager,
    isGlobalAdmin,
    canManage: isManager || isGlobalAdmin,
    countryName: country?.name || '',
    countryCode: country?.id || '',
  };
}
