import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MapPin } from 'lucide-react';
import { GoogleMap } from '@/components/maps/GoogleMap';

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
const TYPE_COLORS: Record<string, string> = {
  store: '#f97316',
  delivery: '#8b5cf6',
  driver: '#22c55e',
  customer: '#3b82f6',
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
          <GoogleMap
            center={center}
            zoom={zoom}
            height={height}
            markers={locations.map((l) => ({
              id: l.id,
              lat: l.lat,
              lng: l.lng,
              title: l.title,
              description: l.description,
              color: TYPE_COLORS[l.type] || '#6b7280',
            }))}
          />
        </div>
      </CardContent>
    </Card>
  );
}
