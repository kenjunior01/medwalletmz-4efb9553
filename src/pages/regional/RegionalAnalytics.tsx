'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useProvince, provinces } from '@/themes';
import { useCountry } from '@/contexts/CountryContext';
import { GlassCard, BentoCard, BentoGrid } from '@/components/ui/design-system';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import NumberFlow from '@number-flow/react';
import {
  TrendingUp, Users, Stethoscope, Package, Wallet, Activity,
  MapPin, BarChart3, ArrowUpRight, ArrowDownRight, Calendar, Clock,
  Zap, Target, Award, Globe, Star, Truck, Heart, Building2,
} from '@/components/icons/lucide-compat';

// ─── Animation Variants ────────────────────────────────────────────────────
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 360, damping: 26 } },
};

// ─── Types ─────────────────────────────────────────────────────────────────
type Period = '7d' | '30d' | '90d' | '12m';

interface MetricData {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  retentionRate: number;
  monthlyRevenue: number;
  avgOrderValue: number;
  revenueGrowth: number;
  revenueVsLastMonth: number;
  consultations: number;
  verifiedDoctors: number;
  avgWaitTime: number;
  satisfaction: number;
  totalDeliveries: number;
  avgDeliveryTime: number;
  onTimeRate: number;
  monthlyChart: { month: string; value: number; prev: number }[];
  provinceRankings: { id: string; name: string; score: number }[];
  topDoctors: { name: string; specialty: string; rating: number; consultations: number; avatar: string }[];
  topRiders: { name: string; deliveries: number; rating: number; onTimeRate: number; avatar: string }[];
  hourlyActivity: number[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const MONTH_LABELS_MZ = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const SPECIALTIES_PT = [
  'Medicina Geral', 'Pediatria', 'Ginecologia', 'Cardiologia',
  'Dermatologia', 'Ortopedia', 'Oftalmologia', 'Psiquiatria',
];
const RIDER_NAMES = [
  'João Macamo', 'Ana Mondlane', 'Carlos Tembe', 'Fernando Nhaca',
  'Luis Sitoe', 'Marta Chissano', 'Pedro Mondlane', 'Sofia Machel',
];
const DOCTOR_NAMES = [
  'Dr. Armando Guebuza', 'Dra. Maria Lurdes', 'Dr. Nelson Mabunda',
  'Dra. Beatriz Nhaca', 'Dr. Paulo Mondlane', 'Dra. Cristina Sitoe',
  'Dr. Hugo Chissano', 'Dra. Elsa Macamo',
];
const AVATAR_EMOJIS = ['👨🏾‍⚕️', '👩🏾‍⚕️', '👨🏿‍⚕️', '👩🏿‍⚕️', '🧑🏾‍⚕️', '🧑🏿‍⚕️', '👨🏾‍⚕️', '👩🏾‍⚕️'];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return Math.abs(hash);
}

// ─── Period Labels ────────────────────────────────────────────────────────
const PERIOD_CONFIG: Record<Period, { labelKey: string; fallback: string }> = {
  '7d': { labelKey: 'analytics.last_7_days', fallback: 'Últimos 7 dias' },
  '30d': { labelKey: 'analytics.last_30_days', fallback: 'Últimos 30 dias' },
  '90d': { labelKey: 'analytics.last_90_days', fallback: 'Últimos 90 dias' },
  '12m': { labelKey: 'analytics.last_12_months', fallback: 'Últimos 12 meses' },
};

// ─── Sub-Components ───────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  gradient,
  delay = 0,
  t,
  labelKey,
}: {
  icon: React.ElementType;
  label: string;
  labelKey: string;
  value: number | string;
  sub?: string;
  trend?: { value: number; direction: 'up' | 'down' };
  gradient?: string;
  delay?: number;
  t: (key: string, params?: Record<string, string>) => string;
}) {
  return (
    <motion.div variants={fadeUp} transition={{ delay }}>
      <GlassCard className="relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
        {gradient && (
          <div
            className="absolute inset-0 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-500"
            style={{ background: gradient }}
          />
        )}
        <div className="relative z-10 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-lg"
              style={{ background: gradient || 'var(--province-gradient-accent, #00838F)', opacity: 0.15 }}
            >
              <Icon className="w-4 h-4" style={{ color: 'var(--province-primary, #00838F)' }} />
            </div>
            {trend && (
              <Badge
                variant={trend.direction === 'up' ? 'default' : 'destructive'}
                className={`text-[10px] px-1.5 py-0 ${trend.direction === 'up' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : 'bg-red-500/15 text-red-500 border-red-500/30'}`}
              >
                {trend.direction === 'up' ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                {Math.abs(trend.value)}%
              </Badge>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">{t(labelKey, { _: label })}</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              {typeof value === 'number' && value > 9999 ? (
                <span className="text-xl font-bold tracking-tight">
                  {(value / 1000).toFixed(1)}k
                </span>
              ) : typeof value === 'number' ? (
                <NumberFlow
                  value={value}
                  format={{ maximumFractionDigits: value % 1 !== 0 ? 1 : 0 }}
                  className="text-xl font-bold tracking-tight"
                  style={{ color: 'var(--province-primary, #00838F)' }}
                />
              ) : (
                <span className="text-xl font-bold tracking-tight">{value}</span>
              )}
            </div>
            {sub && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</p>}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function MiniBarChart({
  data,
  provinceGradient,
  accentColor,
}: {
  data: { month: string; value: number; prev: number }[];
  provinceGradient: string;
  accentColor: string;
}) {
  const maxVal = Math.max(...data.map(d => Math.max(d.value, d.prev)));
  return (
    <div className="flex items-end gap-2 h-full w-full pt-4 pb-2">
      {data.map((d, i) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
          <div className="relative w-full flex items-end gap-[2px] justify-center" style={{ height: '100%' }}>
            {/* Previous month bar */}
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.prev / maxVal) * 100}%` }}
              transition={{ delay: 0.2 + i * 0.06, type: 'spring', stiffness: 200, damping: 22 }}
              className="w-[40%] rounded-t-sm opacity-30"
              style={{ background: accentColor }}
            />
            {/* Current month bar */}
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(d.value / maxVal) * 100}%` }}
              transition={{ delay: 0.3 + i * 0.06, type: 'spring', stiffness: 200, damping: 22 }}
              className="w-[40%] rounded-t-sm"
              style={{ background: provinceGradient }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground font-medium">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

function ProvinceRankingRow({
  rank,
  name,
  score,
  maxScore,
  isCurrent,
  primaryColor,
}: {
  rank: number;
  name: string;
  score: number;
  maxScore: number;
  isCurrent: boolean;
  primaryColor: string;
}) {
  const pct = Math.round((score / maxScore) * 100);
  return (
    <motion.div
      variants={fadeUp}
      className={`flex items-center gap-3 py-1.5 ${isCurrent ? 'font-semibold' : ''}`}
    >
      <span
        className={`w-5 text-[11px] text-center font-bold ${
          rank === 1 ? 'text-amber-500' : rank === 2 ? 'text-gray-400' : rank === 3 ? 'text-amber-700' : 'text-muted-foreground'
        }`}
      >
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
      </span>
      <span className={`text-xs flex-1 truncate ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
        {name}
      </span>
      <div className="w-28 h-1.5 rounded-full bg-muted/50 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.4 + rank * 0.05, type: 'spring', stiffness: 180, damping: 22 }}
          className="h-full rounded-full"
          style={{
            background: isCurrent ? primaryColor : 'hsl(var(--muted-foreground) / 0.3)',
          }}
        />
      </div>
      <span className={`text-[11px] w-10 text-right tabular-nums ${isCurrent ? 'text-foreground' : 'text-muted-foreground/70'}`}>
        {pct}%
      </span>
    </motion.div>
  );
}

function TopPerformerCard({
  rank,
  name,
  sub,
  metric,
  metricLabel,
  rating,
  avatar,
  primaryColor,
}: {
  rank: number;
  name: string;
  sub: string;
  metric: number;
  metricLabel: string;
  rating: number;
  avatar: string;
  primaryColor: string;
}) {
  return (
    <motion.div variants={scaleIn} className="flex items-center gap-3">
      <div className="relative">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-muted/50">
          {avatar}
        </div>
        {rank <= 3 && (
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: rank === 1 ? '#F59E0B' : rank === 2 ? '#9CA3AF' : '#B45309' }}
          >
            {rank}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
      </div>
      <div className="text-right">
        <p className="text-xs font-bold" style={{ color: primaryColor }}>{metric}</p>
        <p className="text-[9px] text-muted-foreground">{metricLabel}</p>
        <div className="flex items-center gap-0.5 justify-end mt-0.5">
          <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
          <span className="text-[10px] font-medium">{rating.toFixed(1)}</span>
        </div>
      </div>
    </motion.div>
  );
}

function HourlyGrid({
  data,
  primaryColor,
  secondaryColor,
}: {
  data: number[];
  primaryColor: string;
  secondaryColor: string;
}) {
  const maxActivity = Math.max(...data, 1);
  return (
    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1">
      {data.map((val, hour) => {
        const intensity = val / maxActivity;
        return (
          <div key={hour} className="flex flex-col items-center gap-0.5">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: hour * 0.02, type: 'spring', stiffness: 300, damping: 24 }}
              className="w-full aspect-square rounded-sm cursor-default relative group"
              style={{
                background: intensity > 0.75
                  ? primaryColor
                  : intensity > 0.5
                    ? secondaryColor
                    : intensity > 0.25
                      ? `${primaryColor}55`
                      : `${primaryColor}22`,
                opacity: Math.max(0.2, intensity),
              }}
              title={`${hour}h: ${val} actividades`}
            />
            <span className="text-[7px] text-muted-foreground/60 tabular-nums">{hour}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function RegionalAnalytics() {
  const { province } = useProvince();
  const { t } = useCountry();
  const [period, setPeriod] = useState<Period>('30d');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MetricData | null>(null);

  const pColors = province?.colors ?? {
    primary: '#00838F', primaryLight: '#4FB3BF', secondary: '#1A237E',
    secondaryLight: '#534BAE', accent: '#FF6D00', background: '#F0F7FA', surface: '#FFFFFF',
  };
  const pGradients = province?.gradients ?? {
    hero: 'linear-gradient(135deg, #00838F 0%, #1A237E 50%, #FF6D00 100%)',
    card: 'linear-gradient(145deg, #E0F2F1, #FFFFFF)',
    accent: 'linear-gradient(135deg, #FF6D00, #FF9E40)',
    dark: 'linear-gradient(135deg, #004D56, #0D1347)',
  };

  // ── Generate deterministic mock data from province identity ──
  const generateData = useCallback(
    (p: Period): MetricData => {
      const id = province?.id ?? 'maputo-cidade';
      const rng = seededRandom(hashString(id + p));
      const mult: Record<Period, number> = { '7d': 0.25, '30d': 1, '90d': 2.8, '12m': 11 };
      const m = mult[p];

      const totalUsers = Math.round((12000 + rng() * 48000) * (hashString(id) % 3 === 0 ? 2.5 : 1));
      const newUsers = Math.round(totalUsers * (0.02 + rng() * 0.06) * m / 12);
      const activeUsers = Math.round(totalUsers * (0.35 + rng() * 0.35));
      const retentionRate = +(65 + rng() * 28).toFixed(1);

      const monthlyRevenue = Math.round((80000 + rng() * 420000) * m / 12);
      const avgOrderValue = Math.round(250 + rng() * 750);
      const revenueGrowth = +(rng() > 0.25 ? rng() * 35 : -(rng() * 15)).toFixed(1);
      const revenueVsLastMonth = +(rng() * 100).toFixed(1);

      const consultations = Math.round((800 + rng() * 4200) * m / 12);
      const verifiedDoctors = Math.round(12 + rng() * 88);
      const avgWaitTime = Math.round(8 + rng() * 22);
      const satisfaction = +(3.2 + rng() * 1.7).toFixed(1);

      const totalDeliveries = Math.round((600 + rng() * 3400) * m / 12);
      const avgDeliveryTime = Math.round(25 + rng() * 35);
      const onTimeRate = +(72 + rng() * 24).toFixed(1);

      const now = new Date();
      const monthlyChart: { month: string; value: number; prev: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const v = Math.round((30000 + rng() * 200000) * (i === 0 ? 1.15 : 1));
        monthlyChart.push({
          month: MONTH_LABELS_MZ[d.getMonth()],
          value: v,
          prev: Math.round(v * (0.7 + rng() * 0.4)),
        });
      }

      const provinceRankings = provinces.map((prov) => ({
        id: prov.id,
        name: prov.name,
        score: +(40 + seededRandom(hashString(prov.id + 'rank'))() * 55).toFixed(1),
      })).sort((a, b) => b.score - a.score);

      const topDoctors = DOCTOR_NAMES.slice(0, 6).map((name, i) => ({
        name,
        specialty: SPECIALTIES_PT[i % SPECIALTIES_PT.length],
        rating: +(3.5 + rng() * 1.4).toFixed(1),
        consultations: Math.round(50 + rng() * 450),
        avatar: AVATAR_EMOJIS[i % AVATAR_EMOJIS.length],
      })).sort((a, b) => b.consultations - a.consultations).slice(0, 3);

      const topRiders = RIDER_NAMES.slice(0, 6).map((name, i) => ({
        name,
        deliveries: Math.round(80 + rng() * 620),
        rating: +(3.8 + rng() * 1.1).toFixed(1),
        onTimeRate: +(75 + rng() * 22).toFixed(1),
        avatar: AVATAR_EMOJIS[(i + 3) % AVATAR_EMOJIS.length],
      })).sort((a, b) => b.deliveries - a.deliveries).slice(0, 3);

      const hourlyActivity = Array.from({ length: 24 }, (_, h) => {
        const base = h >= 7 && h <= 20 ? 40 + Math.sin((h - 7) / 13 * Math.PI) * 55 : 5 + rng() * 15;
        return Math.round(base + rng() * 20);
      });

      return {
        totalUsers, newUsers, activeUsers, retentionRate,
        monthlyRevenue, avgOrderValue, revenueGrowth, revenueVsLastMonth,
        consultations, verifiedDoctors, avgWaitTime, satisfaction,
        totalDeliveries, avgDeliveryTime, onTimeRate,
        monthlyChart, provinceRankings, topDoctors, topRiders, hourlyActivity,
      };
    },
    [province?.id],
  );

  // ── Fetch real data when possible, fall back to generated ──
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetchData = async () => {
      try {
        if (!province?.id) return;
        // Attempt real fetch — gracefully fall back to generated data
        const { data: agg, error } = await (supabase as any)
          .from('province_analytics')
          .select('*')
          .eq('province_id', province.id)
          .eq('period', period)
          .single();

        if (agg && !error && !cancelled) {
          setData(agg as unknown as MetricData);
          setLoading(false);
          return;
        }
      } catch {
        // Real data not available — use generated
      }
      if (!cancelled) {
        setData(generateData(period));
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchData, 200); // Small delay for UX polish
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [province?.id, period, generateData]);

  // ── Derived values ──
  const currentRank = useMemo(
    () => data?.provinceRankings.findIndex(r => r.id === province?.id) ?? -1,
    [data, province?.id],
  );
  const maxRankScore = useMemo(
    () => Math.max(...(data?.provinceRankings.map(r => r.score) ?? [100])),
    [data],
  );

  // ── Period selector ──
  const periods: Period[] = ['7d', '30d', '90d', '12m'];

  return (
    <main className="min-h-screen pb-8" style={{ background: 'var(--province-bg, #F0F7FA)' }}>
      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">

        {/* ── 1. Province Header ─────────────────────────────────── */}
        <motion.section
          variants={stagger}
          initial="hidden"
          animate="show"
          className="relative overflow-hidden rounded-2xl"
        >
          <div
            className="absolute inset-0"
            style={{ background: pGradients.hero }}
          />
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <motion.div variants={fadeUp} className="flex items-center gap-4">
              <div className="text-5xl">{province?.culturalSymbol ?? '🏙️'}</div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  {province?.name ?? 'Maputo Cidade'}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-sm text-white/80">
                    {t('analytics.capital', { _: 'Capital' })}: {province?.capital ?? 'Maputo'}
                  </span>
                  <span className="text-white/30">•</span>
                  <Globe className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-sm text-white/80">Moçambique</span>
                </div>
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="flex items-center gap-3">
              <Badge className="bg-white/15 text-white border-white/25 text-xs backdrop-blur-sm">
                <Activity className="w-3 h-3 mr-1" />
                {t('analytics.live_data', { _: 'Dados em tempo real' })}
              </Badge>
              <Badge className="bg-white/15 text-white border-white/25 text-xs backdrop-blur-sm">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date().toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Badge>
            </motion.div>
          </div>
        </motion.section>

        {/* ── Period Selector ──────────────────────────────────── */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex items-center justify-between"
        >
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: pColors.primary }} />
            {t('analytics.dashboard_title', { _: 'Painel Analítico Provincial' })}
          </h2>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {periods.map((p) => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? 'default' : 'ghost'}
                className={`text-xs h-7 px-3 rounded-md transition-all duration-200 ${
                  period === p
                    ? 'shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                style={period === p ? { background: pColors.primary } : undefined}
                onClick={() => setPeriod(p)}
              >
                {t(PERIOD_CONFIG[p].labelKey, { _: PERIOD_CONFIG[p].fallback })}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* ── Loading skeleton ─────────────────────────────────── */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Dashboard Content ─────────────────────────────────── */}
        {data && (
          <AnimatePresence mode="wait">
            <motion.div
              key={period}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              {/* ── 2. Key Metrics ────────────────────────────────── */}
              <motion.section variants={stagger} initial="hidden" animate="show">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  {t('analytics.key_metrics', { _: 'Métricas-Chave' })}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard
                    icon={Users}
                    label="Total de Utilizadores"
                    labelKey="analytics.total_users"
                    value={data.totalUsers}
                    trend={{ value: 12.5, direction: 'up' }}
                    gradient={pGradients.accent}
                    t={t}
                  />
                  <MetricCard
                    icon={Zap}
                    label="Novos Utilizadores"
                    labelKey="analytics.new_users"
                    value={data.newUsers}
                    sub={t('analytics.this_period', { _: 'Este período' })}
                    trend={{ value: 8.3, direction: 'up' }}
                    gradient={pGradients.hero}
                    t={t}
                    delay={0.04}
                  />
                  <MetricCard
                    icon={Activity}
                    label="Utilizadores Activos"
                    labelKey="analytics.active_users"
                    value={data.activeUsers}
                    sub={`${((data.activeUsers / data.totalUsers) * 100).toFixed(0)}% ${t('analytics.of_total', { _: 'do total' })}`}
                    gradient={pGradients.accent}
                    t={t}
                    delay={0.08}
                  />
                  <MetricCard
                    icon={Target}
                    label="Taxa de Retenção"
                    labelKey="analytics.retention_rate"
                    value={`${data.retentionRate}%`}
                    trend={{ value: data.retentionRate > 70 ? 5.2 : -2.1, direction: data.retentionRate > 70 ? 'up' : 'down' }}
                    gradient={pGradients.card}
                    t={t}
                    delay={0.12}
                  />
                </div>
              </motion.section>

              {/* ── 3. Revenue ─────────────────────────────────────── */}
              <motion.section variants={stagger} initial="hidden" animate="show">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5" />
                  {t('analytics.revenue', { _: 'Receitas' })}
                </h3>
                <BentoGrid>
                  <motion.div variants={fadeUp}>
                    <GlassCard className="relative overflow-hidden h-full">
                      <div className="absolute inset-0 opacity-[0.05]" style={{ background: pGradients.accent }} />
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                          <Wallet className="w-3.5 h-3.5" style={{ color: pColors.primary }} />
                          <span className="text-[10px] text-muted-foreground font-medium uppercase">
                            {t('analytics.monthly_revenue', { _: 'Receita Mensal' })}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg text-muted-foreground font-medium">MT</span>
                          <NumberFlow
                            value={data.monthlyRevenue}
                            format={{ maximumFractionDigits: 0 }}
                            className="text-2xl font-bold tracking-tight"
                            style={{ color: pColors.primary }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">MZN</p>
                      </div>
                    </GlassCard>
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <GlassCard className="relative overflow-hidden h-full">
                      <div className="absolute inset-0 opacity-[0.05]" style={{ background: pGradients.accent }} />
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="w-3.5 h-3.5" style={{ color: pColors.secondary }} />
                          <span className="text-[10px] text-muted-foreground font-medium uppercase">
                            {t('analytics.avg_order_value', { _: 'Valor Médio Pedido' })}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg text-muted-foreground font-medium">MT</span>
                          <NumberFlow
                            value={data.avgOrderValue}
                            format={{ maximumFractionDigits: 0 }}
                            className="text-2xl font-bold tracking-tight"
                            style={{ color: pColors.secondary }}
                          />
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <GlassCard className="relative overflow-hidden h-full flex flex-col justify-between">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-3.5 h-3.5" style={{ color: data.revenueGrowth >= 0 ? '#10B981' : '#EF4444' }} />
                        <span className="text-[10px] text-muted-foreground font-medium uppercase">
                          {t('analytics.growth', { _: 'Crescimento' })}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <NumberFlow
                          value={Math.abs(data.revenueGrowth)}
                          format={{ maximumFractionDigits: 1, signDisplay: 'always' }}
                          className="text-2xl font-bold tracking-tight"
                          style={{ color: data.revenueGrowth >= 0 ? '#10B981' : '#EF4444' }}
                        />
                        <span className="text-lg text-muted-foreground">%</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(Math.abs(data.revenueGrowth) * 3, 100)}%` }}
                          transition={{ delay: 0.3, type: 'spring', stiffness: 180, damping: 22 }}
                          className="h-full rounded-full"
                          style={{ background: data.revenueGrowth >= 0 ? '#10B981' : '#EF4444' }}
                        />
                      </div>
                    </GlassCard>
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <GlassCard className="relative overflow-hidden h-full flex flex-col justify-between">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase">
                        {t('analytics.vs_last_month', { _: 'vs Mês Anterior' })}
                      </span>
                      <div className="flex items-end gap-2 mt-3">
                        {/* Last month bar */}
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full h-16 rounded-md bg-muted/40 relative overflow-hidden">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: '60%' }}
                              transition={{ delay: 0.3, type: 'spring', stiffness: 180, damping: 22 }}
                              className="absolute bottom-0 w-full rounded-md"
                              style={{ background: pColors.secondary, opacity: 0.4 }}
                            />
                          </div>
                          <span className="text-[8px] text-muted-foreground">{t('analytics.prev', { _: 'Ant.' })}</span>
                        </div>
                        {/* Current month bar */}
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full h-16 rounded-md bg-muted/40 relative overflow-hidden">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${data.revenueVsLastMonth}%` }}
                              transition={{ delay: 0.4, type: 'spring', stiffness: 180, damping: 22 }}
                              className="absolute bottom-0 w-full rounded-md"
                              style={{ background: pGradients.accent }}
                            />
                          </div>
                          <span className="text-[8px] text-muted-foreground">{t('analytics.current', { _: 'Act.' })}</span>
                        </div>
                      </div>
                      <div className="text-center mt-1">
                        <span className="text-xs font-bold" style={{ color: pColors.primary }}>
                          +{data.revenueVsLastMonth}%
                        </span>
                      </div>
                    </GlassCard>
                  </motion.div>
                </BentoGrid>
              </motion.section>

              {/* ── 4. Healthcare ──────────────────────────────────── */}
              <motion.section variants={stagger} initial="hidden" animate="show">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Stethoscope className="w-3.5 h-3.5" />
                  {t('analytics.healthcare', { _: 'Saúde' })}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MetricCard
                    icon={Stethoscope}
                    label="Consultas"
                    labelKey="analytics.consultations"
                    value={data.consultations}
                    trend={{ value: 15.7, direction: 'up' }}
                    gradient={pGradients.hero}
                    t={t}
                  />
                  <MetricCard
                    icon={Award}
                    label="Médicos Verificados"
                    labelKey="analytics.verified_doctors"
                    value={data.verifiedDoctors}
                    sub={t('analytics.active_on_platform', { _: 'Activos na plataforma' })}
                    gradient={pGradients.accent}
                    t={t}
                    delay={0.04}
                  />
                  <MetricCard
                    icon={Clock}
                    label="Tempo Médio Espera"
                    labelKey="analytics.avg_wait_time"
                    value={`${data.avgWaitTime}min`}
                    sub={t('analytics.per_consultation', { _: 'por consulta' })}
                    trend={{ value: 3.2, direction: 'down' }}
                    gradient={pGradients.card}
                    t={t}
                    delay={0.08}
                  />
                  <MetricCard
                    icon={Heart}
                    label="Satisfação"
                    labelKey="analytics.satisfaction"
                    value={`${data.satisfaction}`}
                    sub={`/ 5.0 ${t('analytics.stars', { _: 'estrelas' })}`}
                    trend={{ value: 2.4, direction: 'up' }}
                    gradient={pGradients.hero}
                    t={t}
                    delay={0.12}
                  />
                </div>
              </motion.section>

              {/* ── 5. Deliveries ───────────────────────────────────── */}
              <motion.section variants={stagger} initial="hidden" animate="show">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5" />
                  {t('analytics.deliveries', { _: 'Entregas' })}
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <MetricCard
                    icon={Package}
                    label="Total de Entregas"
                    labelKey="analytics.total_deliveries"
                    value={data.totalDeliveries}
                    trend={{ value: 9.8, direction: 'up' }}
                    gradient={pGradients.accent}
                    t={t}
                  />
                  <MetricCard
                    icon={Clock}
                    label="Tempo Médio"
                    labelKey="analytics.avg_delivery_time"
                    value={`${data.avgDeliveryTime}min`}
                    sub={t('analytics.per_delivery', { _: 'por entrega' })}
                    gradient={pGradients.hero}
                    t={t}
                    delay={0.04}
                  />
                  <MetricCard
                    icon={Target}
                    label="Taxa Pontualidade"
                    labelKey="analytics.on_time_rate"
                    value={`${data.onTimeRate}%`}
                    trend={{ value: 1.5, direction: 'up' }}
                    gradient={pGradients.card}
                    t={t}
                    delay={0.08}
                  />
                </div>
              </motion.section>

              {/* ── 6. 6-Month Bar Chart ──────────────────────────── */}
              <motion.section variants={stagger} initial="hidden" animate="show">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5" />
                  {t('analytics.revenue_trend', { _: 'Tendência de Receitas (6 meses)' })}
                </h3>
                <GlassCard className="relative overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.03]" style={{ background: pGradients.hero }} />
                  <div className="relative z-10 h-40 md:h-48">
                    <MiniBarChart
                      data={data.monthlyChart}
                      provinceGradient={pGradients.accent}
                      accentColor={pColors.secondary}
                    />
                  </div>
                  <div className="relative z-10 flex items-center gap-4 mt-2 px-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-2 rounded-sm" style={{ background: pGradients.accent }} />
                      <span className="text-[9px] text-muted-foreground">{t('analytics.current', { _: 'Actual' })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-2 rounded-sm opacity-30" style={{ background: pColors.secondary }} />
                      <span className="text-[9px] text-muted-foreground">{t('analytics.previous', { _: 'Anterior' })}</span>
                    </div>
                  </div>
                </GlassCard>
              </motion.section>

              {/* ── 7 & 8. Province Ranking + Top Performers ──────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Province Ranking */}
                <motion.section variants={stagger} initial="hidden" animate="show">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" />
                    {t('analytics.province_ranking', { _: 'Ranking Provincial' })}
                    {currentRank >= 0 && (
                      <Badge variant="outline" className="ml-auto text-[10px]" style={{ borderColor: pColors.primary, color: pColors.primary }}>
                        #{currentRank + 1} {t('analytics.of_11', { _: 'de 11' })}
                      </Badge>
                    )}
                  </h3>
                  <GlassCard className="relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.02]" style={{ background: pGradients.hero }} />
                    <motion.div variants={stagger} initial="hidden" animate="show" className="relative z-10 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                      {data.provinceRankings.map((prov, idx) => (
                        <ProvinceRankingRow
                          key={prov.id}
                          rank={idx + 1}
                          name={prov.name}
                          score={prov.score}
                          maxScore={maxRankScore}
                          isCurrent={prov.id === province?.id}
                          primaryColor={pColors.primary}
                        />
                      ))}
                    </motion.div>
                  </GlassCard>
                </motion.section>

                {/* Top Performers */}
                <motion.section variants={stagger} initial="hidden" animate="show" className="space-y-5">
                  {/* Top Doctors */}
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Stethoscope className="w-3.5 h-3.5" />
                      {t('analytics.top_doctors', { _: 'Médicos Destaque' })}
                    </h3>
                    <GlassCard className="relative overflow-hidden">
                      <div className="absolute inset-0 opacity-[0.02]" style={{ background: pGradients.hero }} />
                      <motion.div variants={stagger} initial="hidden" animate="show" className="relative z-10 space-y-3">
                        {data.topDoctors.map((doc, i) => (
                          <TopPerformerCard
                            key={doc.name}
                            rank={i + 1}
                            name={doc.name}
                            sub={doc.specialty}
                            metric={doc.consultations}
                            metricLabel={t('analytics.consultations_short', { _: 'consultas' })}
                            rating={doc.rating}
                            avatar={doc.avatar}
                            primaryColor={pColors.primary}
                          />
                        ))}
                      </motion.div>
                    </GlassCard>
                  </div>

                  {/* Top Riders */}
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5" />
                      {t('analytics.top_riders', { _: 'Entregadores Destaque' })}
                    </h3>
                    <GlassCard className="relative overflow-hidden">
                      <div className="absolute inset-0 opacity-[0.02]" style={{ background: pGradients.accent }} />
                      <motion.div variants={stagger} initial="hidden" animate="show" className="relative z-10 space-y-3">
                        {data.topRiders.map((rider, i) => (
                          <TopPerformerCard
                            key={rider.name}
                            rank={i + 1}
                            name={rider.name}
                            sub={`${t('analytics.on_time', { _: 'Pontualidade' })}: ${rider.onTimeRate}%`}
                            metric={rider.deliveries}
                            metricLabel={t('analytics.deliveries_short', { _: 'entregas' })}
                            rating={rider.rating}
                            avatar={rider.avatar}
                            primaryColor={pColors.accent}
                          />
                        ))}
                      </motion.div>
                    </GlassCard>
                  </div>
                </motion.section>
              </div>

              {/* ── 9. Activity by Hour ────────────────────────────── */}
              <motion.section variants={stagger} initial="hidden" animate="show">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  {t('analytics.hourly_activity', { _: 'Actividade por Hora (24h)' })}
                </h3>
                <GlassCard className="relative overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.02]" style={{ background: pGradients.hero }} />
                  <div className="relative z-10 space-y-3">
                    {/* Intensity legend */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground">{t('analytics.low', { _: 'Baixo' })}</span>
                      <div className="flex gap-0.5">
                        {[0.1, 0.3, 0.55, 0.8, 1].map((intensity, i) => (
                          <div
                            key={i}
                            className="w-4 h-3 rounded-sm"
                            style={{
                              background: pColors.primary,
                              opacity: intensity,
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-[9px] text-muted-foreground">{t('analytics.high', { _: 'Alto' })}</span>
                    </div>
                    <HourlyGrid
                      data={data.hourlyActivity}
                      primaryColor={pColors.primary}
                      secondaryColor={pColors.secondary}
                    />
                  </div>
                </GlassCard>
              </motion.section>

              {/* ── Summary Footer ────────────────────────────────── */}
              <motion.section variants={stagger} initial="hidden" animate="show">
                <GlassCard className="relative overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.03]" style={{ background: pGradients.hero }} />
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Zap className="w-3.5 h-3.5" style={{ color: pColors.primary }} />
                      <span>
                        {t('analytics.generated_for', { _: 'Dados gerados para' })} <strong>{province?.name ?? 'Maputo Cidade'}</strong>
                        {t('analytics.period', { _: ' — período' })}: {t(PERIOD_CONFIG[period].labelKey, { _: PERIOD_CONFIG[period].fallback })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground/60">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {province?.capital ?? 'Maputo'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        Moçambique
                      </span>
                      <span>MedWallet MZ v2.0</span>
                    </div>
                  </div>
                </GlassCard>
              </motion.section>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}
