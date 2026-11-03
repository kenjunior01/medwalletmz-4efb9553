/**
 * NearbyHealthList — "Saúde perto de si" a partir dos dados da plataforma
 * (clínicas, hospitais, farmácias e laboratórios com coordenadas).
 * Distância calculada em Haversine — gratuito, sem chamadas externas.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, ExternalLink, Building2 } from '@/components/icons/lucide-compat';
import { useLocation } from '@/contexts/LocationContext';
import { haversineKm } from '@/lib/openRoutes';

interface NearbyItem {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  lat: number;
  lng: number;
  rating: number | null;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'lab';
}

const TYPE_LABELS: Record<NearbyItem['type'], string> = {
  hospital: 'Hospital',
  clinic: 'Clínica',
  pharmacy: 'Farmácia',
  lab: 'Laboratório',
};

export function NearbyHealthList({
  max = 10,
  radiusMeters = 5000,
}: {
  max?: number;
  radiusMeters?: number;
}) {
  const { coordinates } = useLocation();
  const [items, setItems] = useState<NearbyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coordinates) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const radiusKm = radiusMeters / 1000;
    const load = async () => {
      const all: NearbyItem[] = [];
      try {
        const { data: clinics } = await supabase
          .from('clinics')
          .select('id,name,address,city,latitude,longitude,type,avg_rating,rating')
          .eq('is_active', true)
          .not('latitude', 'is', null)
          .limit(500);
        for (const c of clinics ?? []) {
          const type = c.type === 'hospital' ? 'hospital' : c.type === 'laboratory' ? 'lab' : 'clinic';
          all.push({
            id: `clinic-${c.id}`,
            name: c.name,
            address: c.address ?? null,
            city: c.city ?? null,
            lat: Number(c.latitude),
            lng: Number(c.longitude),
            rating: c.avg_rating != null ? Number(c.avg_rating) : c.rating != null ? Number(c.rating) : null,
            type: type as NearbyItem['type'],
          });
        }
        const { data: stores } = await supabase
          .from('stores')
          .select('id,name,address,city,latitude,longitude,rating')
          .eq('type', 'pharmacy')
          .eq('is_active', true)
          .not('latitude', 'is', null)
          .limit(400);
        for (const s of stores ?? []) {
          all.push({
            id: `store-${s.id}`,
            name: s.name,
            address: s.address ?? null,
            city: s.city ?? null,
            lat: Number(s.latitude),
            lng: Number(s.longitude),
            rating: s.rating != null ? Number(s.rating) : null,
            type: 'pharmacy',
          });
        }
        if (cancelled) return;
        const nearby = all
          .map((p) => ({ ...p, dist: haversineKm({ lat: coordinates.latitude, lng: coordinates.longitude }, { lat: p.lat, lng: p.lng }) }))
          .filter((p) => p.dist * 1000 <= radiusMeters)
          .sort((a, b) => a.dist - b.dist)
          .slice(0, max);
        setItems(nearby);
        if (nearby.length === 0) {
          setError('Não encontramos serviços de saúde próximos da sua localização. Aumente o raio de pesquisa.');
        }
      } catch {
        if (!cancelled) setError('Erro ao procurar serviços de saúde. Tente novamente.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [coordinates?.latitude, coordinates?.longitude, max, radiusMeters]);

  if (!coordinates) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
        Ative a sua localização para ver serviços de saúde perto de si.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">{error}</div>;
  }

  return (
    <div className="space-y-2">
      {items.map((p) => {
        const distM = haversineKm({ lat: coordinates.latitude, lng: coordinates.longitude }, { lat: p.lat, lng: p.lng }) * 1000;
        return (
          <div
            key={p.id}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition-shadow"
          >
            <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{p.name}</p>
              <p className="text-xs text-slate-500 truncate">{p.address || p.city || 'Sem morada'}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[p.type]}</Badge>
                {typeof p.rating === 'number' && p.rating > 0 && (
                  <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                    {p.rating.toFixed(1)}
                  </span>
                )}
                <span className="text-[10px] text-slate-400">
                  {distM < 1000 ? `${Math.round(distM)} m` : `${(distM / 1000).toFixed(1)} km`}
                </span>
              </div>
            </div>
            <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
              <a
                href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir no Maps"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
