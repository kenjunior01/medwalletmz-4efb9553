/**
 * openRoutes — Rotas e distâncias reais via OSRM (OpenStreetMap).
 * Servidor público gratuito, sem chave: https://router.project-osrm.org
 * Cache persistente em `place_distance_cache` (igual ao anterior).
 * Fallback sempre disponível: Haversine.
 */

import { logger } from '@/lib/logger';

const OSRM = 'https://router.project-osrm.org';

export type TravelMode = 'driving' | 'walking' | 'bicycling';

export interface DistanceResult {
  distanceMeters: number;
  durationSeconds: number;
  polyline?: string; // Encoded polyline (precision 5)
  via: 'osrm' | 'estimate';
}

/** Velocidades médias urbanas (km/h) para estimativas sem rede. */
const AVG_SPEED_KMH: Record<TravelMode, number> = { driving: 30, walking: 5, bicycling: 15 };

interface CacheRow {
  duration_seconds: number;
  distance_meters: number;
  polyline?: string;
}

function originKey(lat: number, lng: number) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

async function getSupabase(): Promise<any | null> {
  try {
    const mod = await import('@/integrations/supabase/client');
    return mod.supabase;
  } catch {
    return null;
  }
}

/**
 * Distância e duração reais entre dois pontos (perfil carro do OSRM).
 * Modos a pé/bicicleta usam estimativa a partir da distância de carro.
 */
export async function fetchRouteDistance(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  destKind: 'pharmacy' | 'clinic' | 'doctor' | 'hospital',
  destId: string,
  mode: TravelMode = 'driving',
): Promise<DistanceResult | null> {
  // 1) Cache
  try {
    const sb = await getSupabase();
    if (sb) {
      const { data } = await sb
        .from('place_distance_cache')
        .select('duration_seconds, distance_meters, polyline, expires_at')
        .eq('origin_lat', origin.lat)
        .eq('origin_lng', origin.lng)
        .eq('dest_kind', destKind)
        .eq('dest_id', destId)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      const row = data as CacheRow | null;
      if (row) return scaleByMode(row.distanceMeters ?? row.distance_meters, row.duration_seconds, row.polyline, mode);
    }
  } catch (_) { /* ignore */ }

  // 2) OSRM (carro)
  try {
    const coords = `${origin.lng},${origin.lat};${dest.lng},${dest.lat}`;
    const res = await fetch(
      `${OSRM}/route/v1/driving/${coords}?overview=full&geometries=polyline&steps=false`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const json = await res.json();
    const route = json?.routes?.[0];
    if (!route) return null;

    const distanceMeters = Math.round(route.distance);
    const durationSeconds = Math.round(route.duration);
    const polyline = route.geometry;

    // 3) Guardar cache
    try {
      const sb = await getSupabase();
      if (sb) {
        await sb.from('place_distance_cache').upsert({
          origin_lat: origin.lat,
          origin_lng: origin.lng,
          dest_kind: destKind,
          dest_id: destId,
          duration_seconds: durationSeconds,
          distance_meters: distanceMeters,
          polyline,
          fetched_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        }, { onConflict: 'origin_lat,origin_lng,dest_kind,dest_id' });
      }
    } catch (_) { /* ignore */ }

    return scaleByMode(distanceMeters, durationSeconds, polyline, mode);
  } catch (e) {
    logger.warn('[openRoutes] OSRM falhou', { error: e });
    return null;
  }
}

/** A pé/bicicleta: estima a partir da distância de carro. */
function scaleByMode(
  distanceMeters: number,
  carDurationSeconds: number,
  polyline: string | undefined,
  mode: TravelMode,
): DistanceResult {
  if (mode === 'driving') {
    return { distanceMeters, durationSeconds: carDurationSeconds, polyline, via: 'osrm' };
  }
  const speed = AVG_SPEED_KMH[mode];
  const durationSeconds = Math.round((distanceMeters / 1000 / speed) * 3600);
  return { distanceMeters, durationSeconds, polyline, via: 'estimate' };
}

/** Distância em linha reta (km). */
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

/**
 * Matriz de distâncias/durações (1 origem × N destinos) via tabela do OSRM.
 * Devolve null em cada posição quando o OSRM não consegue.
 */
export async function fetchRouteMatrix(
  origin: { lat: number; lng: number },
  destinations: { lat: number; lng: number }[],
): Promise<(DistanceResult | null)[]> {
  if (destinations.length === 0) return [];
  const coords = [origin, ...destinations].map((p) => `${p.lng},${p.lat}`).join(';');
  try {
    const res = await fetch(
      `${OSRM}/table/v1/driving/${coords}?sources=0&annotations=duration,distance`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) throw new Error(`OSRM table ${res.status}`);
    const json = await res.json();
    const durations: (number | null)[] = json?.durations?.[0] ?? [];
    const distances: (number | null)[] = json?.distances?.[0] ?? [];
    return destinations.map((_, i) => {
      const d = distances[i + 1];
      const t = durations[i + 1];
      if (d == null || t == null) return null;
      return scaleByMode(Math.round(d), Math.round(t), undefined, 'driving');
    });
  } catch (e) {
    logger.warn('[openRoutes] matriz OSRM falhou', { error: e });
    return destinations.map(() => null);
  }
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
}

export interface FullRoute {
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
  steps: RouteStep[];
}

/** Traduz manobras OSRM para instruções curtas em português. */
function maneuverText(step: any): string {
  const m = step.maneuver ?? {};
  const road = step.name ? ` para ${step.name}` : '';
  const type = m.type ?? '';
  const mod = m.modifier ?? '';
  if (type === 'depart') return `Iniciar${road}`;
  if (type === 'arrive') return 'Chegou ao destino';
  if (type === 'roundabout' || type === 'rotary') return `Entrar na rotunda${road}`;
  if (mod === 'left') return `Virar à esquerda${road}`;
  if (mod === 'right') return `Virar à direita${road}`;
  if (mod === 'straight') return `Continuar em frente${road}`;
  if (mod === 'slight left') return `Desviar ligeiramente à esquerda${road}`;
  if (mod === 'slight right') return `Desviar ligeiramente à direita${road}`;
  if (mod === 'sharp left') return `Virar acentuadamente à esquerda${road}`;
  if (mod === 'sharp right') return `Virar acentuadamente à direita${road}`;
  if (mod === 'uturn') return `Inverter o sentido${road}`;
  return `Continuar${road}`;
}

/** Rota completa com passo-a-passo (navegação). */
export async function fetchFullRoute(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
): Promise<FullRoute | null> {
  try {
    const coords = `${origin.lng},${origin.lat};${dest.lng},${dest.lat}`;
    const res = await fetch(
      `${OSRM}/route/v1/driving/${coords}?overview=full&geometries=polyline&steps=true`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const json = await res.json();
    const route = json?.routes?.[0];
    if (!route) return null;
    const leg = route.legs?.[0] ?? {};
    const steps: RouteStep[] = (leg.steps ?? []).map((s: any) => ({
      instruction: maneuverText(s),
      distanceMeters: Math.round(s.distance ?? 0),
      durationSeconds: Math.round(s.duration ?? 0),
    }));
    return {
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
      polyline: route.geometry,
      steps,
    };
  } catch (e) {
    logger.warn('[openRoutes] rota completa falhou', { error: e });
    return null;
  }
}

/** Descodifica polyline encoded (precision 5) em pontos de mapa. */
export function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let result = 1;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 1;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat * 1e-5, lng: lng * 1e-5 });
  }
  return points;
}

/**
 * Link "abrir no app de mapas" — abre a app nativa no telemóvel
 * (Google Maps no Android/iOS) e o OpenStreetMap no desktop.
 */
export function buildExternalDirectionsUrl(
  origin: { lat: number; lng: number } | null | undefined,
  destination: { lat: number; lng: number },
  travelMode: 'driving' | 'walking' | 'transit' | 'bicycling' = 'driving',
) {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const dest = `${destination.lat},${destination.lng}`;
  const orig = origin ? `${origin.lat},${origin.lng}` : null;
  if (isAndroid) {
    const params = new URLSearchParams({ destination: dest });
    if (orig) params.set('origin', orig);
    params.set('travelmode', travelMode === 'transit' ? 'transit' : travelMode);
    return `geo:${dest}?q=${dest}&api=1&dirflg=${travelMode === 'walking' ? 'w' : travelMode === 'bicycling' ? 'b' : 'd'}`;
  }
  if (isIOS) {
    const params = new URLSearchParams({
      daddr: dest,
      ...(orig ? { saddr: orig } : {}),
      dirflg: travelMode === 'walking' ? 'w' : travelMode === 'bicycling' ? 'b' : 'd',
    });
    return `maps://?${params.toString()}`;
  }
  // Desktop: planejador de rotas do OpenStreetMap
  const route = orig ? `${orig};${dest}` : `${dest};${dest}`;
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${route}`;
}

/** Abre a app de mapas do dispositivo com o destino escolhido. */
export function openInExternalMaps(destination: { lat: number; lng: number }, label?: string): void {
  const ua = navigator.userAgent;
  const query = label ? encodeURIComponent(label) : `${destination.lat},${destination.lng}`;
  let url: string;
  if (/iPhone|iPad|iPod/.test(ua)) {
    url = `maps://?q=${query}&ll=${destination.lat},${destination.lng}`;
  } else if (/Android/.test(ua)) {
    url = `geo:${destination.lat},${destination.lng}?q=${query}`;
  } else {
    url = `https://www.openstreetmap.org/?mlat=${destination.lat}&mlon=${destination.lng}#map=17/${destination.lat}/${destination.lng}`;
  }
  window.open(url, '_blank', 'noopener');
}
