import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';

export default function VideoConsultation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const wrapRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'ended' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !user || !wrapRef.current) return;
    let disposed = false;

    (async () => {
      const { data, error } = await supabase.functions.invoke('daily-room', {
        body: { consultation_id: id },
      });
      if (disposed) return;
      if (error || !data?.room_url) {
        setError(data?.error || error?.message || 'Falha a criar sala');
        setStatus('error');
        return;
      }
      sessionIdRef.current = data.session_id;
      const role = data.is_owner ? 'doctor' : 'patient';

      const frame = DailyIframe.createFrame(wrapRef.current!, {
        iframeStyle: { width: '100%', height: '100%', border: '0' },
        showLeaveButton: true,
        showFullscreenButton: true,
      });
      callRef.current = frame;

      frame
        .on('joined-meeting', async () => {
          setStatus('ready');
          if (sessionIdRef.current) {
            await supabase.rpc('video_session_add_participant', {
              _session_id: sessionIdRef.current,
              _user_id: user.id,
              _role: role,
            });
          }
        })
        .on('left-meeting', async () => {
          if (sessionIdRef.current) {
            await supabase.rpc('video_session_end', {
              _session_id: sessionIdRef.current,
              _reason: 'hangup',
            });
          }
          // Auto-complete consultation if the doctor left
          if (data.is_owner && id) {
            await supabase.rpc('mark_consultation_completed', { _id: id });
          }
          setStatus('ended');
          navigate('/health/consultations');
        })
        .on('error', (e: any) => {
          setError(e?.errorMsg || 'Erro na chamada');
          setStatus('error');
        });

      await frame.join({ url: data.room_url, token: data.token });
    })();

    return () => {
      disposed = true;
      callRef.current?.destroy().catch(() => {});
      callRef.current = null;
    };
  }, [id, user, navigate]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-3 flex items-center gap-3 bg-black/60 z-10">
        <Button variant="ghost" size="icon" onClick={() => callRef.current?.leave() ?? navigate(-1)} className="text-white">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <p className="font-semibold text-sm">Vídeo-consulta</p>
          <p className="text-xs opacity-70">
            {status === 'ready' ? 'Ligado' : status === 'ended' ? 'Terminada' : status === 'error' ? 'Erro' : 'A ligar…'}
          </p>
        </div>
      </header>
      <div ref={wrapRef} className="flex-1 relative bg-neutral-900">
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm opacity-80">{error}</p>
            <Button onClick={() => navigate('/health/consultations')} variant="secondary">Voltar</Button>
          </div>
        )}
      </div>
    </div>
  );
}