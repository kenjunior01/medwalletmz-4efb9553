import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useProvince } from '@/themes';
import { useManagedCountry } from '@/hooks/useManagedCountry';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users, Stethoscope, Store, TrendingUp, MapPin, Wallet,
  CheckCircle, Ban, ChevronRight, Activity, ShoppingBag,
  AlertCircle, RefreshCw,
} from "@/components/icons/lucide-compat";
import {
  BentoCard, BentoGrid, GlassCard,
} from '@/components/ui/design-system';
import NumberFlow from '@number-flow/react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface RegionalStats {
  totalUsers: number;
  activeUsers: number;
  verifiedDoctors: number;
  consultationsMonth: number;
  ordersMonth: number;
  revenue: number;
  growthRate: number;
}

interface PendingVerification {
  id: string;
  type: 'doctor' | 'pharmacy';
  name: string;
  submitted_at: string;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export default function RegionalManagerDashboard() {
  const { province } = useProvince();
  const { managedCountryId, countryName } = useManagedCountry();
  const { t, country } = useCountry();
  const navigate = useNavigate();
  const [stats, setStats] = useState<RegionalStats>({
    totalUsers: 0, activeUsers: 0, verifiedDoctors: 0,
    consultationsMonth: 0, ordersMonth: 0, revenue: 0, growthRate: 0,
  });
  const [prevMonthOrders, setPrevMonthOrders] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currencySymbol = country?.currency_symbol || country?.currency_code || 'MT';
  const locale = country?.default_locale || 'pt';

  useEffect(() => {
    loadAll();
  }, [managedCountryId]);

  const loadAll = async () => {
    const cid = managedCountryId;
    if (!cid) {
      setError('Sem país gerido associado à sua conta.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const startMonth = new Date();
    startMonth.setDate(1);
    startMonth.setHours(0, 0, 0, 0);

    const startPrevMonth = new Date(startMonth);
    startPrevMonth.setMonth(startPrevMonth.getMonth() - 1);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      // Médicos pendentes no país — doctor_profiles.country_id + nome de profiles
      const doctorsPromise = (async () => {
        const { data: docs, error: dErr } = await (supabase as any)
          .from('doctor_profiles')
          .select('user_id, created_at, is_verified')
          .eq('country_id', cid);
        if (dErr) throw dErr;
        if (!docs?.length) return { total: 0, pending: [] as PendingVerification[] };
        const { data: dprofs } = await (supabase as any)
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', docs.map((d: any) => d.user_id));
        const nameMap = new Map((dprofs || []).map((p: any) => [p.user_id, p.full_name as string]));
        const pending = docs
          .filter((d: any) => !d.is_verified)
          .map((d: any) => ({
            id: d.user_id,
            type: 'doctor' as const,
            name: nameMap.get(d.user_id) || 'Médico',
            submitted_at: d.created_at,
          }));
        return { total: docs.filter((d: any) => d.is_verified).length, pending };
      })();

      const [usersRes, activeRes, storesRes, consultationsRes, ordersRes, ordersPrevRes, revenueRes, doctorsRes, pendingStoresRes] = await Promise.all([
        (supabase as any).from('profiles').select('id', { count: 'exact', head: true }).eq('country_id', cid),
        (supabase as any).from('profiles').select('id', { count: 'exact', head: true }).eq('country_id', cid).gte('last_sign_in_at', thirtyDaysAgo.toISOString()),
        (supabase as any).from('stores').select('id', { count: 'exact', head: true }).eq('country_id', cid),
        (supabase as any).from('consultations').select('id', { count: 'exact', head: true }).eq('country_id', cid).gte('created_at', startMonth.toISOString()),
        (supabase as any).from('orders').select('id', { count: 'exact', head: true }).eq('country_id', cid).gte('created_at', startMonth.toISOString()),
        (supabase as any).from('orders').select('id', { count: 'exact', head: true }).eq('country_id', cid).gte('created_at', startPrevMonth.toISOString()).lt('created_at', startMonth.toISOString()),
        (supabase as any).from('orders').select('total').eq('country_id', cid).gte('created_at', startMonth.toISOString()).eq('status', 'delivered'),
        doctorsPromise,
        (supabase as any).from('stores').select('id, name, created_at').eq('country_id', cid).eq('is_verified', false).limit(10),
      ]);

      const totalRevenue = (revenueRes.data || []).reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
      const currOrders = ordersRes.count || 0;
      const prevOrders = ordersPrevRes.count || 0;
      const growthRate = prevOrders > 0
        ? Number((((currOrders - prevOrders) / prevOrders) * 100).toFixed(1))
        : (currOrders > 0 ? 100 : 0);

      setStats({
        totalUsers: usersRes.count || 0,
        activeUsers: activeRes.count || 0,
        verifiedDoctors: doctorsRes.total,
        consultationsMonth: consultationsRes.count || 0,
        ordersMonth: currOrders,
        revenue: totalRevenue,
        growthRate,
      });
      setPrevMonthOrders(prevOrders);
      setPendingVerifications([
        ...doctorsRes.pending,
        ...(pendingStoresRes.data || []).map((s: any) => ({
          id: s.id, type: 'pharmacy' as const, name: s.name, submitted_at: s.created_at,
        })),
      ]);
    } catch (err: any) {
      logger.error('RegionalManagerDashboard load failed', { error: err });
      setError(err?.message || 'Erro ao carregar estatísticas do país.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item: PendingVerification, approve: boolean) => {
    // doctor_profiles: item.id é o user_id (PK é outro) — filtrar por user_id
    const { error } = item.type === 'doctor'
      ? await (supabase as any)
          .from('doctor_profiles')
          .update({ is_verified: approve })
          .eq('user_id', item.id)
      : await (supabase as any)
          .from('stores')
          .update({ is_verified: approve })
          .eq('id', item.id);

    if (error) {
      toast.error(approve ? 'Erro ao aprovar' : 'Erro ao rejeitar');
      return;
    }
    setPendingVerifications(prev => prev.filter(p => p.id !== item.id));
    toast.success(approve ? 'Aprovado com sucesso' : 'Rejeitado');
  };

  const provinceName = province?.name || countryName || 'País';
  const capital = province?.capital || '';

  const quickActions = [
    { icon: Users, label: t('regional.manage_team') || 'Gerir Equipa', path: '/regional/team', color: 'bg-teal-500/10 text-teal-500' },
    { icon: Store, label: t('regional.regional_content') || 'Conteúdo Regional', path: '/regional/content', color: 'bg-purple-500/10 text-purple-500' },
    { icon: Wallet, label: t('regional.financial_report') || 'Relatório Financeiro', path: '/regional/earnings', color: 'bg-amber-500/10 text-amber-500' },
    { icon: TrendingUp, label: t('regional.province_ranking') || 'Ranking Regional', path: '/regional-ranking', color: 'bg-emerald-500/10 text-emerald-500' },
  ];

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* Header do país / província */}
      <motion.div variants={fadeUp}>
        <h1 className="text-xl font-black">{t('regional.dashboard_title') || 'Painel do Gestor Regional'}</h1>
        <div className="flex items-center gap-2 mt-1">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <p className="text-sm text-muted-foreground">
            {t('regional.province_of') || 'Região de'} {provinceName}{capital ? ` — ${capital}` : ''}
          </p>
          {province && (
            <span className="text-xl leading-none">{province.culturalSymbol}</span>
          )}
        </div>
      </motion.div>

      {/* Error state */}
      {error && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-600">Erro ao carregar dados</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
              <Button size="sm" variant="outline" onClick={loadAll}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Tentar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      {loading ? (
        <BentoGrid className="grid-cols-2 sm:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <BentoCard key={i} size="sm" className="text-center animate-pulse">
              <div className="h-5 w-5 mx-auto bg-muted rounded mb-2" />
              <div className="h-6 w-16 mx-auto bg-muted rounded mb-1" />
              <div className="h-3 w-12 mx-auto bg-muted rounded" />
            </BentoCard>
          ))}
        </BentoGrid>
      ) : (
        <motion.div variants={fadeUp}>
          <BentoGrid className="grid-cols-2 sm:grid-cols-3">
            <BentoCard size="sm" className="text-center">
              <Users className="h-5 w-5 mx-auto text-blue-500 mb-1" />
              <p className="text-xl font-black tabular-nums"><NumberFlow value={stats.totalUsers} /></p>
              <p className="text-[10px] text-muted-foreground uppercase">{t('regional.total_users') || 'Total de Utilizadores'}</p>
            </BentoCard>
            <BentoCard size="sm" className="text-center">
              <Activity className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
              <p className="text-xl font-black tabular-nums"><NumberFlow value={stats.activeUsers} /></p>
              <p className="text-[10px] text-muted-foreground uppercase">{t('regional.active_users') || 'Activos (30d)'}</p>
            </BentoCard>
            <BentoCard size="sm" className="text-center">
              <Stethoscope className="h-5 w-5 mx-auto text-teal-500 mb-1" />
              <p className="text-xl font-black tabular-nums"><NumberFlow value={stats.verifiedDoctors} /></p>
              <p className="text-[10px] text-muted-foreground uppercase">{t('regional.active_professionals') || 'Médicos Verificados'}</p>
            </BentoCard>
            <BentoCard size="sm" className="text-center">
              <ShoppingBag className="h-5 w-5 mx-auto text-green-500 mb-1" />
              <p className="text-xl font-black tabular-nums"><NumberFlow value={stats.ordersMonth} /></p>
              <p className="text-[10px] text-muted-foreground uppercase">{t('regional.deliveries_month') || 'Encomendas este Mês'}</p>
            </BentoCard>
            <BentoCard size="sm" className="text-center">
              <Wallet className="h-5 w-5 mx-auto text-amber-500 mb-1" />
              <p className="text-xl font-black tabular-nums text-amber-600">
                {stats.revenue.toLocaleString(locale)} {currencySymbol}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase">{t('regional.revenue') || 'Receita (mês)'}</p>
            </BentoCard>
            <BentoCard size="sm" className="text-center">
              <TrendingUp className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
              <p className="text-xl font-black tabular-nums text-emerald-500">
                {stats.growthRate > 0 ? '+' : ''}<NumberFlow value={stats.growthRate} />%
              </p>
              <p className="text-[10px] text-muted-foreground uppercase">{t('regional.growth_rate') || 'Crescimento (encomendas)'}</p>
            </BentoCard>
          </BentoGrid>
        </motion.div>
      )}

      {/* Consultas no mês — destaque em largura */}
      {!loading && (
        <motion.div variants={fadeUp}>
          <GlassCard className="!p-4 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/10">
              <Stethoscope className="h-5 w-5 text-teal-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{t('regional.consultations_month') || 'Consultas este Mês'}</p>
              <p className="text-xs text-muted-foreground">{countryName}</p>
            </div>
            <p className="text-lg font-black tabular-nums"><NumberFlow value={stats.consultationsMonth} /></p>
          </GlassCard>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-2">
        {quickActions.map((action) => (
          <Button
            key={action.path}
            variant="outline"
            className="h-12 gap-2 text-sm justify-start"
            onClick={() => navigate(action.path)}
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${action.color}`}>
              <action.icon className="h-4 w-4" />
            </div>
            <span className="truncate">{action.label}</span>
          </Button>
        ))}
      </motion.div>

      {/* Pending Verifications */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base">{t('regional.pending_verifications') || 'Verificações Pendentes'}</h2>
          {pendingVerifications.length > 0 && (
            <Badge variant="destructive" className="text-xs">{pendingVerifications.length}</Badge>
          )}
        </div>
        {pendingVerifications.length === 0 ? (
          <GlassCard className="!p-6 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm text-muted-foreground">{t('regional.no_pending') || 'Sem verificações pendentes'}</p>
          </GlassCard>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pendingVerifications.slice(0, 5).map((item) => (
              <GlassCard key={`${item.type}-${item.id}`} className="!p-3 flex items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  item.type === 'doctor' ? 'bg-teal-500/10 text-teal-500' : 'bg-purple-500/10 text-purple-500'
                }`}>
                  {item.type === 'doctor' ? <Stethoscope className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.type === 'doctor' ? 'Médico' : 'Farmácia'} · {new Date(item.submitted_at).toLocaleDateString(locale)}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-500 hover:bg-emerald-500/10"
                    onClick={() => handleApprove(item, true)}>
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:bg-red-500/10"
                    onClick={() => handleApprove(item, false)}>
                    <Ban className="h-4 w-4" />
                  </Button>
                </div>
              </GlassCard>
            ))}
            {pendingVerifications.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{pendingVerifications.length - 5} pendentes
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* Tendência do mês — dados reais (encomendas vs mês anterior) */}
      {!loading && (
        <motion.div variants={fadeUp}>
          <GlassCard className="!p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{t('regional.growth_rate') || 'Tendência do Mês'}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.ordersMonth} encomendas este mês · {prevMonthOrders} no anterior
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t('regional.deliveries_month') || 'Encomendas'}</span>
                <span className="font-semibold tabular-nums">
                  {stats.ordersMonth} <span className="text-muted-foreground">/ {prevMonthOrders}</span>
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.max(prevMonthOrders, stats.ordersMonth) > 0
                      ? Math.min((stats.ordersMonth / Math.max(prevMonthOrders, stats.ordersMonth)) * 100, 100)
                      : 0}%`,
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{
                    background: province?.gradients?.accent || 'linear-gradient(90deg, #0D9488, #14B8A6)',
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {stats.growthRate >= 0
                  ? `+${stats.growthRate}% face ao mês anterior`
                  : `${stats.growthRate}% face ao mês anterior`}
              </p>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </motion.div>
  );
}
