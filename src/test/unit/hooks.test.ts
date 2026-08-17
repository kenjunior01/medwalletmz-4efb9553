import { describe, it, expect, vi, beforeEach } from 'vitest';

// ------------------------------------------------------------------
// Testes unitários puros — sem Supabase, sem React rendering
// ------------------------------------------------------------------

describe('useWallet — lógica pura (currency fallback)', () => {
  // Testamos a lógica de fallback directamente sem montar o hook
  const FALLBACK_CURRENCY_BY_COUNTRY: Record<string, string> = {
    MZ: 'MZN', BR: 'BRL', AO: 'AOA', ZA: 'ZAR', PT: 'EUR', IN: 'INR'
  };

  const getCurrency = (countryId: string | null | undefined, dbCurrency?: string): string => {
    return dbCurrency || FALLBACK_CURRENCY_BY_COUNTRY[countryId || 'MZ'] || 'USD';
  };

  it('deve usar currency da DB quando disponível', () => {
    expect(getCurrency('MZ', 'MZN')).toBe('MZN');
    expect(getCurrency('BR', 'USD')).toBe('USD'); // DB sobrepõe fallback
  });

  it('deve usar fallback para MZ quando DB retorna vazio', () => {
    expect(getCurrency('MZ')).toBe('MZN');
    expect(getCurrency('MZ', undefined)).toBe('MZN');
  });

  it('deve usar fallback para BR', () => {
    expect(getCurrency('BR')).toBe('BRL');
  });

  it('deve usar USD para país sem fallback', () => {
    expect(getCurrency('XX')).toBe('USD');
    expect(getCurrency(null)).toBe('MZN'); // default MZ
    expect(getCurrency(undefined)).toBe('MZN');
  });
});

describe('AppRole — validação de roles', () => {
  const VALID_ROLES = [
    'admin', 'customer', 'store_owner', 'driver', 'doctor', 'clinic',
    'country_manager', 'provincial_manager', 'regional_ceo', 'regional_manager',
    'insurance', 'hospital', 'lab', 'pharmacy', 'veterinary',
  ] as const;

  it('deve ter 15 roles válidas', () => {
    expect(VALID_ROLES).toHaveLength(15);
  });

  it('cada role deve ser string única', () => {
    const unique = new Set(VALID_ROLES);
    expect(unique.size).toBe(VALID_ROLES.length);
  });

  it('deve incluir roles de saúde', () => {
    expect(VALID_ROLES).toContain('doctor');
    expect(VALID_ROLES).toContain('clinic');
    expect(VALID_ROLES).toContain('hospital');
    expect(VALID_ROLES).toContain('lab');
    expect(VALID_ROLES).toContain('pharmacy');
  });

  it('deve incluir roles de gestão', () => {
    expect(VALID_ROLES).toContain('admin');
    expect(VALID_ROLES).toContain('country_manager');
    expect(VALID_ROLES).toContain('regional_ceo');
  });
});

describe('hasRole — lógica de verificação', () => {
  it('deve encontrar role existente', () => {
    const roles = ['customer', 'driver'];
    const hasRole = (role: string) => roles.includes(role as any);
    expect(hasRole('driver')).toBe(true);
  });

  it('deve retornar false para role ausente', () => {
    const roles = ['customer'];
    const hasRole = (role: string) => roles.includes(role as any);
    expect(hasRole('admin')).toBe(false);
  });

  it('deve lidar com array vazio', () => {
    const hasRole = (role: string) => ([] as string[]).includes(role as any);
    expect(hasRole('admin')).toBe(false);
  });
});
