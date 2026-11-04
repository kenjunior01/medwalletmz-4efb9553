import { describe, expect, it } from 'vitest';
import { buildExternalDirectionsUrl, getSafeImageUrl, normalizeImageUrl } from './healthRoutes';

describe('buildExternalDirectionsUrl', () => {
    it('builds an OpenStreetMap directions URL on desktop (no mobile UA)', () => {
        const url = buildExternalDirectionsUrl(
            { lat: -25.9692, lng: 32.5732 },
            { lat: -25.9701, lng: 32.5799 },
            'driving',
        );

        expect(url).toContain('https://www.openstreetmap.org/directions');
        expect(url).toContain('route=-25.9692,32.5732;-25.9701,32.5799');
    });
});

describe('normalizeImageUrl', () => {
    it('rejects invalid image values', () => {
        expect(normalizeImageUrl('')).toBeNull();
        expect(normalizeImageUrl(undefined)).toBeNull();
        expect(normalizeImageUrl('not-a-url')).toBeNull();
        expect(normalizeImageUrl('javascript:alert(1)')).toBeNull();
    });

    it('keeps safe public image URLs', () => {
        expect(normalizeImageUrl('https://example.com/hospital.png')).toBe('https://example.com/hospital.png');
        expect(normalizeImageUrl('/images/hospital.png')).toBe('/images/hospital.png');
    });
});

describe('getSafeImageUrl', () => {
    it('returns the fallback image for empty values', () => {
        expect(getSafeImageUrl('')).toBe('/placeholder.svg');
        expect(getSafeImageUrl(undefined)).toBe('/placeholder.svg');
    });

    it('keeps a valid public image URL', () => {
        expect(getSafeImageUrl('https://example.com/hospital.png')).toBe('https://example.com/hospital.png');
    });
});
