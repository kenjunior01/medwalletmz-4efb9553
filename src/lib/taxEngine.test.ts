import { describe, expect, it } from 'vitest';
import { calculateTaxes } from './taxEngine';

describe('calculateTaxes', () => {
  describe('Mozambique (MZ)', () => {
    it('applies 17% IVA for pharmacy (default)', () => {
      const result = calculateTaxes(1000, 'MZ', 'pharmacy');
      expect(result.rate).toBe(0.17);
      expect(result.amount).toBe(170);
      expect(result.name).toBe('IVA');
    });

    it('applies 0% for consultation (healthcare exempt)', () => {
      const result = calculateTaxes(500, 'MZ', 'consultation');
      expect(result.rate).toBe(0);
      expect(result.amount).toBe(0);
    });

    it('applies 17% for lab services', () => {
      const result = calculateTaxes(200, 'MZ', 'lab');
      expect(result.rate).toBe(0.17);
      expect(result.amount).toBe(34);
    });

    it('falls back to 17% default for unknown service', () => {
      const result = calculateTaxes(100, 'MZ', 'unknown_service');
      expect(result.rate).toBe(0.17);
      expect(result.amount).toBe(17);
    });
  });

  describe('South Africa (ZA)', () => {
    it('applies 15% VAT for pharmacy', () => {
      const result = calculateTaxes(1000, 'ZA', 'pharmacy');
      expect(result.rate).toBe(0.15);
      expect(result.amount).toBe(150);
      expect(result.name).toBe('VAT');
    });

    it('applies 15% VAT for consultation', () => {
      const result = calculateTaxes(200, 'ZA', 'consultation');
      expect(result.rate).toBe(0.15);
      expect(result.amount).toBe(30);
    });
  });

  describe('Portugal (PT)', () => {
    it('applies reduced 6% IVA for pharmacy', () => {
      const result = calculateTaxes(100, 'PT', 'pharmacy');
      expect(result.rate).toBe(0.06);
      expect(result.amount).toBe(6);
    });

    it('applies 0% for consultation', () => {
      const result = calculateTaxes(50, 'PT', 'consultation');
      expect(result.rate).toBe(0);
      expect(result.amount).toBe(0);
    });
  });

  describe('France (FR)', () => {
    it('applies super-reduced 2.1% TVA for pharmacy', () => {
      const result = calculateTaxes(1000, 'FR', 'pharmacy');
      expect(result.rate).toBe(0.021);
      expect(result.amount).toBe(21);
    });
  });

  describe('Spain (ES)', () => {
    it('applies 4% IVA for pharmacy', () => {
      const result = calculateTaxes(100, 'ES', 'pharmacy');
      expect(result.rate).toBe(0.04);
      expect(result.amount).toBe(4);
    });
  });

  describe('Brazil (BR)', () => {
    it('applies 18% ISS/ICMS for pharmacy', () => {
      const result = calculateTaxes(100, 'BR', 'pharmacy');
      expect(result.rate).toBe(0.18);
      expect(result.amount).toBe(18);
      expect(result.name).toBe('ISS/ICMS');
    });
  });

  describe('India (IN)', () => {
    it('applies 12% GST for pharmacy', () => {
      const result = calculateTaxes(100, 'IN', 'pharmacy');
      expect(result.rate).toBe(0.12);
      expect(result.amount).toBe(12);
      expect(result.name).toBe('GST');
    });
  });

  describe('US (US)', () => {
    it('applies 0% for pharmacy (prescription exempt)', () => {
      const result = calculateTaxes(100, 'US', 'pharmacy');
      expect(result.rate).toBe(0);
      expect(result.amount).toBe(0);
      expect(result.name).toBe('Sales Tax');
    });
  });

  describe('UK (GB)', () => {
    it('applies 0% for pharmacy (zero-rated)', () => {
      const result = calculateTaxes(100, 'GB', 'pharmacy');
      expect(result.rate).toBe(0);
      expect(result.amount).toBe(0);
    });
  });

  describe('Unknown country fallback', () => {
    it('falls back to MZ config for unknown country', () => {
      const result = calculateTaxes(100, 'XX', 'pharmacy');
      expect(result.rate).toBe(0.17);
      expect(result.name).toBe('IVA');
    });
  });

  describe('Edge cases', () => {
    it('handles zero subtotal', () => {
      const result = calculateTaxes(0, 'MZ', 'pharmacy');
      expect(result.amount).toBe(0);
    });

    it('handles very large amounts', () => {
      const result = calculateTaxes(10000000, 'ZA', 'pharmacy');
      expect(result.amount).toBe(1500000);
    });
  });
});
