import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useManagedCountry } from '@/hooks/useManagedCountry';
import { useCountry } from '@/contexts/CountryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, ShoppingBag, Store, Stethoscope, Truck, TrendingUp, Activity, ShieldCheck } from 'lucide-react';

export default function ManagerHome() {
  const { managedCountryId, countryCode, countryName } = useManagedCountry();
  const { t } = useCountry();
  const [stats, setStats] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!managedCountryId) return;

    async function loadStats() {
      setLoading(true);
      try {
        const filters = { country_id: managedCountryId };

        const [usersRes, ordersRes, storesRes, doctorsRes, driversRes] = await Promise.allSettled([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('country_id', managedCountryId),
          supabase.from('orders').select('*', { count: 'exact', head: true }).eq('country_id', managedCountryId),
          supabase.from('stores').select('*', { count: 'exact', head: true }).eq('country_id', managedCountryId),
          supabase.from('doctor_profiles').select('*', { count: 'exact', head: true }).eq('country_id', managedCountryId),
          supabase.from('driver_profiles').select('*', { count: 'exact', head: true }).eq('country_id', managedCountryId),
        ]);

        const getCount = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? r.value.count || 0 : 0;

        setStats([
          { label: t('nav.users'), value: getCount(usersRes), icon: Users, color: 'text-blue-500' },
          { label: t('nav.orders'), value: getCount(ordersRes), icon: ShoppingBag, color: 'text-green-500' },
          { label: t('nav.pharmacy'), value: getCount(storesRes), icon: Store, color: 'text-purple-500' },
          { label: t('nav.doctors'), value: getCount(doctorsRes), icon: Stethoscope, color: 'text-teal-500' },
          { label: t('nav.drivers'), value: getCount(driversRes), icon: Truck, color: 'text-amber-500' },
          { label: t('home.clinics'), value: 0, icon: Activity, color: 'text-orange-500' },
        ]);

        const { data: recentUsers } = await supabase
          .from('profiles')
          .select('full_name, created_at, phone')
          .eq('country_id', managedCountryId)
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentActivity(recentUsers || []);
      } catch (err) {
        console.error('Erro ao carregar stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [managedCountryId, t]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho — visual completamente diferente do admin */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 p-6 md:p-8 border border-primary/10">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl md:text-3xl font-black">{t('manager.welcome_title') || 'Painel Regional'}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {countryName} <Badge variant="secondary" className="text-[10px] ml-1">{countryCode}</Badge>
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-2 max-w-xl">
            {t('manager.isolation_notice') || 'Acesso restrito aos dados da sua região. Não pode ver dados de outras regiões.'}
          </p>
        </div>
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
        <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-secondary/10 blur-2xl" />
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-none shadow-sm hover:shadow-md transition-all group">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
                  <p className="text-3xl font-black tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                </div>
                <div className={`${color} opacity-80 group-hover:opacity-100 transition-opacity`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Atividade recente — apenas da região */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-bold">{t('manager.recent_registrations') || 'Registos Recentes'}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t('manager.no_recent_activity') || 'Sem atividade recente.'}</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((u, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {(u.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.full_name || '—'}</p>
                      <p className="text-[10px] text-muted-foreground">{u.phone || '—'}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
