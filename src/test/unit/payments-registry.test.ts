import { describe, it, expect, vi, beforeEach } from 'vitest';

// ------------------------------------------------------------------
// Mock do supabase ANTES de qualquer import que o use
// ------------------------------------------------------------------
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import {
  getProvidersForCountry,
  getPaymentMethodsForCountry,
  getProviderById,
  getCountryCoverage,
  getAllProviders,
} from '@/services/payments/index';
import { supabase } from '@/integrations/supabase/client';

const mockedInvoke = vi.mocked(supabase.functions.invoke);

describe('Payment Service Registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- getProvidersForCountry ----
  describe('getProvidersForCountry', () => {
    it('deve retornar M-Pesa e e-Mola para MZ', () => {
      const providers = getProvidersForCountry('MZ');
      const ids = providers.map(p => p.provider.id);

      expect(ids).toContain('mpesa');
      expect(ids).toContain('emola');
    });

    it('deve retornar M-Pesa para KE', () => {
      const providers = getProvidersForCountry('KE');
      const ids = providers.map(p => p.provider.id);

      expect(ids).toContain('mpesa');
    });

    it('deve retornar Orange Money e MTN MoMo para CM', () => {
      const providers = getProvidersForCountry('CM');
      const ids = providers.map(p => p.provider.id);

      expect(ids).toContain('orange_money');
      expect(ids).toContain('mtn_momo');
    });

    it('deve retornar Paystack e Flutterwave para NG', () => {
      const providers = getProvidersForCountry('NG');
      const ids = providers.map(p => p.provider.id);

      expect(ids).toContain('paystack');
      expect(ids).toContain('flutterwave');
    });

    it('deve retornar lista vazia para país sem providers', () => {
      const providers = getProvidersForCountry('US');
      expect(providers).toHaveLength(0);
    });

    it('deve ser case-insensitive para country code', () => {
      const upper = getProvidersForCountry('MZ');
      const lower = getProvidersForCountry('mz');

      expect(upper).toHaveLength(lower.length);
      expect(upper.map(p => p.provider.id)).toEqual(lower.map(p => p.provider.id));
    });
  });

  // ---- getPaymentMethodsForCountry ----
  describe('getPaymentMethodsForCountry', () => {
    it('deve retornar métodos com requiresPhone=true para MZ', () => {
      const methods = getPaymentMethodsForCountry('MZ');

      expect(methods.length).toBeGreaterThan(0);
      // M-Pesa e e-Mola requerem telefone em MZ
      const phoneMethods = methods.filter(m => m.requiresPhone);
      expect(phoneMethods.length).toBeGreaterThan(0);
    });

    it('deve retornar lista vazia para país sem providers', () => {
      const methods = getPaymentMethodsForCountry('XX');
      expect(methods).toHaveLength(0);
    });
  });

  // ---- getProviderById ----
  describe('getProviderById', () => {
    it('deve encontrar M-Pesa por id', () => {
      const provider = getProviderById('mpesa');
      expect(provider).toBeDefined();
      expect(provider!.provider.name).toBe('M-Pesa');
    });

    it('deve retornar undefined para id inexistente', () => {
      const provider = getProviderById('nonexistent-provider');
      expect(provider).toBeUndefined();
    });
  });

  // ---- getCountryCoverage ----
  describe('getCountryCoverage', () => {
    it('deve ter cobertura para MZ', () => {
      const coverage = getCountryCoverage();

      expect(coverage['MZ']).toBeDefined();
      expect(coverage['MZ'].providers.length).toBeGreaterThanOrEqual(2);
      expect(coverage['MZ'].currencies).toContain('MZN');
    });

    it('cada país deve ter providers e currencies não vazios', () => {
      const coverage = getCountryCoverage();

      Object.entries(coverage).forEach(([country, data]) => {
        expect(data.providers.length).toBeGreaterThan(0);
        expect(data.currencies.length).toBeGreaterThan(0);
      });
    });

    it('não deve ter currencies duplicadas por país', () => {
      const coverage = getCountryCoverage();

      Object.entries(coverage).forEach(([country, data]) => {
        const unique = new Set(data.currencies);
        expect(unique.size).toBe(data.currencies.length);
      });
    });
  });

  // ---- getAllProviders ----
  describe('getAllProviders', () => {
    it('deve retornar 10 providers', () => {
      const all = getAllProviders();
      expect(all).toHaveLength(10);
    });

    it('todos devem estar enabled', () => {
      const all = getAllProviders();
      all.forEach(p => {
        expect(p.enabled).toBe(true);
      });
    });

    it('todos devem ter pelo menos um país', () => {
      const all = getAllProviders();
      all.forEach(p => {
        expect(p.supportedCountries.length).toBeGreaterThan(0);
      });
    });
  });

  // ---- M-Pesa initiatePayment (com mock) ----
  describe('M-Pesa initiatePayment', () => {
    it('deve retornar sucesso quando Supabase responde bem', async () => {
      mockedInvoke.mockResolvedValueOnce({
        data: {
          transaction_id: 'tx-123',
          provider_ref: 'MPESA-REF-456',
          status: 'pending',
          message: 'STK push enviado',
        },
        error: null,
      });

      const { mpesaService } = await import('@/services/payments/mpesa');
      const result = await mpesaService.initiatePayment({
        amount: 500,
        currency: 'MZN',
        countryCode: 'MZ',
        phoneNumber: '841234567',
        reference: 'ORD-001',
        description: 'Encomenda #001',
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('tx-123');
      expect(result.status).toBe('pending');
      expect(mockedInvoke).toHaveBeenCalledWith('process-global-payment', {
        body: expect.objectContaining({ provider: 'mpesa', action: 'initiate' }),
      });
    });

    it('deve retornar falha quando Supabase dá erro', async () => {
      mockedInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Timeout', code: 'TIMEOUT' },
      });

      const { mpesaService } = await import('@/services/payments/mpesa');
      const result = await mpesaService.initiatePayment({
        amount: 500,
        currency: 'MZN',
        countryCode: 'MZ',
        reference: 'ORD-002',
        description: 'Teste erro',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
    });
  });
});
