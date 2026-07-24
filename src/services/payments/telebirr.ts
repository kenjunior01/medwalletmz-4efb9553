// ========================================================================
// Telebirr Payment Service — Ethio Telecom Merchant API
// Countries: ET
// ========================================================================

import { supabase } from '@/integrations/supabase/client';
import { BasePaymentService, PaymentProvider, PaymentRequest, PaymentResponse, PaymentVerification, RefundRequest, RefundResponse, BalanceResponse, PaymentMethod } from './types';

export class TelebirrService extends BasePaymentService {
  readonly provider: PaymentProvider = {
    id: 'telebirr',
    name: 'telebirr',
    supportedCountries: ['ET'],
    supportedCurrencies: ['ETB'],
    icon: '🔴',
    color: '#E31937',
    enabled: true,
    sandbox: false,
  };

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const { data, error } = await (supabase.functions as any).invoke('process-global-payment', {
        body: {
          provider: 'telebirr', action: 'initiate',
          amount: request.amount, currency: request.currency,
          phone_number: request.phoneNumber, country_code: request.countryCode,
          reference: request.reference, description: request.description,
          callback_url: request.callbackUrl, metadata: request.metadata,
        },
      });
      if (error) return { success: false, status: 'failed', message: error.message || 'Erro ao iniciar pagamento telebirr', timestamp: new Date().toISOString() };
      return {
        success: true,
        transactionId: data?.transaction_id || data?.reference || `TELE-${Date.now()}`,
        providerTransactionId: data?.provider_ref,
        status: data?.status || 'pending',
        message: data?.message || 'Pagamento telebirr iniciado. Confirme no seu telemóvel.',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return { success: false, status: 'failed', message: 'Serviço telebirr indisponível. Tente novamente.', timestamp: new Date().toISOString() };
    }
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    try {
      const { data, error } = await (supabase.functions as any).invoke('process-global-payment', {
        body: { provider: 'telebirr', action: 'verify', transaction_id: transactionId },
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
        body: { provider: 'telebirr', action: 'refund', transaction_id: request.transactionId, amount: request.amount, reason: request.reason },
      });
      if (error) return { success: false, status: 'failed', message: error.message, timestamp: new Date().toISOString() };
      return { success: true, refundId: data?.refund_id || `REF-TELE-${Date.now()}`, status: data?.status || 'pending', message: data?.message || 'Reembolso solicitado', timestamp: new Date().toISOString() };
    } catch {
      return { success: false, status: 'failed', message: 'Erro ao processar reembolso', timestamp: new Date().toISOString() };
    }
  }

  async getBalance(): Promise<BalanceResponse> {
    try {
      const { data, error } = await (supabase.functions as any).invoke('process-global-payment', {
        body: { provider: 'telebirr', action: 'balance' },
      });
      if (error) return { available: 0, currency: 'ETB', pending: 0, lastUpdated: new Date().toISOString() };
      return { available: data?.available || 0, currency: data?.currency || 'ETB', pending: data?.pending || 0, lastUpdated: new Date().toISOString() };
    } catch {
      return { available: 0, currency: 'ETB', pending: 0, lastUpdated: new Date().toISOString() };
    }
  }

  getPaymentMethods(): PaymentMethod[] {
    return [
      { providerId: 'telebirr', type: 'mobile_money', label: 'telebirr', icon: '🔴', requiresPhone: true, requiresEmail: false },
    ];
  }
}

export const telebirrService = new TelebirrService();
