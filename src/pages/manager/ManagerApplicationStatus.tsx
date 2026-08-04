import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Shield, Trophy, CheckCircle, Ban } from '@/components/icons/lucide-compat';
import { MANAGER_QUIZ } from '@/lib/managerQuest';
import ApplicationMessages from '@/components/manager/ApplicationMessages';

const STATUS: Record<string, { label: string; cls: string; desc: string }> = {
  pending: { label: 'Enviada', cls: 'bg-amber-100 text-amber-800', desc: 'A sua candidatura foi recebida e aguarda análise.' },
  in_review: { label: 'Em análise', cls: 'bg-blue-100 text-blue-800', desc: 'A equipa está a rever o seu perfil e respostas.' },
  interview: { label: 'Entrevista', cls: 'bg-purple-100 text-purple-800', desc: 'Foi convidado para entrevista. Aguarde o contacto.' },
  approved: { label: 'Aprovada', cls: 'bg-emerald-100 text-emerald-800', desc: 'Parabéns! Já tem acesso ao painel de gestor regional.' },
  rejected: { label: 'Não aprovada', cls: 'bg-red-100 text-red-800', desc: 'Desta vez não avançou. Pode candidatar-se novamente mais tarde.' },
};

const TIMELINE = ['pending', 'in_review', 'interview', 'approved'] as const;

export default function ManagerApplicationStatus() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState<any | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from('manager_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setApp(data || null);
      setLoading(false);
    })();
  }, [user]);

  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString('pt-PT') : null);

  const rejected = app?.status === 'rejected';
  const stageIndex = rejected ? -1 : TIMELINE.indexOf(app?.status);

  return (
    <main className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <Helmet>
        <title>Estado da candidatura a Gestor Regional | MedWallet</title>
        <meta name="description" content="Acompanhe o estado da sua candidatura a Gestor Regional: envio, análise, entrevista e decisão final." />
      </Helmet>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl md:text-2xl font-black flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> A minha candidatura
        </h1>
      </div>

      {loading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : !user ? (
        <Card><CardContent className="p-8 text-center space-y-3">
          <p className="text-muted-foreground">Inicie sessão para ver a sua candidatura.</p>
          <Button onClick={() => navigate('/auth?next=/minha-candidatura')}>Entrar</Button>
        </CardContent></Card>
      ) : !app ? (
        <Card><CardContent className="p-8 text-center space-y-3">
          <Trophy className="h-10 w-10 mx-auto text-primary" />
          <p className="text-muted-foreground">Ainda não tem nenhuma candidatura a Gestor Regional.</p>
          <Button onClick={() => navigate('/tornar-se-gestor')}>Começar candidatura</Button>
        </CardContent></Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span>Estado actual</span>
                <Badge className={STATUS[app.status]?.cls}>{STATUS[app.status]?.label || app.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{STATUS[app.status]?.desc}</p>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Pontuação do questionário</span>
                  <strong className="text-primary">{app.quiz_score}/{app.max_score}</strong>
                </div>
                <Progress value={Math.round((app.quiz_score / (app.max_score || 1)) * 100)} className="h-2" />
              </div>
              {app.review_notes && (
                <div className="rounded-lg border p-3 text-sm">
                  <p className="font-semibold mb-1">Notas da equipa</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{app.review_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <ApplicationMessages applicationId={app.id} />

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Eventos</CardTitle></CardHeader>
            <CardContent>
              <ol className="relative border-l pl-5 space-y-5">
                {TIMELINE.map((s, i) => {
                  const done = stageIndex >= i;
                  return (
                    <li key={s}>
                      <span className={`absolute -left-[7px] h-3.5 w-3.5 rounded-full border-2 ${done ? 'bg-primary border-primary' : 'bg-background border-muted-foreground/40'}`} />
                      <p className={`text-sm font-semibold ${done ? '' : 'text-muted-foreground'}`}>{STATUS[s].label}</p>
                      <p className="text-xs text-muted-foreground">
                        {i === 0
                          ? fmt(app.created_at) || '—'
                          : done
                            ? fmt(app.reviewed_at) || 'Concluído'
                            : 'A aguardar'}
                      </p>
                    </li>
                  );
                })}
                {rejected && (
                  <li>
                    <span className="absolute -left-[7px] h-3.5 w-3.5 rounded-full border-2 bg-destructive border-destructive" />
                    <p className="text-sm font-semibold flex items-center gap-1"><Ban className="h-3.5 w-3.5" /> Não aprovada</p>
                    <p className="text-xs text-muted-foreground">{fmt(app.reviewed_at) || '—'}</p>
                  </li>
                )}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Resumo das respostas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p><span className="text-muted-foreground">Província:</span> {app.province || '-'}</p>
                <p><span className="text-muted-foreground">Região:</span> {app.target_region || '-'}</p>
                <p><span className="text-muted-foreground">Experiência:</span> {app.experience_years ?? 0} anos</p>
                <p><span className="text-muted-foreground">Horas/semana:</span> {app.weekly_hours ?? '-'}</p>
                <p><span className="text-muted-foreground">Transporte:</span> {app.has_transport ? 'Sim' : 'Não'}</p>
                <p><span className="text-muted-foreground">Idiomas:</span> {(app.languages || []).join(', ') || '-'}</p>
              </div>
              {app.motivation && (
                <div>
                  <p className="font-semibold text-sm mb-1">Motivação</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{app.motivation}</p>
                </div>
              )}
              <ul className="space-y-2">
                {MANAGER_QUIZ.map((q) => {
                  const chosen = q.options.find((o) => o.id === app.answers?.[q.id]);
                  return (
                    <li key={q.id} className="rounded-lg border p-2">
                      <p className="text-xs text-muted-foreground">{q.section} — {q.question}</p>
                      <p className="text-sm font-medium">
                        {chosen?.label || '—'}{' '}
                        <span className="text-xs text-primary">({chosen?.points ?? 0} pts)</span>
                      </p>
                    </li>
                  );
                })}
              </ul>
              {app.status === 'approved' && (
                <Button className="w-full" onClick={() => navigate('/manager')}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Entrar no painel de gestor
                </Button>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
