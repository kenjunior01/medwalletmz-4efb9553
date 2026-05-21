import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Trash2, FileSignature, Loader2, Snowflake } from 'lucide-react';
import { toast } from 'sonner';

interface Item {
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const empty = (): Item => ({ medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' });

export default function CreatePrescription() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const consultationId = params.get('consultationId');
  const [consultation, setConsultation] = useState<any>(null);
  const [patientName, setPatientName] = useState('');
  const [items, setItems] = useState<Item[]>([empty()]);
  const [notes, setNotes] = useState('');
  const [coldChain, setColdChain] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!consultationId) return;
    (async () => {
      const { data: c } = await supabase.from('consultations').select('*').eq('id', consultationId).maybeSingle();
      setConsultation(c);
      if (c?.patient_id) {
        const { data: p } = await supabase.from('profiles').select('full_name').eq('user_id', c.patient_id).maybeSingle();
        setPatientName(p?.full_name || 'Paciente');
      }
    })();
  }, [consultationId]);

  const update = (i: number, field: keyof Item, value: string) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  };

  const save = async () => {
    if (!user || !consultation) return;
    const valid = items.filter(i => i.medication_name.trim());
    if (valid.length === 0) { toast.error('Adicione pelo menos um medicamento'); return; }
    setSaving(true);
    try {
      const { data: presc, error } = await supabase.from('prescriptions').insert({
        doctor_id: user.id,
        patient_id: consultation.patient_id,
        consultation_id: consultation.id,
        notes: notes || null,
        status: 'active',
        requires_cold_chain: coldChain,
      }).select('id').single();
      if (error) throw error;
      const { error: itemsErr } = await supabase.from('prescription_items').insert(
        valid.map(i => ({ prescription_id: presc.id, ...i }))
      );
      if (itemsErr) throw itemsErr;
      await supabase.from('consultation_messages').insert({
        consultation_id: consultation.id,
        sender_id: user.id,
        message: `📄 Receita digital emitida com ${valid.length} medicamento(s).`,
      });
      toast.success('Receita emitida!');
      navigate(`/health/consultation/${consultation.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao emitir receita');
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="font-semibold flex items-center gap-2"><FileSignature className="h-4 w-4 text-primary" /> Nova Receita</h1>
          <p className="text-xs text-muted-foreground">Paciente: {patientName}</p>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {items.map((it, i) => (
          <Card key={i} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Medicamento {i + 1}</span>
              {items.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={it.medication_name} onChange={e => update(i, 'medication_name', e.target.value)} placeholder="Ex: Paracetamol 500mg" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Dosagem</Label>
                <Input value={it.dosage} onChange={e => update(i, 'dosage', e.target.value)} placeholder="1 comprimido" />
              </div>
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Input value={it.frequency} onChange={e => update(i, 'frequency', e.target.value)} placeholder="8/8h" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Duração</Label>
              <Input value={it.duration} onChange={e => update(i, 'duration', e.target.value)} placeholder="5 dias" />
            </div>
            <div className="space-y-2">
              <Label>Instruções</Label>
              <Textarea value={it.instructions} onChange={e => update(i, 'instructions', e.target.value)} placeholder="Tomar após refeições" rows={2} />
            </div>
          </Card>
        ))}

        <Button variant="outline" className="w-full" onClick={() => setItems(prev => [...prev, empty()])}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar medicamento
        </Button>

        <div className="space-y-2">
          <Label>Observações gerais</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Recomendações adicionais..." rows={3} />
        </div>

        <Button onClick={save} disabled={saving} className="w-full h-12">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Emitir Receita'}
        </Button>
      </div>
    </div>
  );
}