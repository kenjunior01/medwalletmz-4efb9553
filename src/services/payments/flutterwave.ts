// ========================================================================
// Flutterwave Payment Service (STUB) — Pan-African
// Countries: NG, GH, KE, UG, TZ, ZA, ET, RW, MZ, CM, SN, CI, BF
// ========================================================================

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
    sandbox: true,
  };

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    // STUB: Replace with Flutterwave API v3
    // POST https://api.flutterwave.com/v3/payments
    console.log(`[Flutterwave STUB] Initiating: ${request.amount} ${request.currency}`);
    return {
      success: true,
      transactionId: `FW-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      status: 'pending',
      checkoutUrl: `https://checkout.flutterwave.com/v3/hosted/pay/${Date.now()}`,
      message: 'Redirecting to Flutterwave checkout...',
      timestamp: new Date().toISOString(),
    };
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    // STUB: GET https://api.flutterwave.com/v3/transactions/{id}/verify
    console.log(`[Flutterwave STUB] Verifying: ${transactionId}`);
    return {
      transactionId,
      status: 'success',
      amount: 0,
      currency: 'NGN',
      verifiedAt: new Date().toISOString(),
    };
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    // STUB: POST https://api.flutterwave.com/v3/transactions/{id}/refund
    console.log(`[Flutterwave STUB] Refund: ${request.transactionId}`);
    return {
      success: true,
      refundId: `REF-FW-${Date.now()}`,
      status: 'processed',
      message: 'Refund initiated',
      timestamp: new Date().toISOString(),
    };
  }

  async getBalance(): Promise<BalanceResponse> {
    return {
      available: 1800000,
      currency: 'NGN',
      pending: 75000,
      lastUpdated: new Date().toISOString(),
    };
  }

  getPaymentMethods(): PaymentMethod[] {
    return [
      {
        providerId: 'flutterwave_card',
        type: 'card',
        label: 'Flutterwave (Card)',
        icon: '💳',
        requiresPhone: false,
        requiresEmail: true,
      },
      {
        providerId: 'flutterwave_mobile',
        type: 'mobile_money',
        label: 'Flutterwave (Mobile Money)',
        icon: '📱',
        requiresPhone: true,
        requiresEmail: false,
      },
      {
        providerId: 'flutterwave_bank',
        type: 'bank_transfer',
        label: 'Flutterwave (Bank Transfer)',
        icon: '🏦',
        requiresPhone: false,
        requiresEmail: true,
      },
      {
        providerId: 'flutterwave_ussd',
        type: 'mobile_money',
        label: 'Flutterwave (USSD)',
        icon: '📞',
        requiresPhone: true,
        requiresEmail: false,
      },
    ];
  }
}

export const flutterwaveService = new FlutterwaveService();
