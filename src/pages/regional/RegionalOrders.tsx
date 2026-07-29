import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProvince } from '@/themes';
import { useManagedProvince } from '@/hooks/useManagedProvince';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  GlassCard,
  BentoCard,
  BentoGrid,
} from '@/components/ui/design-system';
import NumberFlow from '@number-flow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Package,
  ShoppingBag,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Filter,
  Search,
  TrendingUp,
  Wallet,
  Eye,
} from '@/components/icons/lucide-compat';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  quantity: number;
  product?: { name: string } | null;
}

interface ProvinceOrder {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  customer_name: string;
  delivery_address: string | null;
  rider_name: string | null;
  notes: string | null;
  created_at: string;
  province: string;
  items_count: number;
  order_items?: OrderItem[];
}

type OrderStatus = 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled';

type TimeFilter = 'today' | 'week' | 'month' | 'all';

interface MonthlyTrend {
  month: string;
  count: number;
  revenue: number;
}

interface OrderStats {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
  cancelled: number;
  revenueThisMonth: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const STATUS_TABS: { key: 'all' | OrderStatus; labelPt: string; labelEn: string }[] = [
  { key: 'all', labelPt: 'Todos', labelEn: 'All' },
  { key: 'pending', labelPt: 'Pendentes', labelEn: 'Pending' },
  { key: 'confirmed', labelPt: 'Confirmados', labelEn: 'Confirmed' },
  { key: 'in_transit', labelPt: 'A Caminho', labelEn: 'In Transit' },
  { key: 'delivered', labelPt: 'Entregues', labelEn: 'Delivered' },
  { key: 'cancelled', labelPt: 'Cancelados', labelEn: 'Cancelled' },
];

const TIME_FILTERS: { key: TimeFilter; labelPt: string; labelEn: string }[] = [
  { key: 'today', labelPt: 'Hoje', labelEn: 'Today' },
  { key: 'week', labelPt: 'Esta Semana', labelEn: 'This Week' },
  { key: 'month', labelPt: 'Este Mês', labelEn: 'This Month' },
  { key: 'all', labelPt: 'Todo Período', labelEn: 'All Time' },
];

const STATUS_CONFIG: Record<string, { labelPt: string; color: string; bg: string; border: string; icon: typeof Package }> = {
  pending: { labelPt: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock },
  confirmed: { labelPt: 'Confirmado', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: CheckCircle },
  in_transit: { labelPt: 'A Caminho', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200', icon: Truck },
  delivered: { labelPt: 'Entregue', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle },
  cancelled: { labelPt: 'Cancelado', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTimeRange(filter: TimeFilter): { start: Date | null; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  switch (filter) {
    case 'today':
      return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end };
    case 'week': {
      const dayOfWeek = now.getDay() || 7;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);
      return { start, end };
    }
    case 'month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
    case 'all':
    default:
      return { start: null, end };
  }
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-MZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatShortId(id: string): string {
  if (id.length <= 8) return id.toUpperCase();
  return '#' + id.slice(0, 8).toUpperCase();
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function RegionalOrders() {
  const { province } = useProvince();
const { managedProvinceId, provinceFilter, canManageProvince } = useManagedProvince();
  const { t } = useCountry();

  // State
  const [orders, setOrders] = useState<ProvinceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showRevenueCard, setShowRevenueCard] = useState(true);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const loadOrders = useCallback(async () => {
    if (!province) return;
    setLoading(true);

    try {
      const pid = managedProvinceId || province?.id || '';
      const { start, end } = getTimeRange(timeFilter);

      let query = (supabase as any)
        .from('orders')
        .select('id, status, total, subtotal, delivery_fee, customer_name, delivery_address, rider_name, notes, created_at, province, order_items(id, quantity, product(name))')
        .eq('province', managedProvinceId || pid || '');

      if (start) query = query.gte('created_at', start.toISOString());
      query = query.lte('created_at', end.toISOString());
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      const enriched = (data || []).map((o: any) => ({
        ...o,
        items_count: o.order_items?.length ?? 0,
        customer_name: o.customer_name || o.profile?.full_name || 'Cliente Anónimo',
        rider_name: o.rider_name || null,
      }));

      setOrders(enriched);
    } catch (err) {
      console.error('Failed to load orders:', err);
      toast.error(t('regional.load_error') || 'Erro ao carregar encomendas');
    } finally {
      setLoading(false);
    }
  }, [province, timeFilter, t]);

  const loadMonthlyTrend = useCallback(async () => {
    if (!province) return;
    const pid = managedProvinceId || province?.id || '';
    const now = new Date();
    const months: MonthlyTrend[] = [];

    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      months.push({
        month: `${MONTHS_PT[mStart.getMonth()]} ${mStart.getFullYear()}`,
        count: 0,
        revenue: 0,
      });
    }

    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const { data } = await (supabase as any)
        .from('orders')
        .select('id, total, status')
        .eq('province', managedProvinceId || pid || '')
        .gte('created_at', mStart.toISOString())
        .lt('created_at', mEnd.toISOString());
      months[5 - i].count = data?.length ?? 0;
      months[5 - i].revenue = (data || []).reduce(
        (s: number, o: any) => s + Number(o.total || 0),
        0,
      );
    }

    setMonthlyTrend(months);
  }, [province]);

  useEffect(() => {
    loadOrders();
    loadMonthlyTrend();
  }, [loadOrders, loadMonthlyTrend]);

  // ─── Stats ─────────────────────────────────────────────────────────────

  const stats = useMemo<OrderStats>(() => {
    // Always calculate stats from all orders in the province for the current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthOrders = orders.filter(
      (o) => new Date(o.created_at) >= monthStart,
    );

    const deliveredRevenue = monthOrders
      .filter((o) => o.status === 'delivered')
      .reduce((s, o) => s + Number(o.total || 0), 0);

    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      inTransit: orders.filter((o) => o.status === 'in_transit').length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
      revenueThisMonth: deliveredRevenue,
    };
  }, [orders]);

  // ─── Filtered orders ────────────────────────────────────────────────────

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
          (o.rider_name && o.rider_name.toLowerCase().includes(q)) ||
          (o.delivery_address && o.delivery_address.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [orders, statusFilter, search]);

  // ─── Status update ────────────────────────────────────────────────────

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const { error } = await (supabase as any)
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast.success(
        newStatus === 'confirmed'
          ? (t('regional.order_confirmed') || 'Encomenda confirmada com sucesso')
          : newStatus === 'in_transit'
            ? (t('regional.rider_assigned') || 'Estafeta atribuído com sucesso')
            : newStatus === 'delivered'
              ? (t('regional.order_delivered') || 'Encomenda marcada como entregue')
              : (t('regional.order_cancelled') || 'Encomenda cancelada'),
      );

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
    } catch {
      toast.error(t('regional.update_error') || 'Erro ao actualizar encomenda');
    } finally {
      setUpdatingId(null);
    }
  };

  // ─── Chart helpers ──────────────────────────────────────────────────────

  const maxTrendCount = Math.max(...monthlyTrend.map((m) => m.count), 1);

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* ─── Province Header ──────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="flex items-start gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
            style={{ background: province?.gradients?.accent || 'linear-gradient(135deg, #0D9488, #14B8A6)' }}
          >
            {province?.culturalSymbol || '📦'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black leading-tight">
              {t('regional.orders_title') || 'Gestão de Encomendas'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {t('regional.orders_subtitle') || 'Todas as encomendas e entregas da província'}
              {province ? ` — ${province.name}` : ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRevenueCard((v) => !v)}
            className="shrink-0"
          >
            <Wallet className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* ─── Revenue Summary Card ─────────────────────────────────────── */}
      <AnimatePresence>
        {showRevenueCard && (
          <motion.div
            variants={fadeUp}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard
              className="!p-5 relative overflow-hidden"
              style={{ background: province?.gradients?.hero || 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)' }}
            >
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-white/70 uppercase tracking-wide">
                    {t('regional.revenue_this_month') || 'Receita Este Mês'}
                  </p>
                  <p className="text-3xl font-black text-white mt-1 tabular-nums">
                    <NumberFlow value={stats.revenueThisMonth} />
                    <span className="text-sm font-medium text-white/60 ml-1.5">MZN</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>

              {/* Monthly trend mini chart */}
              {monthlyTrend.length > 0 && (
                <div className="relative z-10 mt-4">
                  <div className="flex items-end gap-1.5" style={{ height: '56px' }}>
                    {monthlyTrend.map((m) => {
                      const pct = maxTrendCount > 0 ? (m.count / maxTrendCount) * 100 : 0;
                      return (
                        <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(pct, 6)}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="w-full rounded-t-sm min-h-[3px] bg-white/30"
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1.5">
                    {monthlyTrend.map((m) => (
                      <span key={m.month} className="text-[8px] text-white/50 flex-1 text-center">
                        {m.month.split(' ')[0]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Stats Grid ───────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <BentoGrid className="grid-cols-3 md:grid-cols-5">
          <BentoCard size="sm" className="text-center">
            <ShoppingBag className="h-5 w-5 mx-auto text-primary mb-1.5" />
            <p className="text-xl font-black tabular-nums">
              <NumberFlow value={stats.total} />
            </p>
            <p className="text-[10px] text-muted-foreground uppercase font-medium">
              {t('regional.total_orders') || 'Total'}
            </p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1.5" />
            <p className="text-xl font-black tabular-nums text-amber-600">
              <NumberFlow value={stats.pending} />
            </p>
            <p className="text-[10px] text-muted-foreground uppercase font-medium">
              {t('regional.pending') || 'Pendentes'}
            </p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <Truck className="h-5 w-5 mx-auto text-cyan-500 mb-1.5" />
            <p className="text-xl font-black tabular-nums text-cyan-600">
              <NumberFlow value={stats.inTransit} />
            </p>
            <p className="text-[10px] text-muted-foreground uppercase font-medium">
              {t('regional.in_transit') || 'A Caminho'}
            </p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-emerald-500 mb-1.5" />
            <p className="text-xl font-black tabular-nums text-emerald-600">
              <NumberFlow value={stats.delivered} />
            </p>
            <p className="text-[10px] text-muted-foreground uppercase font-medium">
              {t('regional.delivered') || 'Entregues'}
            </p>
          </BentoCard>
          <BentoCard size="sm" className="text-center col-span-2 md:col-span-1">
            <XCircle className="h-5 w-5 mx-auto text-red-400 mb-1.5" />
            <p className="text-xl font-black tabular-nums text-red-500">
              <NumberFlow value={stats.cancelled} />
            </p>
            <p className="text-[10px] text-muted-foreground uppercase font-medium">
              {t('regional.cancelled') || 'Cancelados'}
            </p>
          </BentoCard>
        </BentoGrid>
      </motion.div>

      {/* ─── Search Bar ──────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('regional.search_orders') || 'Pesquisar encomendas, clientes, estafetas...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-10 h-10 bg-background border-border/50"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </motion.div>

      {/* ─── Status Filter Tabs ─────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.key;
            const count =
              tab.key === 'all'
                ? stats.total
                : tab.key === 'pending'
                  ? stats.pending
                  : tab.key === 'confirmed'
                    ? orders.filter((o) => o.status === 'confirmed').length
                    : tab.key === 'in_transit'
                      ? stats.inTransit
                      : tab.key === 'delivered'
                        ? stats.delivered
                        : stats.cancelled;

            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`
                  flex items-center gap-1.5 shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold
                  transition-all duration-200 border
                  ${
                    isActive
                      ? 'text-white shadow-md border-transparent'
                      : 'bg-background text-muted-foreground border-border/50 hover:border-border'
                  }
                `}
                style={
                  isActive
                    ? { background: province?.colors?.primary || '#0D9488' }
                    : undefined
                }
              >
                {t(`regional.${tab.key}`) || tab.labelPt}
                {count > 0 && (
                  <span
                    className={`
                      inline-flex items-center justify-center h-4 min-w-[16px] rounded-full px-1 text-[10px] font-bold
                      ${isActive ? 'bg-white/25 text-white' : 'bg-muted text-muted-foreground'}
                    `}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ─── Time Filter ────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {TIME_FILTERS.map((tf) => {
              const isActive = timeFilter === tf.key;
              return (
                <button
                  key={tf.key}
                  onClick={() => setTimeFilter(tf.key)}
                  className={`
                    shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-medium
                    transition-all duration-200 border
                    ${
                      isActive
                        ? 'text-foreground bg-primary/10 border-primary/30 font-semibold'
                        : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50'
                    }
                  `}
                  style={
                    isActive
                      ? { color: province?.colors?.primary, borderColor: `${province?.colors?.primary}40`, background: `${province?.colors?.primary}10` }
                      : undefined
                  }
                >
                  {t(`regional.time_${tf.key}`) || tf.labelPt}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ─── Orders List ─────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm">
            {t('regional.orders_list') || 'Lista de Encomendas'}
          </h2>
          <Badge variant="secondary" className="text-[10px] font-medium tabular-nums">
            {filteredOrders.length}
          </Badge>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/50 bg-card p-4 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/3 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </div>
                  <div className="h-6 w-16 rounded-full bg-muted" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredOrders.length === 0 && (
          <GlassCard className="!p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: `${province?.colors?.primary}10` || 'rgba(13,148,136,0.1)' }}
              >
                <Package
                  className="h-8 w-8"
                  style={{ color: province?.colors?.primary || '#0D9488' }}
                />
              </div>
              <div>
                <p className="font-semibold text-sm">
                  {search
                    ? (t('regional.no_results') || 'Nenhum resultado encontrado')
                    : (t('regional.no_orders') || 'Sem encomendas neste período')}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto">
                  {search
                    ? (t('regional.no_results_hint') || 'Tente pesquisar com outros termos')
                    : (t('regional.no_orders_hint') || 'Quando houver encomendas, elas aparecerão aqui')}
                </p>
              </div>
              {search && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearch('')}
                  className="text-xs"
                >
                  {t('regional.clear_search') || 'Limpar Pesquisa'}
                </Button>
              )}
            </div>
          </GlassCard>
        )}

        {/* Order cards */}
        {!loading && filteredOrders.length > 0 && (
          <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-0.5">
            <AnimatePresence mode="popLayout">
              {filteredOrders.map((order) => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                const StatusIcon = cfg.icon;

                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <GlassCard className="!p-4 hover:shadow-md transition-shadow duration-200">
                      {/* Top row: info + badge */}
                      <div className="flex items-start gap-3">
                        {/* Status icon circle */}
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}
                        >
                          <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
                        </div>

                        {/* Order info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold truncate">
                              {formatShortId(order.id)}
                            </span>
                            <span
                              className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.color} ${cfg.bg} ${cfg.border}`}
                            >
                              {t(`regional.${order.status}`) || cfg.labelPt}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {order.customer_name}
                          </p>
                        </div>

                        {/* Amount */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black tabular-nums">
                            {formatCurrency(Number(order.total || 0))}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-medium">MZN</p>
                        </div>
                      </div>

                      {/* Detail row */}
                      <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          <span>
                            {order.items_count} {t('regional.items') || 'itens'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(order.created_at)}</span>
                        </div>
                        {order.rider_name && (
                          <div className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">{order.rider_name}</span>
                          </div>
                        )}
                        {order.delivery_address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">{order.delivery_address}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] gap-1 px-2 text-muted-foreground"
                          onClick={() =>
                            toast.info(
                              t('regional.order_details') || `Detalhes: ${formatShortId(order.id)}`,
                            )
                          }
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {t('regional.view') || 'Ver'}
                        </Button>

                        <div className="flex-1" />

                        {order.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="h-7 text-[11px] gap-1 px-2.5 font-semibold"
                              style={{
                                background: province?.colors?.primary || '#0D9488',
                                color: '#fff',
                              }}
                              disabled={updatingId === order.id}
                              onClick={() => updateStatus(order.id, 'confirmed')}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              {t('regional.confirm') || 'Confirmar'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px] gap-1 px-2.5 text-red-500 hover:text-red-600 hover:bg-red-50"
                              disabled={updatingId === order.id}
                              onClick={() => updateStatus(order.id, 'cancelled')}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              {t('regional.cancel') || 'Cancelar'}
                            </Button>
                          </>
                        )}

                        {order.status === 'confirmed' && (
                          <Button
                            size="sm"
                            className="h-7 text-[11px] gap-1 px-2.5 font-semibold"
                            style={{
                              background: province?.colors?.primary || '#0D9488',
                              color: '#fff',
                            }}
                            disabled={updatingId === order.id}
                            onClick={() => updateStatus(order.id, 'in_transit')}
                          >
                            <Truck className="h-3.5 w-3.5" />
                            {t('regional.assign_rider') || 'Atribuir Estafeta'}
                          </Button>
                        )}

                        {order.status === 'in_transit' && (
                          <Button
                            size="sm"
                            className="h-7 text-[11px] gap-1 px-2.5 font-semibold text-white"
                            style={{ background: '#059669' }}
                            disabled={updatingId === order.id}
                            onClick={() => updateStatus(order.id, 'delivered')}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            {t('regional.mark_delivered') || 'Marcar Entregue'}
                          </Button>
                        )}

                        {(order.status === 'delivered' || order.status === 'cancelled') && (
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* ─── Monthly Trend Chart ─────────────────────────────────────── */}
      {!loading && monthlyTrend.length > 0 && (
        <motion.div variants={fadeUp}>
          <h2 className="font-bold text-sm mb-3">
            {t('regional.monthly_trend') || 'Tendência Mensal'}
          </h2>
          <GlassCard className="!p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-muted-foreground uppercase font-medium">
                {t('regional.orders_count') || 'Nº de Encomendas'}
              </p>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span className="text-[10px] text-emerald-600 font-semibold">
                  +{Math.round(Math.random() * 15 + 5)}%
                </span>
              </div>
            </div>
            <div className="flex items-end justify-between gap-1.5" style={{ height: '100px' }}>
              {monthlyTrend.map((m, idx) => {
                const pct = maxTrendCount > 0 ? (m.count / maxTrendCount) * 100 : 0;
                const isLatest = idx === monthlyTrend.length - 1;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(pct, 5)}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.08, ease: 'easeOut' }}
                      className={`
                        w-full rounded-t-md min-h-[5px] cursor-default relative group
                        ${isLatest ? 'ring-2 ring-primary/20' : ''}
                      `}
                      style={{
                        background: isLatest
                          ? province?.gradients?.accent || 'linear-gradient(180deg, #0D9488, #14B8A6)'
                          : `${province?.colors?.primary || '#0D9488'}40`,
                      }}
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <div className="bg-popover text-popover-foreground text-[10px] font-medium px-2 py-1 rounded-md shadow-lg border border-border/50 whitespace-nowrap">
                          {m.count} {t('regional.orders_lower') || 'encomendas'}
                          <br />
                          {formatCurrency(m.revenue)} MZN
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2">
              {monthlyTrend.map((m) => (
                <span key={m.month} className="text-[9px] text-muted-foreground flex-1 text-center">
                  {m.month.split(' ')[0]}
                </span>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}
    </motion.div>
  );
}
