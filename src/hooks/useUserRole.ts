import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'customer' | 'store_owner' | 'driver' | 'doctor' | 'clinic' | 'country_manager' | 'insurance' | 'hospital' | 'lab';

export function useUserRoles() {
  const { user, roles: authRoles, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>(authRoles as AppRole[]);
  const [loading, setLoading] = useState(authLoading);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (authRoles.length > 0 || !user) {
      setRoles(authRoles as AppRole[]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        if (cancelled) return;
        if (error) {
          console.error("Erro ao buscar papéis do utilizador:", error);
          setRoles([]);
        } else {
          setRoles((data || []).map((r: any) => r.role as AppRole));
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Erro fatal ao buscar papéis:", err);
        setRoles([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, authRoles, user]);

  return { roles, loading, isDoctor: roles.includes('doctor') };
}