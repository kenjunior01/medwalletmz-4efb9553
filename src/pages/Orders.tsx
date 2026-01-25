import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Package, CheckCircle, Clock, MapPin, XCircle, Truck, ChefHat, RefreshCw, Star, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewModal } from "@/components/reviews/ReviewModal";
import { DeliveryTrackingMap } from "@/components/tracking/DeliveryTrackingMap";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface OrderWithStore {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  delivery_address: string | null;
  notes: string | null;
  created_at: string;
  store: {
    id: string;
    name: string;
    image_url: string | null;
    type: string;
  } | null;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    product: {
      name: string;
    } | null;
  }[];
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "bg-yellow-500", icon: Clock },
  confirmed: { label: "Confirmado", color: "bg-blue-500", icon: CheckCircle },
  preparing: { label: "A Preparar", color: "bg-orange-500", icon: ChefHat },
  ready: { label: "Pronto", color: "bg-purple-500", icon: Package },
  in_transit: { label: "A Caminho", color: "bg-cyan-500", icon: Truck },
  delivered: { label: "Entregue", color: "bg-green-500", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "bg-red-500", icon: XCircle },
};

export default function Orders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [reviewModal, setReviewModal] = useState<{
    open: boolean;
    orderId: string;
    storeId: string;
    storeName: string;
  }>({ open: false, orderId: '', storeId: '', storeName: '' });

  useEffect(() => {
    if (user) {
      fetchOrders();
      // Subscribe to realtime updates
      const channel = supabase
        .channel("orders-updates")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;

    try {
      // Fetch orders and reviews separately
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          status,
          total,
          subtotal,
          delivery_fee,
          delivery_address,
          notes,
          created_at,
          store:stores(id, name, image_url, type),
          order_items(id, quantity, unit_price, product:products(name))
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;
      setOrders((ordersData as unknown as OrderWithStore[]) || []);
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = orders.filter((o) =>
    ["pending", "confirmed", "preparing", "ready", "in_transit"].includes(o.status)
  );
  const pastOrders = orders.filter((o) =>
    ["delivered", "cancelled"].includes(o.status)
  );

  // Not logged in
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 animate-fade-in">
        <div className="p-6 bg-muted rounded-full mb-4">
          <ClipboardList className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold mb-2">Faça Login</h2>
        <p className="text-muted-foreground text-center text-sm mb-4">
          Entre na sua conta para ver seus pedidos
        </p>
        <Button onClick={() => navigate("/auth")}>Entrar</Button>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4 animate-fade-in">
        <h1 className="text-2xl font-bold">Meus Pedidos</h1>
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 animate-fade-in">
        <div className="p-6 bg-muted rounded-full mb-4">
          <ClipboardList className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold mb-2">Sem Pedidos</h2>
        <p className="text-muted-foreground text-center text-sm mb-4">
          Ainda não fizeste nenhum pedido
        </p>
        <Button onClick={() => navigate("/food")}>Explorar Restaurantes</Button>
      </div>
    );
  }

  const renderOrder = (order: OrderWithStore) => {
    const status = statusConfig[order.status] || statusConfig.pending;
    const StatusIcon = status.icon;
    const itemNames = order.order_items
      .map((item) => `${item.quantity}x ${item.product?.name || "Item"}`)
      .slice(0, 3);

    return (
      <div
        key={order.id}
        className="bg-card rounded-xl border border-border p-4 space-y-3 transition-all hover:shadow-medium"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {order.store?.image_url ? (
                <img
                  src={order.store.image_url}
                  alt={order.store.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold">{order.store?.name || "Loja"}</h3>
              <p className="text-xs text-muted-foreground">
                {format(new Date(order.created_at), "dd MMM yyyy 'às' HH:mm", { locale: pt })}
              </p>
            </div>
          </div>
          <Badge className={`${status.color} text-white gap-1`}>
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>

        {/* Items */}
        <div className="text-sm text-muted-foreground">
          {itemNames.join(", ")}
          {order.order_items.length > 3 && ` +${order.order_items.length - 3} mais`}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">
            #{order.id.slice(0, 8).toUpperCase()}
          </span>
          <span className="font-bold text-primary">{order.total} MZN</span>
        </div>

        {/* Tracking for active orders */}
        {order.status === "in_transit" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-cyan-600 bg-cyan-50 dark:bg-cyan-950 p-2 rounded-lg">
              <Navigation className="h-4 w-4 animate-pulse" />
              <span>O entregador está a caminho!</span>
            </div>
            <DeliveryTrackingMap
              orderId={order.id}
              deliveryAddress={order.delivery_address || undefined}
            />
          </div>
        )}

        {order.status === "preparing" && (
          <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 dark:bg-orange-950 p-2 rounded-lg">
            <ChefHat className="h-4 w-4" />
            <span>O seu pedido está a ser preparado</span>
          </div>
        )}

        {/* Review button for delivered orders */}
        {order.status === "delivered" && order.store && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => setReviewModal({
              open: true,
              orderId: order.id,
              storeId: order.store!.id,
              storeName: order.store!.name
            })}
          >
            <Star className="h-4 w-4" />
            Avaliar Pedido
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meus Pedidos</h1>
        <Button variant="ghost" size="icon" onClick={fetchOrders}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            Ativos {activeOrders.length > 0 && `(${activeOrders.length})`}
          </TabsTrigger>
          <TabsTrigger value="history">
            Histórico {pastOrders.length > 0 && `(${pastOrders.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="flex flex-col gap-3 mt-4">
          {activeOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum pedido ativo</p>
            </div>
          ) : (
            activeOrders.map(renderOrder)
          )}
        </TabsContent>

        <TabsContent value="history" className="flex flex-col gap-3 mt-4">
          {pastOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum pedido no histórico</p>
            </div>
          ) : (
            pastOrders.map(renderOrder)
          )}
        </TabsContent>
      </Tabs>

      {/* Review Modal */}
      <ReviewModal
        open={reviewModal.open}
        onOpenChange={(open) => setReviewModal(prev => ({ ...prev, open }))}
        orderId={reviewModal.orderId}
        storeId={reviewModal.storeId}
        storeName={reviewModal.storeName}
        onSuccess={fetchOrders}
      />
    </div>
  );
}
