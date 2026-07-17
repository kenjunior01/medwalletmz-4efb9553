import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Users, ShoppingBag, TrendingUp, Stethoscope } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCountry } from '@/contexts/CountryContext';
import { useGlobalAdminGuard } from '@/hooks/useAdminGuard';

export default function GlobalMetrics() {
  useGlobalAdminGuard();
  const { allCountries } = useCountry();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['global-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('country_metrics' as any)
        .select('*');

      if (error) throw error;
      return data as any[];
    }
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black flex items-center gap-2">
          <Globe className="h-8 w-8 text-primary" /> Métricas Mundiais
        </h1>
        <p className="text-muted-foreground">Visão consolidada da MedWallet em todos os mercados.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics?.map((m) => (
          <Card key={m.country_id} className="overflow-hidden border-2 hover:border-primary/50 transition-all">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-bold">{m.country_name}</CardTitle>
                <span className="text-2xl">{m.country_id === 'MZ' ? '🇲🇿' : m.country_id === 'BR' ? '🇧🇷' : m.country_id === 'AO' ? '🇦🇴' : '🌐'}</span>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> Usuários
                  </p>
                  <p className="text-2xl font-black">{m.total_users}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <ShoppingBag className="h-3 w-3" /> Pedidos
                  </p>
                  <p className="text-2xl font-black">{m.total_orders}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <Stethoscope className="h-3 w-3" /> Médicos
                  </p>
                  <p className="text-2xl font-black">{m.active_doctors}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Receita
                  </p>
                  <p className="text-lg font-black text-primary truncate">
                    {m.total_revenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
