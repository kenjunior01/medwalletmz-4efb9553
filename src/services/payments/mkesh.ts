// ========================================================================
// Mkesh Payment Service (STUB) — Mozambique (Movitel)
// Countries: MZ
// ========================================================================

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
    sandbox: true,
  };

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    // STUB: Replace with Movitel mKesh API
    console.log(`[mKesh STUB] Initiating: ${request.amount} ${request.currency} to ${request.phoneNumber}`);
    return {
      success: true,
      transactionId: `MKESH-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      status: 'pending',
      message: 'mKesh payment initiated. Confirm on your phone.',
      timestamp: new Date().toISOString(),
    };
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    console.log(`[mKesh STUB] Verifying: ${transactionId}`);
    return {
      transactionId,
      status: 'success',
      amount: 0,
      currency: 'MZN',
      verifiedAt: new Date().toISOString(),
    };
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    console.log(`[mKesh STUB] Refund: ${request.transactionId}`);
    return {
      success: true,
      refundId: `REF-MKESH-${Date.now()}`,
      status: 'processed',
      message: 'Refund processed',
      timestamp: new Date().toISOString(),
    };
  }

  async getBalance(): Promise<BalanceResponse> {
    return {
      available: 150000,
      currency: 'MZN',
      pending: 5000,
      lastUpdated: new Date().toISOString(),
    };
  }

  getPaymentMethods(): PaymentMethod[] {
    return [
      {
        providerId: 'mkesh',
        type: 'mobile_money',
        label: 'mKesh (Movitel MZ)',
        icon: '💵',
        requiresPhone: true,
        requiresEmail: false,
      },
    ];
  }
}

export const mkeshService = new MkeshService();
