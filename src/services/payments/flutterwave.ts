// ========================================================================
// Flutterwave Payment Service — Pan-African Gateway v3
// Countries: NG, GH, KE, UG, TZ, ZA, ET, RW, MZ, CM, SN, CI, BF
// ========================================================================

import { supabase } from '@/integrations/supabase/client';
import { BasePaymentService, PaymentProvider, PaymentRequest, PaymentResponse, PaymentVerification, RefundRequest, RefundResponse, BalanceResponse, PaymentMethod } from './types';

export class FlutterwaveService extends BasePaymentService {
  readonly provider: PaymentProvider = {
    id: 'flutterwave',
    name: 'Flutterwave',
    supportedCountries: ['NG', 'GH', 'KE', 'UG', 'TZ', 'ZA', 'ET', 'RW', 'MZ', 'CM', 'SN', 'CI', 'BF'],
    supportedCurrencies: ['NGN', 'GHS', 'KES', 'UGX', 'TZS', 'ZAR', 'ETB', 'RWF', 'MZN', 'XAF', 'XOF', 'USD', 'EUR', 'GBP'],
    icon: '🪽',
    color: '#F5A623',
    enabled: true,
    sandbox: false,
  };

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('process-global-payment', {
        body: {
          provider: 'flutterwave', action: 'initiate',
          amount: request.amount, currency: request.currency,
          email: request.email, phone_number: request.phoneNumber,
          country_code: request.countryCode, reference: request.reference,
          description: request.description, callback_url: request.callbackUrl,
          return_url: request.returnUrl, metadata: request.metadata,
        },
      });
      if (error) return { success: false, status: 'failed', message: error.message || 'Erro ao iniciar pagamento Flutterwave', timestamp: new Date().toISOString() };
      return {
        success: true,
        transactionId: data?.transaction_id || data?.reference || `FW-${Date.now()}`,
        checkoutUrl: data?.checkout_url,
        status: data?.status || 'pending',
        message: data?.message || 'A redirecionar para o Flutterwave...',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return { success: false, status: 'failed', message: 'Serviço Flutterwave indisponível. Tente novamente.', timestamp: new Date().toISOString() };
    }
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    try {
      const { data, error } = await supabase.functions.invoke('process-global-payment', {
        body: { provider: 'flutterwave', action: 'verify', transaction_id: transactionId },
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
        body: { provider: 'flutterwave', action: 'refund', transaction_id: request.transactionId, amount: request.amount, reason: request.reason },
      });
      if (error) return { success: false, status: 'failed', message: error.message, timestamp: new Date().toISOString() };
      return { success: true, refundId: data?.refund_id || `REF-FW-${Date.now()}`, status: data?.status || 'pending', message: data?.message || 'Reembolso solicitado', timestamp: new Date().toISOString() };
    } catch {
      return { success: false, status: 'failed', message: 'Erro ao processar reembolso', timestamp: new Date().toISOString() };
    }
  }

  async getBalance(): Promise<BalanceResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('process-global-payment', {
        body: { provider: 'flutterwave', action: 'balance' },
      });
      if (error) return { available: 0, currency: 'NGN', pending: 0, lastUpdated: new Date().toISOString() };
      return { available: data?.available || 0, currency: data?.currency || 'NGN', pending: data?.pending || 0, lastUpdated: new Date().toISOString() };
    } catch {
      return { available: 0, currency: 'NGN', pending: 0, lastUpdated: new Date().toISOString() };
    }
  }

  getPaymentMethods(): PaymentMethod[] {
    return [
      { providerId: 'flutterwave_card', type: 'card', label: 'Flutterwave (Cartão)', icon: '💳', requiresPhone: false, requiresEmail: true },
      { providerId: 'flutterwave_mobile', type: 'mobile_money', label: 'Flutterwave (Mobile Money)', icon: '📱', requiresPhone: true, requiresEmail: false },
      { providerId: 'flutterwave_bank', type: 'bank_transfer', label: 'Flutterwave (Transferência)', icon: '🏦', requiresPhone: false, requiresEmail: true },
      { providerId: 'flutterwave_ussd', type: 'mobile_money', label: 'Flutterwave (USSD)', icon: '📞', requiresPhone: true, requiresEmail: false },
    ];
  }
}

export const flutterwaveService = new FlutterwaveService();
