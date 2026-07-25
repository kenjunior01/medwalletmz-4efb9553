// ========================================================================
// Fawry Payment Service — Egypt & MENA
// Countries: EG, SA, AE, KW, BH, OM, QA
// ========================================================================

import { supabase } from '@/integrations/supabase/client';
import { BasePaymentService, PaymentProvider, PaymentRequest, PaymentResponse, PaymentVerification, RefundRequest, RefundResponse, BalanceResponse, PaymentMethod } from './types';

export class FawryService extends BasePaymentService {
  readonly provider: PaymentProvider = {
    id: 'fawry',
    name: 'Fawry',
    supportedCountries: ['EG', 'SA', 'AE', 'KW', 'BH', 'OM', 'QA'],
    supportedCurrencies: ['EGP', 'SAR', 'AED', 'KWD', 'BHD', 'OMR', 'QAR'],
    icon: '🟣',
    color: '#7B2D8E',
    enabled: true,
    sandbox: false,
  };

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const { data, error } = await (supabase.functions as any).invoke('process-global-payment', {
        body: {
          provider: 'fawry', action: 'initiate',
          amount: request.amount, currency: request.currency,
          email: request.email, country_code: request.countryCode,
          reference: request.reference, description: request.description,
          callback_url: request.callbackUrl, return_url: request.returnUrl,
          metadata: request.metadata,
        },
      });
      if (error) return { success: false, status: 'failed', message: error.message || 'Erro ao iniciar pagamento Fawry', timestamp: new Date().toISOString() };
      return {
        success: true,
        transactionId: data?.transaction_id || data?.reference || `FAW-${Date.now()}`,
        checkoutUrl: data?.checkout_url,
        providerTransactionId: data?.provider_ref,
        status: data?.status || 'pending',
        message: data?.message || 'A redirecionar para o Fawry...',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return { success: false, status: 'failed', message: 'Serviço Fawry indisponível. Tente novamente.', timestamp: new Date().toISOString() };
    }
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    try {
      const { data, error } = await (supabase.functions as any).invoke('process-global-payment', {
        body: { provider: 'fawry', action: 'verify', transaction_id: transactionId },
      });
      if (error) return { transactionId, status: 'failed', verifiedAt: new Date().toISOString() };
      return { transactionId, providerTransactionId: data?.provider_ref, status: data?.status === 'completed' ? 'success' : data?.status === 'failed' ? 'failed' : 'pending', amount: data?.amount, currency: data?.currency, verifiedAt: new Date().toISOString() };
    } catch {
      return { transactionId, status: 'failed', verifiedAt: new Date().toISOString() };
    }
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      const { data, error } = await (supabase.functions as any).invoke('process-global-payment', {
        body: { provider: 'fawry', action: 'refund', transaction_id: request.transactionId, amount: request.amount, reason: request.reason },
      });
      if (error) return { success: false, status: 'failed', message: error.message, timestamp: new Date().toISOString() };
      return { success: true, refundId: data?.refund_id || `REF-FAW-${Date.now()}`, status: data?.status || 'pending', message: data?.message || 'Reembolso solicitado', timestamp: new Date().toISOString() };
    } catch {
      return { success: false, status: 'failed', message: 'Erro ao processar reembolso', timestamp: new Date().toISOString() };
    }
  }

  async getBalance(): Promise<BalanceResponse> {
    try {
      const { data, error } = await (supabase.functions as any).invoke('process-global-payment', {
        body: { provider: 'fawry', action: 'balance' },
      });
      if (error) return { available: 0, currency: 'EGP', pending: 0, lastUpdated: new Date().toISOString() };
      return { available: data?.available || 0, currency: data?.currency || 'EGP', pending: data?.pending || 0, lastUpdated: new Date().toISOString() };
    } catch {
      return { available: 0, currency: 'EGP', pending: 0, lastUpdated: new Date().toISOString() };
    }
  }

  getPaymentMethods(): PaymentMethod[] {
    return [
      { providerId: 'fawry_card', type: 'card', label: 'Fawry (Cartão)', icon: '💳', requiresPhone: false, requiresEmail: true },
      { providerId: 'fawry_wallet', type: 'wallet', label: 'Fawry (Wallet)', icon: '🟣', requiresPhone: true, requiresEmail: false },
      { providerId: 'fawry_cash', type: 'bank_transfer', label: 'Fawry (Cash/At Outlet)', icon: '🏪', requiresPhone: false, requiresEmail: true },
    ];
  }
}

export const fawryService = new FawryService();
