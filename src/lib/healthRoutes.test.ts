import { describe, expect, it } from 'vitest';
import { buildGoogleMapsDirectionsUrl, getSafeImageUrl, normalizeImageUrl } from './healthRoutes';

describe('buildGoogleMapsDirectionsUrl', () => {
    it('builds a Google Maps directions URL with origin and destination', () => {
        const url = buildGoogleMapsDirectionsUrl(
            { lat: -25.9692, lng: 32.5732 },
            { lat: -25.9701, lng: 32.5799 },
            'driving',
        );

        expect(url).toContain('https://www.google.com/maps/dir/');
        expect(url).toContain('destination=-25.9701%2C32.5799');
        expect(url).toContain('origin=-25.9692%2C32.5732');
        expect(url).toContain('travelmode=driving');
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
