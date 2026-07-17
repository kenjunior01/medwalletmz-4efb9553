import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Calendar, MessageCircle, DollarSign, Users, Stethoscope, CalendarClock } from 'lucide-react';
import NumberFlow from '@number-flow/react';
import {
  PanelShell, NeuCard, BentoCard, BentoGrid, GlassCard,
  LayeredOrbs, StatusBadge, SkipLink,
} from '@/components/ui/design-system';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [today, setToday] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [stats, setStats] = useState({ patients: 0, monthRevenue: 0 });
  const [hasSub, setHasSub] = useState<boolean | null>(null);

  const load = async () => {
    if (!user) return;
    const { data: p } = await supabase.from('doctor_profiles').select('*').eq('user_id', user.id).maybeSingle();
    setProfile(p);

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
  };

  useEffect(() => { load(); }, [user]);

  const toggleAvailable = async (v: boolean) => {
    if (!user) return;
    await supabase.from('doctor_profiles').update({ is_available: v }).eq('user_id', user.id);
    setProfile({ ...profile, is_available: v });
  };

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
    <div className="min-h-screen bg-background pb-24">
      <SkipLink />
      <main id="main" className="p-4 space-y-5">
        {/* Hero panel */}
        <PanelShell className="p-6">
          <LayeredOrbs variant="ocean" />
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Bem-vindo(a)</p>
              <h1 className="text-2xl font-black text-gradient-premium">Dr(a). Consulta</h1>
            </div>
            {!profile.is_verified && <StatusBadge status="pending">A verificar</StatusBadge>}
          </div>
          <NeuCard className="!p-3 flex items-center justify-between">
            <label htmlFor="avail" className="text-sm font-semibold">Disponível para consultas</label>
            <Switch id="avail" checked={profile.is_available} onCheckedChange={toggleAvailable} />
          </NeuCard>
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

        <section aria-labelledby="today-h">
          <h2 id="today-h" className="font-bold text-base mb-2">Hoje</h2>
          {today.length === 0 && <p className="text-sm text-muted-foreground">Sem consultas hoje.</p>}
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
                  <p className="text-lg font-black text-secondary tabular-nums">{new Date(c.scheduled_at).getHours()}h</p>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Consulta {c.consultation_type}</p>
                  <p className="text-xs text-muted-foreground">{c.reason || 'Sem motivo descrito'}</p>
                </div>
                <MessageCircle className="h-4 w-4 text-secondary" aria-hidden="true" />
            </GlassCard>
          ))}
        </section>

        <section aria-labelledby="up-h">
          <h2 id="up-h" className="font-bold text-base mb-2">Próximas</h2>
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Sem consultas agendadas.</p>}
          {upcoming.map(c => (
            <NeuCard
              key={c.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/health/consultation/${c.id}`); }}
              onClick={() => navigate(`/health/consultation/${c.id}`)}
              className="mb-2 !p-3 cursor-pointer"
            >
              <p className="text-sm font-semibold">{new Date(c.scheduled_at).toLocaleString('pt-PT', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              <p className="text-xs text-muted-foreground">{c.reason || 'Consulta agendada'}</p>
            </NeuCard>
          ))}
        </section>

        <div className="grid gap-2">
          <Button variant="outline" className="w-full h-12 border-secondary/40 hover:bg-secondary/10" onClick={() => navigate('/doctor/availability')}>
            <CalendarClock className="h-4 w-4 mr-2" aria-hidden="true" /> Gerir horários disponíveis
          </Button>
          <Button variant="outline" className="w-full h-12" onClick={() => navigate('/doctor/patients')}>Ver pacientes</Button>
        </div>
      </main>
    </div>
  );
}