import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  ShoppingBag, 
  TrendingUp, 
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCountry } from '@/contexts/CountryContext';
import { 
  StatWidget, 
  QuickActionWidget, 
  ActivityFeedWidget,
  ChartWidget,
  OrderStatusWidget,
  NotificationWidget
} from '@/components/widgets';

interface StoreContext {
  selectedStore: {
    id: string;
    name: string;
    type: string;
  } | null;
}

interface Stats {
  totalProducts: number;
  activeProducts: number;
  todayOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  averageRating: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
}

interface RecentOrder {
  id: string;
  status: string;
  total: number;
  created_at: string;
}

export default function StoreHome() {
  const { selectedStore } = useOutletContext<StoreContext>();
  const { country } = useCountry();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<{ name: string; value: number }[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<{ status: string; count: number }[]>([]);
  const navigate = useNavigate();
  const currencySymbol = country?.currency_symbol || country?.currency_code || 'MZN';
  const locale = country?.default_locale || 'pt-MZ';

  useEffect(() => {
    if (selectedStore) {
      fetchDashboardData();
    }
  }, [selectedStore]);

  const fetchDashboardData = async () => {
    if (!selectedStore) return;

    try {
      // Fetch products count
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', selectedStore.id);

      const { count: activeProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', selectedStore.id)
        .eq('is_available', true);

      // Fetch today's orders
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayOrdersData } = await supabase
        .from('orders')
        .select('id, status, total')
        .eq('store_id', selectedStore.id)
        .gte('created_at', today.toISOString());

      const todayOrders = todayOrdersData?.length || 0;
      const pendingOrders = todayOrdersData?.filter(o => 
        ['pending', 'accepted', 'preparing'].includes(o.status)
      ).length || 0;

      // Calculate revenue
      const totalRevenue = todayOrdersData?.reduce((sum, o) => sum + o.total, 0) || 0;

      // Calculate order status distribution
      const statusCounts = todayOrdersData?.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      setOrderStatusData(Object.entries(statusCounts).map(([status, count]) => ({ status, count })));

      // Fetch weekly orders for chart
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: weeklyOrders } = await supabase
        .from('orders')
        .select('total, created_at')
        .eq('store_id', selectedStore.id)
        .gte('created_at', weekAgo.toISOString());

      // Group by day
      const dailyMap = new Map<string, number>();
      weeklyOrders?.forEach(order => {
        const day = new Date(order.created_at).toLocaleDateString(locale, { weekday: 'short' });
        dailyMap.set(day, (dailyMap.get(day) || 0) + order.total);
      });

      setDailyData(Array.from(dailyMap.entries()).map(([name, value]) => ({ name, value })));

      const weeklyRevenue = weeklyOrders?.reduce((sum, o) => sum + o.total, 0) || 0;

      // Fetch monthly revenue
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const { data: monthlyOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('store_id', selectedStore.id)
        .gte('created_at', monthAgo.toISOString());

      const monthlyRevenue = monthlyOrders?.reduce((sum, o) => sum + o.total, 0) || 0;

      // Fetch average rating
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('store_id', selectedStore.id);

      const averageRating = reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      // Fetch recent orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id, status, total, created_at')
        .eq('store_id', selectedStore.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setStats({
        totalProducts: totalProducts || 0,
        activeProducts: activeProducts || 0,
        todayOrders,
        pendingOrders,
        totalRevenue,
        averageRating,
        weeklyRevenue,
        monthlyRevenue
      });
      
      setRecentOrders(orders || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'outline', label: 'Pendente' },
      accepted: { variant: 'secondary', label: 'Aceite' },
      preparing: { variant: 'default', label: 'Preparando' },
      ready: { variant: 'default', label: 'Pronto' },
      out_for_delivery: { variant: 'default', label: 'Em Entrega' },
      delivered: { variant: 'secondary', label: 'Entregue' },
      cancelled: { variant: 'destructive', label: 'Cancelado' }
    };
    return variants[status] || { variant: 'outline', label: status };
  };

  const quickActions = [
    { 
      icon: Plus, 
      label: "Novo Produto", 
      description: "Adicionar item",
      onClick: () => navigate('/store/dashboard/products'),
      colorClass: "text-primary",
      bgClass: "bg-primary/10"
    },
    { 
      icon: ShoppingBag, 
      label: "Pedidos", 
      description: "Ver pedidos",
      onClick: () => navigate('/store/dashboard/orders'),
      colorClass: "text-food",
      bgClass: "bg-food/10"
    },
    { 
      icon: TrendingUp, 
      label: "Relatórios", 
      description: "Estatísticas",
      onClick: () => navigate('/store/dashboard/reports'),
      colorClass: "text-secondary",
      bgClass: "bg-secondary/10"
    },
  ];

  const activityItems = recentOrders.map(order => ({
    id: order.id,
    title: `Pedido #${order.id.slice(0, 8)}`,
    description: `${order.total.toLocaleString(locale)} ${currencySymbol}`,
    time: new Date(order.created_at).toLocaleString(locale),
    type: 'order' as const,
    status: getStatusBadge(order.status).label
  }));

  if (loading) {
    return (
      <div className="p-6 space-y-6">
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao painel da sua farmácia
          </p>
        </div>
        <Button onClick={() => navigate('/store/dashboard/products')}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Alert for pending orders */}
      {stats?.pendingOrders && stats.pendingOrders > 0 && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="font-semibold">Atenção Necessária</p>
                <p className="text-sm text-muted-foreground">
                  Você tem {stats.pendingOrders} pedido(s) aguardando ação
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/store/dashboard/orders')}>
              Ver Pedidos
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatWidget 
          title="Produtos"
          value={stats?.totalProducts || 0}
          subtitle={`${stats?.activeProducts || 0} ativos`}
          icon={Package}
          colorClass="text-primary"
        />
        <StatWidget 
          title="Pedidos Hoje"
          value={stats?.todayOrders || 0}
          subtitle={`${stats?.pendingOrders || 0} pendentes`}
          icon={ShoppingBag}
          colorClass="text-food"
        />
        <StatWidget 
          title="Receita Hoje"
          value={`${(stats?.totalRevenue || 0).toLocaleString(locale)} ${currencySymbol}`}
          subtitle={`Semana: ${(stats?.weeklyRevenue || 0).toLocaleString(locale)} ${currencySymbol}`}
          icon={TrendingUp}
          trend={{ value: 12, isPositive: true }}
          colorClass="text-secondary"
        />
        <StatWidget 
          title="Avaliação"
          value={`${(stats?.averageRating || 0).toFixed(1)} ⭐`}
          subtitle="Média geral"
          icon={Star}
          colorClass="text-yellow-500"
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ChartWidget 
            title="Receita da Semana"
            subtitle="Últimos 7 dias"
            data={dailyData}
            type="area"
            height={280}
          />
          <QuickActionWidget 
            title="Ações Rápidas"
            actions={quickActions}
          />
        </div>

        <div className="space-y-6">
          {orderStatusData.length > 0 && (
            <OrderStatusWidget 
              title="Status dos Pedidos"
              statuses={orderStatusData}
              total={stats?.todayOrders || 0}
            />
          )}
          <ActivityFeedWidget 
            title="Atividade Recente"
            activities={activityItems}
            maxHeight={300}
            emptyMessage="Nenhum pedido recente"
          />
        </div>
      </div>
    </div>
  );
}
