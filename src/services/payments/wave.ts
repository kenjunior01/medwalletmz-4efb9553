// ========================================================================
// Wave Payment Service (STUB)
// Countries: SN, CI, BF, ML, GN, UG, GHA, TZ, NG, KE
// ========================================================================

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
    sandbox: true,
  };

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    // STUB: Replace with Wave Business API
    // POST https://api.wave.com/v1/payments
    console.log(`[Wave STUB] Initiating: ${request.amount} ${request.currency} to ${request.phoneNumber}`);
    return {
      success: true,
      transactionId: `WAVE-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      status: 'pending',
      message: 'Wave transfer initiated. Recipient will be notified.',
      timestamp: new Date().toISOString(),
    };
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    console.log(`[Wave STUB] Verifying: ${transactionId}`);
    return {
      transactionId,
      status: 'success',
      amount: 0,
      currency: 'XOF',
      verifiedAt: new Date().toISOString(),
    };
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    console.log(`[Wave STUB] Refund: ${request.transactionId}`);
    return {
      success: true,
      refundId: `REF-WAVE-${Date.now()}`,
      status: 'processed',
      message: 'Refund processed',
      timestamp: new Date().toISOString(),
    };
  }

  async getBalance(): Promise<BalanceResponse> {
    return {
      available: 300000,
      currency: 'XOF',
      pending: 10000,
      lastUpdated: new Date().toISOString(),
    };
  }

  getPaymentMethods(): PaymentMethod[] {
    return [
      {
        providerId: 'wave',
        type: 'mobile_money',
        label: 'Wave (Senegal)',
        icon: '🔵',
        requiresPhone: true,
        requiresEmail: false,
      },
    ];
  }
}

export const waveService = new WaveService();
