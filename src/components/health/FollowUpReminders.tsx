import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bell, Calendar, X, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface FU {
  id: string;
  consultation_id: string;
  doctor_id: string;
  message: string;
  due_at: string;
  rebooked_consultation_id?: string | null;
}

interface Slot {
  id: string;
  starts_at: string;
  ends_at: string;
}

export function FollowUpReminders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<FU[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<FU | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('consultation_followups')
      .select('id, consultation_id, doctor_id, message, due_at, rebooked_consultation_id')
      .eq('patient_id', user.id)
      .is('dismissed_at', null)
      .order('due_at')
      .limit(3);
    setItems((data as FU[]) || []);
  };
  useEffect(() => { load(); }, [user]);

  const dismiss = async (id: string) => {
    await supabase.from('consultation_followups').update({ dismissed_at: new Date().toISOString() }).eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const openRebook = async (f: FU) => {
    setActive(f);
    setOpen(true);
    setLoading(true);
    const { data } = await supabase
      .from('doctor_availability_slots')
      .select('id, starts_at, ends_at')
      .eq('doctor_id', f.doctor_id)
      .eq('is_booked', false)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at')
      .limit(8);
    setSlots((data as Slot[]) || []);
    setLoading(false);
  };

  const bookSlot = async (slot: Slot) => {
    if (!active || !user) return;
    setBooking(slot.id);
    try {
      const { data: consult, error } = await supabase
        .from('consultations')
        .insert({
          doctor_id: active.doctor_id,
          patient_id: user.id,
          scheduled_at: slot.starts_at,
          status: 'scheduled',
          consultation_type: 'chat',
          reason: 'Acompanhamento pós-consulta',
        })
        .select('id')
        .single();
      if (error) throw error;
      await supabase
        .from('doctor_availability_slots')
        .update({ is_booked: true, consultation_id: consult.id })
        .eq('id', slot.id);
      await supabase
        .from('consultation_followups')
        .update({ rebooked_consultation_id: consult.id, rebooked_at: new Date().toISOString(), dismissed_at: new Date().toISOString() })
        .eq('id', active.id);
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Consulta agendada', { body: `Confirmada para ${new Date(slot.starts_at).toLocaleString('pt-PT')}.` });
      }
      toast.success('Nova consulta agendada!');
      setOpen(false);
      setItems(prev => prev.filter(i => i.id !== active.id));
      navigate(`/health/consultation/${consult.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao agendar');
    } finally { setBooking(null); }
  };

  if (items.length === 0) return null;

  return (
    <section className="px-4">
      <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
        <Bell className="h-4 w-4 text-pharmacy" /> Acompanhamento
      </h2>
      <div className="space-y-2">
        {items.map(f => (
          <Card key={f.id} className="p-3 border-pharmacy/30 bg-pharmacy/5">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium">{f.message}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Lembrete de {new Date(f.due_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => dismiss(f.id)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/health/consultation/${f.consultation_id}`)}>
                Abrir consulta
              </Button>
              <Button size="sm" className="flex-1" onClick={() => openRebook(f)}>
                <Calendar className="h-3 w-3 mr-1" /> Nova consulta
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Escolhe um horário</DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="py-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : slots.length === 0 ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">Sem horários disponíveis para este médico.</p>
              <Button variant="outline" className="w-full" onClick={async () => {
                if (!active) return;
                const { data: dp } = await supabase.from('doctor_profiles').select('id').eq('user_id', active.doctor_id).maybeSingle();
                setOpen(false);
                if (dp?.id) navigate(`/health/book/${dp.id}`);
              }}>Ver agenda completa</Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {slots.map(s => {
                const d = new Date(s.starts_at);
                return (
                  <Button
                    key={s.id}
                    variant="outline"
                    className="w-full justify-between"
                    disabled={booking === s.id}
                    onClick={() => bookSlot(s)}
                  >
                    <span className="text-sm">
                      {d.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short' })}
                      {' • '}
                      {d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {booking === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-pharmacy" />}
                  </Button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}