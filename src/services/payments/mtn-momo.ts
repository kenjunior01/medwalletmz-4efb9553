// ========================================================================
// MTN Mobile Money Payment Service (STUB)
// Countries: CM, CI, CG, GN, BF, BJ, SN, ML, UG, RW, ZA, NG
// ========================================================================

import { BasePaymentService, PaymentProvider, PaymentRequest, PaymentResponse, PaymentVerification, RefundRequest, RefundResponse, BalanceResponse, PaymentMethod } from './types';

export class MTNMoMoService extends BasePaymentService {
  readonly provider: PaymentProvider = {
    id: 'mtn_momo',
    name: 'MTN Mobile Money',
    supportedCountries: ['CM', 'CI', 'CG', 'GN', 'BF', 'BJ', 'SN', 'ML', 'UG', 'RW', 'ZA', 'NG'],
    supportedCurrencies: ['XAF', 'XOF', 'GNF', 'UGX', 'RWF', 'ZAR', 'NGN'],
    icon: '💛',
    color: '#FFCC00',
    enabled: true,
    sandbox: true,
  };

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    // STUB: Replace with MTN MoMo API v2.0
    // POST https://proxy.momoapi.mtn.com/v2_01/collection/payments
    console.log(`[MTN MoMo STUB] Initiating: ${request.amount} ${request.currency} to ${request.phoneNumber}`);
    return {
      success: true,
      transactionId: `MTN-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      providerTransactionId: `MSISDN-${Date.now()}`,
      status: 'pending',
      message: 'MTN Mobile Money payment initiated. Please confirm on your phone.',
      timestamp: new Date().toISOString(),
    };
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    console.log(`[MTN MoMo STUB] Verifying: ${transactionId}`);
    return {
      transactionId,
      status: 'success',
      amount: 0,
      currency: 'XAF',
      verifiedAt: new Date().toISOString(),
    };
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    console.log(`[MTN MoMo STUB] Refund: ${request.transactionId}`);
    return {
      success: true,
      refundId: `REF-MTN-${Date.now()}`,
      status: 'processed',
      message: 'Refund processed',
      timestamp: new Date().toISOString(),
    };
  }

  async getBalance(): Promise<BalanceResponse> {
    return {
      available: 750000,
      currency: 'XAF',
      pending: 25000,
      lastUpdated: new Date().toISOString(),
    };
  }

  getPaymentMethods(): PaymentMethod[] {
    return [
      {
        providerId: 'mtn_momo',
        type: 'mobile_money',
        label: 'MTN Mobile Money',
        icon: '💛',
        requiresPhone: true,
        requiresEmail: false,
      },
    ];
  }
}

export const mtnMoMoService = new MTNMoMoService();
