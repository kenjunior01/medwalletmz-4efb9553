// ========================================================================
// Wave Payment Service — Wave Business API
// Countries: SN, CI, BF, ML, GN, UG, GH, TZ, NG, KE
// ========================================================================

import { supabase } from '@/integrations/supabase/client';
import { BasePaymentService, PaymentProvider, PaymentRequest, PaymentResponse, PaymentVerification, RefundRequest, RefundResponse, BalanceResponse, PaymentMethod } from './types';

export class WaveService extends BasePaymentService {
  readonly provider: PaymentProvider = {
    id: 'wave',
    name: 'Wave',
    supportedCountries: ['SN', 'CI', 'BF', 'ML', 'GN', 'UG', 'GH', 'TZ', 'NG', 'KE'],
    supportedCurrencies: ['XOF', 'XAF', 'GNF', 'UGX', 'GHS', 'TZS', 'NGN', 'KES'],
    icon: '🔵',
    color: '#1DAAF2',
    enabled: true,
    sandbox: false,
  };

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('process-global-payment', {
        body: {
          provider: 'wave', action: 'initiate',
          amount: request.amount, currency: request.currency,
          phone_number: request.phoneNumber, country_code: request.countryCode,
          reference: request.reference, description: request.description,
          callback_url: request.callbackUrl, metadata: request.metadata,
        },
      });
      if (error) return { success: false, status: 'failed', message: error.message || 'Erro ao iniciar pagamento Wave', timestamp: new Date().toISOString() };
      return {
        success: true,
        transactionId: data?.transaction_id || data?.reference || `WAVE-${Date.now()}`,
        status: data?.status || 'pending',
        message: data?.message || 'Transferência Wave iniciada. O destinatário será notificado.',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return { success: false, status: 'failed', message: 'Serviço Wave indisponível. Tente novamente.', timestamp: new Date().toISOString() };
    }
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    try {
      const { data, error } = await supabase.functions.invoke('process-global-payment', {
        body: { provider: 'wave', action: 'verify', transaction_id: transactionId },
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
        body: { provider: 'wave', action: 'refund', transaction_id: request.transactionId, amount: request.amount, reason: request.reason },
      });
      if (error) return { success: false, status: 'failed', message: error.message, timestamp: new Date().toISOString() };
      return { success: true, refundId: data?.refund_id || `REF-WAVE-${Date.now()}`, status: data?.status || 'pending', message: data?.message || 'Reembolso solicitado', timestamp: new Date().toISOString() };
    } catch {
      return { success: false, status: 'failed', message: 'Erro ao processar reembolso', timestamp: new Date().toISOString() };
    }
  }

  async getBalance(): Promise<BalanceResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('process-global-payment', {
        body: { provider: 'wave', action: 'balance' },
      });
      if (error) return { available: 0, currency: 'XOF', pending: 0, lastUpdated: new Date().toISOString() };
      return { available: data?.available || 0, currency: data?.currency || 'XOF', pending: data?.pending || 0, lastUpdated: new Date().toISOString() };
    } catch {
      return { available: 0, currency: 'XOF', pending: 0, lastUpdated: new Date().toISOString() };
    }
  }

  getPaymentMethods(): PaymentMethod[] {
    return [
      { providerId: 'wave', type: 'mobile_money', label: 'Wave', icon: '🔵', requiresPhone: true, requiresEmail: false },
    ];
  }
}

export const waveService = new WaveService();
