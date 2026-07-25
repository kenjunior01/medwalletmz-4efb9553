// ========================================================================
// M-Pesa Payment Service — Safaricom Daraja API (STK Push)
// Countries: KE, TZ, MZ, UG, CD
// ========================================================================

import { supabase } from '@/integrations/supabase/client';
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
    sandbox: false,
  };

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const { data, error } = await (supabase.functions as any).invoke('process-global-payment', {
        body: {
          provider: 'mpesa',
          action: 'initiate',
          amount: request.amount,
          currency: request.currency,
          phone_number: request.phoneNumber,
          country_code: request.countryCode,
          reference: request.reference,
          description: request.description,
          callback_url: request.callbackUrl,
          metadata: request.metadata,
        },
      });

      if (error) {
        return {
          success: false,
          status: 'failed',
          message: error.message || 'Erro ao iniciar pagamento M-Pesa',
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        transactionId: data?.transaction_id || data?.reference || `MPESA-${Date.now()}`,
        providerTransactionId: data?.provider_ref,
        status: data?.status || 'pending',
        message: data?.message || 'Pagamento M-Pesa iniciado. Confirme no seu telemóvel.',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        success: false,
        status: 'failed',
        message: 'Serviço de pagamento M-Pesa indisponível. Tente novamente.',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    try {
      const { data, error } = await (supabase.functions as any).invoke('process-global-payment', {
        body: {
          provider: 'mpesa',
          action: 'verify',
          transaction_id: transactionId,
        },
      });

      if (error) {
        return { transactionId, status: 'failed', verifiedAt: new Date().toISOString() };
      }

      return {
        transactionId,
        providerTransactionId: data?.provider_ref,
        status: data?.status === 'completed' ? 'success' : data?.status === 'failed' ? 'failed' : 'pending',
        amount: data?.amount,
        currency: data?.currency,
        verifiedAt: new Date().toISOString(),
      };
    } catch {
      return { transactionId, status: 'failed', verifiedAt: new Date().toISOString() };
    }
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      const { data, error } = await (supabase.functions as any).invoke('process-global-payment', {
        body: {
          provider: 'mpesa',
          action: 'refund',
          transaction_id: request.transactionId,
          amount: request.amount,
          reason: request.reason,
        },
      });

      if (error) {
        return { success: false, status: 'failed', message: error.message, timestamp: new Date().toISOString() };
      }

      return {
        success: true,
        refundId: data?.refund_id || `REF-MPESA-${Date.now()}`,
        status: data?.status || 'pending',
        message: data?.message || 'Reembolso solicitado com sucesso',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return { success: false, status: 'failed', message: 'Erro ao processar reembolso', timestamp: new Date().toISOString() };
    }
  }

  async getBalance(): Promise<BalanceResponse> {
    try {
      const { data, error } = await (supabase.functions as any).invoke('process-global-payment', {
        body: { provider: 'mpesa', action: 'balance' },
      });

      if (error) {
        return { available: 0, currency: 'KES', pending: 0, lastUpdated: new Date().toISOString() };
      }

      return {
        available: data?.available || 0,
        currency: data?.currency || 'KES',
        pending: data?.pending || 0,
        lastUpdated: new Date().toISOString(),
      };
    } catch {
      return { available: 0, currency: 'KES', pending: 0, lastUpdated: new Date().toISOString() };
    }
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
