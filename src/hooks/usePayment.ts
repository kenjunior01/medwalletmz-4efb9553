// ========================================================================
// usePayment hook — React hook for payment operations
// Provides easy access to payment providers, methods, and transactions
// ========================================================================

import { useState, useCallback, useMemo } from 'react';
import { useCountry } from '@/contexts/CountryContext';
import {
  getProvidersForCountry,
  getPaymentMethodsForCountry,
  initiatePayment as _initiatePayment,
  verifyPayment as _verifyPayment,
  getProviderById,
} from '@/services/payments';
import type { PaymentRequest, PaymentResponse, PaymentMethod, PaymentVerification } from '@/services/payments';

interface UsePaymentReturn {
  /** Available providers for current country */
  providers: ReturnType<typeof getProvidersForCountry>;
  /** Available payment methods for current country */
  paymentMethods: PaymentMethod[];
  /** Currently selected provider ID */
  selectedProvider: string | null;
  /** Select a payment provider */
  setSelectedProvider: (id: string | null) => void;
  /** Initiate a payment */
  initiatePayment: (request: Omit<PaymentRequest, 'countryCode' | 'currency'>) => Promise<PaymentResponse>;
  /** Verify a payment */
  verifyPayment: (transactionId: string) => Promise<PaymentVerification>;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Clear error */
  clearError: () => void;
}

export function usePayment(): UsePaymentReturn {
  const { country } = useCountry();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countryCode = country?.id || 'MZ';
  const currencyCode = country?.currency_code || 'MZN';

  const providers = useMemo(
    () => getProvidersForCountry(countryCode),
    [countryCode]
  );

  const paymentMethods = useMemo(
    () => getPaymentMethodsForCountry(countryCode),
    [countryCode]
  );

  // Auto-select first provider if none selected
  useMemo(() => {
    if (!selectedProvider && providers.length > 0) {
      setSelectedProvider(providers[0].provider.id);
    }
  }, [selectedProvider, providers]);

  const initiatePayment = useCallback(async (request: Omit<PaymentRequest, 'countryCode' | 'currency'>) => {
    setLoading(true);
    setError(null);
    try {
      const fullRequest: PaymentRequest = {
        ...request,
        countryCode,
        currency: currencyCode,
      };
      const result = await _initiatePayment(fullRequest, selectedProvider || undefined);
      if (!result.success) {
        setError(result.message);
      }
      return result;
    } catch (err: any) {
      const msg = err?.message || 'Erro ao iniciar pagamento';
      setError(msg);
      return {
        success: false,
        status: 'failed',
        message: msg,
        timestamp: new Date().toISOString(),
      };
    } finally {
      setLoading(false);
    }
  }, [countryCode, currencyCode, selectedProvider]);

  const verifyPayment = useCallback(async (transactionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await _verifyPayment(transactionId, selectedProvider || undefined);
      return result;
    } catch (err: any) {
      const msg = err?.message || 'Erro ao verificar pagamento';
      setError(msg);
      return {
        transactionId,
        status: 'failed' as const,
        verifiedAt: new Date().toISOString(),
      };
    } finally {
      setLoading(false);
    }
  }, [selectedProvider]);

  const clearError = useCallback(() => setError(null), []);

  return {
    providers,
    paymentMethods,
    selectedProvider,
    setSelectedProvider,
    initiatePayment,
    verifyPayment,
    loading,
    error,
    clearError,
  };
}
