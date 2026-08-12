import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProvince } from '@/themes';
import { useManagedProvince } from '@/hooks/useManagedProvince';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Building2, Stethoscope, FlaskConical, Pill, MapPin, CheckCircle, Ban,
  Search, Filter, Eye, Users, Star, TrendingUp, ShieldCheck, Clock, X, Loader2,
} from '@/components/icons/lucide-compat';
import { GlassCard, BentoCard, BentoGrid } from '@/components/ui/design-system';
import NumberFlow from '@number-flow/react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Types ───────────────────────────────────────────────────────────────── */

type FacilityRole = 'clinic' | 'hospital' | 'lab' | 'store_owner' | 'pharmacy';
type VerificationStatus = 'verified' | 'pending' | 'suspended';

interface Facility {
  id: string;
  full_name: string;
  role: FacilityRole;
  province: string;
  address?: string;
  is_verified: boolean;
  avatar_url?: string;
  phone?: string;
  email?: string;
  created_at: string;
  rating?: number;
  professionalCount?: number;
}

interface FacilityStats {
  total: number;
  clinics: number;
  pharmacies: number;
  labs: number;
  hospitals: number;
  verified: number;
  pending: number;
}

/* ─── Animation variants ──────────────────────────────────────────────────── */

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const ROLE_LABELS: Record<FacilityRole, string> = {
  pharmacy: 'Farmácia',
  clinic: 'Clínica',
  hospital: 'Hospital',
  lab: 'Laboratório',
  store_owner: 'Farmácia',
};

const ROLE_ICONS: Record<FacilityRole, React.ElementType> = {
  pharmacy: Pill,
  clinic: Stethoscope,
  hospital: Building2,
  lab: FlaskConical,
  store_owner: Pill,
};

const ROLE_COLORS: Record<FacilityRole, string> = {
  pharmacy: 'bg-emerald-500/10 text-emerald-600',
  clinic: 'bg-teal-500/10 text-teal-600',
  hospital: 'bg-rose-500/10 text-rose-600',
  lab: 'bg-amber-500/10 text-amber-600',
  store_owner: 'bg-emerald-500/10 text-emerald-600',
};

const TYPE_FILTERS: { value: FacilityRole | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'clinic', label: 'Clínicas' },
  { value: 'pharmacy', label: 'Farmácias' },
  { value: 'lab', label: 'Laboratórios' },
  { value: 'hospital', label: 'Hospitais' },
];

const STATUS_FILTERS: { value: VerificationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'verified', label: 'Verificados' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'suspended', label: 'Suspensos' },
];

function roleToFilter(role: FacilityRole): FacilityRole | 'all' {
  if (role === 'store_owner') return 'pharmacy' as any;
  return role;
}

function filterToRole(filter: FacilityRole | 'all'): FacilityRole[] {
  if (filter === 'all') return ['clinic', 'hospital', 'lab', 'store_owner'];
  if (filter === 'pharmacy') return ['store_owner'];
  return [filter];
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function RegionalFacilities() {
  const { province } = useProvince();
const { managedProvinceId, provinceFilter, canManageProvince } = useManagedProvince();
  const { t } = useCountry();

  // State
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [stats, setStats] = useState<FacilityStats>({
    total: 0, clinics: 0, pharmacies: 0, labs: 0, hospitals: 0, verified: 0, pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FacilityRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | 'all'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Province theme colors
  const gradientAccent = province?.gradients?.accent || 'linear-gradient(135deg, #0D9488, #14B8A6)';
  const gradientHero = province?.gradients?.hero || 'linear-gradient(135deg, #0D9488, #06B6D4)';
  const primaryColor = province?.colors?.primary || '#0D9488';
  const culturalSymbol = province?.culturalSymbol || '🏥';
  const provinceName = province?.name || t('regional.province_of') || 'Província';
  const capital = province?.capital || '—';

  /* ─── Data fetching ──────────────────────────────────────────────────────── */

  const loadFacilities = useCallback(async () => {
    if (!province) return;
    setLoading(true);
    const pid = managedProvinceId || province?.id || '';
    const roles = ['clinic', 'hospital', 'lab', 'store_owner'];

    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('id, full_name, role, province, address, is_verified, avatar_url, phone, email, created_at')
      .eq('province', managedProvinceId || pid || '')
      .in('role', roles)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error(t('regional.error_loading') || 'Erro ao carregar instalações');
      setLoading(false);
      return;
    }

    // Fetch professional counts for clinics/hospitals
    const facilityIds = (data || []).map((f: any) => f.id);
    const { data: doctorLinks } = await (supabase as any)
      .from('doctor_profiles')
      .select('clinic_id')
      .in('clinic_id', facilityIds);

    // Count professionals per facility
    const proCountMap: Record<string, number> = {};
    if (doctorLinks) {
      for (const link of doctorLinks) {
        const cid = link.clinic_id;
        proCountMap[cid] = (proCountMap[cid] || 0) + 1;
      }
    }

    // Fetch average ratings per facility (from reviews/feedback)
    const { data: reviews } = await (supabase as any)
      .from('reviews')
      .select('facility_id, rating')
      .in('facility_id', facilityIds);

    const ratingMap: Record<string, number> = {};
    const ratingCountMap: Record<string, number> = {};
    if (reviews) {
      for (const r of reviews) {
        const fid = r.facility_id;
        ratingCountMap[fid] = (ratingCountMap[fid] || 0) + 1;
        ratingMap[fid] = (ratingMap[fid] || 0) + (r.rating || 0);
      }
    }

    const facilitiesWithMeta: Facility[] = (data || []).map((f: any) => ({
      ...f,
      professionalCount: proCountMap[f.id] || 0,
      rating: ratingCountMap[f.id] > 0 ? Math.round((ratingMap[f.id] / ratingCountMap[f.id]) * 10) / 10 : undefined,
    }));

    setFacilities(facilitiesWithMeta);
    computeStats(facilitiesWithMeta);
    setLoading(false);
  }, [province]);

  const computeStats = (list: Facility[]) => {
    setStats({
      total: list.length,
      clinics: list.filter(f => f.role === 'clinic').length,
      pharmacies: list.filter(f => f.role === 'store_owner').length,
      labs: list.filter(f => f.role === 'lab').length,
      hospitals: list.filter(f => f.role === 'hospital').length,
      verified: list.filter(f => f.is_verified).length,
      pending: list.filter(f => !f.is_verified).length,
    });
  };

  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);

  /* ─── Filtering ──────────────────────────────────────────────────────────── */

  const filteredFacilities = useMemo(() => {
    let result = [...facilities];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        f =>
          (f.full_name || '').toLowerCase().includes(q) ||
          (f.address || '').toLowerCase().includes(q) ||
          (ROLE_LABELS[f.role] || '').toLowerCase().includes(q),
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      const roles = filterToRole(typeFilter);
      result = result.filter(f => roles.includes(f.role));
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'verified') {
        result = result.filter(f => f.is_verified);
      } else if (statusFilter === 'pending') {
        result = result.filter(f => !f.is_verified);
      } else if (statusFilter === 'suspended') {
        // Suspended facilities have is_verified = false and some suspended flag
        // For now, filter by not verified (broader match)
        result = result.filter(f => !f.is_verified);
      }
    }

    return result;
  }, [facilities, search, typeFilter, statusFilter]);

  /* ─── Actions ────────────────────────────────────────────────────────────── */

  const handleApprove = async (facility: Facility) => {
    setActionLoading(facility.id);
    const { error } = await (supabase as any)
      .from('profiles')
      .update({ is_verified: true })
      .eq('id', facility.id);

    if (error) {
      toast.error(t('regional.error_approve') || 'Erro ao aprovar instalação');
    } else {
      toast.success(
        t('regional.facility_approved') || 'Instalação aprovada com sucesso',
        { description: facility.full_name },
      );
      setFacilities(prev =>
        prev.map(f => (f.id === facility.id ? { ...f, is_verified: true } : f)),
      );
      computeStats(
        facilities.map(f => (f.id === facility.id ? { ...f, is_verified: true } : f)),
      );
      if (selectedFacility?.id === facility.id) {
        setSelectedFacility({ ...facility, is_verified: true });
      }
    }
    setActionLoading(null);
  };

  const handleReject = async (facility: Facility) => {
    setActionLoading(facility.id);
    const { error } = await (supabase as any)
      .from('profiles')
      .update({ is_verified: false })
      .eq('id', facility.id);

    if (error) {
      toast.error(t('regional.error_reject') || 'Erro ao rejeitar instalação');
    } else {
      toast.success(
        t('regional.facility_rejected') || 'Instalação rejeitada',
        { description: facility.full_name },
      );
      setFacilities(prev =>
        prev.map(f => (f.id === facility.id ? { ...f, is_verified: false } : f)),
      );
      computeStats(
        facilities.map(f => (f.id === facility.id ? { ...f, is_verified: false } : f)),
      );
      if (selectedFacility?.id === facility.id) {
        setSelectedFacility({ ...facility, is_verified: false });
      }
    }
    setActionLoading(null);
  };

  /* ─── Stat cards config ──────────────────────────────────────────────────── */

  const statCards = [
    { label: t('regional.total_facilities') || 'Total de Instalações', value: stats.total, icon: Building2, color: 'text-primary' },
    { label: t('regional.clinics') || 'Clínicas', value: stats.clinics, icon: Stethoscope, color: 'text-teal-500' },
    { label: t('regional.pharmacies') || 'Farmácias', value: stats.pharmacies, icon: Pill, color: 'text-emerald-500' },
    { label: t('regional.labs') || 'Laboratórios', value: stats.labs, icon: FlaskConical, color: 'text-amber-500' },
    { label: t('regional.verified') || 'Verificados', value: stats.verified, icon: ShieldCheck, color: 'text-green-600' },
    { label: t('regional.pending') || 'Pendentes', value: stats.pending, icon: Clock, color: 'text-orange-500' },
  ];

  /* ─── Render ─────────────────────────────────────────────────────────────── */

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* ── Province Header ─────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{ background: gradientHero }}
        >
          {/* Decorative pattern overlay */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="w-full h-full"
              style={{
                backgroundImage:
                  province?.pattern === 'capulana'
                    ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.15) 10px, rgba(255,255,255,0.15) 20px)'
                    : province?.pattern === 'waves'
                    ? 'repeating-linear-gradient(0deg, transparent, transparent 15px, rgba(255,255,255,0.1) 15px, rgba(255,255,255,0.1) 16px)'
                    : province?.pattern === 'dots'
                    ? 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)'
                    : 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
                backgroundSize: province?.pattern === 'dots' ? '12px 12px' : 'auto',
              }}
            />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{culturalSymbol}</span>
              <div>
                <h1 className="text-xl font-black text-white">
                  {t('regional.facilities_title') || 'Instalações de Saúde'}
                </h1>
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin className="h-3.5 w-3.5 text-white/80" />
                  <p className="text-sm text-white/80">
                    {t('regional.province_of') || 'Província de'} {provinceName} — {capital}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-white/60 mt-2">
              {t('regional.facilities_subtitle') || 'Gerir todas as clínicas, farmácias, laboratórios e hospitais da sua província'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Cards ──────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <BentoGrid className="grid-cols-3 sm:grid-cols-3 md:grid-cols-6">
          {statCards.map((stat) => (
            <BentoCard key={stat.label} size="sm" className="text-center">
              <stat.icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
              <p className="text-lg font-black tabular-nums">
                <NumberFlow value={stat.value} />
              </p>
              <p className="text-[9px] text-muted-foreground uppercase leading-tight">
                {stat.label}
              </p>
            </BentoCard>
          ))}
        </BentoGrid>
      </motion.div>

      {/* ── Search & Filters ──────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('regional.search_facilities') || 'Pesquisar por nome, endereço ou tipo...'}
            className="pl-9 pr-10 h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => setSearch('')}
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Filter toggle + active badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3.5 w-3.5" />
            {t('regional.filters') || 'Filtros'}
          </Button>

          {typeFilter !== 'all' && (
            <Badge
              variant="secondary"
              className="cursor-pointer gap-1"
              onClick={() => setTypeFilter('all')}
            >
              {TYPE_FILTERS.find(f => f.value === typeFilter)?.label}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {statusFilter !== 'all' && (
            <Badge
              variant="secondary"
              className="cursor-pointer gap-1"
              onClick={() => setStatusFilter('all')}
            >
              {STATUS_FILTERS.find(f => f.value === statusFilter)?.label}
              <X className="h-3 w-3" />
            </Badge>
          )}

          <span className="text-xs text-muted-foreground ml-auto">
            {filteredFacilities.length} {t('regional.of') || 'de'} {facilities.length} {t('regional.facilities_lower') || 'instalações'}
          </span>
        </div>

        {/* Expandable filter panels */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <GlassCard className="!p-4 space-y-4">
                {/* Type filters */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    {t('regional.type') || 'Tipo'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TYPE_FILTERS.map((tf) => (
                      <Button
                        key={tf.value}
                        variant={typeFilter === tf.value ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setTypeFilter(tf.value)}
                        style={
                          typeFilter === tf.value
                            ? { background: primaryColor, borderColor: primaryColor, color: '#fff' }
                            : undefined
                        }
                      >
                        {tf.value !== 'all' && (
                          <span className="mr-1">
                            {tf.value === 'clinic' && <Stethoscope className="inline h-3 w-3" />}
                            {tf.value === 'pharmacy' && <Pill className="inline h-3 w-3" />}
                            {tf.value === 'lab' && <FlaskConical className="inline h-3 w-3" />}
                            {tf.value === 'hospital' && <Building2 className="inline h-3 w-3" />}
                          </span>
                        )}
                        {tf.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Status filters */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    {t('regional.status') || 'Estado'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_FILTERS.map((sf) => (
                      <Button
                        key={sf.value}
                        variant={statusFilter === sf.value ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setStatusFilter(sf.value)}
                        style={
                          statusFilter === sf.value
                            ? { background: primaryColor, borderColor: primaryColor, color: '#fff' }
                            : undefined
                        }
                      >
                        {sf.value === 'verified' && <CheckCircle className="inline h-3 w-3 mr-1" />}
                        {sf.value === 'pending' && <Clock className="inline h-3 w-3 mr-1" />}
                        {sf.value === 'suspended' && <Ban className="inline h-3 w-3 mr-1" />}
                        {sf.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Loading State ─────────────────────────────────────────────────── */}
      {loading && (
        <motion.div variants={fadeUp} className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">
            {t('regional.loading_facilities') || 'A carregar instalações...'}
          </p>
        </motion.div>
      )}

      {/* ── Empty State ───────────────────────────────────────────────────── */}
      {!loading && filteredFacilities.length === 0 && (
        <motion.div
          variants={fadeUp}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
            style={{ background: `${primaryColor}15` }}
          >
            <Building2 className="h-8 w-8" style={{ color: primaryColor }} />
          </div>
          <h3 className="font-bold text-base mb-1">
            {search || typeFilter !== 'all' || statusFilter !== 'all'
              ? (t('regional.no_matching') || 'Nenhuma instalação encontrada')
              : (t('regional.no_facilities') || 'Sem instalações nesta província')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {search || typeFilter !== 'all' || statusFilter !== 'all'
              ? (t('regional.try_different') || 'Tente ajustar os filtros ou pesquisar outro termo')
              : (t('regional.no_facilities_desc') || 'As instalações de saúde aparecerão aqui assim que se registrem')}
          </p>
          {(search || typeFilter !== 'all' || statusFilter !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearch('');
                setTypeFilter('all');
                setStatusFilter('all');
              }}
            >
              {t('regional.clear_filters') || 'Limpar Filtros'}
            </Button>
          )}
        </motion.div>
      )}

      {/* ── Facility List ──────────────────────────────────────────────────── */}
      {!loading && filteredFacilities.length > 0 && (
        <motion.div variants={fadeUp} className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredFacilities.map((facility, idx) => {
              const RoleIcon = ROLE_ICONS[facility.role];
              const roleColor = ROLE_COLORS[facility.role];
              const isPending = !facility.is_verified;

              return (
                <motion.div
                  key={facility.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24, delay: idx * 0.03 }}
                >
                  <GlassCard className="!p-0 overflow-hidden">
                    {/* Province gradient color bar */}
                    <div className="h-1 w-full" style={{ background: gradientAccent }} />

                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Type icon */}
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${roleColor}`}
                        >
                          <RoleIcon className="h-5 w-5" />
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold truncate">
                              {facility.full_name || (t('regional.unnamed') || 'Sem nome')}
                            </h3>
                            {/* Verification badge */}
                            {facility.is_verified ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0">
                                <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                                {t('regional.verified') || 'Verificado'}
                              </Badge>
                            ) : (
                              <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] px-1.5 py-0">
                                <Clock className="h-2.5 w-2.5 mr-0.5" />
                                {t('regional.pending') || 'Pendente'}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">
                              {ROLE_LABELS[facility.role]}
                            </Badge>
                            {facility.rating && facility.rating > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-semibold">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {facility.rating}
                              </span>
                            )}
                          </div>

                          {facility.address && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                              <p className="text-xs text-muted-foreground truncate">
                                {facility.address}
                              </p>
                            </div>
                          )}

                          {/* Meta row: professionals count */}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {facility.professionalCount || 0} {t('regional.professionals') || 'profissionais'}
                            </span>
                            {facility.created_at && (
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(facility.created_at).toLocaleDateString('pt-PT')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setSelectedFacility(facility)}
                          >
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </Button>

                          {isPending && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-600 hover:bg-green-50"
                                disabled={actionLoading === facility.id}
                                onClick={() => handleApprove(facility)}
                              >
                                {actionLoading === facility.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-500 hover:bg-red-50"
                                disabled={actionLoading === facility.id}
                                onClick={() => handleReject(facility)}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Summary footer ──────────────────────────────────────────────── */}
      {!loading && facilities.length > 0 && (
        <motion.div variants={fadeUp}>
          <GlassCard className="!p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${primaryColor}12` }}
              >
                <TrendingUp className="h-4 w-4" style={{ color: primaryColor }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {t('regional.province_network') || 'Rede Provincial de Saúde'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.verified} {t('regional.verified_lower') || 'verificadas'} · {stats.pending} {t('regional.pending_lower') || 'pendentes'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black tabular-nums" style={{ color: primaryColor }}>
                  <NumberFlow value={stats.verified} />
                  <span className="text-xs font-normal text-muted-foreground">/{stats.total}</span>
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">
                  {t('regional.verification_rate') || 'Taxa de Verificação'}
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ── Detail Sheet / Dialog ──────────────────────────────────────── */}
      <AnimatePresence>
        {selectedFacility && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setSelectedFacility(null)}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-background shadow-2xl"
              style={{ borderTop: `3px solid ${primaryColor}` }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
              </div>

              <div className="px-5 pb-8">
                {/* Close */}
                <div className="flex justify-end -mt-1 mb-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelectedFacility(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${ROLE_COLORS[selectedFacility.role]}`}
                  >
                    {(() => {
                      const Icon = ROLE_ICONS[selectedFacility.role];
                      return <Icon className="h-6 w-6" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-black truncate">
                      {selectedFacility.full_name}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">
                        {ROLE_LABELS[selectedFacility.role]}
                      </Badge>
                      {selectedFacility.is_verified ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {t('regional.verified') || 'Verificado'}
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                          <Clock className="h-3 w-3 mr-1" />
                          {t('regional.pending') || 'Pendente'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase mb-0.5">
                      {t('regional.type') || 'Tipo'}
                    </p>
                    <p className="text-sm font-semibold">{ROLE_LABELS[selectedFacility.role]}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase mb-0.5">
                      {t('regional.professionals') || 'Profissionais'}
                    </p>
                    <p className="text-sm font-semibold tabular-nums">
                      <NumberFlow value={selectedFacility.professionalCount || 0} />
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase mb-0.5">
                      {t('regional.rating') || 'Avaliação'}
                    </p>
                    <p className="text-sm font-semibold">
                      {selectedFacility.rating ? (
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {selectedFacility.rating}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground uppercase mb-0.5">
                      {t('regional.since') || 'Desde'}
                    </p>
                    <p className="text-sm font-semibold">
                      {selectedFacility.created_at
                        ? new Date(selectedFacility.created_at).toLocaleDateString('pt-PT', {
                            year: 'numeric', month: 'short',
                          })
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* Contact details */}
                <div className="space-y-2.5 mb-6">
                  {selectedFacility.address && (
                    <div className="flex items-start gap-2.5">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-sm">{selectedFacility.address}</p>
                    </div>
                  )}
                  {selectedFacility.phone && (
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm">📞</span>
                      <p className="text-sm">{selectedFacility.phone}</p>
                    </div>
                  )}
                  {selectedFacility.email && (
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm">✉️</span>
                      <p className="text-sm">{selectedFacility.email}</p>
                    </div>
                  )}
                </div>

                {/* Action buttons for pending facilities */}
                {!selectedFacility.is_verified && (
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 gap-2"
                      disabled={actionLoading === selectedFacility.id}
                      onClick={() => handleApprove(selectedFacility)}
                      style={{ background: '#16a34a', borderColor: '#16a34a' }}
                    >
                      {actionLoading === selectedFacility.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      {t('regional.approve') || 'Aprovar'}
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 gap-2"
                      disabled={actionLoading === selectedFacility.id}
                      onClick={() => handleReject(selectedFacility)}
                    >
                      <Ban className="h-4 w-4" />
                      {t('regional.reject') || 'Rejeitar'}
                    </Button>
                  </div>
                )}

                {selectedFacility.is_verified && (
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      disabled={actionLoading === selectedFacility.id}
                      onClick={() => handleReject(selectedFacility)}
                    >
                      {actionLoading === selectedFacility.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Ban className="h-4 w-4" />
                      )}
                      {t('regional.revoke') || 'Revogar Verificação'}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}