import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Package, CheckCircle, Clock, DollarSign } from 'lucide-react';

interface DeliveryHistory {
  id: string;
  status: string;
  assigned_at: string;
  delivered_at: string | null;
  order: {
    id: string;
    total: number;
    delivery_fee: number;
    delivery_address: string | null;
    store: {
      name: string;
    };
  };
}

export default function DriverHistory() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ count: 0, earnings: 0 });

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }
      fetchHistory();
    }
  }, [user, authLoading]);

  const fetchHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('driver_assignments')
        .select(`
          *,
          order:orders(
            id,
            total,
            delivery_fee,
            delivery_address,
            store:stores(name)
          )
        `)
        .eq('driver_id', user.id)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setDeliveries(data || []);
      
      const count = data?.length || 0;
      const earnings = data?.reduce((sum, d) => sum + (d.order?.delivery_fee || 0), 0) || 0;
      setTotals({ count, earnings });
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/driver/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">Histórico de Entregas</h1>
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{totals.count}</p>
            <p className="text-xs text-muted-foreground">Entregas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{totals.earnings.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">MZN Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Deliveries List */}
      <div className="p-4">
        {deliveries.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Sem entregas ainda</h3>
            <p className="text-sm text-muted-foreground">
              Suas entregas concluídas aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliveries.map(delivery => (
              <Card key={delivery.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{delivery.order?.store?.name}</span>
                    </div>
                    <Badge variant="secondary">Entregue</Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                    {delivery.order?.delivery_address}
                  </p>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {delivery.delivered_at 
                        ? new Date(delivery.delivered_at).toLocaleDateString('pt-MZ', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '—'
                      }
                    </div>
                    <span className="font-bold text-green-500">
                      +{delivery.order?.delivery_fee?.toLocaleString()} MZN
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
