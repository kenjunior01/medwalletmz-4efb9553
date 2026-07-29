import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { GlassCard } from '@/components/ui/design-system';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Clock,
  MapPin,
  Star,
  Filter,
  Calendar,
  ChevronRight,
  CheckCircle,
  XCircle,
  Store,
  DollarSign,
  Route,
  Zap,
  Award,
  BarChart3,
  TrendingUp,
  Navigation,
  Flame,
  Trophy,
} from '@/components/icons/lucide-compat';
import { AnimatePresence, motion } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TripOrder {
  id: string;
  total: number;
  delivery_fee: number;
  delivery_address: string | null;
  pickup_address: string | null;
  items: any[] | null;
  payment_method: string | null;
  status: string;
  created_at: string;
  store: {
    id: string;
    name: string;
    address: string | null;
  } | null;
}

interface Assignment {
  id: string;
  driver_id: string;
  order_id: string;
  status: string;
  assigned_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  driver_fee: number;
  driver_rating: number | null;
  customer_rating: number | null;
  duration_minutes: number | null;
  distance_km: number | null;
  order: TripOrder;
}

interface DayGroup {
  dateKey: string;
  label: string;
  trips: Assignment[];
  totalEarnings: number;
  count: number;
}

type DateRange = 'today' | 'week' | 'month' | 'all';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmtMZN = (v: number) =>
  new Intl.NumberFormat('pt-MZ', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v) + ' MZN';

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
};

const fmtDuration = (min: number | null) => {
  if (!min) return '\u2014';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

const DAY_LABELS: Record<string, (d: Date) => string> = {
  today: (d) => {
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Hoje';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
    return d.toLocaleDateString('pt-MZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  },
  week: (d) => {
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Hoje';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
    return d.toLocaleDateString('pt-MZ', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  },
  month: (d) =>
    d.toLocaleDateString('pt-MZ', {
      day: 'numeric',
      month: 'short',
    }),
  all: (d) =>
    d.toLocaleDateString('pt-MZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
};

const startOfRange = (range: DateRange): Date | null => {
  const now = new Date();
  switch (range) {
    case 'today': {
      const s = new Date(now);
      s.setHours(0, 0, 0, 0);
      return s;
    }
    case 'week': {
      const s = new Date(now);
      const day = s.getDay();
      s.setDate(s.getDate() - (day === 0 ? 6 : day - 1));
      s.setHours(0, 0, 0, 0);
      return s;
    }
    case 'month': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return s;
    }
    case 'all':
      return null;
  }
};

/* ------------------------------------------------------------------ */
/*  Achievement Badge Definition                                       */
/* ------------------------------------------------------------------ */

interface Achievement {
  key: string;
  label: string;
  icon: typeof Award;
  threshold: number;
  color: string;
  bg: string;
}

const ACHIEVEMENTS: Achievement[] = [
  { key: 'first', label: 'Primeira Entrega', icon: Zap, threshold: 1, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30' },
  { key: 'ten', label: '10 Entregas', icon: Award, threshold: 8, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  { key: 'fifty', label: '50 Entregas', icon: TrendingUp, threshold: 40, color: 'text-violet-500', bg: 'bg-violet-500/10 border-violet-500/30' },
  { key: 'hundred', label: '100 Entregas', icon: BarChart3, threshold: 80, color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/30' },
  { key: 'streak7', label: 'Streak 7 dias', icon: Flame, threshold: 0, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' },
  { key: 'weekly30', label: '30 Entregas/Semana', icon: Trophy, threshold: 0, color: 'text-purple-500', bg: 'bg-purple-50 border-purple-200' },
];

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function SkeletonGrid() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted/60" />
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-full bg-muted/60" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-5 w-40 rounded bg-muted/60" />
          <div className="h-28 rounded-2xl bg-muted/60" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Star Rating                                                        */
/* ------------------------------------------------------------------ */

function StarRating({ rating, size = 14 }: { rating: number | null; size?: number }) {
  if (!rating) return <span className="text-muted-foreground text-xs">Sem avalia\u00e7\u00e3o</span>;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}
        />
      ))}
      <span className="ml-1 text-xs font-medium text-muted-foreground">{rating.toFixed(1)}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function RiderTrips() {
  const { user } = useAuth();
  const { t } = useCountry();

  const [trips, setTrips] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);

  /* ---- Fetch ---- */
  const fetchTrips = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('driver_assignments')
        .select(
          `id, driver_id, order_id, status, assigned_at, picked_up_at, delivered_at, cancelled_at, driver_fee, driver_rating, customer_rating, duration_minutes, distance_km, order:orders(id, total, delivery_fee, delivery_address, pickup_address, items, payment_method, status, created_at, store:stores(id, name, address))`,
        )
        .eq('driver_id', user.id)
        .in('status', ['delivered', 'cancelled'])
        .order('assigned_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setTrips((data as Assignment[]) || []);
    } catch (err) {
      console.error('Erro ao carregar entregas:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  /* ---- Filter by date range ---- */
  const filteredTrips = useMemo(() => {
    const start = startOfRange(dateRange);
    if (!start) return trips;
    return trips.filter((trip) => {
      const d = new Date(trip.assigned_at);
      return d >= start;
    });
  }, [trips, dateRange]);

  /* ---- Group by day ---- */
  const groupedDays = useMemo((): DayGroup[] => {
    const map = new Map<string, Assignment[]>();
    filteredTrips.forEach((trip) => {
      const d = new Date(trip.assigned_at);
      const key = d.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(trip);
    });

    const labelFn = DAY_LABELS[dateRange] || DAY_LABELS.all;
    const groups: DayGroup[] = [];
    map.forEach((dayTrips, dateKey) => {
      const earnings = dayTrips.reduce((s, t) => s + (t.driver_fee || 0), 0);
      groups.push({
        dateKey,
        label: labelFn(new Date(dateKey + 'T12:00:00')),
        trips: dayTrips,
        totalEarnings: earnings,
        count: dayTrips.length,
      });
    });
    return groups;
  }, [filteredTrips, dateRange]);

  /* ---- Stats ---- */
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthTrips = trips.filter((t) => new Date(t.assigned_at) >= monthStart);
    const totalEarnings = trips.reduce((s, t) => s + (t.driver_fee || 0), 0);
    const monthEarnings = thisMonthTrips.reduce((s, t) => s + (t.driver_fee || 0), 0);
    const ratings = trips
      .map((t) => t.customer_rating)
      .filter((r): r is number => r !== null && r > 0);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    return {
      total: trips.length,
      thisMonth: thisMonthTrips.length,
      totalEarnings,
      monthEarnings,
      avgRating,
    };
  }, [trips]);

  /* ---- Achievements ---- */
  /* compute weekly delivery count */
  const weeklyDeliveries = useMemo(() => {
    const now = new Date();
    const dow = (now.getDay() + 6) % 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dow);
    weekStart.setHours(0, 0, 0, 0);
    return trips.filter(t => new Date(t.assigned_at) >= weekStart && t.status === 'delivered').length;
  }, [trips]);

  /* compute consecutive-day streak */
  const streakDays = useMemo(() => {
    const deliveredDays = new Set(
      trips
        .filter(t => t.status === 'delivered' && t.delivered_at)
        .map(t => new Date(t.delivered_at).toISOString().slice(0, 10))
    );
    let streak = 0;
    const d = new Date();
    while (true) {
      const key = d.toISOString().slice(0, 10);
      if (deliveredDays.has(key)) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return streak;
  }, [trips]);

  const isSpecialKey = (key: string) => key === 'streak7' || key === 'weekly30';

  const isUnlocked = useCallback((a: Achievement) => {
    if (a.key === 'streak7') return streakDays >= 7;
    if (a.key === 'weekly30') return weeklyDeliveries >= 30;
    return stats.total >= a.threshold;
  }, [stats.total, streakDays, weeklyDeliveries]);

  const unlockedAchievements = useMemo(
    () => ACHIEVEMENTS.filter(isUnlocked),
    [isUnlocked],
  );

  /* ---- Render helpers ---- */
  const DATE_RANGES: { key: DateRange; label: string }[] = [
    { key: 'today', label: 'Hoje' },
    { key: 'week', label: 'Esta Semana' },
    { key: 'month', label: 'Este M\u00eas' },
    { key: 'all', label: 'Todos' },
  ];

  const toggleExpand = (id: string) => setExpandedTrip((prev) => (prev === id ? null : id));

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 pt-6 pb-32">
        <SkeletonGrid />
      </div>
    );
  }

  /* ---- Empty state ---- */
  if (trips.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6"
        >
          <Package size={40} className="text-emerald-500" />
        </motion.div>
        <h2 className="text-xl font-bold text-foreground mb-2">Nenhuma entrega ainda</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-xs">
          Comece a receber pedidos e acompanhe o seu hist\u00f3rico de entregas aqui.
        </p>
        <Button size="lg" className="rounded-full px-8 gap-2 font-semibold">
          <Navigation size={18} />
          Ir para Modo Rider
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-foreground">Hist\u00f3rico de Entregas</h1>
          <Badge variant="secondary" className="text-xs font-medium gap-1">
            <Route size={12} />
            {stats.total} entregas
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Acompanhe todas as suas entregas realizadas</p>
      </header>

      <div className="px-4 pt-5 space-y-5">
        {/* ============ STATS CARDS ============ */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 gap-3"
        >
          <GlassCard className="rounded-2xl space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Package size={16} />
              <span className="text-xs font-medium">Total entregas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </GlassCard>

          <GlassCard className="rounded-2xl space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar size={16} />
              <span className="text-xs font-medium">Este m\u00eas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.thisMonth}</p>
          </GlassCard>

          <GlassCard className="rounded-2xl space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign size={16} />
              <span className="text-xs font-medium">Ganhos totais</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {fmtMZN(stats.totalEarnings)}
            </p>
          </GlassCard>

          <GlassCard className="rounded-2xl space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Star size={16} />
              <span className="text-xs font-medium">Rating m\u00e9dio</span>
            </div>
            <div className="flex items-center gap-1.5">
              <p className="text-2xl font-bold text-amber-500">
                {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '\u2014'}
              </p>
              {stats.avgRating > 0 && <Star size={16} className="fill-amber-400 text-amber-400" />}
            </div>
          </GlassCard>
        </motion.div>

        {/* ============ DATE RANGE SELECTOR ============ */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide"
        >
          <Filter size={14} className="text-muted-foreground shrink-0" />
          {DATE_RANGES.map((r) => {
            const active = dateRange === r.key;
            return (
              <button
                key={r.key}
                onClick={() => setDateRange(r.key)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-foreground text-background shadow-md'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </motion.div>

        {/* ============ ACHIEVEMENTS ============ */}
        {true && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Award size={15} className="text-amber-500" />
              Conquistas
            </h3>
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
              {ACHIEVEMENTS.map((a) => {
                const unlocked = isUnlocked(a);
                const Icon = a.icon;
                return (
                  <div
                    key={a.key}
                    className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 ${
                      unlocked ? a.bg : 'bg-muted/30 border-border/30 opacity-50'
                    }`}
                  >
                    <Icon size={16} className={unlocked ? a.color : 'text-muted-foreground'} />
                    <span className={`text-xs font-semibold whitespace-nowrap ${unlocked ? a.color : 'text-muted-foreground'}`}>
                      {a.label}
                    </span>
                    {unlocked && <CheckCircle size={13} className={a.color} />}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ============ TRIPS LIST ============ */}
        <AnimatePresence mode="wait">
          <motion.div
            key={dateRange}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {groupedDays.length === 0 ? (
              <div className="text-center py-16">
                <Calendar size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma entrega neste per\u00edodo</p>
              </div>
            ) : (
              groupedDays.map((day) => (
                <div key={day.dateKey} className="space-y-2.5">
                  {/* Day header */}
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-bold text-foreground capitalize">{day.label}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package size={12} />
                        {day.count} {day.count === 1 ? 'entrega' : 'entregas'}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                        <DollarSign size={12} />
                        +{fmtMZN(day.totalEarnings)}
                      </span>
                    </div>
                  </div>

                  {/* Trip cards */}
                  <div className="space-y-2">
                    {day.trips.map((trip, idx) => {
                      const isExpanded = expandedTrip === trip.id;
                      const isDelivered = trip.status === 'delivered';
                      const storeName = trip.order?.store?.name || 'Farm\u00e1cia';
                      const pickup = trip.order?.pickup_address || trip.order?.store?.address || '\u2014';
                      const delivery = trip.order?.delivery_address || '\u2014';
                      const fee = trip.driver_fee || 0;
                      const bonus = Math.max(0, (trip.order?.delivery_fee || 0) - fee);

                      return (
                        <motion.div
                          key={trip.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04, duration: 0.3 }}
                        >
                          <GlassCard
                            className={`rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                              isExpanded ? 'ring-1 ring-foreground/10' : ''
                            }`}
                            onClick={() => toggleExpand(trip.id)}
                          >
                            {/* Row 1: Store + Status */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isDelivered ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                                  <Store size={16} className={isDelivered ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">{storeName}</p>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <Clock size={11} />
                                    {fmtTime(trip.assigned_at)}
                                    {trip.duration_minutes && (
                                      <>
                                        <span className="mx-1">\u00b7</span>
                                        {fmtDuration(trip.duration_minutes)}
                                      </>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge className={`text-[10px] font-bold uppercase tracking-wider ${isDelivered ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' : 'bg-red-500/15 text-red-500 border-red-500/30 hover:bg-red-500/20'}`}>
                                  {isDelivered ? <CheckCircle size={10} className="mr-1" /> : <XCircle size={10} className="mr-1" />}
                                  {isDelivered ? 'Entregue' : 'Cancelada'}
                                </Badge>
                                <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                                  <ChevronRight size={16} className="text-muted-foreground" />
                                </motion.div>
                              </div>
                            </div>

                            {/* Row 2: Route preview */}
                            <div className="mt-3 flex items-start gap-2">
                              <div className="flex flex-col items-center gap-0.5 pt-0.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <div className="w-px h-5 bg-border" />
                                <div className="w-2 h-2 rounded-full bg-rose-500" />
                              </div>
                              <div className="flex-1 min-w-0 space-y-2">
                                <p className="text-xs text-muted-foreground truncate">{pickup}</p>
                                <p className="text-xs text-muted-foreground truncate">{delivery}</p>
                              </div>
                            </div>

                            {/* Row 3: Fee + Bonus */}
                            <div className="mt-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {trip.distance_km != null && (
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <Navigation size={11} />
                                    {trip.distance_km.toFixed(1)} km
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-foreground">+{fmtMZN(fee)}</span>
                                {bonus > 0 && (
                                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                    +{fmtMZN(bonus)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* ============ EXPANDED DETAILS ============ */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-4 pt-4 border-t border-border/50 space-y-3.5">
                                    {/* Full addresses */}
                                    <div className="space-y-2">
                                      <div className="flex items-start gap-2">
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                          <MapPin size={11} className="text-emerald-500" />
                                        </div>
                                        <div>
                                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Ponto de retirada</p>
                                          <p className="text-xs text-foreground mt-0.5">{pickup}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-start gap-2">
                                        <div className="w-5 h-5 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                          <MapPin size={11} className="text-rose-500" />
                                        </div>
                                        <div>
                                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Ponto de entrega</p>
                                          <p className="text-xs text-foreground mt-0.5">{delivery}</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Items */}
                                    {trip.order?.items && Array.isArray(trip.order.items) && trip.order.items.length > 0 && (
                                      <div>
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Itens do pedido</p>
                                        <div className="space-y-1">
                                          {trip.order.items.map((item: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between text-xs">
                                              <span className="text-foreground">{item.quantity || 1}\u00d7 {item.name || item.product_name || 'Item'}</span>
                                              {item.price != null && (
                                                <span className="text-muted-foreground">{fmtMZN(item.price)}</span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Payment method + Rating */}
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Pagamento</p>
                                        <p className="text-xs font-medium text-foreground">
                                          {trip.order?.payment_method
                                            ? trip.order.payment_method === 'mpesa'
                                              ? 'M-Pesa'
                                              : trip.order.payment_method === 'cash'
                                              ? 'Dinheiro'
                                              : trip.order.payment_method === 'card'
                                              ? 'Cart\u00e3o'
                                              : trip.order.payment_method.charAt(0).toUpperCase() + trip.order.payment_method.slice(1)
                                            : '\u2014'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Avalia\u00e7\u00e3o do cliente</p>
                                        <StarRating rating={trip.customer_rating} size={13} />
                                      </div>
                                    </div>

                                    {/* Order ID */}
                                    <p className="text-[10px] text-muted-foreground/60 font-mono">
                                      Pedido #{trip.order?.id?.slice(0, 8) || '\u2014'}
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </GlassCard>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
