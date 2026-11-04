/**
 * Maps Premium Service — rotas e distâncias reais para unidades de saúde,
 * agora 100% gratuito: OSRM (rotas/ETA) + Nominatim (geocoding) + OpenStreetMap.
 * Sem chaves de API. Fallback: Haversine.
 */

import { fetchRouteMatrix, fetchFullRoute, haversineKm } from '@/lib/openRoutes';
import { reverseGeocodePoint } from '@/lib/openGeo';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface FacilityWithDistance {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'lab' | 'maternity';
  address?: string;
  geo: GeoPoint;
  phone?: string;
  opening_hours?: string;
  is_24h?: boolean;
  rating?: number;
  // Computed
  distance_km?: number;
  duration_min?: number;
  duration_with_traffic_min?: number;
  traffic_level?: 'light' | 'moderate' | 'heavy';
  route_summary?: string;
}

export interface RouteStep {
  instruction: string;
  distance_km: number;
  duration_min: number;
  maneuver?: string;
}

export interface RouteResult {
  total_distance_km: number;
  total_duration_min: number;
  total_duration_with_traffic_min: number;
  traffic_level: 'light' | 'moderate' | 'heavy';
  steps: RouteStep[];
  polyline?: string;
  static_map_url?: string;
}

/** O serviço de mapas está sempre ativo (stack gratuita, sem chave). */
export function isMapsConfigured(): boolean {
  return true;
}

/* ---------- Distance & ETA ---------- */

/**
 * Distâncias + ETAs para uma lista de unidades a partir da localização do
 * utilizador. Usa a tabela do OSRM (batch) com fallback Haversine.
 */
export async function computeDistances(
  origin: GeoPoint,
  facilities: FacilityWithDistance[],
): Promise<FacilityWithDistance[]> {
  if (facilities.length === 0) return [];

  try {
    const results = await fetchRouteMatrix(origin, facilities.map((f) => f.geo));
    if (results.some(Boolean)) {
      return facilities
        .map((f, i) => {
          const r = results[i];
          if (!r) return { ...f, ...haversineMetrics(origin, f.geo) };
          return {
            ...f,
            distance_km: Math.round((r.distanceMeters / 1000) * 10) / 10,
            duration_min: Math.max(1, Math.round(r.durationSeconds / 60)),
            duration_with_traffic_min: Math.max(1, Math.round(r.durationSeconds / 60)),
            traffic_level: 'light' as const,
          };
        })
        .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
    }
  } catch (e) {
    logger.warn('[mapsPremium] matriz OSRM falhou, fallback Haversine:', { error: e });
  }
  return computeDistancesHaversine(origin, facilities);
}

function haversineMetrics(origin: GeoPoint, geo: GeoPoint) {
  const distance_km = Math.round(haversineKm(origin, geo) * 10) / 10;
  const duration_min = Math.max(1, Math.round((distance_km / 30) * 60));
  return { distance_km, duration_min, duration_with_traffic_min: duration_min, traffic_level: 'light' as const };
}

function computeDistancesHaversine(
  origin: GeoPoint,
  facilities: FacilityWithDistance[]
): FacilityWithDistance[] {
  return facilities
    .map((f) => ({ ...f, ...haversineMetrics(origin, f.geo) }))
    .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
}

/* ---------- Step-by-step route ---------- */

export async function getRoute(origin: GeoPoint, destination: GeoPoint): Promise<RouteResult | null> {
  try {
    const r = await fetchFullRoute(origin, destination);
    if (r) {
      return {
        total_distance_km: Math.round((r.distanceMeters / 1000) * 10) / 10,
        total_duration_min: Math.max(1, Math.round(r.durationSeconds / 60)),
        total_duration_with_traffic_min: Math.max(1, Math.round(r.durationSeconds / 60)),
        traffic_level: 'light',
        steps: r.steps.map((s) => ({
          instruction: s.instruction,
          distance_km: Math.round((s.distanceMeters / 1000) * 10) / 10,
          duration_min: Math.max(1, Math.round(s.durationSeconds / 60)),
        })),
        polyline: r.polyline,
        static_map_url: undefined,
      };
    }
  } catch (e) {
    logger.warn('[mapsPremium] rota OSRM falhou:', { error: e });
  }

  // Fallback: linha reta
  const distance_km = Math.round(haversineKm(origin, destination) * 10) / 10;
  const duration_min = Math.max(1, Math.round((distance_km / 30) * 60));
  return {
    total_distance_km: distance_km,
    total_duration_min: duration_min,
    total_duration_with_traffic_min: duration_min,
    traffic_level: 'light',
    steps: [{
      instruction: `Seguir em linha recta até ${destination.label ?? 'destino'}`,
      distance_km,
      duration_min,
    }],
    static_map_url: getOSMStaticMapUrl(origin, destination),
  };
}

/* ---------- Static / embed map URLs ---------- */

function getOSMStaticMapUrl(origin: GeoPoint, destination: GeoPoint): string {
  const minLat = Math.min(origin.lat, destination.lat) - 0.01;
  const maxLat = Math.max(origin.lat, destination.lat) + 0.01;
  const minLng = Math.min(origin.lng, destination.lng) - 0.01;
  const maxLng = Math.max(origin.lng, destination.lng) + 0.01;
  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${origin.lat},${origin.lng}`;
}

export function getEmbedMapUrl(center: GeoPoint, zoom = 13): string {
  const delta = 0.02 * Math.pow(2, 13 - zoom);
  const bbox = `${center.lng - delta},${center.lat - delta},${center.lng + delta},${center.lat + delta}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${center.lat},${center.lng}`;
}

/* ---------- Open in external maps app ---------- */

export function openInExternalMaps(destination: GeoPoint, label?: string): void {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const query = label ? encodeURIComponent(label) : `${destination.lat},${destination.lng}`;
  let url: string;
  if (isIOS) {
    url = `maps://?q=${query}&ll=${destination.lat},${destination.lng}`;
  } else if (isAndroid) {
    url = `geo:${destination.lat},${destination.lng}?q=${query}`;
  } else {
    url = `https://www.openstreetmap.org/?mlat=${destination.lat}&mlon=${destination.lng}#map=17/${destination.lat}/${destination.lng}`;
  }
  window.open(url, '_blank', 'noopener');
}

/* ---------- User location ---------- */

export function getCurrentLocation(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não suportada'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.message)),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

/* ---------- Reverse geocode (city/country name) ---------- */

export async function reverseGeocode(point: GeoPoint): Promise<{ city?: string; country?: string; address?: string }> {
  const r = await reverseGeocodePoint(point.lat, point.lng);
  if (!r) return { address: `${point.lat.toFixed(3)}, ${point.lng.toFixed(3)}` };
  return { city: r.city, country: r.country, address: r.label };
}

/* ---------- Dados reais de instituições (Supabase) ---------- */

/**
 * Carrega instituições de saúde REAIS (com coordenadas) das tabelas
 * clinics / stores / laboratories da base da plataforma.
 */
export async function fetchRealFacilities(): Promise<FacilityWithDistance[]> {
  const facilities: FacilityWithDistance[] = [];

  try {
    const { data: clinics, error } = await supabase
      .from('clinics')
      .select('id,name,type,address,latitude,longitude,phone,avg_rating')
      .eq('is_active', true)
      .not('latitude', 'is', null)
      .limit(600);
    if (!error && clinics) {
      for (const c of clinics) {
        facilities.push({
          id: `c-${c.id}`,
          name: c.name,
          type: c.type === 'hospital' ? 'hospital' : 'clinic',
          address: c.address ?? undefined,
          geo: { lat: Number(c.latitude), lng: Number(c.longitude) },
          phone: c.phone ?? undefined,
          rating: c.avg_rating != null ? Number(c.avg_rating) : undefined,
        });
      }
    }
  } catch (e) {
    logger.warn('fetchRealFacilities: clinics indisponível', { error: e });
  }

  try {
    const { data: stores } = await supabase
      .from('stores')
      .select('id,name,address,latitude,longitude,phone,rating')
      .eq('type', 'pharmacy')
      .eq('is_active', true)
      .not('latitude', 'is', null)
      .limit(300);
    if (stores) {
      for (const s of stores) {
        facilities.push({
          id: `s-${s.id}`,
          name: s.name,
          type: 'pharmacy',
          address: s.address ?? undefined,
          geo: { lat: Number(s.latitude), lng: Number(s.longitude) },
          phone: s.phone ?? undefined,
          rating: s.rating != null ? Number(s.rating) : undefined,
        });
      }
    }
  } catch (e) {
    logger.warn('fetchRealFacilities: farmácias indisponível', { error: e });
  }

  try {
    const { data: labs } = await supabase
      .from('laboratories')
      .select('id,name,address,latitude,longitude,phone')
      .eq('is_active', true)
      .not('latitude', 'is', null)
      .limit(100);
    if (labs) {
      for (const l of labs) {
        facilities.push({
          id: `l-${l.id}`,
          name: l.name,
          type: 'lab',
          address: l.address ?? undefined,
          geo: { lat: Number(l.latitude), lng: Number(l.longitude) },
          phone: l.phone ?? undefined,
        });
      }
    }
  } catch (e) {
    logger.warn('fetchRealFacilities: laboratórios indisponível', { error: e });
  }

  return facilities;
}
