import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, MessageSquare, Search } from '@/components/icons/lucide-compat';

interface Row {
  id: string;
  title: string | null;
  kind: string;
  last_message: string | null;
  last_message_at: string;
  unread: boolean;
  otherName: string;
}

const KIND_LABEL: Record<string, string> = {
  direct: 'Directa',
  consultation: 'Consulta',
  delivery: 'Entrega',
  institution: 'Instituição',
  support: 'Apoio',
};

export default function Messages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = async () => {
    if (!user) { setLoading(false); return; }
    const { data: parts } = await (supabase as any)
      .from('chat_participants')
      .select('thread_id, last_read_at')
      .eq('user_id', user.id);
    const ids = (parts || []).map((p: any) => p.thread_id);
    if (!ids.length) { setRows([]); setLoading(false); return; }

    const readMap = new Map((parts || []).map((p: any) => [p.thread_id, p.last_read_at]));
    const { data: threads } = await (supabase as any)
      .from('chat_threads')
      .select('*')
      .in('id', ids)
      .order('last_message_at', { ascending: false });

    const { data: others } = await (supabase as any)
      .from('chat_participants')
      .select('thread_id, user_id')
      .in('thread_id', ids)
      .neq('user_id', user.id);

    const otherIds = Array.from(new Set((others || []).map((o: any) => o.user_id)));
    const nameMap = new Map<string, string>();
    if (otherIds.length) {
      const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', otherIds);
      (profs || []).forEach((p: any) => nameMap.set(p.user_id, p.full_name || 'Utilizador'));
    }

    setRows(
      (threads || []).map((t: any) => {
        const o = (others || []).find((x: any) => x.thread_id === t.id);
        const lastRead = readMap.get(t.id);
        return {
          id: t.id,
          title: t.title,
          kind: t.kind,
          last_message: t.last_message,
          last_message_at: t.last_message_at,
          unread: !!lastRead && new Date(t.last_message_at) > new Date(lastRead as string),
          otherName: (o && nameMap.get(o.user_id)) || 'Utilizador',
        };
      }),
    );
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('chat-threads-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads' }, () => { void load(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const filtered = rows.filter(
    (r) => !q || r.otherName.toLowerCase().includes(q.toLowerCase()) || (r.title || '').toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Helmet>
        <title>Mensagens | MedWallet</title>
        <meta name="description" content="Conversa com médicos, clínicas, hospitais, farmácias e estafetas num só lugar, com envio de anexos e facturas em PDF." />
      </Helmet>

      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">Mensagens</h1>
      </header>

      <div className="p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Procurar conversa..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Procurar conversa" />
        </div>

        {loading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Sem conversas ainda. Inicia uma a partir de uma consulta, entrega ou perfil de instituição.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => navigate(`/messages/${r.id}`)}
                  className="w-full text-left flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-pharmacy flex items-center justify-center text-primary-foreground font-bold shrink-0">
                    {r.otherName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{r.title || r.otherName}</p>
                      <Badge variant="outline" className="text-[10px]">{KIND_LABEL[r.kind] || r.kind}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{r.last_message || 'Sem mensagens'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(r.last_message_at).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                    </p>
                    {r.unread && <span className="inline-block mt-1 h-2 w-2 rounded-full bg-primary" aria-label="Novas mensagens" />}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
