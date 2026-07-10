import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import { Gift, Share2, Copy, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export function ReferralBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { country, t } = useCountry();

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

  const code = profile?.referral_code || (user ? `${country?.id || 'MED'}${user.id.replace(/-/g, "").slice(0, 6).toUpperCase()}` : "");
  const city = profile?.default_city || "Maputo";
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/auth?ref=${code}`;

  const shareWhatsApp = () => {
    const text = t('referrals.whatsapp_text', { city, code, link });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const copy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(link);
      toast.success(t('referrals.copied'));
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
      <Card className="overflow-hidden border-none bg-gradient-to-br from-gold/20 via-gold/5 to-secondary/10 p-5 relative shadow-premium rounded-[2rem]">
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-gold/15 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gold">
            <Heart className="h-3 w-3 fill-gold" /> {t('referrals.program_title')}
          </div>
          <h3 className="text-xl font-black leading-tight mt-1">
            {t('referrals.invite_and_earn', { city })}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-[260px] font-medium">
            {t('referrals.description')}
          </p>

          <div className="flex items-center gap-2 mt-4 bg-background/80 rounded-2xl p-2.5 backdrop-blur border border-white/20 shadow-sm">
            <div className="flex-1 px-2">
              <p className="text-[9px] uppercase font-bold text-muted-foreground">{t('referrals.your_code')}</p>
              <p className="font-mono font-black text-lg text-primary tracking-wider">{code}</p>
            </div>
            <Button size="sm" variant="ghost" className="h-10 w-10 rounded-xl bg-primary/5 hover:bg-primary/10" onClick={copy} aria-label="Copiar link">
              <Copy className="h-4 w-4 text-primary" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl shadow-lg shadow-emerald-600/20" onClick={shareWhatsApp}>
              <Share2 className="h-4 w-4 mr-2" /> WhatsApp
            </Button>
            <Button size="sm" variant="ghost" className="w-full text-xs font-bold text-muted-foreground mt-2" onClick={() => navigate("/referrals")}>
              <Gift className="h-4 w-4 mr-2" /> {t('referrals.details')}
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}
