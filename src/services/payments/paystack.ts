// ========================================================================
// Paystack Payment Service (STUB) — Pan-African
// Countries: NG, GH, KE, ZA, EG, CI, SN, MA, TZ, UG, ZM, RW, MZ
// ========================================================================

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
    sandbox: true,
  };

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    // STUB: Replace with Paystack API
    // POST https://api.paystack.co/transaction/initialize
    console.log(`[Paystack STUB] Initiating: ${request.amount} ${request.currency}`);
    return {
      success: true,
      transactionId: `PS-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      status: 'pending',
      checkoutUrl: `https://checkout.paystack.com/${Date.now()}`,
      message: 'Redirecting to Paystack checkout...',
      timestamp: new Date().toISOString(),
    };
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    // STUB: GET https://api.paystack.co/transaction/verify/{reference}
    console.log(`[Paystack STUB] Verifying: ${transactionId}`);
    return {
      transactionId,
      status: 'success',
      amount: 0,
      currency: 'NGN',
      verifiedAt: new Date().toISOString(),
    };
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    // STUB: POST https://api.paystack.co/refund
    console.log(`[Paystack STUB] Refund: ${request.transactionId}`);
    return {
      success: true,
      refundId: `REF-PS-${Date.now()}`,
      status: 'processed',
      message: 'Refund initiated',
      timestamp: new Date().toISOString(),
    };
  }

  async getBalance(): Promise<BalanceResponse> {
    return {
      available: 2500000,
      currency: 'NGN',
      pending: 100000,
      lastUpdated: new Date().toISOString(),
    };
  }

  getPaymentMethods(): PaymentMethod[] {
    return [
      {
        providerId: 'paystack_card',
        type: 'card',
        label: 'Paystack (Card)',
        icon: '💳',
        requiresPhone: false,
        requiresEmail: true,
      },
      {
        providerId: 'paystack_transfer',
        type: 'bank_transfer',
        label: 'Paystack (Transfer)',
        icon: '🏦',
        requiresPhone: false,
        requiresEmail: true,
      },
      {
        providerId: 'paystack_mobile',
        type: 'mobile_money',
        label: 'Paystack (Mobile Money)',
        icon: '📱',
        requiresPhone: true,
        requiresEmail: false,
      },
      {
        providerId: 'paystack_ussd',
        type: 'mobile_money',
        label: 'Paystack (USSD)',
        icon: '📞',
        requiresPhone: true,
        requiresEmail: false,
      },
    ];
  }
}

export const paystackService = new PaystackService();
