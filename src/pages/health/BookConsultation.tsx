import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Slot { id: string; starts_at: string }

export default function BookConsultation() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doctor, setDoctor] = useState<any>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!doctorId) return;
    (async () => {
      const { data } = await supabase
        .from('doctor_profiles')
        .select('*, medical_specialties(name, icon)')
        .eq('id', doctorId)
        .maybeSingle();
      if (!data) return;
      const { data: prof } = await supabase.from('profiles').select('full_name').eq('user_id', data.user_id).maybeSingle();
      setDoctor({ ...data, full_name: prof?.full_name });
      const { data: s } = await supabase
        .from('doctor_availability_slots')
        .select('id, starts_at')
        .eq('doctor_id', data.user_id)
        .eq('is_booked', false)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')
        .limit(40);
      setSlots((s as Slot[]) || []);
    })();
  }, [doctorId]);

  const handleBook = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!selected || !doctor) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('consultations')
      .insert({
        doctor_id: doctor.user_id,
        patient_id: user.id,
        scheduled_at: selected.starts_at,
        consultation_type: 'chat',
        reason,
        fee: doctor.consultation_fee,
        status: 'scheduled',
      })
      .select()
      .single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await supabase
      .from('doctor_availability_slots')
      .update({ is_booked: true, consultation_id: data.id })
      .eq('id', selected.id);
    toast.success('Consulta marcada! Aguarda confirmação por notificação.');
    navigate(`/health/consultation/${data.id}`);
  };

  if (!doctor) return <div className="p-6">A carregar...</div>;

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="font-bold">Marcar consulta</h1>
      </header>

      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="p-4 flex gap-3 items-center">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-pharmacy to-primary flex items-center justify-center text-pharmacy-foreground font-bold">
              {doctor.full_name?.[0] || 'M'}
            </div>
            <div className="flex-1">
              <p className="font-bold">Dr(a). {doctor.full_name}</p>
              <p className="text-xs text-muted-foreground">{doctor.medical_specialties?.icon} {doctor.medical_specialties?.name}</p>
            </div>
            <span className="font-bold text-pharmacy">{doctor.consultation_fee} MZN</span>
          </CardContent>
        </Card>

        <div>
          <h2 className="font-semibold mb-2 flex items-center gap-2"><Calendar className="h-4 w-4" /> Escolha um horário</h2>
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground p-3 rounded-lg border border-dashed">
              Este médico ainda não publicou horários. Tenta outro profissional ou volta mais tarde.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((s) => {
                const d = new Date(s.starts_at);
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className={`p-2 rounded-lg border text-xs transition ${
                      selected?.id === s.id ? 'border-primary bg-primary/10 font-semibold' : 'border-border'
                    }`}
                  >
                    <div>{d.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short' })}</div>
                    <div className="text-sm font-bold">{d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="reason">Motivo da consulta (opcional)</Label>
          <Textarea
            id="reason"
            placeholder="Descreva sintomas ou dúvidas..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 p-4 bg-background border-t">
        <Button className="w-full" size="lg" disabled={!selected || saving} onClick={handleBook}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Confirmar consulta ({doctor.consultation_fee} MZN)
        </Button>
      </div>
    </div>
  );
}