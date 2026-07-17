import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2, UserPlus, Crown, ArrowLeft, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function ClinicDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [clinic, setClinic] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [doctorEmail, setDoctorEmail] = useState('');

  const load = async () => {
    if (!user) return;
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
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', list.map((d: any) => d.doctor_id));
        setDoctors(list.map((d: any) => ({
          ...d,
          doctor: profs?.find((p: any) => p.user_id === d.doctor_id),
        })));
      } else {
        setDoctors([]);
      }
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*, plan:subscription_plans(target_audience)')
      .eq('user_id', user.id)
      .eq('status', 'active');
    setHasActivePlan((sub ?? []).some((s: any) => s.plan?.target_audience === 'clinic'));
  };

  useEffect(() => {
    load();
  }, [user]);

  const addDoctor = async () => {
    if (!clinic || !doctorEmail) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .ilike('full_name', `%${doctorEmail}%`)
      .maybeSingle();
    if (!profile) return toast.error('Médico não encontrado pelo nome');

    const { error } = await supabase.from('clinic_doctors').insert({
      clinic_id: clinic.id,
      doctor_id: profile.user_id,
    });
    if (error) return toast.error(error.message);
    toast.success(`${profile.full_name} adicionado`);
    setDoctorEmail('');
    load();
  };

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
    <div className="min-h-screen bg-background pb-24">
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
            <p className="text-2xl font-bold text-primary">0</p>
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
              placeholder="Nome do médico"
            />
            <Button onClick={addDoctor}>Adicionar</Button>
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