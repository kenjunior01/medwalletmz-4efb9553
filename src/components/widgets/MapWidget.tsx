import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MapPin, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapLocation {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  type: 'store' | 'delivery' | 'driver' | 'customer';
}

interface MapWidgetProps {
  title?: string;
  locations: MapLocation[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: number;
  className?: string;
  showCount?: boolean;
}

// Custom icons for different location types
const createIcon = (type: string) => {
  const colors: Record<string, string> = {
    store: '#f97316',
    delivery: '#8b5cf6',
    driver: '#22c55e',
    customer: '#3b82f6'
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${colors[type] || '#6b7280'};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <div style="
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

export function MapWidget({ 
  title = "Mapa",
  locations, 
  center = { lat: -25.9692, lng: 32.5732 }, // Maputo default
  zoom = 13,
  height = 300,
  className,
  showCount = true
}: MapWidgetProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          {showCount && locations.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {locations.length} locais
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div style={{ height }} className="relative">
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={zoom}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`}
              tileSize={512}
              zoomOffset={-1}
            />
            {locations.map((location) => (
              <Marker 
                key={location.id}
                position={[location.lat, location.lng]}
                icon={createIcon(location.type)}
              >
                <Popup>
                  <div className="min-w-[150px]">
                    <p className="font-semibold text-sm">{location.title}</p>
                    {location.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {location.description}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          {/* Legend */}
          <div className="absolute bottom-3 left-3 bg-card/95 backdrop-blur rounded-lg p-2 z-[1000] shadow-lg">
            <div className="flex gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-food" />
                <span>Farmácias</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Entregadores</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
