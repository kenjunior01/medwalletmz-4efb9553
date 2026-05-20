import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Pill } from 'lucide-react';

export default function MyPrescriptions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('prescriptions')
        .select('*, prescription_items(*)')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });
      if (data) {
        const doctorIds = [...new Set(data.map(d => d.doctor_id))];
        const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', doctorIds);
        const map = new Map(profs?.map(p => [p.user_id, p.full_name]) || []);
        setList(data.map(d => ({ ...d, doctor_name: map.get(d.doctor_id) || 'Médico' })));
      }
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold">Minhas Receitas</h1>
          <p className="text-sm text-muted-foreground">Receitas digitais emitidas pelos seus médicos</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">A carregar...</p>
      ) : list.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="font-medium">Sem receitas ainda</p>
          <p className="text-sm text-muted-foreground">As receitas emitidas em consultas aparecerão aqui.</p>
        </Card>
      ) : (
        list.map(p => {
          const expired = p.expires_at && new Date(p.expires_at) < new Date();
          return (
            <Card key={p.id} className="p-4 space-y-3 cursor-pointer hover:shadow-medium transition" onClick={() => navigate(`/health/prescription/${p.id}`)}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">Dr(a). {p.doctor_name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString('pt-PT')}</p>
                </div>
                <Badge variant={expired ? 'outline' : 'default'}>{expired ? 'Expirada' : p.status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Pill className="h-4 w-4" />
                {p.prescription_items?.length || 0} medicamento(s)
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}