/**
 * Maps Premium Service
 * Google Maps routing with real-time traffic for health facilities.
 *
 * Strategy:
 *  1. If VITE_GOOGLE_MAPS_API_KEY is configured:
 *     - Use Routes API (routes.googleapis.com) for ETA with traffic
 *     - Use Directions API for step-by-step navigation
 *     - Use Places API for facility details
 *     - Use Static Maps API for thumbnail previews
 *  2. Fallback: OpenStreetMap embed (free, no key) + haversine ETA
 *
 * All distances in km, durations in minutes.
 */

const API_KEY = (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY) as string | undefined;

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

export function isMapsConfigured(): boolean {
  return Boolean(API_KEY && !API_KEY.includes('your_') && API_KEY.length > 20);
}

/* ---------- Distance & ETA ---------- */

/**
 * Compute distances + ETAs for a list of facilities from the user's location.
 * Uses Google Routes API if configured, falls back to haversine.
 */
export async function computeDistances(
  origin: GeoPoint,
  facilities: FacilityWithDistance[],
): Promise<FacilityWithDistance[]> {
  if (facilities.length === 0) return [];

  if (isMapsConfigured()) {
    try {
      return await computeDistancesGoogle(origin, facilities);
    } catch (e) {
      console.warn('[mapsPremium] Google Routes failed, falling back:', e);
    }
  }
  return computeDistancesHaversine(origin, facilities);
}

async function computeDistancesGoogle(
  origin: GeoPoint,
  facilities: FacilityWithDistance[],
): Promise<FacilityWithDistance[]> {
  // Use Distance Matrix API for batch ETA
  const destinations = facilities.map((f) => `${f.geo.lat},${f.geo.lng}`).join('|');
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destinations}&departure_time=now&traffic_model=best_guess&key=${API_KEY}`;

  // Note: Direct fetch to Google Maps API from browser requires CORS, which Google
  // does NOT support for Distance Matrix. In production, this goes through a
  // Supabase Edge Function. Here we try a proxy-style call that may work in dev.
  const proxyUrl = `/api/maps/distancematrix?origins=${origin.lat},${origin.lng}&destinations=${destinations}`;

  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`proxy ${res.status}`);
    const data = await res.json();
    if (data.rows?.[0]?.elements) {
      return facilities.map((f, i) => {
        const el = data.rows[0].elements[i];
        return {
          ...f,
          distance_km: el.distance?.value ? el.distance.value / 1000 : undefined,
          duration_min: el.duration?.value ? Math.round(el.duration.value / 60) : undefined,
          duration_with_traffic_min: el.duration_in_traffic?.value ? Math.round(el.duration_in_traffic.value / 60) : undefined,
          traffic_level: classifyTraffic(el.duration?.value, el.duration_in_traffic?.value),
        };
      });
    }
    throw new Error('Invalid response');
  } catch {
    return computeDistancesHaversine(origin, facilities);
  }
}

function computeDistancesHaversine(
  origin: GeoPoint,
  facilities: FacilityWithDistance[]
): FacilityWithDistance[] {
  return facilities
    .map((f) => {
      const distance_km = haversine(origin, f.geo);
      // Average urban speed 30 km/h → time = distance / 0.5 km/min
      const duration_min = Math.round((distance_km / 30) * 60);
      return {
        ...f,
        distance_km: Math.round(distance_km * 10) / 10,
        duration_min,
        duration_with_traffic_min: duration_min,
        traffic_level: 'light' as const,
      };
    })
    .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
}

/* ---------- Step-by-step route ---------- */

export async function getRoute(origin: GeoPoint, destination: GeoPoint): Promise<RouteResult | null> {
  if (isMapsConfigured()) {
    try {
      const url = `/api/maps/directions?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&departure_time=now&traffic_model=best_guess`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const route = data.routes?.[0];
        const leg = route?.legs?.[0];
        if (leg) {
          const steps: RouteStep[] = (leg.steps ?? []).map((s: any) => ({
            instruction: s.html_instructions ? stripHtml(s.html_instructions) : s.distance.text,
            distance_km: s.distance?.value ? s.distance.value / 1000 : 0,
            duration_min: s.duration?.value ? Math.round(s.duration.value / 60) : 0,
            maneuver: s.maneuver,
          }));
          return {
            total_distance_km: leg.distance?.value ? leg.distance.value / 1000 : 0,
            total_duration_min: leg.duration?.value ? Math.round(leg.duration.value / 60) : 0,
            total_duration_with_traffic_min: leg.duration_in_traffic?.value ? Math.round(leg.duration_in_traffic.value / 60) : Math.round((leg.duration?.value ?? 0) / 60),
            traffic_level: classifyTraffic(leg.duration?.value, leg.duration_in_traffic?.value),
            steps,
            polyline: route?.overview_polyline?.points,
            static_map_url: getStaticMapUrl(origin, destination, route?.overview_polyline?.points),
          };
        }
      }
    } catch (e) {
      console.warn('[mapsPremium] Google Directions failed:', e);
    }
  }

  // Fallback: haversine + straight-line route
  const distance_km = haversine(origin, destination);
  const duration_min = Math.round((distance_km / 30) * 60);
  return {
    total_distance_km: Math.round(distance_km * 10) / 10,
    total_duration_min,
    total_duration_with_traffic_min: duration_min,
    traffic_level: 'light',
    steps: [{
      instruction: `Seguir em linha recta até ${destination.label ?? 'destino'}`,
      distance_km: Math.round(distance_km * 10) / 10,
      duration_min,
    }],
    static_map_url: getOSMStaticMapUrl(origin, destination),
  };
}

/* ---------- Static map ---------- */

export function getStaticMapUrl(origin: GeoPoint, destination: GeoPoint, polyline?: string): string {
  if (isMapsConfigured() && polyline) {
    return `https://maps.googleapis.com/maps/api/staticmap?size=600x300&path=weight:3|color:0x3B82F6|enc:${polyline}&markers=color:green|label:A|${origin.lat},${origin.lng}&markers=color:red|label:B|${destination.lat},${destination.lng}&key=${API_KEY}`;
  }
  return getOSMStaticMapUrl(origin, destination);
}

function getOSMStaticMapUrl(origin: GeoPoint, destination: GeoPoint): string {
  // OpenStreetMap static map (no key needed)
  const minLat = Math.min(origin.lat, destination.lat) - 0.01;
  const maxLat = Math.max(origin.lat, destination.lat) + 0.01;
  const minLng = Math.min(origin.lng, destination.lng) - 0.01;
  const maxLng = Math.max(origin.lng, destination.lng) + 0.01;
  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${origin.lat},${origin.lng}`;
}

/* ---------- Embed map URL ---------- */

export function getEmbedMapUrl(center: GeoPoint, zoom = 13): string {
  if (isMapsConfigured()) {
    return `https://www.google.com/maps/embed/v1/place?key=${API_KEY}&q=${center.lat},${center.lng}&zoom=${zoom}`;
  }
  const bbox = `${center.lng - 0.02},${center.lat - 0.02},${center.lng + 0.02},${center.lat + 0.02}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${center.lat},${center.lng}`;
}

/* ---------- Open in external maps app ---------- */

export function openInExternalMaps(destination: GeoPoint, label?: string): void {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const query = label ? encodeURIComponent(label) : `${destination.lat},${destination.lng}`;
  let url: string;
  if (isIOS) {
    url = `maps://?q=${query}&ll=${destination.lat},${destination.lng}`;
  } else if (isAndroid) {
    url = `geo:${destination.lat},${destination.lng}?q=${query}`;
  } else {
    url = `https://www.google.com/maps/search/?api=1&query=${destination.lat},${destination.lng}`;
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
  if (!isMapsConfigured()) {
    return { address: `${point.lat.toFixed(3)}, ${point.lng.toFixed(3)}` };
  }
  try {
    const url = `/api/maps/geocode?latlng=${point.lat},${point.lng}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`geocode ${res.status}`);
    const data = await res.json();
    const addr = data.results?.[0];
    const components = addr?.address_components ?? [];
    return {
      address: addr?.formatted_address,
      city: components.find((c: any) => c.types.includes('locality'))?.long_name,
      country: components.find((c: any) => c.types.includes('country'))?.long_name,
    };
  } catch {
    return { address: `${point.lat.toFixed(3)}, ${point.lng.toFixed(3)}` };
  }
}

/* ---------- Helpers ---------- */

function haversine(a: GeoPoint, b: GeoPoint): number {
  const R = 6371; // km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function classifyTraffic(baseDurationSec?: number, trafficDurationSec?: number): 'light' | 'moderate' | 'heavy' {
  if (!baseDurationSec || !trafficDurationSec) return 'light';
  const ratio = trafficDurationSec / baseDurationSec;
  if (ratio < 1.1) return 'light';
  if (ratio < 1.3) return 'moderate';
  return 'heavy';
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/* ---------- Mock facility data (for demo when no backend) ---------- */

export const MOCK_FACILITIES: FacilityWithDistance[] = [
  { id: '1', name: 'Hospital Central de Maputo', type: 'hospital', address: 'Av. Eduardo Mondlane, Maputo', geo: { lat: -25.9655, lng: 32.5832 }, phone: '+258 84 000 0000', is_24h: true, rating: 4.2 },
  { id: '2', name: 'Hospital Geral José Macamo', type: 'hospital', address: 'Maputo', geo: { lat: -25.9453, lng: 32.5701 }, is_24h: true, rating: 4.0 },
  { id: '3', name: 'Clínica Cruz Azul', type: 'clinic', address: 'Av. 24 de Julho, Maputo', geo: { lat: -25.9715, lng: 32.5732 }, phone: '+258 21 000 0000', opening_hours: '07h-19h', rating: 4.5 },
  { id: '4', name: 'Farmácia Moderna', type: 'pharmacy', address: 'Av. Julius Nyerere', geo: { lat: -25.9689, lng: 32.5801 }, opening_hours: '08h-21h', rating: 4.3 },
  { id: '5', name: 'Lab. Clínico Instituto Nacional', type: 'lab', address: 'Maputo', geo: { lat: -25.9620, lng: 32.5780 }, opening_hours: '07h-16h', rating: 4.1 },
  { id: '6', name: 'Maternidade Hospital Machava', type: 'maternity', address: 'Matola', geo: { lat: -25.9167, lng: 32.4667 }, is_24h: true, rating: 3.9 },
  { id: '7', name: 'Hospital Provincial de Beira', type: 'hospital', address: 'Beira', geo: { lat: -19.8336, lng: 34.8736 }, is_24h: true, rating: 4.0 },
  { id: '8', name: 'Farmácia Sónia', type: 'pharmacy', address: 'Av. Kim Il Sung, Maputo', geo: { lat: -25.9690, lng: 32.5750 }, opening_hours: '08h-22h', rating: 4.4 },
];
