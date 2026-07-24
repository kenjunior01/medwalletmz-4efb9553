// ========================================================================
// MTN Mobile Money Payment Service — MTN MoMo API v2.0 (PayHub)
// Countries: CM, CI, CG, GN, BF, BJ, SN, ML, UG, RW, ZA, NG
// ========================================================================

import { supabase } from '@/integrations/supabase/client';
import { BasePaymentService, PaymentProvider, PaymentRequest, PaymentResponse, PaymentVerification, RefundRequest, RefundResponse, BalanceResponse, PaymentMethod } from './types';

export class MTNMoMoService extends BasePaymentService {
  readonly provider: PaymentProvider = {
    id: 'mtn_momo',
    name: 'MTN Mobile Money',
    supportedCountries: ['CM', 'CI', 'CG', 'GN', 'BF', 'BJ', 'SN', 'ML', 'UG', 'RW', 'ZA', 'NG'],
    supportedCurrencies: ['XAF', 'XOF', 'GNF', 'UGX', 'RWF', 'ZAR', 'NGN'],
    icon: '💛',
    color: '#FFCC00',
    enabled: true,
    sandbox: false,
  };

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const { data, error } = await (supabase.functions as any).invoke('process-global-payment', {
        body: {
          provider: 'mtn_momo', action: 'initiate',
          amount: request.amount, currency: request.currency,
          phone_number: request.phoneNumber, country_code: request.countryCode,
          reference: request.reference, description: request.description,
          callback_url: request.callbackUrl, metadata: request.metadata,
        },
      });
      if (error) return { success: false, status: 'failed', message: error.message || 'Erro ao iniciar pagamento MTN MoMo', timestamp: new Date().toISOString() };
      return {
        success: true,
        transactionId: data?.transaction_id || data?.reference || `MTN-${Date.now()}`,
        providerTransactionId: data?.provider_ref,
        status: data?.status || 'pending',
        message: data?.message || 'Pagamento MTN MoMo iniciado. Confirme no seu telemóvel.',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return { success: false, status: 'failed', message: 'Serviço MTN MoMo indisponível. Tente novamente.', timestamp: new Date().toISOString() };
    }
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    try {
      const { data, error } = await (supabase.functions as any).invoke('process-global-payment', {
        body: { provider: 'mtn_momo', action: 'verify', transaction_id: transactionId },
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
        body: { provider: 'mtn_momo', action: 'refund', transaction_id: request.transactionId, amount: request.amount, reason: request.reason },
      });
      if (error) return { success: false, status: 'failed', message: error.message, timestamp: new Date().toISOString() };
      return { success: true, refundId: data?.refund_id || `REF-MTN-${Date.now()}`, status: data?.status || 'pending', message: data?.message || 'Reembolso solicitado', timestamp: new Date().toISOString() };
    } catch {
      return { success: false, status: 'failed', message: 'Erro ao processar reembolso', timestamp: new Date().toISOString() };
    }
  }

  async getBalance(): Promise<BalanceResponse> {
    try {
      const { data, error } = await (supabase.functions as any).invoke('process-global-payment', {
        body: { provider: 'mtn_momo', action: 'balance' },
      });
      if (error) return { available: 0, currency: 'XAF', pending: 0, lastUpdated: new Date().toISOString() };
      return { available: data?.available || 0, currency: data?.currency || 'XAF', pending: data?.pending || 0, lastUpdated: new Date().toISOString() };
    } catch {
      return { available: 0, currency: 'XAF', pending: 0, lastUpdated: new Date().toISOString() };
    }
  }

  getPaymentMethods(): PaymentMethod[] {
    return [
      { providerId: 'mtn_momo', type: 'mobile_money', label: 'MTN Mobile Money', icon: '💛', requiresPhone: true, requiresEmail: false },
    ];
  }
}

export const mtnMoMoService = new MTNMoMoService();
