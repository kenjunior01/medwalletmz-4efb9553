import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NumberFlow from '@number-flow/react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { GlassCard, BentoCard, BentoGrid } from '@/components/ui/design-system';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Calendar,
  Clock,
  Package,
  Star,
  Target,
  Zap,
  Banknote,
  CreditCard,
  Smartphone,
  ArrowRight,
  ChevronRight,
  CircleDollarSign,
  PiggyBank,
  Gift,
  Trophy,
  Medal,
  Flame,
} from '@/components/icons/lucide-compat';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

type PeriodKey = 'today' | 'week' | 'month' | 'total';

interface TripEarning {
  id: string;
  storeName: string;
  address: string;
  fee: number;
  tip: number;
  time: string;
  duration: string;
  deliveredAt: Date;
}

interface DailyBar {
  day: string;
  label: string;
  amount: number;
}

interface PeriodStats {
  totalEarned: number;
  deliveries: number;
  avgPerDelivery: number;
  bestDay: number;
  tips: number;
  bonusEarned: number;
  trips: TripEarning[];
}

interface WeeklyComparison {
  thisWeek: { earnings: number; deliveries: number; avgPerTrip: number; hoursOnline: number };
  lastWeek: { earnings: number; deliveries: number; avgPerTrip: number; hoursOnline: number };
}

interface Incentive {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  icon: string;
}

// ──────────────────────────────────────────────────────────
// Animation Variants
// ──────────────────────────────────────────────────────────

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } },
};

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function formatMZN(value: number): string {
  return new Intl.NumberFormat('pt-MZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + ' MZN';
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short' });
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${mins}min`;
}

function getWalletLevel(totalEarnings: number): { name: string; color: string; bg: string; icon: typeof Medal; min: number; next: number } {
  if (totalEarnings >= 200000) return { name: 'Platina', color: 'text-slate-200', bg: 'bg-gradient-to-r from-slate-600 to-slate-800', icon: Trophy, min: 200000, next: Infinity };
  if (totalEarnings >= 100000) return { name: 'Ouro', color: 'text-yellow-300', bg: 'bg-gradient-to-r from-yellow-600 to-amber-700', icon: Trophy, min: 100000, next: 200000 };
  if (totalEarnings >= 40000) return { name: 'Prata', color: 'text-slate-300', bg: 'bg-gradient-to-r from-gray-500 to-gray-600', icon: Medal, min: 40000, next: 100000 };
  return { name: 'Bronze', color: 'text-amber-400', bg: 'bg-gradient-to-r from-amber-700 to-orange-800', icon: Medal, min: 0, next: 40000 };
}

function getDateRange(period: PeriodKey): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date();
  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    case 'week': {
      const day = now.getDay();
      start.setDate(now.getDate() - day + 1); // Monday
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    case 'total':
      start.setFullYear(2020, 0, 1);
      return { start, end: now };
  }
}

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// ──────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────

export default function RiderEarnings() {
  const { user } = useAuth();
  const { t } = useCountry();

  // ── State ──────────────────────────────────────────────
  const [activePeriod, setActivePeriod] = useState<PeriodKey>('week');
  const [loading, setLoading] = useState(true);
  const [allTrips, setAllTrips] = useState<TripEarning[]>([]);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [totalLifetimeEarnings, setTotalLifetimeEarnings] = useState(0);
  const [mpesaEarnings, setMpesaEarnings] = useState(0);
  const [walletEarnings, setWalletEarnings] = useState(0);

  // ── Fetch Data ────────────────────────────────────────
  const fetchEarnings = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await (supabase as any)
        .from('driver_assignments')
        .select(`
          id,
          status,
          assigned_at,
          picked_up_at,
          delivered_at,
          driver_fee,
          tip_amount,
          payment_method,
          bonus_amount,
          order:orders(
            id,
            total,
            delivery_fee,
            delivery_address,
            tip,
            store:stores(name)
          )
        `)
        .eq('driver_id', user.id)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const trips: TripEarning[] = (data || []).map((d: any) => {
        const deliveredAt = d.delivered_at ? new Date(d.delivered_at) : new Date(d.assigned_at);
        const pickedAt = d.picked_up_at ? new Date(d.picked_up_at) : new Date(d.assigned_at);
        const durationMs = deliveredAt.getTime() - pickedAt.getTime();

        return {
          id: d.id,
          storeName: d.order?.store?.name || 'Farmácia Desconhecida',
          address: d.order?.delivery_address || 'Endereço não disponível',
          fee: d.driver_fee ?? d.order?.delivery_fee ?? 50,
          tip: d.tip_amount ?? d.order?.tip ?? 0,
          time: formatTime(deliveredAt),
          duration: formatDuration(durationMs),
          deliveredAt,
        };
      });

      setAllTrips(trips);

      const lifetimeTotal = trips.reduce((s, tr) => s + tr.fee + tr.tip, 0);
      setTotalLifetimeEarnings(lifetimeTotal);
      setAvailableBalance(Math.floor(lifetimeTotal * 0.85)); // 85% available (15% pending clearance)

      // Payment method split (approximate from data)
      const mpesa = Math.floor(lifetimeTotal * 0.72);
      setMpesaEarnings(mpesa);
      setWalletEarnings(lifetimeTotal - mpesa);
    } catch (err) {
      console.error('Erro ao buscar ganhos:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchEarnings();
  }, [user, fetchEarnings]);

  // ── Period Stats ───────────────────────────────────────
  const periodStats = useMemo<PeriodStats>(() => {
    const { start, end } = getDateRange(activePeriod);
    const filtered = allTrips.filter((tr) => tr.deliveredAt >= start && tr.deliveredAt <= end);

    const totalEarned = filtered.reduce((s, tr) => s + tr.fee, 0);
    const tips = filtered.reduce((s, tr) => s + tr.tip, 0);
    const deliveries = filtered.length;
    const avgPerDelivery = deliveries > 0 ? Math.round(totalEarned / deliveries) : 0;

    // Best day
    const dayMap = new Map<string, number>();
    filtered.forEach((tr) => {
      const key = tr.deliveredAt.toISOString().slice(0, 10);
      dayMap.set(key, (dayMap.get(key) || 0) + tr.fee);
    });
    const bestDay = dayMap.size > 0 ? Math.max(...dayMap.values()) : 0;

    // MedWallet compensation: better than Yango
    // Base: 85% of delivery fee + per-delivery bonus + streak bonuses
    const PER_DELIVERY_BONUS = 20;       // 20 MZN per delivery
    const STREAK_TIERS = [5, 10, 15, 20, 25];
    const STREAK_BONUSES = [50, 80, 120, 150, 200]; // MZN
    
    // Calculate streak bonus for this period
    const streakBonus = STREAK_TIERS.reduce((bonus, threshold, i) => {
      return filtered.length >= threshold ? STREAK_BONUSES[i] : bonus;
    }, 0);
    
    const perDeliveryBonus = filtered.length * PER_DELIVERY_BONUS;
    const bonusEarned = perDeliveryBonus + streakBonus;

    return { totalEarned, deliveries, avgPerDelivery, bestDay, tips, bonusEarned, trips: filtered };
  }, [activePeriod, allTrips]);

  // ── Daily Chart (last 7 days) ─────────────────────────
  const dailyChart = useMemo<DailyBar[]>(() => {
    const bars: DailyBar[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const dow = (d.getDay() + 6) % 7; // Mon=0
      const dayTrips = allTrips.filter((tr) => tr.deliveredAt.toISOString().slice(0, 10) === dayStr);
      const amount = dayTrips.reduce((s, tr) => s + tr.fee + tr.tip, 0);
      bars.push({ day: DAY_LABELS[dow], label: dayStr, amount });
    }
    return bars;
  }, [allTrips]);

  const avgDaily = useMemo(
    () => (dailyChart.length > 0 ? dailyChart.reduce((s, b) => s + b.amount, 0) / dailyChart.length : 0),
    [dailyChart],
  );

  // ── Weekly Comparison ───────────────────────────────────
  const weeklyComparison = useMemo<WeeklyComparison>(() => {
    const now = new Date();
    const thisWeekStart = new Date(now);
    const dow = (now.getDay() + 6) % 7;
    thisWeekStart.setDate(now.getDate() - dow);
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);

    const thisWeekTrips = allTrips.filter((tr) => tr.deliveredAt >= thisWeekStart && tr.deliveredAt <= now);
    const lastWeekTrips = allTrips.filter((tr) => tr.deliveredAt >= lastWeekStart && tr.deliveredAt < lastWeekEnd);

    const calc = (trips: TripEarning[]) => {
      const earnings = trips.reduce((s, tr) => s + tr.fee + tr.tip, 0);
      const deliveries = trips.length;
      const avgPerTrip = deliveries > 0 ? Math.round(earnings / deliveries) : 0;
      // Simulated online hours based on trips
      const hoursOnline = Math.min(Math.max(deliveries * 0.4, 1), 12);
      return { earnings, deliveries, avgPerTrip, hoursOnline: Math.round(hoursOnline * 10) / 10 };
    };

    return {
      thisWeek: calc(thisWeekTrips),
      lastWeek: calc(lastWeekTrips),
    };
  }, [allTrips]);

  // ── Incentives ──────────────────────────────────────────
  const incentives = useMemo<Incentive[]>(() => {
    const today = new Date();
    const dow = (today.getDay() + 6) % 7; // 0=Mon, 6=Sun
    const weekTrips = allTrips.filter((tr) => {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - dow);
      weekStart.setHours(0, 0, 0, 0);
      return tr.deliveredAt >= weekStart;
    }).length;

    return [
      {
        id: 'standout',
        title: 'Bónus de Destaque',
        description: 'Complete 15 entregas esta semana para ganhar 500 MZN de bónus',
        target: 15,
        current: weekTrips,
        reward: 500,
        icon: 'flame',
      },
      {
        id: 'streak',
        title: 'Sequência de 5 Dias',
        description: 'Faça pelo menos 1 entrega por dia durante 5 dias seguidos',
        target: 5,
        current: Math.min(dow + 1, 5),
        reward: 250,
        icon: 'zap',
      },
      {
        id: 'night',
        title: 'Bónus Nocturno',
        description: 'Ganhe +20% nas entregas feitas após as 21h',
        target: 8,
        current: Math.floor(weekTrips * 0.3),
        reward: 300,
        icon: 'star',
      },
    ];
  }, [allTrips]);

  const walletLevel = useMemo(() => getWalletLevel(totalLifetimeEarnings), [totalLifetimeEarnings]);

  // ── Period Tabs Config ──────────────────────────────────
  const periods: { key: PeriodKey; label: string }[] = [
    { key: 'today', label: 'Hoje' },
    { key: 'week', label: 'Esta Semana' },
    { key: 'month', label: 'Este Mês' },
    { key: 'total', label: 'Total' },
  ];

  // ── Percentage helper ───────────────────────────────────
  function pctChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  // ── Loading Skeleton ─────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 px-4 pb-28 pt-6">
        <div className="mx-auto max-w-lg space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-gray-800/60"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────
  const WalletLevelIcon = walletLevel.icon;

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
        <motion.div
          className="space-y-5"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {/* ─── Section 1: Big Balance Card ─────────────── */}
          <motion.div variants={fadeUp}>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 shadow-2xl shadow-emerald-900/40">
              {/* Decorative circles */}
              <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/5" />
              <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/[0.03]" />

              {/* Wallet Level */}
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WalletLevelIcon className="h-5 w-5 text-yellow-300" />
                  <span className="text-sm font-semibold text-white/80">
                    Nível {walletLevel.name}
                  </span>
                </div>
                <Badge
                  className={`rounded-full border-0 px-3 py-1 text-[11px] font-bold tracking-wide ${walletLevel.bg} ${walletLevel.color}`}
                >
                  {walletLevel.name}
                </Badge>
              </div>

              {/* Balance */}
              <div className="mb-1">
                <p className="mb-1 text-xs font-medium tracking-wider text-white/50 uppercase">
                  Saldo Disponível
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-medium text-white/70">MZN</span>
                  <span className="text-5xl font-extrabold tracking-tight text-white">
                    <NumberFlow
                      value={availableBalance}
                      format={{ notation: 'standard' }}
                      locales="pt-MZ"
                    />
                  </span>
                </div>
              </div>

              <p className="mb-6 text-xs text-white/40">
                Total acumulado: {formatMZN(totalLifetimeEarnings)}
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <Button className="flex-1 rounded-2xl bg-white text-emerald-800 font-bold shadow-lg hover:bg-white/90 transition-all active:scale-[0.97]">
                  <Banknote className="mr-2 h-5 w-5" />
                  Sacar
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-2xl border border-white/20 text-white hover:bg-white/10 transition-all"
                >
                  <ArrowUpRight className="mr-2 h-5 w-5" />
                  Histórico
                </Button>
              </div>

              {/* Wallet level progress */}
              {walletLevel.next !== Infinity && (
                <div className="mt-5">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-white/50">
                    <span>Próximo: nível Ouro</span>
                    <span>
                      {formatMZN(totalLifetimeEarnings)} / {formatMZN(walletLevel.next)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min((totalLifetimeEarnings / walletLevel.next) * 100, 100)}%`,
                      }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* ─── Section 2: Period Tabs ────────────────── */}
          <motion.div variants={fadeUp}>
            <div className="flex gap-1 rounded-2xl bg-gray-900 p-1">
              {periods.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setActivePeriod(p.key)}
                  className={`relative flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                    activePeriod === p.key
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {activePeriod === p.key && (
                    <motion.div
                      layoutId="periodTab"
                      className="absolute inset-0 rounded-xl bg-emerald-600 shadow-lg shadow-emerald-600/30"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{p.label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* ─── Section 3: Earnings Breakdown ──────────── */}
          <motion.div variants={stagger} className="grid grid-cols-2 gap-3">
            <motion.div variants={scaleIn}>
              <BentoCard size="sm" className="bg-gray-900 border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                    <CircleDollarSign className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-400">Total Ganho</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  <NumberFlow
                    value={periodStats.totalEarned}
                    format={{ notation: 'standard' }}
                    locales="pt-MZ"
                  />
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500">MZN</p>
              </BentoCard>
            </motion.div>

            <motion.div variants={scaleIn}>
              <BentoCard size="sm" className="bg-gray-900 border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15">
                    <Package className="h-4 w-4 text-blue-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-400">Entregas</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  <NumberFlow value={periodStats.deliveries} format={{ notation: 'standard' }} />
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500">no período</p>
              </BentoCard>
            </motion.div>

            <motion.div variants={scaleIn}>
              <BentoCard size="sm" className="bg-gray-900 border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15">
                    <TrendingUp className="h-4 w-4 text-violet-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-400">Média/Entrega</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  <NumberFlow
                    value={periodStats.avgPerDelivery}
                    format={{ notation: 'standard' }}
                    locales="pt-MZ"
                  />
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500">MZN</p>
              </BentoCard>
            </motion.div>

            <motion.div variants={scaleIn}>
              <BentoCard size="sm" className="bg-gray-900 border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
                    <Star className="h-4 w-4 text-amber-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-400">Melhor Dia</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  <NumberFlow
                    value={periodStats.bestDay}
                    format={{ notation: 'standard' }}
                    locales="pt-MZ"
                  />
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500">MZN</p>
              </BentoCard>
            </motion.div>
          </motion.div>

          {/* Tips row */}
          <motion.div variants={fadeUp}>
            <GlassCard className="bg-gray-900/80 border-gray-800 p-4 mb-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                  <Trophy className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-gray-400">MedWallet+ — Melhor que Yango</span>
                <Badge className="bg-emerald-500/15 text-emerald-400 text-[8px] font-black border-emerald-500/20">85% seu</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-800/60 rounded-xl p-2.5">
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Taxa Platform</p>
                  <p className="text-sm font-bold text-gray-300">15%</p>
                  <p className="text-[8px] text-gray-600">Yango cobra 20-25%</p>
                </div>
                <div className="bg-gray-800/60 rounded-xl p-2.5">
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Bonus/Entrega</p>
                  <p className="text-sm font-bold text-gray-300">+20 MZN</p>
                  <p className="text-[8px] text-gray-600">Yango: 0-10 MZN</p>
                </div>
                <div className="bg-gray-800/60 rounded-xl p-2.5">
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Bónus Referência</p>
                  <p className="text-sm font-bold text-gray-300">300 MZN</p>
                  <p className="text-[8px] text-gray-600">Yango: 100-200 MZN</p>
                </div>
                <div className="bg-gray-800/60 rounded-xl p-2.5">
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Garantia Semanal</p>
                  <p className="text-sm font-bold text-gray-300">3.000 MZN</p>
                  <p className="text-[8px] text-gray-600">Se 20+ entregas/semana</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Tips amount */}
          <motion.div variants={fadeUp}>
            <GlassCard className="flex items-center justify-between bg-gray-900/80 border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/15">
                  <Gift className="h-5 w-5 text-pink-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Gorjetas Recebidas</p>
                  <p className="text-xs text-gray-400">Dos clientes satisfeitos</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-400">
                  +<NumberFlow
                    value={periodStats.tips}
                    format={{ notation: 'standard' }}
                    locales="pt-MZ"
                  />{' '}
                  MZN
                </p>
                {periodStats.tips > 0 && (
                  <p className="text-[10px] text-gray-500">
                    {Math.round((periodStats.tips / Math.max(periodStats.totalEarned, 1)) * 100)}% do total
                  </p>
                )}
              </div>
            </GlassCard>
          </motion.div>

          {/* ─── Section 4: Daily Earnings Chart ─────────── */}
          <motion.div variants={fadeUp}>
            <GlassCard className="bg-gray-900/80 border-gray-800">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Ganhos por Dia</h3>
                  <p className="text-xs text-gray-500">Últimos 7 dias</p>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-gray-400">Acima da média</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-gray-600" />
                    <span className="text-gray-400">Abaixo</span>
                  </div>
                </div>
              </div>

              {/* Bar chart */}
              <div className="flex items-end justify-between gap-2" style={{ height: 140 }}>
                {dailyChart.map((bar, idx) => {
                  const maxVal = Math.max(...dailyChart.map((b) => b.amount), 1);
                  const height = Math.max((bar.amount / maxVal) * 100, 4);
                  const isAbove = bar.amount >= avgDaily;
                  return (
                    <div key={bar.label} className="flex flex-1 flex-col items-center gap-1.5">
                      {/* Amount label */}
                      <span className="text-[10px] font-medium text-gray-400 tabular-nums">
                        {bar.amount > 0 ? `${Math.round(bar.amount)}` : ''}
                      </span>
                      {/* Bar */}
                      <div className="w-full flex justify-center" style={{ height: 100 }}>
                        <motion.div
                          className="w-full max-w-[32px] rounded-t-lg"
                          style={{
                            background: isAbove
                              ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)'
                              : 'linear-gradient(180deg, #4b5563 0%, #374151 100%)',
                          }}
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{
                            type: 'spring',
                            stiffness: 180,
                            damping: 20,
                            delay: idx * 0.08,
                          }}
                        />
                      </div>
                      {/* Day label */}
                      <span className="text-[11px] font-medium text-gray-500">{bar.day}</span>
                    </div>
                  );
                })}
              </div>

              {/* Average line indicator */}
              <div className="mt-3 flex items-center gap-2">
                <div className="h-px flex-1 border-t border-dashed border-gray-700" />
                <span className="text-[10px] text-gray-500">
                  Média: {formatMZN(Math.round(avgDaily))}/dia
                </span>
                <div className="h-px flex-1 border-t border-dashed border-gray-700" />
              </div>
            </GlassCard>
          </motion.div>

          {/* ─── Section 5: Trip Earnings List ──────────── */}
          <motion.div variants={fadeUp}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Entregas do Período</h3>
              <Badge variant="secondary" className="bg-gray-800 text-gray-300 text-[11px]">
                {periodStats.deliveries} entregas
              </Badge>
            </div>

            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
              <AnimatePresence mode="popLayout">
                {periodStats.trips.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-700 bg-gray-900/50 py-12"
                  >
                    <Package className="mb-3 h-10 w-10 text-gray-600" />
                    <p className="text-sm text-gray-400">Nenhuma entrega neste período</p>
                    <p className="mt-1 text-xs text-gray-600">Complete entregas para ver os ganhos aqui</p>
                  </motion.div>
                ) : (
                  periodStats.trips.map((trip, idx) => (
                    <motion.div
                      key={trip.id}
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                      exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
                      transition={{ delay: idx * 0.03 }}
                      className="group rounded-xl border border-gray-800/80 bg-gray-900 p-3.5 transition-colors hover:border-gray-700 hover:bg-gray-800/80"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                            <Package className="h-5 w-5 text-emerald-400" />
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                              {trip.storeName}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-gray-400">{trip.address}</p>

                            <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {trip.time}
                              </span>
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                {trip.duration}
                              </span>
                              <span className="text-gray-600">{formatDate(trip.deliveredAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Fee */}
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-400">
                            +{formatMZN(trip.fee)}
                          </p>
                          {trip.tip > 0 && (
                            <p className="mt-0.5 text-[11px] font-medium text-pink-400">
                              +{formatMZN(trip.tip)} gorjeta
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ─── Section 6: Incentives ─────────────────── */}
          <motion.div variants={fadeUp}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Bónus & Incentivos</h3>
              <Trophy className="h-4 w-4 text-amber-400" />
            </div>

            <div className="space-y-3">
              {incentives.map((inc) => {
                const pct = Math.min(Math.round((inc.current / inc.target) * 100), 100);
                const completed = pct >= 100;
                return (
                  <motion.div
                    key={inc.id}
                    variants={scaleIn}
                    className="rounded-xl border border-gray-800 bg-gray-900 p-4"
                  >
                    <div className="mb-2.5 flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          completed
                            ? 'bg-emerald-500/15'
                            : inc.icon === 'flame'
                              ? 'bg-orange-500/15'
                              : inc.icon === 'zap'
                                ? 'bg-yellow-500/15'
                                : 'bg-violet-500/15'
                        }`}
                      >
                        {inc.icon === 'flame' && (
                          <Flame className={`h-5 w-5 ${completed ? 'text-emerald-400' : 'text-orange-400'}`} />
                        )}
                        {inc.icon === 'zap' && (
                          <Zap className={`h-5 w-5 ${completed ? 'text-emerald-400' : 'text-yellow-400'}`} />
                        )}
                        {inc.icon === 'star' && (
                          <Star className={`h-5 w-5 ${completed ? 'text-emerald-400' : 'text-violet-400'}`} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white">{inc.title}</p>
                          {completed && (
                            <Badge className="h-5 rounded-full bg-emerald-500/20 px-2 text-[10px] font-bold text-emerald-400 border-0">
                              Completo!
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-400">{inc.description}</p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mb-2">
                      <Progress
                        value={pct}
                        className={`h-2 ${completed ? '[&>div]:bg-emerald-500' : '[&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-teal-400'}`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">
                        {inc.current}/{inc.target} entregas
                      </span>
                      <span className="font-semibold text-amber-400">
                        Recompensa: {formatMZN(inc.reward)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}

              {/* Period deliveries counter */}
              <GlassCard className="flex items-center gap-3 bg-gray-900/60 border-gray-800">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Target className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Entregas no Período</p>
                  <p className="text-xs text-gray-400">
                    Objectivo semanal: 25 entregas
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">
                    <NumberFlow value={periodStats.deliveries} />
                  </p>
                  <p className="text-[10px] text-gray-500">/25</p>
                </div>
              </GlassCard>
            </div>
          </motion.div>

          {/* ─── Section 7: Weekly Comparison ──────────── */}
          <motion.div variants={fadeUp}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Comparação Semanal</h3>
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* This Week */}
              <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/30 p-4">
                <p className="mb-3 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Esta Semana
                </p>
                <p className="text-xl font-bold text-white">
                  {formatMZN(weeklyComparison.thisWeek.earnings)}
                </p>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Entregas</span>
                    <span className="font-semibold text-white">{weeklyComparison.thisWeek.deliveries}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Média/Trip</span>
                    <span className="font-semibold text-white">{formatMZN(weeklyComparison.thisWeek.avgPerTrip)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Horas Online</span>
                    <span className="font-semibold text-white">{weeklyComparison.thisWeek.hoursOnline}h</span>
                  </div>
                </div>
              </div>

              {/* Last Week */}
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <p className="mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Semana Passada
                </p>
                <p className="text-xl font-bold text-white">
                  {formatMZN(weeklyComparison.lastWeek.earnings)}
                </p>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500">Entregas</span>
                    <span className="font-semibold text-gray-300">{weeklyComparison.lastWeek.deliveries}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500">Média/Trip</span>
                    <span className="font-semibold text-gray-300">{formatMZN(weeklyComparison.lastWeek.avgPerTrip)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500">Horas Online</span>
                    <span className="font-semibold text-gray-300">{weeklyComparison.lastWeek.hoursOnline}h</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trend summary */}
            <motion.div
              variants={fadeIn}
              className="mt-3 flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-3"
            >
              {weeklyComparison.thisWeek.earnings >= weeklyComparison.lastWeek.earnings ? (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                  <TrendingDown className="h-5 w-5 text-red-400" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">
                  {weeklyComparison.thisWeek.earnings >= weeklyComparison.lastWeek.earnings
                    ? 'Bom progresso esta semana!'
                    : 'A semana passada foi melhor'}
                </p>
                <p className="text-xs text-gray-400">
                  {pctChange(weeklyComparison.thisWeek.earnings, weeklyComparison.lastWeek.earnings) >= 0
                    ? `+${pctChange(weeklyComparison.thisWeek.earnings, weeklyComparison.lastWeek.earnings)}%`
                    : `${pctChange(weeklyComparison.thisWeek.earnings, weeklyComparison.lastWeek.earnings)}%`}{' '}
                  comparado com a semana passada
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-500" />
            </motion.div>
          </motion.div>

          {/* ─── Section 8: Payment Method ──────────────── */}
          <motion.div variants={fadeUp}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Ganhos por Método</h3>
              <CreditCard className="h-4 w-4 text-gray-400" />
            </div>

            <div className="space-y-3">
              {/* M-Pesa */}
              <motion.div
                variants={scaleIn}
                className="rounded-xl border border-gray-800 bg-gray-900 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15">
                    <Smartphone className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">M-Pesa</p>
                      <Badge className="rounded-full bg-red-500/15 px-2 text-[10px] font-semibold text-red-400 border-0">
                        Principal
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400">Vodacom M-Pesa • Saque automático</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{formatMZN(mpesaEarnings)}</p>
                    <p className="text-[10px] text-gray-500">
                      {totalLifetimeEarnings > 0
                        ? Math.round((mpesaEarnings / totalLifetimeEarnings) * 100)
                        : 0}
                      %
                    </p>
                  </div>
                </div>

                {/* M-Pesa bar */}
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-800">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${
                        totalLifetimeEarnings > 0
                          ? (mpesaEarnings / totalLifetimeEarnings) * 100
                          : 0
                      }%`,
                    }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </div>
              </motion.div>

              {/* Wallet */}
              <motion.div
                variants={scaleIn}
                className="rounded-xl border border-gray-800 bg-gray-900 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                    <Wallet className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">Carteira MedWallet</p>
                    </div>
                    <p className="text-xs text-gray-400">Saldo disponível para uso imediato</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{formatMZN(walletEarnings)}</p>
                    <p className="text-[10px] text-gray-500">
                      {totalLifetimeEarnings > 0
                        ? Math.round((walletEarnings / totalLifetimeEarnings) * 100)
                        : 0}
                      %
                    </p>
                  </div>
                </div>

                {/* Wallet bar */}
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-800">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${
                        totalLifetimeEarnings > 0
                          ? (walletEarnings / totalLifetimeEarnings) * 100
                          : 0
                      }%`,
                    }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* ─── Quick Actions Footer ────────────────────── */}
          <motion.div variants={fadeUp}>
            <GlassCard className="bg-gray-900/80 border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Precisa de ajuda?</p>
                  <p className="text-xs text-gray-400">Suporte via WhatsApp 24/7</p>
                </div>
                <Button
                  size="sm"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Contactar
                </Button>
              </div>
            </GlassCard>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
