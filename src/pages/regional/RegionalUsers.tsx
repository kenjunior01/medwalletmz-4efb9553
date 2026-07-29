import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProvince } from '@/themes';
import { useManagedProvince } from '@/hooks/useManagedProvince';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  User,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Shield,
  Ban,
  CheckCircle,
  Eye,
  TrendingUp,
  Clock,
  Star,
  Stethoscope,
  Truck,
  ShoppingBag,
  Activity,
  ChevronRight,
} from '@/components/icons/lucide-compat';
import { GlassCard, BentoCard, BentoGrid } from '@/components/ui/design-system';
import NumberFlow from '@number-flow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

/* ──────────────────────── Animation variants ──────────────────────── */
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

/* ──────────────────────── Types ───────────────────────────────────── */
type UserRole = 'patient' | 'doctor' | 'rider' | 'store_owner' | 'user';

type UserStatus = 'active' | 'suspended' | 'unverified';

type UserTypeFilter = 'all' | 'patient' | 'doctor' | 'rider' | 'store_owner';

type StatusFilter = 'all' | 'active' | 'suspended' | 'unverified';

interface ProvincialUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url?: string;
  role: UserRole;
  status: UserStatus;
  is_active: boolean;
  is_verified: boolean;
  province: string;
  created_at: string;
  last_sign_in_at?: string;
  last_active?: string;
  rating?: number;
}

interface Stats {
  totalUsers: number;
  patients: number;
  professionals: number;
  activeToday: number;
  newThisMonth: number;
  suspended: number;
}

const ITEMS_PER_PAGE = 12;

/* ──────────────────────── Helpers ─────────────────────────────────── */
const ROLE_LABELS: Record<UserTypeFilter, string> = {
  all: 'Todos',
  patient: 'Pacientes',
  doctor: 'Médicos',
  rider: 'Estafetas',
  store_owner: 'Donos de Loja',
};

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'Todos',
  active: 'Activo',
  suspended: 'Suspenso',
  unverified: 'Não Verificado',
};

function roleToIcon(role: UserRole) {
  switch (role) {
    case 'doctor':
      return <Stethoscope className="h-3.5 w-3.5" />;
    case 'rider':
      return <Truck className="h-3.5 w-3.5" />;
    case 'store_owner':
      return <ShoppingBag className="h-3.5 w-3.5" />;
    default:
      return <User className="h-3.5 w-3.5" />;
  }
}

function roleToLabel(role: UserRole): string {
  switch (role) {
    case 'doctor':
      return 'Médico';
    case 'rider':
      return 'Estafeta';
    case 'store_owner':
      return 'Lojista';
    case 'patient':
      return 'Paciente';
    default:
      return 'Utilizador';
  }
}

function getInitials(name: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatRelative(iso: string) {
  if (!iso) return 'Nunca';
  const now = Date.now();
  const diff = now - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Agora mesmo';
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d atrás`;
  return formatDate(iso);
}

function StatusBadge({ status }: { status: UserStatus }) {
  if (status === 'active')
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
        <CheckCircle className="h-3 w-3 mr-1" />
        Activo
      </Badge>
    );
  if (status === 'suspended')
    return (
      <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">
        <Ban className="h-3 w-3 mr-1" />
        Suspenso
      </Badge>
    );
  return (
    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
      <Clock className="h-3 w-3 mr-1" />
      Não Verificado
    </Badge>
  );
}

/* ──────────────────────── Skeleton loaders ───────────────────────── */
function SkeletonStatCards() {
  return (
    <BentoGrid>
      {Array.from({ length: 6 }).map((_, i) => (
        <BentoCard key={i} size="sm" className="animate-pulse">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-7 w-14 rounded bg-muted" />
            </div>
            <div className="h-9 w-9 rounded-xl bg-muted" />
          </div>
        </BentoCard>
      ))}
    </BentoGrid>
  );
}

function SkeletonUserCards() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
      ))}
    </div>
  );
}

/* ════════════════════════ COMPONENT ══════════════════════════════════ */
export default function RegionalUsers() {
  const { province } = useProvince();
const { managedProvinceId, provinceFilter, canManageProvince } = useManagedProvince();
  const { t } = useCountry();

  /* ──── State ──── */
  const [users, setUsers] = useState<ProvincialUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<UserTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    patients: 0,
    professionals: 0,
    activeToday: 0,
    newThisMonth: 0,
    suspended: 0,
  });

  /* ──── Province colours ──── */
  const provColor = province?.colors?.primary || '#00838F';
  const provGradient = province?.gradients?.hero || 'linear-gradient(135deg, #00838F, #1A237E)';

  /* ──── Data fetching ──── */
  const loadUsers = useCallback(async () => {
    if (!province) return;
    setLoading(true);

    try {
      const pid = managedProvinceId || province?.id || '';

      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*, user_roles(role)')
        .eq('province', managedProvinceId || pid || '')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: ProvincialUser[] = (data || []).map((p: any) => {
        const roleRaw = p.user_roles?.[0]?.role || p.primary_role || 'user';
        return {
          id: p.id,
          full_name: p.full_name || p.email?.split('@')[0] || 'Sem nome',
          email: p.email || '',
          phone: p.phone || '',
          avatar_url: p.avatar_url,
          role: roleRaw as UserRole,
          status: p.is_active === false
            ? 'suspended'
            : p.is_verified === false
              ? 'unverified'
              : 'active',
          is_active: p.is_active ?? true,
          is_verified: p.is_verified ?? false,
          province: p.province || pid,
          created_at: p.created_at,
          last_sign_in_at: p.last_sign_in_at,
          last_active: p.last_active_at || p.last_sign_in_at,
          rating: p.rating,
        };
      });

      setUsers(mapped);
    } catch (err) {
      console.error('Failed to load provincial users:', err);
      toast.error(t('regional.users_load_error') || 'Erro ao carregar utilizadores da província');
    } finally {
      setLoading(false);
    }
  }, [province, t]);

  const loadStats = useCallback(async () => {
    if (!province) return;
    const pid = managedProvinceId || province?.id || '';

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    try {
      const [totalRes, patientsRes, prosRes, activeTodayRes, newMonthRes, suspendedRes] = await Promise.all([
        (supabase as any).from('profiles').select('id', { count: 'exact', head: true }).eq('province', managedProvinceId || pid || ''),
        (supabase as any).from('profiles').select('id', { count: 'exact', head: true }).eq('province', managedProvinceId || pid || '').in('primary_role', ['patient', 'user']),
        (supabase as any).from('profiles').select('id', { count: 'exact', head: true }).eq('province', managedProvinceId || pid || '').in('primary_role', ['doctor', 'rider', 'store_owner']),
        (supabase as any).from('profiles').select('id', { count: 'exact', head: true }).eq('province', managedProvinceId || pid || '').eq('is_active', true).gte('last_sign_in_at', startOfDay),
        (supabase as any).from('profiles').select('id', { count: 'exact', head: true }).eq('province', managedProvinceId || pid || '').gte('created_at', startOfMonth),
        (supabase as any).from('profiles').select('id', { count: 'exact', head: true }).eq('province', managedProvinceId || pid || '').eq('is_active', false),
      ]);

      setStats({
        totalUsers: totalRes.count ?? 0,
        patients: patientsRes.count ?? 0,
        professionals: prosRes.count ?? 0,
        activeToday: activeTodayRes.count ?? 0,
        newThisMonth: newMonthRes.count ?? 0,
        suspended: suspendedRes.count ?? 0,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, [province]);

  useEffect(() => {
    loadUsers();
    loadStats();
  }, [loadUsers, loadStats]);

  /* Reset visible count when filters change */
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchQuery, typeFilter, statusFilter]);

  /* ──── Derived / filtered data ──── */
  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.full_name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.phone.includes(q)
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter((u) => u.role === typeFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((u) => u.status === statusFilter);
    }

    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return result;
  }, [users, searchQuery, typeFilter, statusFilter]);

  const visibleUsers = useMemo(
    () => filteredUsers.slice(0, visibleCount),
    [filteredUsers, visibleCount]
  );

  const hasMore = visibleCount < filteredUsers.length;

  /* ──── Actions ──── */
  const handleToggleSuspend = async (userId: string, currentlyActive: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ is_active: !currentlyActive } as any)
        .eq('id', userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, is_active: !currentlyActive, status: !currentlyActive ? 'active' : 'suspended' }
            : u
        )
      );

      toast.success(
        currentlyActive
          ? (t('regional.user_suspended') || 'Utilizador suspenso com sucesso')
          : (t('regional.user_activated') || 'Utilizador activado com sucesso')
      );
      setConfirmAction(null);
      loadStats();
    } catch {
      toast.error(t('regional.action_error') || 'Erro ao executar acção');
    }
  };

  const handleVerify = async (userId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ is_verified: true } as any)
        .eq('id', userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_verified: true, status: 'active' as UserStatus } : u
        )
      );

      toast.success(t('regional.user_verified') || 'Utilizador verificado com sucesso');
      loadStats();
    } catch {
      toast.error(t('regional.action_error') || 'Erro ao executar acção');
    }
  };

  /* ═══════════════════════ RENDER ═══════════════════════════════════ */
  if (!province) {
    return (
      <GlassCard className="!p-10 text-center">
        <MapPin className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          {t('regional.select_province') || 'Seleccione uma província para gerir utilizadores.'}
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══ 1. Province Header ═══ */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger}
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: provGradient }}
      >
        {/* Cultural symbol watermark */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <span className="text-[120px] leading-none absolute -top-4 -right-4 select-none">
            {province.culturalSymbol}
          </span>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4" />
              <span className="text-xs font-medium text-white/80">
                {t('regional.province') || 'Província'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {t('regional.users_title') || 'Gestão de Utilizadores'}
            </h1>
            <p className="text-sm text-white/80 mt-1">
              {province.name} — {province.capital}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-white/80">
            <TrendingUp className="h-4 w-4" />
            <span className="font-medium">{stats.totalUsers}</span>
            <span>{t('regional.total_users') || 'utilizadores registados'}</span>
          </div>
        </div>
      </motion.div>

      {/* ═══ 2. Stats ═══ */}
      {loading ? (
        <SkeletonStatCards />
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show">
          <BentoGrid>
            {(
              [
                { label: t('regional.total_users') || 'Total Utilizadores', value: stats.totalUsers, icon: Users, color: provColor },
                { label: t('regional.patients') || 'Pacientes', value: stats.patients, icon: User, color: '#059669' },
                { label: t('regional.professionals') || 'Profissionais', value: stats.professionals, icon: Stethoscope, color: '#7C3AED' },
                { label: t('regional.active_today') || 'Activos Hoje', value: stats.activeToday, icon: Activity, color: '#0891B2' },
                { label: t('regional.new_month') || 'Novos este Mês', value: stats.newThisMonth, icon: ChevronRight, color: '#D97706' },
                { label: t('regional.suspended') || 'Suspensos', value: stats.suspended, icon: Ban, color: '#DC2626' },
              ] as const
            ).map((stat) => (
              <BentoCard key={stat.label} size="sm" className="relative overflow-hidden">
                <motion.div variants={fadeUp} className="flex items-start justify-between h-full">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      {stat.label}
                    </p>
                    <div className="text-2xl font-black">
                      <NumberFlow value={stat.value} />
                    </div>
                  </div>
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${stat.color}15` }}
                  >
                    <stat.icon className="h-4.5 w-4.5" style={{ color: stat.color }} />
                  </div>
                </motion.div>
              </BentoCard>
            ))}
          </BentoGrid>
        </motion.div>
      )}

      {/* ═══ 3. Search ═══ */}
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('regional.search_placeholder') || 'Pesquisar por nome, email ou telefone...'}
            className="pl-9 pr-4 h-11 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </motion.div>

      {/* ═══ 4 & 5. User Type + Status Filter pills ═══ */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-3">
        {/* User Type filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {(Object.keys(ROLE_LABELS) as UserTypeFilter[]).map((key) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                typeFilter === key
                  ? 'text-white shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
              style={typeFilter === key ? { backgroundColor: provColor } : undefined}
            >
              {ROLE_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((key) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === key
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {STATUS_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Results summary & clear */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {filteredUsers.length} {t('regional.users_found') || 'utilizadores encontrados'}
            {typeFilter !== 'all' && ` · ${ROLE_LABELS[typeFilter]}`}
            {statusFilter !== 'all' && ` · ${STATUS_LABELS[statusFilter]}`}
          </p>
          {(searchQuery || typeFilter !== 'all' || statusFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setStatusFilter('all');
              }}
            >
              {t('regional.clear_filters') || 'Limpar Filtros'}
            </Button>
          )}
        </div>
      </motion.div>

      {/* ═══ 6. User Cards ═══ */}
      {loading ? (
        <SkeletonUserCards />
      ) : filteredUsers.length === 0 ? (
        /* ─── 8. Empty State ─── */
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <GlassCard className="!p-12 text-center">
            <div
              className="mx-auto mb-4 h-16 w-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${provColor}10` }}
            >
              <Users className="h-8 w-8" style={{ color: provColor, opacity: 0.5 }} />
            </div>
            <h3 className="text-base font-bold mb-1">
              {t('regional.no_users_found') || 'Nenhum Utilizador Encontrado'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {t('regional.no_users_desc') ||
                'Não foram encontrados utilizadores com os filtros seleccionados. Tente ajustar os seus critérios de pesquisa.'}
            </p>
            <Button
              variant="outline"
              className="mt-4 rounded-xl"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setStatusFilter('all');
              }}
            >
              {t('regional.clear_filters') || 'Limpar Filtros'}
            </Button>
          </GlassCard>
        </motion.div>
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          <AnimatePresence mode="popLayout">
            {visibleUsers.map((user) => {
              const isConfirming = confirmAction === user.id;

              return (
                <motion.div
                  key={user.id}
                  variants={fadeUp}
                  layout
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <GlassCard className="!p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      {/* ── Avatar (initials + province colour) ── */}
                      <div
                        className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-sm"
                        style={{ backgroundColor: provColor }}
                      >
                        {getInitials(user.full_name)}
                      </div>

                      {/* ── User Info ── */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Name, role badge, status */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate max-w-[200px]">
                            {user.full_name}
                          </p>
                          <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                            {roleToIcon(user.role)}
                            {roleToLabel(user.role)}
                          </Badge>
                          <StatusBadge status={user.status} />
                        </div>

                        {/* Email & Phone */}
                        <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                          {user.email && (
                            <span className="flex items-center gap-1 truncate max-w-[180px]">
                              <Mail className="h-3 w-3 shrink-0" />
                              {user.email}
                            </span>
                          )}
                          {user.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3 shrink-0" />
                              {user.phone}
                            </span>
                          )}
                        </div>

                        {/* Join date, last active, rating */}
                        <div className="flex items-center gap-4 flex-wrap text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {t('regional.joined') || 'Registou'}: {formatDate(user.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {formatRelative(user.last_active || user.last_sign_in_at || '')}
                          </span>
                          {user.rating != null && user.rating > 0 && (
                            <span className="flex items-center gap-1 text-amber-500">
                              <Star className="h-3 w-3 fill-amber-500" />
                              {user.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ── 7. Actions: View, Verify, Suspend/Activate ── */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* View Profile */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            toast.info(t('regional.viewing_profile') || 'A abrir perfil do utilizador...')
                          }
                          title={t('regional.view_profile') || 'Ver Perfil'}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {/* Verify (only unverified, non-suspended) */}
                        {!user.is_verified && user.status !== 'suspended' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-emerald-500 hover:bg-emerald-500/10"
                            onClick={() => handleVerify(user.id)}
                            title={t('regional.verify') || 'Verificar'}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Suspend / Activate with confirmation */}
                        {user.status !== 'unverified' && (
                          <AnimatePresence>
                            {isConfirming ? (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex items-center gap-1"
                              >
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-[10px] font-semibold rounded-lg"
                                  style={{
                                    backgroundColor: user.is_active ? '#FEE2E2' : '#D1FAE5',
                                    color: user.is_active ? '#DC2626' : '#059669',
                                  }}
                                  onClick={() => handleToggleSuspend(user.id, user.is_active)}
                                >
                                  {t('regional.confirm') || 'Confirmar'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-[10px] text-muted-foreground"
                                  onClick={() => setConfirmAction(null)}
                                >
                                  ✕
                                </Button>
                              </motion.div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`h-8 w-8 p-0 ${
                                  user.is_active
                                    ? 'text-red-500 hover:bg-red-500/10'
                                    : 'text-emerald-500 hover:bg-emerald-500/10'
                                }`}
                                onClick={() => setConfirmAction(user.id)}
                                title={
                                  user.is_active
                                    ? (t('regional.suspend') || 'Suspender')
                                    : (t('regional.activate') || 'Activar')
                                }
                              >
                                {user.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                              </Button>
                            )}
                          </AnimatePresence>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Load More */}
          {hasMore && (
            <motion.div variants={fadeUp} className="flex justify-center pt-2">
              <Button
                variant="outline"
                className="rounded-xl gap-2"
                onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
              >
                <ChevronRight className="h-4 w-4" />
                {t('regional.load_more') || 'Carregar Mais'} ({filteredUsers.length - visibleCount}{' '}
                {t('regional.remaining') || 'restantes'})
              </Button>
            </motion.div>
          )}

          {/* Bottom summary */}
          <div className="text-center py-2">
            <p className="text-[11px] text-muted-foreground">
              {t('regional.showing') || 'A mostrar'} {visibleUsers.length} {t('regional.of') || 'de'}{' '}
              {filteredUsers.length} {t('regional.users') || 'utilizadores'}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
