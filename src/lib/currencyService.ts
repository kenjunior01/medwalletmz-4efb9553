/**
 * MedWallet Multi-Currency Service
 * Handles exchange rates and global settlement logic.
 * Uses SearchAPI (Google Finance) for real-time rates.
 */

const SEARCH_API_KEY = "8jDQQBYayoKmW1HGKa8sDM17";

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
}

// Fallback rates if API fails or for offline dev
const FALLBACK_RATES: Record<string, number> = {
  'MZN_USD': 0.016,
  'USD_MZN': 63.8,
  'MZN_ZAR': 0.29,
  'ZAR_MZN': 3.45,
  'MZN_EUR': 0.015,
  'EUR_MZN': 66.5,
  'MZN_INR': 1.33,
  'INR_MZN': 0.75,
  'MZN_BRL': 0.082,
  'BRL_MZN': 12.2,
  'MZN_AOA': 14.5,
  'AOA_MZN': 0.069,
};

export async function convertCurrency(
  amount: number,
  from: string,
  to: string
): Promise<{ amount: number; rate: number }> {
  if (from === to) return { amount, rate: 1 };

  const pair = `${from}_${to}`;

  try {
    // SearchAPI google_finance integration
    // Query format for currency in Google Finance is usually "FROM TO" or "FROM-TO"
    const query = `${from} to ${to}`;
    const response = await fetch(`https://www.searchapi.io/api/v1/search?engine=google_finance&q=${encodeURIComponent(query)}&api_key=${SEARCH_API_KEY}`);

    if (!response.ok) throw new Error("SearchAPI request failed");

    const data = await response.json();

    // Extracting rate from SearchAPI's google_finance engine structure
    // It typically returns markets data or an answer_box
    const rate = data.markets?.quote?.price ||
                 data.answer_box?.price ||
                 data.organic_results?.[0]?.price ||
                 FALLBACK_RATES[pair];

    if (!rate) throw new Error("Could not extract rate from API");

    return {
      amount: Number((amount * rate).toFixed(2)),
      rate: Number(rate)
    };
  } catch (error) {
    console.warn(`Currency conversion error for ${pair}:`, error);
    const rate = FALLBACK_RATES[pair] || 1.0;
    return {
      amount: Number((amount * rate).toFixed(2)),
      rate
    };
  }
}

export function formatCurrency(amount: number, currency: string, locale: string = 'pt-MZ') {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
