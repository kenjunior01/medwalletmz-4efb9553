import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProvince } from '@/themes';

interface ProvinceHealthStats {
  totalDoctors: number;
  totalPharmacies: number;
  totalClinics: number;
  activeOrders: number;
}

export function useProvinceHealth() {
  const { province } = useProvince();

  const statsQuery = useQuery({
    queryKey: ['province-health', province?.id],
    queryFn: async (): Promise<ProvinceHealthStats | null> => {
      if (!province) return null;
      try {
        const [{ count: doctors }, { count: pharmacies }, { count: clinics }] = await Promise.all([
          (supabase as any)
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('province', province.id)
            .eq('role', 'doctor'),
          (supabase as any)
            .from('stores')
            .select('*', { count: 'exact', head: true })
            .eq('province', province.id),
          (supabase as any)
            .from('clinics')
            .select('*', { count: 'exact', head: true })
            .eq('province', province.id),
        ]);
        return {
          totalDoctors: doctors ?? 0,
          totalPharmacies: pharmacies ?? 0,
          totalClinics: clinics ?? 0,
          activeOrders: 0,
        };
      } catch {
        return null;
      }
    },
    enabled: !!province,
    staleTime: 5 * 60 * 1000,
  });

  return {
    province,
    stats: statsQuery.data,
    isLoading: statsQuery.isLoading,
  };
}
