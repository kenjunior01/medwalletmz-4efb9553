/**
 * Mapbox Directions / Matrix helper (substitui Google Routes).
 *
 * Devolve distância e duração reais entre origem e destino usando a
 * Mapbox Directions API. Cache persistente em `place_distance_cache`.
 * Se a chave Mapbox não estiver disponível OU a chamada falhar,
 * devolve `null` — o caller cai para Haversine.
 */

export type TravelMode = 'driving' | 'walking' | 'bicycling';
export type TrafficModel = 'best_guess' | 'pessimistic' | 'optimistic';

export interface DistanceResult {
  distanceMeters: number;
  durationSeconds: number;
  via: 'google_routes' | 'haversine_fallback';
}

interface CacheRow {
  duration_seconds: number;
  distance_meters: number;
}

/** Chave estável de cache (origem arredondada). */
function originKey(lat: number, lng: number) {
  // ~111m de precisão — evita cache churn por oscilações GPS.
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

/**
 * devolve a distância real (ou null se não disponível).
 *  - lat/lng de origem (ex: utilizador)
 *  - lat/lng de destino (ex: farmácia)
 *  - modo (driving é o default — walking em zonas pedestres)
 */
export async function fetchRouteDistance(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  destKind: 'pharmacy' | 'clinic' | 'doctor' | 'hospital',
  destId: string,
  mode: TravelMode = 'driving',
  traffic: TrafficModel = 'best_guess',
): Promise<DistanceResult | null> {
  const key = originKey(origin.lat, origin.lng);

  // 1) tentar cache fresca
  try {
    const sb = await getSupabase();
    if (sb) {
      const { data } = await (sb as any)
        .from('place_distance_cache')
        .select('duration_seconds, distance_meters, expires_at')
        .eq('origin_lat', origin.lat)
        .eq('origin_lng', origin.lng)
        .eq('dest_kind', destKind)
        .eq('dest_id', destId)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      const row = data as CacheRow | null;
      if (row) {
        return {
          distanceMeters: row.distance_meters,
          durationSeconds: row.duration_seconds,
          via: 'google_routes',
        };
      }
    }
  } catch (_) { /* swallow — vai para a API */ }

  // 2) chamar Mapbox Directions API
  const apiKey = (import.meta as any).env?.VITE_MAPBOX_TOKEN;
  if (!apiKey) return null;

  try {
    const profile = mode === 'walking' ? 'walking' : mode === 'bicycling' ? 'cycling' : 'driving-traffic';
    const coords = `${origin.lng},${origin.lat};${dest.lng},${dest.lat}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}`
      + `?overview=false&geometries=geojson&access_token=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Mapbox ${res.status}`);
    const json = await res.json();
    const route = json?.routes?.[0];
    if (!route) return null;

    const durationSeconds = Math.round(route.duration ?? 0);
    const distanceMeters = Math.round(route.distance ?? 0);

    // 3) escrever cache
    try {
      const sb = await getSupabase();
      if (sb) {
        await (sb as any).from('place_distance_cache').upsert({
          origin_lat: origin.lat,
          origin_lng: origin.lng,
          dest_kind: destKind,
          dest_id: destId,
          duration_seconds: durationSeconds,
          distance_meters: distanceMeters,
          fetched_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        }, { onConflict: 'origin_lat,origin_lng,dest_kind,dest_id' });
      }
    } catch (_) { /* cache é best-effort */ }

    return { distanceMeters, durationSeconds, via: 'google_routes' };
  } catch (e) {
    console.warn('[mapbox] rota falhou, usando haversine', e);
    return null;
  }
}

/** Haversine puro (km). */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Formatar duração (segundos → "X min" / "1h 5min"). */
export function fmtDuration(sec: number) {
  if (!Number.isFinite(sec) || sec <= 0) return '—';
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}min`;
}

/** Import dinâmico para evitar SSR/circular issues. */
async function getSupabase() {
  try {
    const mod = await import('@/integrations/supabase/client');
    return mod.supabase;
  } catch {
    return null;
  }
}