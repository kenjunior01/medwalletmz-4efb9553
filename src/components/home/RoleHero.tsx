import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope, Pill, Building2, Truck, ShieldCheck, Users, Calendar,
  ClipboardList, TrendingUp, ArrowRight, Package, Activity,
} from "lucide-react";
import type { AppRole } from "@/hooks/useUserRole";

type Cta = { label: string; icon: any; to: string; variant?: "default" | "secondary" };
type Config = {
  tag: string;
  title: string;
  subtitle: string;
  ctas: Cta[];
  metrics?: { label: string; icon: any }[];
  gradient: string;
};

function pickRole(roles: AppRole[]): AppRole {
  const priority: AppRole[] = ["admin", "doctor", "clinic", "store_owner", "driver", "customer"];
  return priority.find(r => roles.includes(r)) || "customer";
}

const CONFIGS: Record<AppRole, Config> = {
  admin: {
    tag: "Painel Admin",
    title: "Governa toda a plataforma",
    subtitle: "Curadoria, utilizadores, transações e configurações num só sítio.",
    gradient: "from-slate-900 via-primary to-secondary",
    ctas: [
      { label: "Dashboard", icon: TrendingUp, to: "/admin" },
      { label: "Curadoria", icon: ClipboardList, to: "/admin/curation", variant: "secondary" },
      { label: "Utilizadores", icon: Users, to: "/admin/users", variant: "secondary" },
    ],
    metrics: [
      { label: "Multi-role", icon: ShieldCheck },
      { label: "Auditoria", icon: Activity },
    ],
  },
  doctor: {
    tag: "Médico",
    title: "Os teus pacientes esperam-te",
    subtitle: "Consultas, receitas digitais e disponibilidade — a partir de qualquer dispositivo.",
    gradient: "from-primary via-pharmacy to-secondary",
    ctas: [
      { label: "Agenda", icon: Calendar, to: "/doctor/availability" },
      { label: "Pacientes", icon: Users, to: "/doctor/patients", variant: "secondary" },
      { label: "Receitar", icon: ClipboardList, to: "/doctor/prescriptions/new", variant: "secondary" },
    ],
    metrics: [{ label: "Recebes em MZN", icon: TrendingUp }],
  },
  clinic: {
    tag: "Clínica / Hospital",
    title: "Cresce com a MedWallet",
    subtitle: "Gere equipa clínica, agenda partilhada e admissões digitais.",
    gradient: "from-primary via-secondary to-pharmacy",
    ctas: [
      { label: "Dashboard", icon: Building2, to: "/clinic/dashboard" },
      { label: "Equipa médica", icon: Stethoscope, to: "/clinic/dashboard", variant: "secondary" },
    ],
    metrics: [{ label: "Multi-médico", icon: Users }],
  },
  store_owner: {
    tag: "Farmácia",
    title: "Vende com receita digital",
    subtitle: "Pedidos prioritários, cadeia de frio e liquidação diária na tua carteira.",
    gradient: "from-pharmacy via-primary to-secondary",
    ctas: [
      { label: "Pedidos", icon: Package, to: "/store/orders" },
      { label: "Produtos", icon: Pill, to: "/store/products", variant: "secondary" },
      { label: "Relatórios", icon: TrendingUp, to: "/store/reports", variant: "secondary" },
    ],
  },
  driver: {
    tag: "Motorista",
    title: "Entregas prontas para ti",
    subtitle: "Aceita rotas, entrega medicamentos e recebe direto na carteira.",
    gradient: "from-secondary via-primary to-pharmacy",
    ctas: [
      { label: "Novas entregas", icon: Truck, to: "/driver/dashboard" },
      { label: "Histórico", icon: ClipboardList, to: "/driver/history", variant: "secondary" },
    ],
  },
  customer: {
    tag: "Paciente",
    title: "Saúde e farmácia numa só carteira",
    subtitle: "Triagem IA, médicos verificados e entregas 24/7 em Maputo.",
    gradient: "from-primary to-secondary",
    ctas: [
      { label: "Triagem IA", icon: Activity, to: "/health/triage" },
      { label: "Médicos", icon: Stethoscope, to: "/health/doctors", variant: "secondary" },
    ],
  },
};

export function RoleHero({ roles, name }: { roles: AppRole[]; name?: string }) {
  const navigate = useNavigate();
  const role = pickRole(roles);
  const cfg = CONFIGS[role];

  return (
    <section className="px-4 pt-3">
      <div className={`relative rounded-[2rem] overflow-hidden bg-gradient-to-br ${cfg.gradient} p-6 text-white shadow-premium`}>
        <div className="absolute -top-14 -right-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-16 -left-12 w-56 h-56 rounded-full bg-black/20 blur-3xl" aria-hidden />
        <div className="relative">
          <Badge className="bg-white/20 text-white border-0 backdrop-blur mb-2 text-[10px] tracking-wider uppercase">
            {cfg.tag}{name ? ` · Olá, ${name}` : ''}
          </Badge>
          <h1 className="text-3xl font-black leading-[1.05]">{cfg.title}</h1>
          <p className="text-sm opacity-85 mt-2 max-w-[320px]">{cfg.subtitle}</p>

          <div className="flex flex-wrap gap-2 mt-5">
            {cfg.ctas.map((c, i) => {
              const Icon = c.icon;
              return (
                <Button
                  key={c.label}
                  size="sm"
                  onClick={() => navigate(c.to)}
                  className={
                    i === 0
                      ? "bg-white text-primary hover:bg-white/90 font-bold"
                      : "bg-white/15 hover:bg-white/25 text-white border border-white/30 backdrop-blur"
                  }
                >
                  <Icon className="h-4 w-4 mr-1.5" /> {c.label}
                </Button>
              );
            })}
          </div>

          {cfg.metrics && (
            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/15 text-[10px] opacity-80">
              {cfg.metrics.map(m => {
                const Icon = m.icon;
                return (
                  <span key={m.label} className="flex items-center gap-1">
                    <Icon className="h-3 w-3" /> {m.label}
                  </span>
                );
              })}
              <span className="ml-auto flex items-center gap-1 font-bold">
                Abrir <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}