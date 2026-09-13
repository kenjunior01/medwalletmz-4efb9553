// ============================================================================
// MedWallet Global Shop — Configuração da loja Shopify (Storefront API)
// ============================================================================
// A Shopify é o gerenciador principal da loja (produtos, stock, preços,
// encomendas, pagamentos e envios EUA/Canadá). Esta app é a montra:
// consome a Storefront API (GraphQL) e entrega o checkout à Shopify.
//
// Configuração (por ordem de prioridade):
//   1. Variáveis de ambiente no build (recomendado para produção):
//        VITE_SHOPIFY_DOMAIN=minhaloja.myshopify.com
//        VITE_SHOPIFY_STOREFRONT_TOKEN=shpat_xxx
//   2. Override local no browser (Settings da loja — /shop/config),
//        guardado em localStorage. Ideal para testar antes do rebuild.
// ============================================================================

export const SHOPIFY_API_VERSION =
  (import.meta.env.VITE_SHOPIFY_API_VERSION as string | undefined) || "2025-01";

const LS_DOMAIN = "mw.shopify.domain";
const LS_TOKEN = "mw.shopify.token";

export interface ShopifyConfig {
  /** Domínio da loja, ex: "minhaloja.myshopify.com" */
  domain: string;
  /** Storefront Access Token (chave PÚBLICA, safe para browser) */
  token: string;
  /** De onde veio a config: variáveis de ambiente ou browser local */
  source: "env" | "local";
}

/**
 * Normaliza o domínio: aceita "https://loja.myshopify.com/admin",
 * "loja.myshopify.com/", etc. e devolve "loja.myshopify.com".
 */
export function sanitizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

/** Token da Storefront tem formato shpat_… / shpss_… ou hash (32+ chars). */
export function isValidToken(raw: string): boolean {
  const t = raw.trim();
  return t.length >= 20;
}

/** Config efectiva: env > localStorage. null se nada configurado. */
export function getShopifyConfig(): ShopifyConfig | null {
  const envDomain = sanitizeDomain(
    (import.meta.env.VITE_SHOPIFY_DOMAIN as string | undefined) ?? ""
  );
  const envToken = (
    (import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN as string | undefined) ?? ""
  ).trim();

  if (envDomain && isValidToken(envToken)) {
    return { domain: envDomain, token: envToken, source: "env" };
  }

  if (typeof window === "undefined") return null;
  const lsDomain = sanitizeDomain(window.localStorage.getItem(LS_DOMAIN) ?? "");
  const lsToken = (window.localStorage.getItem(LS_TOKEN) ?? "").trim();

  if (lsDomain && isValidToken(lsToken)) {
    return { domain: lsDomain, token: lsToken, source: "local" };
  }
  return null;
}

export function isShopifyConfigured(): boolean {
  return getShopifyConfig() !== null;
}

/** Guarda override local (browser). Devolve a config normalizada. */
export function saveShopifyConfig(domain: string, token: string): ShopifyConfig {
  const d = sanitizeDomain(domain);
  const t = token.trim();
  if (!d || !isValidToken(t)) {
    throw new Error("Domínio ou token inválido. Verifica os valores e tenta novamente.");
  }
  window.localStorage.setItem(LS_DOMAIN, d);
  window.localStorage.setItem(LS_TOKEN, t);
  return { domain: d, token: t, source: "local" };
}

export function clearShopifyConfig(): void {
  window.localStorage.removeItem(LS_DOMAIN);
  window.localStorage.removeItem(LS_TOKEN);
}

/** URL do backoffice Shopify (gestão de produtos/encomendas dropshipping). */
export function shopifyAdminUrl(domain: string): string {
  const sub = domain.replace(/\.myshopify\.com$/, "");
  return `https://admin.shopify.com/store/${sub}`;
}

/** URL do GraphQL endpoint da Storefront API. */
export function shopifyGraphqlUrl(domain: string): string {
  return `https://${domain}/api/${SHOPIFY_API_VERSION}/graphql.json`;
}
