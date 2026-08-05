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
import { Shield, ChevronRight, ChevronLeft, CheckCircle, Trophy, Upload } from '@/components/icons/lucide-compat';
import {
  MANAGER_QUIZ, MAX_QUIZ_SCORE, MAX_PHASE_SCORE, PHASES, QuizPhase,
  questionsForPhase, scoreByPhase, scoreQuiz,
} from '@/lib/managerQuest';

const LANGS = ['Português', 'Inglês', 'Changana', 'Sena', 'Macua', 'Ndau', 'Outro'];

type Step =
  | { kind: 'profile' }
  | { kind: 'phase-intro'; phase: QuizPhase }
  | { kind: 'question'; phase: QuizPhase; qid: string }
  | { kind: 'final' };

const STEPS: Step[] = [
  { kind: 'profile' },
  ...PHASES.flatMap((p): Step[] => [
    { kind: 'phase-intro', phase: p.phase },
    ...questionsForPhase(p.phase).map((q): Step => ({ kind: 'question', phase: p.phase, qid: q.id })),
  ]),
  { kind: 'final' },
];

export default function BecomeManager() {
  const { user } = useAuth();
  const { country } = useCountry();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [existing, setExisting] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cvName, setCvName] = useState('');

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
    cv_url: '',
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

  const current = STEPS[step];
  const progress = Math.round((step / (STEPS.length - 1)) * 100);
  const score = useMemo(() => scoreQuiz(answers), [answers]);
  const phases = useMemo(() => scoreByPhase(answers), [answers]);

  const canAdvance = () => {
    if (!current) return false;
    if (current.kind === 'profile') {
      return form.full_name.trim().length > 2 && form.phone.trim().length > 5 && form.province.trim().length > 1;
    }
    if (current.kind === 'question') return !!answers[current.qid];
    if (current.kind === 'final') return form.motivation.trim().length >= 80;
    return true;
  };

  const uploadCv = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('O ficheiro deve ter no máximo 10 MB'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const path = `manager-applications/${user?.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('licenses').upload(path, file, { upsert: true });
      if (error) throw error;
      setForm((f) => ({ ...f, cv_url: path }));
      setCvName(file.name);
      toast.success('Documento carregado');
    } catch {
      toast.error('Erro ao carregar o documento');
    } finally {
      setUploading(false);
    }
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
      phase_scores: phases,
      simulation: { score: phases['3'], max: MAX_PHASE_SCORE[3] },
    });
    setSaving(false);
    if (error) {
      toast.error(error.code === '23505' ? 'Já tem uma candidatura em análise.' : 'Erro ao enviar candidatura');
      return;
    }
    toast.success('Candidatura enviada! A equipa irá avaliar.');
    setExisting({ status: 'pending', quiz_score: score, max_score: MAX_QUIZ_SCORE, phase_scores: phases, justSubmitted: true });
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
    const ps = existing.phase_scores || {};
    return (
      <main className="max-w-lg mx-auto p-6 space-y-4">
        <Helmet><title>Candidatura a Gestor Regional | MedWallet</title></Helmet>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> A sua candidatura</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {existing.justSubmitted && (
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm flex gap-2">
                <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Candidatura recebida. Enviámos a confirmação e a equipa responde nos próximos dias úteis através da área de mensagens.</span>
              </div>
            )}
            <Badge>{statusLabel[existing.status] || existing.status}</Badge>
            <p className="text-sm text-muted-foreground">Pontuação total: <strong>{existing.quiz_score}/{existing.max_score}</strong></p>
            <div className="grid grid-cols-3 gap-2">
              {PHASES.map((p) => (
                <div key={p.phase} className="rounded-lg border p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">Fase {p.phase}</p>
                  <p className="font-bold text-primary">{ps[String(p.phase)] ?? 0}<span className="text-xs text-muted-foreground">/{MAX_PHASE_SCORE[p.phase]}</span></p>
                </div>
              ))}
            </div>
            {existing.review_notes && <p className="text-sm">Notas: {existing.review_notes}</p>}
            <div className="flex gap-2">
              <Button onClick={() => navigate('/minha-candidatura')}>Acompanhar candidatura</Button>
              <Button variant="outline" onClick={() => navigate('/')}>Início</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const q = current?.kind === 'question' ? MANAGER_QUIZ.find((x) => x.id === current.qid) : null;
  const phaseQs = current && 'phase' in current ? questionsForPhase(current.phase) : [];
  const phaseMeta = current && 'phase' in current ? PHASES.find((p) => p.phase === current.phase) : null;

  return (
    <main className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <Helmet>
        <title>Tornar-se Gestor Regional | MedWallet</title>
        <meta name="description" content="Candidate-se a Gestor Regional da MedWallet: questionário de avaliação em 3 fases, simulação prática e resposta da equipa." />
      </Helmet>

      <header className="space-y-2">
        <h1 className="text-2xl font-black flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /> Quest: Gestor Regional</h1>
        <p className="text-sm text-muted-foreground">Avaliação em 3 fases. As respostas e pontuações vão directamente para o painel de administração.</p>
        <Progress value={progress} className="h-2" />
      </header>

      {current?.kind === 'profile' && (
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

      {current?.kind === 'phase-intro' && phaseMeta && (
        <Card><CardContent className="p-6 space-y-3 text-center">
          <Badge variant="outline" className="mx-auto">Fase {phaseMeta.phase} de 3</Badge>
          <h2 className="text-xl font-black">{phaseMeta.title}</h2>
          <p className="text-sm text-muted-foreground">{phaseMeta.subtitle}</p>
          <p className="text-xs text-muted-foreground">{phaseQs.length} perguntas · máximo {MAX_PHASE_SCORE[phaseMeta.phase]} pontos</p>
        </CardContent></Card>
      )}

      {q && current?.kind === 'question' && (
        <Card><CardContent className="p-5 space-y-4">
          <Badge variant="outline">{q.section} · {phaseQs.findIndex((x) => x.id === q.id) + 1}/{phaseQs.length}</Badge>
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

      {current?.kind === 'final' && (
        <Card><CardContent className="p-5 space-y-4">
          <h2 className="text-lg font-bold">Porque devemos escolher-lhe?</h2>
          <Textarea rows={7} maxLength={2000} value={form.motivation}
            onChange={(e) => setForm({ ...form, motivation: e.target.value })}
            placeholder="Fale da sua rede de contactos na saúde, resultados que já entregou, e o plano dos primeiros 90 dias (mínimo 80 caracteres)." />
          <p className="text-xs text-muted-foreground">{form.motivation.length} caracteres</p>

          <div className="space-y-2">
            <Label>CV ou carta de apresentação (PDF ou imagem, opcional)</Label>
            <label className="flex items-center gap-2 rounded-xl border border-dashed p-3 cursor-pointer hover:border-primary/50">
              <Upload className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                {uploading ? 'A carregar...' : cvName || 'Escolher ficheiro (máx. 10 MB)'}
              </span>
              <input type="file" className="hidden" accept=".pdf,image/*"
                onChange={(e) => e.target.files?.[0] && uploadCv(e.target.files[0])} />
            </label>
          </div>

          <div className="rounded-xl bg-muted/40 p-3 text-sm space-y-2">
            <p className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" /> Pontuação total: <strong>{score}/{MAX_QUIZ_SCORE}</strong></p>
            <div className="grid grid-cols-3 gap-2">
              {PHASES.map((p) => (
                <div key={p.phase} className="rounded-lg bg-background p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">Fase {p.phase}</p>
                  <p className="font-bold text-primary">{phases[String(p.phase)]}<span className="text-xs text-muted-foreground">/{MAX_PHASE_SCORE[p.phase]}</span></p>
                </div>
              ))}
            </div>
          </div>
        </CardContent></Card>
      )}

      <div className="flex justify-between gap-3">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        {step < STEPS.length - 1 ? (
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
