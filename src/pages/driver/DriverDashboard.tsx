import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  MapPin, 
  Navigation, 
  Package, 
  Clock, 
  CheckCircle, 
  Phone,
  DollarSign,
  Truck,
  LogOut,
  Home,
  User,
  TrendingUp,
  Star
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  StatWidget, 
  EarningsWidget, 
  ActivityFeedWidget,
  ChartWidget,
  MapWidget
} from '@/components/widgets';

interface DriverProfile {
  full_name: string | null;
  phone: string | null;
  default_city: string | null;
  vehicle_type: string | null;
  is_available: boolean | null;
}

interface DeliveryAssignment {
  id: string;
  order_id: string;
  status: string;
  assigned_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  order: {
    id: string;
    total: number;
    delivery_fee: number;
    delivery_address: string | null;
    store: {
      name: string;
      address: string | null;
    };
  };
}

interface Stats {
  todayDeliveries: number;
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  totalDeliveries: number;
  rating: number;
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, signOut, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }
      fetchDriverData();
      startLocationTracking();
    }
  }, [user, authLoading]);

  const fetchDriverData = async () => {
    if (!user) return;

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, phone, default_city, vehicle_type, is_available')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      if (!profileData?.vehicle_type) {
        navigate('/driver/register');
        return;
      }

      setProfile(profileData);
      setIsOnline(profileData.is_available || false);

      // Fetch assignments
      const { data: assignmentsData } = await supabase
        .from('driver_assignments')
        .select(`
          *,
          order:orders(
            id,
            total,
            delivery_fee,
            delivery_address,
            store:stores(name, address)
          )
        `)
        .eq('driver_id', user.id)
        .in('status', ['assigned', 'picked_up'])
        .order('assigned_at', { ascending: false });

      setAssignments(assignmentsData || []);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const { data: todayData } = await supabase
        .from('driver_assignments')
        .select('order:orders(delivery_fee)')
        .eq('driver_id', user.id)
        .eq('status', 'delivered')
        .gte('delivered_at', today.toISOString());

      const { data: weekData } = await supabase
        .from('driver_assignments')
        .select('order:orders(delivery_fee), delivered_at')
        .eq('driver_id', user.id)
        .eq('status', 'delivered')
        .gte('delivered_at', weekAgo.toISOString());

      const { data: monthData } = await supabase
        .from('driver_assignments')
        .select('order:orders(delivery_fee)')
        .eq('driver_id', user.id)
        .eq('status', 'delivered')
        .gte('delivered_at', monthAgo.toISOString());

      const { count: totalDeliveries } = await supabase
        .from('driver_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('driver_id', user.id)
        .eq('status', 'delivered');

      const todayDeliveries = todayData?.length || 0;
      const todayEarnings = todayData?.reduce((sum, d) => sum + (d.order?.delivery_fee || 0), 0) || 0;
      const weekEarnings = weekData?.reduce((sum, d) => sum + (d.order?.delivery_fee || 0), 0) || 0;
      const monthEarnings = monthData?.reduce((sum, d) => sum + (d.order?.delivery_fee || 0), 0) || 0;

      // Group weekly data by day
      const dailyMap = new Map<string, number>();
      weekData?.forEach(delivery => {
        if (delivery.delivered_at) {
          const day = new Date(delivery.delivered_at).toLocaleDateString('pt-MZ', { weekday: 'short' });
          dailyMap.set(day, (dailyMap.get(day) || 0) + (delivery.order?.delivery_fee || 0));
        }
      });
      setWeeklyData(Array.from(dailyMap.entries()).map(([name, value]) => ({ name, value })));

      setStats({
        todayDeliveries,
        todayEarnings,
        weekEarnings,
        monthEarnings,
        totalDeliveries: totalDeliveries || 0,
        rating: 4.8
      });

      // Set up realtime subscription
      const channel = supabase
        .channel('driver-assignments')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'driver_assignments',
            filter: `driver_id=eq.${user.id}`
          },
          () => {
            fetchDriverData();
            toast.info('Nova entrega atribuída!');
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error fetching driver data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = useCallback(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          
          // Update location in database for active assignments
          if (user && assignments.length > 0) {
            assignments.forEach(async (assignment) => {
              await supabase
                .from('driver_assignments')
                .update({
                  current_latitude: latitude,
                  current_longitude: longitude
                })
                .eq('id', assignment.id);
            });
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [user, assignments]);

  const toggleOnlineStatus = async () => {
    if (!user) return;

    try {
      const newStatus = !isOnline;
      const { error } = await supabase
        .from('profiles')
        .update({ is_available: newStatus })
        .eq('user_id', user.id);

      if (error) throw error;

      setIsOnline(newStatus);
      toast.success(newStatus ? 'Você está online!' : 'Você está offline');
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const updateAssignmentStatus = async (assignmentId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'picked_up') {
        updateData.picked_up_at = new Date().toISOString();
      } else if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('driver_assignments')
        .update(updateData)
        .eq('id', assignmentId);

      if (error) throw error;

      // Also update order status
      const assignment = assignments.find(a => a.id === assignmentId);
      if (assignment) {
        const orderStatus = newStatus === 'picked_up' ? 'out_for_delivery' : 'delivered';
        await supabase
          .from('orders')
          .update({ status: orderStatus })
          .eq('id', assignment.order_id);
      }

      toast.success(
        newStatus === 'picked_up' 
          ? 'Pedido retirado! Iniciando entrega...' 
          : 'Entrega concluída!'
      );
      
      fetchDriverData();
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  const activityItems = assignments.map(a => ({
    id: a.id,
    title: a.order?.store?.name || 'Entrega',
    description: a.order?.delivery_address || 'Endereço não informado',
    time: new Date(a.assigned_at).toLocaleString('pt-MZ'),
    type: 'delivery' as const,
    status: a.status === 'picked_up' ? 'Em Entrega' : 'Aguardando'
  }));

  const mapLocations = currentLocation ? [
    {
      id: 'driver',
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      title: 'Sua Localização',
      type: 'driver' as const
    }
  ] : [];

  // Desktop Layout
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <User className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{profile?.full_name || 'Entregador'}</h1>
                <p className="text-primary-foreground/80">{profile?.default_city} • {profile?.vehicle_type}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {currentLocation && (
                <div className="flex items-center gap-2 text-primary-foreground/80">
                  <Navigation className="h-5 w-5" />
                  <span>GPS Ativo</span>
                </div>
              )}
              <div className="flex items-center gap-3 bg-primary-foreground/10 rounded-xl px-4 py-2">
                <span>{isOnline ? 'Online' : 'Offline'}</span>
                <Switch 
                  checked={isOnline} 
                  onCheckedChange={toggleOnlineStatus}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
              <Button variant="secondary" onClick={() => navigate('/')}>
                <Home className="h-4 w-4 mr-2" />
                Cliente
              </Button>
              <Button variant="ghost" className="text-primary-foreground" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatWidget 
              title="Entregas Hoje"
              value={stats?.todayDeliveries || 0}
              subtitle="Concluídas"
              icon={Package}
              colorClass="text-primary"
            />
            <StatWidget 
              title="Total de Entregas"
              value={stats?.totalDeliveries || 0}
              subtitle="Desde o início"
              icon={Truck}
              colorClass="text-blue-500"
            />
            <StatWidget 
              title="Avaliação"
              value={`${stats?.rating || 0} ⭐`}
              subtitle="Média geral"
              icon={Star}
              colorClass="text-yellow-500"
            />
            <StatWidget 
              title="Ganhos Hoje"
              value={`${(stats?.todayEarnings || 0).toLocaleString()} MZN`}
              subtitle={`Semana: ${(stats?.weekEarnings || 0).toLocaleString()} MZN`}
              icon={DollarSign}
              colorClass="text-green-500"
              trend={{ value: 15, isPositive: true }}
            />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Earnings Widget */}
              <EarningsWidget 
                earnings={{
                  today: stats?.todayEarnings || 0,
                  week: stats?.weekEarnings || 0,
                  month: stats?.monthEarnings || 0
                }}
                trend={15}
              />

              {/* Active Deliveries */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Entregas Ativas
                    <Badge variant={isOnline ? "default" : "secondary"}>
                      {isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {assignments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>{isOnline ? 'Aguardando novas entregas...' : 'Fique online para receber entregas'}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {assignments.map(assignment => (
                        <Card key={assignment.id} className="border-l-4 border-l-primary">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="font-semibold">{assignment.order?.store?.name}</h3>
                                <Badge variant={assignment.status === 'picked_up' ? 'default' : 'secondary'}>
                                  {assignment.status === 'picked_up' ? 'Em Entrega' : 'Aguardando Retirada'}
                                </Badge>
                              </div>
                              <span className="text-lg font-bold text-green-500">
                                {assignment.order?.delivery_fee?.toLocaleString()} MZN
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                                <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Retirar em</p>
                                  <p className="text-sm">{assignment.order?.store?.address || 'N/A'}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                                <Navigation className="h-5 w-5 text-green-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Entregar em</p>
                                  <p className="text-sm">{assignment.order?.delivery_address || 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                            <Button 
                              className="w-full"
                              variant={assignment.status === 'picked_up' ? 'default' : 'secondary'}
                              onClick={() => updateAssignmentStatus(
                                assignment.id, 
                                assignment.status === 'picked_up' ? 'delivered' : 'picked_up'
                              )}
                            >
                              {assignment.status === 'picked_up' ? (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Entrega Concluída
                                </>
                              ) : (
                                <>
                                  <Package className="h-4 w-4 mr-2" />
                                  Retirei o Pedido
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Weekly Chart */}
              <ChartWidget 
                title="Ganhos da Semana"
                subtitle="Últimos 7 dias"
                data={weeklyData}
                type="bar"
                height={250}
              />
            </div>

            <div className="space-y-6">
              {/* Map */}
              <MapWidget 
                title="Sua Localização"
                locations={mapLocations}
                center={currentLocation || { lat: -25.9692, lng: 32.5732 }}
                height={300}
              />

              {/* Activity */}
              <ActivityFeedWidget 
                title="Entregas Recentes"
                activities={activityItems}
                maxHeight={350}
                emptyMessage="Nenhuma entrega ativa"
              />

              {/* Quick Actions */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/driver/history')}>
                    <Clock className="h-4 w-4 mr-3" />
                    Histórico de Entregas
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Phone className="h-4 w-4 mr-3" />
                    Suporte
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile Layout (existing)
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold">{profile?.full_name || 'Entregador'}</h1>
              <p className="text-sm opacity-80">{profile?.default_city}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">{isOnline ? 'Online' : 'Offline'}</span>
            <Switch 
              checked={isOnline} 
              onCheckedChange={toggleOnlineStatus}
              className="data-[state=checked]:bg-green-500"
            />
          </div>
        </div>

        {/* Location indicator */}
        {currentLocation && (
          <div className="flex items-center gap-2 text-sm opacity-80">
            <Navigation className="h-4 w-4" />
            <span>GPS ativo</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats?.todayDeliveries || 0}</p>
            <p className="text-xs text-muted-foreground">Entregas Hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{stats?.todayEarnings?.toLocaleString() || 0}</p>
            <p className="text-xs text-muted-foreground">MZN Hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Truck className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{stats?.totalDeliveries || 0}</p>
            <p className="text-xs text-muted-foreground">Total Entregas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <span className="text-2xl">⭐</span>
            <p className="text-2xl font-bold">{stats?.rating || '—'}</p>
            <p className="text-xs text-muted-foreground">Avaliação</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Deliveries */}
      <div className="p-4">
        <h2 className="text-lg font-bold mb-3">Entregas Ativas</h2>
        
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Sem entregas no momento</h3>
              <p className="text-sm text-muted-foreground">
                {isOnline 
                  ? 'Aguardando novas entregas...' 
                  : 'Fique online para receber entregas'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {assignments.map(assignment => (
              <Card key={assignment.id} className="border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {assignment.order?.store?.name}
                    </CardTitle>
                    <Badge variant={assignment.status === 'picked_up' ? 'default' : 'secondary'}>
                      {assignment.status === 'picked_up' ? 'Em Entrega' : 'Aguardando Retirada'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Pickup Location */}
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Retirar em</p>
                      <p className="text-sm font-medium">{assignment.order?.store?.address || 'Endereço não informado'}</p>
                    </div>
                  </div>

                  {/* Delivery Location */}
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <Navigation className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Entregar em</p>
                      <p className="text-sm font-medium">{assignment.order?.delivery_address || 'Endereço não informado'}</p>
                    </div>
                  </div>

                  {/* Earnings */}
                  <div className="flex items-center justify-between py-2 border-t border-border">
                    <span className="text-sm text-muted-foreground">Valor da entrega:</span>
                    <span className="font-bold text-green-500">
                      {assignment.order?.delivery_fee?.toLocaleString()} MZN
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {assignment.status === 'assigned' ? (
                      <Button 
                        className="flex-1"
                        onClick={() => updateAssignmentStatus(assignment.id, 'picked_up')}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Retirei o Pedido
                      </Button>
                    ) : (
                      <Button 
                        className="flex-1 bg-green-500 hover:bg-green-600"
                        onClick={() => updateAssignmentStatus(assignment.id, 'delivered')}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Entrega Concluída
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-2">
        <div className="flex justify-around">
          <Button variant="ghost" className="flex-col gap-1 h-auto py-2" onClick={() => navigate('/')}>
            <Home className="h-5 w-5" />
            <span className="text-xs">Início</span>
          </Button>
          <Button variant="ghost" className="flex-col gap-1 h-auto py-2 text-primary">
            <Truck className="h-5 w-5" />
            <span className="text-xs">Entregas</span>
          </Button>
          <Button variant="ghost" className="flex-col gap-1 h-auto py-2" onClick={() => navigate('/driver/history')}>
            <Clock className="h-5 w-5" />
            <span className="text-xs">Histórico</span>
          </Button>
          <Button variant="ghost" className="flex-col gap-1 h-auto py-2 text-destructive" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
            <span className="text-xs">Sair</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
