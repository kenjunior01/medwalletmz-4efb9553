import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProvince } from '@/themes';
import { useManagedProvince } from '@/hooks/useManagedProvince';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users, Stethoscope, ShoppingBag, Activity, Search,
  CheckCircle, Ban, Filter,
} from "@/components/icons/lucide-compat";
import {
  GlassCard, BentoCard, BentoGrid,
} from '@/components/ui/design-system';
import { motion } from 'framer-motion';

type ProfessionalType = 'doctor' | 'rider' | 'health_worker';
type VerificationStatus = 'all' | 'verified' | 'pending';

interface Professional {
  id: string;
  type: ProfessionalType;
  name: string;
  is_verified: boolean;
  created_at: string;
  specialty?: string;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export default function RegionalTeam() {
  const { province } = useProvince();
const { managedProvinceId, provinceFilter, canManageProvince } = useManagedProvince();
  const { t } = useCountry();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<ProfessionalType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<VerificationStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProfessionals();
  }, [province]);

  const loadProfessionals = async () => {
    if (!province) return;
    setLoading(true);
    const pid = managedProvinceId || province?.id || '';

    const [doctorsRes, ridersRes, workersRes] = await Promise.all([
      (supabase as any)
        .from('doctor_profiles')
        .select('id, full_name, is_verified, created_at, specialty')
        .eq('province', managedProvinceId || pid || '')
        .order('created_at', { ascending: false })
        .limit(50),
      (supabase as any)
        .from('profiles')
        .select('id, full_name, is_verified, created_at')
        .eq('province', managedProvinceId || pid || '')
        .eq('role', 'driver')
        .order('created_at', { ascending: false })
        .limit(50),
      (supabase as any)
        .from('profiles')
        .select('id, full_name, is_verified, created_at')
        .eq('province', managedProvinceId || pid || '')
        .eq('role', 'health_worker')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const items: Professional[] = [
      ...(doctorsRes.data || []).map((d: any) => ({
        id: d.id, type: 'doctor' as const, name: d.full_name,
        is_verified: d.is_verified, created_at: d.created_at, specialty: d.specialty,
      })),
      ...(ridersRes.data || []).map((r: any) => ({
        id: r.id, type: 'rider' as const, name: r.full_name,
        is_verified: r.is_verified, created_at: r.created_at,
      })),
      ...(workersRes.data || []).map((w: any) => ({
        id: w.id, type: 'health_worker' as const, name: w.full_name,
        is_verified: w.is_verified, created_at: w.created_at,
      })),
    ];
    setProfessionals(items);
    setLoading(false);
  };

  const handleApprove = async (item: Professional, approve: boolean) => {
    const table = item.type === 'doctor' ? 'doctor_profiles' : 'profiles';
    const { error } = await (supabase as any)
      .from(table)
      .update({ is_verified: approve })
      .eq('id', item.id);

    if (!error) {
      setProfessionals(prev =>
        prev.map(p => p.id === item.id ? { ...p, is_verified: approve } : p)
      );
    }
  };

  const filteredProfessionals = useMemo(() => {
    return professionals.filter(p => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      if (statusFilter === 'verified' && !p.is_verified) return false;
      if (statusFilter === 'pending' && p.is_verified) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [professionals, typeFilter, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = professionals.length;
    const doctors = professionals.filter(p => p.type === 'doctor').length;
    const riders = professionals.filter(p => p.type === 'rider').length;
    const workers = professionals.filter(p => p.type === 'health_worker').length;
    const pending = professionals.filter(p => !p.is_verified).length;
    const verified = total - pending;
    return { total, doctors, riders, workers, pending, verified };
  }, [professionals]);

  const typeFilters: { key: ProfessionalType | 'all'; label: string; icon: typeof Users }[] = [
    { key: 'all', label: t('regional.filter_all') || 'Todos', icon: Users },
    { key: 'doctor', label: t('regional.filter_doctors') || 'Médicos', icon: Stethoscope },
    { key: 'rider', label: t('regional.filter_riders') || 'Riders', icon: ShoppingBag },
    { key: 'health_worker', label: t('regional.filter_workers') || 'Profissionais', icon: Activity },
  ];

  const statusFilters: { key: VerificationStatus; label: string }[] = [
    { key: 'all', label: t('regional.filter_all') || 'Todos' },
    { key: 'verified', label: t('regional.filter_verified') || 'Verificados' },
    { key: 'pending', label: t('regional.filter_pending') || 'Pendentes' },
  ];

  const getTypeColor = (type: ProfessionalType) => {
    switch (type) {
      case 'doctor': return 'bg-teal-500/10 text-teal-500';
      case 'rider': return 'bg-blue-500/10 text-blue-500';
      case 'health_worker': return 'bg-purple-500/10 text-purple-500';
    }
  };

  const getTypeIcon = (type: ProfessionalType) => {
    switch (type) {
      case 'doctor': return Stethoscope;
      case 'rider': return ShoppingBag;
      case 'health_worker': return Activity;
    }
  };

  const getTypeLabel = (type: ProfessionalType) => {
    switch (type) {
      case 'doctor': return 'Médico';
      case 'rider': return 'Rider';
      case 'health_worker': return 'Profissional';
    }
  };

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-xl font-black">{t('regional.team_title') || 'Gestão de Equipa Provincial'}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('regional.team_subtitle') || 'Profissionais de saúde e riders da província'}
          {province ? ` — ${province.name}` : ''}
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp}>
        <BentoGrid className="grid-cols-3 sm:grid-cols-6">
          <BentoCard size="sm" className="text-center">
            <p className="text-lg font-black tabular-nums">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Total</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <Stethoscope className="h-4 w-4 mx-auto text-teal-500 mb-0.5" />
            <p className="text-lg font-black tabular-nums">{stats.doctors}</p>
            <p className="text-[10px] text-muted-foreground uppercase">{t('regional.filter_doctors') || 'Médicos'}</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <ShoppingBag className="h-4 w-4 mx-auto text-blue-500 mb-0.5" />
            <p className="text-lg font-black tabular-nums">{stats.riders}</p>
            <p className="text-[10px] text-muted-foreground uppercase">{t('regional.filter_riders') || 'Riders'}</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <Activity className="h-4 w-4 mx-auto text-purple-500 mb-0.5" />
            <p className="text-lg font-black tabular-nums">{stats.workers}</p>
            <p className="text-[10px] text-muted-foreground uppercase">{t('regional.filter_workers') || 'Profissionais'}</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <p className="text-lg font-black tabular-nums text-emerald-500">{stats.verified}</p>
            <p className="text-[10px] text-muted-foreground uppercase">{t('regional.filter_verified') || 'Verificados'}</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <p className="text-lg font-black tabular-nums text-amber-500">{stats.pending}</p>
            <p className="text-[10px] text-muted-foreground uppercase">{t('regional.filter_pending') || 'Pendentes'}</p>
          </BentoCard>
        </BentoGrid>
      </motion.div>

      {/* Search */}
      <motion.div variants={fadeUp} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('regional.search_placeholder') || 'Pesquisar profissionais...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </motion.div>

      {/* Type Filter */}
      <motion.div variants={fadeUp} className="flex gap-2 overflow-x-auto pb-1">
        {typeFilters.map(f => (
          <Button
            key={f.key}
            variant={typeFilter === f.key ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5 shrink-0 text-xs"
            onClick={() => setTypeFilter(f.key)}
          >
            <f.icon className="h-3.5 w-3.5" />
            {f.label}
          </Button>
        ))}
        <div className="w-px bg-border mx-1" />
        {statusFilters.map(f => (
          <Button
            key={f.key}
            variant={statusFilter === f.key ? 'secondary' : 'ghost'}
            size="sm"
            className="shrink-0 text-xs"
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </motion.div>

      {/* Professionals List */}
      {filteredProfessionals.length === 0 ? (
        <motion.div variants={fadeUp}>
          <GlassCard className="!p-8 text-center">
            <Filter className="h-11 w-11 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{t('regional.no_professionals') || 'Sem profissionais nesta categoria'}</p>
          </GlassCard>
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="space-y-2 max-h-96 overflow-y-auto">
          {filteredProfessionals.map((item) => {
            const Icon = getTypeIcon(item.type);
            return (
              <GlassCard key={`${item.type}-${item.id}`} className="!p-3 flex items-center gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${getTypeColor(item.type)}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{item.name}</p>
                    <Badge
                      variant={item.is_verified ? 'default' : 'secondary'}
                      className={`text-[10px] px-1.5 py-0 ${item.is_verified ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}
                    >
                      {item.is_verified
                        ? (t('regional.filter_verified') || 'Verificado')
                        : (t('regional.filter_pending') || 'Pendente')}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {getTypeLabel(item.type)}
                    {item.specialty ? ` · ${item.specialty}` : ''}
                    {' · '}{new Date(item.created_at).toLocaleDateString('pt-PT')}
                  </p>
                </div>
                {!item.is_verified && (
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
                )}
              </GlassCard>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
