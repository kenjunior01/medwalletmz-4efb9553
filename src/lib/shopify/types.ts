// ============================================================================
// MedWallet Global Shop — Tipos Shopify Storefront API
// ============================================================================

export interface ShopifyMoney {
  amount: string; // "12.99"
  currencyCode: string; // "USD" | "CAD" | ...
}

export interface ShopifyImage {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

export interface ShopifyPriceRange {
  minVariantPrice: ShopifyMoney;
  maxVariantPrice: ShopifyMoney;
}

export interface ShopifySelectedOption {
  name: string;
  value: string;
}

export interface ShopifyVariant {
  id: string;
  title: string; // "M / Preto"
  availableForSale: boolean;
  price: ShopifyMoney;
  selectedOptions: ShopifySelectedOption[];
}

export interface ShopifyOption {
  name: string; // "Tamanho"
  values: string[];
}

export interface ShopifyCollectionRef {
  handle: string;
  title: string;
}

export interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  vendor: string | null;
  description: string;
  descriptionHtml: string;
  availableForSale: boolean;
  totalInventory: number | null;
  tags: string[];
  images: ShopifyImage[];
  priceRange: ShopifyPriceRange;
  compareAtPriceRange: ShopifyPriceRange;
  options: ShopifyOption[];
  variants: ShopifyVariant[];
  collections: ShopifyCollectionRef[];
  createdAt: string;
}

export interface ShopifyPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface ShopifyCollection {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: ShopifyImage | null;
}

export interface ShopifyCartLineMerchandise {
  id: string;
  title: string; // título da variante
  price: ShopifyMoney;
  image: ShopifyImage | null;
  product: {
    id: string;
    handle: string;
    title: string;
    vendor: string | null;
  };
}

export interface ShopifyCartLine {
  id: string;
  quantity: number;
  merchandise: ShopifyCartLineMerchandise;
  cost: {
    totalAmount: ShopifyMoney | null;
  };
}

export interface ShopifyCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  lines: ShopifyCartLine[];
  cost: {
    subtotalAmount: ShopifyMoney | null;
    totalAmount: ShopifyMoney | null;
  };
}

export interface CartLineInput {
  merchandiseId: string;
  quantity: number;
}
