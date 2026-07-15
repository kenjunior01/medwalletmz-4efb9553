import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useCountry } from '@/contexts/CountryContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Store, 
  Package, 
  ShoppingBag, 
  Users, 
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  Plus,
  Truck,
  AlertTriangle,
  Wallet,
  Stethoscope,
  Pill,
  Gift,
  Globe
} from 'lucide-react';
import {
  StatWidget,
  QuickActionWidget,
  ActivityFeedWidget,
  ChartWidget,
  OrderStatusWidget,
  TopItemsWidget
} from '@/components/widgets';

export default function AdminHome() {
  const navigate = useNavigate();
  const { country } = useCountry();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const isManager = hasRole('country_manager');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats', country?.id],
    queryFn: async () => {
      const countryId = country?.id;

      const buildQuery = (table: string) => {
        let q: any = (supabase as any).from(table).select('id', { count: 'exact', head: true });
        if (countryId) q = q.eq('country_id', countryId);
        return q;
      };

      const [stores, products, drivers, consults, prescs, referrals] = await Promise.all([
        buildQuery('stores'),
        buildQuery('products'),
        supabase.from('profiles').select('id', { count: 'exact', head: true })
          .not('vehicle_type', 'is', null)
          .eq(countryId ? 'country_id' : 'id', countryId || 'id'), // simplistic filter for profiles
        supabase.from('consultations').select('id, status', { count: 'exact' })
          .eq(countryId ? 'country_id' : 'id', countryId || 'id'),
        buildQuery('prescriptions'),
        supabase.from('user_referrals').select('id, status', { count: 'exact' })
      ]);

      // Specialized queries for complex stats
      let ordersQuery: any = supabase.from('orders').select('id, status, total, created_at');
      if (countryId) ordersQuery = ordersQuery.eq('country_id', countryId);
      const orders = await ordersQuery;

      let walletsQuery: any = supabase.from('wallets').select('balance_mzn, total_deposited');
      if (countryId) walletsQuery = walletsQuery.eq('country_id', countryId);
      const wallets = await walletsQuery;

      const pendingOrders = orders.data?.filter(o => o.status === 'pending').length || 0;
      const completedOrders = orders.data?.filter(o => o.status === 'delivered').length || 0;
      const totalRevenue = orders.data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

      // Calculate today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayOrders = orders.data?.filter(o => new Date(o.created_at) >= today) || [];
      const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      const walletTotal = (wallets.data || []).reduce((a: number, w: any) => a + Number(w.balance_mzn || 0), 0);
      const walletDeposited = (wallets.data || []).reduce((a: number, w: any) => a + Number(w.total_deposited || 0), 0);
      const activeConsults = (consults.data || []).filter((c: any) => ['scheduled','confirmed','in_progress'].includes(c.status)).length;
      const completedReferrals = (referrals.data || []).filter((r: any) => r.status === 'completed').length;

      // Group orders by status
      const statusCounts = orders.data?.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        totalStores: stores.count || 0,
        totalProducts: products.count || 0,
        totalOrders: orders.data?.length || 0,
        totalDrivers: drivers.count || 0,
        totalConsults: consults.count || 0,
        activeConsults,
        totalPrescs: prescs.count || 0,
        walletTotal, walletDeposited,
        totalReferrals: referrals.count || 0,
        completedReferrals,
        pendingOrders,
        completedOrders,
        totalRevenue,
        todayOrders: todayOrders.length,
        todayRevenue,
        statusCounts: Object.entries(statusCounts).map(([status, count]) => ({ status, count }))
      };
    }
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-recent-orders', country?.id],
    queryFn: async () => {
      let q = supabase
        .from('orders')
        .select(`
          *,
          stores (name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (country?.id) q = q.eq('country_id', country.id);

      const { data } = await q;
      return data || [];
    }
  });

  const { data: topStores } = useQuery({
    queryKey: ['admin-top-stores', country?.id],
    queryFn: async () => {
      let q = supabase
        .from('stores')
        .select('id, name, rating, type, image_url')
        .eq('is_active', true)
        .order('rating', { ascending: false })
        .limit(5);

      if (country?.id) q = q.eq('country_id', country.id);

      const { data } = await q;
      return data || [];
    }
  });

  const { data: weeklyData } = useQuery({
    queryKey: ['admin-weekly-revenue', country?.id],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      let q = supabase
        .from('orders')
        .select('total, created_at')
        .gte('created_at', weekAgo.toISOString());

      if (country?.id) q = q.eq('country_id', country.id);

      const { data } = await q;

      // Group by day
      const dailyMap = new Map<string, number>();
      data?.forEach(order => {
        const day = new Date(order.created_at).toLocaleDateString('pt-MZ', { weekday: 'short' });
        dailyMap.set(day, (dailyMap.get(day) || 0) + order.total);
      });

      return Array.from(dailyMap.entries()).map(([name, value]) => ({ name, value }));
    }
  });

  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    delivering: 'A Caminho',
    delivered: 'Entregue',
    cancelled: 'Cancelado'
  };

  const quickActions = [
    { 
      icon: Store, 
      label: "Farmácias", 
      description: "Gerenciar",
      onClick: () => navigate(isManager ? '/manager/stores' : '/admin/stores'),
      colorClass: "text-food",
      bgClass: "bg-food/10"
    },
    { 
      icon: ShoppingBag, 
      label: "Pedidos", 
      description: "Gerenciar",
      onClick: () => navigate(isManager ? '/manager/orders' : '/admin/orders'),
      colorClass: "text-pharmacy",
      bgClass: "bg-pharmacy/10"
    },
    { 
      icon: TrendingUp, 
      label: "Relatórios", 
      description: "Estatísticas",
      onClick: () => navigate(isManager ? '/manager/reports' : '/admin/reports'),
      colorClass: "text-primary",
      bgClass: "bg-primary/10"
    },
  ];

  if (!isAdmin) {
    quickActions.push({
      icon: Globe,
      label: "Painel Regional",
      description: "Ver resumo",
      onClick: () => navigate('/manager'),
      colorClass: "text-secondary",
      bgClass: "bg-secondary/10"
    });
  } else {
    quickActions.push({
      icon: Package,
      label: "Produtos",
      description: "Ver todos",
      onClick: () => navigate('/admin/products'),
      colorClass: "text-grocery",
      bgClass: "bg-grocery/10"
    });
  }

  const activityItems = (recentOrders || []).map((order: any) => ({
    id: order.id,
    title: `Pedido #${order.id.slice(0, 8)}`,
    description: `${order.stores?.name || 'Farmácia'} - ${order.total.toLocaleString()} ${country?.currency_code || 'MZN'}`,
    time: new Date(order.created_at).toLocaleString('pt-MZ'),
    type: 'order' as const,
    status: statusLabels[order.status] || order.status
  }));

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isManager ? `Dashboard: ${country?.name}` : 'Dashboard Administrativo Global'}
          </h1>
          <p className="text-muted-foreground">
            {isManager ? `Gestão da operação em ${country?.name}` : 'Visão geral consolidada de todas as regiões'}
          </p>
        </div>
        <div className="flex gap-3">
          {!isManager && (
            <Button variant="outline" onClick={() => navigate('/admin/stores')}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Farmácia
            </Button>
          )}
          <Button onClick={() => navigate(isManager ? '/manager/reports' : '/admin/reports')}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Relatórios
          </Button>
        </div>
      </div>

      {/* Alert for pending orders */}
      {stats?.pendingOrders && stats.pendingOrders > 5 && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="font-semibold">Alta Demanda</p>
                <p className="text-sm text-muted-foreground">
                  {stats.pendingOrders} pedidos aguardando processamento
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate(isManager ? '/manager/orders' : '/admin/orders')}>
              Ver Pedidos
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatWidget 
          title="Saldo em Carteira"
          value={`${(stats?.walletTotal || 0).toLocaleString()} ${country?.currency_code || 'MZN'}`}
          subtitle={`Depositado: ${(stats?.walletDeposited || 0).toLocaleString()} ${country?.currency_code || 'MZN'}`}
          icon={Wallet}
          colorClass="text-primary"
        />
        <StatWidget 
          title="Consultas Ativas"
          value={stats?.activeConsults || 0}
          subtitle={`Total: ${stats?.totalConsults || 0}`}
          icon={Stethoscope}
          colorClass="text-pharmacy"
        />
        <StatWidget 
          title="Receitas Emitidas"
          value={stats?.totalPrescs || 0}
          subtitle="Total histórico"
          icon={Pill}
          colorClass="text-secondary"
        />
        <StatWidget 
          title="Receita Total"
          value={`${(stats?.totalRevenue || 0).toLocaleString()} ${country?.currency_code || 'MZN'}`}
          subtitle={`Hoje: ${(stats?.todayRevenue || 0).toLocaleString()} ${country?.currency_code || 'MZN'}`}
          icon={DollarSign}
          trend={{ value: 18, isPositive: true }}
          colorClass="text-gold"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Store className="h-8 w-8 text-food" />
          <div><p className="text-xs text-muted-foreground">Farmácias</p><p className="text-xl font-bold">{stats?.totalStores || 0}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Package className="h-8 w-8 text-grocery" />
          <div><p className="text-xs text-muted-foreground">Produtos</p><p className="text-xl font-bold">{stats?.totalProducts || 0}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Truck className="h-8 w-8 text-orange-500" />
          <div><p className="text-xs text-muted-foreground">Entregadores</p><p className="text-xl font-bold">{stats?.totalDrivers || 0}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Gift className="h-8 w-8 text-gold" />
          <div><p className="text-xs text-muted-foreground">Convites concluídos</p><p className="text-xl font-bold">{stats?.completedReferrals || 0}/{stats?.totalReferrals || 0}</p></div>
        </CardContent></Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Clock className="h-7 w-7 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pedidos Pendentes</p>
              <p className="text-2xl font-bold">{stats?.pendingOrders || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Entregues Hoje</p>
              <p className="text-2xl font-bold">{stats?.completedOrders || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
              <p className="text-2xl font-bold">
                {stats?.totalOrders 
                  ? Math.round((stats.completedOrders / stats.totalOrders) * 100)
                  : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Chart */}
          <ChartWidget 
            title="Receita da Semana"
            subtitle="Últimos 7 dias"
            data={weeklyData || []}
            type="area"
            height={280}
          />

          {/* Quick Actions */}
          <QuickActionWidget 
            title="Ações Rápidas"
            actions={quickActions}
          />
        </div>

        <div className="space-y-6">
          {/* Order Status */}
          {stats?.statusCounts && stats.statusCounts.length > 0 && (
            <OrderStatusWidget 
              title="Status dos Pedidos"
              statuses={stats.statusCounts}
              total={stats.totalOrders || 0}
            />
          )}

          {/* Top Stores */}
          <TopItemsWidget 
            title="Top Farmácias"
            items={topStores?.map(store => ({
              id: store.id,
              name: store.name,
              value: store.rating?.toFixed(1) || '-',
              subtitle: store.type,
              image: store.image_url || undefined
            })) || []}
            valueLabel="⭐"
          />
        </div>
      </div>

      {/* Activity Feed */}
      <ActivityFeedWidget 
        title="Atividade Recente"
        activities={activityItems}
        maxHeight={400}
        emptyMessage="Nenhuma atividade recente"
      />
    </div>
  );
}
