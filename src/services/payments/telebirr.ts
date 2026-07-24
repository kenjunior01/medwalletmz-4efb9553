// ========================================================================
// Telebirr Payment Service (STUB) — Ethiopia
// Countries: ET
// ========================================================================

import { BasePaymentService, PaymentProvider, PaymentRequest, PaymentResponse, PaymentVerification, RefundRequest, RefundResponse, BalanceResponse, PaymentMethod } from './types';

export class TelebirrService extends BasePaymentService {
  readonly provider: PaymentProvider = {
    id: 'telebirr',
    name: 'telebirr',
    supportedCountries: ['ET'],
    supportedCurrencies: ['ETB'],
    icon: '🔴',
    color: '#E31937',
    enabled: true,
    sandbox: true,
  };

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    // STUB: Replace with Ethio Telecom telebirr Merchant API
    // POST https://api.telebirr.et/payment/v1/order
    console.log(`[telebirr STUB] Initiating: ${request.amount} ${request.currency} to ${request.phoneNumber}`);
    return {
      success: true,
      transactionId: `TELE-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      providerTransactionId: `TB-${Date.now()}`,
      status: 'pending',
      message: 'telebirr payment initiated. Please confirm on your phone.',
      timestamp: new Date().toISOString(),
    };
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    console.log(`[telebirr STUB] Verifying: ${transactionId}`);
    return {
      transactionId,
      status: 'success',
      amount: 0,
      currency: 'ETB',
      verifiedAt: new Date().toISOString(),
    };
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    console.log(`[telebirr STUB] Refund: ${request.transactionId}`);
    return {
      success: true,
      refundId: `REF-TELE-${Date.now()}`,
      status: 'processed',
      message: 'Refund processed',
      timestamp: new Date().toISOString(),
    };
  }

  async getBalance(): Promise<BalanceResponse> {
    return {
      available: 200000,
      currency: 'ETB',
      pending: 15000,
      lastUpdated: new Date().toISOString(),
    };
  }

  getPaymentMethods(): PaymentMethod[] {
    return [
      {
        providerId: 'telebirr',
        type: 'mobile_money',
        label: 'telebirr',
        icon: '🔴',
        requiresPhone: true,
        requiresEmail: false,
      },
    ];
  }
}

export const telebirrService = new TelebirrService();
