import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, BookOpen, Clock, Sparkles, ShieldCheck, AlertTriangle,
  ChevronRight, Share2, Search, Stethoscope, Heart, Brain, Baby,
  Activity, Apple, HeartPulse, Lock, ThumbsUp, Eye,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Recomendações aplicadas (relatório estratégico §4.1):
 *  - "Conteúdo Educacional Localizado": artigos/vídeos/infográficos sobre
 *    saúde adaptados à realidade moçambicana, com foco em prevenção.
 *
 * Fonte: tabela `health_articles` (seed inclui 8 artigos MZ-focused:
 * malária, cólera, hipertensão, pré-natal, HIV, diabetes, saúde mental,
 * primeiros socorros em crianças).
 */

const categoryMeta: Record<string, { label: string; icon: any; color: string }> = {
  prevention:    { label: "Prevenção",      icon: ShieldCheck,  color: "bg-pharmacy/15 text-pharmacy" },
  nutrition:     { label: "Nutrição",        icon: Apple,         color: "bg-emerald/15 text-emerald" },
  maternal:      { label: "Mãe & Bebé",      icon: Baby,          color: "bg-pink-500/15 text-pink-500" },
  child:         { label: "Saúde Infantil",  icon: Heart,         color: "bg-rose-500/15 text-rose-500" },
  chronic:       { label: "Doenças Crónicas",icon: Activity,      color: "bg-blue-500/15 text-blue-500" },
  mental_health: { label: "Saúde Mental",    icon: Brain,         color: "bg-violet-500/15 text-violet-500" },
  sexual_health: { label: "Saúde Sexual",    icon: HeartPulse,    color: "bg-red-500/15 text-red-500" },
  first_aid:     { label: "Primeiros Socorros", icon: AlertTriangle, color: "bg-amber-500/15 text-amber-500" },
  mozambique_focus: { label: "Foco MZ",      icon: Sparkles,      color: "bg-secondary/15 text-secondary" },
};

const allCategory = { label: "Tudo", icon: BookOpen, color: "bg-primary/15 text-primary" };

export default function HealthEducation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { slug } = useParams();
  const [activeCat, setActiveCat] = useState<string>("all");
  const [query, setQuery] = useState("");

  const { data: articles, isLoading } = useQuery({
    queryKey: ["health-articles", activeCat, query],
    queryFn: async () => {
      let q = (supabase as any)
        .from("health_articles")
        .select("id, slug, title, excerpt, category, read_minutes, published_at, cover_url, author_name, author_credentials, is_featured, views_count")
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("published_at", { ascending: false });
      if (activeCat !== "all") q = q.eq("category", activeCat);
      if (query.trim()) q = q.ilike("title", `%${query.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: article, isLoading: loadingOne } = useQuery({
    queryKey: ["health-article", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("health_articles")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Track view (best-effort)
  useEffect(() => {
    if (!article?.id) return;
    (supabase as any).from("article_views").insert({
      article_id: article.id,
      user_id: user?.id ?? null,
    }).then(() => {});
  }, [article?.id, user?.id]);

  const featured = articles?.find((a: any) => a.is_featured) || articles?.[0];
  const rest = articles?.filter((a: any) => a.id !== featured?.id) ?? [];
  const related = articles?.filter((a: any) => a.id !== article?.id && a.category === article?.category).slice(0, 3) ?? [];

  // Se tiver slug, abre o detalhe
  if (slug) return <ArticleDetail article={article} related={related} loading={loadingOne} onBack={() => navigate("/health/education")} user={user} navigate={navigate} />;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 py-3 backdrop-blur border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Saúde em Moçambique
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-muted-foreground">Artigos baseados na realidade local</p>
            <Badge variant="outline" className="h-4 text-[8px] bg-emerald-50 text-emerald-700 border-emerald-100 font-black flex items-center gap-1">
              <ShieldCheck className="h-2 w-2" /> DISPONÍVEL OFFLINE
            </Badge>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar (ex: malária, HIV, hipertensão)..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 pt-3">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[allCategory, ...Object.entries(categoryMeta).map(([k, v]) => ({ ...v, key: k }))].map((c: any) => {
            const isActive = (activeCat === "all" && c.label === "Tudo") || activeCat === c.key;
            const Icon = c.icon;
            return (
              <button
                key={c.label}
                onClick={() => setActiveCat(c.key ?? "all")}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold border transition",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured */}
      {isLoading ? (
        <div className="px-4 mt-4 space-y-3">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : !articles || articles.length === 0 ? (
        <div className="px-4 mt-8 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Sem artigos nesta categoria.</p>
        </div>
      ) : (
        <>
          {featured && !query && activeCat === "all" && (
            <FeaturedHero article={featured} onOpen={() => navigate(`/health/education/${featured.slug}`)} />
          )}

          {/* Articles list */}
          <section className="px-4 mt-4 space-y-3">
            {(featured && !query && activeCat === "all" ? rest : articles).map((a: any) => {
              const meta = categoryMeta[a.category] ?? allCategory;
              const Icon = meta.icon;
              return (
                <button
                  key={a.id}
                  onClick={() => navigate(`/health/education/${a.slug}`)}
                  className="w-full text-left bento-card p-4 hover:shadow-md transition flex gap-3"
                >
                  <div className={cn("h-12 w-12 rounded-xl shrink-0 flex items-center justify-center", meta.color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">{meta.label}</Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-3 w-3" /> {a.read_minutes || Math.ceil((a.body_md?.length || 500) / 1000) || 4} min
                      </span>
                    </div>
                    <p className="font-bold text-sm leading-tight line-clamp-2">{a.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.excerpt}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </button>
              );
            })}
          </section>
        </>
      )}

      {/* CTA — medical on call */}
      <section className="px-4 mt-6">
        <Card className="p-4 bg-gradient-to-br from-primary to-secondary text-primary-foreground border-0">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">Tens dúvidas sobre o teu caso?</p>
              <p className="text-xs opacity-90 mt-0.5">Fala com um médico verificado via chat ou vídeo-consulta.</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="secondary" onClick={() => navigate("/health/triage")}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Meddy Consulta
                </Button>
                <Button size="sm" variant="outline" className="bg-transparent border-white/40 text-white hover:bg-white/10" onClick={() => navigate("/health/doctors")}>
                  <Stethoscope className="h-3.5 w-3.5 mr-1" /> Marcar
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

function FeaturedHero({ article, onOpen }: { article: any; onOpen: () => void }) {
  const meta = categoryMeta[article.category] ?? allCategory;
  const Icon = meta.icon;
  return (
    <section className="px-4 mt-4">
      <button onClick={onOpen} className="w-full text-left bento-card overflow-hidden p-0 group">
        <div className="h-32 w-full bg-gradient-to-br from-primary via-secondary to-pharmacy relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.3),transparent_60%)]" />
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute bottom-3 left-4">
            <Badge className="bg-white/90 text-primary border-0 text-[10px] font-bold">
              <Sparkles className="h-3 w-3 mr-1" /> EM DESTAQUE
            </Badge>
          </div>
          <div className="absolute top-3 right-4 h-12 w-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="p-4">
          <Badge variant="outline" className="text-[10px] mb-2">{meta.label}</Badge>
          <h2 className="text-lg font-black leading-tight">{article.title}</h2>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.excerpt}</p>
          <div className="flex items-center justify-between mt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {article.read_minutes ?? 4} min de leitura
            </span>
            <span className="font-semibold text-primary flex items-center gap-0.5">
              Ler artigo <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </button>
    </section>
  );
}

function ArticleDetail({ article, related, loading, onBack, user, navigate }: { article: any; related: any[]; loading: boolean; onBack: () => void; user: any; navigate: any }) {
  // Hooks devem ser chamados sempre, antes de qualquer early return.
  const [liked, setLiked] = useState(false);

  const blocks = useMemo(
    () => renderMd((article?.body_md as string) || ""),
    [article?.body_md]
  );

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!article) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted-foreground">Artigo não encontrado.</p>
        <Button className="mt-3" onClick={onBack}>Voltar</Button>
      </div>
    );
  }
  const meta = categoryMeta[article.category] ?? allCategory;

  const share = async () => {
    const url = `${window.location.origin}/health/education/${article.slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: article.title, text: article.excerpt, url }); } catch (_) { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 py-3 backdrop-blur border-b">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <Badge variant="outline" className="text-[10px] mb-0.5">{meta.label}</Badge>
          <span className="text-base font-bold truncate block">{article.title}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={share} aria-label="Partilhar">
          <Share2 className="h-4 w-4" />
        </Button>
      </header>

      <article className="px-4 pt-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3">
          <Clock className="h-3 w-3" /> {article.read_minutes ?? 4} min
          {article.published_at && (
            <span>· {format(new Date(article.published_at), "d 'de' MMMM, yyyy", { locale: pt })}</span>
          )}
        </div>

        <h1 className="text-2xl font-black leading-tight">{article.title}</h1>
        <p className="text-sm text-muted-foreground mt-2">{article.excerpt}</p>

        <div className="flex items-center gap-3 mt-4 pb-4 border-b">
          <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-black">
            {(article.author_name ?? "M")[0]}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{article.author_name ?? "Equipa MedWallet"}</p>
            <p className="text-[11px] text-muted-foreground">{article.author_credentials ?? "Equipa clínica"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn("gap-1.5 h-8 rounded-full", liked && "text-primary bg-primary/10")}
              onClick={() => {
                setLiked(!liked);
                toast.success(liked ? "Reação removida" : "Obrigado pelo teu feedback!");
              }}
            >
              <ThumbsUp className={cn("h-4 w-4", liked && "fill-current")} />
              <span className="text-xs">{article.likes_count || 0 + (liked ? 1 : 0)}</span>
            </Button>
            <div className="flex items-center gap-1 text-muted-foreground px-2">
              <Eye className="h-4 w-4" />
              <span className="text-xs">{article.views_count || 0}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3 text-[15px] leading-relaxed">
          {blocks}
        </div>

        {related.length > 0 && (
          <div className="mt-10 pt-6 border-t">
            <h3 className="font-bold text-sm mb-4">Artigos relacionados</h3>
            <div className="space-y-3">
              {related.map(r => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/health/education/${r.slug}`)}
                  className="w-full text-left p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-sm font-bold line-clamp-1">{r.title}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {r.read_minutes || 4} min · {categoryMeta[r.category]?.label}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        <Card className="mt-8 p-4 bg-muted/40 border-dashed">
          <p className="text-[11px] text-muted-foreground">
            ⚠️ Este conteúdo é informativo e <strong>não substitui consulta médica</strong>.
            Em emergência, ligue <strong>84 144</strong> (serviço nacional) ou vá à unidade sanitária mais próxima.
          </p>
        </Card>

        {/* CTA */}
        <Card className="mt-4 p-5 bg-gradient-to-br from-primary to-secondary text-primary-foreground border-0">
          <p className="font-bold">Precisas falar com um médico?</p>
          <p className="text-sm opacity-90 mt-1">Médicos verificados disponíveis em Maputo — chat, vídeo e teleconsulta.</p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => onBack()}
          >
            <Stethoscope className="h-4 w-4 mr-1" /> Marcar consulta
          </Button>
        </Card>
      </article>
    </div>
  );
}

/** Render markdown MUITO simples (apenas o que escrevemos no seed). */
function renderMd(md: string): JSX.Element[] {
  const lines = md.split(/\r?\n/);
  const out: JSX.Element[] = [];
  let listBuf: string[] = [];
  const flushList = () => {
    if (listBuf.length) {
      out.push(
        <ul key={`ul-${out.length}`} className="list-disc pl-5 space-y-1">
          {listBuf.map((it, i) => <li key={i}>{renderInline(it)}</li>)}
        </ul>
      );
      listBuf = [];
    }
  };
  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (!line.trim()) { flushList(); return; }
    if (/^#\s/.test(line)) { flushList(); out.push(<h2 key={idx} className="text-xl font-black mt-4 mb-2">{line.replace(/^#\s/, "")}</h2>); return; }
    if (/^##\s/.test(line)) { flushList(); out.push(<h3 key={idx} className="text-lg font-bold mt-3 mb-1">{line.replace(/^##\s/, "")}</h3>); return; }
    if (/^###\s/.test(line)) { flushList(); out.push(<h4 key={idx} className="text-base font-semibold mt-2">{line.replace(/^###\s/, "")}</h4>); return; }
    if (/^>\s/.test(line)) {
      flushList();
      out.push(
        <blockquote key={idx} className="border-l-4 border-primary pl-3 py-1 bg-primary/5 rounded-r text-sm">
          {renderInline(line.replace(/^>\s/, ""))}
        </blockquote>
      );
      return;
    }
    if (/^[-*]\s/.test(line)) {
      listBuf.push(line.replace(/^[-*]\s/, ""));
      return;
    }
    if (/^\d+\.\s/.test(line)) {
      listBuf.push(line.replace(/^\d+\.\s/, ""));
      return;
    }
    flushList();
    out.push(<p key={idx}>{renderInline(line)}</p>);
  });
  flushList();
  return out;
}

function renderInline(s: string): JSX.Element {
  // **bold**
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}