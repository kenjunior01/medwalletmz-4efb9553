// ========================================================================
// Fawry Payment Service (STUB) — Egypt & MENA
// Countries: EG, SA, AE, KW, BH, OM, QA
// ========================================================================

import { BasePaymentService, PaymentProvider, PaymentRequest, PaymentResponse, PaymentVerification, RefundRequest, RefundResponse, BalanceResponse, PaymentMethod } from './types';

export class FawryService extends BasePaymentService {
  readonly provider: PaymentProvider = {
    id: 'fawry',
    name: 'Fawry',
    supportedCountries: ['EG', 'SA', 'AE', 'KW', 'BH', 'OM', 'QA'],
    supportedCurrencies: ['EGP', 'SAR', 'AED', 'KWD', 'BHD', 'OMR', 'QAR'],
    icon: '🟣',
    color: '#7B2D8E',
    enabled: true,
    sandbox: true,
  };

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    // STUB: Replace with Fawry API
    // POST https://atfawry.fawry.io/api/v3/payments/init
    console.log(`[Fawry STUB] Initiating: ${request.amount} ${request.currency}`);
    return {
      success: true,
      transactionId: `FAW-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      providerTransactionId: `REF-${Date.now()}`,
      status: 'pending',
      checkoutUrl: `https://atfawry.fawry.io/api/v3/payments/${Date.now()}`,
      message: 'Redirecting to Fawry checkout...',
      timestamp: new Date().toISOString(),
    };
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    // STUB: GET https://atfawry.fawry.io/api/v3/payments/status
    console.log(`[Fawry STUB] Verifying: ${transactionId}`);
    return {
      transactionId,
      status: 'success',
      amount: 0,
      currency: 'EGP',
      verifiedAt: new Date().toISOString(),
    };
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    console.log(`[Fawry STUB] Refund: ${request.transactionId}`);
    return {
      success: true,
      refundId: `REF-FAW-${Date.now()}`,
      status: 'processed',
      message: 'Refund initiated',
      timestamp: new Date().toISOString(),
    };
  }

  async getBalance(): Promise<BalanceResponse> {
    return {
      available: 500000,
      currency: 'EGP',
      pending: 20000,
      lastUpdated: new Date().toISOString(),
    };
  }

  getPaymentMethods(): PaymentMethod[] {
    return [
      {
        providerId: 'fawry_card',
        type: 'card',
        label: 'Fawry (Card)',
        icon: '💳',
        requiresPhone: false,
        requiresEmail: true,
      },
      {
        providerId: 'fawry_wallet',
        type: 'wallet',
        label: 'Fawry (Wallet)',
        icon: '🟣',
        requiresPhone: true,
        requiresEmail: false,
      },
      {
        providerId: 'fawry_cash',
        type: 'bank_transfer',
        label: 'Fawry (Cash/At Outlet)',
        icon: '🏪',
        requiresPhone: false,
        requiresEmail: true,
      },
    ];
  }
}

export const fawryService = new FawryService();
