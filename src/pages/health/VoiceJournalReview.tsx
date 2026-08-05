/**
 * VoiceJournalReview — rever, editar e partilhar a transcrição gerada pela IA
 * antes de a guardar definitivamente no registo do utilizador.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Sparkles, Save, Share2, Play, Pause, RefreshCw, AlertTriangle,
} from '@/components/icons/lucide-compat';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import {
  getVoiceJournal, updateVoiceJournal, getPublicAudioUrl,
  formatDuration, MOOD_LABELS, type VoiceJournalEntry, type DetectedMood,
} from '@/services/voiceJournal';

export default function VoiceJournalReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth() as any;

  const [entry, setEntry] = useState<VoiceJournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [mood, setMood] = useState<DetectedMood | ''>('');
  const [saving, setSaving] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getVoiceJournal(id);
      if (!data) { setError('Gravação não encontrada.'); return; }
      setEntry(data);
      setTranscript(data.transcript ?? '');
      setSummary(data.ai_summary ?? '');
      setMood((data.detected_mood as DetectedMood) ?? '');
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar a gravação.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => () => { audio?.pause(); }, [audio]);

  const togglePlay = async () => {
    if (!entry) return;
    let el = audio;
    if (!el) {
      const url = await getPublicAudioUrl(entry.audio_url);
      if (!url) { toast.error('Não foi possível carregar o áudio.'); return; }
      el = new Audio(url);
      el.onended = () => setPlaying(false);
      setAudio(el);
    }
    if (playing) { el.pause(); setPlaying(false); }
    else { void el.play(); setPlaying(true); }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await updateVoiceJournal(id, {
        transcript: transcript.trim(),
        ai_summary: summary.trim() || undefined,
        detected_mood: (mood || undefined) as DetectedMood | undefined,
        processing_status: 'completed',
      });
      setEntry(updated);
      toast.success('Transcrição atualizada no teu registo.');
      navigate('/health/voice-journal');
    } catch (e: any) {
      toast.error(e?.message ?? 'Não foi possível guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    const text = `${summary ? summary + '\n\n' : ''}${transcript}`.trim();
    if (!text) { toast.error('Nada para partilhar.'); return; }
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Diário de Voz — MedWallet', text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('Transcrição copiada.');
      }
    } catch { /* utilizador cancelou */ }
  };

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="font-semibold">Inicia sessão para rever o teu diário de voz.</p>
        <Button onClick={() => navigate('/auth')}>Entrar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/health/voice-journal')} aria-label="Voltar" className="min-h-[44px] min-w-[44px]">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <div className="flex-1">
          <h1 className="font-bold text-lg">Rever transcrição</h1>
          <p className="text-xs text-muted-foreground">Corrige o texto antes de guardar ou partilhar</p>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        {loading ? (
          <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-48 w-full" /></div>
        ) : error ? (
          <div role="alert" className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {error}
          </div>
        ) : entry ? (
          <>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Button variant="secondary" size="icon" onClick={togglePlay} aria-label={playing ? 'Pausar áudio' : 'Ouvir áudio'} className="rounded-full h-12 w-12">
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{formatDuration(entry.duration_seconds)}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.recorded_at ? new Date(entry.recorded_at).toLocaleString() : ''}
                    {entry.transcript_confidence != null && ` · confiança ${Math.round(entry.transcript_confidence * 100)}%`}
                  </p>
                </div>
                {entry.detected_mood && (
                  <Badge variant="outline">
                    {MOOD_LABELS[entry.detected_mood].emoji} {MOOD_LABELS[entry.detected_mood].label}
                  </Badge>
                )}
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="transcript">Transcrição</Label>
              <Textarea
                id="transcript"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={10}
                placeholder="Escreve ou corrige aqui o que foi dito…"
              />
              <p className="text-xs text-muted-foreground">{transcript.trim().split(/\s+/).filter(Boolean).length} palavras</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Resumo</Label>
              <Textarea id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Humor</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Humor">
                {(Object.keys(MOOD_LABELS) as DetectedMood[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mood === m}
                    onClick={() => setMood(mood === m ? '' : m)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${mood === m ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 border-border hover:bg-muted'}`}
                  >
                    {MOOD_LABELS[m].emoji} {MOOD_LABELS[m].label}
                  </button>
                ))}
              </div>
            </div>

            {entry.ai_insight && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold flex items-center gap-1.5 mb-1"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Insight da IA</p>
                  <p className="text-sm italic text-muted-foreground">"{entry.ai_insight}"</p>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleShare} className="min-h-[44px]">
                <Share2 className="h-4 w-4 mr-2" aria-hidden="true" /> Partilhar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 min-h-[44px]">
                {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" aria-hidden="true" />}
                Guardar alterações
              </Button>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
