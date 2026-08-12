import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useProvince } from '@/themes';
import { useManagedProvince } from '@/hooks/useManagedProvince';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users, Stethoscope, Store, TrendingUp, MapPin, Wallet,
  CheckCircle, Ban, ChevronRight, Activity, ShoppingBag,
} from "@/components/icons/lucide-compat";
import {
  BentoCard, BentoGrid, GlassCard,
} from '@/components/ui/design-system';
import NumberFlow from '@number-flow/react';
import { motion } from 'framer-motion';

interface RegionalStats {
  totalUsers: number;
  activeProfessionals: number;
  consultationsMonth: number;
  deliveriesMonth: number;
  revenue: number;
  growthRate: number;
}

interface PendingVerification {
  id: string;
  type: 'doctor' | 'rider' | 'health_worker';
  name: string;
  submitted_at: string;
  province: string;
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
  const { managedProvinceId } = useManagedProvince();
  const { t } = useCountry();
  const navigate = useNavigate();
  const [stats, setStats] = useState<RegionalStats>({
    totalUsers: 0, activeProfessionals: 0, consultationsMonth: 0,
    deliveriesMonth: 0, revenue: 0, growthRate: 0,
  });
  const [pendingVerifications, setPendingVerifications] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadPendingVerifications();
  }, [province]);

  const loadStats = async () => {
    if (!province) return;
    setLoading(true);
    const pid = managedProvinceId || province?.id || '';

    const startMonth = new Date();
    startMonth.setDate(1);
    startMonth.setHours(0, 0, 0, 0);

    const startPrevMonth = new Date(startMonth);
    startPrevMonth.setMonth(startPrevMonth.getMonth() - 1);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [usersRes, doctorsRes, consultationsRes, ordersRes, prevOrdersRes, activeRes, revenueRes] = await Promise.all([
      (supabase as any).from('profiles').select('id', { count: 'exact', head: true }).eq('province', pid),
      (supabase as any).from('doctor_profiles').select('id', { count: 'exact', head: true }).eq('province', pid).eq('is_verified', true),
      (supabase as any).from('consultations').select('id', { count: 'exact', head: true }).eq('province', pid).gte('created_at', startMonth.toISOString()),
      (supabase as any).from('orders').select('id', { count: 'exact', head: true }).eq('province', pid).gte('created_at', startMonth.toISOString()),
      (supabase as any).from('orders').select('id', { count: 'exact', head: true }).eq('province', pid).gte('created_at', startPrevMonth.toISOString()).lt('created_at', startMonth.toISOString()),
      (supabase as any).from('profiles').select('id', { count: 'exact', head: true }).eq('province', pid).gte('last_sign_in_at', thirtyDaysAgo.toISOString()),
      (supabase as any).from('orders').select('total').eq('province', pid).gte('created_at', startMonth.toISOString()).eq('status', 'delivered'),
    ]);

    const totalRevenue = (revenueRes.data || []).reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
    const prevOrders = prevOrdersRes.count || 0;
    const currOrders = ordersRes.count || 0;
    const growthRate = prevOrders > 0 ? (((currOrders - prevOrders) / prevOrders) * 100).toFixed(1) : (currOrders > 0 ? '100.0' : '0.0');

    setStats({
      totalUsers: usersRes.count || 0,
      activeProfessionals: (doctorsRes.count || 0) + (activeRes.count || 0),
      consultationsMonth: consultationsRes.count || 0,
      deliveriesMonth: currOrders,
      revenue: totalRevenue,
      growthRate: Number(growthRate),
    });
    setLoading(false);
  };

  const loadPendingVerifications = async () => {
    if (!province) return;
    const pid = managedProvinceId || province?.id || '';

    const { data: doctors } = await (supabase as any)
      .from('doctor_profiles')
      .select('id, full_name, created_at')
      .eq('province', pid)
      .eq('is_verified', false)
      .limit(10);

    const items: PendingVerification[] = [
      ...(doctors || []).map((d: any) => ({
        id: d.id, type: 'doctor' as const, name: d.full_name,
        submitted_at: d.created_at, province: pid,
      })),
    ];
    setPendingVerifications(items);
  };

  const handleApprove = async (item: PendingVerification, approve: boolean) => {
    const table = item.type === 'doctor' ? 'doctor_profiles' : 'profiles';
    const { error } = await (supabase as any)
      .from(table)
      .update({ is_verified: approve })
      .eq('id', item.id);

    if (!error) {
      setPendingVerifications(prev => prev.filter(p => p.id !== item.id));
    }
  };

  const provinceName = province?.name || t('regional.province_of') || 'Província';
  const capital = province?.capital || '—';

  const quickActions = [
    { icon: Users, label: t('regional.manage_team') || 'Gerir Equipa', path: '/regional/team', color: 'bg-teal-500/10 text-teal-500' },
    { icon: Store, label: t('regional.regional_content') || 'Conteúdo Regional', path: '/regional/content', color: 'bg-purple-500/10 text-purple-500' },
    { icon: Wallet, label: t('regional.financial_report') || 'Relatório Financeiro', path: '/regional/earnings', color: 'bg-amber-500/10 text-amber-500' },
    { icon: TrendingUp, label: t('regional.province_ranking') || 'Ranking Provincial', path: '/regional/rankings', color: 'bg-emerald-500/10 text-emerald-500' },
  ];

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* Province Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-xl font-black">{t('regional.dashboard_title') || 'Painel do Gestor Provincial'}</h1>
        <div className="flex items-center gap-2 mt-1">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <p className="text-sm text-muted-foreground">
            {t('regional.province_of') || 'Província de'} {provinceName} — {capital}
          </p>
          {province && (
            <span className="text-xl leading-none">{province.culturalSymbol}</span>
          )}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={fadeUp}>
        <BentoGrid className="grid-cols-2 sm:grid-cols-3">
          <BentoCard size="sm" className="text-center">
            <Users className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={stats.totalUsers} /></p>
            <p className="text-[10px] text-muted-foreground uppercase">{t('regional.total_users') || 'Total de Utilizadores'}</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <Activity className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={stats.activeProfessionals} /></p>
            <p className="text-[10px] text-muted-foreground uppercase">{t('regional.active_professionals') || 'Profissionais Activos'}</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <Stethoscope className="h-5 w-5 mx-auto text-teal-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={stats.consultationsMonth} /></p>
            <p className="text-[10px] text-muted-foreground uppercase">{t('regional.consultations_month') || 'Consultas este Mês'}</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <ShoppingBag className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={stats.deliveriesMonth} /></p>
            <p className="text-[10px] text-muted-foreground uppercase">{t('regional.deliveries_month') || 'Entregas este Mês'}</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <Wallet className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-xl font-black tabular-nums text-amber-600">
              <NumberFlow value={stats.revenue} />
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">{t('regional.revenue') || 'Receita (MZN)'}</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
            <p className="text-xl font-black tabular-nums text-emerald-500">
              {stats.growthRate > 0 ? '+' : ''}<NumberFlow value={stats.growthRate} />%
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">{t('regional.growth_rate') || 'Taxa de Crescimento'}</p>
          </BentoCard>
        </BentoGrid>
      </motion.div>

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
          <Badge className="text-xs">{pendingVerifications.length}</Badge>
        </div>
        {pendingVerifications.length === 0 ? (
          <GlassCard className="!p-6 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm text-muted-foreground">{t('regional.no_pending') || 'Sem verificações pendentes'}</p>
          </GlassCard>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pendingVerifications.slice(0, 5).map((item) => (
              <GlassCard key={item.id} className="!p-3 flex items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  item.type === 'doctor' ? 'bg-teal-500/10 text-teal-500' :
                  item.type === 'rider' ? 'bg-blue-500/10 text-blue-500' :
                  'bg-purple-500/10 text-purple-500'
                }`}>
                  {item.type === 'doctor' ? <Stethoscope className="h-4 w-4" /> :
                   item.type === 'rider' ? <ShoppingBag className="h-4 w-4" /> :
                   <Activity className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.type === 'doctor' ? 'Médico' : item.type === 'rider' ? 'Rider' : 'Profissional'} · {new Date(item.submitted_at).toLocaleDateString('pt-PT')}
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
          </div>
        )}
      </motion.div>

      {/* Province vs National Comparison */}
      <motion.div variants={fadeUp}>
        <GlassCard className="!p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{t('regional.province_ranking') || 'Ranking Provincial'}</p>
              <p className="text-xs text-muted-foreground">{t('regional.vs_national') || 'vs Nacional'}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          {/* Mini comparison bars */}
          <div className="space-y-2">
            {[
              { label: t('regional.total_users') || 'Utilizadores', prov: stats.totalUsers, nat: 1500 },
              { label: t('regional.consultations_month') || 'Consultas', prov: stats.consultationsMonth, nat: 300 },
              { label: t('regional.revenue') || 'Receita', prov: stats.revenue, nat: 500000 },
            ].map((item) => {
              const provPct = item.nat > 0 ? Math.min((item.prov / item.nat) * 100, 100) : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold tabular-nums">
                      {typeof item.prov === 'number' && item.prov > 1000
                        ? `${(item.prov / 1000).toFixed(1)}k`
                        : item.prov.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${provPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{
                        background: province?.gradients?.accent || 'linear-gradient(90deg, #0D9488, #14B8A6)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
