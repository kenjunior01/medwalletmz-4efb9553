import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useManagedCountry } from '@/hooks/useManagedCountry';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Users, Store, Stethoscope, Building2, ShoppingBag, TrendingUp,
  ShieldCheck, MapPin, AlertTriangle, CheckCircle, Clock,
  DollarSign, BarChart3, Eye, Ban, ChevronRight, Activity
} from 'lucide-react';
import {
  BentoCard, BentoGrid, GlassCard, NeuCard, PanelShell,
} from '@/components/ui/design-system';
import NumberFlow from '@number-flow/react';

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

export default function ManagerHome() {
  const { user, hasRole } = useAuth();
  const { managedCountryId, countryName, countryCode, isGlobalAdmin, countryFilter } = useManagedCountry();
  const { t } = useCountry();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ManagerStats>({
    totalUsers: 0, activeUsers: 0, totalDoctors: 0,
    totalPharmacies: 0, totalInstitutions: 0, totalOrders: 0,
    monthlyRevenue: 0, pendingVerifications: 0, growthRate: 0,
  });
  const [pendingVerifications, setPendingVerifications] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (!user) return;
    loadStats();
    loadPendingVerifications();
    loadRestrictions();
  }, [user, managedCountryId]);

  const loadStats = async () => {
    if (!managedCountryId) return;
    setLoading(true);

    const startMonth = new Date();
    startMonth.setDate(1);
    startMonth.setHours(0, 0, 0, 0);

    const startPrevMonth = new Date(startMonth);
    startPrevMonth.setMonth(startPrevMonth.getMonth() - 1);
    const endPrevMonth = new Date(startMonth);
    endPrevMonth.setDate(endPrevMonth.getDate() - 1);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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
    setLoading(false);
  };

  const loadPendingVerifications = async () => {
    if (!managedCountryId) return;
    // Load pending verifications for this region
    const { data: doctors } = await (supabase as any)
      .from('doctor_profiles')
      .select('id, full_name, created_at')
      .eq('country_code', countryCode)
      .eq('is_verified', false)
      .limit(10);

    const { data: stores } = await (supabase as any)
      .from('stores')
      .select('id, name, created_at')
      .eq('country_code', countryCode)
      .eq('is_verified', false)
      .limit(10);

    const items: PendingVerification[] = [
      ...(doctors || []).map((d: any) => ({
        id: d.id, type: 'doctor' as const, name: d.full_name,
        submitted_at: d.created_at, country_code: countryCode,
      })),
      ...(stores || []).map((s: any) => ({
        id: s.id, type: 'pharmacy' as const, name: s.name,
        submitted_at: s.created_at, country_code: countryCode,
      })),
    ];
    setPendingVerifications(items);
    setStats(prev => ({ ...prev, pendingVerifications: items.length }));
  };

  const loadRestrictions = async () => {
    if (!user) return;
    // Load regional manager permissions/restrictions
    // These come from the user_roles table or a manager_permissions table
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
  };

  const handleApprove = async (item: PendingVerification, approve: boolean) => {
    const table = item.type === 'doctor' ? 'doctor_profiles' : 'stores';
    const { error } = await (supabase as any)
      .from(table)
      .update({ is_verified: approve })
      .eq('id', item.id);

    if (!error) {
      setPendingVerifications(prev => prev.filter(p => p.id !== item.id));
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black">{t('manager.welcome') || 'Painel do Gestor Regional'}</h1>
        <div className="flex items-center gap-2 mt-1">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <p className="text-sm text-muted-foreground">
            {countryName} ({countryCode})
          </p>
          {isGlobalAdmin && (
            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
              Admin Global
            </Badge>
          )}
        </div>
      </div>

      {/* Restrictions notice */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-700">
                {t('manager.permissions_label') || 'Permissões do Gestor'}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {restrictions.canApproveDoctors && <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Médicos</Badge>}
                {restrictions.canApprovePharmacies && <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Farmácias</Badge>}
                {restrictions.canApproveInstitutions && <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Instituições</Badge>}
                {restrictions.canViewFinancials && <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Financeiros</Badge>}
                {restrictions.canManageDrivers && <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Motoristas</Badge>}
                {restrictions.canExportData && <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Exportar</Badge>}
                {!Object.values(restrictions).some(v => v) && (
                  <Badge className="text-xs bg-red-500/10 text-red-600 border-red-500/20">Sem permissões ativas</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <BentoGrid className="grid-cols-2 sm:grid-cols-3">
        <BentoCard size="sm" className="text-center">
          <Users className="h-5 w-5 mx-auto text-blue-500 mb-1" />
          <p className="text-xl font-black tabular-nums"><NumberFlow value={stats.totalUsers} /></p>
          <p className="text-[10px] text-muted-foreground uppercase">{t('manager.total_users') || 'Utilizadores'}</p>
        </BentoCard>
        <BentoCard size="sm" className="text-center">
          <Activity className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-xl font-black tabular-nums"><NumberFlow value={stats.activeUsers} /></p>
          <p className="text-[10px] text-muted-foreground uppercase">{t('manager.active_users') || 'Activos'}</p>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        {restrictions.canApproveDoctors && (
          <Button variant="outline" className="h-12 gap-2 text-sm" onClick={() => navigate('/manager/users')}>
            <Stethoscope className="h-4 w-4" /> {t('manager.manage_doctors') || 'Gerir Médicos'}
          </Button>
        )}
        {restrictions.canApprovePharmacies && (
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
          <Badge className="text-xs">{pendingVerifications.length}</Badge>
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
                    {item.type === 'doctor' ? 'Médico' : 'Farmácia'} · {new Date(item.submitted_at).toLocaleDateString('pt-PT')}
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
      </div>

      {/* Growth indicator */}
      <GlassCard className="!p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{t('manager.growth') || 'Crescimento Regional'}</p>
            <p className="text-xs text-muted-foreground">
              {stats.growthRate}% este mês
            </p>
          </div>
          <p className="text-lg font-black text-emerald-500">+{stats.growthRate}%</p>
        </div>
      </GlassCard>
    </div>
  );
}
