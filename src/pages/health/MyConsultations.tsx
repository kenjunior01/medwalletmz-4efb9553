import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageCircle, Stethoscope, FileText, X, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const statusColor: Record<string, string> = {
  scheduled: 'bg-primary/20 text-primary',
  in_progress: 'bg-secondary/20 text-secondary',
  completed: 'bg-pharmacy/20 text-pharmacy',
  cancelled: 'bg-destructive/20 text-destructive',
  no_show: 'bg-muted text-muted-foreground',
};

export default function MyConsultations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', user.id)
        .order('scheduled_at', { ascending: false });
      const list = data || [];
      const ids = [...new Set(list.map((c: any) => c.doctor_id))];
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', ids);
        const { data: docs } = await supabase.from('doctor_profiles').select('user_id, medical_specialties(name, icon)').in('user_id', ids);
        list.forEach((c: any) => {
          c.doctor_name = profs?.find((p: any) => p.user_id === c.doctor_id)?.full_name;
          c.doctor_specialty = docs?.find((d: any) => d.user_id === c.doctor_id)?.medical_specialties;
        });
      }
      setItems(list);
      setLoading(false);
    })();
  }, [user]);

  const cancelConsultation = async (c: any) => {
    if (!confirm('Cancelar esta consulta? O lembrete será removido.')) return;
    setBusy(c.id);
    try {
      const { error } = await supabase.from('consultations').update({ status: 'cancelled' }).eq('id', c.id);
      if (error) throw error;
      // Cancel reminders
      await supabase.from('consultation_reminders')
        .update({ status: 'cancelled' })
        .eq('consultation_id', c.id).is('sent_at', null);
      // Free slot
      await supabase.from('doctor_availability_slots')
        .update({ is_booked: false, consultation_id: null })
        .eq('consultation_id', c.id);
      setItems(prev => prev.map(x => x.id === c.id ? { ...x, status: 'cancelled' } : x));
      toast.success('Consulta cancelada');
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  const rescheduleConsultation = async (c: any) => {
    await cancelConsultation(c);
    // After cancel, redirect to booking same doctor
    const { data: dp } = await supabase.from('doctor_profiles').select('id').eq('user_id', c.doctor_id).maybeSingle();
    if (dp?.id) navigate(`/health/book/${dp.id}`);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="font-bold flex-1">Minhas consultas</h1>
        <Button variant="outline" size="sm" onClick={() => navigate('/health/prescriptions')}>
          <FileText className="h-4 w-4 mr-1" /> Receitas
        </Button>
      </header>
      <div className="p-4 space-y-3">
        {loading && <p className="text-muted-foreground">A carregar...</p>}
        {!loading && items.length === 0 && (
          <div className="text-center py-12">
            <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">Ainda não tens consultas.</p>
            <Button onClick={() => navigate('/health/doctors')}>Encontrar médico</Button>
          </div>
        )}
        {items.map((c) => {
          const canModify = ['scheduled', 'confirmed'].includes(c.status) && new Date(c.scheduled_at) > new Date();
          return (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-3 items-center cursor-pointer" onClick={() => navigate(`/health/consultation/${c.id}`)}>
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pharmacy to-primary flex items-center justify-center text-pharmacy-foreground font-bold">
                    {c.doctor_name?.[0] || 'M'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">Dr(a). {c.doctor_name || 'Médico'}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.doctor_specialty?.icon} {c.doctor_specialty?.name || 'Consulta'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(c.scheduled_at).toLocaleString('pt-PT', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={statusColor[c.status] || ''} variant="outline">{c.status}</Badge>
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                {canModify && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="flex-1" disabled={busy === c.id}
                      onClick={(e) => { e.stopPropagation(); rescheduleConsultation(c); }}>
                      <Calendar className="h-3 w-3 mr-1" /> Alterar
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-destructive hover:text-destructive" disabled={busy === c.id}
                      onClick={(e) => { e.stopPropagation(); cancelConsultation(c); }}>
                      <X className="h-3 w-3 mr-1" /> Cancelar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}