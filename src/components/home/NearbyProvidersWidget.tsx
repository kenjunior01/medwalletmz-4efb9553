import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from '@/contexts/LocationContext';
import { MapPin, Stethoscope, Pill, Navigation, Loader2, Clock, Sparkles, Building2, Hospital } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { fetchRouteDistance, fmtDuration, haversineKm } from '@/lib/googleRoutes';
import { useCountry } from '@/contexts/CountryContext';

export function NearbyProvidersWidget() {
  const navigate = useNavigate();
  const { coordinates, city, requestLocation, loading, calculateDistance } = useLocation();
  const { country } = useCountry();
  const { settings } = usePlatformSettings();
  const radiusKm = Number(settings.nearby_radius_km) || 25;
  const ranking = (settings.nearby_ranking as string) || 'distance';
  const preferRoutes = settings.prefer_google_routes !== false; // default true
  const [onlyMyCity, setOnlyMyCity] = useState<boolean>(() => localStorage.getItem('filter_only_my_city') !== '0');

  useEffect(() => {
    const handler = () => setOnlyMyCity(localStorage.getItem('filter_only_my_city') !== '0');
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const [routeToggles, setRouteToggles] = useState<Record<string, { km: number; etaSec: number }>>({});

  useEffect(() => {
    if (!coordinates) requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: pharmacies } = useQuery<any[]>({
    queryKey: ['nearby-pharmacies', city, onlyMyCity],
    queryFn: async () => {
      let q = supabase
        .from('stores')
        .select('id, name, type, city, latitude, longitude, image_url')
        .eq('is_active', true)
        .limit(50);
      if (onlyMyCity && city) q = q.eq('city', city);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: doctors } = useQuery<any[]>({
    queryKey: ['nearby-doctors', city, onlyMyCity],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('doctor_profiles')
        .select('id, user_id, latitude, longitude, rating, consultation_fee, medical_specialties(name, icon)')
        .eq('is_available', true)
        .limit(50);
      const ids = (data || []).map((d: any) => d.user_id);
      const { data: profs } = await supabase.from('profiles').select('user_id, full_name, default_city').in('user_id', ids);
      return (data || []).map((d: any) => ({
        ...d,
        full_name: profs?.find((p: any) => p.user_id === d.user_id)?.full_name,
        default_city: profs?.find((p: any) => p.user_id === d.user_id)?.default_city,
      })).filter((d: any) => !onlyMyCity || !d.default_city || d.default_city === city);
    },
  });

  const { data: clinics } = useQuery<any[]>({
    queryKey: ['nearby-clinics', city, onlyMyCity],
    queryFn: async () => {
      let q = (supabase as any)
        .from('clinics')
        .select('id, name, type, city, latitude, longitude, logo_url')
        .eq('is_active', true)
        .limit(50);
      if (onlyMyCity && city) q = q.eq('city', city);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: hospitals } = useQuery<any[]>({
    queryKey: ['nearby-hospitals', city, onlyMyCity],
    queryFn: async () => {
      let q = (supabase as any)
        .from('hospitals')
        .select('id, name, city, latitude, longitude')
        .eq('is_active', true)
        .limit(50);
      if (onlyMyCity && city) q = q.eq('city', city);
      const { data } = await q;
      return data || [];
    },
  });

  // Ranking base (haversine, barato)
  const rankedBase = useMemo(() => {
    const enrich = (items: any[], kind: 'pharmacy' | 'doctor' | 'clinic' | 'hospital') =>
      (items || []).map((it: any) => {
        let dist: number | null = null;
        if (it.latitude && it.longitude && coordinates) {
          dist = haversineKm(
            { lat: coordinates.latitude, lng: coordinates.longitude },
            { lat: Number(it.latitude), lng: Number(it.longitude) },
          );
        }
        return { ...it, kind, distance: dist };
      });
    const all = [
      ...enrich(pharmacies || [], 'pharmacy'),
      ...enrich(doctors || [], 'doctor'),
      ...enrich(clinics || [], 'clinic'),
      ...enrich(hospitals || [], 'hospital'),
    ];
    return all.filter(it => it.distance == null || it.distance <= radiusKm);
  }, [pharmacies, doctors, clinics, hospitals, coordinates, radiusKm]);

  // Top 5 — enriquecido com Google Routes (ETA + distância real)
  const top = useMemo(() => rankedBase.slice(0, 5), [rankedBase]);

  useEffect(() => {
    if (!coordinates || !preferRoutes) return;
    let cancelled = false;
    (async () => {
      const updates: Record<string, { km: number; etaSec: number }> = {};
      for (const it of top) {
        if (!it.latitude || !it.longitude) continue;
        const r = await fetchRouteDistance(
          { lat: coordinates.latitude, lng: coordinates.longitude },
          { lat: Number(it.latitude), lng: Number(it.longitude) },
          (it.kind === 'pharmacy' ? 'pharmacy' : 'doctor') as any,
          it.id,
        );
        if (cancelled) return;
        if (r) {
          updates[`${it.kind}-${it.id}`] = {
            km: r.distanceMeters / 1000,
            etaSec: r.durationSeconds,
          };
        }
      }
      if (!cancelled) setRouteToggles((p) => ({ ...p, ...updates }));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates, top.length]);

  const ranked = useMemo(() => {
    const enriched = rankedBase.map((it: any) => {
      const k = `${it.kind}-${it.id}`;
      const route = routeToggles[k];
      if (route) {
        return { ...it, distance: route.km, etaSec: route.etaSec, viaRoute: true };
      }
      return it;
    });

    const sorter = (a: any, b: any) => {
      // Ranking por rota real (tempo) quando disponível, senão fallback
      if (ranking === 'rating') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      if (ranking === 'price') return (Number(a.consultation_fee || a.delivery_fee) || 0) - (Number(b.consultation_fee || b.delivery_fee) || 0);
      // 'distance' OR default → preferir ETA real
      const aEta = a.etaSec ?? a.distance * 60 / 30; // ~30km/h fallback se sem rota
      const bEta = b.etaSec ?? b.distance * 60 / 30;
      if (ranking === 'eta') return aEta - bEta;
      // mistura: se ambos têm rota, ordena por ETA; senão por distância
      if (a.viaRoute && b.viaRoute) return aEta - bEta;
      if (a.distance == null && b.distance == null) return 0;
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    };
    return enriched.sort(sorter).slice(0, 8);
  }, [rankedBase, routeToggles, ranking]);

  return (
    <section className="px-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" /> Perto de ti
          </h2>
          <p className="text-xs text-muted-foreground">
            {coordinates
              ? `Raio ${radiusKm} km · ordenado por ${ranking === 'rating' ? 'avaliação' : ranking === 'price' ? 'preço' : ranking === 'eta' ? 'tempo real' : 'distância / rota'} · ${city}`
              : 'Ativa a localização para resultados precisos'}
          </p>
        </div>
        {!coordinates && (
          <Button size="sm" variant="outline" onClick={requestLocation} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <MapPin className="h-4 w-4 mr-1" />}
            Ativar
          </Button>
        )}
      </div>

      {ranked.length === 0 ? (
        <div className="bento-card p-4 text-sm text-muted-foreground">
          Ainda não há prestadores em {city}.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory">
          {ranked.map(it => {
            const key = `${it.kind}-${it.id}`;
            const route = routeToggles[key];
            const isClinic = it.kind === 'clinic';
            const isHospital = it.kind === 'hospital';
            const isPharmacy = it.kind === 'pharmacy';
            const isDoctor = it.kind === 'doctor';
            const target =
              isPharmacy ? `/store/${it.id}` :
              isDoctor ? `/health/book/${it.id}` :
              isHospital ? `/health/facility/${it.id}?type=hospital` :
              `/health/facility/${it.id}?type=clinic`;
            return (
              <button
                key={key}
                onClick={() => navigate(target)}
                className="snap-start shrink-0 w-44 bento-card text-left p-3"
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-2 ${
                  isPharmacy ? 'bg-pharmacy/15 text-pharmacy' :
                  isHospital ? 'bg-destructive/15 text-destructive' :
                  isClinic ? 'bg-amber-500/15 text-amber-600' :
                  'bg-primary/15 text-primary'
                }`}>
                  {isPharmacy ? <Pill className="h-5 w-5" /> :
                   isHospital ? <Hospital className="h-5 w-5" /> :
                   isClinic ? <Building2 className="h-5 w-5" /> :
                   <Stethoscope className="h-5 w-5" />}
                </div>
                <p className="text-sm font-bold leading-tight truncate">
                  {isDoctor ? `Dr(a). ${it.full_name || '—'}` : it.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {isPharmacy ? (it.type || 'Farmácia') :
                   isHospital ? 'Hospital' :
                   isClinic ? (it.type || 'Clínica') :
                   `${it.medical_specialties?.icon || ''} ${it.medical_specialties?.name || 'Clínico'}`}
                </p>
                <div className="flex items-center justify-between mt-2 text-[10px]">
                  <span className="flex items-center gap-0.5 font-semibold text-primary">
                    <MapPin className="h-3 w-3" />
                    {it.distance != null ? `${it.distance.toFixed(1)} km` : city}
                  </span>
                  {isDoctor && (
                    <span className="font-black text-primary">{it.consultation_fee} {country?.currency_code || 'MZN'}</span>
                  )}
                </div>
                {route ? (
                  <div className="mt-1 text-[10px] font-bold text-emerald bg-emerald/10 rounded px-1.5 py-0.5 inline-flex items-center gap-0.5 border border-emerald/10">
                    <Clock className="h-3 w-3" /> {fmtDuration(route.etaSec)} <Sparkles className="h-3 w-3 ml-0.5" />
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}