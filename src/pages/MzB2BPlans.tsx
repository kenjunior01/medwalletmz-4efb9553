/**
 * MzB2BPlans — Página dedicada a planos SaaS para profissionais
 * ----------------------------------------------------------------
 * Mostra: Doctor Pro/Elite, Clinica Basic/Pro, Hospital Enterprise,
 * Pharmacy Pro, Lab Pro, Driver Plus.
 *
 * Alinhado com PLANO_GANHOS_MOCAMBIQUE.md secção 2.2.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Stethoscope, Pill, FlaskConical, Truck, Building2, Crown, Sparkles,
  Check, ArrowRight, Users, Calendar, FileText, BarChart3, Shield,
  Zap, Star, TrendingUp, Phone
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Audience = "doctor" | "clinic" | "hospital" | "pharmacy" | "lab" | "driver";

interface B2BPlan {
  id: string;
  name: string;
  audience: Audience;
  price: number;
  period: string;
  tagline: string;
  icon: typeof Stethoscope;
  color: string;
  gradient: string;
  features: string[];
  badge?: string;
  popular?: boolean;
  limit?: string;
}

const PLANS: B2BPlan[] = [
  {
    id: "doctor-pro",
    name: "Doctor Pro",
    audience: "doctor",
    price: 1500,
    period: "mês",
    tagline: "Para médicos individuais",
    icon: Stethoscope,
    color: "text-secondary",
    gradient: "from-secondary/10 to-transparent",
    features: [
      "Agenda inteligente com IA",
      "Prontuário digital seguro",
      "50 consultas/mês incluídas",
      "Prescrições digitais (PDF + QR)",
      "Lembretes automáticos WhatsApp",
      "Relatório mensal de atividade",
    ],
  },
  {
    id: "doctor-elite",
    name: "Doctor Elite",
    audience: "doctor",
    price: 4500,
    period: "mês",
    tagline: "Para especialistas premium",
    icon: Crown,
    color: "text-amber-500",
    gradient: "from-amber-500/10 to-transparent",
    badge: "Popular",
    popular: true,
    features: [
      "Tudo de Doctor Pro +",
      "Consultas ILIMITADAS",
      "Marca pessoal (white-label)",
      "Especialistas em destaque",
      "Análise de imagem IA (RX, lâmina)",
      "Concierge WhatsApp dedicado",
      "API para integração externa",
    ],
  },
  {
    id: "clinica-basic",
    name: "Clinica Basic",
    audience: "clinic",
    price: 6000,
    period: "mês",
    tagline: "Clínicas até 3 médicos",
    icon: Building2,
    color: "text-primary",
    gradient: "from-primary/10 to-transparent",
    limit: "Até 3 médicos",
    features: [
      "Sistema completo de gestão",
      "Até 200 consultas/mês",
      "Prontuário partilhado",
      "Agenda multi-profissional",
      "Facturação automática M-Pesa",
      "Relatórios básicos",
    ],
  },
  {
    id: "clinica-pro",
    name: "Clinica Pro",
    audience: "clinic",
    price: 18000,
    period: "mês",
    tagline: "Clínicas 3-10 médicos",
    icon: Building2,
    color: "text-secondary",
    gradient: "from-secondary/10 to-transparent",
    badge: "Recomendado",
    popular: true,
    limit: "Até 10 médicos",
    features: [
      "Tudo de Clinica Basic +",
      "Consultas ILIMITADAS",
      "Multi-filial (até 3 unidades)",
      "WhatsApp Business oficial",
      "Relatórios avançados + BI",
      "Integração laboratório",
      "Gestão de stock farmácia",
      "Suporte prioritário 24/7",
    ],
  },
  {
    id: "hospital-enterprise",
    name: "Hospital Enterprise",
    audience: "hospital",
    price: 45000,
    period: "mês",
    tagline: "Hospitais 10+ médicos",
    icon: Building2,
    color: "text-destructive",
    gradient: "from-destructive/10 to-transparent",
    limit: "10+ médicos",
    features: [
      "Tudo ILIMITADO",
      "Multi-filial ilimitada",
      "API completa + webhooks",
      "DPO dedicado (LGPD-MZ)",
      "Integração MISAU eSISTEMA",
      "Auditoria imutável (hash chain)",
      "SLA 99.9% garantido",
      "Onboarding presencial",
      "Treino equipa (8h incluídas)",
    ],
  },
  {
    id: "pharmacy-pro",
    name: "Pharmacy Pro",
    audience: "pharmacy",
    price: 3500,
    period: "mês",
    tagline: "Para farmácias e lojas",
    icon: Pill,
    color: "text-emerald-600",
    gradient: "from-emerald-500/10 to-transparent",
    features: [
      "Catálogo digital ilimitado",
      "Sistema de entregas integrado",
      "OCR Google Vision (rótulos)",
      "Detecção de fraudes IA",
      "Drivers da rede MedWallet",
      "Pagamentos M-Pesa + e-Mola",
      "Relatórios de vendas diários",
    ],
  },
  {
    id: "lab-pro",
    name: "Lab Pro",
    audience: "lab",
    price: 5000,
    period: "mês",
    tagline: "Para laboratórios",
    icon: FlaskConical,
    color: "text-purple-500",
    gradient: "from-purple-500/10 to-transparent",
    features: [
      "Resultados digitais (PDF + QR)",
      "Integração com médicos",
      "Notificação automática paciente",
      "Catálogo de exames",
      "Pagamentos online",
      "Relatórios de produtividade",
      "Compliance MISAU laboratorial",
    ],
  },
  {
    id: "driver-plus",
    name: "Driver Plus",
    audience: "driver",
    price: 250,
    period: "mês",
    tagline: "Para entregadores",
    icon: Truck,
    color: "text-blue-500",
    gradient: "from-blue-500/10 to-transparent",
    badge: "Melhor valor",
    features: [
      "0% comissão (vs 8% free)",
      "Roteamento IA otimizado",
      "Saque instantâneo M-Pesa",
      "Seguro acidente incluído",
      "Suporte prioritário",
      "Bónus de meta mensal",
    ],
  },
];

const AUDIENCES: { key: Audience; label: string; icon: typeof Stethoscope }[] = [
  { key: "doctor", label: "Médicos", icon: Stethoscope },
  { key: "clinic", label: "Clínicas", icon: Building2 },
  { key: "hospital", label: "Hospitais", icon: Building2 },
  { key: "pharmacy", label: "Farmácias", icon: Pill },
  { key: "lab", label: "Laboratórios", icon: FlaskConical },
  { key: "driver", label: "Entregadores", icon: Truck },
];

const formatMzn = (v: number) => v.toLocaleString("pt-MZ");

export default function MzB2BPlans() {
  const navigate = useNavigate();
  const [audience, setAudience] = useState<Audience>("doctor");
  const [seedAttempted, setSeedAttempted] = useState(false);

  const filtered = PLANS.filter((p) => p.audience === audience);

  // No mount: sincroniza planos MZ com a BD (silencioso se RLS bloquear)
  useEffect(() => {
    if (seedAttempted) return;
    setSeedAttempted(true);
    import("@/lib/mzPlans").then(({ seedMzPlans }) => {
      seedMzPlans().catch(() => {/* ignore */});
    });
  }, [seedAttempted]);

  const handleSubscribe = (plan: B2BPlan) => {
    toast.success(`A redirecionar para ${plan.name}...`, {
      description: `${formatMzn(plan.price)} MZN/${plan.period} · M-Pesa business`,
      icon: <Sparkles className="h-4 w-4" />,
    });
    setTimeout(() => navigate(`/subscribe/${plan.id}`), 600);
  };

  return (
    <>
      <Seo
        title="Planos B2B MedWallet MZ — SaaS para Profissionais de Saúde"
        description="Planos SaaS para médicos, clínicas, hospitais, farmácias, laboratórios e entregadores. Desde 250 MZN/mês até 45 000 MZN/mês."
        path="/planos-b2b"
      />
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-24">
        {/* HERO */}
        <section className="relative px-4 pt-8 pb-6 overflow-hidden">
          <div className="absolute inset-0 bg-dot-pattern opacity-50 pointer-events-none" />
          <div className="relative max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Badge className="bg-primary/15 text-primary border-primary/20 mb-4 gap-1.5">
                <TrendingUp className="h-3 w-3" />
                SaaS para profissionais de saúde
              </Badge>
              <h1 className="text-4xl md:text-5xl font-black leading-tight">
                Faz crescer o teu
                <br />
                <span className="text-gradient-premium">negócio de saúde</span>
              </h1>
              <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-xl mx-auto font-medium">
                Mais pacientes, menos burocracia. Sistema completo com IA, pagamentos
                M-Pesa e compliance MISAU.
              </p>
            </motion.div>

            {/* Audience tabs */}
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {AUDIENCES.map((a) => {
                const Icon = a.icon;
                const isActive = audience === a.key;
                return (
                  <button
                    key={a.key}
                    onClick={() => setAudience(a.key)}
                    className={cn(
                      "px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all border-2",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-md"
                        : "bg-card text-foreground border-border hover:border-primary/30"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* PLANS */}
        <section className="px-4">
          <div className="max-w-5xl mx-auto grid gap-5 md:grid-cols-2">
            {filtered.map((plan, i) => {
              const Icon = plan.icon;
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Card
                    className={cn(
                      "relative p-6 h-full flex flex-col overflow-hidden border-2 transition-all lift-on-hover",
                      plan.popular
                        ? "border-secondary/40 shadow-premium"
                        : "border-border/50"
                    )}
                  >
                    <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none", plan.gradient)} />
                    {plan.badge && (
                      <div className="absolute top-4 right-4 z-10">
                        <Badge className="bg-secondary text-white border-0 text-[10px] font-black uppercase gap-1">
                          <Star className="h-3 w-3" />
                          {plan.badge}
                        </Badge>
                      </div>
                    )}
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-12 w-12 rounded-2xl bg-card border border-border/50 shadow-sm flex items-center justify-center">
                          <Icon className={cn("h-6 w-6", plan.color)} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black">{plan.name}</h3>
                          <p className="text-[11px] text-muted-foreground font-medium">
                            {plan.tagline}
                          </p>
                        </div>
                      </div>

                      <div className="my-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black tabular-nums">
                            {formatMzn(plan.price)}
                          </span>
                          <span className="text-sm font-bold text-muted-foreground">
                            MZN
                          </span>
                          <span className="text-xs text-muted-foreground/70">
                            /{plan.period}
                          </span>
                        </div>
                        {plan.limit && (
                          <p className="text-[10px] text-muted-foreground mt-1 font-bold">
                            {plan.limit}
                          </p>
                        )}
                      </div>

                      <ul className="space-y-2 mb-6 flex-1">
                        {plan.features.map((f, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs">
                            <div className="h-4 w-4 rounded-full bg-secondary/15 text-secondary flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="h-2.5 w-2.5" strokeWidth={3} />
                            </div>
                            <span className="font-medium leading-relaxed">{f}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        onClick={() => handleSubscribe(plan)}
                        className={cn(
                          "w-full h-11 font-black rounded-2xl",
                          plan.popular
                            ? "bg-gradient-to-r from-secondary to-primary hover:opacity-90 text-white"
                            : "bg-primary hover:bg-primary/90"
                        )}
                      >
                        Começar teste 30 dias grátis
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                      <p className="text-[10px] text-center text-muted-foreground/70 mt-2 font-medium">
                        Sem cartão · Cancela quando quiseres
                      </p>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* STATS / SOCIAL PROOF */}
        <section className="px-4 mt-14">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Users, value: "240+", label: "Profissionais activos" },
              { icon: Calendar, value: "18K", label: "Consultas/mês" },
              { icon: FileText, value: "97%", label: "Retenção mensal" },
              { icon: Star, value: "4.8/5", label: "Satisfação NPS" },
            ].map((s) => (
              <Card key={s.label} className="p-4 text-center border-border/50">
                <s.icon className="h-5 w-5 text-secondary mx-auto mb-2" />
                <p className="text-2xl font-black text-primary">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-bold mt-0.5">{s.label}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ENTERPRISE CTA */}
        <section className="px-4 mt-14">
          <div className="max-w-4xl mx-auto bento-card p-8 bg-gradient-to-br from-primary to-primary/80 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-secondary/20 rounded-full blur-3xl" />
            <div className="relative grid md:grid-cols-2 gap-6 items-center">
              <div>
                <Badge className="bg-white/15 text-white border-0 mb-3 gap-1">
                  <Shield className="h-3 w-3" />
                  Enterprise & Governo
                </Badge>
                <h2 className="text-3xl font-black leading-tight">
                  Contratos B2G & Enterprise
                </h2>
                <p className="text-sm opacity-85 mt-3 font-medium">
                  MISAU, ONGs (PEPFAR, Gates), seguradoras. Volume + compliance
                  + integração API. Preços customizados.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 text-sm font-bold">
                  <Zap className="h-5 w-5 shrink-0" /> SLA 99.9%
                </div>
                <div className="flex items-center gap-3 text-sm font-bold">
                  <Shield className="h-5 w-5 shrink-0" /> DPO dedicado
                </div>
                <div className="flex items-center gap-3 text-sm font-bold">
                  <BarChart3 className="h-5 w-5 shrink-0" /> BI customizado
                </div>
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 font-black rounded-2xl mt-2"
                  onClick={() => navigate("/help?topic=enterprise")}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Falar com vendas
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* B2C CTA */}
        <section className="px-4 mt-10">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs text-muted-foreground font-medium mb-3">
              Procuras plano pessoal ou familiar?
            </p>
            <Button
              size="lg"
              variant="outline"
              className="rounded-2xl font-bold"
              onClick={() => navigate("/planos")}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Ver planos B2C (199-899 MZN/mês)
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
