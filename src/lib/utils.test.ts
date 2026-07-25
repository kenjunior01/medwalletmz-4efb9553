import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    const result = cn('px-4', 'py-2');
    expect(result).toContain('px-4');
    expect(result).toContain('py-2');
  });

  it('handles empty inputs', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles undefined and null inputs', () => {
    const result = cn(undefined, null, 'px-4');
    expect(result).toBe('px-4');
  });

  it('merges conflicting Tailwind classes (later wins)', () => {
    const result = cn('px-4', 'px-8');
    expect(result).toBe('px-8');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base', isActive && 'active');
    expect(result).toContain('base');
    expect(result).toContain('active');
  });

  it('excludes falsy conditional classes', () => {
    const isActive = false;
    const result = cn('base', isActive && 'active');
    expect(result).toBe('base');
  });

  it('handles complex merging scenarios', () => {
    const result = cn(
      'bg-red-500 text-white',
      'bg-blue-500',
      'text-sm font-bold'
    );
    expect(result).toContain('bg-blue-500');
    expect(result).toContain('text-white'); // text-white doesn't conflict with text-sm
    expect(result).not.toContain('bg-red-500');
  });

  it('handles arrays of classes', () => {
    const result = cn(['px-4', 'py-2'], 'text-sm');
    expect(result).toContain('px-4');
    expect(result).toContain('py-2');
    expect(result).toContain('text-sm');
  });
});
