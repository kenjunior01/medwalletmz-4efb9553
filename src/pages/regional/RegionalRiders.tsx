import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProvince } from '@/themes';
import { useManagedProvince } from '@/hooks/useManagedProvince';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Truck, MapPin, Phone, Star, CheckCircle, Ban, Search,
  Filter, TrendingUp, Package, Clock, User, Navigation,
  ToggleLeft, ToggleRight, AlertTriangle,
} from '@/components/icons/lucide-compat';
import {
  GlassCard, BentoCard, BentoGrid,
} from '@/components/ui/design-system';
import NumberFlow from '@number-flow/react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────

type RiderStatus = 'all' | 'active' | 'inactive' | 'on_delivery' | 'pending';

type VehicleType = 'motorcycle' | 'bicycle' | 'car' | 'van' | 'on_foot';

interface RiderDelivery {
  rider_id: string;
  today_count: number;
  week_count: number;
  total_count: number;
  avg_rating: number;
}

interface Rider {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  vehicle_type: VehicleType | null;
  is_verified: boolean;
  is_active: boolean;
  on_delivery: boolean;
  rating: number;
  created_at: string;
}

// ── Animation ──────────────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function getInitial(name: string): string {
  return name
    ?.split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

function getVehicleLabel(v: VehicleType | null): string {
  switch (v) {
    case 'motorcycle': return 'Moto';
    case 'bicycle': return 'Bicicleta';
    case 'car': return 'Carro';
    case 'van': return 'Van';
    case 'on_foot': return 'A pé';
    default: return '—';
  }
}

function getVehicleColor(v: VehicleType | null): string {
  switch (v) {
    case 'motorcycle': return 'bg-amber-500/10 text-amber-600';
    case 'bicycle': return 'bg-emerald-500/10 text-emerald-600';
    case 'car': return 'bg-sky-500/10 text-sky-600';
    case 'van': return 'bg-violet-500/10 text-violet-600';
    case 'on_foot': return 'bg-rose-500/10 text-rose-600';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getStatusConfig(rider: Rider, t: (key: string) => string) {
  if (rider.on_delivery) {
    return {
      label: t('regional.riders_status_on_delivery') || 'Em Entrega',
      className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      dot: 'bg-emerald-500',
    };
  }
  if (!rider.is_verified) {
    return {
      label: t('regional.riders_status_pending') || 'Pendente Verificação',
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      dot: 'bg-amber-500',
    };
  }
  if (rider.is_active) {
    return {
      label: t('regional.riders_status_active') || 'Activo',
      className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      dot: 'bg-emerald-500',
    };
  }
  return {
    label: t('regional.riders_status_inactive') || 'Inactivo',
    className: 'bg-red-500/10 text-red-600 border-red-500/20',
    dot: 'bg-red-500',
  };
}

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3 w-3 ${
            s <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function RegionalRiders() {
  const { province } = useProvince();
const { managedProvinceId, provinceFilter, canManageProvince } = useManagedProvince();
  const { t } = useCountry();

  // State
  const [riders, setRiders] = useState<Rider[]>([]);
  const [deliveryStats, setDeliveryStats] = useState<Record<string, RiderDelivery>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RiderStatus>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Data Fetching ──────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!province) return;
    setLoading(true);

    try {
      const pid = managedProvinceId || province?.id || '';

      // Fetch riders (profiles with role = 'driver')
      const { data: ridersData, error: ridersError } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, phone, avatar_url, vehicle_type, is_verified, is_active, on_delivery, rating, created_at')
        .eq('province', managedProvinceId || pid || '')
        .eq('role', 'driver')
        .order('created_at', { ascending: false });

      if (ridersError) throw ridersError;

      const riderList: Rider[] = (ridersData || []).map((r: any) => ({
        id: r.id,
        full_name: r.full_name || 'Sem Nome',
        phone: r.phone || null,
        avatar_url: r.avatar_url || null,
        vehicle_type: r.vehicle_type || null,
        is_verified: r.is_verified ?? false,
        is_active: r.is_active ?? true,
        on_delivery: r.on_delivery ?? false,
        rating: r.rating ?? 0,
        created_at: r.created_at,
      }));

      setRiders(riderList);

      // Fetch delivery counts from orders table
      if (riderList.length > 0) {
        const riderIds = riderList.map((r) => r.id);

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfWeekISO = startOfWeek.toISOString();

        const [todayRes, weekRes, allRes] = await Promise.all([
          (supabase as any)
            .from('orders')
            .select('driver_id')
            .in('driver_id', riderIds)
            .gte('created_at', startOfDay),
          (supabase as any)
            .from('orders')
            .select('driver_id, rating')
            .in('driver_id', riderIds)
            .gte('created_at', startOfWeekISO),
          (supabase as any)
            .from('orders')
            .select('driver_id, rating')
            .in('driver_id', riderIds)
            .eq('status', 'delivered'),
        ]);

        const statsMap: Record<string, RiderDelivery> = {};

        riderList.forEach((r) => {
          statsMap[r.id] = {
            rider_id: r.id,
            today_count: 0,
            week_count: 0,
            total_count: 0,
            avg_rating: 0,
          };
        });

        // Today counts
        (todayRes.data || []).forEach((o: any) => {
          if (statsMap[o.driver_id]) {
            statsMap[o.driver_id].today_count += 1;
          }
        });

        // Week counts + week ratings
        const weekRatings: Record<string, number[]> = {};
        (weekRes.data || []).forEach((o: any) => {
          if (statsMap[o.driver_id]) {
            statsMap[o.driver_id].week_count += 1;
            if (o.rating != null && o.rating > 0) {
              if (!weekRatings[o.driver_id]) weekRatings[o.driver_id] = [];
              weekRatings[o.driver_id].push(o.rating);
            }
          }
        });

        // All delivered counts + ratings
        const allRatings: Record<string, number[]> = {};
        (allRes.data || []).forEach((o: any) => {
          if (statsMap[o.driver_id]) {
            statsMap[o.driver_id].total_count += 1;
            if (o.rating != null && o.rating > 0) {
              if (!allRatings[o.driver_id]) allRatings[o.driver_id] = [];
              allRatings[o.driver_id].push(o.rating);
            }
          }
        });

        // Compute average ratings
        riderList.forEach((r) => {
          const weekArr = weekRatings[r.id] || [];
          const allArr = allRatings[r.id] || [];
          const combined = [...weekArr, ...allArr];
          if (combined.length > 0) {
            statsMap[r.id].avg_rating = Number((combined.reduce((a, b) => a + b, 0) / combined.length).toFixed(1));
          } else {
            statsMap[r.id].avg_rating = r.rating || 0;
          }
        });

        setDeliveryStats(statsMap);
      }
    } catch (err) {
      console.error('Failed to load riders:', err);
      toast.error(t('regional.riders_load_error') || 'Erro ao carregar riders');
    } finally {
      setLoading(false);
    }
  }, [province, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Computed Stats ─────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = riders.length;
    const active = riders.filter((r) => r.is_active && r.is_verified).length;
    const inactive = riders.filter((r) => !r.is_active || !r.is_verified).length;
    const onDelivery = riders.filter((r) => r.on_delivery).length;
    const totalDeliveries = Object.values(deliveryStats).reduce((sum, d) => sum + d.total_count, 0);
    const avgRating =
      riders.length > 0
        ? Number(
            (riders.reduce((sum, r) => sum + (deliveryStats[r.id]?.avg_rating || r.rating || 0), 0) /
              riders.length).toFixed(1)
          )
        : 0;
    return { total, active, inactive, onDelivery, totalDeliveries, avgRating };
  }, [riders, deliveryStats]);

  // ── Top Performers (top 3 by total deliveries) ────────────────────────

  const topPerformers = useMemo(() => {
    return [...riders]
      .sort((a, b) => (deliveryStats[b.id]?.total_count || 0) - (deliveryStats[a.id]?.total_count || 0))
      .slice(0, 3);
  }, [riders, deliveryStats]);

  // ── Filtering ──────────────────────────────────────────────────────────

  const filteredRiders = useMemo(() => {
    return riders.filter((r) => {
      // Status filter
      if (statusFilter === 'active' && (!r.is_active || !r.is_verified || r.on_delivery)) return false;
      if (statusFilter === 'inactive' && (r.is_active && r.is_verified)) return false;
      if (statusFilter === 'on_delivery' && !r.on_delivery) return false;
      if (statusFilter === 'pending' && r.is_verified) return false;

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const nameMatch = r.full_name.toLowerCase().includes(q);
        const phoneMatch = r.phone?.toLowerCase().includes(q) ?? false;
        if (!nameMatch && !phoneMatch) return false;
      }

      return true;
    });
  }, [riders, statusFilter, searchQuery]);

  // ── Actions ────────────────────────────────────────────────────────────

  const handleVerify = async (rider: Rider) => {
    const { error } = await (supabase as any)
      .from('profiles')
      .update({ is_verified: true })
      .eq('id', rider.id);

    if (!error) {
      setRiders((prev) => prev.map((r) => (r.id === rider.id ? { ...r, is_verified: true } : r)));
      toast.success(t('regional.riders_verified') || 'Rider verificado com sucesso');
    } else {
      toast.error(t('regional.riders_action_error') || 'Erro ao executar acção');
    }
  };

  const handleToggleActive = async (rider: Rider) => {
    const newActive = !rider.is_active;
    setTogglingId(rider.id);

    const { error } = await (supabase as any)
      .from('profiles')
      .update({ is_active: newActive })
      .eq('id', rider.id);

    if (!error) {
      setRiders((prev) => prev.map((r) => (r.id === rider.id ? { ...r, is_active: newActive } : r)));
      toast.success(
        newActive
          ? (t('regional.riders_activated') || 'Rider activado')
          : (t('regional.riders_suspended') || 'Rider suspenso')
      );
    } else {
      toast.error(t('regional.riders_action_error') || 'Erro ao executar acção');
    }
    setTogglingId(null);
  };

  // ── Filter Options ─────────────────────────────────────────────────────

  const statusFilters: { key: RiderStatus; label: string; count: number }[] = [
    { key: 'all', label: t('regional.riders_filter_all') || 'Todos', count: riders.length },
    { key: 'active', label: t('regional.riders_filter_active') || 'Activos', count: stats.active },
    { key: 'inactive', label: t('regional.riders_filter_inactive') || 'Inactivos', count: stats.inactive },
    { key: 'on_delivery', label: t('regional.riders_filter_on_delivery') || 'Em Entrega', count: stats.onDelivery },
    { key: 'pending', label: t('regional.riders_filter_pending') || 'Pendentes', count: riders.filter((r) => !r.is_verified).length },
  ];

  // ── Render Helpers ─────────────────────────────────────────────────────

  const provinceName = province?.name || t('regional.province_of') || 'Província';

  function riderAvatarColor(id: string): string {
    const colors = [
      'bg-teal-500/15 text-teal-700 dark:text-teal-300',
      'bg-amber-500/15 text-amber-700 dark:text-amber-300',
      'bg-rose-500/15 text-rose-700 dark:text-rose-300',
      'bg-violet-500/15 text-violet-700 dark:text-violet-300',
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      'bg-orange-500/15 text-orange-700 dark:text-orange-300',
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  function getTopPerformerCrown(rank: number) {
    if (rank === 0) return '🥇';
    if (rank === 1) return '🥈';
    if (rank === 2) return '🥉';
    return '';
  }

  // ── Loading Skeleton ───────────────────────────────────────────────────

  if (loading) {
    return (
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
        <motion.div variants={fadeUp}>
          <div className="h-6 w-64 bg-muted animate-pulse rounded" />
          <div className="h-4 w-48 bg-muted animate-pulse rounded mt-2" />
        </motion.div>
        <BentoGrid className="grid-cols-2 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <BentoCard key={i} size="sm" className="text-center">
              <div className="h-5 w-16 bg-muted animate-pulse rounded mx-auto" />
              <div className="h-3 w-20 bg-muted animate-pulse rounded mx-auto mt-1" />
            </BentoCard>
          ))}
        </BentoGrid>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <GlassCard key={i} className="!p-4 flex items-center gap-3">
              <div className="h-11 w-11 bg-muted animate-pulse rounded-xl" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              </div>
            </GlassCard>
          ))}
        </div>
      </motion.div>
    );
  }

  // ── Main Render ────────────────────────────────────────────────────────

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* ── 1. Province Header ──────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black">
            {t('regional.riders_title') || 'Gestão de Riders'}
          </h1>
          {province && <span className="text-xl leading-none">{province.culturalSymbol}</span>}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <p className="text-sm text-muted-foreground">
            {t('regional.province_of') || 'Província de'} {provinceName} — {province?.capital || '—'}
          </p>
        </div>
      </motion.div>

      {/* ── 2. Stats Grid ──────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <BentoGrid className="grid-cols-2 sm:grid-cols-3">
          <BentoCard size="sm" className="text-center">
            <User className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-black tabular-nums">
              <NumberFlow value={stats.total} />
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">
              {t('regional.riders_stat_total') || 'Total Riders'}
            </p>
          </BentoCard>

          <BentoCard size="sm" className="text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
            <p className="text-xl font-black tabular-nums text-emerald-500">
              <NumberFlow value={stats.active} />
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">
              {t('regional.riders_stat_active') || 'Activos'}
            </p>
          </BentoCard>

          <BentoCard size="sm" className="text-center">
            <ToggleLeft className="h-5 w-5 mx-auto text-red-400 mb-1" />
            <p className="text-xl font-black tabular-nums text-red-400">
              <NumberFlow value={stats.inactive} />
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">
              {t('regional.riders_stat_inactive') || 'Inactivos'}
            </p>
          </BentoCard>

          <BentoCard size="sm" className="text-center">
            <Navigation className="h-5 w-5 mx-auto text-sky-500 mb-1" />
            <p className="text-xl font-black tabular-nums text-sky-500">
              <NumberFlow value={stats.onDelivery} />
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">
              {t('regional.riders_stat_on_delivery') || 'Em Entrega'}
            </p>
          </BentoCard>

          <BentoCard size="sm" className="text-center">
            <Star className="h-5 w-5 mx-auto text-amber-400 mb-1" />
            <p className="text-xl font-black tabular-nums text-amber-500">
              <NumberFlow value={stats.avgRating} />
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">
              {t('regional.riders_stat_avg_rating') || 'Avaliação Média'}
            </p>
          </BentoCard>

          <BentoCard size="sm" className="text-center">
            <Package className="h-5 w-5 mx-auto text-violet-500 mb-1" />
            <p className="text-xl font-black tabular-nums text-violet-500">
              <NumberFlow value={stats.totalDeliveries} />
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">
              {t('regional.riders_stat_total_deliveries') || 'Total Entregas'}
            </p>
          </BentoCard>
        </BentoGrid>
      </motion.div>

      {/* ── 9. Top Performers ───────────────────────────────────────────── */}
      {topPerformers.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <h2 className="font-bold text-base">
              {t('regional.riders_top_performers') || 'Melhores Desempenhos'}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {topPerformers.map((rider, idx) => {
              const ds = deliveryStats[rider.id];
              return (
                <GlassCard
                  key={`top-${rider.id}`}
                  className="!p-3 relative overflow-hidden"
                >
                  {idx === 0 && (
                    <div
                      className="absolute inset-0 opacity-[0.06]"
                      style={{
                        background: province?.gradients?.accent || 'linear-gradient(135deg, #f59e0b, #f97316)',
                      }}
                    />
                  )}
                  <div className="relative flex items-center gap-3">
                    <div className="text-2xl leading-none">{getTopPerformerCrown(idx)}</div>
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${riderAvatarColor(rider.id)}`}
                    >
                      {getInitial(rider.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{rider.full_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          <NumberFlow value={ds?.total_count || 0} /> {t('regional.riders_deliveries') || 'entregas'}
                        </span>
                        {renderStars(ds?.avg_rating || rider.rating || 0)}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── 3. Search Bar ───────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('regional.riders_search_placeholder') || 'Pesquisar por nome ou telefone...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </motion.div>

      {/* ── 4. Status Filters ───────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="flex gap-2 overflow-x-auto pb-1">
        {statusFilters.map((f) => (
          <Button
            key={f.key}
            variant={statusFilter === f.key ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5 shrink-0 text-xs"
            onClick={() => setStatusFilter(f.key)}
          >
            <Filter className="h-3 w-3" />
            {f.label}
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
              {f.count}
            </Badge>
          </Button>
        ))}
      </motion.div>

      {/* ── 5-8. Rider Cards List ───────────────────────────────────────── */}
      {filteredRiders.length === 0 ? (
        /* ── 10. Empty State ─────────────────────────────────────────────── */
        <motion.div variants={fadeUp}>
          <GlassCard className="!p-8 text-center">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">
              {searchQuery || statusFilter !== 'all'
                ? (t('regional.riders_no_results') || 'Nenhum rider encontrado')
                : (t('regional.riders_empty') || 'Sem riders registados')}
            </h3>
            <p className="text-xs text-muted-foreground/70">
              {searchQuery || statusFilter !== 'all'
                ? (t('regional.riders_try_other') || 'Tente outro filtro ou termo de pesquisa')
                : (t('regional.riders_empty_desc') || 'Os riders desta província aparecerão aqui')}
            </p>
          </GlassCard>
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {filteredRiders.map((rider) => {
            const ds = deliveryStats[rider.id];
            const statusConf = getStatusConfig(rider, t);
            const effectiveRating = ds?.avg_rating || rider.rating || 0;
            const isToggling = togglingId === rider.id;

            return (
              <GlassCard
                key={rider.id}
                className="!p-4"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${riderAvatarColor(rider.id)}`}
                  >
                    {rider.avatar_url ? (
                      <img
                        src={rider.avatar_url}
                        alt={rider.full_name}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      getInitial(rider.full_name)
                    )}
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: Name + verification + status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">{rider.full_name}</p>
                      {rider.is_verified ? (
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      )}
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 shrink-0 ${statusConf.className}`}
                      >
                        <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${statusConf.dot}`} />
                        {statusConf.label}
                      </Badge>
                    </div>

                    {/* Row 2: Phone + Vehicle */}
                    <div className="flex items-center gap-3 mt-1">
                      {rider.phone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {rider.phone}
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md ${getVehicleColor(rider.vehicle_type)}`}>
                        <Truck className="h-3 w-3" />
                        {getVehicleLabel(rider.vehicle_type)}
                      </span>
                    </div>

                    {/* Row 3: Rating + Join Date */}
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1">
                        {renderStars(effectiveRating)}
                        <span className="text-[11px] text-muted-foreground tabular-nums ml-0.5">{effectiveRating}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-0.5 -mt-px" />
                        {new Date(rider.created_at).toLocaleDateString('pt-PT')}
                      </span>
                    </div>

                    {/* Row 4: Performance Indicators */}
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/50">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Package className="h-3 w-3 text-violet-400" />
                        <span className="tabular-nums font-medium text-foreground">
                          {ds?.today_count || 0}
                        </span>
                        <span className="text-[10px]">{t('regional.riders_today') || 'hoje'}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3 text-emerald-400" />
                        <span className="tabular-nums font-medium text-foreground">
                          {ds?.week_count || 0}
                        </span>
                        <span className="text-[10px]">{t('regional.riders_this_week') || 'esta semana'}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Package className="h-3 w-3" />
                        <span className="tabular-nums font-medium text-foreground">
                          {ds?.total_count || 0}
                        </span>
                        <span className="text-[10px]">{t('regional.riders_total_short') || 'total'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {/* Toggle Active/Inactive */}
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`toggle-${rider.id}`} className="text-[10px] text-muted-foreground">
                        {rider.is_active
                          ? (t('regional.riders_active_label') || 'Activo')
                          : (t('regional.riders_inactive_label') || 'Suspenso')}
                      </Label>
                      <Switch
                        id={`toggle-${rider.id}`}
                        checked={rider.is_active}
                        disabled={isToggling}
                        onCheckedChange={() => handleToggleActive(rider)}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-1">
                      {/* Approve Verification (only if not verified) */}
                      {!rider.is_verified && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-emerald-500 hover:bg-emerald-500/10"
                          onClick={() => handleVerify(rider)}
                          title={t('regional.riders_approve') || 'Aprovar Verificação'}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Suspend (if active) / Activate (if inactive) */}
                      {rider.is_verified && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-7 w-7 p-0 ${
                            rider.is_active
                              ? 'text-red-500 hover:bg-red-500/10'
                              : 'text-emerald-500 hover:bg-emerald-500/10'
                          }`}
                          onClick={() => handleToggleActive(rider)}
                          title={
                            rider.is_active
                              ? (t('regional.riders_suspend') || 'Suspender')
                              : (t('regional.riders_activate') || 'Activar')
                          }
                        >
                          {rider.is_active ? (
                            <Ban className="h-3.5 w-3.5" />
                          ) : (
                            <ToggleRight className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}

                      {/* View Profile */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted"
                        title={t('regional.riders_view_profile') || 'Ver Perfil'}
                      >
                        <User className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
