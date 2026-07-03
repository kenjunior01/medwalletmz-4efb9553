import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User } from 'lucide-react';

export default function DoctorPatients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: cons } = await supabase.from('consultations').select('patient_id, scheduled_at').eq('doctor_id', user.id);
      const map = new Map<string, any>();
      (cons || []).forEach((c: any) => {
        const prev = map.get(c.patient_id);
        if (!prev || new Date(c.scheduled_at) > new Date(prev.scheduled_at)) map.set(c.patient_id, c);
      });
      const ids = [...map.keys()];
      if (!ids.length) { setPatients([]); return; }
      const { data: profs } = await (supabase.rpc as any)('list_patients_for_doctor', { _ids: ids });
      setPatients((profs || []).map((p: any) => ({ ...p, last: map.get(p.user_id)?.scheduled_at })));
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="font-bold">Meus pacientes</h1>
      </header>
      <div className="p-4 space-y-2">
        {patients.length === 0 && <p className="text-muted-foreground text-sm">Ainda não tens pacientes.</p>}
        {patients.map(p => (
          <Card key={p.user_id}><CardContent className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"><User className="h-5 w-5" /></div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{p.full_name || 'Paciente'}</p>
              <p className="text-xs text-muted-foreground">Última: {new Date(p.last).toLocaleDateString('pt-PT')}</p>
            </div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}