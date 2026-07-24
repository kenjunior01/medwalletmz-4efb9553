// ========================================================================
// Orange Money Payment Service (STUB)
// Countries: CI, SN, ML, BJ, BF, CM, GN, CD, MG, MZ
// ========================================================================

import { BasePaymentService, PaymentProvider, PaymentRequest, PaymentResponse, PaymentVerification, RefundRequest, RefundResponse, BalanceResponse, PaymentMethod } from './types';

export class OrangeMoneyService extends BasePaymentService {
  readonly provider: PaymentProvider = {
    id: 'orange_money',
    name: 'Orange Money',
    supportedCountries: ['CI', 'SN', 'ML', 'BJ', 'BF', 'CM', 'GN', 'CD', 'MG', 'MZ'],
    supportedCurrencies: ['XOF', 'XAF', 'CDF', 'MGA', 'MZN'],
    icon: '🧡',
    color: '#FF6600',
    enabled: true,
    sandbox: true,
  };

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    // STUB: Replace with Orange Money API (OTP-based or direct debit)
    // POST https://api.orange.com/orange-money/mpm/v1/payment
    console.log(`[Orange Money STUB] Initiating: ${request.amount} ${request.currency} to ${request.phoneNumber}`);
    return {
      success: true,
      transactionId: `OM-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      providerTransactionId: `TXN-OM-${Date.now()}`,
      status: 'pending',
      message: 'Orange Money payment initiated. Confirm via SMS or USSD.',
      timestamp: new Date().toISOString(),
    };
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    console.log(`[Orange Money STUB] Verifying: ${transactionId}`);
    return {
      transactionId,
      status: 'success',
      amount: 0,
      currency: 'XOF',
      verifiedAt: new Date().toISOString(),
    };
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    console.log(`[Orange Money STUB] Refund: ${request.transactionId}`);
    return {
      success: true,
      refundId: `REF-OM-${Date.now()}`,
      status: 'processed',
      message: 'Refund initiated',
      timestamp: new Date().toISOString(),
    };
  }

  async getBalance(): Promise<BalanceResponse> {
    return {
      available: 1000000,
      currency: 'XOF',
      pending: 50000,
      lastUpdated: new Date().toISOString(),
    };
  }

  getPaymentMethods(): PaymentMethod[] {
    return [
      {
        providerId: 'orange_money',
        type: 'mobile_money',
        label: 'Orange Money',
        icon: '🧡',
        requiresPhone: true,
        requiresEmail: false,
      },
      {
        providerId: 'orange_money_otp',
        type: 'mobile_money',
        label: 'Orange Money (OTP)',
        icon: '🧡',
        requiresPhone: true,
        requiresEmail: false,
      },
    ];
  }
}

export const orangeMoneyService = new OrangeMoneyService();
