/**
 * MzPricingPlans — Página de Planos Moçambique (modelo B2B-focused)
 * --------------------------------------------------------------------
 * Estratégia revisada:
 *   - PACIENTES: 100% grátis para sempre (triagem IA, consultas, registos)
 *     → pacientes atraem profissionais (efeito viral)
 *   - PROFISSIONAIS (médicos, veterinários, entregadores): planos Pro pagos
 *   - INSTITUIÇÕES (clínicas, farmácias, labs, hospitais): SaaS B2B pagos
 *
 * A principal fonte de receita são profissionais e instituições.
 * O público (pacientes) é o motor de crescimento — grátis para sempre.
 *
 * Pagamentos B2B: M-Pesa (manual reference), e-Mola, Visa.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sparkles, Crown, Baby, HeartPulse, Users, Check, ArrowRight,
  Shield, Zap, Stethoscope, Pill, Clock, Star, TrendingUp, PhoneCall, X,
  Gift, Infinity as InfinityIcon, Building2, Truck, PawPrint, FlaskConical,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface B2BPlan {
  id: string;
  name: string;
  tagline: string;
  icon: typeof Stethoscope;
  monthly: number;
  color: string;
  gradient: string;
  badge?: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  audience: "doctor" | "veterinary" | "driver" | "clinic" | "pharmacy" | "lab" | "hospital";
  category: "Profissional" | "Instituição";
}

const B2B_PLANS: B2BPlan[] = [
  {
    id: "doctor-pro",
    name: "Doctor Pro",
    tagline: "Para médicos individuais",
    icon: Stethoscope,
    monthly: 1500,
    color: "text-blue-600",
    gradient: "from-blue-500 to-indigo-600",
    audience: "doctor",
    category: "Profissional",
    cta: "Começar",
    features: [
      "Até 200 pacientes activos",
      "Agenda inteligente com lembretes WhatsApp",
      "Receitas digitais com QR code",
      "Prontuário IA (Gemini + Groq)",
      "Videochamadas ilimitadas",
      "Comissão 0% nos primeiros 3 meses",
    ],
  },
  {
    id: "doctor-elite",
    name: "Doctor Elite",
    tagline: "Médicos com volume elevado",
    icon: Crown,
    monthly: 4500,
    color: "text-purple-600",
    gradient: "from-purple-500 to-fuchsia-600",
    badge: "Popular",
    audience: "doctor",
    category: "Profissional",
    highlighted: true,
    cta: "Subir de nível",
    features: [
      "Pacientes ILIMITADOS",
      "Multi-especialidade (até 3)",
      "Análise de imagem IA (lesões, RX, RDT)",
      "Tradução automática (PT ↔ Emakhuwa ↔ Tsonga)",
      "Voz TTS para pacientes analfabetos",
      "Relatórios mensais de performance",
      "Comissão 5% (vs 10% padrão)",
    ],
  },
  {
    id: "veterinary-pro",
    name: "Vet Pro",
    tagline: "Saúde animal",
    icon: PawPrint,
    monthly: 1200,
    color: "text-rose-600",
    gradient: "from-rose-500 to-pink-600",
    audience: "veterinary",
    category: "Profissional",
    cta: "Começar",
    features: [
      "Até 150 pets activos",
      "Vacinação e vermifugação lembretes",
      "Receitas veterinárias digitais",
      "Telemóvel + WhatsApp integrados",
    ],
  },
  {
    id: "driver-plus",
    name: "Entregador Plus",
    tagline: "Para entregadores independentes",
    icon: Truck,
    monthly: 250,
    color: "text-orange-600",
    gradient: "from-orange-500 to-amber-600",
    audience: "driver",
    category: "Profissional",
    cta: "Activar",
    features: [
      "Rotas optimizadas Google Maps",
      "Pagamento M-Pesa directo",
      "Semanal payout sem taxa",
      "Suporte 24/7",
    ],
  },
  {
    id: "pharmacy-pro",
    name: "Farmácia Pro",
    tagline: "Farmácias e lojas de saúde",
    icon: Pill,
    monthly: 3500,
    color: "text-emerald-700",
    gradient: "from-emerald-500 to-green-600",
    audience: "pharmacy",
    category: "Instituição",
    cta: "Activar farmácia",
    features: [
      "Pedidos ilimitados",
      "Catálogo até 5.000 produtos",
      "Entregas com tracking GPS",
      "M-Pesa automático (sem manual)",
      "1 filial incluída",
    ],
  },
  {
    id: "clinica-basic",
    name: "Clínica Basic",
    tagline: "Pequenas clínicas (até 3 médicos)",
    icon: Building2,
    monthly: 6000,
    color: "text-amber-700",
    gradient: "from-amber-500 to-orange-600",
    audience: "clinic",
    category: "Instituição",
    cta: "Activar clínica",
    features: [
      "Até 3 médicos",
      "Agenda partilhada",
      "Prontuário centralizado",
      "Receitas digitais",
      "Relatórios básicos",
    ],
  },
  {
    id: "clinica-pro",
    name: "Clínica Pro",
    tagline: "Clínicas médias (até 15 médicos)",
    icon: Building2,
    monthly: 18000,
    color: "text-amber-800",
    gradient: "from-amber-600 to-orange-700",
    badge: "Recomendado",
    audience: "clinic",
    category: "Instituição",
    highlighted: true,
    cta: "Activar clínica",
    features: [
      "Até 15 médicos",
      "Multi-filial (até 3 unidades)",
      "OCR de receitas (Google Vision)",
      "Integração laboratorial",
      "Dashboard gestor",
      "Suporte prioritário",
    ],
  },
  {
    id: "lab-pro",
    name: "Lab Pro",
    tagline: "Laboratórios de análises",
    icon: FlaskConical,
    monthly: 5000,
    color: "text-cyan-700",
    gradient: "from-cyan-500 to-blue-600",
    audience: "lab",
    category: "Instituição",
    cta: "Activar laboratório",
    features: [
      "Resultados digitais com QR",
      "Integração com clínicas parceiras",
      "Notificação WhatsApp ao paciente",
      "Catálogo de exames ilimitado",
    ],
  },
  {
    id: "hospital-enterprise",
    name: "Hospital Enterprise",
    tagline: "Hospitais e grandes redes",
    icon: Building2,
    monthly: 45000,
    color: "text-indigo-800",
    gradient: "from-indigo-600 to-purple-700",
    badge: "Enterprise",
    audience: "hospital",
    category: "Instituição",
    cta: "Falar com vendas",
    features: [
      "Médicos ILIMITADOS",
      "Filiais ILIMITADAS",
      "API dedicada + webhooks",
      "SLA 99,9% garantido",
      "Onboarding presencial",
      "Personalização de marca",
      "Conformidade MISAU/OMS",
    ],
  },
];

const FREE_PATIENT_FEATURES = [
  { icon: Sparkles, label: "Triagem IA ilimitada", desc: "Gemini + Groq + OpenRouter" },
  { icon: Stethoscope, label: "Consultas online", desc: "Marca com médicos disponíveis" },
  { icon: Pill, label: "Encomenda de medicamentos", desc: "Com entrega ao domicílio" },
  { icon: HeartPulse, label: "Registos de saúde", desc: "Prontuário digital pessoal" },
  { icon: PhoneCall, label: "SOS obstétrico", desc: "Via WhatsApp 24/7" },
  { icon: Clock, label: "Lembretes de medicação", desc: "ARV, TB, crónicos" },
  { icon: Shield, label: "Dados protegidos", desc: "Lei 18/2004 · LGPD-MZ" },
  { icon: InfinityIcon, label: "Para sempre grátis", desc: "Sem cartão · sem trial" },
];

export default function MzPricingPlans() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "Profissional" | "Instituição">("all");

  const filteredPlans = B2B_PLANS.filter((p) => filter === "all" || p.category === filter);

  return (
    <>
      <Seo
        title="Planos — MedWallet MZ"
        description="Pacientes grátis para sempre. Médicos, clínicas, farmácias e hospitais têm planos SaaS B2B a partir de 250 MZN/mês."
        path="/mz-pricing-plans"
      />
      <div className="mx-auto max-w-6xl px-4 py-6 pb-24">
        {/* Hero — modelo novo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-6 text-white shadow-xl relative overflow-hidden"
        >
          <div className="absolute -right-6 -top-6 opacity-10">
            <Gift className="h-40 w-40" />
          </div>
          <div className="relative">
            <Badge className="bg-white/20 text-white border-0 mb-3">
              <Sparkles className="h-3 w-3 mr-1" /> Modelo Moçambicano
            </Badge>
            <h1 className="text-3xl font-black leading-tight">
              Pacientes grátis para sempre.
              <br />
              <span className="text-emerald-100">Profissionais pagam.</span>
            </h1>
            <p className="mt-3 text-sm text-emerald-50 max-w-2xl leading-relaxed">
              Acreditamos que saúde é direito de todos. Por isso, os pacientes usam o MedWallet MZ
              <strong> 100% grátis para sempre</strong> — sem cartão, sem trial, sem limite. A nossa
              receita vem dos <strong>profissionais e instituições</strong> que beneficiam do acesso
              a esta comunidade de pacientes.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold"
                onClick={() => navigate("/auth")}
              >
                <Gift className="h-4 w-4 mr-1" /> Criar conta grátis
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => navigate("/health/triage")}
              >
                <Sparkles className="h-4 w-4 mr-1" /> Experimentar triagem IA
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Secção Pacientes Grátis */}
        <section className="mt-6">
          <div className="text-center mb-4">
            <Badge className="bg-emerald-100 text-emerald-700 border-0 mb-2">
              <Gift className="h-3 w-3 mr-1" /> Para sempre grátis
            </Badge>
            <h2 className="text-xl font-black">Para Pacientes</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Tudo o que precisas para cuidar da tua saúde — sem pagar nada
            </p>
          </div>
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-3xl font-black text-emerald-700">
                    0 MZN
                  </div>
                  <div className="text-xs text-emerald-700/70">para sempre · sem cartão</div>
                </div>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => navigate("/auth")}
                >
                  Começar grátis <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {FREE_PATIENT_FEATURES.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.label} className="rounded-xl bg-white p-3 border border-emerald-100">
                      <Icon className="h-5 w-5 text-emerald-600 mb-1.5" />
                      <div className="font-semibold text-xs">{f.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{f.desc}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700/80 bg-emerald-100/50 rounded-lg p-2">
                <HeartPulse className="h-4 w-4 shrink-0" />
                <span>
                  Porquê grátis? <strong>Pacientes atraem profissionais.</strong> Quanto mais pessoas usam o MedWallet MZ,
                  mais médicos, clínicas e farmácias querem juntar-se — e esses sim, pagam para aceder à rede.
                </span>
              </div>
            </div>
          </Card>
        </section>

        {/* Secção B2B */}
        <section className="mt-10">
          <div className="text-center mb-5">
            <Badge className="bg-blue-100 text-blue-700 border-0 mb-2">
              <TrendingUp className="h-3 w-3 mr-1" /> Para profissionais e instituições
            </Badge>
            <h2 className="text-xl font-black">Planos Profissionais & B2B</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Acede a milhares de pacientes activos em Moçambique
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center justify-center gap-2 mb-5">
            {(["all", "Profissional", "Instituição"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold transition",
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                )}
              >
                {f === "all" ? "Todos" : f === "Profissional" ? "Profissionais" : "Instituições"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPlans.map((plan, i) => {
              const Icon = plan.icon;
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    className={cn(
                      "h-full overflow-hidden transition-all hover:shadow-lg",
                      plan.highlighted
                        ? "border-blue-400 shadow-md ring-2 ring-blue-400/30"
                        : "border-border/60"
                    )}
                  >
                    {plan.badge && (
                      <div className={cn("text-center text-[10px] font-black uppercase tracking-wider text-white py-1.5", `bg-gradient-to-r ${plan.gradient}`)}>
                        {plan.badge}
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={cn("grid h-10 w-10 place-items-center rounded-xl text-white shadow-sm", `bg-gradient-to-br ${plan.gradient}`)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm">{plan.name}</h3>
                          <p className="text-[10px] text-muted-foreground">{plan.tagline}</p>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1 mb-3">
                        <span className="text-2xl font-black">{plan.monthly.toLocaleString('pt-MZ')}</span>
                        <span className="text-xs text-muted-foreground">MZN/mês</span>
                      </div>
                      <ul className="space-y-1.5 mb-4">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-1.5 text-xs">
                            <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" strokeWidth={3} />
                            <span className="text-foreground/80">{f}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={cn(
                          "w-full text-xs font-bold",
                          plan.highlighted
                            ? `bg-gradient-to-r ${plan.gradient} text-white`
                            : "bg-muted hover:bg-muted/80 text-foreground"
                        )}
                        onClick={() => navigate(`/subscribe/${plan.id}`)}
                      >
                        {plan.cta} <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Modelo de negócio explicado */}
        <section className="mt-10">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
            <div className="p-5">
              <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Como funciona o nosso modelo?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-3">
                  <div className="text-2xl mb-1">1️⃣</div>
                  <div className="font-bold text-sm">Pacientes grátis</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Registam-se, usam triagem IA, marcam consultas — sem pagar nada. Crescimento viral orgânico.
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3">
                  <div className="text-2xl mb-1">2️⃣</div>
                  <div className="font-bold text-sm">Profissionais chegam</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Médicos, clínicas e farmácias querem estar onde estão os pacientes. Pagam subscrição Pro.
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3">
                  <div className="text-2xl mb-1">3️⃣</div>
                  <div className="font-bold text-sm">Ecossistema cresce</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Mais profissionais = melhor serviço para pacientes = mais pacientes = mais profissionais. Ciclo virtuoso.
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Stats sociais */}
        <section className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Users, value: "2.500+", label: "Profissionais activos" },
            { icon: Building2, value: "180+", label: "Instituições parceiras" },
            { icon: Pill, value: "50+", label: "Farmácias em 10 cidades" },
            { icon: Star, value: "4.8/5", label: "Avaliação média" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="border-0 shadow-sm">
                <div className="p-3 text-center">
                  <Icon className="h-5 w-5 mx-auto text-emerald-600 mb-1" />
                  <div className="text-xl font-black">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                </div>
              </Card>
            );
          })}
        </section>

        {/* FAQ */}
        <section className="mt-10">
          <h2 className="text-xl font-black text-center mb-4">Perguntas frequentes</h2>
          <div className="space-y-2">
            {[
              {
                q: "Os pacientes pagam mesmo zero?",
                a: "Sim. Tudo o que um paciente precisa — triagem IA, consultas, registos, lembretes, SOS — é grátis para sempre. Sem trial, sem cartão, sem pegadinha.",
              },
              {
                q: "Como é que a plataforma sobrevive?",
                a: "A nossa receita vem dos profissionais (médicos, veterinários, entregadores) e instituições (clínicas, farmácias, labs, hospitais) que pagam subscrição para aceder à rede de pacientes. Modelo marketplace — tipo Uber/Bolt onde condutores pagam, passageiros usam.",
              },
              {
                q: "Sou médico. Vale a pena pagar 1.500 MZN/mês?",
                a: "Sim — desde que tenhas pelo menos 8 consultas/mês via plataforma (a comissão de 10% já é deduzida do que pagas ao MedWallet). Com 20 consultas/mês, o plano paga-se 3x.",
              },
              {
                q: "Tenho clínica com 5 médicos. Qual plano?",
                a: "Clínica Basic (até 3 médicos) fica curto — recomenda-se Clínica Pro (até 15 médicos, 18.000 MZN/mês). Inclui multi-filial se tiveres 2-3 unidades.",
              },
              {
                q: "Há desconto para ONGs e instituições públicas?",
                a: "Sim — ONGs registadas em Moçambique têm 50% de desconto. Instituições do MISAU têm conta Enterprise grátis via parceria. Contacta vendas.",
              },
              {
                q: "Como pago?",
                a: "M-Pesa (manual reference), e-Mola, ou transferência bancária (BIM/BCI/Standard Bank). Activamos após confirmação do pagamento (24-48h).",
              },
            ].map((item) => (
              <details key={item.q} className="group bg-muted/30 rounded-xl p-3 cursor-pointer">
                <summary className="font-semibold text-sm flex items-center justify-between list-none">
                  {item.q}
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform shrink-0 ml-2" />
                </summary>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="mt-10">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 text-center">
            <h2 className="text-2xl font-black mb-2">Pronto para começar?</h2>
            <p className="text-sm text-emerald-50 mb-4">
              Cria a tua conta gratuita em 30 segundos — sem cartão.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                size="lg"
                className="bg-white text-emerald-700 hover:bg-emerald-50 font-black"
                onClick={() => navigate("/auth")}
              >
                <Gift className="h-4 w-4 mr-1" /> Criar conta grátis
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => navigate("/planos-b2b")}
              >
                <Building2 className="h-4 w-4 mr-1" /> Ver planos B2B detalhados
              </Button>
            </div>
            <p className="text-[10px] text-emerald-100/70 mt-4">
              Ao registar-se aceita os Termos de Uso e a Política de Privacidade (Lei 18/2004).
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
