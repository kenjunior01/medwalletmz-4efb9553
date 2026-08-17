import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useManagedCountry } from '@/hooks/useManagedCountry';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users, Store, Stethoscope, Building2, ShoppingBag, TrendingUp,
  ShieldCheck, MapPin, AlertTriangle, CheckCircle, Clock,
  DollarSign, BarChart3, Eye, Ban, ChevronRight, Activity,
  AlertCircle, RefreshCw, LogOut,
} from "@/components/icons/lucide-compat";
import {
  BentoCard, BentoGrid, GlassCard,
} from '@/components/ui/design-system';
import NumberFlow from '@number-flow/react';
import { toast } from 'sonner';

interface ManagerStats {
  totalUsers: number;
  activeUsers: number;
  totalDoctors: number;
  totalPharmacies: number;
  totalInstitutions: number;
  totalOrders: number;
  monthlyRevenue: number;
  pendingVerifications: number;
  growthRate: number;
}

interface PendingVerification {
  id: string;
  type: 'doctor' | 'pharmacy' | 'institution' | 'lab';
  name: string;
  submitted_at: string;
  country_code: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days}d`;
  return new Date(dateStr).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
}

export default function ManagerHome() {
  const { user, hasRole, signOut } = useAuth();
  const { managedCountryId, countryName, countryCode, countryFilter } = useManagedCountry();
  const { t } = useCountry();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ManagerStats>({
    totalUsers: 0, activeUsers: 0, totalDoctors: 0,
    totalPharmacies: 0, totalInstitutions: 0, totalOrders: 0,
    monthlyRevenue: 0, pendingVerifications: 0, growthRate: 0,
  });
  const [pendingVerifications, setPendingVerifications] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSession, setLastSession] = useState<string | null>(null);
  const [restrictions, setRestrictions] = useState({
    canApproveDoctors: false,
    canApprovePharmacies: false,
    canApproveInstitutions: false,
    canViewFinancials: false,
    canExportData: false,
    canManageDrivers: false,
    canManageCoupons: false,
    canManageSettings: false,
  });

  // Check if all permissions are active (to hide the card)
  const permissionCount = Object.values(restrictions).filter(Boolean).length;
  const totalPermissions = Object.keys(restrictions).length;
  const hasAllPermissions = permissionCount === totalPermissions;
  const hasSomePermissions = permissionCount > 0;
  const hasNoPermissions = permissionCount === 0;

  const greeting = useMemo(() => getGreeting(), []);
  const displayName = user?.user_metadata?.full_name || user?.email || 'Gestor';

  useEffect(() => {
    if (!user) return;
    loadStats();
    loadPendingVerifications();
    loadRestrictions();
    loadLastSession();
  }, [user, managedCountryId]);

  const loadLastSession = async () => {
    if (!user) return;
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('last_sign_in_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profile?.last_sign_in_at) {
      setLastSession(profile.last_sign_in_at);
    }
  };

  const loadStats = async () => {
    if (!managedCountryId) return;
    setLoading(true);
    setError(null);

    const startMonth = new Date();
    startMonth.setDate(1);
    startMonth.setHours(0, 0, 0, 0);

    const startPrevMonth = new Date(startMonth);
    startPrevMonth.setMonth(startPrevMonth.getMonth() - 1);
    const endPrevMonth = new Date(startMonth);
    endPrevMonth.setDate(endPrevMonth.getDate() - 1);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const [usersRes, doctorsRes, storesRes, clinicsRes, ordersRes, ordersPrevRes, activeUsersRes, revenueRes] = await Promise.all([
        (supabase as any).from('profiles').select('id', { count: 'exact', head: true }).eq('country_id', managedCountryId),
        (supabase as any).from('doctor_profiles').select('id', { count: 'exact', head: true }).eq('country_code', countryCode),
        (supabase as any).from('stores').select('id', { count: 'exact', head: true }).eq('country_code', countryCode),
        (supabase as any).from('clinics').select('id', { count: 'exact', head: true }).eq('country_code', countryCode),
        (supabase as any).from('orders').select('id', { count: 'exact', head: true }).eq('country_code', countryCode).gte('created_at', startMonth.toISOString()),
        (supabase as any).from('orders').select('id', { count: 'exact', head: true }).eq('country_code', countryCode).gte('created_at', startPrevMonth.toISOString()).lt('created_at', startMonth.toISOString()),
        (supabase as any).from('profiles').select('id', { count: 'exact', head: true }).eq('country_id', managedCountryId).gte('last_sign_in_at', thirtyDaysAgo.toISOString()),
        (supabase as any).from('orders').select('total').eq('country_code', countryCode).gte('created_at', startMonth.toISOString()).eq('status', 'delivered'),
      ]);

      const totalRevenue = (revenueRes.data || []).reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
      const prevOrders = ordersPrevRes.count || 0;
      const currOrders = ordersRes.count || 0;
      const growthRate = prevOrders > 0 ? (((currOrders - prevOrders) / prevOrders) * 100).toFixed(1) : (currOrders > 0 ? '100.0' : '0.0');

      setStats({
        totalUsers: usersRes.count || 0,
        activeUsers: activeUsersRes.count || 0,
        totalDoctors: doctorsRes.count || 0,
        totalPharmacies: storesRes.count || 0,
        totalInstitutions: clinicsRes.count || 0,
        totalOrders: currOrders,
        monthlyRevenue: totalRevenue,
        pendingVerifications: pendingVerifications.length,
        growthRate: Number(growthRate),
      });
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingVerifications = async () => {
    if (!managedCountryId) return;
    try {
      const [doctorsRes, storesRes] = await Promise.all([
        (supabase as any)
          .from('doctor_profiles')
          .select('id, full_name, created_at')
          .eq('country_code', countryCode)
          .eq('is_verified', false)
          .limit(10),
        (supabase as any)
          .from('stores')
          .select('id, name, created_at')
          .eq('country_code', countryCode)
          .eq('is_verified', false)
          .limit(10),
      ]);

      const items: PendingVerification[] = [
        ...(doctorsRes.data || []).map((d: any) => ({
          id: d.id, type: 'doctor' as const, name: d.full_name,
          submitted_at: d.created_at, country_code: countryCode,
        })),
        ...(storesRes.data || []).map((s: any) => ({
          id: s.id, type: 'pharmacy' as const, name: s.name,
          submitted_at: s.created_at, country_code: countryCode,
        })),
      ];
      setPendingVerifications(items);
      setStats(prev => ({ ...prev, pendingVerifications: items.length }));
    } catch (err: any) {
      console.warn('Failed to load pending verifications:', err);
    }
  };

  const loadRestrictions = async () => {
    if (!user) return;
    try {
      const { data: perms } = await (supabase as any)
        .from('manager_permissions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (perms) {
        setRestrictions({
          canApproveDoctors: perms.can_approve_doctors ?? false,
          canApprovePharmacies: perms.can_approve_pharmacies ?? false,
          canApproveInstitutions: perms.can_approve_institutions ?? false,
          canViewFinancials: perms.can_view_financials ?? false,
          canExportData: perms.can_export_data ?? false,
          canManageDrivers: perms.can_manage_drivers ?? false,
          canManageCoupons: perms.can_manage_coupons ?? false,
          canManageSettings: perms.can_manage_settings ?? false,
        });
      }
    } catch {
      // Silently fail — permissions default to false, admin/global has full access
    }
  };

  const handleApprove = async (item: PendingVerification, approve: boolean) => {
    const table = item.type === 'doctor' ? 'doctor_profiles' : 'stores';
    const { error } = await (supabase as any)
      .from(table)
      .update({ is_verified: approve })
      .eq('id', item.id);

    if (error) {
      toast.error(approve ? 'Erro ao aprovar' : 'Erro ao rejeitar');
      return;
    }

    setPendingVerifications(prev => prev.filter(p => p.id !== item.id));
    toast.success(approve ? 'Aprovado com sucesso' : 'Rejeitado');
  };

  return (
    <div className="space-y-5">
      {/* Header com saudação personalizada */}
      <div>
        <h1 className="text-xl font-black">{greeting}, {displayName.split(' ')[0]}!</h1>
        <div className="flex items-center gap-2 mt-1">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <p className="text-sm text-muted-foreground">
            {countryName} ({countryCode})
          </p>
          {/* Badge de identidade — sem referência a níveis superiores */}
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
            {t('manager.panel_label') || 'Gestor Regional'}
          </Badge>
        </div>
        {lastSession && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            <Clock className="h-3 w-3 inline mr-0.5" />
            Última sessão: {timeAgo(lastSession)}
          </p>
        )}
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-600">
                  Erro ao carregar dados
                </p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
              <Button size="sm" variant="outline" onClick={loadStats}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Tentar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Restrictions notice — only show when relevant */}
      {!hasAllPermissions && !hasRole('admin') && (
        <Card className={hasNoPermissions ? 'border-red-500/20 bg-red-500/5' : 'border-amber-500/20 bg-amber-500/5'}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className={`h-5 w-5 mt-0.5 shrink-0 ${hasNoPermissions ? 'text-red-500' : 'text-amber-500'}`} />
              <div className="flex-1">
                <p className={`text-sm font-semibold ${hasNoPermissions ? 'text-red-600' : 'text-amber-700'}`}>
                  {hasNoPermissions
                    ? (t('manager.no_permissions') || 'Sem permissões activas')
                    : (t('manager.permissions_label') || 'Permissões do Gestor')
                  }
                </p>
                {hasSomePermissions && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {restrictions.canApproveDoctors && <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Médicos</Badge>}
                    {restrictions.canApprovePharmacies && <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Farmácias</Badge>}
                    {restrictions.canApproveInstitutions && <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Instituições</Badge>}
                    {restrictions.canViewFinancials && <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Financeiros</Badge>}
                    {restrictions.canManageDrivers && <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Motoristas</Badge>}
                    {restrictions.canExportData && <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Exportar</Badge>}
                  </div>
                )}
                {hasNoPermissions && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('manager.no_permissions_hint') || 'As suas permissões serão activadas em breve.'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
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
        <BentoGrid className="grid-cols-2 sm:grid-cols-3">
          <BentoCard size="sm" className="text-center">
            <Users className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={stats.totalUsers} /></p>
            <p className="text-[10px] text-muted-foreground uppercase">{t('manager.total_users') || 'Utilizadores'}</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <Activity className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={stats.activeUsers} /></p>
            <p className="text-[10px] text-muted-foreground uppercase">{t('manager.active_users') || 'Activos (30d)'}</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <Stethoscope className="h-5 w-5 mx-auto text-teal-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={stats.totalDoctors} /></p>
            <p className="text-[10px] text-muted-foreground uppercase">{t('manager.doctors') || 'Médicos'}</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <Store className="h-5 w-5 mx-auto text-purple-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={stats.totalPharmacies} /></p>
            <p className="text-[10px] text-muted-foreground uppercase">{t('manager.pharmacies') || 'Farmácias'}</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <ShoppingBag className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={stats.totalOrders} /></p>
            <p className="text-[10px] text-muted-foreground uppercase">{t('manager.orders') || 'Encomendas'}</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <DollarSign className="h-5 w-5 mx-auto text-gold mb-1" />
            <p className="text-xl font-black tabular-nums text-gold">
              <NumberFlow value={stats.monthlyRevenue} />
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">{t('manager.revenue') || 'Receita'}</p>
          </BentoCard>
        </BentoGrid>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        {(restrictions.canApproveDoctors || hasRole('admin')) && (
          <Button variant="outline" className="h-12 gap-2 text-sm" onClick={() => navigate('/manager/users')}>
            <Stethoscope className="h-4 w-4" /> {t('manager.manage_doctors') || 'Gerir Médicos'}
          </Button>
        )}
        {(restrictions.canApprovePharmacies || hasRole('admin')) && (
          <Button variant="outline" className="h-12 gap-2 text-sm" onClick={() => navigate('/manager/stores')}>
            <Store className="h-4 w-4" /> {t('manager.manage_pharmacies') || 'Gerir Farmácias'}
          </Button>
        )}
        <Button variant="outline" className="h-12 gap-2 text-sm" onClick={() => navigate('/manager/orders')}>
          <ShoppingBag className="h-4 w-4" /> {t('manager.manage_orders') || 'Encomendas'}
        </Button>
        <Button variant="outline" className="h-12 gap-2 text-sm" onClick={() => navigate('/manager/reports')}>
          <BarChart3 className="h-4 w-4" /> {t('manager.reports') || 'Relatórios'}
        </Button>
      </div>

      {/* Pending Verifications */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base">{t('manager.pending_verifications') || 'Verificações Pendentes'}</h2>
          {pendingVerifications.length > 0 && (
            <Badge variant="destructive" className="text-xs">{pendingVerifications.length}</Badge>
          )}
        </div>
        {pendingVerifications.length === 0 ? (
          <GlassCard className="!p-6 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm text-muted-foreground">{t('manager.no_pending') || 'Sem verificações pendentes'}</p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {pendingVerifications.slice(0, 5).map((item) => (
              <GlassCard key={item.id} className="!p-3 flex items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  item.type === 'doctor' ? 'bg-teal-500/10 text-teal-500' : 'bg-purple-500/10 text-purple-500'
                }`}>
                  {item.type === 'doctor' ? <Stethoscope className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.type === 'doctor' ? 'Médico' : 'Farmácia'} · {timeAgo(item.submitted_at)}
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
              <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => navigate('/manager/users')}>
                Ver todas ({pendingVerifications.length}) <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Growth indicator */}
      {!loading && (
        <GlassCard className="!p-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              stats.growthRate >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
            }`}>
              <TrendingUp className={`h-5 w-5 ${stats.growthRate >= 0 ? 'text-emerald-500' : 'text-red-500 rotate-180'}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{t('manager.growth') || 'Crescimento Regional'}</p>
              <p className="text-xs text-muted-foreground">
                {stats.totalOrders} encomendas este mês
              </p>
            </div>
            <p className={`text-lg font-black ${stats.growthRate >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate}%
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
