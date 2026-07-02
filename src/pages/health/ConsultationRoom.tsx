import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Video, VideoOff, ArrowLeft, PhoneCall, Loader2, Stethoscope, Clock } from 'lucide-react';
import { toast } from 'sonner';

type Consult = {
  id: string;
  doctor_id: string;
  patient_id: string;
  scheduled_at: string | null;
  status: string;
  type: string | null;
  reason?: string | null;
};

export default function ConsultationRoom() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [consult, setConsult] = useState<Consult | null>(null);
  const [otherName, setOtherName] = useState<string>('');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [remoteReady, setRemoteReady] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    let active = true;

    (async () => {
      const { data: c, error } = await supabase
        .from('consultations')
        .select('id, doctor_id, patient_id, scheduled_at, status, type, reason')
        .eq('id', id)
        .maybeSingle();
      if (!active) return;
      if (error || !c) {
        toast.error('Consulta não encontrada');
        nav('/health/consultations');
        return;
      }
      if (c.doctor_id !== user.id && c.patient_id !== user.id) {
        toast.error('Sem acesso a esta sala');
        nav('/health/consultations');
        return;
      }
      setConsult(c as Consult);
      const otherId = c.doctor_id === user.id ? c.patient_id : c.doctor_id;
      const { data: p } = await supabase.from('profiles').select('full_name').eq('user_id', otherId).maybeSingle();
      setOtherName(p?.full_name || 'Participante');
      setLoading(false);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e: any) {
        setMediaError(e?.message || 'Não foi possível aceder à câmara/microfone');
      }
    })();

    // Presence: know if other side is already waiting
    const ch = supabase.channel(`room:${id}`, { config: { presence: { key: user.id } } });
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const others = Object.keys(state).filter(k => k !== user.id).length;
      setRemoteReady(others > 0);
    }).subscribe(async (s) => {
      if (s === 'SUBSCRIBED') await ch.track({ at: Date.now() });
    });

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [id, user, nav]);

  const toggleMic = () => {
    const t = streamRef.current?.getAudioTracks() ?? [];
    t.forEach(x => (x.enabled = !x.enabled));
    setMicOn(v => !v);
  };
  const toggleCam = () => {
    const t = streamRef.current?.getVideoTracks() ?? [];
    t.forEach(x => (x.enabled = !x.enabled));
    setCamOn(v => !v);
  };

  const join = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    nav(`/health/video/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const scheduled = consult?.scheduled_at ? new Date(consult.scheduled_at) : null;
  const isDoctor = consult?.doctor_id === user?.id;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-white" onClick={() => nav(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-xs uppercase tracking-wider opacity-70">Sala de consulta</p>
          <p className="font-semibold">Vídeo-consulta segura</p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pb-24 grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <Card className="overflow-hidden bg-black border-white/10 aspect-video relative">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {!camOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <VideoOff className="h-10 w-10 opacity-60" />
            </div>
          )}
          {mediaError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 p-6 text-center text-sm">
              <VideoOff className="h-8 w-8 opacity-70" />
              <p className="opacity-80">{mediaError}</p>
              <p className="opacity-60 text-xs">Permite acesso à câmara e microfone nas definições do navegador.</p>
            </div>
          )}

          <div className="absolute bottom-4 inset-x-0 flex justify-center gap-3">
            <Button size="icon" variant="secondary" onClick={toggleMic}
              className="rounded-full h-11 w-11 bg-white/10 hover:bg-white/20 text-white border-0">
              {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            <Button size="icon" variant="secondary" onClick={toggleCam}
              className="rounded-full h-11 w-11 bg-white/10 hover:bg-white/20 text-white border-0">
              {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5 bg-white/5 border-white/10 text-white">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-primary/20 flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs opacity-70">{isDoctor ? 'Paciente' : 'Médico(a)'}</p>
                <p className="font-semibold">{otherName}</p>
              </div>
            </div>
            {scheduled && (
              <div className="mt-4 flex items-center gap-2 text-sm opacity-80">
                <Clock className="h-4 w-4" />
                {scheduled.toLocaleString('pt-PT', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            )}
            {consult?.reason && (
              <p className="mt-3 text-sm opacity-80 line-clamp-3">{consult.reason}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-white/10 text-white border-0">{consult?.type || 'Consulta'}</Badge>
              <Badge variant="secondary" className="bg-white/10 text-white border-0">{consult?.status}</Badge>
              <Badge className={remoteReady ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}>
                {remoteReady ? 'Outro participante já entrou' : 'A aguardar o outro participante'}
              </Badge>
            </div>
          </Card>

          <Card className="p-5 bg-white/5 border-white/10 text-sm opacity-90 space-y-2">
            <p className="font-medium">Antes de entrar</p>
            <ul className="list-disc pl-5 space-y-1 opacity-80">
              <li>Confirma câmara e microfone.</li>
              <li>Usa Wi-Fi estável se possível.</li>
              <li>A chamada é encriptada ponto-a-ponto.</li>
            </ul>
          </Card>

          <Button onClick={join} disabled={!!mediaError}
            className="w-full h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-base font-semibold">
            <PhoneCall className="h-5 w-5 mr-2" /> Entrar na consulta
          </Button>
        </div>
      </div>
    </div>
  );
}