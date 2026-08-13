// ========================================================================
// Orange Money Payment Service — Orange Developer API
// Countries: CI, SN, ML, BJ, BF, CM, GN, CD, MG, MZ
// ========================================================================

import { supabase } from '@/integrations/supabase/client';
import { BasePaymentService, PaymentProvider, PaymentRequest, PaymentResponse, PaymentVerification, RefundRequest, RefundResponse, BalanceResponse, PaymentMethod } from './types';

export class OrangeMoneyService extends BasePaymentService {
  readonly provider: PaymentProvider = {
    id: 'orange_money',
    name: 'Orange Money',
    supportedCountries: ['CI', 'SN', 'ML', 'BJ', 'BF', 'CM', 'GN', 'CD', 'MG', 'MZ'],
    supportedCurrencies: ['XOF', 'XAF', 'CDF', 'MGA', 'MZN'],
    icon: '🧡',
    color: '#FF6600',
    enabled: true,
    sandbox: false,
  };

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('process-global-payment', {
        body: {
          provider: 'orange_money', action: 'initiate',
          amount: request.amount, currency: request.currency,
          phone_number: request.phoneNumber, country_code: request.countryCode,
          reference: request.reference, description: request.description,
          callback_url: request.callbackUrl, metadata: request.metadata,
        },
      });
      if (error) return { success: false, status: 'failed', message: error.message || 'Erro ao iniciar pagamento Orange Money', timestamp: new Date().toISOString() };
      return {
        success: true,
        transactionId: data?.transaction_id || data?.reference || `OM-${Date.now()}`,
        providerTransactionId: data?.provider_ref,
        status: data?.status || 'pending',
        message: data?.message || 'Pagamento Orange Money iniciado. Confirme via SMS ou USSD.',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return { success: false, status: 'failed', message: 'Serviço Orange Money indisponível. Tente novamente.', timestamp: new Date().toISOString() };
    }
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    try {
      const { data, error } = await supabase.functions.invoke('process-global-payment', {
        body: { provider: 'orange_money', action: 'verify', transaction_id: transactionId },
      });
      if (error) return { transactionId, status: 'failed', verifiedAt: new Date().toISOString() };
      return { transactionId, providerTransactionId: data?.provider_ref, status: data?.status === 'completed' ? 'success' : data?.status === 'failed' ? 'failed' : 'pending', amount: data?.amount, currency: data?.currency, verifiedAt: new Date().toISOString() };
    } catch {
      return { transactionId, status: 'failed', verifiedAt: new Date().toISOString() };
    }
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('process-global-payment', {
        body: { provider: 'orange_money', action: 'refund', transaction_id: request.transactionId, amount: request.amount, reason: request.reason },
      });
      if (error) return { success: false, status: 'failed', message: error.message, timestamp: new Date().toISOString() };
      return { success: true, refundId: data?.refund_id || `REF-OM-${Date.now()}`, status: data?.status || 'pending', message: data?.message || 'Reembolso solicitado', timestamp: new Date().toISOString() };
    } catch {
      return { success: false, status: 'failed', message: 'Erro ao processar reembolso', timestamp: new Date().toISOString() };
    }
  }

  async getBalance(): Promise<BalanceResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('process-global-payment', {
        body: { provider: 'orange_money', action: 'balance' },
      });
      if (error) return { available: 0, currency: 'XOF', pending: 0, lastUpdated: new Date().toISOString() };
      return { available: data?.available || 0, currency: data?.currency || 'XOF', pending: data?.pending || 0, lastUpdated: new Date().toISOString() };
    } catch {
      return { available: 0, currency: 'XOF', pending: 0, lastUpdated: new Date().toISOString() };
    }
  }

  getPaymentMethods(): PaymentMethod[] {
    return [
      { providerId: 'orange_money', type: 'mobile_money', label: 'Orange Money', icon: '🧡', requiresPhone: true, requiresEmail: false },
      { providerId: 'orange_money_otp', type: 'mobile_money', label: 'Orange Money (OTP)', icon: '🧡', requiresPhone: true, requiresEmail: false },
    ];
  }
}

export const orangeMoneyService = new OrangeMoneyService();
