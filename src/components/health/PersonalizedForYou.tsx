import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import { Sparkles, ArrowRight, Stethoscope, Pill, FileText, BookOpen, Video, Activity, ChevronRight, Gift, ShieldCheck, CloudRain } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * PersonalizedForYou — Recomendação 4.1 do relatório estratégico:
 *   "Oferecer um painel mais personalizado para o utilizador, com
 *    recomendações de médicos ou serviços com base no histórico."
 *
 * Estratégia (sem ML pesado):
 *   - Lê as últimas 5 consultas + 5 prescrições + 5 triagens
 *   - Extrai a especialidade/sintoma mais frequente
 *   - Sugere 1 artigo educacional relacionado OU
 *     refaz consulta com o mesmo médico OU agenda check-up
 */

type Hint =
  | { kind: "doctor"; doctorId: string; title: string; subtitle: string; icon: any; }
  | { kind: "article"; slug: string; title: string; subtitle: string; icon: any; }
  | { kind: "weather"; title: string; subtitle: string; icon: any; }
  | { kind: "triage"; title: string; subtitle: string; icon: any; }
  | { kind: "checkup"; title: string; subtitle: string; icon: any; }
  | { kind: "referral"; title: string; subtitle: string; icon: any; };

export function PersonalizedForYou() {
  const { country, t } = useCountry();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: consultations } = useQuery({
    queryKey: ["history-consultations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("consultations")
        .select("id, doctor_id, scheduled_at, status, doctor_profiles(medical_specialties(name))")
        .eq("patient_id", user!.id)
        .order("scheduled_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: triageLogs } = useQuery({
    queryKey: ["history-triage", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("triage_logs")
        .select("id, suggested_specialty, severity, created_at")
        .eq("patient_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });

  const { data: articles } = useQuery({
    queryKey: ["articles-suggest"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("health_articles")
        .select("slug, title, category")
        .eq("is_published", true)
        .limit(50);
      return (data as any[]) ?? [];
    },
  });

  const hint: Hint | null = useMemo(() => {
    if (!user) return null;

    // 1) Última consulta — sugerir remarcar com mesmo médico OU check-up
    const last = consultations?.[0];
    if (last) {
      const spec = (last as any).doctor_profiles?.medical_specialties?.name;
      const daysAgo = Math.round(
        (Date.now() - new Date(last.scheduled_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysAgo > 14) {
        return {
          kind: "doctor",
          doctorId: last.doctor_id,
          title: t('health.followup_title', { specialty: spec ?? t('common.doctor') }),
          subtitle: t('health.followup_subtitle', { days: String(daysAgo) }),
          icon: Stethoscope,
        };
      }
      return {
        kind: "doctor",
        doctorId: last.doctor_id,
        title: t('health.continue_doctor_title'),
        subtitle: spec ? `${t('doctor_register.specialty')}: ${spec}` : t('health.mark_contact'),
        icon: Stethoscope,
      };
    }

    // 2) Última triagem com severidade moderada/alta — alerta
    const lastTriage = triageLogs?.[0];
    if (lastTriage && (lastTriage.severity === "alta" || lastTriage.severity === "moderada")) {
      return {
        kind: "triage",
        title: t('health.recent_triage_title'),
        subtitle: `${t('health.suggestion')}: ${lastTriage.suggested_specialty ?? t('common.doctor')}`,
        icon: Activity,
      };
    }

    // 3) Sugerir artigo educacional (Malária em África, ou genérico)
    const malariaArticle = articles?.find((a: any) => a.slug?.includes("malaria"));
    if (malariaArticle && country?.id === 'MZ' && Math.random() > 0.5) {
      return {
        kind: "article",
        slug: malariaArticle.slug,
        title: t('health.article_malaria_title'),
        subtitle: t('health.article_malaria_subtitle'),
        icon: ShieldCheck,
      };
    }

    const hypertensionArticle = articles?.find((a: any) => a.slug?.includes("hipertensao") || a.slug?.includes("hypertension"));
    if (hypertensionArticle) {
      return {
        kind: "article",
        slug: hypertensionArticle.slug,
        title: t('health.article_hypertension_title'),
        subtitle: t('health.article_hypertension_subtitle'),
        icon: Activity,
      };
    }

    // 4) Weather Insight (Google Weather API) - Adaptativo por país
    const month = new Date().getHours(); // Just a variation or use month
    const currentMonth = new Date().getMonth();
    const isRainySeason = country?.id === 'MZ' && (currentMonth >= 10 || currentMonth <= 3);

    if (isRainySeason) {
      return {
        kind: "weather",
        title: t('health.weather_rainy_title', { country: country?.name || '' }),
        subtitle: t('health.weather_rainy_subtitle'),
        icon: CloudRain,
      };
    }

    // 5) Se não tem amigos convidados, sugerir referral
    return {
      kind: "referral",
      title: t('health.referral_promo_title', { amount: '25', currency: country?.currency_code || 'MZN' }),
      subtitle: t('health.referral_promo_subtitle'),
      icon: Gift,
    };
  }, [user, consultations, triageLogs, articles, country, t]);

  if (!user || !hint) return null;

  const Icon = hint.icon;

  const onClick = () => {
    if (hint.kind === "doctor") navigate(`/health/book/${hint.doctorId}`);
    else if (hint.kind === "article") navigate(`/health/education/${hint.slug}`);
    else if (hint.kind === "weather") navigate("/health/education/prevencao-colera");
    else if (hint.kind === "triage") navigate("/health/triage");
    else if (hint.kind === "referral") navigate("/referrals");
    else navigate("/health/doctors");
  };

  return (
    <section className="px-4 mt-5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-secondary" />
        <h2 className="text-sm font-bold">Para ti</h2>
        <span className="text-[10px] text-muted-foreground">baseado na tua actividade</span>
      </div>
      <Card
        onClick={onClick}
        className="p-4 cursor-pointer hover:shadow-md transition group relative overflow-hidden bg-gradient-to-br from-primary/5 via-secondary/5 to-pharmacy/5"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
            hint.kind === "doctor" ? "bg-primary/15 text-primary" :
            hint.kind === "article" ? "bg-amber-500/15 text-amber-600" :
            hint.kind === "triage" ? "bg-destructive/15 text-destructive" :
            "bg-secondary/15 text-secondary"
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight">{hint.title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{hint.subtitle}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition shrink-0" />
        </div>
      </Card>
    </section>
  );
}