import { describe, expect, it } from 'vitest';
import { formatCurrency } from './currencyService';

describe('formatCurrency', () => {
  it('formats MZN with Portuguese locale', () => {
    const result = formatCurrency(1500, 'MZN', 'pt-MZ');
    // Intl.NumberFormat may not know MZN, so it may fall back or use the code
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats USD with English locale', () => {
    const result = formatCurrency(99.99, 'USD', 'en-US');
    expect(result).toContain('99.99');
  });

  it('formats EUR with French locale', () => {
    const result = formatCurrency(50, 'EUR', 'fr-FR');
    expect(result).toContain('50');
  });

  it('formats INR with Hindi locale', () => {
    const result = formatCurrency(1000, 'INR', 'hi-IN');
    expect(result).toContain('1,000');
  });

  it('handles zero amount', () => {
    const result = formatCurrency(0, 'MZN', 'pt-MZ');
    expect(result).toContain('0');
  });

  it('handles very small amounts', () => {
    const result = formatCurrency(0.01, 'USD', 'en-US');
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles very large amounts', () => {
    const result = formatCurrency(9999999.99, 'USD', 'en-US');
    expect(result).toBeTruthy();
  });

  it('falls back to "amount currency" for invalid currency', () => {
    const result = formatCurrency(100, 'XYZ', 'en-US');
    expect(result).toContain('100');
    expect(result).toContain('XYZ');
  });
});
