// ============================================================================
// MedWallet Global Shop — Carrinho + checkout Shopify (EUA/Canadá)
// ============================================================================

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, ShoppingCart, Trash2, Shield, Truck, CreditCard, Package,
} from "@/components/icons/lucide-compat";
import { useShopifyCart } from "@/contexts/ShopifyCartContext";
import { formatMoney } from "@/lib/shopify/format";

export default function ShopifyCartPage() {
  const navigate = useNavigate();
  const { cart, loading, busy, updateLine, removeLine, error } = useShopifyCart();

  const lines = cart?.lines ?? [];

  const goCheckout = () => {
    if (!cart?.checkoutUrl) return;
    // Checkout alojado da Shopify — pagamento, envio (EUA/Canadá) e
    // impostos 100% geridos pela Shopify (PCI-DSS nível 1).
    window.location.assign(cart.checkoutUrl);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 md:pb-10">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between py-4">
        <Button variant="ghost" size="sm" className="-ml-2 rounded-lg" onClick={() => navigate("/shop")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Continuar a comprar
        </Button>
        <span className="flex items-center gap-1.5 text-sm font-bold">
          <ShoppingCart className="h-4 w-4" />
          Carrinho {cart ? `(${cart.totalQuantity})` : ""}
        </span>
      </div>

      {/* A carregar */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Vazio */}
      {!loading && lines.length === 0 && (
        <div className="py-16 text-center">
          <ShoppingCart className="mx-auto mb-4 h-14 w-14 text-muted-foreground/40" />
          <p className="font-bold">O teu carrinho está vazio</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Explora a Loja Global e encontra produtos com envio para os EUA e Canadá.
          </p>
          <Button className="mt-6 rounded-xl" onClick={() => navigate("/shop")}>
            Explorar produtos
          </Button>
        </div>
      )}

      {/* Linhas */}
      {lines.length > 0 && (
        <div className="space-y-3">
          {lines.map((line) => {
            const m = line.merchandise;
            return (
              <div
                key={line.id}
                className="flex gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <button
                  className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted"
                  onClick={() => navigate(`/shop/p/${m.product.handle}`)}
                >
                  {m.image ? (
                    <img
                      src={m.image.url}
                      alt={m.image.altText ?? m.product.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-7 w-7 text-muted-foreground/30" />
                    </div>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <button
                        className="line-clamp-2 text-left text-sm font-semibold hover:underline"
                        onClick={() => navigate(`/shop/p/${m.product.handle}`)}
                      >
                        {m.product.title}
                      </button>
                      {m.title !== "Default Title" && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{m.title}</p>
                      )}
                    </div>
                    <button
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => void removeLine(line.id)}
                      aria-label="Remover artigo"
                      disabled={busy}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center rounded-lg border border-border">
                      <button
                        className="px-2.5 py-1.5 text-base font-bold text-muted-foreground hover:text-foreground disabled:opacity-40"
                        onClick={() => void updateLine(line.id, line.quantity - 1)}
                        disabled={busy}
                        aria-label="Diminuir"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-sm font-bold">{line.quantity}</span>
                      <button
                        className="px-2.5 py-1.5 text-base font-bold text-muted-foreground hover:text-foreground disabled:opacity-40"
                        onClick={() => void updateLine(line.id, line.quantity + 1)}
                        disabled={busy || line.quantity >= 99}
                        aria-label="Aumentar"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm font-black">
                      {formatMoney(line.cost.totalAmount ?? m.price)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Resumo */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-bold">{formatMoney(cart?.cost.subtotalAmount ?? null)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Envio e impostos</span>
              <span className="text-xs text-muted-foreground">no próximo passo</span>
            </div>
            <div className="my-3 border-t border-dashed border-border" />
            <div className="flex items-center justify-between">
              <span className="font-bold">Total</span>
              <span className="text-lg font-black">{formatMoney(cart?.cost.subtotalAmount ?? null)}</span>
            </div>

            <Button
              className="mt-4 w-full rounded-xl py-6 text-base font-bold"
              disabled={busy || !cart?.checkoutUrl}
              onClick={goCheckout}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              Finalizar compra segura
            </Button>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
              Serás redireccionado para o checkout alojado da <b>Shopify</b> —
              cartão, Apple Pay, Google Pay e PayPal. Preços em USD (EUA) / CAD (Canadá).
            </p>
          </div>

          {/* Confiança */}
          <div className="grid grid-cols-2 gap-2 text-center text-[11px] text-muted-foreground">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
              <Shield className="mx-auto mb-1 h-4 w-4 text-emerald-500" />
              Pagamento protegido PCI-DSS
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
              <Truck className="mx-auto mb-1 h-4 w-4 text-emerald-500" />
              Rastreio enviado por e-mail
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
