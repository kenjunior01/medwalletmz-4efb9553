import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2, UserPlus, Crown, ArrowLeft, LogOut, CalendarDays, Users,
  DollarSign, ShieldCheck, Clock, Trash2, Stethoscope, RefreshCw,
} from "@/components/icons/lucide-compat";
import { toast } from 'sonner';

type AnyRec = Record<string, any>;

export default function ClinicDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t, country } = useCountry();
  const qc = useQueryClient();
  const [doctorName, setDoctorName] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const locale = country?.default_locale || 'pt-MZ';
  const currency = country?.currency_symbol || country?.currency_code || 'MZN';
  const tc = (k: string, p?: Record<string, string>) => t(`panels.clinic.${k}`, p);

  // ------------------------------------------------ principal: clínica + assinatura
  const clinicQ = useQuery({
    queryKey: ['clinic-dashboard', user?.id],
    queryFn: async () => {
      const { data: c, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('owner_id', user!.id)
        .maybeSingle();
      if (error) throw error;

      let subActive = false;
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, plan:subscription_plans(target_audience)')
        .eq('user_id', user!.id)
        .eq('status', 'active');
      subActive = (sub ?? []).some((s: any) => s.plan?.target_audience === 'clinic');

      return { clinic: (c as AnyRec) || null, subActive };
    },
    enabled: !!user,
  });

  const clinic = clinicQ.data?.clinic;
  const clinicId = clinic?.id as string | undefined;

  // ------------------------------------------------ equipa médica
  const teamQ = useQuery({
    queryKey: ['clinic-team', clinicId],
    queryFn: async () => {
      const { data: cd, error } = await supabase
        .from('clinic_doctors')
        .select('*')
        .eq('clinic_id', clinicId!);
      if (error) throw error;
      const list = (cd as AnyRec[]) || [];
      if (!list.length) return [];
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', list.map((d) => d.doctor_id));
      return list.map((d) => ({
        ...d,
        doctor: profs?.find((p: AnyRec) => p.user_id === d.doctor_id) || null,
      }));
    },
    enabled: !!clinicId,
  });

  const team = useMemo(() => teamQ.data || [], [teamQ.data]);
  const doctorIds = useMemo(() => team.map((d) => d.doctor_id), [team]);

  // ------------------------------------------------ consultas (hoje + mês) e pacientes
  const agendaQ = useQuery({
    queryKey: ['clinic-agenda', clinicId, doctorIds.length],
    queryFn: async () => {
      if (!doctorIds.length) return { today: [], month: [] };

      const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
      const endToday = new Date(); endToday.setHours(23, 59, 59, 999);
      const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);

      const [tdy, mth] = await Promise.all([
        supabase.from('consultations').select('*')
          .in('doctor_id', doctorIds)
          .gte('scheduled_at', startToday.toISOString())
          .lte('scheduled_at', endToday.toISOString())
          .order('scheduled_at'),
        supabase.from('consultations').select('fee, patient_id, status')
          .in('doctor_id', doctorIds)
          .gte('scheduled_at', startMonth.toISOString())
          .limit(500),
      ]);
      if (tdy.error) throw tdy.error;

      const month = (mth.data as AnyRec[]) || [];
      const patientIds = [...new Set(month.map((c) => c.patient_id))].slice(0, 100);
      let names: Record<string, string> = {};
      if (patientIds.length) {
        const { data: pats } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', patientIds);
        names = Object.fromEntries((pats || []).map((p: AnyRec) => [p.user_id, p.full_name]));
      }
      const today = ((tdy.data as AnyRec[]) || []).map((c) => ({
        ...c, patientName: names[c.patient_id] || '',
      }));

      return { today, month };
    },
    enabled: !!clinicId && teamQ.isSuccess,
  });

  const today = agendaQ.data?.today || [];
  const month = agendaQ.data?.month || [];
  const monthPatients = new Set(month.map((c) => c.patient_id)).size;
  const monthRevenue = month
    .filter((c) => c.status === 'completed')
    .reduce((s, c) => s + (Number(c.fee) || 0), 0);

  const loading = clinicQ.isLoading || teamQ.isLoading;
  const loadError = clinicQ.error || teamQ.error;

  const refetchAll = () => {
    qc.invalidateQueries({ queryKey: ['clinic-dashboard'] });
    qc.invalidateQueries({ queryKey: ['clinic-team'] });
    qc.invalidateQueries({ queryKey: ['clinic-agenda'] });
  };

  // ------------------------------------------------ ações
  const addDoctor = async () => {
    if (!clinic || !doctorName.trim()) return;
    setAdding(true);
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .ilike('full_name', `%${doctorName.trim()}%`)
      .limit(1)
      .maybeSingle();
    if (!profile) {
      setAdding(false);
      return toast.error(tc('doctor_not_found'));
    }
    const { error } = await supabase.from('clinic_doctors').insert({
      clinic_id: clinic.id,
      doctor_id: profile.user_id,
    });
    setAdding(false);
    if (error) return toast.error(error.message);
    toast.success(`${profile.full_name} — ${tc('doctor_added')}`);
    setDoctorName('');
    qc.invalidateQueries({ queryKey: ['clinic-team', clinic.id] });
  };

  const removeDoctor = async (id: string) => {
    if (!confirm(tc('remove_confirm'))) return;
    setRemovingId(id);
    const { error } = await supabase.from('clinic_doctors').delete().eq('id', id);
    setRemovingId(null);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ['clinic-team'] });
  };

  const markCompleted = async (id: string) => {
    setCompletingId(id);
    const { error } = await (supabase as any).rpc('mark_consultation_completed', { _id: id });
    setCompletingId(null);
    if (error) return toast.error(error.message);
    toast.success(tc('status_completed'));
    qc.invalidateQueries({ queryKey: ['clinic-agenda'] });
  };

  const fmtMoney = (n: number) =>
    `${n.toLocaleString(locale, { maximumFractionDigits: 0 })} ${currency}`;

  // ------------------------------------------------ estados: erro / sem clínica / loading
  if (loadError && !clinicQ.data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <RefreshCw className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="mb-3 text-sm text-muted-foreground">{t('panels.common.error_load')}</p>
          <Button onClick={() => refetchAll()}>{t('panels.common.retry')}</Button>
        </div>
      </div>
    );
  }

  if (clinicQ.isSuccess && !clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold mb-2">{tc('no_profile')}</p>
          <Button onClick={() => navigate('/clinic/register')}>{tc('register_now')}</Button>
        </div>
      </div>
    );
  }

  if (loading || !clinic) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 pt-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-3 w-28" /></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  const kpis = [
    { icon: Stethoscope, value: String(team.length), label: tc('kpi_doctors'), color: 'text-primary' },
    { icon: CalendarDays, value: String(today.length), label: tc('kpi_today'), color: 'text-secondary' },
    { icon: Users, value: String(monthPatients), label: tc('kpi_patients'), color: 'text-pharmacy' },
    { icon: DollarSign, value: fmtMoney(monthRevenue), label: tc('kpi_revenue'), color: 'text-gold' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/80 px-4 py-3 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label={t('panels.common.close')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-1.5">{clinic.name}</h1>
            <p className="text-xs text-muted-foreground">{clinic.city}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {clinic.is_verified && (
            <Badge variant="default" className="gap-1">
              <ShieldCheck className="h-3 w-3" /> {tc('verified_short')}
            </Badge>
          )}
          <Button variant="ghost" size="icon" onClick={() => signOut().then(() => navigate('/'))} aria-label="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-5 max-w-3xl mx-auto pb-24">
        {/* Verificação pendente */}
        {!clinic.is_verified && (
          <Card className="p-4 bg-warning/10 border-warning/30 text-sm">
            <p className="font-semibold mb-0.5">{t('panels.common.pending')}</p>
            <p className="text-muted-foreground">
              A sua clínica está a aguardar verificação da equipa MedWallet. Enquanto isso, pode montar a equipa médica.
            </p>
          </Card>
        )}

        {/* Upsell Pro */}
        {!clinicQ.data?.subActive && (
          <Card className="p-4 bg-gradient-to-br from-gold/20 to-pharmacy/10 border-gold/30">
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8 text-gold shrink-0" />
              <div className="flex-1">
                <p className="font-bold">{tc('pro_title')}</p>
                <p className="text-xs text-muted-foreground">{tc('pro_desc')}</p>
              </div>
              <Button size="sm" onClick={() => navigate('/health/plans')}>{t('panels.common.view_all')}</Button>
            </div>
          </Card>
        )}

        {/* KPIs reais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <Card key={k.label} className="p-3">
              <k.icon className={`h-4 w-4 mb-1.5 ${k.color}`} aria-hidden="true" />
              <p className="text-xl font-black tabular-nums leading-none">{k.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">{k.label}</p>
            </Card>
          ))}
        </div>

        {/* Agenda de hoje — real */}
        <section aria-labelledby="agenda-h">
          <h2 id="agenda-h" className="font-bold text-base mb-2 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-secondary" /> {tc('agenda_today')}
          </h2>
          {agendaQ.isLoading ? (
            <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : today.length === 0 ? (
            <Card className="p-5 text-center">
              <p className="text-sm text-muted-foreground">{tc('no_consults_today')}</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {today.map((c) => (
                <Card key={c.id} className="p-3 flex items-center gap-3">
                  <div className="text-center min-w-[48px] bg-secondary/10 rounded-lg py-1.5">
                    <Clock className="h-3 w-3 mx-auto text-secondary mb-0.5" aria-hidden="true" />
                    <p className="text-sm font-black text-secondary tabular-nums leading-none">
                      {new Date(c.scheduled_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {c.patientName || t('panels.doctor.no_name')} · {c.consultation_type}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{c.reason || '—'}</p>
                  </div>
                  {c.status === 'completed' ? (
                    <Badge variant="default" className="text-[10px]">{tc('status_completed')}</Badge>
                  ) : c.status === 'cancelled' ? (
                    <Badge variant="outline" className="text-[10px] text-destructive">{tc('status_cancelled')}</Badge>
                  ) : (
                    <Button
                      size="sm" variant="outline" disabled={completingId === c.id}
                      onClick={() => markCompleted(c.id)}
                    >
                      {tc('mark_completed')}
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Adicionar médico */}
        <Card className="p-4">
          <h2 className="font-bold mb-1 flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> {tc('add_doctor')}
          </h2>
          <p className="text-xs text-muted-foreground mb-3">{tc('search_hint')}</p>
          <div className="flex gap-2">
            <Input
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDoctor()}
              placeholder={tc('doctor_name_ph')}
              aria-label={tc('add_doctor')}
            />
            <Button onClick={addDoctor} disabled={adding || !doctorName.trim()}>{tc('add')}</Button>
          </div>
        </Card>

        {/* Equipa médica */}
        <section aria-labelledby="team-h">
          <h2 id="team-h" className="font-bold text-base mb-2 flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" /> {tc('my_doctors')} ({team.length})
          </h2>
          {teamQ.isLoading ? (
            <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : team.length === 0 ? (
            <Card className="p-5 text-center text-sm text-muted-foreground">{tc('no_doctors')}</Card>
          ) : (
            <div className="space-y-2">
              {team.map((d) => (
                <Card key={d.id} className="p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Stethoscope className="h-4 w-4 text-primary" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{d.doctor?.full_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{d.doctor?.phone || d.role}</p>
                  </div>
                  <Button
                    size="icon" variant="ghost" disabled={removingId === d.id}
                    onClick={() => removeDoctor(d.id)} aria-label={tc('remove')}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
