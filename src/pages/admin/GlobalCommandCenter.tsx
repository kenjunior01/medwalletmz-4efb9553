import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Users, CreditCard, TrendingUp, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalDashboard() {
  const [stats, setStats] = useState<any>({
    totalRevenue: 0,
    activeCountries: 0,
    totalUsers: 0,
    pendingVerifications: 0,
    countryBreakdown: []
  });

  useEffect(() => {
    async function fetchGlobalStats() {
      // Aqui faríamos queries agregadas por país
      const { data: countries } = await supabase.from('countries').select('id, name, currency_code');
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

      setStats({
        totalRevenue: 1250000, // Exemplo
        activeCountries: countries?.length || 0,
        totalUsers: usersCount || 0,
        pendingVerifications: 14,
        countryBreakdown: countries || []
      });
    }
    fetchGlobalStats();
  }, []);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Globe className="text-primary" /> MedWallet Global Command Center
        </h1>
        <Button>Adicionar Novo País</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Receita Global (USD)" value={`$${stats.totalRevenue.toLocaleString()}`} icon={<CreditCard />} />
        <StatCard title="Países Ativos" value={stats.activeCountries} icon={<MapPin />} />
        <StatCard title="Total Utilizadores" value={stats.totalUsers} icon={<Users />} />
        <StatCard title="Crescimento Mensal" value="+12%" icon={<TrendingUp />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Gestão de Países</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.countryBreakdown.map((c: any) => (
                <div key={c.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-white transition shadow-sm">
                  <div>
                    <p className="font-bold">{c.name} ({c.id})</p>
                    <p className="text-xs text-muted-foreground">Moeda: {c.currency_code}</p>
                  </div>
                  <Button variant="outline" size="sm">Gerir País</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Alertas Globais</CardTitle></CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Nenhum alerta crítico nos territórios ativos.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
