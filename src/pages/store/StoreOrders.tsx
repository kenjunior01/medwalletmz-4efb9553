import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck, 
  ChefHat,
  Package,
  User,
  MapPin,
  Phone
} from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  product: {
    name: string;
  };
}

interface Order {
  id: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string | null;
  notes: string | null;
  created_at: string;
  user_id: string;
  items?: OrderItem[];
}

interface StoreContext {
  selectedStore: {
    id: string;
    name: string;
  } | null;
}

const statusFlow = ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered'];

export default function StoreOrders() {
  const { selectedStore } = useOutletContext<StoreContext>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');

  useEffect(() => {
    if (selectedStore) {
      fetchOrders();
      
      // Set up realtime subscription
      const channel = supabase
        .channel('store-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `store_id=eq.${selectedStore.id}`
          },
          () => {
            fetchOrders();
            toast.info('Novo pedido recebido!');
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedStore]);

  const fetchOrders = async () => {
    if (!selectedStore) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            id,
            quantity,
            unit_price,
            product:products(name)
          )
        `)
        .eq('store_id', selectedStore.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      toast.success(`Status atualizado para: ${getStatusLabel(newStatus)}`);
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Erro ao atualizar pedido');
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      accepted: 'Aceite',
      preparing: 'Preparando',
      ready: 'Pronto',
      out_for_delivery: 'Em Entrega',
      delivered: 'Entregue',
      cancelled: 'Cancelado'
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      pending: Clock,
      accepted: CheckCircle,
      preparing: ChefHat,
      ready: Package,
      out_for_delivery: Truck,
      delivered: CheckCircle,
      cancelled: XCircle
    };
    return icons[status] || Clock;
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      accepted: 'secondary',
      preparing: 'default',
      ready: 'default',
      out_for_delivery: 'default',
      delivered: 'secondary',
      cancelled: 'destructive'
    };
    return variants[status] || 'outline';
  };

  const getNextStatus = (currentStatus: string) => {
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex >= 0 && currentIndex < statusFlow.length - 1) {
      return statusFlow[currentIndex + 1];
    }
    return null;
  };

  const filteredOrders = orders.filter(order => {
    if (tab === 'pending') return order.status === 'pending';
    if (tab === 'active') return ['accepted', 'preparing', 'ready', 'out_for_delivery'].includes(order.status);
    if (tab === 'completed') return ['delivered', 'cancelled'].includes(order.status);
    return true;
  });

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const activeCount = orders.filter(o => ['accepted', 'preparing', 'ready', 'out_for_delivery'].includes(o.status)).length;

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-muted-foreground">
          Gerencie os pedidos da sua farmácia
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="relative">
            Pendentes
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="relative">
            Em Andamento
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Concluídos</TabsTrigger>
        </TabsList>

        {['pending', 'active', 'completed'].map(tabValue => (
          <TabsContent key={tabValue} value={tabValue} className="mt-6">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Nenhum pedido</h3>
                <p className="text-muted-foreground text-sm">
                  {tabValue === 'pending' ? 'Nenhum pedido pendente' :
                   tabValue === 'active' ? 'Nenhum pedido em andamento' :
                   'Nenhum pedido concluído'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map(order => {
                  const StatusIcon = getStatusIcon(order.status);
                  const nextStatus = getNextStatus(order.status);
                  
                  return (
                    <Card key={order.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <StatusIcon className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <CardTitle className="text-base">
                                Pedido #{order.id.slice(0, 8)}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {new Date(order.created_at).toLocaleString('pt-MZ')}
                              </p>
                            </div>
                          </div>
                          <Badge variant={getStatusVariant(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Items */}
                        <div className="bg-muted/50 rounded-lg p-3">
                          <h4 className="font-medium text-sm mb-2">Itens do Pedido</h4>
                          <div className="space-y-1">
                            {order.items?.map(item => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span>{item.quantity}x {item.product?.name}</span>
                                <span className="text-muted-foreground">
                                  {(item.quantity * item.unit_price).toLocaleString()} MZN
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Delivery Info */}
                        {order.delivery_address && (
                          <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <span>{order.delivery_address}</span>
                          </div>
                        )}

                        {order.notes && (
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm">
                            <strong>Observações:</strong> {order.notes}
                          </div>
                        )}

                        {/* Totals */}
                        <div className="border-t border-border pt-3 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span>{order.subtotal.toLocaleString()} MZN</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Taxa de entrega</span>
                            <span>{order.delivery_fee.toLocaleString()} MZN</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Total</span>
                            <span>{order.total.toLocaleString()} MZN</span>
                          </div>
                        </div>

                        {/* Actions */}
                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <div className="flex gap-2 pt-2">
                            {order.status === 'pending' && (
                              <>
                                <Button 
                                  className="flex-1"
                                  onClick={() => updateOrderStatus(order.id, 'accepted')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Aceitar
                                </Button>
                                <Button 
                                  variant="destructive"
                                  onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            
                            {nextStatus && order.status !== 'pending' && (
                              <Button 
                                className="flex-1"
                                onClick={() => updateOrderStatus(order.id, nextStatus)}
                              >
                                Marcar como: {getStatusLabel(nextStatus)}
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
