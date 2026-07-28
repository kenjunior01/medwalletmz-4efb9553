import {
  Wallet, MessageCircle, Gift, Sparkles, Calendar, ChevronRight,
  Heart, Mic, MapPin, Camera, Users, Bike, Trophy, Briefcase,
  Package, TrendingUp, Stethoscope, Home, Megaphone, UserCircle,
} from '@/components/icons/lucide-compat';
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { useUserType } from "@/hooks/useUserType";
import { Button } from "@/components/ui/button";
import { useCountry } from "@/contexts/CountryContext";

interface QuickItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  to: string;
  badge?: string;
}

const PATIENT_ITEMS: QuickItem[] = [
  { icon: Calendar, label: "Minhas consultas", to: "/health/consultations" },
  { icon: MessageCircle, label: "Meddy Consulta", to: "/health/triage" },
  { icon: Heart, label: "Família", to: "/health/family" },
  { icon: Mic, label: "Diário de Voz", to: "/health/voice-journal" },
  { icon: Camera, label: "Scanner IA", to: "/health/scanner" },
  { icon: MapPin, label: "Mapas de Saúde", to: "/health/maps" },
  { icon: Users, label: "Círculos de Apoio", to: "/health/circles" },
  { icon: Briefcase, label: "Profissionais", to: "/health/workers" },
  { icon: Gift, label: "Convidar amigos", to: "/referrals" },
];

const RIDER_ITEMS: QuickItem[] = [
  { icon: Bike, label: "Painel de Entregas", to: "/health/riders" },
  { icon: Package, label: "Entregas Disponíveis", to: "/health/riders" },
  { icon: TrendingUp, label: "Ganhos", to: "/health/riders" },
  { icon: MapPin, label: "Mapas de Saúde", to: "/health/maps" },
  { icon: Wallet, label: "Carteira", to: "/wallet" },
];

const WORKER_ITEMS: QuickItem[] = [
  { icon: Stethoscope, label: "Meu Perfil Profissional", to: "/health/workers/profile" },
  { icon: Calendar, label: "Reservas Recebidas", to: "/health/workers/profile" },
  { icon: TrendingUp, label: "Ganhos", to: "/health/workers/profile" },
  { icon: Users, label: "Círculos de Apoio", to: "/health/circles" },
  { icon: Briefcase, label: "Marketplace", to: "/health/workers" },
  { icon: Wallet, label: "Carteira", to: "/wallet" },
];

const PROMOTER_ITEMS: QuickItem[] = [
  { icon: Megaphone, label: "Meu Link de Convite", to: "/referrals" },
  { icon: Users, label: "Círculos de Apoio", to: "/health/circles" },
  { icon: Gift, label: "Recompensas", to: "/rewards" },
  { icon: TrendingUp, label: "Minhas Conversões", to: "/referrals" },
  { icon: Wallet, label: "Carteira", to: "/wallet" },
  { icon: Camera, label: "Scanner IA", to: "/health/scanner" },
];

function getItemsFor(userType: string | undefined): { items: QuickItem[]; title: string; subtitle: string; iconColor: string } {
  switch (userType) {
    case 'rider':
      return {
        items: RIDER_ITEMS,
        title: "Painel Rider",
        subtitle: "Gestão de entregas e ganhos",
        iconColor: "text-emerald-600",
      };
    case 'health_worker':
      return {
        items: WORKER_ITEMS,
        title: "Painel Profissional",
        subtitle: "Reservas, perfil e ganhos",
        iconColor: "text-purple-600",
      };
    case 'promoter':
      return {
        items: PROMOTER_ITEMS,
        title: "Painel Promotor",
        subtitle: "Convida e ganha",
        iconColor: "text-amber-600",
      };
    default:
      return {
        items: PATIENT_ITEMS,
        title: "Acesso rápido",
        subtitle: "",
        iconColor: "text-secondary",
      };
  }
}

const TYPE_BADGE: Record<string, { label: string; emoji: string; bg: string }> = {
  patient: { label: 'Paciente', emoji: '🧑', bg: 'bg-blue-100 text-blue-700' },
  rider: { label: 'Health Rider', emoji: '🛵', bg: 'bg-emerald-100 text-emerald-700' },
  health_worker: { label: 'Profissional de Saúde', emoji: '🩺', bg: 'bg-purple-100 text-purple-700' },
  promoter: { label: 'Promotor', emoji: '📢', bg: 'bg-amber-100 text-amber-700' },
};

export function DesktopRail() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallet } = useWallet();
  const { userType } = useUserType();
  const { country } = useCountry();
  const currencyCode = wallet?.currency || country?.currency_code || 'MZN';
  const locale = country?.default_locale || 'pt-MZ';

  if (!user) {
    return (
      <aside className="hidden lg:flex sticky top-20 self-start w-[320px] flex-col gap-3">
        <div className="bento-card p-5 gradient-ocean text-white">
          <Sparkles className="h-5 w-5 mb-2" />
          <h3 className="font-black text-lg leading-tight">Entra na MedWallet</h3>
          <p className="text-xs opacity-85 mt-1.5">
            Carteira local, médicos verificados e farmácia 24h num só sítio.
          </p>
          <Button
            size="sm"
            className="mt-4 w-full bg-white text-primary hover:bg-white/90 font-bold"
            onClick={() => navigate("/auth")}
          >
            Começar
          </Button>
        </div>
      </aside>
    );
  }

  const { items, title, subtitle, iconColor } = getItemsFor(userType);
  const badge = TYPE_BADGE[userType] ?? TYPE_BADGE.patient;

  return (
    <aside className="hidden lg:flex sticky top-20 self-start w-[320px] flex-col gap-3">
      <button
        onClick={() => navigate("/wallet")}
        className="bento-card p-5 text-left bg-gradient-to-br from-primary to-secondary text-primary-foreground"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">Carteira</span>
          <Wallet className="h-4 w-4 opacity-90" />
        </div>
        <p className="text-3xl font-black mt-2 leading-none">
          {(wallet?.balance ?? 0).toLocaleString(locale)}
          <span className="text-sm font-semibold ml-1.5 opacity-80">{currencyCode}</span>
        </p>
        <p className="text-[11px] opacity-70 mt-2">↘ Desconto auto em todas as compras</p>
      </button>

      {/* Type badge */}
      <div className="bento-card p-3 flex items-center gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${badge.bg}`}>
          <span className="text-base" aria-hidden>{badge.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
            {t_label(userType)}
          </p>
          <p className="text-xs font-semibold truncate">{badge.label}</p>
        </div>
        <button
          onClick={() => navigate('/profile')}
          aria-label="Alterar tipo de utilizador"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-muted/60 hover:text-slate-700"
        >
          <UserCircle className="h-4 w-4" />
        </button>
      </div>

      <div className="bento-card p-4">
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
          {title}
        </p>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground/80 mb-2">{subtitle}</p>
        )}
        <div className="flex flex-col">
          {items.map((it) => (
            <button
              key={it.label}
              onClick={() => navigate(it.to)}
              className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/60 transition-colors text-left"
            >
              <div className="h-8 w-8 rounded-lg bg-secondary/15 flex items-center justify-center">
                <it.icon className={`h-4 w-4 ${iconColor}`} />
              </div>
              <span className="text-sm font-medium flex-1">{it.label}</span>
              {it.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {it.badge}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Referral card only for non-riders/workers (who already have a focus) */}
      {userType !== 'rider' && userType !== 'health_worker' && (
        <div className="bento-card p-4 bg-gradient-to-br from-gold/15 to-transparent border-gold/30">
          <Gift className="h-5 w-5 text-gold mb-2" />
          <p className="text-sm font-bold leading-tight">Convida amigos</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Ganha saldo local e Pulse por cada amigo que entra.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 w-full border-gold/40 text-gold hover:bg-gold/10"
            onClick={() => navigate("/referrals")}
          >
            Ver meu link
          </Button>
        </div>
      )}
    </aside>
  );
}

function t_label(userType: string | undefined): string {
  switch (userType) {
    case 'rider': return 'Modo Rider';
    case 'health_worker': return 'Modo Profissional';
    case 'promoter': return 'Modo Promotor';
    default: return 'Modo Paciente';
  }
}
