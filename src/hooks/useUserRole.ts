import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'customer' | 'store_owner' | 'driver' | 'doctor' | 'clinic';

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
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (cancelled) return;
        setRoles((data || []).map((r: any) => r.role));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [authLoading, authRoles, user]);

  return { roles, loading, isDoctor: roles.includes('doctor') };
}