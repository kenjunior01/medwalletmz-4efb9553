import { LucideIcon, Heart, Stethoscope, Pill, Truck, Building2, ShieldCheck, Sparkles } from "lucide-react";

export type PulseRoleKey =
  | "patient" | "doctor" | "store_owner" | "driver" | "clinic" | "admin";

export interface PulseIdentity {
  /** Nome curto do sistema para este role. Ex: "Pulse Saúde" */
  label: string;
  /** Unidade singular. Ex: "batimento", "consulta" */
  unit: string;
  /** Unidade plural. Ex: "batimentos" */
  unitPlural: string;
  /** Metáfora curta usada no hero. */
  tagline: string;
  /** Ícone principal. */
  icon: LucideIcon;
  /** Cor semântica (usa tokens do design system). */
  accent: "primary" | "secondary" | "pharmacy" | "gold" | "emerald" | "destructive";
}

const MAP: Record<PulseRoleKey, PulseIdentity> = {
  patient:     { label: "Pulse Saúde",     unit: "batimento",  unitPlural: "batimentos",  tagline: "O ritmo da tua saúde",           icon: Heart,       accent: "primary" },
  doctor:      { label: "Pulse Clínico",   unit: "consulta",   unitPlural: "consultas",   tagline: "A tua prática em números",        icon: Stethoscope, accent: "pharmacy" },
  store_owner: { label: "Pulse Vendas",    unit: "pedido",     unitPlural: "pedidos",     tagline: "Cada entrega, um passo à frente", icon: Pill,        accent: "emerald" },
  driver:      { label: "Pulse Entregas",  unit: "corrida",    unitPlural: "corridas",    tagline: "Cada KM conta",                   icon: Truck,       accent: "secondary" },
  clinic:      { label: "Pulse Clínica",   unit: "atendimento",unitPlural: "atendimentos",tagline: "A pulsação da tua clínica",       icon: Building2,   accent: "primary" },
  admin:       { label: "Pulse Plataforma",unit: "métrica",    unitPlural: "métricas",    tagline: "O batimento do MedWallet",        icon: ShieldCheck, accent: "gold" },
};

const FALLBACK: PulseIdentity = {
  label: "Pulse", unit: "ponto", unitPlural: "pontos",
  tagline: "O teu progresso, adaptado a ti",
  icon: Sparkles, accent: "primary",
};

/**
 * Devolve a identidade Pulse adequada ao role.
 * Prioridade: admin > doctor > clinic > store_owner > driver > patient.
 */
export function resolvePulseIdentity(roles: string[] | undefined | null): PulseIdentity {
  if (!roles || roles.length === 0) return MAP.patient;
  const priority: PulseRoleKey[] = ["admin", "doctor", "clinic", "store_owner", "driver", "patient"];
  for (const key of priority) {
    if (roles.includes(key === "patient" ? "customer" : key)) return MAP[key];
  }
  return FALLBACK;
}