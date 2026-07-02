import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Video, Clock, Users, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

type Row = {
  id: string;
  consultation_id: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  end_reason: string | null;
  participants: Array<{ user_id: string; role: string; joined_at: string }>;
  provider: string;
  consultations?: { doctor_id: string; patient_id: string; scheduled_at: string | null } | null;
};

const statusColor: Record<string, string> = {
  waiting: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  ended: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
};
const statusLabel: Record<string, string> = { waiting: 'A aguardar', active: 'A decorrer', ended: 'Terminada' };

function fmtDuration(s: number | null) {
  if (!s || s < 1) return '—';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m ? `${m}m ${r}s` : `${r}s`;
}

export default function VideoSessions() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('video_sessions')
        .select('id, consultation_id, status, started_at, ended_at, duration_seconds, end_reason, participants, provider, consultations!inner(doctor_id, patient_id, scheduled_at)')
        .order('created_at', { ascending: false })
        .limit(100);
      setRows((data as unknown as Row[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="container max-w-3xl py-6 px-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold">Histórico de vídeo-consultas</h1>
          <p className="text-sm text-muted-foreground">Estado, duração e participantes das tuas sessões.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Video className="h-8 w-8 mx-auto mb-2 opacity-60" />
          Ainda não tens vídeo-consultas.
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map(r => {
            const when = r.started_at ? new Date(r.started_at) : null;
            return (
              <Card key={r.id} className="p-4 flex items-center gap-4 hover:shadow-md transition">
                <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                  <Video className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">
                      {when ? when.toLocaleString('pt-PT', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sem data'}
                    </p>
                    <Badge className={statusColor[r.status] || ''} variant="secondary">{statusLabel[r.status] ?? r.status}</Badge>
                    <Badge variant="outline" className="text-xs">{r.provider}</Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDuration(r.duration_seconds)}</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{r.participants?.length ?? 0} participantes</span>
                  </div>
                </div>
                {r.status !== 'ended' ? (
                  <Button asChild size="sm"><Link to={`/health/room/${r.consultation_id}`}>Entrar</Link></Button>
                ) : (
                  <Button asChild size="sm" variant="outline"><Link to={`/health/consultation/${r.consultation_id}`}>Ver</Link></Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}