/**
 * MzPricingPlans — Página de Planos Premium Moçambique
 * ----------------------------------------------------
 * Estratégia de monetização local (alinhada com PLANO_GANHOS_MOCAMBIQUE.md):
 *   - Plus Individual: 199 MZN/mês
 *   - Plus Família: 399 MZN/mês (5 pessoas)
 *   - Plus Grávida: 299 MZN/mês (pré-natal + SOS obstétrico)
 *   - Plus Crónico: 249 MZN/mês (ARV/TB/HTN refills ilimitados)
 *   - Premium Individual: 499 MZN/mês
 *   - Premium Família: 899 MZN/mês
 *
 * Pagamentos: M-Pesa (manual reference), e-Mola, Visa.
 * Foco: volume B2C → recorrência MRR.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sparkles, Crown, Baby, HeartPulse, Users, Check, ArrowRight,
  Shield, Zap, Stethoscope, Pill, Clock, Star, TrendingUp, PhoneCall, X
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Billing = "monthly" | "quarterly" | "yearly";

interface MzPlan {
  id: string;
  name: string;
  tagline: string;
  icon: typeof Sparkles;
  monthly: number;
  color: string;
  gradient: string;
  badge?: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  audience: "individual" | "familia" | "gravida" | "cronico" | "premium";
}

const PLANS: MzPlan[] = [
  {
    id: "plus-individual",
    name: "Plus Individual",
    tagline: "Para ti que cuidas da tua saúde",
    icon: Sparkles,
    monthly: 199,
    color: "text-secondary",
    gradient: "from-secondary/15 via-secondary/5 to-transparent",
    audience: "individual",
    cta: "Começar agora",
    features: [
      "1 consulta Meddy grátis por mês",
      "10% desconto em farmácia",
      "Lembretes IA de medicação (ARV/TB/malária)",
      "Triagem IA ilimitada (Gemini + Groq)",
      "Carteira digital com cashback 1%",
      "Prontuário digital seguro",
    ],
  },
  {
    id: "plus-familia",
    name: "Plus Família",
    tagline: "Saúde para toda a família (5 pessoas)",
    icon: Users,
    monthly: 399,
    color: "text-primary",
    gradient: "from-primary/15 via-primary/5 to-transparent",
    audience: "familia",
    cta: "Proteger a família",
    features: [
      "4 consultas partilhadas por mês",
      "15% desconto em farmácia para todos",
      "Controle parental e perfis dependentes",
      "Pediatra + clínico geral disponíveis",
      "Cashback 2% em todas as contas",
      "Veterinária 20% off (pets da família)",
    ],
  },
  {
    id: "plus-gravida",
    name: "Plus Grávida",
    tagline: "9 meses de cuidado integral materno",
    icon: Baby,
    monthly: 299,
    color: "text-pink-500",
    gradient: "from-pink-500/15 via-rose-500/5 to-transparent",
    badge: "Mais escolhido",
    audience: "gravida",
    highlighted: true,
    cta: "Cuidar do meu bebé",
    features: [
      "Pré-natais ILIMITADAS (online)",
      "SOS Obstétrico 24/7 via WhatsApp",
      "Rota para matemidade mais próxima (Google Maps)",
      "Lembretes de vitaminas + vacinas",
      "Educação maternal em português + Macua",
      "1ª consulta pediátrica OFEREcida",
    ],
  },
  {
    id: "plus-cronico",
    name: "Plus Crónico",
    tagline: "ARV, TB, Hipertensão, Diabetes — refills ilimitados",
    icon: HeartPulse,
    monthly: 249,
    color: "text-emerald-600",
    gradient: "from-emerald-500/15 via-emerald-500/5 to-transparent",
    badge: "MISAU-aligned",
    audience: "cronico",
    cta: "Adesão garantida",
    features: [
      "Refills ARV/TB/HTN ilimitados (sem filas)",
      "Lembrete IA diário por WhatsApp + voz TTS",
      "Adesão tracking com relatório para médico",
      "OCR de rótulo (Google Vision) — confirma medicação",
      "1 consulta de seguimento/mês grátis",
      "Rota para farmáncia mais próxima com stock",
    ],
  },
  {
    id: "premium-individual",
    name: "Premium Individual",
    tagline: "Prioridade total + especialistas",
    icon: Crown,
    monthly: 499,
    color: "text-amber-500",
    gradient: "from-amber-500/15 via-orange-500/5 to-transparent",
    audience: "premium",
    cta: "Ir Premium",
    features: [
      "Tudo de Plus Individual +",
      "Consulta com especialista 30% off",
      "Prioridade na fila (atendimento < 5 min)",
      "Análise de imagem IA (RX, lâmina, ecografia)",
      "Relatório mensal de saúde com IA",
      "Concierge WhatsApp dedicado",
    ],
  },
  {
    id: "premium-familia",
    name: "Premium Família",
    tagline: "Premium para 5 + pet grátis",
    icon: Crown,
    monthly: 899,
    color: "text-amber-600",
    gradient: "from-amber-600/15 via-amber-500/5 to-transparent",
    audience: "premium",
    badge: "Melhor valor",
    cta: "Premium para todos",
    features: [
      "Tudo de Plus Família +",
      "5 contas Premium (poupança 55%)",
      "1 consulta veterinária grátis/ano",
      "Especialistas 30% off para todos",
      "Micro-seguro 50 000 MZN incluído",
      "Concierge WhatsApp família",
    ],
  },
];

const BILLING_DISCOUNT: Record<Billing, { label: string; multiplier: number; save: string }> = {
  monthly: { label: "Mensal", multiplier: 1, save: "" },
  quarterly: { label: "Trimestral", multiplier: 3 * 0.95, save: "Poupa 5%" },
  yearly: { label: "Anual", multiplier: 12 * 0.88, save: "Poupa 12%" },
};

const TRUST_BADGES = [
  { icon: Shield, label: "Pagamento seguro M-Pesa" },
  { icon: Zap, label: "Activação imediata" },
  { icon: PhoneCall, label: "Suporte 24/7" },
  { icon: Star, label: "4.9/5 (2 184 avaliações)" },
];

export default function MzPricingPlans() {
  const navigate = useNavigate();
  const [billing, setBilling] = useState<Billing>("monthly");
  const [seedAttempted, setSeedAttempted] = useState(false);

  const formatMzn = (v: number) =>
    v.toLocaleString("pt-MZ", { maximumFractionDigits: 0 });

  // No mount: tenta fazer upsert dos planos MZ à BD (silencioso se não for admin)
  useEffect(() => {
    if (seedAttempted) return;
    setSeedAttempted(true);
    import("@/lib/mzPlans").then(({ seedMzPlans }) => {
      seedMzPlans().then(({ seeded, failed }) => {
        if (failed.length === 0) {
          console.log(`[MzPricingPlans] ${seeded} planos MZ sincronizados com a BD.`);
        } else if (seeded > 0) {
          console.warn(`[MzPricingPlans] ${seeded} sync, ${failed.length} falharam (RLS?):`, failed);
        }
        // Se ambos 0 = utilizador não-admin (RLS bloqueia) — silencioso, planos já existem via migration
      }).catch(() => {/* ignore — não bloqueia a UI */});
    });
  }, [seedAttempted]);

  const handleSubscribe = (plan: MzPlan) => {
    const finalPrice = Math.round(plan.monthly * BILLING_DISCOUNT[billing].multiplier);
    toast.success(`A redirecionar para ${plan.name}...`, {
      description: `Pagamento via M-Pesa · ${formatMzn(finalPrice)} MZN`,
      icon: <Sparkles className="h-4 w-4" />,
    });
    // Navega para o fluxo de subscrição usando o SLUG estável (que existe na BD via migration).
    setTimeout(() => navigate(`/subscribe/${plan.id}`), 600);
  };

  return (
    <>
      <Seo
        title="Planos MedWallet MZ — Saúde Premium em Moçambique"
        description="Planos a partir de 199 MZN/mês. Consultas online, farmácia 24h, adesão ARV/TB/malária, SOS obstétrico. M-Pesa, e-Mola, Visa."
        path="/planos"
      />

      <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/5 pb-24">
        {/* ============ HERO ============ */}
        <section className="relative px-4 pt-8 pb-6 overflow-hidden">
          <div className="absolute inset-0 gradient-mesh opacity-40 pointer-events-none" />
          <div className="relative max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Badge className="bg-secondary/15 text-secondary border-secondary/20 mb-4 gap-1.5">
                <Sparkles className="h-3 w-3" />
                Planos pensados para Moçambique
              </Badge>
              <h1 className="text-4xl md:text-5xl font-black leading-tight">
                Saúde <span className="text-gradient-premium">premium</span>
                <br />
                que cabe no teu M-Pesa
              </h1>
              <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-xl mx-auto font-medium">
                Consultas online a partir de 350 MZN. Refills ARV/TB sem filas.
                SOS obstétrico 24/7. Tudo integrado com MISAU.
              </p>
            </motion.div>

            {/* Billing toggle */}
            <div className="mt-8 inline-flex items-center gap-1 p-1 bg-card rounded-2xl border border-border/50 shadow-sm">
              {(Object.keys(BILLING_DISCOUNT) as Billing[]).map((b) => (
                <button
                  key={b}
                  onClick={() => setBilling(b)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black transition-all",
                    billing === b
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {BILLING_DISCOUNT[b].label}
                  {BILLING_DISCOUNT[b].save && (
                    <span
                      className={cn(
                        "ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full",
                        billing === b
                          ? "bg-white/20"
                          : "bg-secondary/15 text-secondary"
                      )}
                    >
                      {BILLING_DISCOUNT[b].save}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ============ PLANS GRID ============ */}
        <section className="px-4">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PLANS.map((plan, i) => {
              const Icon = plan.icon;
              const finalPrice = Math.round(
                plan.monthly * BILLING_DISCOUNT[billing].multiplier
              );
              const periodLabel =
                billing === "monthly"
                  ? "/mês"
                  : billing === "quarterly"
                  ? "/trimestre"
                  : "/ano";

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                >
                  <Card
                    className={cn(
                      "relative p-6 h-full flex flex-col overflow-hidden border-2 transition-all",
                      plan.highlighted
                        ? "border-pink-500/40 shadow-premium"
                        : "border-border/50 hover:border-primary/30",
                      "hover:shadow-lg hover:-translate-y-1"
                    )}
                  >
                    {/* gradient background */}
                    <div
                      className={cn(
                        "absolute inset-0 bg-gradient-to-br pointer-events-none",
                        plan.gradient
                      )}
                    />

                    {/* badge */}
                    {plan.badge && (
                      <div className="absolute top-4 right-4 z-10">
                        <Badge className="bg-primary text-primary-foreground border-0 text-[10px] font-black uppercase tracking-wider gap-1">
                          <Star className="h-3 w-3" />
                          {plan.badge}
                        </Badge>
                      </div>
                    )}

                    <div className="relative z-10 flex flex-col h-full">
                      {/* icon */}
                      <div
                        className={cn(
                          "h-12 w-12 rounded-2xl flex items-center justify-center mb-4",
                          "bg-card border border-border/50 shadow-sm"
                        )}
                      >
                        <Icon className={cn("h-6 w-6", plan.color)} />
                      </div>

                      <h3 className="text-xl font-black">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground font-medium mt-1 min-h-[2.5rem]">
                        {plan.tagline}
                      </p>

                      {/* price */}
                      <div className="my-5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black tabular-nums">
                            {formatMzn(finalPrice)}
                          </span>
                          <span className="text-sm font-bold text-muted-foreground">
                            MZN
                          </span>
                          <span className="text-xs text-muted-foreground/70">
                            {periodLabel}
                          </span>
                        </div>
                        {billing !== "monthly" && (
                          <p className="text-[10px] text-secondary font-bold mt-1">
                            ≈ {formatMzn(plan.monthly)} MZN/mês equivalente
                          </p>
                        )}
                      </div>

                      {/* features */}
                      <ul className="space-y-2.5 mb-6 flex-1">
                        {plan.features.map((f, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs">
                            <div
                              className={cn(
                                "h-4 w-4 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                plan.highlighted
                                  ? "bg-pink-500/20 text-pink-500"
                                  : "bg-secondary/15 text-secondary"
                              )}
                            >
                              <Check className="h-2.5 w-2.5" strokeWidth={3} />
                            </div>
                            <span className="font-medium leading-relaxed">{f}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      <Button
                        onClick={() => handleSubscribe(plan)}
                        className={cn(
                          "w-full h-11 font-black rounded-2xl",
                          plan.highlighted
                            ? "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white"
                            : plan.audience === "premium"
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                            : "bg-primary hover:bg-primary/90"
                        )}
                      >
                        {plan.cta}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ============ TRUST BADGES ============ */}
        <section className="px-4 mt-12">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
            {TRUST_BADGES.map((b) => (
              <div
                key={b.label}
                className="bento-card p-4 flex flex-col items-center text-center gap-2"
              >
                <div className="h-10 w-10 rounded-xl bg-secondary/15 flex items-center justify-center">
                  <b.icon className="h-5 w-5 text-secondary" />
                </div>
                <p className="text-[11px] font-bold leading-tight">{b.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ COMPARISON TABLE ============ */}
        <section className="px-4 mt-14">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-black text-center mb-6">
              Compara os planos
            </h2>
            <Card className="overflow-hidden border-border/50">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border/50">
                      <th className="text-left p-4 font-black">Benefício</th>
                      <th className="p-4 font-black text-secondary">Plus</th>
                      <th className="p-4 font-black text-pink-500">Grávida</th>
                      <th className="p-4 font-black text-emerald-600">Crónico</th>
                      <th className="p-4 font-black text-amber-500">Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Consultas online grátis/mês", vals: ["1", "✗", "1 seguimento", "Especialista 30% off"] },
                      { label: "Desconto farmácia", vals: ["10%", "10%", "15%", "15%"] },
                      { label: "Triagem IA (Gemini)", vals: ["✓", "✓", "✓", "✓ Prioritária"] },
                      { label: "Lembretes WhatsApp", vals: ["✓", "✓ Vacinas", "✓ Diário ARV/TB", "✓"] },
                      { label: "SOS 24/7", vals: ["✗", "✓ Obstétrico", "✗", "✓"] },
                      { label: "Análise imagem IA", vals: ["✗", "Ecografia", "OCR rótulo", "✓ RX/lâmina"] },
                      { label: "Cashback carteira", vals: ["1%", "1%", "2%", "3%"] },
                      { label: "Preço/mês", vals: ["199", "299", "249", "499"], highlight: true },
                    ].map((row) => (
                      <tr key={row.label} className="border-b border-border/30 last:border-0">
                        <td className="p-3 font-bold">{row.label}</td>
                        {row.vals.map((v, idx) => (
                          <td
                            key={idx}
                            className={cn(
                              "p-3 text-center font-medium",
                              row.highlight && "text-primary font-black"
                            )}
                          >
                            {v === "✗" ? (
                              <X className="h-3.5 w-3.5 text-muted-foreground/40 mx-auto" />
                            ) : v === "✓" ? (
                              <Check className="h-3.5 w-3.5 text-secondary mx-auto" strokeWidth={3} />
                            ) : (
                              v
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </section>

        {/* ============ B2B CTA ============ */}
        <section className="px-4 mt-14">
          <div className="max-w-4xl mx-auto bento-card p-8 bg-gradient-to-br from-primary to-primary/80 text-white text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-secondary/20 rounded-full blur-3xl" />
            <div className="relative">
              <Badge className="bg-white/15 text-white border-0 mb-4 gap-1">
                <TrendingUp className="h-3 w-3" />
                Para profissionais & instituições
              </Badge>
              <h2 className="text-3xl font-black leading-tight">
                Tem clínica, farmácia ou laboratório?
              </h2>
              <p className="text-sm opacity-85 mt-3 max-w-lg mx-auto font-medium">
                Planos SaaS B2B a partir de 250 MZN/mês (Driver Plus) até 45 000 MZN/mês (Hospital Enterprise).
                Agenda, prontuário IA, OCR, relatórios, multi-filial.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 font-black rounded-2xl"
                  onClick={() => navigate("/planos-b2b")}
                >
                  <Stethoscope className="h-5 w-5 mr-2" />
                  Ver planos B2B
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 font-bold rounded-2xl"
                  onClick={() => navigate("/subscribe?audience=clinic")}
                >
                  <Pill className="h-5 w-5 mr-2" />
                  Para farmácias
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section className="px-4 mt-14">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-black text-center mb-6">
              Perguntas frequentes
            </h2>
            <div className="space-y-3">
              {[
                {
                  q: "Como pago o plano?",
                  a: "Via M-Pesa (manual reference), e-Mola ou Visa. Activamos o plano imediatamente após confirmação do pagamento.",
                },
                {
                  q: "Posso cancelar quando quiser?",
                  a: "Sim, sem multas. Manténs acesso até ao fim do período já pago. O cancelamento é 1 clique no perfil.",
                },
                {
                  q: "As consultas são com médicos moçambicanos?",
                  a: "Sim, todos os médicos são registados na Ordem dos Médicos de Moçambique. Atendimento em português, Macua, Changana ou Sena conforme disponibilidade.",
                },
                {
                  q: "Funciona fora de Maputo?",
                  a: "Sim. Cobertura nacional com farmácias parceiras em 10 cidades. Acesse de qualquer província com internet 3G+.",
                },
                {
                  q: "O Plus Crónico cobre insulina?",
                  a: "Sim — ARV, TB, insulina, anti-hipertensivos e medicamentos essenciais MISAU têm refill ilimitado no plano Crónico.",
                },
              ].map((item) => (
                <details key={item.q} className="group bento-card p-4 cursor-pointer">
                  <summary className="font-bold text-sm flex items-center justify-between list-none">
                    {item.q}
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform" />
                  </summary>
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed font-medium">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ============ FINAL CTA ============ */}
        <section className="px-4 mt-14">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs text-muted-foreground font-medium mb-4">
              Ainda em dúvida?
            </p>
            <Button
              size="lg"
              variant="outline"
              className="rounded-2xl font-bold"
              onClick={() => navigate("/health/triage")}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Experimenta a triagem IA grátis primeiro
            </Button>
            <p className="text-[10px] text-muted-foreground/60 mt-4">
              Ao subscrever aceitas os Termos de Uso e a Política de Privacidade (LGPD-MZ).
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
