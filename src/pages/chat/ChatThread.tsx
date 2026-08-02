import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Paperclip, FileText, Loader2, ShieldCheck, Share2 } from '@/components/icons/lucide-compat';
import { toast } from 'sonner';
import { markThreadRead, uploadChatFile, type ChatMessage } from '@/lib/chat';
import { InvoiceComposer } from '@/components/chat/InvoiceComposer';
import { shareToWhatsApp } from '@/lib/whatsapp';

export default function ChatThread() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [thread, setThread] = useState<any>(null);
  const [otherName, setOtherName] = useState('Utilizador');
  const [myName, setMyName] = useState('Eu');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data: t } = await (supabase as any).from('chat_threads').select('*').eq('id', id).maybeSingle();
      setThread(t);
      const { data: parts } = await (supabase as any).from('chat_participants').select('user_id').eq('thread_id', id);
      const ids = (parts || []).map((p: any) => p.user_id);
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', ids);
        (profs || []).forEach((p: any) => {
          if (p.user_id === user.id) setMyName(p.full_name || 'Eu');
          else setOtherName(p.full_name || 'Utilizador');
        });
      }
      const { data: msgs } = await (supabase as any)
        .from('chat_messages').select('*').eq('thread_id', id).order('created_at');
      setMessages(msgs || []);
      await markThreadRead(id, user.id);
    })();

    const ch = supabase
      .channel(`chat-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${id}` },
        (payload) => setMessages((prev) => (prev.some((m) => m.id === (payload.new as any).id) ? prev : [...prev, payload.new as ChatMessage])))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (id && user && messages.length) void markThreadRead(id, user.id); }, [messages.length, id, user]);

  const send = async () => {
    if (!text.trim() || !user || !id) return;
    const body = text.trim();
    setText('');
    const { error } = await (supabase as any).from('chat_messages').insert({
      thread_id: id, sender_id: user.id, body, kind: 'text',
    });
    if (error) { toast.error(error.message); setText(body); }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !id) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Máx. 10MB'); return; }
    setUploading(true);
    try {
      const { url } = await uploadChatFile(user.id, id, file, file.name);
      const isImage = file.type.startsWith('image/');
      await (supabase as any).from('chat_messages').insert({
        thread_id: id,
        sender_id: user.id,
        kind: 'attachment',
        body: isImage ? '📷 Imagem partilhada' : `📎 ${file.name}`,
        attachment_url: url,
        attachment_type: isImage ? 'image' : 'file',
        attachment_name: file.name,
      });
    } catch (err: any) {
      toast.error(err.message || 'Falha no upload');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{`Conversa com ${otherName} | MedWallet`}</title>
        <meta name="description" content="Conversa segura na MedWallet com anexos, facturas em PDF e partilha para WhatsApp." />
      </Helmet>

      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate('/messages')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-pharmacy flex items-center justify-center text-primary-foreground font-bold">
          {otherName[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{thread?.title || otherName}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-pharmacy" /> Conversa segura
          </p>
        </div>
        {thread && <Badge variant="outline">{thread.kind}</Badge>}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Sem mensagens ainda. Diz olá!</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {m.attachment_url && m.attachment_type === 'image' && (
                  <a href={m.attachment_url} target="_blank" rel="noreferrer">
                    <img src={m.attachment_url} alt={m.attachment_name || 'Anexo da conversa'} loading="lazy" className="rounded-lg mb-1 max-h-60 object-cover" />
                  </a>
                )}
                {m.attachment_url && m.attachment_type !== 'image' && (
                  <a href={m.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline">
                    <FileText className="h-4 w-4" /> {m.attachment_name || 'Ficheiro'}
                  </a>
                )}
                {m.body && <div className={m.attachment_url ? 'text-xs opacity-90 mt-1' : ''}>{m.body}</div>}
                {m.kind === 'invoice' && m.attachment_url && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2 h-7 text-xs"
                    onClick={() => shareToWhatsApp(`${m.body}\n\nDocumento: ${m.attachment_url}`)}
                  >
                    <Share2 className="h-3 w-3 mr-1" /> Enviar por WhatsApp
                  </Button>
                )}
                <div className={`text-[10px] mt-1 ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {new Date(m.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3 flex gap-2 items-center">
        <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={handleFile} aria-label="Anexar ficheiro" />
        <Button variant="ghost" size="icon" aria-label="Anexar ficheiro" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </Button>
        {user && id && (
          <InvoiceComposer threadId={id} userId={user.id} fromName={myName} toName={otherName} />
        )}
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Escrever mensagem..."
          aria-label="Mensagem"
        />
        <Button onClick={send} disabled={!text.trim()} aria-label="Enviar"><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
