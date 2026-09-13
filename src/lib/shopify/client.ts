// ============================================================================
// MedWallet Global Shop — Cliente GraphQL da Shopify Storefront API
// ============================================================================

import { getShopifyConfig, shopifyGraphqlUrl } from "./config";

export class ShopifyError extends Error {
  code: string;
  constructor(message: string, code = "shopify_error") {
    super(message);
    this.code = code;
  }
}

interface GraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

const TIMEOUT_MS = 15_000;

/**
 * Executa uma query GraphQL na Storefront API da loja configurada.
 * Lança ShopifyError com mensagens amigáveis em português.
 */
export async function shopifyFetch<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const cfg = getShopifyConfig();
  if (!cfg) {
    throw new ShopifyError(
      "Loja Shopify não ligada. Configura o domínio e o token em /shop/config.",
      "not_configured"
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let json: GraphqlResponse<T>;
  try {
    const res = await fetch(shopifyGraphqlUrl(cfg.domain), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": cfg.token,
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });

    if (res.status === 401 || res.status === 403) {
      throw new ShopifyError(
        "Token da Storefront API inválido ou sem permissões. Gera um novo em Shopify Admin → Settings → Apps and sales channels → Develop apps.",
        "unauthorized"
      );
    }
    if (res.status === 404) {
      throw new ShopifyError(
        `Domínio "${cfg.domain}" não responde. Verifica o endereço da loja.`,
        "not_found"
      );
    }
    if (!res.ok) {
      throw new ShopifyError(
        `A Shopify respondeu com erro ${res.status}. Tenta novamente em instantes.`,
        "http_" + res.status
      );
    }

    json = (await res.json()) as GraphqlResponse<T>;
  } catch (err) {
    if (err instanceof ShopifyError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ShopifyError(
        "A ligação à loja expirou. Verifica a internet e tenta novamente.",
        "timeout"
      );
    }
    throw new ShopifyError(
      "Não foi possível ligar à loja Shopify. Verifica o domínio e a internet.",
      "network"
    );
  } finally {
    clearTimeout(timer);
  }

  if (json.errors && json.errors.length > 0) {
    const first = json.errors[0].message ?? "";
    if (/throttl|limit/i.test(first)) {
      throw new ShopifyError(
        "A loja atingiu o limite de pedidos da Shopify. Aguarda alguns segundos.",
        "throttled"
      );
    }
    throw new ShopifyError(first, "graphql");
  }
  if (!json.data) {
    throw new ShopifyError("Resposta vazia da loja Shopify.", "empty");
  }
  return json.data;
}
