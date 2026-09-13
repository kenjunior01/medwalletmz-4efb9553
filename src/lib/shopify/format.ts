// ============================================================================
// MedWallet Global Shop — Formatação (preços multi-moeda, ids)
// ============================================================================

import type { ShopifyMoney } from "./types";

const LOCALE_BY_CURRENCY: Record<string, string> = {
  USD: "en-US",
  CAD: "en-CA",
  EUR: "de-DE",
  GBP: "en-GB",
  MZN: "pt-MZ",
  BRL: "pt-BR",
};

/**
 * Formata um MoneyV2 da Shopify com a moeda do mercado da loja
 * (EUA → USD, Canadá → CAD). Ex: "US$ 12,99" / "CA$ 19,99".
 */
export function formatMoney(money: ShopifyMoney | null | undefined, compact = false): string {
  if (!money) return "—";
  const amount = parseFloat(money.amount);
  if (Number.isNaN(amount)) return "—";
  try {
    return new Intl.NumberFormat(LOCALE_BY_CURRENCY[money.currencyCode] ?? "en-US", {
      style: "currency",
      currency: money.currencyCode,
      currencyDisplay: compact ? "narrowSymbol" : "symbol",
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${money.currencyCode} ${amount.toFixed(2)}`;
  }
}

/** Desconto % entre preço actual e compareAt (0 se sem desconto). */
export function discountPercent(
  price: { minVariantPrice: ShopifyMoney },
  compareAt: { minVariantPrice: ShopifyMoney } | null | undefined
): number {
  if (!compareAt) return 0;
  const p = parseFloat(price.minVariantPrice.amount);
  const c = parseFloat(compareAt.minVariantPrice.amount);
  if (!p || !c || c <= p) return 0;
  return Math.round(((c - p) / c) * 100);
}

/** Descodifica um gid base64 da Shopify → "Product:123456". */
export function decodeGid(gid: string): string {
  try {
    return atob(gid.replace("gid://", ""));
  } catch {
    return gid;
  }
}

/** Chave estável para listas React a partir de um gid. */
export function gidKey(gid: string): string {
  return decodeGid(gid).replace(/[/:]/g, "_");
}
