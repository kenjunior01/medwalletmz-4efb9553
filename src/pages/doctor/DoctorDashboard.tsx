import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar, MessageCircle, DollarSign, Users, Stethoscope, CalendarClock } from 'lucide-react';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [today, setToday] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [stats, setStats] = useState({ patients: 0, monthRevenue: 0 });

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
      <header className="bg-gradient-to-br from-pharmacy to-primary text-pharmacy-foreground p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm opacity-90">Bem-vindo(a)</p>
            <h1 className="text-2xl font-bold">Dr(a). consulta</h1>
          </div>
          {!profile.is_verified && <Badge variant="outline" className="bg-white/20 border-white/30">A verificar</Badge>}
        </div>
        <div className="flex items-center justify-between bg-white/10 backdrop-blur rounded-xl p-3">
          <span className="text-sm">Disponível para consultas</span>
          <Switch checked={profile.is_available} onCheckedChange={toggleAvailable} />
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3 p-4 -mt-6">
        <Card><CardContent className="p-3 text-center">
          <Calendar className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-xl font-bold">{today.length}</p><p className="text-[10px] text-muted-foreground">Hoje</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Users className="h-5 w-5 mx-auto text-pharmacy mb-1" />
          <p className="text-xl font-bold">{stats.patients}</p><p className="text-[10px] text-muted-foreground">Pacientes</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <DollarSign className="h-5 w-5 mx-auto text-gold mb-1" />
          <p className="text-xl font-bold">{stats.monthRevenue}</p><p className="text-[10px] text-muted-foreground">MZN/mês</p>
        </CardContent></Card>
      </div>

      <div className="px-4 space-y-4">
        <section>
          <h2 className="font-bold mb-2">Hoje</h2>
          {today.length === 0 && <p className="text-sm text-muted-foreground">Sem consultas hoje.</p>}
          {today.map(c => (
            <Card key={c.id} className="mb-2 cursor-pointer" onClick={() => navigate(`/health/consultation/${c.id}`)}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="text-center">
                  <p className="text-lg font-bold">{new Date(c.scheduled_at).getHours()}h</p>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Consulta {c.consultation_type}</p>
                  <p className="text-xs text-muted-foreground">{c.reason || 'Sem motivo descrito'}</p>
                </div>
                <MessageCircle className="h-4 w-4 text-primary" />
              </CardContent>
            </Card>
          ))}
        </section>

        <section>
          <h2 className="font-bold mb-2">Próximas</h2>
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Sem consultas agendadas.</p>}
          {upcoming.map(c => (
            <Card key={c.id} className="mb-2 cursor-pointer" onClick={() => navigate(`/health/consultation/${c.id}`)}>
              <CardContent className="p-3">
                <p className="text-sm font-semibold">{new Date(c.scheduled_at).toLocaleString('pt-PT', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                <p className="text-xs text-muted-foreground">{c.reason || 'Consulta agendada'}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <Button variant="outline" className="w-full" onClick={() => navigate('/doctor/availability')}>
          <CalendarClock className="h-4 w-4 mr-2" /> Gerir horários disponíveis
        </Button>
        <Button variant="outline" className="w-full" onClick={() => navigate('/doctor/patients')}>Ver pacientes</Button>
      </div>
    </div>
  );
}