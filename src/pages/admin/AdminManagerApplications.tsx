import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Trophy, Shield, CheckCircle, Ban, ChevronRight } from '@/components/icons/lucide-compat';
import { MANAGER_QUIZ } from '@/lib/managerQuest';

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendente', cls: 'bg-amber-100 text-amber-800' },
  in_review: { label: 'Em análise', cls: 'bg-blue-100 text-blue-800' },
  interview: { label: 'Entrevista', cls: 'bg-purple-100 text-purple-800' },
  approved: { label: 'Aprovada', cls: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Rejeitada', cls: 'bg-red-100 text-red-800' },
};

export default function AdminManagerApplications() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [selected, setSelected] = useState<any | null>(null);
  const [notes, setNotes] = useState('');

  const { data: apps, isLoading } = useQuery({
    queryKey: ['manager-applications'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('manager_applications')
        .select('*')
        .order('quiz_score', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from('manager_applications')
        .update({ status, review_notes: notes || null, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['manager-applications'] }); toast.success('Candidatura actualizada'); setSelected(null); setNotes(''); },
    onError: () => toast.error('Erro ao actualizar'),
  });

  const promote = useMutation({
    mutationFn: async (app: any) => {
      const { error } = await (supabase as any)
        .from('user_roles')
        .insert({ user_id: app.user_id, role: 'country_manager', country_id: app.country_id });
      if (error && error.code !== '23505') throw error;
      await (supabase as any)
        .from('manager_applications')
        .update({ status: 'approved', review_notes: notes || null, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', app.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['manager-applications'] }); toast.success('Candidato promovido a Gestor Regional'); setSelected(null); },
    onError: () => toast.error('Erro ao promover candidato'),
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="h-6 w-6 text-primary" /> Candidaturas a Gestor Regional</h1>
        <p className="text-muted-foreground text-sm">Ordenadas por pontuação no questionário de competências.</p>
      </header>

      {isLoading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : !apps?.length ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">Ainda não há candidaturas.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <Card key={a.id} className="cursor-pointer hover:border-primary/50" onClick={() => { setSelected(a); setNotes(a.review_notes || ''); }}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-14 text-center">
                  <p className="text-xl font-black text-primary">{a.quiz_score}</p>
                  <p className="text-[10px] text-muted-foreground">/{a.max_score}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{a.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{[a.province, a.country_id, a.current_occupation].filter(Boolean).join(' · ')}</p>
                </div>
                <Badge className={STATUS[a.status]?.cls}>{STATUS[a.status]?.label || a.status}</Badge>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.full_name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <p><span className="text-muted-foreground">Telefone:</span> {selected.phone || '-'}</p>
                <p><span className="text-muted-foreground">Email:</span> {selected.email || '-'}</p>
                <p><span className="text-muted-foreground">Província:</span> {selected.province || '-'}</p>
                <p><span className="text-muted-foreground">País:</span> {selected.country_id || '-'}</p>
                <p><span className="text-muted-foreground">Experiência:</span> {selected.experience_years} anos</p>
                <p><span className="text-muted-foreground">Horas/semana:</span> {selected.weekly_hours}</p>
                <p><span className="text-muted-foreground">Transporte:</span> {selected.has_transport ? 'Sim' : 'Não'}</p>
                <p><span className="text-muted-foreground">Idiomas:</span> {(selected.languages || []).join(', ')}</p>
              </div>
              {selected.motivation && (
                <div><p className="font-semibold mb-1">Motivação</p><p className="text-muted-foreground whitespace-pre-wrap">{selected.motivation}</p></div>
              )}
              <div>
                <p className="font-semibold mb-1">Respostas ({selected.quiz_score}/{selected.max_score})</p>
                <ul className="space-y-2">
                  {MANAGER_QUIZ.map((q) => {
                    const chosen = q.options.find((o) => o.id === selected.answers?.[q.id]);
                    return (
                      <li key={q.id} className="rounded-lg border p-2">
                        <p className="text-xs text-muted-foreground">{q.section} — {q.question}</p>
                        <p className="font-medium">{chosen?.label || '—'} <span className="text-xs text-primary">({chosen?.points ?? 0} pts)</span></p>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <Textarea placeholder="Notas de avaliação..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => updateStatus.mutate({ id: selected.id, status: 'in_review' })}>Em análise</Button>
                <Button variant="outline" onClick={() => updateStatus.mutate({ id: selected.id, status: 'interview' })}>Convidar p/ entrevista</Button>
                <Button variant="destructive" onClick={() => updateStatus.mutate({ id: selected.id, status: 'rejected' })}>
                  <Ban className="h-4 w-4 mr-1" /> Rejeitar
                </Button>
                <Button onClick={() => promote.mutate(selected)} disabled={promote.isPending}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Aprovar e promover
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Aprovar atribui o role de gestor de país ({selected.country_id || 'sem país'}).</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
