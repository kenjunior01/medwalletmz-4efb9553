import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, Navigation, Clock, MapPin, Truck } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const driverIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const storeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

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

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

export function DeliveryTrackingMap({ orderId, deliveryAddress, storeLocation, userLocation }: TrackingMapProps) {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  
  // Default center (Maputo)
  const defaultCenter: [number, number] = [-25.9692, 32.5732];
  
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

  const updateEstimatedTime = (driverLat: number, driverLng: number) => {
    if (!userLocation) return;
    
    // Calculate distance using Haversine formula
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

  const getMapCenter = (): [number, number] => {
    if (driverLocation) {
      return [driverLocation.lat, driverLocation.lng];
    }
    if (userLocation) {
      return [userLocation.lat, userLocation.lng];
    }
    return defaultCenter;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      assigned: 'A caminho da loja',
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
        <div className="h-64 rounded-lg overflow-hidden border border-border">
          <MapContainer
            center={getMapCenter()}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapUpdater center={getMapCenter()} />

            {/* Driver marker */}
            <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
              <Popup>
                <div className="text-center">
                  <strong>{driverLocation.driver_name}</strong>
                  <br />
                  <span className="text-sm">{getStatusLabel(driverLocation.status)}</span>
                </div>
              </Popup>
            </Marker>

            {/* Store marker */}
            {storeLocation && (
              <Marker position={[storeLocation.lat, storeLocation.lng]} icon={storeIcon}>
                <Popup>
                  <div className="text-center">
                    <strong>{storeLocation.name}</strong>
                    <br />
                    <span className="text-sm">Loja</span>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* User location marker */}
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={destinationIcon}>
                <Popup>
                  <div className="text-center">
                    <strong>Seu endereço</strong>
                    <br />
                    <span className="text-sm">Destino da entrega</span>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Route line */}
            {userLocation && (
              <Polyline
                positions={[
                  [driverLocation.lat, driverLocation.lng],
                  [userLocation.lat, userLocation.lng]
                ]}
                color="hsl(var(--primary))"
                weight={3}
                opacity={0.7}
                dashArray="10, 10"
              />
            )}
          </MapContainer>
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
              <span>Loja</span>
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
