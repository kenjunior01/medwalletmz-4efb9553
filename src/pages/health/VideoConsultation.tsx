import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export default function VideoConsultation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [isCaller, setIsCaller] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    let active = true;

    (async () => {
      // Ensure session
      const { data: c } = await supabase.from('consultations').select('id, doctor_id, patient_id').eq('id', id).maybeSingle();
      if (!c) { toast.error('Consulta não encontrada'); navigate(-1); return; }
      const caller = c.doctor_id === user.id;
      setIsCaller(caller);

      const { data: existing } = await supabase.from('video_sessions').select('*').eq('consultation_id', id).maybeSingle();
      if (!existing) {
        await supabase.from('video_sessions').insert({
          consultation_id: id, room_id: id, status: 'waiting', started_at: new Date().toISOString(),
        });
      } else {
        await supabase.from('video_sessions').update({ status: 'waiting', started_at: new Date().toISOString(), ended_at: null }).eq('id', existing.id);
      }

      // Get media
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
      localStreamRef.current = stream;
      if (localRef.current) localRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(ICE);
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      pc.ontrack = (e) => {
        if (remoteRef.current) remoteRef.current.srcObject = e.streams[0];
        setStatus('connected');
      };

      const channel = supabase.channel(`video:${id}`, { config: { broadcast: { self: false } } });
      channelRef.current = channel;

      pc.onicecandidate = (e) => {
        if (e.candidate) channel.send({ type: 'broadcast', event: 'ice', payload: { from: user.id, candidate: e.candidate } });
      };

      channel
        .on('broadcast', { event: 'offer' }, async ({ payload }) => {
          if (caller) return;
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const ans = await pc.createAnswer();
          await pc.setLocalDescription(ans);
          channel.send({ type: 'broadcast', event: 'answer', payload: { from: user.id, sdp: ans } });
        })
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          if (!caller) return;
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        })
        .on('broadcast', { event: 'ice' }, async ({ payload }) => {
          try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch (e) { console.error(e); }
        })
        .on('broadcast', { event: 'hangup' }, () => endCall())
        .on('broadcast', { event: 'ready' }, async ({ payload }) => {
          // The other peer announced ready; caller creates offer
          if (caller && payload.from !== user.id) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            channel.send({ type: 'broadcast', event: 'offer', payload: { from: user.id, sdp: offer } });
          }
        })
        .subscribe(async (s) => {
          if (s === 'SUBSCRIBED') {
            channel.send({ type: 'broadcast', event: 'ready', payload: { from: user.id } });
          }
        });
    })();

    return () => {
      active = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const cleanup = () => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (channelRef.current) supabase.removeChannel(channelRef.current);
  };

  const endCall = async () => {
    channelRef.current?.send({ type: 'broadcast', event: 'hangup', payload: {} });
    if (id) await supabase.from('video_sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('consultation_id', id);
    setStatus('ended');
    cleanup();
    navigate(-1);
  };

  const toggleMute = () => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? [];
    tracks.forEach(t => (t.enabled = !t.enabled));
    setMuted((m) => !m);
  };
  const toggleCam = () => {
    const tracks = localStreamRef.current?.getVideoTracks() ?? [];
    tracks.forEach(t => (t.enabled = !t.enabled));
    setCamOff((c) => !c);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-3 flex items-center gap-3 bg-black/60 absolute top-0 inset-x-0 z-10">
        <Button variant="ghost" size="icon" onClick={endCall} className="text-white"><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <p className="font-semibold text-sm">Vídeo-consulta</p>
          <p className="text-xs opacity-80">
            {status === 'connected' ? 'Conectado' : status === 'ended' ? 'Terminada' : 'A conectar...'}
          </p>
        </div>
      </header>

      <div className="flex-1 relative">
        <video ref={remoteRef} autoPlay playsInline className="w-full h-full object-cover bg-neutral-900" />
        <video ref={localRef} autoPlay playsInline muted
          className="absolute bottom-24 right-4 w-28 h-40 object-cover rounded-lg border-2 border-white/30 bg-black" />
        {status !== 'connected' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <p className="text-sm opacity-80">{isCaller ? 'A aguardar paciente...' : 'A aguardar médico...'}</p>
          </div>
        )}
      </div>

      <div className="p-4 flex justify-center gap-4 bg-black/80">
        <Button size="icon" variant="secondary" onClick={toggleMute} className="rounded-full h-12 w-12">
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <Button size="icon" onClick={endCall} className="rounded-full h-14 w-14 bg-destructive hover:bg-destructive/90">
          <PhoneOff className="h-6 w-6" />
        </Button>
        <Button size="icon" variant="secondary" onClick={toggleCam} className="rounded-full h-12 w-12">
          {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}