/**
 * Google Maps Routes API helper.
 *
 * Devolve distância e duração reais entre origem e destino usando a
 * Google Maps Routes API (v2). Cache persistente em `place_distance_cache`.
 * Se falhar, devolve `null` — o caller cai para Haversine.
 */

export type TravelMode = 'driving' | 'walking' | 'bicycling';
export type TrafficModel = 'best_guess' | 'pessimistic' | 'optimistic';

export interface DistanceResult {
  distanceMeters: number;
  durationSeconds: number;
  polyline?: string; // Encoded polyline string
  via: 'google_routes' | 'haversine_fallback';
}

interface CacheRow {
  duration_seconds: number;
  distance_meters: number;
  polyline?: string;
}

/** Chave estável de cache (origem arredondada). */
function originKey(lat: number, lng: number) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

/**
 * devolve a distância real (ou null se não disponível).
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
        .select('duration_seconds, distance_meters, polyline, expires_at')
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
          polyline: row.polyline,
          via: 'google_routes',
        };
      }
    }
  } catch (_) { /* swallow */ }

  // 2) Chamar Google Maps Routes API (v2)
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    const mapboxToken = (import.meta as any).env?.VITE_MAPBOX_TOKEN;
    if (mapboxToken) return fetchMapboxRoute(origin, dest, mapboxToken);
    return null;
  }

  try {
    const gMode = mode === 'walking' ? 'WALK' : mode === 'bicycling' ? 'BICYCLE' : 'DRIVE';
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } },
        travelMode: gMode,
        routingPreference: 'TRAFFIC_AWARE',
        units: 'METRIC',
        languageCode: 'pt-PT'
      })
    });

    if (!response.ok) throw new Error(`Google Routes ${response.status}`);
    const json = await response.json();
    const route = json?.routes?.[0];
    if (!route) return null;

    const durationSeconds = parseInt(route.duration?.replace('s', '') || '0');
    const distanceMeters = route.distanceMeters ?? 0;
    const polyline = route.polyline?.encodedPolyline;

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
          polyline: polyline,
          fetched_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        }, { onConflict: 'origin_lat,origin_lng,dest_kind,dest_id' });
      }
    } catch (_) { }

    return { distanceMeters, durationSeconds, polyline, via: 'google_routes' };
  } catch (e) {
    console.warn('[google-routes] falhou', e);
    const mapboxToken = (import.meta as any).env?.VITE_MAPBOX_TOKEN;
    if (mapboxToken) return fetchMapboxRoute(origin, dest, mapboxToken);
    return null;
  }
}

/** Fallback Mapbox para robustez */
async function fetchMapboxRoute(origin: { lat: number; lng: number }, dest: { lat: number; lng: number }, token: string): Promise<DistanceResult | null> {
  try {
    const coords = `${origin.lng},${origin.lat};${dest.lng},${dest.lat}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coords}?access_token=${token}`;
    const res = await fetch(url);
    const json = await res.json();
    const route = json?.routes?.[0];
    if (!route) return null;
    return {
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
      via: 'google_routes' // Treat as same for UI consistency
    };
  } catch { return null; }
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