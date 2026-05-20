import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Pill, Zap, ShieldCheck } from 'lucide-react';

export default function PrescriptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [presc, setPresc] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [doctorName, setDoctorName] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: p } = await supabase.from('prescriptions').select('*').eq('id', id).maybeSingle();
      if (!p) return;
      setPresc(p);
      const { data: its } = await supabase.from('prescription_items').select('*').eq('prescription_id', id);
      setItems(its || []);
      const { data: prof } = await supabase.from('profiles').select('full_name').eq('user_id', p.doctor_id).maybeSingle();
      setDoctorName(prof?.full_name || 'Médico');
    })();
  }, [id]);

  if (!presc) return <div className="p-4">A carregar...</div>;

  const expired = presc.expires_at && new Date(presc.expires_at) < new Date();

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold">Receita Digital</h1>
      </div>

      <Card className="p-4 bg-gradient-to-br from-primary/5 to-pharmacy/5 border-primary/20">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-pharmacy" /> Receita verificada</p>
            <p className="font-semibold mt-1">Dr(a). {doctorName}</p>
            <p className="text-xs text-muted-foreground">Emitida: {new Date(presc.created_at).toLocaleDateString('pt-PT')}</p>
            {presc.expires_at && (
              <p className="text-xs text-muted-foreground">Válida até: {new Date(presc.expires_at).toLocaleDateString('pt-PT')}</p>
            )}
          </div>
          <Badge variant={expired ? 'outline' : 'default'}>{expired ? 'Expirada' : presc.status}</Badge>
        </div>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Medicamentos</h2>
        {items.map((it, idx) => (
          <Card key={it.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-pharmacy/10 flex items-center justify-center flex-shrink-0">
                <Pill className="h-5 w-5 text-pharmacy" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-semibold">{idx + 1}. {it.medication_name}</p>
                {it.dosage && <p className="text-sm">💊 {it.dosage}{it.frequency ? ` • ${it.frequency}` : ''}</p>}
                {it.duration && <p className="text-sm text-muted-foreground">⏱ {it.duration}</p>}
                {it.instructions && <p className="text-xs text-muted-foreground italic">"{it.instructions}"</p>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {presc.notes && (
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Observações</p>
          <p className="text-sm">{presc.notes}</p>
        </Card>
      )}

      {!expired && (
        <Button
          className="w-full h-12 bg-pharmacy hover:bg-pharmacy/90 text-pharmacy-foreground"
          onClick={() => navigate('/pharmacy', { state: { prescription_id: presc.id, priority: true } })}
        >
          <Zap className="h-5 w-5 mr-2" />
          Pedir nas farmácias (Prioritário)
        </Button>
      )}

      <Button variant="outline" className="w-full" onClick={() => window.print()}>
        <FileText className="h-4 w-4 mr-2" /> Imprimir / Guardar PDF
      </Button>
    </div>
  );
}