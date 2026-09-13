// ============================================================================
// MedWallet Global Shop — Configuração e gestão da loja Shopify
// ============================================================================
// Painel do dono da plataforma: ligar a loja (domínio + token Storefront),
// testar a ligação, e aceder ao backoffice Shopify onde vivem os produtos,
// encomendas, dropshipping (DSers/AutoDS) e pagamentos EUA/Canadá.
// ============================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Settings, Check, Loader2, ExternalLink, Globe,
  Shield, CreditCard, Package, Store, Trash2, Zap,
} from "@/components/icons/lucide-compat";
import {
  getShopifyConfig, saveShopifyConfig, clearShopifyConfig,
  shopifyAdminUrl, SHOPIFY_API_VERSION,
} from "@/lib/shopify/config";
import { fetchShopInfo } from "@/lib/shopify/api";
import { useShopifyCart } from "@/contexts/ShopifyCartContext";

export default function ShopifySettings() {
  const navigate = useNavigate();
  const { reset } = useShopifyCart();

  const existing = getShopifyConfig();
  const [domain, setDomain] = useState(existing?.domain ?? "");
  const [token, setToken] = useState("");
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState<string | null>(existing ? existing.domain : null);
  const [source, setSource] = useState<"env" | "local" | null>(existing?.source ?? null);

  useEffect(() => {
    const cfg = getShopifyConfig();
    if (cfg && cfg.source === "env" && !connected) {
      setConnected(cfg.domain);
      setSource("env");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const testAndSave = async () => {
    setTesting(true);
    try {
      // Guarda primeiro (o cliente lê da config), depois testa
      saveShopifyConfig(domain, token);
      const shop = await fetchShopInfo();
      setConnected(shop.name);
      setSource("local");
      reset(); // carrinhos antigos de outra loja deixam de fazer sentido
      toast.success(`Loja ligada: ${shop.name}`, {
        description: `API ${SHOPIFY_API_VERSION} · montra activa em /shop`,
      });
    } catch (err) {
      clearShopifyConfig();
      setConnected(null);
      toast.error(err instanceof Error ? err.message : "Falha ao ligar à loja.");
    } finally {
      setTesting(false);
    }
  };

  const disconnect = () => {
    clearShopifyConfig();
    reset();
    setConnected(null);
    setSource(null);
    setToken("");
    toast.success("Loja desligada.");
  };

  const cfg = getShopifyConfig();
  const adminUrl = cfg ? shopifyAdminUrl(cfg.domain) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 md:pb-10">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between py-4">
        <Button variant="ghost" size="sm" className="-ml-2 rounded-lg" onClick={() => navigate("/shop")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Loja
        </Button>
        <Settings className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <Store className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-black">Gestão da Loja Global</h1>
          <p className="text-sm text-muted-foreground">
            Shopify Storefront API · dropshipping EUA &amp; Canadá
          </p>
        </div>
      </div>

      {/* Estado actual */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-4">
        {connected ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                <Check className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-bold">{connected}</p>
                <p className="text-xs text-muted-foreground">
                  {source === "env"
                    ? "Configurada via variáveis de ambiente (produção)"
                    : "Configurada neste dispositivo"}
                </p>
              </div>
            </div>
            {source === "local" && (
              <Button variant="ghost" size="sm" className="rounded-lg text-destructive hover:text-destructive" onClick={disconnect}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Desligar
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              Nenhuma loja ligada neste dispositivo.
            </p>
          </div>
        )}
      </div>

      {/* Formulário de ligação */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-1 font-bold">Ligar loja Shopify</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Precisas de uma app personalizada com a <b>Storefront API</b> activada.
          O token é público (apenas leitura de produtos e carrinhos) — seguro para o browser.
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Domínio da loja
            </label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="minhaloja.myshopify.com"
              className="rounded-xl"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Storefront Access Token
            </label>
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="shpat_… (token público da Storefront API)"
              className="rounded-xl font-mono text-xs"
              type="password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <Button
            className="w-full rounded-xl"
            disabled={testing || !domain.trim() || token.trim().length < 20}
            onClick={() => void testAndSave()}
          >
            {testing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            {testing ? "A testar ligação…" : "Testar e guardar"}
          </Button>
        </div>
      </div>

      {/* Como obter o token */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 font-bold">Como obter o token (2 min)</h2>
        <ol className="space-y-2.5 text-sm text-muted-foreground">
          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">1</span>
            <span>Entra no <b>Shopify Admin</b> → <span className="font-mono text-xs">Settings</span> → <span className="font-mono text-xs">Apps and sales channels</span>.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">2</span>
            <span><span className="font-mono text-xs">Develop apps</span> → <span className="font-mono text-xs">Create an app</span> → dá um nome (ex: <i>MedWallet Storefront</i>).</span>
          </li>
          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">3</span>
            <span>Na tab <span className="font-mono text-xs">Configuration</span> → <span className="font-mono text-xs">Storefront API</span> → <b>Configure</b> → activa os scopes <span className="font-mono text-xs">unauthenticated_read_product_listings</span>, <span className="font-mono text-xs">unauthenticated_write_checkouts</span>, <span className="font-mono text-xs">unauthenticated_read_checkouts</span> e <span className="font-mono text-xs">unauthenticated_read_selling_plans</span>.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">4</span>
            <span>Instala a app e copia o token da tab <span className="font-mono text-xs">API credentials</span>.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">5</span>
            <span>Cola aqui o domínio <b>e</b> o token → <b>Testar e guardar</b>. A montra fica activa de imediato.</span>
          </li>
        </ol>
      </div>

      {/* Produção */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-2 font-bold">Configuração permanente (produção)</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Para a loja aparecer para <b>todos os utilizadores</b> sem configuração local,
          define as variáveis de ambiente no deployment:
        </p>
        <div className="space-y-1.5 rounded-xl bg-muted/60 p-3 font-mono text-xs">
          <p><span className="text-primary">VITE_SHOPIFY_DOMAIN</span>=minhaloja.myshopify.com</p>
          <p><span className="text-primary">VITE_SHOPIFY_STOREFRONT_TOKEN</span>=shpat_…</p>
          <p className="text-muted-foreground"># opcional: VITE_SHOPIFY_API_VERSION={SHOPIFY_API_VERSION}</p>
        </div>
      </div>

      {/* Dropshipping EUA/Canadá */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-bold">
          <Globe className="h-4 w-4 text-emerald-500" />
          Dropshipping EUA &amp; Canadá — checklist
        </h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p className="flex gap-2.5">
            <Package className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span><b>Produtos e fornecedores:</b> gere tudo no Shopify Admin. Apps de dropshipping (DSers, AutoDS, Zendrop) sincronizam fornecedores e enviam encomendas automaticamente.</span>
          </p>
          <p className="flex gap-2.5">
            <Globe className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span><b>Mercados:</b> Settings → Markets → activa <b>United States</b> e <b>Canada</b>. Preços aparecem em USD e CAD automaticamente na montra.</span>
          </p>
          <p className="flex gap-2.5">
            <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span><b>Pagamentos:</b> Shopify Payments (cartão, Apple Pay, Google Pay) + PayPal. O checkout é alojado pela Shopify — PCI-DSS nível 1, sem risco para a plataforma.</span>
          </p>
          <p className="flex gap-2.5">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span><b>Encomendas:</b> o cliente recebe e-mail e rastreio da Shopify. Gere devoluções e disputas no próprio Admin.</span>
          </p>
        </div>
      </div>

      {/* Atalhos admin */}
      {adminUrl && (
        <div className="grid gap-2 sm:grid-cols-2">
          <a href={adminUrl} target="_blank" rel="noreferrer" className="block">
            <Button variant="outline" className="w-full rounded-xl justify-start">
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir Shopify Admin
            </Button>
          </a>
          <a href={`${adminUrl}/products`} target="_blank" rel="noreferrer" className="block">
            <Button variant="outline" className="w-full rounded-xl justify-start">
              <Package className="mr-2 h-4 w-4" />
              Gerir produtos
            </Button>
          </a>
          <a href={`${adminUrl}/orders`} target="_blank" rel="noreferrer" className="block">
            <Button variant="outline" className="w-full rounded-xl justify-start">
              <CreditCard className="mr-2 h-4 w-4" />
              Ver encomendas
            </Button>
          </a>
          <a href={`${adminUrl}/analytics`} target="_blank" rel="noreferrer" className="block">
            <Button variant="outline" className="w-full rounded-xl justify-start">
              <Zap className="mr-2 h-4 w-4" />
              Vendas &amp; analytics
            </Button>
          </a>
        </div>
      )}

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        <Badge variant="secondary" className="mr-1.5 rounded-md text-[10px]">Seguro</Badge>
        O token Storefront é uma chave pública: só permite ler produtos e criar carrinhos.
        Nunca colar aqui chaves de Admin API (shppa_/shpat_ de admin).
      </p>
    </div>
  );
}
