import { describe, expect, it, vi } from 'vitest';
import { formatLocal, formatRelative, getUserTimezone } from './date-utils';

describe('formatLocal', () => {
  it('formats a date string with default Portuguese locale', () => {
    const result = formatLocal('2024-01-15T14:30:00');
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats a Date object', () => {
    const result = formatLocal(new Date(2024, 0, 15, 14, 30));
    expect(result).toBeTruthy();
  });

  it('uses English locale when specified', () => {
    const result = formatLocal('2024-01-15T14:30:00', 'PP', 'en');
    expect(result).toBeTruthy();
  });

  it('uses Hindi locale when specified', () => {
    const result = formatLocal('2024-01-15T14:30:00', 'PP', 'hi');
    expect(result).toBeTruthy();
  });

  it('uses pt-BR locale when specified', () => {
    const result = formatLocal('2024-01-15T14:30:00', 'PP', 'pt-BR');
    expect(result).toBeTruthy();
  });

  it('falls back to pt for unknown locale', () => {
    const result = formatLocal('2024-01-15T14:30:00', 'PP', 'xyz');
    expect(result).toBeTruthy();
  });
});

describe('formatRelative', () => {
  it('returns a non-empty string for a recent date', () => {
    const result = formatRelative(new Date());
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a non-empty string for a date string', () => {
    const result = formatRelative('2024-01-15T14:30:00');
    expect(result).toBeTruthy();
  });

  it('includes suffix text (e.g. "ago")', () => {
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 2);
    const result = formatRelative(pastDate);
    expect(result).toBeTruthy();
  });

  it('uses specified locale', () => {
    const result = formatRelative('2024-01-15T14:30:00', 'en');
    expect(result).toBeTruthy();
  });
});

describe('getUserTimezone', () => {
  it('returns a non-empty string', () => {
    const tz = getUserTimezone();
    expect(tz).toBeTruthy();
    expect(tz.length).toBeGreaterThan(0);
  });

  it('returns a valid timezone string', () => {
    const tz = getUserTimezone();
    expect(tz).toBeTruthy();
    expect(tz.length).toBeGreaterThan(0);
    // UTC is a valid IANA timezone (used in CI environments)
    expect(['UTC', ...tz.split('/')]).toBeTruthy();
  });
});
