import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { MessageSquare, Send } from '@/components/icons/lucide-compat';

interface Msg {
  id: string;
  body: string;
  is_staff: boolean;
  sender_id: string;
  created_at: string;
}

export default function ApplicationMessages({
  applicationId,
  asStaff = false,
}: {
  applicationId: string;
  asStaff?: boolean;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await (supabase as any)
      .from('manager_application_messages')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true });
    setMessages((data as Msg[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load();
    const channel = supabase
      .channel(`mam-${applicationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'manager_application_messages', filter: `application_id=eq.${applicationId}` },
        (payload) => setMessages((prev) => (prev.some((m) => m.id === (payload.new as Msg).id) ? prev : [...prev, payload.new as Msg])),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'nearest' }); }, [messages.length]);

  const send = async () => {
    const text = body.trim();
    if (!text || !user) return;
    setSending(true);
    const { data, error } = await (supabase as any)
      .from('manager_application_messages')
      .insert({ application_id: applicationId, sender_id: user.id, is_staff: asStaff, body: text })
      .select()
      .single();
    setSending(false);
    if (error) { toast.error('Não foi possível enviar a mensagem'); return; }
    setBody('');
    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Msg]));
  };

  const fmt = (d: string) => new Date(d).toLocaleString('pt-PT');

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" /> Mensagens com a equipa avaliadora
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {asStaff
              ? 'Sem mensagens. Envie um pedido de informação ao candidato.'
              : 'Ainda não há mensagens. Se a equipa pedir mais informações, aparecerão aqui.'}
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
            {messages.map((m) => {
              const mine = asStaff ? m.is_staff : !m.is_staff;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                    <p className="text-[11px] opacity-70 mb-0.5">{m.is_staff ? 'Equipa avaliadora' : 'Candidato'} · {fmt(m.created_at)}</p>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}

        <div className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={asStaff ? 'Pedir informação adicional ao candidato...' : 'Responder à equipa avaliadora...'}
            rows={3}
            aria-label="Escrever mensagem"
          />
          <Button onClick={send} disabled={sending || !body.trim()} className="w-full sm:w-auto">
            <Send className="h-4 w-4 mr-1" /> Enviar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}