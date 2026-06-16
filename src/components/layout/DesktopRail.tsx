import { Wallet, MessageCircle, Gift, Sparkles, Calendar, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";

export function DesktopRail() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallet } = useWallet();

  if (!user) {
    return (
      <aside className="hidden lg:flex sticky top-20 self-start w-[320px] flex-col gap-3">
        <div className="bento-card p-5 gradient-ocean text-white">
          <Sparkles className="h-5 w-5 mb-2" />
          <h3 className="font-black text-lg leading-tight">Entra na MoçambiApp</h3>
          <p className="text-xs opacity-85 mt-1.5">
            Carteira MZN, médicos verificados e farmácia 24h num só sítio.
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
          {(wallet?.balance_mzn ?? 0).toLocaleString("pt-MZ")}
          <span className="text-sm font-semibold ml-1.5 opacity-80">MZN</span>
        </p>
        <p className="text-[11px] opacity-70 mt-2">↘ Desconto auto em todas as compras</p>
      </button>

      <div className="bento-card p-4">
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
          Acesso rápido
        </p>
        <div className="flex flex-col">
          {[
            { icon: Calendar, label: "Minhas consultas", to: "/health/consultations" },
            { icon: MessageCircle, label: "Triagem IA", to: "/health/triage" },
            { icon: Gift, label: "Convidar amigos", to: "/referrals" },
          ].map((it) => (
            <button
              key={it.label}
              onClick={() => navigate(it.to)}
              className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/60 transition-colors text-left"
            >
              <div className="h-8 w-8 rounded-lg bg-secondary/15 flex items-center justify-center">
                <it.icon className="h-4 w-4 text-secondary" />
              </div>
              <span className="text-sm font-medium flex-1">{it.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      <div className="bento-card p-4 bg-gradient-to-br from-gold/15 to-transparent border-gold/30">
        <Gift className="h-5 w-5 text-gold mb-2" />
        <p className="text-sm font-bold leading-tight">Convida amigos</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Ganha MZN e Joy Coins por cada amigo que entra.
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
    </aside>
  );
}