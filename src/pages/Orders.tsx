import { ClipboardList, Package, CheckCircle, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const mockOrders = [
  {
    id: "ORD-001",
    store: "Pizza Express",
    items: ["Pizza Margherita", "Coca-Cola"],
    total: 620,
    status: "delivered",
    date: "22 Jan 2026",
    time: "14:30",
  },
  {
    id: "ORD-002",
    store: "Supermercado Central",
    items: ["Arroz 5kg", "Leite", "Pão"],
    total: 485,
    status: "in_progress",
    date: "22 Jan 2026",
    time: "10:15",
  },
];

const statusConfig = {
  pending: { label: "Pendente", color: "bg-yellow-500", icon: Clock },
  in_progress: { label: "A Caminho", color: "bg-blue-500", icon: Package },
  delivered: { label: "Entregue", color: "bg-green-500", icon: CheckCircle },
};

export default function Orders() {
  if (mockOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 animate-fade-in">
        <div className="p-6 bg-muted rounded-full mb-4">
          <ClipboardList className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold mb-2">Sem Pedidos</h2>
        <p className="text-muted-foreground text-center text-sm">
          Ainda não fizeste nenhum pedido
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      <h1 className="text-2xl font-bold">Meus Pedidos</h1>

      <div className="flex flex-col gap-3">
        {mockOrders.map((order) => {
          const status = statusConfig[order.status as keyof typeof statusConfig];
          const StatusIcon = status.icon;

          return (
            <div
              key={order.id}
              className="bg-card rounded-xl border border-border p-4 space-y-3 transition-all hover:shadow-medium"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{order.store}</h3>
                  <p className="text-xs text-muted-foreground">
                    {order.date} às {order.time}
                  </p>
                </div>
                <Badge
                  className={`${status.color} text-white gap-1`}
                >
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
              </div>

              {/* Items */}
              <div className="text-sm text-muted-foreground">
                {order.items.join(", ")}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">{order.id}</span>
                <span className="font-bold text-primary">{order.total} MZN</span>
              </div>

              {/* Tracking for in progress */}
              {order.status === "in_progress" && (
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded-lg">
                  <MapPin className="h-4 w-4" />
                  <span>O entregador está a caminho...</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
