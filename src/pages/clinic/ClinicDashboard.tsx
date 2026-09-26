import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, UserPlus, Crown, ArrowLeft, LogOut } from "@/components/icons/lucide-compat";
import { toast } from 'sonner';

export default function ClinicDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [clinic, setClinic] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [consultsToday, setConsultsToday] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [doctorEmail, setDoctorEmail] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: c } = await supabase
        .from('clinics')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      setClinic(c);

      if (c) {
        const { data: cd } = await supabase
          .from('clinic_doctors')
          .select('*')
          .eq('clinic_id', c.id);
        const list = cd ?? [];
        if (list.length) {
          const [{ data: profs }, { count: todayCount }] = await Promise.all([
            supabase.from('profiles').select('user_id, full_name, phone')
              .in('user_id', list.map((d: any) => d.doctor_id)),
            (() => {
              const s = new Date(); s.setHours(0, 0, 0, 0);
              const e = new Date(); e.setHours(23, 59, 59, 999);
              return supabase.from('consultations').select('id', { count: 'exact', head: true })
                .in('doctor_id', list.map((d: any) => d.doctor_id))
                .gte('scheduled_at', s.toISOString())
                .lte('scheduled_at', e.toISOString());
            })(),
          ]);
          setDoctors(list.map((d: any) => ({
            ...d,
            doctor: profs?.find((p: any) => p.user_id === d.doctor_id),
          })));
          setConsultsToday(todayCount ?? 0);
        } else {
          setDoctors([]);
          setConsultsToday(0);
        }
      }

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*, plan:subscription_plans(target_audience)')
        .eq('user_id', user.id)
        .eq('status', 'active');
      setHasActivePlan((sub ?? []).some((s: any) => s.plan?.target_audience === 'clinic'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  const addDoctor = async () => {
    if (!clinic || !doctorEmail.trim() || adding) return;
    setAdding(true);
    try {
      const term = doctorEmail.trim();
      // Procura por telefone (exacto, normalizado) OU nome (parcial)
      const digits = term.replace(/\D/g, '');
      let query = supabase.from('profiles').select('user_id, full_name, phone').limit(5);
      if (digits.length >= 7) {
        query = query.or(`phone.ilike.%${digits}%,full_name.ilike.%${term}%`);
      } else {
        query = query.ilike('full_name', `%${term}%`);
      }
      const { data: candidates } = await query;
      if (!candidates?.length) {
        toast.error('Nenhum profissional encontrado. Usa o telefone ou nome completo do médico.');
        return;
      }
      // Verifica quais são médicos registados
      const { data: dps } = await supabase.from('doctor_profiles')
        .select('user_id')
        .in('user_id', candidates.map((c: any) => c.user_id));
      const doctorIds = new Set((dps ?? []).map((d: any) => d.user_id));
      const profile = candidates.find((c: any) => doctorIds.has(c.user_id));
      if (!profile) {
        toast.error('Encontrado, mas ainda não é médico registado no MedWallet.');
        return;
      }
      if (doctors.some((d) => d.doctor_id === profile.user_id)) {
        toast.info(`${profile.full_name} já está na clínica`);
        setDoctorEmail('');
        return;
      }
      const { error } = await supabase.from('clinic_doctors').insert({
        clinic_id: clinic.id,
        doctor_id: profile.user_id,
      });
      if (error) return toast.error(error.message);
      toast.success(`${profile.full_name} adicionado`);
      setDoctorEmail('');
      load();
    } finally {
      setAdding(false);
    }
  };

  if (loading && !clinic) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold mb-2">Ainda não tem clínica registada</p>
          <Button onClick={() => navigate('/clinic/register')}>Registar agora</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/80 px-4 py-3 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">{clinic.name}</h1>
            <p className="text-xs text-muted-foreground">{clinic.city}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => signOut().then(() => navigate('/'))}>
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <section className="p-4 space-y-4">
        {!hasActivePlan && (
          <Card className="p-4 bg-gradient-to-br from-gold/20 to-pharmacy/10 border-gold/30">
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8 text-gold" />
              <div className="flex-1">
                <p className="font-bold">Ative o Clínica Pro</p>
                <p className="text-xs text-muted-foreground">
                  Funcionalidades premium estão limitadas sem subscrição.
                </p>
              </div>
              <Button size="sm" onClick={() => navigate('/health/plans')}>
                Ver
              </Button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{doctors.length}</p>
            <p className="text-xs text-muted-foreground">Médicos</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">
              {consultsToday === null ? '…' : consultsToday}
            </p>
            <p className="text-xs text-muted-foreground">Consultas hoje</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">
              {clinic.is_verified ? '✓' : '⏳'}
            </p>
            <p className="text-xs text-muted-foreground">
              {clinic.is_verified ? 'Verificada' : 'Em análise'}
            </p>
          </Card>
        </div>

        <Card className="p-4">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Adicionar médico
          </h2>
          <div className="flex gap-2">
            <Input
              value={doctorEmail}
              onChange={(e) => setDoctorEmail(e.target.value)}
              placeholder="Telefone ou nome do médico"
              onKeyDown={(e) => { if (e.key === 'Enter') addDoctor(); }}
            />
            <Button onClick={addDoctor} disabled={adding}>
              {adding ? 'A adicionar…' : 'Adicionar'}
            </Button>
          </div>
        </Card>

        <div>
          <h2 className="font-bold mb-2">Médicos da clínica</h2>
          {doctors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem médicos associados.</p>
          ) : (
            <div className="space-y-2">
              {doctors.map((d) => (
                <Card key={d.id} className="p-3 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm">{d.doctor?.full_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{d.doctor?.phone}</p>
                  </div>
                  <Badge variant="outline">{d.role}</Badge>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}