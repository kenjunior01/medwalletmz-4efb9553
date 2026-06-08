import { Stethoscope, CalendarCheck, Sparkles, FileText, FolderHeart, Pill, MessageCircle, ArrowRight, Crown, Gift, Bell } from "lucide-react";
import { HealthCard } from "@/components/home/HealthCard";
import { EnableNotificationsBanner } from "@/components/notifications/EnableNotificationsBanner";
import { FollowUpReminders } from "@/components/health/FollowUpReminders";
import { JoyRewardsCard } from "@/components/gamification/JoyRewardsCard";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: upcoming } = useQuery({
    queryKey: ['upcoming-consultations', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('consultations')
        .select('id, scheduled_at, status, doctor_id')
        .eq('patient_id', user!.id)
        .in('status', ['scheduled', 'confirmed', 'in_progress'])
        .order('scheduled_at', { ascending: true })
        .limit(3);
      return data || [];
    },
  });

  const { data: activeRx } = useQuery({
    queryKey: ['active-rx', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from('prescriptions')
        .select('id', { count: 'exact', head: true })
        .eq('patient_id', user!.id)
        .eq('status', 'active');
      return count || 0;
    },
  });

  return (
    <div className="flex flex-col gap-5 pb-4 animate-fade-in">
      {/* Hero saúde */}
      <section className="px-4 pt-3">
        <div className="rounded-3xl bg-gradient-to-br from-pharmacy via-pharmacy/90 to-primary p-5 text-pharmacy-foreground shadow-premium">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-90">
            <Sparkles className="h-3.5 w-3.5" /> Hub de Saúde
          </div>
          <h1 className="text-2xl font-extrabold leading-tight mt-1">Como te sentes hoje?</h1>
          <p className="text-sm opacity-90 mt-1">Fala com um médico, faz triagem com IA ou pede medicamentos.</p>
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="secondary" className="flex-1" onClick={() => navigate('/health/triage')}>
              <Sparkles className="h-4 w-4 mr-1" /> Triagem IA
            </Button>
            <Button size="sm" className="flex-1 bg-white text-pharmacy hover:bg-white/90" onClick={() => navigate('/health/doctors')}>
              <Stethoscope className="h-4 w-4 mr-1" /> Marcar
            </Button>
          </div>
        </div>
      </section>

      <EnableNotificationsBanner />

      {/* Próximas consultas */}
      {upcoming && upcoming.length > 0 && (
        <section className="px-4">
          <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-primary" /> Próximas consultas
          </h2>
          <div className="space-y-2">
            {upcoming.map((c) => (
              <Card
                key={c.id}
                onClick={() => navigate(`/health/consultation/${c.id}`)}
                className="p-3 cursor-pointer hover:shadow-md transition flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">Consulta agendada</p>
                  <p className="text-xs text-muted-foreground">
                    {c.scheduled_at ? new Date(c.scheduled_at).toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'A confirmar'}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Lembretes pós-consulta */}
      <FollowUpReminders />

      {/* Acesso saúde */}
      <HealthCard />

      {/* Resumo rápido */}
      <section className="px-4 grid grid-cols-3 gap-2">
        <button onClick={() => navigate('/health/prescriptions')} className="rounded-xl border bg-card p-3 text-left active:scale-95 transition">
          <FileText className="h-4 w-4 text-pharmacy mb-1" />
          <p className="text-lg font-bold">{activeRx ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">Receitas ativas</p>
        </button>
        <button onClick={() => navigate('/health/consultations')} className="rounded-xl border bg-card p-3 text-left active:scale-95 transition">
          <MessageCircle className="h-4 w-4 text-primary mb-1" />
          <p className="text-lg font-bold">{upcoming?.length ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">Consultas</p>
        </button>
        <button onClick={() => navigate('/health/records')} className="rounded-xl border bg-card p-3 text-left active:scale-95 transition">
          <FolderHeart className="h-4 w-4 text-secondary mb-1" />
          <p className="text-lg font-bold">Exames</p>
          <p className="text-[10px] text-muted-foreground">Histórico</p>
        </button>
      </section>

      {/* Farmácia */}
      <section className="px-4">
        <Card onClick={() => navigate('/pharmacy')} className="p-4 cursor-pointer bg-gradient-to-r from-pharmacy/10 to-transparent border-pharmacy/30 flex items-center gap-3 active:scale-[0.98] transition">
          <div className="h-12 w-12 rounded-xl bg-pharmacy flex items-center justify-center">
            <Pill className="h-6 w-6 text-pharmacy-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-bold">Farmácias 24h</p>
            <p className="text-xs text-muted-foreground">Entrega rápida com prioridade para receitas</p>
          </div>
          <ArrowRight className="h-5 w-5 text-pharmacy" />
        </Card>
      </section>

      {/* Joy + referrals */}
      <div className="px-4">
        <JoyRewardsCard />
      </div>

      <section className="px-4">
        <Card onClick={() => navigate('/referrals')} className="p-4 cursor-pointer flex items-center gap-3 bg-gold/5 border-gold/30 active:scale-[0.98] transition">
          <Gift className="h-6 w-6 text-gold" />
          <div className="flex-1">
            <p className="font-bold text-sm">Convida amigos</p>
            <p className="text-xs text-muted-foreground">Ganha Joy Coins e desconto em farmácia</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gold" />
        </Card>
      </section>
    </div>
  );
}
