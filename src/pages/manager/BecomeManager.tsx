import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { Shield, ChevronRight, ChevronLeft, CheckCircle, Trophy } from '@/components/icons/lucide-compat';
import { MANAGER_QUIZ, MAX_QUIZ_SCORE, scoreQuiz } from '@/lib/managerQuest';

const LANGS = ['Português', 'Inglês', 'Changana', 'Sena', 'Macua', 'Ndau', 'Outro'];

export default function BecomeManager() {
  const { user } = useAuth();
  const { country } = useCountry();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [existing, setExisting] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    province: '',
    target_region: '',
    current_occupation: '',
    experience_years: 0,
    weekly_hours: 20,
    has_transport: false,
    linkedin: '',
    motivation: '',
  });
  const [languages, setLanguages] = useState<string[]>(['Português']);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from('manager_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setExisting(data);
      setForm((f) => ({ ...f, email: user.email || f.email }));
    })();
  }, [user]);

  const quizStepStart = 1;
  const totalSteps = quizStepStart + MANAGER_QUIZ.length + 1;
  const progress = Math.round((step / (totalSteps - 1)) * 100);
  const score = useMemo(() => scoreQuiz(answers), [answers]);

  const canAdvance = () => {
    if (step === 0) return form.full_name.trim().length > 2 && form.phone.trim().length > 5 && form.province.trim().length > 1;
    if (step >= quizStepStart && step < quizStepStart + MANAGER_QUIZ.length) {
      return !!answers[MANAGER_QUIZ[step - quizStepStart].id];
    }
    return form.motivation.trim().length >= 80;
  };

  const submit = async () => {
    if (!user) { navigate('/auth?next=/tornar-se-gestor'); return; }
    setSaving(true);
    const { error } = await (supabase as any).from('manager_applications').insert({
      user_id: user.id,
      ...form,
      languages,
      country_id: country?.id || null,
      answers,
      quiz_score: score,
      max_score: MAX_QUIZ_SCORE,
    });
    setSaving(false);
    if (error) {
      toast.error(error.code === '23505' ? 'Já tem uma candidatura em análise.' : 'Erro ao enviar candidatura');
      return;
    }
    toast.success('Candidatura enviada! A equipa irá avaliar.');
    setExisting({ status: 'pending', quiz_score: score, max_score: MAX_QUIZ_SCORE });
  };

  if (!user) {
    return (
      <main className="max-w-lg mx-auto p-6 text-center space-y-4">
        <Shield className="h-12 w-12 mx-auto text-primary" />
        <h1 className="text-2xl font-bold">Torne-se Gestor Regional</h1>
        <p className="text-muted-foreground">Crie a sua conta para iniciar a candidatura.</p>
        <Button onClick={() => navigate('/auth?next=/tornar-se-gestor')}>Entrar / Registar</Button>
      </main>
    );
  }

  if (existing) {
    const statusLabel: Record<string, string> = {
      pending: 'Em espera de análise', in_review: 'Em análise', interview: 'Convidado para entrevista',
      approved: 'Aprovada', rejected: 'Não aprovada',
    };
    return (
      <main className="max-w-lg mx-auto p-6 space-y-4">
        <Helmet><title>Candidatura a Gestor Regional | MedWallet</title></Helmet>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> A sua candidatura</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Badge>{statusLabel[existing.status] || existing.status}</Badge>
            <p className="text-sm text-muted-foreground">Pontuação: <strong>{existing.quiz_score}/{existing.max_score}</strong></p>
            {existing.review_notes && <p className="text-sm">Notas: {existing.review_notes}</p>}
            <Button variant="outline" onClick={() => navigate('/')}>Voltar ao início</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const quizIndex = step - quizStepStart;
  const q = MANAGER_QUIZ[quizIndex];

  return (
    <main className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <Helmet>
        <title>Tornar-se Gestor Regional | MedWallet</title>
        <meta name="description" content="Candidate-se a Gestor Regional da MedWallet: responda ao questionário de competências e junte-se à equipa de liderança." />
      </Helmet>

      <header className="space-y-2">
        <h1 className="text-2xl font-black flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /> Quest: Gestor Regional</h1>
        <p className="text-sm text-muted-foreground">Responda com honestidade. A pontuação e as respostas vão directamente para o painel de administração.</p>
        <Progress value={progress} className="h-2" />
      </header>

      {step === 0 && (
        <Card><CardContent className="p-5 space-y-4">
          <div><Label>Nome completo *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Telefone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Província *</Label><Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} placeholder="Ex.: Maputo" /></div>
            <div><Label>Região pretendida</Label><Input value={form.target_region} onChange={(e) => setForm({ ...form, target_region: e.target.value })} placeholder="Ex.: Sul" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Ocupação actual</Label><Input value={form.current_occupation} onChange={(e) => setForm({ ...form, current_occupation: e.target.value })} /></div>
            <div><Label>Anos de experiência em gestão</Label><Input type="number" min={0} value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: Number(e.target.value) })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Horas disponíveis / semana</Label><Input type="number" min={0} value={form.weekly_hours} onChange={(e) => setForm({ ...form, weekly_hours: Number(e.target.value) })} /></div>
            <div><Label>LinkedIn (opcional)</Label><Input value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} /></div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="transport">Tem transporte próprio?</Label>
            <Switch id="transport" checked={form.has_transport} onCheckedChange={(v) => setForm({ ...form, has_transport: v })} />
          </div>
          <div>
            <Label>Idiomas que domina</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {LANGS.map((l) => (
                <button key={l} type="button"
                  onClick={() => setLanguages((prev) => prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l])}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${languages.includes(l) ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 text-muted-foreground'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </CardContent></Card>
      )}

      {q && (
        <Card><CardContent className="p-5 space-y-4">
          <Badge variant="outline">{q.section} · {quizIndex + 1}/{MANAGER_QUIZ.length}</Badge>
          <h2 className="text-lg font-bold">{q.question}</h2>
          <div className="space-y-2">
            {q.options.map((o) => (
              <button key={o.id} type="button" onClick={() => setAnswers({ ...answers, [q.id]: o.id })}
                className={`w-full text-left p-3 rounded-xl border text-sm transition ${answers[q.id] === o.id ? 'border-primary bg-primary/10 font-semibold' : 'hover:border-primary/40'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </CardContent></Card>
      )}

      {step === totalSteps - 1 && (
        <Card><CardContent className="p-5 space-y-4">
          <h2 className="text-lg font-bold">Porque devemos escolher-lhe?</h2>
          <Textarea rows={7} maxLength={2000} value={form.motivation}
            onChange={(e) => setForm({ ...form, motivation: e.target.value })}
            placeholder="Fale da sua rede de contactos na saúde, resultados que já entregou, e o plano dos primeiros 90 dias (mínimo 80 caracteres)." />
          <p className="text-xs text-muted-foreground">{form.motivation.length} caracteres</p>
          <div className="rounded-xl bg-muted/40 p-3 text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" /> Pontuação do questionário: <strong>{score}/{MAX_QUIZ_SCORE}</strong>
          </div>
        </CardContent></Card>
      )}

      <div className="flex justify-between gap-3">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        {step < totalSteps - 1 ? (
          <Button disabled={!canAdvance()} onClick={() => setStep((s) => s + 1)}>
            Seguinte <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button disabled={!canAdvance() || saving} onClick={submit}>
            {saving ? 'A enviar...' : 'Enviar candidatura'}
          </Button>
        )}
      </div>
    </main>
  );
}
