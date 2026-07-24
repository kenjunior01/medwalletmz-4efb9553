/**
 * PaymentGateway — Unified payment abstraction for all African + global payment methods.
 *
 * Supports: M-Pesa (KE/TZ/MZ/DRC), Orange Money, MTN MoMo, telebirr,
 * Wave, Paystack, Flutterwave, PIX, MB WAY, UPI, and MedWallet internal wallet.
 *
 * Architecture:
 *   PaymentGatewayFactory.getGateway(methodId, countryId) → PaymentGateway
 *   gateway.initiate(request) → PaymentResult
 *   gateway.checkStatus(txId) → PaymentResult
 *
 * Each gateway has a fallback "manual" mode for when APIs are not yet configured.
 */

import { supabase } from '@/integrations/supabase/client';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface PaymentRequest {
  amount: number;
  currency: string;
  phone?: string;
  paymentMethodId: string;
  countryId: string;
  reference: string;
  description?: string;
  userId?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  message: string;
  providerRef?: string;
  status: 'pending' | 'completed' | 'failed' | 'requires_confirmation';
}

export interface PaymentMethodInfo {
  id: string;
  name: string;
  type: 'mobile_money' | 'card' | 'bank' | 'wallet';
  icon: string;
  description: string;
  requiresPhone: boolean;
  badge?: string;
  gatewayId: string;
}

export interface PaymentGateway {
  id: string;
  name: string;
  supportedMethods: string[];
  initiate: (request: PaymentRequest) => Promise<PaymentResult>;
  checkStatus: (transactionId: string) => Promise<PaymentResult>;
}

// ─────────────────────────────────────────────────────────────────
// Helper: Generate unique reference
// ─────────────────────────────────────────────────────────────────

function generateRef(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${s}`;
}

// ─────────────────────────────────────────────────────────────────
// Manual (Fallback) Gateway — works without any API integration
// ─────────────────────────────────────────────────────────────────

class ManualGateway implements PaymentGateway {
  id = 'manual';
  name = 'Pagamento Manual';
  supportedMethods = [];

  async initiate(request: PaymentRequest): Promise<PaymentResult> {
    const ref = generateRef('PAY');
    // Log the payment intent to Supabase for admin confirmation
    await supabase.from('payment_transactions' as any).insert({
      reference: ref,
      amount: request.amount,
      currency: request.currency,
      payment_method: request.paymentMethodId,
      country_id: request.countryId,
      user_id: request.userId || null,
      status: 'pending',
      description: request.description || null,
      phone: request.phone || null,
    }).then(() => {}).catch(() => {});

    return {
      success: true,
      transactionId: ref,
      message: 'Pagamento registado. Aguarde confirmação manual.',
      status: 'requires_confirmation',
    };
  }

  async checkStatus(transactionId: string): Promise<PaymentResult> {
    const { data } = await supabase.from('payment_transactions' as any)
      .select('status')
      .eq('reference', transactionId)
      .maybeSingle();
    return {
      success: data?.status === 'confirmed',
      transactionId,
      status: (data?.status === 'confirmed' ? 'completed' : data?.status === 'rejected' ? 'failed' : 'pending') as PaymentResult['status'],
      message: data?.status === 'confirmed' ? 'Pagamento confirmado' : 'Aguardando confirmação',
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// M-Pesa Gateway — Kenya (Safaricom STK), TZ/MZ/DRC (manual C2B)
// ─────────────────────────────────────────────────────────────────

class M-PesaGateway implements PaymentGateway {
  id = 'mpesa';
  name = 'M-Pesa';
  supportedMethods = [
    'mpesa_ke', 'mpesa_tz', 'mpesa_mz', 'momo_cd',
  ];

  async initiate(request: PaymentRequest): Promise<PaymentResult> {
    // TODO: Integrate Daraja API for Kenya (STK Push)
    // https://developer.safaricom.co.ke/docs?channel=mpesa
    // For TZ/MZ/DRC, use the manual flow via Vodacom M-Pesa

    const fallback = new ManualGateway();
    return fallback.initiate(request);
  }

  async checkStatus(transactionId: string): Promise<PaymentResult> {
    const fallback = new ManualGateway();
    return fallback.checkStatus(transactionId);
  }
}

// ─────────────────────────────────────────────────────────────────
// Orange Money Gateway — SN, CI, CM, GW, CV
// ─────────────────────────────────────────────────────────────────

class OrangeMoneyGateway implements PaymentGateway {
  id = 'orange_money';
  name = 'Orange Money';
  supportedMethods = [
    'orange_money', 'orange_money_sn', 'orange_money_ci', 'orange_money_cm',
  ];

  async initiate(request: PaymentRequest): Promise<PaymentResult> {
    // TODO: Integrate Orange Money API
    // https://developer.orange.com/en/api/
    // USSD flow: *144# → amount → confirm

    const fallback = new ManualGateway();
    return fallback.initiate(request);
  }

  async checkStatus(transactionId: string): Promise<PaymentResult> {
    const fallback = new ManualGateway();
    return fallback.checkStatus(transactionId);
  }
}

// ─────────────────────────────────────────────────────────────────
// MTN MoMo Gateway — UG, RW, CM
// ─────────────────────────────────────────────────────────────────

class MTNMoMoGateway implements PaymentGateway {
  id = 'mtn_momo';
  name = 'MTN MoMo';
  supportedMethods = [
    'mtt_momo', 'mtn_momo_rw', 'mtn_momo_cm', 'momo_gh',
  ];

  async initiate(request: PaymentRequest): Promise<PaymentResult> {
    // TODO: Integrate MTN MoMo API (PayHub)
    // https://momodeveloper.mtn.com/
    // Collection API: POST /disbursement/v1_0/transfer

    const fallback = new ManualGateway();
    return fallback.initiate(request);
  }

  async checkStatus(transactionId: string): Promise<PaymentResult> {
    const fallback = new ManualGateway();
    return fallback.checkStatus(transactionId);
  }
}

// ─────────────────────────────────────────────────────────────────
// telebirr Gateway — Ethiopia
// ─────────────────────────────────────────────────────────────────

class TelebirrGateway implements PaymentGateway {
  id = 'telebirr';
  name = 'telebirr';
  supportedMethods = ['telebirr'];

  async initiate(request: PaymentRequest): Promise<PaymentResult> {
    // TODO: Integrate telebirr API (Ethio Telecom)
    // USSD: *127# or telebirr app

    const fallback = new ManualGateway();
    return fallback.initiate(request);
  }

  async checkStatus(transactionId: string): Promise<PaymentResult> {
    const fallback = new ManualGateway();
    return fallback.checkStatus(transactionId);
  }
}

// ─────────────────────────────────────────────────────────────────
// Wave Gateway — SN, CI
// ─────────────────────────────────────────────────────────────────

class WaveGateway implements PaymentGateway {
  id = 'wave';
  name = 'Wave';
  supportedMethods = ['wave', 'wave_ci'];

  async initiate(request: PaymentRequest): Promise<PaymentResult> {
    // TODO: Integrate Wave Business API
    // https://www.wave.com/en/business

    const fallback = new ManualGateway();
    return fallback.initiate(request);
  }

  async checkStatus(transactionId: string): Promise<PaymentResult> {
    const fallback = new ManualGateway();
    return fallback.checkStatus(transactionId);
  }
}

// ─────────────────────────────────────────────────────────────────
// Paystack Gateway — NG, ZA, GH
// ─────────────────────────────────────────────────────────────────

class PaystackGateway implements PaymentGateway {
  id = 'paystack';
  name = 'Paystack';
  supportedMethods = ['paystack', 'paystack_ng'];

  async initiate(request: PaymentRequest): Promise<PaymentResult> {
    // TODO: Integrate Paystack API
    // https://paystack.com/docs/api/
    // POST /transaction/initialize → authorization_url

    const fallback = new ManualGateway();
    return fallback.initiate(request);
  }

  async checkStatus(transactionId: string): Promise<PaymentResult> {
    const fallback = new ManualGateway();
    return fallback.checkStatus(transactionId);
  }
}

// ─────────────────────────────────────────────────────────────────
// Flutterwave Gateway — NG
// ─────────────────────────────────────────────────────────────────

class FlutterwaveGateway implements PaymentGateway {
  id = 'flutterwave';
  name = 'Flutterwave';
  supportedMethods = ['flutterwave'];

  async initiate(request: PaymentRequest): Promise<PaymentResult> {
    // TODO: Integrate Flutterwave API
    // https://developer.flutterwave.com/reference

    const fallback = new ManualGateway();
    return fallback.initiate(request);
  }

  async checkStatus(transactionId: string): Promise<PaymentResult> {
    const fallback = new ManualGateway();
    return fallback.checkStatus(transactionId);
  }
}

// ─────────────────────────────────────────────────────────────────
// MedWallet Internal Wallet Gateway
// ─────────────────────────────────────────────────────────────────

class WalletGateway implements PaymentGateway {
  id = 'wallet';
  name = 'MedWallet';
  supportedMethods = ['wallet'];

  async initiate(request: PaymentRequest): Promise<PaymentResult> {
    if (!request.userId) {
      return { success: false, message: 'Utilizador não autenticado', status: 'failed' };
    }

    // Deduct from wallet balance via Supabase RPC
    const { data, error } = await (supabase.rpc as any)('deduct_wallet_balance', {
      _user_id: request.userId,
      _amount: request.amount,
      _currency: request.currency,
      _reference: request.reference,
    });

    if (error) {
      return { success: false, message: 'Saldo insuficiente', status: 'failed' };
    }

    return {
      success: true,
      transactionId: request.reference,
      message: `Pagado com saldo da carteira`,
      status: 'completed',
      providerRef: data,
    };
  }

  async checkStatus(transactionId: string): Promise<PaymentResult> {
    const { data } = await supabase.from('wallet_transactions' as any)
      .select('status')
      .eq('reference', transactionId)
      .maybeSingle();
    return {
      success: data?.status === 'completed',
      transactionId,
      status: data?.status === 'completed' ? 'completed' : 'failed',
      message: data?.status === 'completed' ? 'Pagamento completo' : 'Falha no pagamento',
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// Payment Gateway Factory
// ─────────────────────────────────────────────────────────────────

const GATEWAYS: PaymentGateway[] = [
  new M-PesaGateway(),
  new OrangeMoneyGateway(),
  new MTNMoMoGateway(),
  new TelebirrGateway(),
  new WaveGateway(),
  new PaystackGateway(),
  new FlutterwaveGateway(),
  new WalletGateway(),
  new ManualGateway(),
];

export class PaymentGatewayFactory {
  /** Get the appropriate gateway for a payment method + country */
  static getGateway(methodId: string, _countryId: string): PaymentGateway {
    const gateway = GATEWAYS.find(g => g.supportedMethods.includes(methodId));
    return gateway || new ManualGateway();
  }

  /** Get all available payment methods for a country */
  static getAvailableMethods(countryId: string): PaymentMethodInfo[] {
    // This would ideally come from CountryContext, but we provide
    // a static mapping as fallback
    const COUNTRY_METHODS: Record<string, PaymentMethodInfo[]> = {
      MZ: [
        { id: 'mpesa_mz', name: 'M-Pesa', type: 'mobile_money', icon: '📱', description: 'Vodacom M-Pesa', requiresPhone: true, badge: 'Popular', gatewayId: 'mpesa' },
        { id: 'emola', name: 'e-Mola', type: 'mobile_money', icon: '💰', description: 'Movitel e-Mola', requiresPhone: true, gatewayId: 'manual' },
        { id: 'mkesh', name: 'Mkesh', type: 'mobile_money', icon: '🏦', description: 'BCI Mkesh', requiresPhone: true, gatewayId: 'manual' },
        { id: 'wallet', name: 'Carteira MedWallet', type: 'wallet', icon: '💳', description: 'Débito do saldo', requiresPhone: false, badge: 'Instantâneo', gatewayId: 'wallet' },
      ],
      KE: [
        { id: 'mpesa_ke', name: 'M-Pesa', type: 'mobile_money', icon: '📱', description: 'Safaricom M-Pesa', requiresPhone: true, badge: 'Popular', gatewayId: 'mpesa' },
        { id: 'airtel_money', name: 'Airtel Money', type: 'mobile_money', icon: '📱', description: 'Pagamento Airtel', requiresPhone: true, gatewayId: 'manual' },
        { id: 'wallet', name: 'MedWallet (KES)', type: 'wallet', icon: '💳', description: 'Pay with KES balance', requiresPhone: false, gatewayId: 'wallet' },
      ],
      TZ: [
        { id: 'mpesa_tz', name: 'M-Pesa', type: 'mobile_money', icon: '📱', description: 'Vodacom M-Pesa TZ', requiresPhone: true, badge: 'Popular', gatewayId: 'mpesa' },
        { id: 'tigo_pesa', name: 'Tigo Pesa', type: 'mobile_money', icon: '📱', description: 'Pagamento Tigo', requiresPhone: true, gatewayId: 'manual' },
        { id: 'wallet', name: 'MedWallet (TZS)', type: 'wallet', icon: '💳', description: 'Pay with TZS balance', requiresPhone: false, gatewayId: 'wallet' },
      ],
      UG: [
        { id: 'mtt_momo', name: 'MTN MoMo', type: 'mobile_money', icon: '📱', description: 'MTN Mobile Money', requiresPhone: true, badge: 'Popular', gatewayId: 'mtn_momo' },
        { id: 'airtel_money_ug', name: 'Airtel Money', type: 'mobile_money', icon: '📱', description: 'Pagamento Airtel', requiresPhone: true, gatewayId: 'manual' },
        { id: 'wallet', name: 'MedWallet (UGX)', type: 'wallet', icon: '💳', description: 'Pay with UGX balance', requiresPhone: false, gatewayId: 'wallet' },
      ],
      ET: [
        { id: 'telebirr', name: 'telebirr', type: 'mobile_money', icon: '📱', description: 'Ethio Telecom telebirr', requiresPhone: true, badge: 'Popular', gatewayId: 'telebirr' },
        { id: 'wallet', name: 'MedWallet (ETB)', type: 'wallet', icon: '💳', description: 'Pay with ETB balance', requiresPhone: false, gatewayId: 'wallet' },
      ],
      NG: [
        { id: 'paystack_ng', name: 'Paystack', type: 'card', icon: '💳', description: 'Card or Bank Transfer', requiresPhone: false, badge: 'Popular', gatewayId: 'paystack' },
        { id: 'flutterwave', name: 'Flutterwave', type: 'card', icon: '💳', description: 'Visa/Mastercard/Bank', requiresPhone: false, gatewayId: 'flutterwave' },
        { id: 'wallet', name: 'MedWallet (NGN)', type: 'wallet', icon: '💳', description: 'Pay with NGN balance', requiresPhone: false, gatewayId: 'wallet' },
      ],
      GH: [
        { id: 'momo_gh', name: 'MTN MoMo', type: 'mobile_money', icon: '📱', description: 'MTN Mobile Money', requiresPhone: true, badge: 'Popular', gatewayId: 'mtn_momo' },
        { id: 'vodafone_cash', name: 'Vodafone Cash', type: 'mobile_money', icon: '📱', description: 'Pagamento Vodafone', requiresPhone: true, gatewayId: 'manual' },
        { id: 'wallet', name: 'MedWallet (GHS)', type: 'wallet', icon: '💳', description: 'Pay with GHS balance', requiresPhone: false, gatewayId: 'wallet' },
      ],
      SN: [
        { id: 'orange_money_sn', name: 'Orange Money', type: 'mobile_money', icon: '📱', description: 'Pagamento Orange', requiresPhone: true, badge: 'Popular', gatewayId: 'orange_money' },
        { id: 'wave', name: 'Wave', type: 'mobile_money', icon: '📱', description: 'Pagamento Wave', requiresPhone: true, gatewayId: 'wave' },
        { id: 'wallet', name: 'MedWallet (XOF)', type: 'wallet', icon: '💳', description: 'Pay with CFA balance', requiresPhone: false, gatewayId: 'wallet' },
      ],
      CI: [
        { id: 'orange_money_ci', name: 'Orange Money', type: 'mobile_money', icon: '📱', description: 'Pagamento Orange CI', requiresPhone: true, badge: 'Popular', gatewayId: 'orange_money' },
        { id: 'wave_ci', name: 'Wave', type: 'mobile_money', icon: '📱', description: 'Pagamento Wave CI', requiresPhone: true, gatewayId: 'wave' },
        { id: 'wallet', name: 'MedWallet (XOF)', type: 'wallet', icon: '💳', description: 'Pay with CFA balance', requiresPhone: false, gatewayId: 'wallet' },
      ],
      CM: [
        { id: 'orange_money_cm', name: 'Orange Money', type: 'mobile_money', icon: '📱', description: 'Pagamento Orange CM', requiresPhone: true, badge: 'Popular', gatewayId: 'orange_money' },
        { id: 'mtn_momo_cm', name: 'MTN MoMo', type: 'mobile_money', icon: '📱', description: 'MTN Mobile Money CM', requiresPhone: true, gatewayId: 'mtn_momo' },
        { id: 'wallet', name: 'MedWallet (XAF)', type: 'wallet', icon: '💳', description: 'Pay with FCFA balance', requiresPhone: false, gatewayId: 'wallet' },
      ],
      CD: [
        { id: 'momo_cd', name: 'M-Pesa DRC', type: 'mobile_money', icon: '📱', description: 'Vodacom M-Pesa RDC', requiresPhone: true, gatewayId: 'mpesa' },
        { id: 'airtel_money_cd', name: 'Airtel Money', type: 'mobile_money', icon: '📱', description: 'Pagamento Airtel', requiresPhone: true, gatewayId: 'manual' },
        { id: 'wallet', name: 'MedWallet (CDF)', type: 'wallet', icon: '💳', description: 'Pay with FC balance', requiresPhone: false, gatewayId: 'wallet' },
      ],
      RW: [
        { id: 'mtn_momo_rw', name: 'MTN MoMo', type: 'mobile_money', icon: '📱', description: 'MTN Mobile Money Rwanda', requiresPhone: true, badge: 'Popular', gatewayId: 'mtn_momo' },
        { id: 'wallet', name: 'MedWallet (RWF)', type: 'wallet', icon: '💳', description: 'Pay with RWF balance', requiresPhone: false, gatewayId: 'wallet' },
      ],
      AO: [
        { id: 'unitel_money', name: 'Unitel Money', type: 'mobile_money', icon: '📱', description: 'Pagamento Unitel', requiresPhone: true, gatewayId: 'manual' },
        { id: 'multicaixa', name: 'Multicaixa Express', type: 'bank', icon: '🏦', description: 'Referência Multicaixa', requiresPhone: false, gatewayId: 'manual' },
        { id: 'wallet', name: 'Carteira MedWallet', type: 'wallet', icon: '👛', description: 'Saldo em Kwanzas', requiresPhone: false, gatewayId: 'wallet' },
      ],
      BR: [
        { id: 'pix', name: 'PIX', type: 'mobile_money', icon: '💎', description: 'Pagamento instantâneo BCB', requiresPhone: true, badge: 'Instantâneo', gatewayId: 'manual' },
        { id: 'stripe', name: 'Cartão de Crédito', type: 'card', icon: '💳', description: 'Visa/Mastercard/Elo', requiresPhone: false, gatewayId: 'manual' },
        { id: 'wallet', name: 'Carteira MedWallet', type: 'wallet', icon: '👛', description: 'Saldo em Reais (BRL)', requiresPhone: false, gatewayId: 'wallet' },
      ],
      PT: [
        { id: 'mbway', name: 'MB WAY', type: 'mobile_money', icon: '📱', description: 'Pagamento MB WAY', requiresPhone: true, badge: 'Instantâneo', gatewayId: 'manual' },
        { id: 'stripe', name: 'Stripe', type: 'card', icon: '💳', description: 'Cartão de Crédito/Débito', requiresPhone: false, gatewayId: 'manual' },
        { id: 'wallet', name: 'Carteira MedWallet', type: 'wallet', icon: '👛', description: 'Saldo em Euros', requiresPhone: false, gatewayId: 'wallet' },
      ],
      IN: [
        { id: 'upi', name: 'UPI', type: 'mobile_money', icon: '📱', description: 'GPay / PhonePe / Paytm', requiresPhone: true, badge: 'Popular', gatewayId: 'manual' },
        { id: 'card', name: 'Credit/Debit Card', type: 'card', icon: '💳', description: 'Visa/Mastercard via Razorpay', requiresPhone: false, gatewayId: 'manual' },
        { id: 'wallet', name: 'MedWallet (INR)', type: 'wallet', icon: '👛', description: 'Pay with INR balance', requiresPhone: false, gatewayId: 'wallet' },
      ],
      ZA: [
        { id: 'paystack', name: 'Paystack', type: 'card', icon: '💳', description: 'Card or Bank Transfer', requiresPhone: false, gatewayId: 'paystack' },
        { id: 'ozow', name: 'Ozow', type: 'bank', icon: '🇿🇦', description: 'Instant EFT', requiresPhone: false, gatewayId: 'manual' },
        { id: 'wallet', name: 'MedWallet (ZAR)', type: 'wallet', icon: '👛', description: 'Pay with ZAR balance', requiresPhone: false, gatewayId: 'wallet' },
      ],
      MA: [
        { id: 'cih', name: 'CIH Bank', type: 'bank', icon: '🏦', description: 'Pagamento via CIH', requiresPhone: false, gatewayId: 'manual' },
        { id: 'wallet', name: 'MedWallet (MAD)', type: 'wallet', icon: '👛', description: 'Pay with MAD balance', requiresPhone: false, gatewayId: 'wallet' },
      ],
      EG: [
        { id: 'fawry', name: 'Fawry', type: 'bank', icon: '🏦', description: 'Pagamento Fawry', requiresPhone: false, badge: 'Popular', gatewayId: 'manual' },
        { id: 'wallet', name: 'MedWallet (EGP)', type: 'wallet', icon: '👛', description: 'Pay with EGP balance', requiresPhone: false, gatewayId: 'wallet' },
      ],
      CV: [
        { id: 'multicaixa_cv', name: 'Multicaixa', type: 'bank', icon: '🏦', description: 'Pagamento via Multicaixa', requiresPhone: false, gatewayId: 'manual' },
        { id: 'wallet', name: 'Carteira MedWallet', type: 'wallet', icon: '👛', description: 'Saldo em Escudos', requiresPhone: false, gatewayId: 'wallet' },
      ],
      GW: [
        { id: 'orange_money', name: 'Orange Money', type: 'mobile_money', icon: '📱', description: 'Pagamento Orange', requiresPhone: true, gatewayId: 'orange_money' },
        { id: 'wallet', name: 'Carteira MedWallet', type: 'wallet', icon: '👛', description: 'Saldo em CFA', requiresPhone: false, gatewayId: 'wallet' },
      ],
      ST: [
        { id: 'wallet', name: 'Carteira MedWallet', type: 'wallet', icon: '👛', description: 'Saldo em Dobras', requiresPhone: false, gatewayId: 'wallet' },
      ],
    };

    return COUNTRY_METHODS[countryId] || [
      { id: 'wallet', name: 'MedWallet', type: 'wallet', icon: '👛', description: 'Pay with balance', requiresPhone: false, gatewayId: 'wallet' },
    ];
  }
}
