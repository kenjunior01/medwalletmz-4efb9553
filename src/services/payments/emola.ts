// ========================================================================
// e-Mola Payment Service (STUB) — Mozambique (Vodacom)
// Countries: MZ
// ========================================================================

import { BasePaymentService, PaymentProvider, PaymentRequest, PaymentResponse, PaymentVerification, RefundRequest, RefundResponse, BalanceResponse, PaymentMethod } from './types';

export class EMolaService extends BasePaymentService {
  readonly provider: PaymentProvider = {
    id: 'emola',
    name: 'e-Mola',
    supportedCountries: ['MZ'],
    supportedCurrencies: ['MZN'],
    icon: '📱',
    color: '#E60000',
    enabled: true,
    sandbox: true,
  };

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    // STUB: Replace with Vodacom e-Mola API
    // POST https://api.emola.co.mz/v1/payments
    console.log(`[e-Mola STUB] Initiating: ${request.amount} ${request.currency} to ${request.phoneNumber}`);
    return {
      success: true,
      transactionId: `EMOLA-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      status: 'pending',
      message: 'e-Mola payment initiated. Confirm on your phone via USSD.',
      timestamp: new Date().toISOString(),
    };
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    console.log(`[e-Mola STUB] Verifying: ${transactionId}`);
    return {
      transactionId,
      status: 'success',
      amount: 0,
      currency: 'MZN',
      verifiedAt: new Date().toISOString(),
    };
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    console.log(`[e-Mola STUB] Refund: ${request.transactionId}`);
    return {
      success: true,
      refundId: `REF-EMOLA-${Date.now()}`,
      status: 'processed',
      message: 'Refund processed',
      timestamp: new Date().toISOString(),
    };
  }

  async getBalance(): Promise<BalanceResponse> {
    return {
      available: 200000,
      currency: 'MZN',
      pending: 8000,
      lastUpdated: new Date().toISOString(),
    };
  }

  getPaymentMethods(): PaymentMethod[] {
    return [
      {
        providerId: 'emola',
        type: 'mobile_money',
        label: 'e-Mola (Vodacom MZ)',
        icon: '📱',
        requiresPhone: true,
        requiresEmail: false,
      },
    ];
  }
}

export const emolaService = new EMolaService();
