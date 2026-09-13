// ============================================================================
// MedWallet Global Shop — API da Shopify Storefront (GraphQL)
// ============================================================================
// Tudo o que a montra precisa: produtos, coleções, pesquisa, carrinho.
// Encomendas/pagamentos/envios ficam 100% na Shopify (checkout alojado).
// ============================================================================

import { shopifyFetch } from "./client";
import type {
  ShopifyCart,
  ShopifyCartLine,
  ShopifyCollection,
  ShopifyCollectionRef,
  ShopifyPageInfo,
  ShopifyProduct,
  CartLineInput,
} from "./types";

// ---------------------------------------------------------------------------
// Fragments
// ---------------------------------------------------------------------------

const MONEY = `
  amount
  currencyCode
`;

const IMAGE = `
  url
  altText
  width
  height
`;

const PRODUCT_CARD = `
  id
  handle
  title
  vendor
  description
  availableForSale
  tags
  createdAt
  images(first: 2) { edges { node { ${IMAGE} } } }
  priceRange { minVariantPrice { ${MONEY} } maxVariantPrice { ${MONEY} } }
  compareAtPriceRange { minVariantPrice { ${MONEY} } }
  collections(first: 3) { edges { node { handle title } } }
`;

const PRODUCT_FULL = `
  ${PRODUCT_CARD}
  descriptionHtml
  totalInventory
  options { name values }
  variants(first: 50) {
    edges { node {
      id
      title
      availableForSale
      price { ${MONEY} }
      selectedOptions { name value }
    } }
  }
`;

// ---------------------------------------------------------------------------
// Loja
// ---------------------------------------------------------------------------

export interface ShopifyShopInfo {
  name: string;
  description: string | null;
  primaryDomain: { url: string };
  paymentSettings: {
    currencyCode: string;
    enabledPresentmentCurrencies: string[];
  };
}

export async function fetchShopInfo(): Promise<ShopifyShopInfo> {
  const data = await shopifyFetch<{
    shop: ShopifyShopInfo;
  }>(`
    query ShopInfo {
      shop {
        name
        description
        primaryDomain { url }
        paymentSettings {
          currencyCode
          enabledPresentmentCurrencies
        }
      }
    }
  `);
  return data.shop;
}

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------

export type ProductSortKey = "RELEVANCE" | "BEST_SELLING" | "PRICE" | "CREATED_AT" | "TITLE";

interface ProductsEdge {
  node: ShopifyProduct & {
    images: { edges: Array<{ node: ShopifyProduct["images"][number] }> };
    collections: { edges: Array<{ node: ShopifyCollectionRef }> };
  };
}

function mapProduct(edge: ProductsEdge["node"]): ShopifyProduct {
  return {
    ...edge,
    images: edge.images?.edges?.map((e) => e.node) ?? [],
    collections: edge.collections?.edges?.map((e) => e.node) ?? [],
  };
}

export async function fetchProducts(opts: {
  first?: number;
  after?: string | null;
  query?: string | null;
  collection?: string | null;
  sortKey?: ProductSortKey;
  reverse?: boolean;
}): Promise<{ products: ShopifyProduct[]; pageInfo: ShopifyPageInfo }> {
  const first = opts.first ?? 24;
  const sortKey = opts.sortKey ?? "RELEVANCE";
  const reverse = opts.reverse ?? sortKey === "PRICE" ? false : false;
  const queryString = [opts.query ?? null, opts.collection ? `collection:'${opts.collection}'` : null]
    .filter(Boolean)
    .join(" ") || null;

  const data = await shopifyFetch<{
    products: {
      edges: ProductsEdge[];
      pageInfo: ShopifyPageInfo;
    };
  }>(
    `
    query Products($first: Int!, $after: String, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
      products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
        edges { node {
          ${PRODUCT_CARD}
        } }
        pageInfo { hasNextPage endCursor }
      }
    }
  `,
    { first, after: opts.after ?? null, query: queryString, sortKey, reverse }
  );

  return {
    products: data.products.edges.map((e) => mapProduct(e.node)),
    pageInfo: data.products.pageInfo,
  };
}

export async function fetchProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const data = await shopifyFetch<{
    product: (ProductsEdge["node"] & {
      descriptionHtml: string;
      totalInventory: number | null;
      options: ShopifyProduct["options"];
      variants: { edges: Array<{ node: ShopifyProduct["variants"][number] }> };
    }) | null;
  }>(
    `
    query ProductByHandle($handle: String!) {
      product(handle: $handle) {
        ${PRODUCT_FULL}
      }
    }
  `,
    { handle }
  );

  if (!data.product) return null;
  const p = data.product;
  return {
    ...p,
    images: p.images?.edges?.map((e) => e.node) ?? [],
    collections: p.collections?.edges?.map((e) => e.node) ?? [],
    variants: p.variants?.edges?.map((e) => e.node) ?? [],
  };
}

// ---------------------------------------------------------------------------
// Coleções
// ---------------------------------------------------------------------------

export async function fetchCollections(first = 24): Promise<ShopifyCollection[]> {
  const data = await shopifyFetch<{
    collections: {
      edges: Array<{
        node: {
          id: string;
          handle: string;
          title: string;
          description: string;
          image: ShopifyCollection["image"];
        };
      }>;
    };
  }>(
    `
    query Collections($first: Int!) {
      collections(first: $first) {
        edges { node {
          id
          handle
          title
          description
          image { ${IMAGE} }
        } }
      }
    }
  `,
    { first }
  );
  return data.collections.edges.map((e) => e.node);
}

// ---------------------------------------------------------------------------
// Carrinho (Storefront Cart API — checkout alojado na Shopify)
// ---------------------------------------------------------------------------

interface CartResponse {
  cart: ShopifyCart & {
    lines: { edges: Array<{ node: ShopifyCartLine }> };
  };
}

const CART_FIELDS = `
  id
  checkoutUrl
  totalQuantity
  cost {
    subtotalAmount { ${MONEY} }
    totalAmount { ${MONEY} }
  }
  lines(first: 100) {
    edges { node {
      id
      quantity
      cost { totalAmount { ${MONEY} } }
      merchandise {
        ... on ProductVariant {
          id
          title
          price { ${MONEY} }
          image { ${IMAGE} }
          product {
            id
            handle
            title
            vendor
          }
        }
      }
    } }
  }
`;

function mapCart(cart: CartResponse["cart"]): ShopifyCart {
  return { ...cart, lines: cart.lines?.edges?.map((e) => e.node) ?? [] };
}

/** Cria um carrinho novo com a primeira linha. */
export async function cartCreate(lines: CartLineInput[]): Promise<ShopifyCart> {
  const data = await shopifyFetch<{ cartCreate: { cart: CartResponse["cart"] | null } }>(
    `
    mutation CartCreate($lines: [CartLineInput!]!) {
      cartCreate(input: { lines: $lines }) {
        cart { ${CART_FIELDS} }
        userErrors { field message }
      }
    }
  `,
    { lines }
  );
  const errs = (data.cartCreate as unknown as { userErrors?: Array<{ message }> }).userErrors ?? [];
  if (errs.length > 0) throw new Error(errs[0].message);
  if (!data.cartCreate.cart) throw new Error("Não foi possível criar o carrinho.");
  return mapCart(data.cartCreate.cart);
}

/** Busca o carrinho actual (null se expirou/apagado). */
export async function fetchCart(cartId: string): Promise<ShopifyCart | null> {
  const data = await shopifyFetch<{ cart: CartResponse["cart"] | null }>(
    `
    query Cart($cartId: ID!) {
      cart(id: $cartId) { ${CART_FIELDS} }
    }
  `,
    { cartId }
  );
  return data.cart ? mapCart(data.cart) : null;
}

export async function cartLinesAdd(cartId: string, lines: CartLineInput[]): Promise<ShopifyCart> {
  const data = await shopifyFetch<{ cartLinesAdd: { cart: CartResponse["cart"] | null; userErrors: Array<{ message }> } }>(
    `
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ${CART_FIELDS} }
        userErrors { field message }
      }
    }
  `,
    { cartId, lines }
  );
  if (data.cartLinesAdd.userErrors.length > 0) throw new Error(data.cartLinesAdd.userErrors[0].message);
  if (!data.cartLinesAdd.cart) throw new Error("Carrinho não encontrado.");
  return mapCart(data.cartLinesAdd.cart);
}

export async function cartLinesUpdate(
  cartId: string,
  lines: Array<{ id: string; quantity: number }>
): Promise<ShopifyCart> {
  const data = await shopifyFetch<{ cartLinesUpdate: { cart: CartResponse["cart"] | null; userErrors: Array<{ message }> } }>(
    `
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ${CART_FIELDS} }
        userErrors { field message }
      }
    }
  `,
    { cartId, lines }
  );
  if (data.cartLinesUpdate.userErrors.length > 0) throw new Error(data.cartLinesUpdate.userErrors[0].message);
  if (!data.cartLinesUpdate.cart) throw new Error("Carrinho não encontrado.");
  return mapCart(data.cartLinesUpdate.cart);
}

export async function cartLinesRemove(cartId: string, lineIds: string[]): Promise<ShopifyCart> {
  const data = await shopifyFetch<{ cartLinesRemove: { cart: CartResponse["cart"] | null; userErrors: Array<{ message }> } }>(
    `
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ${CART_FIELDS} }
        userErrors { field message }
      }
    }
  `,
    { cartId, lineIds }
  );
  if (data.cartLinesRemove.userErrors.length > 0) throw new Error(data.cartLinesRemove.userErrors[0].message);
  if (!data.cartLinesRemove.cart) throw new Error("Carrinho não encontrado.");
  return mapCart(data.cartLinesRemove.cart);
}
