import { useMemo } from 'react';

interface Props {
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  width?: number;
  height?: number;
  zoom?: number;
  className?: string;
}

export function StaticMapImage({ origin, destination, width = 600, height = 300, zoom = 14, className }: Props) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const url = useMemo(() => {
    if (!apiKey) return '';

    let baseUrl = `https://maps.googleapis.com/maps/api/staticmap?size=${width}x${height}&scale=2&key=${apiKey}&language=pt&region=MZ`;

    // Adicionar estilos "MedWallet" (Emerald/Dark)
    baseUrl += `&style=feature:all|element:labels.text.fill|color:0x333333`;
    baseUrl += `&style=feature:landscape|element:geometry|color:0xf5f5f5`;
    baseUrl += `&style=feature:road|element:geometry|color:0xffffff`;
    baseUrl += `&style=feature:water|element:geometry|color:0xc9d2d3`;
    baseUrl += `&style=feature:poi.park|element:geometry|color:0xe5e5e5`;

    if (origin && destination) {
      // Mostrar rota entre os dois pontos
      const markers = `&markers=color:red|label:U|${origin.lat},${origin.lng}&markers=color:green|label:F|${destination.lat},${destination.lng}`;
      const path = `&path=color:0x047857|weight:5|${origin.lat},${origin.lng}|${destination.lat},${destination.lng}`;
      return baseUrl + markers + path;
    } else if (destination) {
      // Apenas o destino
      return baseUrl + `&markers=color:green|${destination.lat},${destination.lng}&zoom=${zoom}`;
    }

    return '';
  }, [origin, destination, width, height, zoom, apiKey]);

  if (!url) return null;

  return (
    <div className={`overflow-hidden rounded-2xl bg-muted border border-border ${className}`}>
      <img
        src={url}
        alt="Mapa de localização"
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
}
