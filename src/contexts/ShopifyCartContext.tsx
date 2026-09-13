// ============================================================================
// MedWallet Global Shop — Contexto do carrinho Shopify (Storefront Cart API)
// ============================================================================
// O carrinho vive na Shopify (cartId persistido em localStorage), portanto
// o cliente pode começar no telemóvel e terminar o checkout em qualquer
// dispositivo. O pagamento, envio (EUA/Canadá) e impostos são da Shopify.
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  cartCreate,
  cartLinesAdd,
  cartLinesRemove,
  cartLinesUpdate,
  fetchCart,
} from "@/lib/shopify/api";
import type { ShopifyCart, CartLineInput } from "@/lib/shopify/types";

const LS_CART_ID = "mw.shopify.cartId";

interface ShopifyCartState {
  cart: ShopifyCart | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
  /** Nº total de itens (para badges). */
  count: number;
  addItem: (merchandiseId: string, quantity?: number) => Promise<boolean>;
  updateLine: (lineId: string, quantity: number) => Promise<void>;
  removeLine: (lineId: string) => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

const ShopifyCartContext = createContext<ShopifyCartState | null>(null);

function readCartId(): string | null {
  try {
    return window.localStorage.getItem(LS_CART_ID);
  } catch {
    return null;
  }
}

function writeCartId(id: string | null): void {
  try {
    if (id) window.localStorage.setItem(LS_CART_ID, id);
    else window.localStorage.removeItem(LS_CART_ID);
  } catch {
    /* storage indisponível — carrinho fica apenas em memória */
  }
}

export function ShopifyCartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<ShopifyCart | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((next: ShopifyCart | null) => {
    setCart(next);
    writeCartId(next?.id ?? null);
  }, []);

  const refresh = useCallback(async () => {
    const id = readCartId();
    if (!id) {
      setCart(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fresh = await fetchCart(id); // null se o carrinho expirou
      apply(fresh);
    } catch {
      // Carrinho inválido → descarta silenciosamente (cliente não perde nada:
      // a Shopify mantém carrinhos abandonados do lado dela)
      apply(null);
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (merchandiseId: string, quantity = 1): Promise<boolean> => {
      setBusy(true);
      setError(null);
      const line: CartLineInput = { merchandiseId, quantity };
      try {
        const currentId = readCartId();
        if (currentId) {
          try {
            apply(await cartLinesAdd(currentId, [line]));
            return true;
          } catch {
            // carrinho expirou → cria um novo abaixo
          }
        }
        apply(await cartCreate([line]));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao adicionar ao carrinho.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [apply]
  );

  const updateLine = useCallback(
    async (lineId: string, quantity: number) => {
      const id = readCartId();
      if (!id) return;
      setBusy(true);
      setError(null);
      try {
        if (quantity <= 0) {
          apply(await cartLinesRemove(id, [lineId]));
        } else {
          apply(await cartLinesUpdate(id, [{ id: lineId, quantity }]));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao actualizar o carrinho.");
      } finally {
        setBusy(false);
      }
    },
    [apply]
  );

  const removeLine = useCallback(
    async (lineId: string) => {
      const id = readCartId();
      if (!id) return;
      setBusy(true);
      setError(null);
      try {
        apply(await cartLinesRemove(id, [lineId]));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao remover o artigo.");
      } finally {
        setBusy(false);
      }
    },
    [apply]
  );

  const reset = useCallback(() => apply(null), [apply]);

  const value = useMemo<ShopifyCartState>(
    () => ({
      cart,
      loading,
      busy,
      error,
      count: cart?.totalQuantity ?? 0,
      addItem,
      updateLine,
      removeLine,
      refresh,
      reset,
    }),
    [cart, loading, busy, error, addItem, updateLine, removeLine, refresh, reset]
  );

  return <ShopifyCartContext.Provider value={value}>{children}</ShopifyCartContext.Provider>;
}

export function useShopifyCart(): ShopifyCartState {
  const ctx = useContext(ShopifyCartContext);
  if (!ctx) throw new Error("useShopifyCart deve ser usado dentro de <ShopifyCartProvider>");
  return ctx;
}
