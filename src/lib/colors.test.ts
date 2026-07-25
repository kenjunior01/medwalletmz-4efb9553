import { describe, expect, it } from 'vitest';
import { hexToHslComponents } from './colors';

describe('hexToHslComponents', () => {
  it('converts black (#000000) to HSL', () => {
    const result = hexToHslComponents('#000000');
    expect(result).toBe('0 0% 0%');
  });

  it('converts white (#FFFFFF) to HSL', () => {
    const result = hexToHslComponents('#FFFFFF');
    expect(result).toBe('0 0% 100%');
  });

  it('converts red (#FF0000) to HSL', () => {
    const result = hexToHslComponents('#FF0000');
    const [h, s, l] = result.split(' ');
    expect(Number(h)).toBe(0);
    expect(parseInt(s)).toBe(100);
  });

  it('converts green (#00FF00) to HSL', () => {
    const result = hexToHslComponents('#00FF00');
    const [h, s, l] = result.split(' ');
    expect(Number(h)).toBe(120);
    expect(parseInt(s)).toBe(100);
  });

  it('converts blue (#0000FF) to HSL', () => {
    const result = hexToHslComponents('#0000FF');
    const [h, s, l] = result.split(' ');
    expect(Number(h)).toBe(240);
    expect(parseInt(s)).toBe(100);
  });

  it('handles short hex (#F00)', () => {
    const result = hexToHslComponents('#F00');
    expect(result).toBe('0 100% 50%');
  });

  it('handles short hex (#0F0)', () => {
    const result = hexToHslComponents('#0F0');
    expect(result).toBe('120 100% 50%');
  });

  it('handles short hex (#00F)', () => {
    const result = hexToHslComponents('#00F');
    expect(result).toBe('240 100% 50%');
  });

  it('returns input unchanged for non-hex values', () => {
    expect(hexToHslComponents('red')).toBe('red');
    expect(hexToHslComponents('')).toBe('');
    expect(hexToHslComponents('rgb(0,0,0)')).toBe('rgb(0,0,0)');
  });

  it('returns input unchanged for missing hash', () => {
    expect(hexToHslComponents('FF0000')).toBe('FF0000');
  });

  it('converts MedWallet green (#10B981)', () => {
    const result = hexToHslComponents('#10B981');
    const parts = result.split(' ');
    expect(parts.length).toBe(3);
    const h = parseInt(parts[0]);
    expect(h).toBeGreaterThanOrEqual(150);
    expect(h).toBeLessThanOrEqual(170);
  });

  it('all output parts are valid numbers', () => {
    const result = hexToHslComponents('#3B82F6');
    const [h, s, l] = result.split(' ');
    expect(Number(h)).toBeGreaterThanOrEqual(0);
    expect(Number(h)).toBeLessThanOrEqual(360);
    expect(s).toMatch(/\d+%/);
    expect(l).toMatch(/\d+%/);
  });
});
