// ============================================================================
// MedWallet Global Shop — Montra da loja Shopify (dropshipping EUA/Canadá)
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, ShoppingBag, ShoppingCart, Globe, Loader2, ExternalLink,
  Truck, Shield, Package, AlertTriangle, Settings, Tag,
} from "@/components/icons/lucide-compat";
import {
  fetchProducts, fetchCollections, fetchShopInfo, type ProductSortKey,
} from "@/lib/shopify/api";
import { isShopifyConfigured } from "@/lib/shopify/config";
import { formatMoney, discountPercent, gidKey } from "@/lib/shopify/format";
import type { ShopifyProduct, ShopifyCollection } from "@/lib/shopify/types";
import { useShopifyCart } from "@/contexts/ShopifyCartContext";
import { ShopifyError } from "@/lib/shopify/client";

const PAGE_SIZE = 24;

const SORT_OPTIONS: Array<{ value: string; label: string; sortKey: ProductSortKey; reverse: boolean }> = [
  { value: "relevance", label: "Relevância", sortKey: "RELEVANCE", reverse: false },
  { value: "best", label: "Mais vendidos", sortKey: "BEST_SELLING", reverse: false },
  { value: "newest", label: "Novidades", sortKey: "CREATED_AT", reverse: true },
  { value: "price_asc", label: "Preço: mais baixo", sortKey: "PRICE", reverse: false },
  { value: "price_desc", label: "Preço: mais alto", sortKey: "PRICE", reverse: true },
];

export default function ShopifyStore() {
  const navigate = useNavigate();
  const { count } = useShopifyCart();

  const configured = isShopifyConfigured();
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [collections, setCollections] = useState<ShopifyCollection[]>([]);
  const [shopName, setShopName] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const [collection, setCollection] = useState<string | null>(null);
  const [sort, setSort] = useState("relevance");

  const cursorRef = useRef<string | null>(null);
  const firstLoadRef = useRef(true);

  const load = useCallback(
    async (reset: boolean) => {
      if (!isShopifyConfigured()) {
        setLoading(false);
        return;
      }
      reset ? setLoading(true) : setLoadingMore(true);
      setError(null);
      const opt = SORT_OPTIONS.find((o) => o.value === sort) ?? SORT_OPTIONS[0];
      try {
        const res = await fetchProducts({
          first: PAGE_SIZE,
          after: reset ? null : cursorRef.current,
          query: query,
          collection: collection,
          sortKey: opt.sortKey,
          reverse: opt.reverse,
        });
        cursorRef.current = res.pageInfo.endCursor;
        setHasNextPage(res.pageInfo.hasNextPage);
        setProducts((prev) => (reset ? res.products : [...prev, ...res.products]));
      } catch (err) {
        setError(
          err instanceof ShopifyError
            ? err.message
            : "Não foi possível carregar os produtos da loja."
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query, collection, sort]
  );

  // Carrega montra + extras (coleções, nome da loja) na 1ª vez
  useEffect(() => {
    if (!firstLoadRef.current) return;
    firstLoadRef.current = false;
    void load(true);
    void (async () => {
      try {
        const [cols, shop] = await Promise.all([
          fetchCollections(20),
          fetchShopInfo(),
        ]);
        setCollections(cols);
        setShopName(shop.name);
      } catch {
        /* extras opcionais — sem erro para o utilizador */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recarrega quando muda pesquisa/coleção/ordem (depois do 1º load)
  useEffect(() => {
    if (firstLoadRef.current) return;
    cursorRef.current = null;
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, collection, sort]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput.trim() || null);
  };

  // ------------------------------------------------------------------
  // Estado: loja não ligada
  // ------------------------------------------------------------------
  if (!configured) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10">
          <ShoppingBag className="h-10 w-10 text-emerald-500" />
        </div>
        <h1 className="mb-2 text-2xl font-black">Loja Global</h1>
        <p className="mb-8 text-muted-foreground">
          Produtos internacionais com envio para os EUA e Canadá, geridos pela
          Shopify — a plataforma de e-commerce mais confiável do mundo.
          A loja ainda não está ligada a esta plataforma.
        </p>
        <div className="rounded-2xl border border-border bg-card p-6 text-left">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <Settings className="h-4 w-4 text-primary" />
            Ligar a loja em 2 minutos
          </h2>
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>Cria a loja em <span className="font-mono">shopify.com</span> e define os mercados <b>EUA + Canadá</b>.</li>
            <li>Shopify Admin → Settings → Apps and sales channels → Develop apps → cria uma app e activa a <b>Storefront API</b>.</li>
            <li>Copia o <b>Storefront API access token</b>.</li>
            <li>Cola o domínio e o token no painel de configuração.</li>
          </ol>
          <Button className="mt-5 w-full rounded-xl" onClick={() => navigate("/shop/config")}>
            <Settings className="mr-2 h-4 w-4" />
            Configurar loja agora
          </Button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Montra
  // ------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 md:pb-10">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black leading-tight">Loja Global</h1>
            {shopName && (
              <p className="text-xs text-muted-foreground">
                pela Shopify · {shopName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="relative rounded-xl"
            aria-label="Carrinho"
            onClick={() => navigate("/shop/cart")}
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl"
            aria-label="Configuração da loja"
            onClick={() => navigate("/shop/config")}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Barra de confiança dropshipping */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border/60 bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5 text-emerald-500" />
          Envio para EUA e Canadá
        </span>
        <span className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-emerald-500" />
          Pagamento seguro Shopify
        </span>
        <span className="hidden items-center gap-1.5 sm:flex">
          <Package className="h-3.5 w-3.5 text-emerald-500" />
          Rastreio em cada encomenda
        </span>
      </div>

      {/* Pesquisa + ordenação */}
      <div className="mb-3 flex gap-2">
        <form onSubmit={submitSearch} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Procurar produtos…"
            className="rounded-xl pl-9"
          />
        </form>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[150px] rounded-xl sm:w-[180px]">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Coleções */}
      {collections.length > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setCollection(null)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              collection === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            Tudo
          </button>
          {collections.map((c) => (
            <button
              key={c.id}
              onClick={() => setCollection(c.handle)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                collection === c.handle
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="my-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="font-semibold text-destructive">Erro ao carregar a loja</p>
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="mt-3 rounded-lg" onClick={() => void load(true)}>
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {/* Grid de produtos */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full rounded-2xl" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-2/5" />
            </div>
          ))}
        </div>
      ) : products.length === 0 && !error ? (
        <div className="py-16 text-center">
          <Package className="mx-auto mb-4 h-14 w-14 text-muted-foreground/40" />
          <p className="font-semibold">Nenhum produto encontrado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {query || collection
              ? "Tenta outra pesquisa ou remove os filtros."
              : "Ainda não há produtos publicados na loja. Adiciona-os no Shopify Admin."}
          </p>
          {(query || collection) && (
            <Button
              variant="outline"
              className="mt-4 rounded-xl"
              onClick={() => {
                setSearchInput("");
                setQuery(null);
                setCollection(null);
              }}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {/* Paginação */}
      {hasNextPage && !loading && (
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            className="rounded-xl px-8"
            disabled={loadingMore}
            onClick={() => void load(false)}
          >
            {loadingMore ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShoppingBag className="mr-2 h-4 w-4" />
            )}
            Carregar mais produtos
          </Button>
        </div>
      )}

      {/* Rodapé de confiança */}
      <div className="mt-10 rounded-2xl border border-border/60 bg-muted/30 p-4 text-center text-xs text-muted-foreground">
        Checkout e pagamentos processados pela Shopify · Preços em USD (EUA) e CAD (Canadá) ·{" "}
        <Link to="/shop/config" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          Gestão da loja <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cartão de produto
// ---------------------------------------------------------------------------

function ProductCard({ product: p }: { product: ShopifyProduct }) {
  const img = p.images[0];
  const discount = discountPercent(p.priceRange, p.compareAtPriceRange);

  return (
    <Link
      to={`/shop/p/${p.handle}`}
      className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {img ? (
          <img
            src={img.url}
            alt={img.altText ?? p.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <ShoppingBag className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        {discount > 0 && (
          <Badge className="absolute left-2 top-2 rounded-lg bg-destructive px-1.5 text-[10px] font-bold text-white">
            -{discount}%
          </Badge>
        )}
        {!p.availableForSale && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
            <Badge variant="secondary" className="rounded-lg font-bold">Esgotado</Badge>
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        {p.vendor && (
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {p.vendor}
          </p>
        )}
        <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug">
          {p.title}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-black text-foreground">
            {formatMoney(p.priceRange.minVariantPrice, true)}
          </span>
          {discount > 0 && (
            <span className="text-xs text-muted-foreground line-through">
              {formatMoney(p.compareAtPriceRange.minVariantPrice, true)}
            </span>
          )}
        </div>
        {p.collections[0] && (
          <p className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
            <Tag className="h-3 w-3" />
            {p.collections[0].title}
          </p>
        )}
      </div>
    </Link>
  );
}

// gidKey mantido para uso futuro (analytics por produto)
void gidKey;
