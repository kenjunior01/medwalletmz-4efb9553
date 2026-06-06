import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Calendar, X } from 'lucide-react';

interface FU {
  id: string;
  consultation_id: string;
  doctor_id: string;
  message: string;
  due_at: string;
}

export function FollowUpReminders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<FU[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('consultation_followups')
      .select('id, consultation_id, doctor_id, message, due_at')
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

  const rebook = async (f: FU) => {
    const { data: dp } = await supabase.from('doctor_profiles').select('id').eq('user_id', f.doctor_id).maybeSingle();
    if (dp?.id) navigate(`/health/book/${dp.id}`);
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
              <Button size="sm" className="flex-1" onClick={() => rebook(f)}>
                <Calendar className="h-3 w-3 mr-1" /> Nova consulta
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}