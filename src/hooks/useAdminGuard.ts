import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Guard para páginas globais do admin — country_manager NÃO tem acesso.
 * Redireciona managers para o painel do seu país, e não-admins para /.
 */
export function useGlobalAdminGuard() {
  const { hasRole, loading, user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/auth', { replace: true }); return; }
    if (hasRole('admin')) return;
    if (hasRole('country_manager')) {
      navigate('/admin/country-dashboard', { replace: true });
      return;
    }
    navigate('/', { replace: true });
  }, [loading, user, hasRole, navigate]);
}