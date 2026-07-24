// ========================================================================
// MedWallet Payment Service — Base Types & Interfaces
// All payment providers implement this interface for consistent usage
// ========================================================================

export interface PaymentProvider {
  id: string;
  name: string;
  /** ISO country codes where this provider operates */
  supportedCountries: string[];
  /** Currency codes this provider supports */
  supportedCurrencies: string[];
  /** Provider logo URL or emoji */
  icon: string;
  /** Provider color for UI theming */
  color: string;
  /** Whether this provider is currently active/enabled */
  enabled: boolean;
  /** Sandbox/test mode flag */
  sandbox: boolean;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  countryCode: string;
  phoneNumber?: string;
  email?: string;
  reference: string;
  description: string;
  metadata?: Record<string, any>;
  callbackUrl?: string;
  returnUrl?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  providerTransactionId?: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';
  message: string;
  receiptUrl?: string;
  checkoutUrl?: string;
  timestamp: string;
}

export interface PaymentVerification {
  transactionId: string;
  providerTransactionId?: string;
  status: 'success' | 'failed' | 'pending';
  amount?: number;
  currency?: string;
  verifiedAt: string;
}

export interface RefundRequest {
  transactionId: string;
  amount?: number;
  reason: string;
}

export interface RefundResponse {
  success: boolean;
  refundId?: string;
  status: 'pending' | 'processed' | 'failed';
  message: string;
  timestamp: string;
}

export interface BalanceResponse {
  available: number;
  currency: string;
  pending: number;
  lastUpdated: string;
}

export interface PaymentMethod {
  providerId: string;
  type: 'mobile_money' | 'card' | 'bank_transfer' | 'wallet' | 'carrier';
  label: string;
  icon: string;
  requiresPhone: boolean;
  requiresEmail: boolean;
}

// Base abstract class that all providers extend
export abstract class BasePaymentService {
  abstract readonly provider: PaymentProvider;

  /** Initialize the payment (returns checkout URL or initiates USSD) */
  abstract initiatePayment(request: PaymentRequest): Promise<PaymentResponse>;

  /** Verify a payment status by transaction ID */
  abstract verifyPayment(transactionId: string): Promise<PaymentVerification>;

  /** Process a refund */
  abstract processRefund(request: RefundRequest): Promise<RefundResponse>;

  /** Check available balance (for merchant accounts) */
  abstract getBalance?(): Promise<BalanceResponse>;

  /** List supported payment methods for this provider */
  abstract getPaymentMethods(): PaymentMethod[];
}
