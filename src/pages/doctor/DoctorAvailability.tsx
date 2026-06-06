import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

interface Slot { id: string; starts_at: string; ends_at: string; is_booked: boolean }

export default function DoctorAvailability() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('30');

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('doctor_availability_slots')
      .select('id, starts_at, ends_at, is_booked')
      .eq('doctor_id', user.id)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at');
    setSlots(data || []);
  };
  useEffect(() => { load(); }, [user]);

  const add = async () => {
    if (!user || !date || !time) { toast.error('Escolhe data e hora'); return; }
    const start = new Date(`${date}T${time}:00`);
    if (isNaN(start.getTime()) || start < new Date()) { toast.error('Horário inválido'); return; }
    const end = new Date(start.getTime() + parseInt(duration) * 60000);
    const { error } = await supabase.from('doctor_availability_slots').insert({
      doctor_id: user.id,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Horário adicionado');
    setTime('');
    load();
  };

  const remove = async (id: string) => {
    await supabase.from('doctor_availability_slots').delete().eq('id', id);
    load();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="font-bold flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary" /> Horários disponíveis</h1>
      </header>
      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Data</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              <div><Label>Hora</Label><Input type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
            </div>
            <div>
              <Label>Duração (min)</Label>
              <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} />
            </div>
            <Button onClick={add} className="w-full"><Plus className="h-4 w-4 mr-2" /> Adicionar horário</Button>
          </CardContent>
        </Card>

        <section className="space-y-2">
          <h2 className="font-semibold">Próximos horários</h2>
          {slots.length === 0 && <p className="text-sm text-muted-foreground">Sem horários publicados.</p>}
          {slots.map(s => (
            <Card key={s.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">
                    {new Date(s.starts_at).toLocaleString('pt-PT', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    até {new Date(s.ends_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {s.is_booked
                  ? <Badge className="bg-pharmacy/10 text-pharmacy">Reservado</Badge>
                  : <Button variant="ghost" size="icon" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}