import { describe, expect, it } from 'vitest';
import { getAriaProps } from './accessibility';

describe('getAriaProps', () => {
  it('returns empty object for empty options', () => {
    const result = getAriaProps({});
    expect(result).toEqual({});
  });

  it('returns aria-label when provided', () => {
    const result = getAriaProps({ label: 'Search' });
    expect(result).toEqual({ 'aria-label': 'Search' });
  });

  it('returns aria-describedby when provided', () => {
    const result = getAriaProps({ describedBy: 'search-help' });
    expect(result).toEqual({ 'aria-describedby': 'search-help' });
  });

  it('returns aria-expanded when true', () => {
    const result = getAriaProps({ expanded: true });
    expect(result).toEqual({ 'aria-expanded': true });
  });

  it('returns aria-expanded when false', () => {
    const result = getAriaProps({ expanded: false });
    expect(result).toEqual({ 'aria-expanded': false });
  });

  it('returns aria-controls when provided', () => {
    const result = getAriaProps({ controls: 'menu-1' });
    expect(result).toEqual({ 'aria-controls': 'menu-1' });
  });

  it('returns role when provided', () => {
    const result = getAriaProps({ role: 'navigation' });
    expect(result).toEqual({ role: 'navigation' });
  });

  it('returns aria-live when provided', () => {
    const result = getAriaProps({ live: 'polite' });
    expect(result).toEqual({ 'aria-live': 'polite' });
  });

  it('returns aria-busy when provided', () => {
    const result = getAriaProps({ busy: true });
    expect(result).toEqual({ 'aria-busy': true });
  });

  it('combines multiple props', () => {
    const result = getAriaProps({
      label: 'Menu',
      expanded: true,
      controls: 'nav-menu',
      role: 'button',
    });
    expect(result).toEqual({
      'aria-label': 'Menu',
      'aria-expanded': true,
      'aria-controls': 'nav-menu',
      role: 'button',
    });
  });

  it('does not include undefined props', () => {
    const result = getAriaProps({
      label: 'Test',
      describedBy: undefined,
      expanded: undefined,
    });
    expect(result).toEqual({ 'aria-label': 'Test' });
    expect(result).not.toHaveProperty('aria-describedby');
    expect(result).not.toHaveProperty('aria-expanded');
  });
});
