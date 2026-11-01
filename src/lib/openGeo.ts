/**
 * openGeo — Geocoding gratuito via Nominatim (OpenStreetMap).
 * Sem chave de API. Política de uso: máx. 1 pedido/segundo com User-Agent
 * identificável — respeitamos isso com fila serial + cache em memória.
 *
 * Docs: https://nominatim.org/release-docs/latest/api/Search/
 */

import { logger } from '@/lib/logger';

const NOMINATIM = 'https://nominatim.openstreetmap.org';

export interface GeoAddress {
  label: string;
  lat: number;
  lng: number;
  neighborhood?: string;
  city?: string;
  country?: string;
}

interface CacheEntry {
  at: number;
  data: unknown;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000; // 10 min
let queue: Promise<void> = Promise.resolve();
let lastRequestAt = 0;
const MIN_INTERVAL = 1100; // ms — respeita a política de uso do Nominatim

/** Serializa pedidos para nunca exceder ~1 req/s. */
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = Math.max(0, lastRequestAt + MIN_INTERVAL - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
    return fn();
  });
  queue = run.then(() => undefined, () => undefined);
  return run;
}

function fromCache<T>(key: string): T | null {
  const e = cache.get(key);
  if (e && Date.now() - e.at < CACHE_TTL) return e.data as T;
  return null;
}

function toCache(key: string, data: unknown) {
  cache.set(key, { at: Date.now(), data });
  if (cache.size > 300) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) cache.delete(oldest[0]);
  }
}

/** Extrai bairro/cidade dos address_details do Nominatim. */
function parseDetails(raw: any): GeoAddress {
  const a = raw.address ?? {};
  return {
    label: raw.display_name ?? `${raw.lat},${raw.lon}`,
    lat: Number(raw.lat ?? raw.latitute),
    lng: Number(raw.lon),
    neighborhood: a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district ?? undefined,
    city: a.city ?? a.town ?? a.village ?? a.municipality ?? undefined,
    country: a.country ?? undefined,
  };
}

/**
 * Pesquisa moradas/locais por texto (autocompletar de endereço).
 * @param countryCodes ex.: ['MZ'] ou ['BR'] — vazio = global
 */
export async function searchAddresses(
  query: string,
  opts: { countryCodes?: string[]; limit?: number } = {},
): Promise<GeoAddress[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const { countryCodes = ['MZ'], limit = 6 } = opts;
  const key = `s:${q.toLowerCase()}|${countryCodes.join(',')}|${limit}`;
  const cached = fromCache<GeoAddress[]>(key);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      q,
      format: 'jsonv2',
      addressdetails: '1',
      limit: String(limit),
    });
    if (countryCodes.length) params.set('countrycodes', countryCodes.join(','));
    const res = await throttled(() => fetch(`${NOMINATIM}/search?${params.toString()}`));
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    const data = await res.json();
    const out: GeoAddress[] = (Array.isArray(data) ? data : []).map(parseDetails);
    toCache(key, out);
    return out;
  } catch (e) {
    logger.warn('[openGeo] searchAddresses falhou', { error: e });
    return [];
  }
}

/** Converte coordenadas em morada legível. */
export async function reverseGeocodePoint(lat: number, lng: number): Promise<GeoAddress | null> {
  const key = `r:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = fromCache<GeoAddress>(key);
  if (cached) return cached;
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '18',
    });
    const res = await throttled(() => fetch(`${NOMINATIM}/reverse?${params.toString()}`));
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    const raw = await res.json();
    if (!raw || raw.error) return null;
    const out = parseDetails(raw);
    toCache(key, out);
    return out;
  } catch (e) {
    logger.warn('[openGeo] reverseGeocodePoint falhou', { error: e });
    return null;
  }
}

/**
 * Geocodifica um endereço composto (para curadoria/admin).
 * Devolve null quando não encontra.
 */
export async function geocodeOne(parts: {
  name?: string;
  address?: string;
  city?: string;
  countryCode?: string;
}): Promise<GeoAddress | null> {
  const q = [parts.name, parts.address, parts.city].filter(Boolean).join(', ').trim();
  if (!q) return null;
  const res = await searchAddresses(q, { countryCodes: parts.countryCode ? [parts.countryCode] : [], limit: 1 });
  return res[0] ?? null;
}
