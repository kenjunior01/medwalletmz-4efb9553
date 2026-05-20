import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageCircle, Stethoscope } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="font-bold">Minhas consultas</h1>
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
        {items.map((c) => (
          <Card key={c.id} className="cursor-pointer" onClick={() => navigate(`/health/consultation/${c.id}`)}>
            <CardContent className="p-4 flex gap-3 items-center">
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}