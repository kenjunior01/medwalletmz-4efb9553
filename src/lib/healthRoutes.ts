import {
    buildExternalDirectionsUrl as buildDirectionsUrl,
} from '@/lib/openRoutes';

export interface CoordinateLike {
    lat: number;
    lng: number;
}

/**
 * Link "abrir no app de mapas" — abre a app nativa no telemóvel
 * (Google Maps no Android/iOS) e o OpenStreetMap no desktop.
 */
export function buildExternalDirectionsUrl(
    origin: CoordinateLike | null | undefined,
    destination: CoordinateLike,
    travelMode: 'driving' | 'walking' | 'transit' | 'bicycling' = 'driving',
) {
    return buildDirectionsUrl(origin, destination, travelMode);
}

function isLikelyImageUrl(value: string) {
    if (!value) return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (/^(data:image\/|https?:\/\/|\/)/i.test(trimmed)) return true;
    return false;
}

export function normalizeImageUrl(url?: string | null) {
    if (!url || typeof url !== 'string') return null;

    const trimmed = url.trim();
    if (!trimmed || !isLikelyImageUrl(trimmed)) return null;

    if (/^javascript:/i.test(trimmed)) return null;

    try {
        const parsed = new URL(trimmed, window.location.origin);
        if (parsed.protocol === 'javascript:') return null;
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:' && parsed.protocol !== 'data:') return null;
    } catch {
        return null;
    }

    return trimmed;
}

export function getSafeImageUrl(url?: string | null) {
    const normalized = normalizeImageUrl(url);
    if (!normalized) return '/placeholder.svg';
    return normalized;
}
