// ========================================================================
// Paystack Payment Service — Pan-African Gateway
// Countries: NG, GH, KE, ZA, EG, CI, SN, MA, TZ, UG, ZM, RW, MZ
// ========================================================================

import { supabase } from '@/integrations/supabase/client';
import { BasePaymentService, PaymentProvider, PaymentRequest, PaymentResponse, PaymentVerification, RefundRequest, RefundResponse, BalanceResponse, PaymentMethod } from './types';

export class PaystackService extends BasePaymentService {
  readonly provider: PaymentProvider = {
    id: 'paystack',
    name: 'Paystack',
    supportedCountries: ['NG', 'GH', 'KE', 'ZA', 'EG', 'CI', 'SN', 'MA', 'TZ', 'UG', 'ZM', 'RW', 'MZ'],
    supportedCurrencies: ['NGN', 'GHS', 'KES', 'ZAR', 'EGP', 'XOF', 'MAD', 'TZS', 'UGX', 'ZMW', 'RWF', 'MZN', 'USD'],
    icon: '💳',
    color: '#0A2F5C',
    enabled: true,
    sandbox: false,
  };

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('process-global-payment', {
        body: {
          provider: 'paystack', action: 'initiate',
          amount: request.amount, currency: request.currency,
          email: request.email, country_code: request.countryCode,
          reference: request.reference, description: request.description,
          callback_url: request.callbackUrl, return_url: request.returnUrl,
          metadata: request.metadata,
        },
      });
      if (error) return { success: false, status: 'failed', message: error.message || 'Erro ao iniciar pagamento Paystack', timestamp: new Date().toISOString() };
      return {
        success: true,
        transactionId: data?.transaction_id || data?.reference || `PS-${Date.now()}`,
        checkoutUrl: data?.checkout_url,
        status: data?.status || 'pending',
        message: data?.message || 'A redirecionar para o Paystack...',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return { success: false, status: 'failed', message: 'Serviço Paystack indisponível. Tente novamente.', timestamp: new Date().toISOString() };
    }
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    try {
      const { data, error } = await supabase.functions.invoke('process-global-payment', {
        body: { provider: 'paystack', action: 'verify', transaction_id: transactionId },
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
        body: { provider: 'paystack', action: 'refund', transaction_id: request.transactionId, amount: request.amount, reason: request.reason },
      });
      if (error) return { success: false, status: 'failed', message: error.message, timestamp: new Date().toISOString() };
      return { success: true, refundId: data?.refund_id || `REF-PS-${Date.now()}`, status: data?.status || 'pending', message: data?.message || 'Reembolso solicitado', timestamp: new Date().toISOString() };
    } catch {
      return { success: false, status: 'failed', message: 'Erro ao processar reembolso', timestamp: new Date().toISOString() };
    }
  }

  async getBalance(): Promise<BalanceResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('process-global-payment', {
        body: { provider: 'paystack', action: 'balance' },
      });
      if (error) return { available: 0, currency: 'NGN', pending: 0, lastUpdated: new Date().toISOString() };
      return { available: data?.available || 0, currency: data?.currency || 'NGN', pending: data?.pending || 0, lastUpdated: new Date().toISOString() };
    } catch {
      return { available: 0, currency: 'NGN', pending: 0, lastUpdated: new Date().toISOString() };
    }
  }

  getPaymentMethods(): PaymentMethod[] {
    return [
      { providerId: 'paystack_card', type: 'card', label: 'Paystack (Cartão)', icon: '💳', requiresPhone: false, requiresEmail: true },
      { providerId: 'paystack_transfer', type: 'bank_transfer', label: 'Paystack (Transferência)', icon: '🏦', requiresPhone: false, requiresEmail: true },
      { providerId: 'paystack_mobile', type: 'mobile_money', label: 'Paystack (Mobile Money)', icon: '📱', requiresPhone: true, requiresEmail: false },
      { providerId: 'paystack_ussd', type: 'mobile_money', label: 'Paystack (USSD)', icon: '📞', requiresPhone: true, requiresEmail: false },
    ];
  }
}

export const paystackService = new PaystackService();
