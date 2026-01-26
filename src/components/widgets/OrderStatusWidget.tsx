import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  CheckCircle, 
  Truck, 
  Package, 
  XCircle,
  ChefHat
} from 'lucide-react';

interface OrderStatus {
  status: string;
  count: number;
}

interface OrderStatusWidgetProps {
  title?: string;
  statuses: OrderStatus[];
  total: number;
  className?: string;
}

const statusConfig: Record<string, { 
  icon: typeof Clock; 
  color: string; 
  bgColor: string;
  label: string;
}> = {
  pending: { 
    icon: Clock, 
    color: 'text-yellow-600', 
    bgColor: 'bg-yellow-100',
    label: 'Pendentes'
  },
  accepted: { 
    icon: CheckCircle, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-100',
    label: 'Aceitos'
  },
  preparing: { 
    icon: ChefHat, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-100',
    label: 'Preparando'
  },
  ready: { 
    icon: Package, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-100',
    label: 'Prontos'
  },
  out_for_delivery: { 
    icon: Truck, 
    color: 'text-indigo-600', 
    bgColor: 'bg-indigo-100',
    label: 'Em Entrega'
  },
  delivered: { 
    icon: CheckCircle, 
    color: 'text-green-600', 
    bgColor: 'bg-green-100',
    label: 'Entregues'
  },
  cancelled: { 
    icon: XCircle, 
    color: 'text-red-600', 
    bgColor: 'bg-red-100',
    label: 'Cancelados'
  }
};

export function OrderStatusWidget({ 
  title = "Status dos Pedidos",
  statuses, 
  total,
  className 
}: OrderStatusWidgetProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          {title}
          <Badge variant="outline" className="text-xs">
            {total} total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {statuses.map((item) => {
            const config = statusConfig[item.status] || statusConfig.pending;
            const percentage = total > 0 ? (item.count / total) * 100 : 0;
            const Icon = config.icon;

            return (
              <div key={item.status} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      config.bgColor
                    )}>
                      <Icon className={cn("h-4 w-4", config.color)} />
                    </div>
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{item.count}</span>
                    <span className="text-xs text-muted-foreground">
                      ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
                <Progress 
                  value={percentage} 
                  className="h-2"
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
