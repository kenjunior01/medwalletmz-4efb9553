// ========================================================================
// mKesh Payment Service — Mozambique (Movitel)
// Countries: MZ
// ========================================================================

import { supabase } from '@/integrations/supabase/client';
import { BasePaymentService, PaymentProvider, PaymentRequest, PaymentResponse, PaymentVerification, RefundRequest, RefundResponse, BalanceResponse, PaymentMethod } from './types';

export class MkeshService extends BasePaymentService {
  readonly provider: PaymentProvider = {
    id: 'mkesh',
    name: 'mKesh',
    supportedCountries: ['MZ'],
    supportedCurrencies: ['MZN'],
    icon: '💵',
    color: '#003399',
    enabled: true,
    sandbox: false,
  };

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('process-global-payment', {
        body: {
          provider: 'mkesh', action: 'initiate',
          amount: request.amount, currency: request.currency,
          phone_number: request.phoneNumber, country_code: request.countryCode,
          reference: request.reference, description: request.description,
          callback_url: request.callbackUrl, metadata: request.metadata,
        },
      });
      if (error) return { success: false, status: 'failed', message: error.message || 'Erro ao iniciar pagamento mKesh', timestamp: new Date().toISOString() };
      return {
        success: true,
        transactionId: data?.transaction_id || data?.reference || `MKESH-${Date.now()}`,
        status: data?.status || 'pending',
        message: data?.message || 'Pagamento mKesh iniciado. Confirme no seu telemóvel.',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return { success: false, status: 'failed', message: 'Serviço mKesh indisponível. Tente novamente.', timestamp: new Date().toISOString() };
    }
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    try {
      const { data, error } = await supabase.functions.invoke('process-global-payment', {
        body: { provider: 'mkesh', action: 'verify', transaction_id: transactionId },
      });
      if (error) return { transactionId, status: 'failed', verifiedAt: new Date().toISOString() };
      return { transactionId, status: data?.status === 'completed' ? 'success' : data?.status === 'failed' ? 'failed' : 'pending', amount: data?.amount, currency: data?.currency, verifiedAt: new Date().toISOString() };
    } catch {
      return { transactionId, status: 'failed', verifiedAt: new Date().toISOString() };
    }
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('process-global-payment', {
        body: { provider: 'mkesh', action: 'refund', transaction_id: request.transactionId, amount: request.amount, reason: request.reason },
      });
      if (error) return { success: false, status: 'failed', message: error.message, timestamp: new Date().toISOString() };
      return { success: true, refundId: data?.refund_id || `REF-MKESH-${Date.now()}`, status: data?.status || 'pending', message: data?.message || 'Reembolso solicitado', timestamp: new Date().toISOString() };
    } catch {
      return { success: false, status: 'failed', message: 'Erro ao processar reembolso', timestamp: new Date().toISOString() };
    }
  }

  async getBalance(): Promise<BalanceResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('process-global-payment', {
        body: { provider: 'mkesh', action: 'balance' },
      });
      if (error) return { available: 0, currency: 'MZN', pending: 0, lastUpdated: new Date().toISOString() };
      return { available: data?.available || 0, currency: data?.currency || 'MZN', pending: data?.pending || 0, lastUpdated: new Date().toISOString() };
    } catch {
      return { available: 0, currency: 'MZN', pending: 0, lastUpdated: new Date().toISOString() };
    }
  }

  getPaymentMethods(): PaymentMethod[] {
    return [
      { providerId: 'mkesh', type: 'mobile_money', label: 'mKesh (Movitel MZ)', icon: '💵', requiresPhone: true, requiresEmail: false },
    ];
  }
}

export const mkeshService = new MkeshService();
