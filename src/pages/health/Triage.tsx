import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Sparkles, AlertTriangle, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';

interface TriageResult {
  severity: string;
  recommendation: string;
  suggested_specialty: string;
  red_flags?: string[];
}

const sevColor: Record<string, string> = {
  baixa: 'bg-pharmacy text-pharmacy-foreground',
  moderada: 'bg-warning text-warning-foreground',
  alta: 'bg-destructive text-destructive-foreground',
  'emergência': 'bg-destructive text-destructive-foreground animate-pulse',
};

export default function Triage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [symptoms, setSymptoms] = useState('');
  const [age, setAge] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);

  const run = async () => {
    if (!symptoms.trim()) return toast.error('Descreve os sintomas');
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-triage', {
        body: { symptoms, age: age ? Number(age) : null, duration },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as TriageResult);
      if (user) {
        await supabase.from('triage_logs').insert({
          patient_id: user.id,
          symptoms,
          age: age ? Number(age) : null,
          duration: duration || null,
          severity: data.severity,
          recommendation: data.recommendation,
          suggested_specialty: data.suggested_specialty,
          ai_response: data,
        });
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Erro na triagem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 py-3 backdrop-blur border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Meddy Consulta
          </h1>
          <p className="text-xs text-muted-foreground">Avaliação rápida de sintomas</p>
        </div>
      </header>

      <section className="p-4 space-y-4">
        <Card className="p-4 bg-warning/10 border-warning/30 flex gap-2 text-xs">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          Esta avaliação não substitui consulta médica. Em emergência liga <b>84 144</b>.
        </Card>

        <Card className="p-4 space-y-3">
          <div>
            <Label>Descreve os sintomas</Label>
            <Textarea rows={4} value={symptoms} onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Ex: dor de cabeça forte há 2 dias, febre 38.5, náuseas..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Idade</Label>
              <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="30" />
            </div>
            <div>
              <Label>Duração</Label>
              <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="2 dias" />
            </div>
          </div>
          <Button className="w-full" onClick={run} disabled={loading}>
            {loading ? 'A analisar...' : 'Analisar sintomas'}
          </Button>
        </Card>

        {result && (
          <Card className="p-4 space-y-3 border-primary/30">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase text-muted-foreground">Avaliação</p>
              <Badge className={sevColor[result.severity] ?? 'bg-muted'}>
                Severidade: {result.severity}
              </Badge>
            </div>
            <p className="text-sm">{result.recommendation}</p>
            {result.red_flags && result.red_flags.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/30 rounded p-2 text-xs">
                <p className="font-semibold mb-1">Sinais de alerta:</p>
                <ul className="list-disc pl-4">{result.red_flags.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </div>
            )}
            <div className="pt-2 border-t flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Especialidade sugerida</p>
                <p className="font-semibold text-sm">{result.suggested_specialty}</p>
              </div>
              <Button size="sm" onClick={() => navigate('/health/doctors')}>
                <Stethoscope className="h-4 w-4 mr-1" /> Marcar consulta
              </Button>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}