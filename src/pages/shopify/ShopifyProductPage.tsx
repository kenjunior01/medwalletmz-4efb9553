// ============================================================================
// MedWallet Global Shop — Página de produto (Shopify Storefront)
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, ShoppingCart, ShoppingBag, Truck, Shield, Package,
  Loader2, AlertTriangle, Check, Tag, Globe,
} from "@/components/icons/lucide-compat";
import { fetchProductByHandle } from "@/lib/shopify/api";
import { formatMoney, discountPercent } from "@/lib/shopify/format";
import { ShopifyError } from "@/lib/shopify/client";
import { isShopifyConfigured } from "@/lib/shopify/config";
import type { ShopifyProduct } from "@/lib/shopify/types";
import { useShopifyCart } from "@/contexts/ShopifyCartContext";

export default function ShopifyProductPage() {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const { addItem, busy } = useShopifyCart();

  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [imgIdx, setImgIdx] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setProduct(null);
    setImgIdx(0);
    setQty(1);
    setSelected({});
    void (async () => {
      try {
        const p = await fetchProductByHandle(handle ?? "");
        if (!alive) return;
        if (!p) {
          setError("Produto não encontrado. Pode ter sido removido da loja.");
        } else {
          setProduct(p);
          // Pré-selecciona a primeira opção disponível de cada eixo
          const preset: Record<string, string> = {};
          for (const opt of p.options) {
            const avail = p.variants
              .filter((v) => v.availableForSale)
              .map((v) => v.selectedOptions.find((so) => so.name === opt.name)?.value)
              .find(Boolean);
            preset[opt.name] = (avail ?? opt.values[0]) as string;
          }
          setSelected(preset);
        }
      } catch (err) {
        if (!alive) return;
        setError(
          err instanceof ShopifyError
            ? err.message
            : "Não foi possível carregar o produto."
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [handle]);

  /** Variante correspondente à selecção actual. */
  const variant = useMemo(() => {
    if (!product || product.options.length === 0) return product?.variants[0] ?? null;
    return (
      product.variants.find((v) =>
        v.selectedOptions.every((so) => selected[so.name] === so.value)
      ) ?? null
    );
  }, [product, selected]);

  const price = variant?.price ?? product?.priceRange.minVariantPrice ?? null;
  const compareAt = product?.compareAtPriceRange.minVariantPrice ?? null;
  const discount = price && compareAt && parseFloat(compareAt.amount) > parseFloat(price.amount)
    ? Math.round(((parseFloat(compareAt.amount) - parseFloat(price.amount)) / parseFloat(compareAt.amount)) * 100)
    : 0;

  const canBuy = !!variant?.availableForSale;

  const onAdd = async (goToCart: boolean) => {
    if (!variant) return;
    const ok = await addItem(variant.id, qty);
    if (ok) {
      toast.success("Adicionado ao carrinho", {
        description: product?.title,
        action: goToCart
          ? undefined
          : { label: "Ver carrinho", onClick: () => navigate("/shop/cart") },
      });
      if (goToCart) navigate("/shop/cart");
    } else {
      toast.error("Não foi possível adicionar ao carrinho.");
    }
  };

  // ------------------------------------------------------------------
  if (!isShopifyConfigured()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Package className="mx-auto mb-4 h-14 w-14 text-muted-foreground/40" />
        <h1 className="mb-2 text-xl font-black">Loja não ligada</h1>
        <p className="mb-6 text-muted-foreground">
          Liga a loja Shopify para veres os produtos.
        </p>
        <Button className="rounded-xl" onClick={() => navigate("/shop/config")}>
          Configurar loja
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Skeleton className="mb-4 h-8 w-40 rounded-lg" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-3xl" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-4/5" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <p className="mb-6 text-muted-foreground">{error}</p>
        <Button variant="outline" className="rounded-xl" onClick={() => navigate("/shop")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar à loja
        </Button>
      </div>
    );
  }

  const stock = product.totalInventory;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 md:pb-10">
      {/* Navegação */}
      <div className="flex items-center justify-between py-4">
        <Button variant="ghost" size="sm" className="-ml-2 rounded-lg" onClick={() => navigate("/shop")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Loja
        </Button>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Globe className="h-3.5 w-3.5" />
          Loja Global
        </span>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Galeria */}
        <div>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-muted">
            {product.images[imgIdx] ? (
              <img
                src={product.images[imgIdx].url}
                alt={product.images[imgIdx].altText ?? product.title}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center">
                <ShoppingBag className="h-16 w-16 text-muted-foreground/30" />
              </div>
            )}
            {discount > 0 && (
              <Badge className="absolute left-3 top-3 rounded-lg bg-destructive px-2 text-xs font-bold text-white">
                -{discount}% hoje
              </Badge>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <button
                  key={img.url}
                  onClick={() => setImgIdx(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${
                    i === imgIdx ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img.url} alt={img.altText ?? ""} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Informação */}
        <div className="space-y-5">
          <div>
            {product.vendor && (
              <Link
                to="/shop"
                className="text-xs font-semibold uppercase tracking-wide text-primary hover:underline"
              >
                {product.vendor}
              </Link>
            )}
            <h1 className="mt-1 text-2xl font-black leading-tight">{product.title}</h1>
          </div>

          {/* Preço */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">{formatMoney(price)}</span>
            {discount > 0 && compareAt && (
              <span className="text-lg text-muted-foreground line-through">
                {formatMoney(compareAt)}
              </span>
            )}
          </div>
          <p className="-mt-3 text-xs text-muted-foreground">
            Preço em {variant?.price.currencyCode === "CAD" ? "dólares canadianos (CAD)" : "dólares americanos (USD)"} ·
            envio e impostos calculados no checkout
          </p>

          {/* Disponibilidade */}
          <div className="flex flex-wrap items-center gap-2">
            {canBuy ? (
              <Badge className="rounded-lg bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">
                <Check className="mr-1 h-3 w-3" /> Em stock
              </Badge>
            ) : (
              <Badge variant="secondary" className="rounded-lg">Esgotado</Badge>
            )}
            {canBuy && stock !== null && stock > 0 && stock <= 10 && (
              <Badge className="rounded-lg bg-amber-500/15 text-amber-600 hover:bg-amber-500/15">
                Apenas {stock} unidades
              </Badge>
            )}
          </div>

          {/* Opções (tamanho, cor, …) */}
          {product.options.map((opt) => (
            <div key={opt.name}>
              <p className="mb-1.5 text-sm font-semibold">
                {opt.name}
                {selected[opt.name] && (
                  <span className="ml-2 font-normal text-muted-foreground">{selected[opt.name]}</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {opt.values.map((val) => {
                  const isActive = selected[opt.name] === val;
                  // A variante correspondente existe e está disponível?
                  const avail = product.variants.some(
                    (v) =>
                      v.availableForSale &&
                      v.selectedOptions.some((so) => so.name === opt.name && so.value === val) &&
                      product.options.every((o2) =>
                        o2.name === opt.name
                          ? true
                          : v.selectedOptions.some((so2) => so2.name === o2.name && so2.value === selected[o2.name])
                      ) || product.options.length === 1
                  );
                  return (
                    <button
                      key={val}
                      disabled={!avail && product.options.length === 1}
                      onClick={() => setSelected((s) => ({ ...s, [opt.name]: val }))}
                      className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : avail || product.options.length > 1
                          ? "border-border bg-card hover:border-primary/50"
                          : "cursor-not-allowed border-border bg-muted/40 text-muted-foreground line-through"
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quantidade + acções */}
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-border">
              <button
                className="px-3 py-2.5 text-lg font-bold text-muted-foreground hover:text-foreground disabled:opacity-40"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="Diminuir quantidade"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-bold">{qty}</span>
              <button
                className="px-3 py-2.5 text-lg font-bold text-muted-foreground hover:text-foreground"
                onClick={() => setQty((q) => Math.min(99, q + 1))}
                aria-label="Aumentar quantidade"
              >
                +
              </button>
            </div>
            <Button
              className="flex-1 rounded-xl"
              disabled={!canBuy || busy}
              onClick={() => void onAdd(false)}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
              Adicionar ao carrinho
            </Button>
          </div>
          <Button
            variant="secondary"
            className="w-full rounded-xl"
            disabled={!canBuy || busy}
            onClick={() => void onAdd(true)}
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            Comprar agora
          </Button>

          {/* Confiança */}
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/60 bg-muted/30 p-3 text-center text-[11px] text-muted-foreground">
            <div>
              <Truck className="mx-auto mb-1 h-4 w-4 text-emerald-500" />
              Envio EUA/Canadá
            </div>
            <div>
              <Shield className="mx-auto mb-1 h-4 w-4 text-emerald-500" />
              Compra protegida
            </div>
            <div>
              <Package className="mx-auto mb-1 h-4 w-4 text-emerald-500" />
              Rastreio incluído
            </div>
          </div>

          {/* Coleções */}
          {product.collections.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.collections.map((c) => (
                <Link
                  key={c.handle}
                  to="/shop"
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <Tag className="h-3 w-3" />
                  {c.title}
                </Link>
              ))}
            </div>
          )}

          {/* Descrição */}
          {product.descriptionHtml && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="mb-2 text-sm font-bold">Descrição</h2>
              <div
                className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed [&_a]:text-primary [&_img]:rounded-xl"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(product.descriptionHtml, {
                    FORBID_TAGS: ["style", "script", "iframe", "form"],
                  }),
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
