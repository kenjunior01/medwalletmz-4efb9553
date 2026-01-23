import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Store, 
  Package, 
  ShoppingBag, 
  Users, 
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle
} from 'lucide-react';

export default function AdminHome() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [stores, products, orders] = await Promise.all([
        supabase.from('stores').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id, status, total', { count: 'exact' })
      ]);

      const pendingOrders = orders.data?.filter(o => o.status === 'pending').length || 0;
      const completedOrders = orders.data?.filter(o => o.status === 'delivered').length || 0;
      const totalRevenue = orders.data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

      return {
        totalStores: stores.count || 0,
        totalProducts: products.count || 0,
        totalOrders: orders.count || 0,
        pendingOrders,
        completedOrders,
        totalRevenue
      };
    }
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          stores (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    }
  });

  const statCards = [
    { 
      title: 'Total de Lojas', 
      value: stats?.totalStores || 0, 
      icon: Store, 
      color: 'text-food' 
    },
    { 
      title: 'Produtos', 
      value: stats?.totalProducts || 0, 
      icon: Package, 
      color: 'text-grocery' 
    },
    { 
      title: 'Pedidos Hoje', 
      value: stats?.totalOrders || 0, 
      icon: ShoppingBag, 
      color: 'text-pharmacy' 
    },
    { 
      title: 'Receita Total', 
      value: `${((stats?.totalRevenue || 0) / 100).toLocaleString()} MZN`, 
      icon: DollarSign, 
      color: 'text-primary' 
    },
  ];

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    preparing: 'bg-orange-100 text-orange-800',
    delivering: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    delivering: 'A Caminho',
    delivered: 'Entregue',
    cancelled: 'Cancelado'
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da plataforma</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          statCards.map(({ title, value, icon: Icon, color }) => (
            <Card key={title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="text-2xl font-bold">{value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-full bg-muted flex items-center justify-center ${color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pedidos Pendentes</p>
              <p className="text-xl font-bold">{stats?.pendingOrders || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Entregues Hoje</p>
              <p className="text-xl font-bold">{stats?.completedOrders || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
              <p className="text-xl font-bold">
                {stats?.totalOrders 
                  ? Math.round((stats.completedOrders / stats.totalOrders) * 100)
                  : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentOrders && recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map((order: any) => (
                <div 
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">
                      Pedido #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.stores?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{order.total} MZN</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[order.status] || statusColors.pending}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum pedido ainda
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
