import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar, MessageCircle, DollarSign, Users, Stethoscope, CalendarClock,
  FileText, Wallet, ChevronRight, Clock,
} from "@/components/icons/lucide-compat";
import NumberFlow from '@number-flow/react';
import {
  PanelShell, NeuCard, BentoCard, BentoGrid, GlassCard,
  LayeredOrbs, StatusBadge, SkipLink,
} from '@/components/ui/design-system';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [stats, setStats] = useState({ patients: 0, monthRevenue: 0 });
  const [hasSub, setHasSub] = useState<boolean | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: p } = await supabase.from('doctor_profiles').select('*').eq('user_id', user.id).maybeSingle();
    setProfile(p);

    const { data: me } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle();
    setDisplayName((me as any)?.full_name || '');

    const startToday = new Date(); startToday.setHours(0,0,0,0);
    const endToday = new Date(); endToday.setHours(23,59,59,999);
    const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0,0,0,0);

    const { data: tdy } = await supabase.from('consultations').select('*')
      .eq('doctor_id', user.id)
      .gte('scheduled_at', startToday.toISOString())
      .lte('scheduled_at', endToday.toISOString())
      .order('scheduled_at');
    setToday(tdy || []);

    const { data: up } = await supabase.from('consultations').select('*')
      .eq('doctor_id', user.id)
      .gt('scheduled_at', endToday.toISOString())
      .order('scheduled_at')
      .limit(5);
    setUpcoming(up || []);

    const { data: month } = await supabase.from('consultations').select('fee, patient_id')
      .eq('doctor_id', user.id)
      .eq('status', 'completed')
      .gte('scheduled_at', startMonth.toISOString());
    const monthRevenue = (month || []).reduce((s, c: any) => s + (c.fee || 0), 0);
    const patients = new Set((month || []).map((c: any) => c.patient_id)).size;
    setStats({ patients, monthRevenue });

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, plan:subscription_plans(target_audience)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    setHasSub(!!sub && (sub as any).plan?.target_audience === 'doctor');
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const toggleAvailable = async (v: boolean) => {
    if (!user) return;
    await supabase.from('doctor_profiles').update({ is_available: v }).eq('user_id', user.id);
    setProfile({ ...profile, is_available: v });
  };

  const nextConsult = useMemo(() => {
    const now = Date.now();
    return today.find((c) => new Date(c.scheduled_at).getTime() >= now) ?? upcoming[0] ?? null;
  }, [today, upcoming]);

  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-5">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center text-center gap-4">
        <Stethoscope className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">Ainda não és médico no MedWallet</h2>
        <Button onClick={() => navigate('/doctor/register')}>Registar como médico</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SkipLink />
      <main id="main" className="p-4 space-y-5 max-w-5xl mx-auto w-full pb-24">
        {/* Hero panel */}
        <PanelShell className="p-6">
          <LayeredOrbs variant="ocean" />
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Bem-vindo(a)</p>
              <h1 className="text-2xl font-black text-gradient-premium truncate">
                Dr(a). {displayName || 'Profissional'}
              </h1>
              {profile.specialty && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{profile.specialty}</p>
              )}
            </div>
            {profile.is_verified
              ? <StatusBadge status="success">Verificado</StatusBadge>
              : <StatusBadge status="pending">A verificar</StatusBadge>}
          </div>
          <NeuCard className="!p-3 flex items-center justify-between">
            <label htmlFor="avail" className="text-sm font-semibold flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${profile.is_available ? 'bg-secondary animate-pulse' : 'bg-muted-foreground/40'}`} />
              {profile.is_available ? 'Disponível para consultas' : 'Indisponível'}
            </label>
            <Switch id="avail" checked={profile.is_available} onCheckedChange={toggleAvailable} />
          </NeuCard>

          {nextConsult && (
            <button
              onClick={() => navigate(`/health/consultation/${nextConsult.id}`)}
              className="mt-3 w-full text-left rounded-2xl border border-secondary/30 bg-secondary/5 p-3 flex items-center gap-3 hover:bg-secondary/10 transition"
            >
              <div className="h-10 w-10 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-secondary" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Próxima consulta</p>
                <p className="text-sm font-semibold truncate">
                  {new Date(nextConsult.scheduled_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })} · {fmtTime(nextConsult.scheduled_at)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </button>
          )}
        </PanelShell>

        {hasSub === false && (
          <button
            onClick={() => navigate('/subscribe')}
            className="w-full text-left p-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-secondary/10 hover:shadow-md transition"
          >
            <p className="text-sm font-semibold">Ative a sua subscrição profissional</p>
            <p className="text-xs text-muted-foreground mt-1">
              Desbloqueie consultas ilimitadas, marca destacada e prioridade nas recomendações. Pague por M-Pesa, e-Mola ou Mkesh.
            </p>
          </button>
        )}

        {/* KPI bento grid with animated numbers */}
        <BentoGrid className="grid-cols-3 md:grid-cols-3">
          <BentoCard size="sm" className="!col-span-1 text-center">
            <Calendar className="h-5 w-5 mx-auto text-secondary mb-1" aria-hidden="true" />
            <p className="text-2xl font-black num-pulse tabular-nums"><NumberFlow value={today.length} /></p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Hoje</p>
          </BentoCard>
          <BentoCard size="sm" className="!col-span-1 text-center">
            <Users className="h-5 w-5 mx-auto text-pharmacy mb-1" aria-hidden="true" />
            <p className="text-2xl font-black tabular-nums"><NumberFlow value={stats.patients} /></p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pacientes</p>
          </BentoCard>
          <BentoCard size="sm" className="!col-span-1 text-center">
            <DollarSign className="h-5 w-5 mx-auto text-gold mb-1" aria-hidden="true" />
            <p className="text-2xl font-black tabular-nums text-gold"><NumberFlow value={stats.monthRevenue} /></p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">MZN/mês</p>
          </BentoCard>
        </BentoGrid>

        {/* Ações rápidas */}
        <section aria-labelledby="qa-h">
          <h2 id="qa-h" className="sr-only">Ações rápidas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: FileText, label: 'Nova receita', to: '/doctor/prescription/new' },
              { icon: CalendarClock, label: 'Horários', to: '/doctor/availability' },
              { icon: Users, label: 'Pacientes', to: '/doctor/patients' },
              { icon: Wallet, label: 'Carteira', to: '/wallet' },
            ].map(({ icon: Icon, label, to }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-card hover:bg-muted/50 hover:shadow-md transition-all"
              >
                <span className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold text-center">{label}</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="today-h">
          <div className="flex items-center justify-between mb-2">
            <h2 id="today-h" className="font-bold text-base">Hoje</h2>
            {today.length > 0 && (
              <span className="text-xs text-muted-foreground font-semibold">{today.length} consulta(s)</span>
            )}
          </div>
          {today.length === 0 && (
            <NeuCard className="!p-6 text-center">
              <Calendar className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Sem consultas hoje.</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => navigate('/doctor/availability')}>
                Abrir novos horários
              </Button>
            </NeuCard>
          )}
          {today.map(c => (
            <GlassCard
              key={c.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/health/consultation/${c.id}`); }}
              onClick={() => navigate(`/health/consultation/${c.id}`)}
              className="mb-2 !p-3 flex items-center gap-3 cursor-pointer hover:border-secondary/40 transition-all"
            >
                <div className="text-center min-w-[44px]">
                  <p className="text-lg font-black text-secondary tabular-nums leading-none">{fmtTime(c.scheduled_at)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">Consulta {c.consultation_type}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.reason || 'Sem motivo descrito'}</p>
                </div>
                <MessageCircle className="h-4 w-4 text-secondary" aria-hidden="true" />
            </GlassCard>
          ))}
        </section>

        <section aria-labelledby="up-h">
          <h2 id="up-h" className="font-bold text-base mb-2">Próximas</h2>
          {upcoming.length === 0 && (
            <NeuCard className="!p-6 text-center">
              <CalendarClock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Sem consultas agendadas.</p>
            </NeuCard>
          )}
          {upcoming.map(c => (
            <NeuCard
              key={c.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/health/consultation/${c.id}`); }}
              onClick={() => navigate(`/health/consultation/${c.id}`)}
              className="mb-2 !p-3 cursor-pointer flex items-center gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{new Date(c.scheduled_at).toLocaleString('pt-PT', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                <p className="text-xs text-muted-foreground truncate">{c.reason || 'Consulta agendada'}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            </NeuCard>
          ))}
        </section>
      </main>
    </div>
  );
}