// ========================================================================
// M-Pesa Payment Service (STUB)
// Countries: KE, TZ, MZ, UG
// ========================================================================

import { BasePaymentService, PaymentProvider, PaymentRequest, PaymentResponse, PaymentVerification, RefundRequest, RefundResponse, BalanceResponse, PaymentMethod } from './types';

export class MPesaService extends BasePaymentService {
  readonly provider: PaymentProvider = {
    id: 'mpesa',
    name: 'M-Pesa',
    supportedCountries: ['KE', 'TZ', 'MZ', 'UG', 'CD'],
    supportedCurrencies: ['KES', 'TZS', 'MZN', 'UGX', 'CDF'],
    icon: '💚',
    color: '#4CAF50',
    enabled: true,
    sandbox: true,
  };

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    // STUB: Replace with actual M-Pesa Daraja API call
    // POST https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest
    console.log(`[M-Pesa STUB] Initiating payment: ${request.amount} ${request.currency} to ${request.phoneNumber}`);
    
    return {
      success: true,
      transactionId: `MPESA-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      providerTransactionId: `QEA${Date.now()}`,
      status: 'pending',
      message: 'M-Pesa STK Push initiated. Please enter your PIN on your phone.',
      timestamp: new Date().toISOString(),
    };
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    // STUB: Replace with GET /mpesa/stkpushquery/v1/query
    console.log(`[M-Pesa STUB] Verifying payment: ${transactionId}`);
    return {
      transactionId,
      status: 'success',
      amount: 0,
      currency: 'KES',
      verifiedAt: new Date().toISOString(),
    };
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    // STUB: Replace with actual M-Pesa refund API
    console.log(`[M-Pesa STUB] Processing refund: ${request.transactionId} - ${request.reason}`);
    return {
      success: true,
      refundId: `REF-MPESA-${Date.now()}`,
      status: 'processed',
      message: 'Refund processed successfully',
      timestamp: new Date().toISOString(),
    };
  }

  async getBalance(): Promise<BalanceResponse> {
    // STUB: Replace with actual M-Pesa account balance API
    return {
      available: 50000,
      currency: 'KES',
      pending: 5000,
      lastUpdated: new Date().toISOString(),
    };
  }

  getPaymentMethods(): PaymentMethod[] {
    return [
      {
        providerId: 'mpesa',
        type: 'mobile_money',
        label: 'M-Pesa (STK Push)',
        icon: '💚',
        requiresPhone: true,
        requiresEmail: false,
      },
      {
        providerId: 'mpesa_paybill',
        type: 'mobile_money',
        label: 'M-Pesa (Paybill/Lipa na M-Pesa)',
        icon: '💚',
        requiresPhone: true,
        requiresEmail: false,
      },
    ];
  }
}

export const mpesaService = new MPesaService();
