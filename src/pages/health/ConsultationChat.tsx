import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, ShieldCheck, FileSignature, FileText, Video, Paperclip, CheckCircle2, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PostConsultationReview } from '@/components/health/PostConsultationReview';

interface Msg {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
}

export default function ConsultationChat() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState<any>(null);
  const [otherName, setOtherName] = useState<string>('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: c } = await supabase.from('consultations').select('*').eq('id', id).maybeSingle();
      if (!c) return;
      setConsultation(c);
      const otherId = c.doctor_id === user?.id ? c.patient_id : c.doctor_id;
      const { data: p } = await supabase.from('profiles').select('full_name').eq('user_id', otherId).maybeSingle();
      setOtherName(p?.full_name || 'Utilizador');
      const { data: msgs } = await supabase
        .from('consultation_messages')
        .select('*')
        .eq('consultation_id', id)
        .order('created_at');
      setMessages(msgs || []);
    })();

    const channel = supabase
      .channel(`consult-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'consultation_messages', filter: `consultation_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => prev.some(m => m.id === (payload.new as any).id) ? prev : [...prev, payload.new as Msg]);
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !user || !id) return;
    const msg = text.trim();
    setText('');
    const { error } = await supabase.from('consultation_messages').insert({
      consultation_id: id,
      sender_id: user.id,
      message: msg,
    });
    if (error) { toast.error(error.message); setText(msg); }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !id) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Máx. 10MB'); return; }
    setUploading(true);
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${user.id}/${id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('consultation-attachments').upload(path, file);
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data: signed } = await supabase.storage.from('consultation-attachments').createSignedUrl(path, 60 * 60 * 24 * 30);
    const isImage = file.type.startsWith('image/');
    await supabase.from('consultation_messages').insert({
      consultation_id: id,
      sender_id: user.id,
      message: isImage ? '📷 Imagem partilhada' : `📎 ${file.name}`,
      attachment_url: signed?.signedUrl || path,
      attachment_type: isImage ? 'image' : 'file',
      attachment_name: file.name,
    });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const completeConsult = async () => {
    if (!consultation) return;
    setCompleting(true);
    const { error } = await supabase
      .from('consultations')
      .update({ status: 'completed' })
      .eq('id', consultation.id);
    setCompleting(false);
    if (error) { toast.error(error.message); return; }
    setConsultation({ ...consultation, status: 'completed' });
    toast.success('Consulta concluída. Lembretes de acompanhamento criados.');
  };

  const startConsult = async () => {
    if (!consultation) return;
    await supabase.from('consultations').update({ status: 'in_progress' }).eq('id', consultation.id);
    setConsultation({ ...consultation, status: 'in_progress' });
  };

  const isDoctor = consultation?.doctor_id === user?.id;

  // Auto-prompt review for patient when completed
  useEffect(() => {
    if (!consultation || isDoctor) return;
    if (consultation.status !== 'completed') return;
    (async () => {
      const { data: existing } = await supabase
        .from('doctor_reviews')
        .select('id')
        .eq('consultation_id', consultation.id)
        .maybeSingle();
      if (!existing) setReviewOpen(true);
    })();
  }, [consultation?.status, isDoctor]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pharmacy to-primary flex items-center justify-center text-pharmacy-foreground font-bold">
          {otherName?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{isDoctor ? 'Paciente' : 'Dr(a).'} {otherName}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-pharmacy" /> Conversa segura
          </p>
        </div>
        {consultation && <Badge variant="outline">{consultation.status}</Badge>}
      </header>

      {consultation && (
        <div className="p-3 bg-primary/5 border-b flex gap-2">
          {isDoctor && consultation.status === 'scheduled' && (
            <Button size="sm" onClick={startConsult} className="flex-1">Iniciar consulta</Button>
          )}
          {isDoctor && consultation.status === 'in_progress' && (
            <Button size="sm" variant="outline" className="flex-1" onClick={completeConsult} disabled={completing}>
              {completing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Concluir
            </Button>
          )}
          <Button size="sm" variant="default" className="flex-1" onClick={() => navigate(`/health/video/${consultation.id}`)}>
            <Video className="h-4 w-4 mr-1" /> Vídeo
          </Button>
          {isDoctor && (
            <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/doctor/prescription/new?consultationId=${consultation.id}`)}>
              <FileSignature className="h-4 w-4 mr-1" /> Emitir receita
            </Button>
          )}
          {!isDoctor && (
            <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate('/health/prescriptions')}>
              <FileText className="h-4 w-4 mr-1" /> Minhas receitas
            </Button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Sem mensagens ainda. {isDoctor ? 'Cumprimenta o paciente!' : 'Diz olá ao médico!'}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {m.attachment_url && m.attachment_type === 'image' && (
                  <a href={m.attachment_url} target="_blank" rel="noreferrer">
                    <img src={m.attachment_url} alt={m.attachment_name || ''} className="rounded-lg mb-1 max-h-60 object-cover" />
                  </a>
                )}
                {m.attachment_url && m.attachment_type !== 'image' && (
                  <a href={m.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline">
                    <FileText className="h-4 w-4" /> {m.attachment_name || 'Ficheiro'}
                  </a>
                )}
                {!m.attachment_url && m.message}
                {m.attachment_url && <div className="text-xs opacity-80 mt-1">{m.message}</div>}
                <div className={`text-[10px] mt-1 ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {new Date(m.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3 flex gap-2">
        <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={handleFile} />
        <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </Button>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Escrever mensagem..."
        />
        <Button onClick={send} disabled={!text.trim()}><Send className="h-4 w-4" /></Button>
      </div>

      {consultation && !isDoctor && (
        <PostConsultationReview
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          consultationId={consultation.id}
          doctorId={consultation.doctor_id}
          doctorName={otherName}
        />
      )}
    </div>
  );
}