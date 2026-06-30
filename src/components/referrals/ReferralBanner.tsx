import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Gift, Share2, Copy, Loader2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

/**
 * ReferralBanner — Reforça a recomendação 5.2 do relatório estratégico:
 *   "Marketing de Influência ... Micro-influenciadores com nichos específicos
 *    e alta taxa de engajamento para alcançar comunidades mais segmentadas."
 *
 * Aqui o banner destaca:
 *   - código personalizado com city prefix
 *   - copy adaptado a "partilha com amigos" em português de Moçambique
 *   - opção de partilhar via WhatsApp (canal dominante em MZ)
 */

const MOZ_CITIES = ['Maputo', 'Matola', 'Beira', 'Nampula', 'Quelimane', 'Tete', 'Xai-Xai', 'Lichinga'];

export function ReferralBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-referral", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("referral_code, default_city")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const code = profile?.referral_code || (user ? `MOZ${user.id.replace(/-/g, "").slice(0, 6).toUpperCase()}` : "");
  const city = profile?.default_city || "Maputo";
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/auth?ref=${code}`;

  const shareWhatsApp = () => {
    const text = `Estou a usar a MedWallet para falar com médicos e receber medicamentos em ${city} 🇲🇿. Usa o meu código ${code} e ambos ganhamos bónus: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const copy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(link);
      toast.success("Link copiado!");
    }
  };

  if (!user) return null;
  if (isLoading) {
    return (
      <div className="px-4 mt-6">
        <Card className="p-4 h-28 animate-pulse bg-muted/50" />
      </div>
    );
  }

  return (
    <section className="px-4 mt-6">
      <Card className="overflow-hidden border-none bg-gradient-to-br from-gold/20 via-gold/5 to-secondary/10 p-4 relative">
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-gold/15 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gold">
            <Heart className="h-3 w-3 fill-gold" /> Programa de Indicação
          </div>
          <h3 className="text-lg font-black leading-tight mt-1">
            Convida e ganha em {city}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
            Cada amigo que se inscrever com o teu código recebe bónus de boas-vindas — e tu também.
          </p>

          <div className="flex items-center gap-2 mt-3 bg-background/70 rounded-xl p-2 backdrop-blur">
            <div className="flex-1 px-2">
              <p className="text-[9px] uppercase text-muted-foreground">Teu código</p>
              <p className="font-mono font-black text-base text-primary">{code}</p>
            </div>
            <Button size="sm" variant="outline" onClick={copy} aria-label="Copiar link">
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex gap-2 mt-3">
            <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={shareWhatsApp}>
              <Share2 className="h-3.5 w-3.5 mr-1" /> WhatsApp
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate("/referrals")}>
              <Gift className="h-3.5 w-3.5 mr-1" /> Ver programa
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}