/**
 * src/lib/mzAdoption.test.ts
 * Testes para as funções de adopção pública:
 *  - Free Trial (startFreeTrial, hasUsedFreeTrial, getFreeTrialDaysRemaining)
 *  - Public Impact Stats (getPublicImpactStats)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase antes de importar o móduloUnderTest
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockEq = vi.fn();
const mockIlike = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();

const chain = {
  select: mockSelect,
  insert: mockInsert,
  eq: mockEq,
  ilike: mockIlike,
  order: mockOrder,
  limit: mockLimit,
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
};
Object.values(chain).forEach((fn) => fn.mockReturnValue(chain));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => chain),
  },
}));

// Importa depois do mock
import {
  FREE_TRIAL_DAYS,
  FREE_TRIAL_PLAN_SLUGS,
  hasUsedFreeTrial,
  startFreeTrial,
  getFreeTrialDaysRemaining,
  getPublicImpactStats,
} from './mzMonetization';

describe('Free Trial — constantes', () => {
  it('FREE_TRIAL_DAYS deve ser 30', () => {
    expect(FREE_TRIAL_DAYS).toBe(30);
  });

  it('FREE_TRIAL_PLAN_SLUGS contém 4 planos elegíveis', () => {
    expect(FREE_TRIAL_PLAN_SLUGS).toHaveLength(4);
    expect(FREE_TRIAL_PLAN_SLUGS).toContain('plus-individual');
    expect(FREE_TRIAL_PLAN_SLUGS).toContain('plus-gravida');
    expect(FREE_TRIAL_PLAN_SLUGS).toContain('plus-cronico');
    expect(FREE_TRIAL_PLAN_SLUGS).toContain('premium-individual');
  });

  it('Planos família e B2B NÃO são elegíveis para trial', () => {
    expect(FREE_TRIAL_PLAN_SLUGS).not.toContain('plus-familia');
    expect(FREE_TRIAL_PLAN_SLUGS).not.toContain('premium-familia');
    expect(FREE_TRIAL_PLAN_SLUGS).not.toContain('doctor-pro');
    expect(FREE_TRIAL_PLAN_SLUGS).not.toContain('clinica-basic');
  });
});

describe('hasUsedFreeTrial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna false se userId vazio', async () => {
    const result = await hasUsedFreeTrial('');
    expect(result).toBe(false);
  });

  it('retorna true quando existe sub com admin_notes FREE_TRIAL', async () => {
    mockSelect.mockReturnValue(chain);
    mockEq.mockReturnValue(chain);
    mockIlike.mockReturnValue(chain);
    mockLimit.mockReturnValue(chain);
    // simula retorno com 1 linha
    Object.assign(chain, { data: [{ id: 'sub-1', admin_notes: 'FREE_TRIAL · ...' }], error: null });
    const result = await hasUsedFreeTrial('user-123');
    expect(result).toBe(true);
  });

  it('retorna false quando não há trials prévios', async () => {
    Object.assign(chain, { data: [], error: null });
    const result = await hasUsedFreeTrial('user-123');
    expect(result).toBe(false);
  });
});

describe('startFreeTrial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna NO_USER se userId vazio', async () => {
    const result = await startFreeTrial({ userId: '', planSlug: 'plus-individual' });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NO_USER');
  });

  it('retorna PLAN_NOT_ELIGIBLE se slug não elegível', async () => {
    const result = await startFreeTrial({ userId: 'u1', planSlug: 'plus-familia' });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('PLAN_NOT_ELIGIBLE');
  });
});

describe('getFreeTrialDaysRemaining', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna null se userId vazio', async () => {
    const result = await getFreeTrialDaysRemaining('');
    expect(result).toBeNull();
  });

  it('calcula dias restantes correctamente quando há trial activo', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    Object.assign(chain, {
      data: { expires_at: futureDate.toISOString() },
      error: null,
    });
    const result = await getFreeTrialDaysRemaining('u1');
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(13);
    expect(result!).toBeLessThanOrEqual(15);
  });

  it('retorna 0 se trial já expirou', async () => {
    const pastDate = new Date('2020-01-01');
    Object.assign(chain, {
      data: { expires_at: pastDate.toISOString() },
      error: null,
    });
    const result = await getFreeTrialDaysRemaining('u1');
    expect(result).toBe(0);
  });
});

describe('getPublicImpactStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna estrutura completa mesmo sem BD', async () => {
    Object.assign(chain, { count: 0, error: null });
    const result = await getPublicImpactStats();
    expect(result).toHaveProperty('totalUsers');
    expect(result).toHaveProperty('activeSubscriptions');
    expect(result).toHaveProperty('totalTriages');
    expect(result).toHaveProperty('hospitalReferrals');
    expect(result).toHaveProperty('articlesRead');
    expect(result).toHaveProperty('apeAgents');
    expect(result).toHaveProperty('provincesCovered');
    expect(result).toHaveProperty('lastUpdated');
  });

  it('provincesCovered é sempre 11 (Moçambique)', async () => {
    Object.assign(chain, { count: 0, error: null });
    const result = await getPublicImpactStats();
    expect(result.provincesCovered).toBe(11);
  });

  it('lastUpdated é uma data ISO válida', async () => {
    Object.assign(chain, { count: 0, error: null });
    const result = await getPublicImpactStats();
    const d = new Date(result.lastUpdated);
    expect(d.getTime()).not.toBeNaN();
  });
});
