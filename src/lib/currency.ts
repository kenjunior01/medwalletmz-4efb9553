export type CurrencyCode = 'MZN' | 'BRL' | 'AOA' | 'INR' | 'EUR' | 'USD';

export const CURRENCIES: Record<CurrencyCode, { symbol: string; locale: string; name: string }> = {
  MZN: { symbol: 'MT', locale: 'pt-MZ', name: 'Metical' },
  BRL: { symbol: 'R$', locale: 'pt-BR', name: 'Real' },
  AOA: { symbol: 'Kz', locale: 'pt-AO', name: 'Kwanza' },
  INR: { symbol: '₹', locale: 'en-IN', name: 'Rupia' },
  EUR: { symbol: '€', locale: 'pt-PT', name: 'Euro' },
  USD: { symbol: '$', locale: 'en-US', name: 'Dólar' },
};

export function formatCurrency(amount: number, code: CurrencyCode = 'MZN'): string {
  const config = CURRENCIES[code] || CURRENCIES.MZN;
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: code,
  }).format(amount);
}

export function getCurrencySymbol(code: CurrencyCode = 'MZN'): string {
  return CURRENCIES[code]?.symbol || 'MT';
}
