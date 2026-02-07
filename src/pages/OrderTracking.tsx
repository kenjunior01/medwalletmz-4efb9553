import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, MessageCircle, CheckCircle, Clock, ChefHat, Package, Truck, MapPin, Store, User, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { DeliveryTrackingMap } from '@/components/tracking/DeliveryTrackingMap';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface OrderDetails {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  delivery_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  store: {
    id: string;
    name: string;
    image_url: string | null;
    type: string;
    latitude: number | null;
    longitude: number | null;
    address: string | null;
  } | null;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    product: {
      name: string;
      image_url: string | null;
    } | null;
  }[];
}

interface DriverInfo {
  driver_id: string;
  status: string;
  assigned_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  profile: {
    full_name: string | null;
    phone: string | null;
    vehicle_type: string | null;
  } | null;
}

const statusSteps = [
  { key: 'pending', label: 'Pendente', icon: Clock, description: 'Aguardando confirmação' },
  { key: 'confirmed', label: 'Confirmado', icon: CheckCircle, description: 'Pedido aceite pela loja' },
  { key: 'preparing', label: 'A Preparar', icon: ChefHat, description: 'Seu pedido está a ser preparado' },
  { key: 'ready', label: 'Pronto', icon: Package, description: 'Pronto para recolha' },
  { key: 'in_transit', label: 'A Caminho', icon: Truck, description: 'Entregador a caminho' },
  { key: 'delivered', label: 'Entregue', icon: CheckCircle, description: 'Pedido entregue!' },
];

export default function OrderTracking() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { coordinates, requestLocation } = useLocation();
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coordinates) {
      requestLocation();
    }
  }, []);

  useEffect(() => {
    if (id && user) {
      fetchOrder();
      fetchDriver();
      
      // Subscribe to realtime updates
      const orderChannel = supabase
        .channel(`order-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${id}`
          },
          () => fetchOrder()
        )
        .subscribe();

      const driverChannel = supabase
        .channel(`driver-${id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'driver_assignments',
            filter: `order_id=eq.${id}`
          },
          () => fetchDriver()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(orderChannel);
        supabase.removeChannel(driverChannel);
      };
    }
  }, [id, user]);

  const fetchOrder = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total,
          subtotal,
          delivery_fee,
          delivery_address,
          notes,
          created_at,
          updated_at,
          store:stores(id, name, image_url, type, latitude, longitude, address),
          order_items(id, quantity, unit_price, product:products(name, image_url))
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setOrder(data as unknown as OrderDetails);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDriver = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('driver_assignments')
        .select(`
          driver_id,
          status,
          assigned_at,
          picked_up_at,
          delivered_at
        `)
        .eq('order_id', id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        // Fetch driver profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone, vehicle_type')
          .eq('user_id', data.driver_id)
          .single();
        
        setDriver({ ...data, profile });
      }
    } catch (error) {
      console.error('Error fetching driver:', error);
    }
  };

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    const index = statusSteps.findIndex(s => s.key === order.status);
    return index >= 0 ? index : 0;
  };

  const getProgress = () => {
    const currentIndex = getCurrentStepIndex();
    return ((currentIndex + 1) / statusSteps.length) * 100;
  };

  const getVehicleLabel = (type: string | null | undefined) => {
    const labels: Record<string, string> = {
      bicycle: '🚲 Bicicleta',
      motorcycle: '🏍️ Mota',
      car: '🚗 Carro'
    };
    return labels[type || 'motorcycle'] || '🏍️ Mota';
  };

  if (loading) {
    return (
      <div className="flex flex-col pb-24 animate-fade-in">
        <div className="flex items-center gap-3 p-4 border-b border-border bg-card sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <Package className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Pedido não encontrado</h2>
        <Button onClick={() => navigate('/orders')}>Ver Meus Pedidos</Button>
      </div>
    );
  }

  const currentStep = statusSteps[getCurrentStepIndex()];
  const CurrentIcon = currentStep.icon;
  const isDelivered = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="flex flex-col pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Acompanhar Pedido</h1>
          <p className="text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Card */}
        <Card className="overflow-hidden">
          <div className={`p-4 ${isDelivered ? 'bg-green-500' : isCancelled ? 'bg-red-500' : 'bg-primary'} text-white`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <CurrentIcon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">{currentStep.label}</h2>
                <p className="text-sm opacity-90">{currentStep.description}</p>
              </div>
            </div>
          </div>
          <CardContent className="p-4">
            <Progress value={getProgress()} className="h-2 mb-4" />
            
            {/* Status Timeline */}
            <div className="space-y-3">
              {statusSteps.map((step, index) => {
                const StepIcon = step.icon;
                const isComplete = index <= getCurrentStepIndex();
                const isCurrent = index === getCurrentStepIndex();
                
                if (index > getCurrentStepIndex() + 1) return null;
                
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isComplete ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                      <StepIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isComplete ? '' : 'text-muted-foreground'}`}>{step.label}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                    {isComplete && index < getCurrentStepIndex() && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Driver Info */}
        {driver && ['ready', 'in_transit'].includes(order.status) && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{driver.profile?.full_name || 'Entregador'}</h3>
                  <p className="text-sm text-muted-foreground">{getVehicleLabel(driver.profile?.vehicle_type)}</p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {driver.status === 'assigned' ? 'A caminho da loja' : 'A caminho de você'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {driver.profile?.phone && (
                    <>
                      <Button
                        size="icon"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => window.open(`tel:${driver.profile?.phone}`, '_blank')}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        className="rounded-full bg-green-500 hover:bg-green-600"
                        onClick={() => window.open(`https://wa.me/258${driver.profile?.phone?.replace(/\D/g, '')}`, '_blank')}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Map Tracking */}
        {['ready', 'in_transit'].includes(order.status) && (
          <DeliveryTrackingMap
            orderId={order.id}
            deliveryAddress={order.delivery_address || undefined}
            storeLocation={order.store?.latitude && order.store?.longitude ? {
              lat: order.store.latitude,
              lng: order.store.longitude,
              name: order.store.name
            } : undefined}
            userLocation={coordinates ? {
              lat: coordinates.latitude,
              lng: coordinates.longitude
            } : undefined}
          />
        )}

        {/* Store Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Store className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Loja</h3>
            </div>
            <div className="flex items-center gap-3">
              {order.store?.image_url ? (
                <img
                  src={order.store.image_url}
                  alt={order.store.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="font-medium">{order.store?.name}</p>
                {order.store?.address && (
                  <p className="text-sm text-muted-foreground">{order.store.address}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Address */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Endereço de Entrega</h3>
            </div>
            <p className="text-sm">{order.delivery_address || 'Não especificado'}</p>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Itens do Pedido</h3>
            </div>
            <div className="space-y-2">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span>{item.quantity}x {item.product?.name || 'Item'}</span>
                  <span className="font-medium">{item.unit_price * item.quantity} MZN</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{order.subtotal} MZN</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de Entrega</span>
                  <span>{order.delivery_fee} MZN</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-1">
                  <span>Total</span>
                  <span className="text-primary">{order.total} MZN</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Informações do Pedido</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Número do Pedido</span>
                <span className="font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data do Pedido</span>
                <span>{format(new Date(order.created_at), "dd MMM yyyy 'às' HH:mm", { locale: pt })}</span>
              </div>
              {order.notes && (
                <div className="pt-2 border-t border-border">
                  <p className="text-muted-foreground mb-1">Notas:</p>
                  <p>{order.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
