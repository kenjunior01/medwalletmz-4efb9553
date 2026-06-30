import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, ArrowRight, Stethoscope, Pill, FileText, BookOpen, Video, Activity, ChevronRight } from "lucide-react";
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
  | { kind: "triage"; title: string; subtitle: string; icon: any; }
  | { kind: "checkup"; title: string; subtitle: string; icon: any; };

export function PersonalizedForYou() {
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
          title: `Consulta de retorno · ${spec ?? "Clínico"}`,
          subtitle: `Faz ${daysAgo} dias desde a última consulta.`,
          icon: Stethoscope,
        };
      }
      return {
        kind: "doctor",
        doctorId: last.doctor_id,
        title: `Continua com Dr(a). da última consulta`,
        subtitle: spec ? `Especialidade: ${spec}` : "Marca novo contacto",
        icon: Stethoscope,
      };
    }

    // 2) Última triagem com severidade moderada/alta — alerta
    const lastTriage = triageLogs?.[0];
    if (lastTriage && (lastTriage.severity === "alta" || lastTriage.severity === "moderada")) {
      return {
        kind: "triage",
        title: "Triagem recente — confirma com médico",
        subtitle: `Sugestão: ${lastTriage.suggested_specialty ?? "clínico geral"}`,
        icon: Activity,
      };
    }

    // 3) Sugerir artigo educacional sobre hipertensão (condição mais comum em MZ)
    const hypertensionArticle = articles?.find((a: any) => a.slug === "hipertensao-controlo");
    if (hypertensionArticle) {
      return {
        kind: "article",
        slug: hypertensionArticle.slug,
        title: "Como controlar a pressão alta",
        subtitle: "5 min · recomendado para adultos",
        icon: BookOpen,
      };
    }

    // 4) Fallback — check-up geral
    return {
      kind: "checkup",
      title: "Check-up geral",
      subtitle: "Marca uma consulta de rotina",
      icon: Video,
    };
  }, [user, consultations, triageLogs, articles]);

  if (!user || !hint) return null;

  const Icon = hint.icon;

  const onClick = () => {
    if (hint.kind === "doctor") navigate(`/health/book/${hint.doctorId}`);
    else if (hint.kind === "article") navigate(`/health/education/${hint.slug}`);
    else if (hint.kind === "triage") navigate("/health/triage");
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