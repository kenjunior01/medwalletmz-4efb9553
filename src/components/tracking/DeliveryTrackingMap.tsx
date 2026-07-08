import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GoogleMap } from '@/components/maps/GoogleMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigation, Clock, MapPin, Truck } from 'lucide-react';
import { fetchRouteDistance, fmtDuration } from '@/lib/googleRoutes';

interface DriverLocation {
  lat: number;
  lng: number;
  status: string;
  driver_name?: string;
  vehicle_type?: string;
}

interface TrackingMapProps {
  orderId: string;
  deliveryAddress?: string;
  storeLocation?: { lat: number; lng: number; name: string };
  userLocation?: { lat: number; lng: number };
}

export function DeliveryTrackingMap({ orderId, deliveryAddress, storeLocation, userLocation }: TrackingMapProps) {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  const [encodedPolyline, setEncodedPolyline] = useState<string | undefined>();

  const defaultCenter = { lat: -25.9692, lng: 32.5732 };
  
  useEffect(() => {
    fetchDriverLocation();
    
    // Set up realtime subscription for driver location
    const channel = supabase
      .channel(`driver-tracking-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'driver_assignments',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          const { current_latitude, current_longitude, status } = payload.new as any;
          if (current_latitude && current_longitude) {
            setDriverLocation(prev => ({
              ...prev,
              lat: current_latitude,
              lng: current_longitude,
              status
            }));
            updateEstimatedTime(current_latitude, current_longitude);
          }
        }
      )
      .subscribe();

    // Poll every 10 seconds as backup
    const interval = setInterval(fetchDriverLocation, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [orderId]);

  const fetchDriverLocation = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_assignments')
        .select(`
          current_latitude,
          current_longitude,
          status,
          driver_id
        `)
        .eq('order_id', orderId)
        .maybeSingle();

      if (error) throw error;

      // No driver assignment yet
      if (!data) {
        setDriverLocation(null);
        return;
      }

      // Driver exists but hasn't shared location yet
      if (!data.current_latitude || !data.current_longitude) {
        setDriverLocation(null);
        return;
      }

      // Get driver profile for name (may not exist)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, vehicle_type')
        .eq('user_id', data.driver_id)
        .maybeSingle();

      if (profileError) {
        console.warn('Failed to fetch driver profile:', profileError);
      }

      setDriverLocation({
        lat: data.current_latitude,
        lng: data.current_longitude,
        status: data.status,
        driver_name: profile?.full_name || 'Entregador',
        vehicle_type: profile?.vehicle_type || 'motorcycle'
      });

      updateEstimatedTime(data.current_latitude, data.current_longitude);
    } catch (error) {
      console.error('Error fetching driver location:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateEstimatedTime = async (driverLat: number, driverLng: number) => {
    if (!userLocation) return;
    
    // Use real route distance/time if available
    const route = await fetchRouteDistance(
      { lat: driverLat, lng: driverLng },
      { lat: userLocation.lat, lng: userLocation.lng },
      'pharmacy', // generic kind for tracking
      orderId
    );

    if (route) {
      setEstimatedTime(fmtDuration(route.durationSeconds));
      setEncodedPolyline(route.polyline);
      return;
    }

    // Fallback to Haversine
    const R = 6371; // Earth's radius in km
    const dLat = (userLocation.lat - driverLat) * Math.PI / 180;
    const dLon = (userLocation.lng - driverLng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(driverLat * Math.PI / 180) * Math.cos(userLocation.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Estimate time (assuming 30 km/h average speed in city)
    const timeMinutes = Math.ceil((distance / 30) * 60);
    
    if (timeMinutes < 1) {
      setEstimatedTime('Chegando...');
    } else if (timeMinutes < 60) {
      setEstimatedTime(`${timeMinutes} min`);
    } else {
      setEstimatedTime(`${Math.ceil(timeMinutes / 60)}h ${timeMinutes % 60}min`);
    }
  };

  const getMapCenter = () => {
    if (driverLocation) return { lat: driverLocation.lat, lng: driverLocation.lng };
    if (userLocation) return userLocation;
    return defaultCenter;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      assigned: 'A caminho da farmácia',
      picked_up: 'A caminho de você',
      delivered: 'Entregue'
    };
    return labels[status] || status;
  };

  const getVehicleLabel = (type: string) => {
    const labels: Record<string, string> = {
      bicycle: 'Bicicleta',
      motorcycle: 'Mota',
      car: 'Carro'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Rastreamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!driverLocation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Rastreamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
            <div className="text-center">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                Aguardando entregador...
              </p>
              <p className="text-sm text-muted-foreground">
                O rastreamento será ativado quando o entregador iniciar
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            Rastreamento ao Vivo
          </CardTitle>
          <Badge variant="default" className="bg-primary text-primary-foreground">
            {getStatusLabel(driverLocation.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Driver Info */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Truck className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{driverLocation.driver_name}</p>
            <p className="text-sm text-muted-foreground">
              {getVehicleLabel(driverLocation.vehicle_type || 'motorcycle')}
            </p>
          </div>
          {estimatedTime && (
            <div className="text-right">
              <div className="flex items-center gap-1 text-primary">
                <Clock className="h-4 w-4" />
                <span className="font-bold">{estimatedTime}</span>
              </div>
              <p className="text-xs text-muted-foreground">tempo estimado</p>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="h-64 rounded-lg overflow-hidden border border-border relative">
          <GoogleMap
            center={getMapCenter()}
            zoom={14}
            height="100%"
            markers={[
              { id: 'driver', lat: driverLocation.lat, lng: driverLocation.lng, title: driverLocation.driver_name, description: getStatusLabel(driverLocation.status), color: '#22c55e' },
              ...(storeLocation ? [{ id: 'store', lat: storeLocation.lat, lng: storeLocation.lng, title: storeLocation.name, description: 'Farmácia', color: '#f97316' }] : []),
              ...(userLocation ? [{ id: 'dest', lat: userLocation.lat, lng: userLocation.lng, title: 'Seu endereço', description: 'Destino da entrega', color: '#3b82f6' }] : []),
            ]}
            encodedPolyline={encodedPolyline}
            polyline={!encodedPolyline && userLocation ? [{ lat: driverLocation.lat, lng: driverLocation.lng }, userLocation] : undefined}
          />

          {userLocation && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-2 right-2 h-8 text-[10px] gap-1 shadow-lg border-primary/20"
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${userLocation.lat},${userLocation.lng}&travelmode=driving`, '_blank')}
            >
              <Navigation className="h-3 w-3" /> Abrir no Google Maps
            </Button>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>Entregador</span>
          </div>
          {storeLocation && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-secondary" />
              <span>Farmácia</span>
            </div>
          )}
          {userLocation && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent" />
              <span>Destino</span>
            </div>
          )}
        </div>

        {/* Delivery Address */}
        {deliveryAddress && (
          <div className="flex items-start gap-2 pt-2 border-t border-border">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Entregar em:</p>
              <p className="text-sm font-medium">{deliveryAddress}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
