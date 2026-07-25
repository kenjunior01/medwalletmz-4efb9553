// ========================================================================
// Payment Service Registry — Central hub for all payment providers
// Auto-discovers available providers based on country + currency
// ========================================================================

import { BasePaymentService, PaymentMethod, PaymentProvider, PaymentRequest, PaymentResponse } from './types';
import { mpesaService } from './mpesa';
import { orangeMoneyService } from './orange-money';
import { mtnMoMoService } from './mtn-momo';
import { waveService } from './wave';
import { telebirrService } from './telebirr';
import { paystackService } from './paystack';
import { flutterwaveService } from './flutterwave';
import { fawryService } from './fawry';
import { emolaService } from './emola';
import { mkeshService } from './mkesh';

// All registered payment providers
const ALL_PROVIDERS: BasePaymentService[] = [
  mpesaService,
  orangeMoneyService,
  mtnMoMoService,
  waveService,
  telebirrService,
  paystackService,
  flutterwaveService,
  fawryService,
  emolaService,
  mkeshService,
];

/**
 * Get all payment providers available for a specific country.
 * Filters providers by supportedCountries and returns enabled ones.
 */
export function getProvidersForCountry(countryCode: string): BasePaymentService[] {
  return ALL_PROVIDERS.filter(
    p => p.provider.enabled && p.provider.supportedCountries.includes(countryCode.toUpperCase())
  );
}

/**
 * Get all payment methods available for a country.
 * Flattens all provider methods into a single list.
 */
export function getPaymentMethodsForCountry(countryCode: string): PaymentMethod[] {
  const providers = getProvidersForCountry(countryCode);
  return providers.flatMap(p => p.getPaymentMethods());
}

/**
 * Get a specific provider by ID.
 */
export function getProviderById(providerId: string): BasePaymentService | undefined {
  return ALL_PROVIDERS.find(p => p.provider.id === providerId);
}

/**
 * Initiate a payment using the specified provider.
 * Automatically selects the right provider based on the request's countryCode
 * if providerId is not specified.
 */
export async function initiatePayment(
  request: PaymentRequest,
  providerId?: string
): Promise<PaymentResponse> {
  let provider: BasePaymentService | undefined;

  if (providerId) {
    provider = getProviderById(providerId);
  } else {
    const providers = getProvidersForCountry(request.countryCode);
    provider = providers[0]; // Use first available provider
  }

  if (!provider) {
    return {
      success: false,
      status: 'failed',
      message: `No payment provider available for ${request.countryCode}`,
      timestamp: new Date().toISOString(),
    };
  }

  return provider.initiatePayment(request);
}

/**
 * Verify a payment with the given transaction ID.
 * Tries all providers (in practice you'd store the provider with the transaction).
 */
export async function verifyPayment(
  transactionId: string,
  providerId?: string
): Promise<any> {
  if (providerId) {
    const provider = getProviderById(providerId);
    if (provider) return provider.verifyPayment(transactionId);
  }

  // Fallback: try all providers
  for (const provider of ALL_PROVIDERS) {
    try {
      const result = await provider.verifyPayment(transactionId);
      if (result.status !== 'failed') return result;
    } catch { /* continue to next */ }
  }

  return {
    transactionId,
    status: 'failed',
    verifiedAt: new Date().toISOString(),
  };
}

/**
 * Get all provider info for UI display (country selector)
 */
export function getAllProviders(): PaymentProvider[] {
  return ALL_PROVIDERS.map(p => p.provider);
}

/**
 * Get country-coverage map: which providers are available per country.
 */
export function getCountryCoverage(): Record<string, { providers: string[]; currencies: string[] }> {
  const coverage: Record<string, { providers: string[]; currencies: string[] }> = {};
  
  ALL_PROVIDERS.forEach(p => {
    p.provider.supportedCountries.forEach(country => {
      if (!coverage[country]) {
        coverage[country] = { providers: [], currencies: [] };
      }
      coverage[country].providers.push(p.provider.name);
      p.provider.supportedCurrencies.forEach(c => {
        if (!coverage[country].currencies.includes(c)) {
          coverage[country].currencies.push(c);
        }
      });
    });
  });

  return coverage;
}

// Re-export types for convenience
export type { PaymentProvider, PaymentRequest, PaymentResponse, PaymentVerification, RefundRequest, RefundResponse, BalanceResponse, PaymentMethod } from './types';
