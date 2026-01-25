import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package, 
  ShoppingBag, 
  TrendingUp, 
  Star,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

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
}

interface RecentOrder {
  id: string;
  status: string;
  total: number;
  created_at: string;
}

export default function StoreHome() {
  const { selectedStore } = useOutletContext<StoreContext>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

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
        .limit(5);

      setStats({
        totalProducts: totalProducts || 0,
        activeProducts: activeProducts || 0,
        todayOrders,
        pendingOrders,
        totalRevenue,
        averageRating
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
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo ao painel da sua loja
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeProducts} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Hoje</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.pendingOrders} pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita Hoje</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalRevenue.toLocaleString()} MZN
            </div>
            <p className="text-xs text-muted-foreground">
              +12% vs ontem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avaliação</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.averageRating.toFixed(1)} ⭐
            </div>
            <p className="text-xs text-muted-foreground">
              Média geral
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Orders Alert */}
        {stats?.pendingOrders && stats.pendingOrders > 0 && (
          <Card className="border-orange-500/50 bg-orange-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Atenção Necessária
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Você tem {stats.pendingOrders} pedido(s) aguardando ação.
              </p>
              <div className="flex gap-2">
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {stats.pendingOrders} pendentes
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Orders */}
        <Card className={stats?.pendingOrders && stats.pendingOrders > 0 ? '' : 'lg:col-span-2'}>
          <CardHeader>
            <CardTitle className="text-lg">Pedidos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum pedido ainda
              </p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map(order => {
                  const badge = getStatusBadge(order.status);
                  return (
                    <div 
                      key={order.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {order.status === 'delivered' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            Pedido #{order.id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleString('pt-MZ')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <p className="text-sm font-medium mt-1">
                          {order.total.toLocaleString()} MZN
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
