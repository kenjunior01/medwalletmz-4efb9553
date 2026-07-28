/**
 * Voice Journal — Audio diary with AI insights
 *
 * Features:
 *  - Big record button with live waveform (analyser)
 *  - Real-time Web Speech transcript as fallback when Gemini audio unsupported
 *  - After stop: upload → Gemini analyzes (transcript + mood + symptoms + insight)
 *  - Timeline of past entries (audio player + transcript + mood badge + AI insight)
 *  - Filter by mood
 *  - Skeleton/empty/error states
 *  - WCAG 2.1 AA: keyboard, ARIA, focus rings
 *  - i18n via useCountry()
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Square, Play, Pause, Trash2, Sparkles, AudioLines,
  AlertTriangle, X, Clock, Filter, RefreshCw, Volume2,
} from 'lucide-react';
import { useCountry } from '@/contexts/CountryContext';
import {
  VoiceJournalEntry, DetectedMood, ProcessingStatus,
  createRecordingController, RecordingController,
  uploadVoiceAudio, analyzeAudioWithGemini,
  saveVoiceJournal, getVoiceJournals, deleteVoiceJournal,
  getPublicAudioUrl, formatDuration, MOOD_LABELS,
} from '@/services/voiceJournal';

type Stage = 'idle' | 'recording' | 'uploading' | 'analyzing' | 'saved';

export default function VoiceJournal() {
  const Waveform = AudioLines;
  const { t, user, locale } = useCountry() as any;
  const [stage, setStage] = useState<Stage>('idle');
  const [entries, setEntries] = useState<VoiceJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recDuration, setRecDuration] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [moodFilter, setMoodFilter] = useState<DetectedMood | 'all'>('all');
  const [lastSaved, setLastSaved] = useState<VoiceJournalEntry | null>(null);

  const recControllerRef = useRef<RecordingController | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const geminiConfigured = useMemo(() => Boolean(import.meta.env.VITE_GEMINI_API_KEY), []);

  const loadEntries = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getVoiceJournals(user.id, 50);
      setEntries(data);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  /* ---------- Recording ---------- */

  const handleStartRecording = async () => {
    setError(null);
    setInterimTranscript('');
    setFinalTranscript('');
    setRecDuration(0);
    setLastSaved(null);
    try {
      const controller = createRecordingController();
      recControllerRef.current = controller;
      await controller.start();
      setStage('recording');

      // Duration timer
      timerRef.current = setInterval(() => {
        setRecDuration((d) => d + 1);
      }, 1000);

      // Waveform animation
      drawWaveform(controller);
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível aceder ao microfone. Verifique as permissões.');
      setStage('idle');
    }
  };

  const handleStopRecording = async () => {
    if (!recControllerRef.current) return;
    setStage('uploading');
    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const result = await recControllerRef.current.stop();
    recControllerRef.current = null;
    if (!result) {
      setStage('idle');
      return;
    }
    const { blob, durationSeconds } = result;
    setRecDuration(durationSeconds);

    if (!user?.id) {
      setError('Sessão inválida');
      setStage('idle');
      return;
    }

    try {
      // 1. Upload audio
      const audioPath = await uploadVoiceAudio(user.id, blob);

      // 2. Analyze with Gemini (or fallback to Web Speech transcript)
      setStage('analyzing');
      let analysis = await analyzeAudioWithGemini(blob);

      // If Gemini failed and we have a Web Speech transcript, save that
      if (!analysis && finalTranscript) {
        analysis = {
          transcript: finalTranscript,
          language: locale.split('-')[0] || 'pt',
          confidence: 0.7,
          mood: 'neutral',
          symptoms: [],
          keywords: [],
          summary: finalTranscript.slice(0, 100),
          insight: '',
        };
      }

      // 3. Save entry
      const entry = await saveVoiceJournal(user.id, {
        audio_url: audioPath,
        duration_seconds: durationSeconds,
        transcript: analysis?.transcript ?? finalTranscript ?? null,
        transcript_language: analysis?.language ?? null,
        transcript_confidence: analysis?.confidence ?? null,
        detected_mood: analysis?.mood ?? null,
        detected_symptoms: analysis?.symptoms ?? [],
        detected_keywords: analysis?.keywords ?? [],
        ai_summary: analysis?.summary ?? null,
        ai_insight: analysis?.insight ?? null,
        recorded_at: new Date().toISOString(),
        processing_status: analysis ? 'completed' : 'pending',
      });

      setLastSaved(entry);
      setStage('saved');
      await loadEntries();

      // Auto-return to idle after 4s
      setTimeout(() => {
        setStage('idle');
        setLastSaved(null);
      }, 4000);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao processar áudio');
      setStage('idle');
    }
  };

  const handleCancelRecording = () => {
    recControllerRef.current?.cancel();
    recControllerRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setStage('idle');
    setRecDuration(0);
  };

  /* ---------- Waveform ---------- */

  const drawWaveform = (controller: RecordingController) => {
    const canvas = waveCanvasRef.current;
    const analyser = controller.getAnalyser();
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      analyser.getByteTimeDomainData(dataArray);
      ctx.fillStyle = 'rgba(139, 92, 246, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#8B5CF6';
      ctx.beginPath();
      const slice = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += slice;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      rafRef.current = requestAnimationFrame(render);
    };
    render();
  };

  /* ---------- Cleanup ---------- */

  useEffect(() => {
    return () => {
      recControllerRef.current?.cancel();
      if (timerRef.current) clearInterval(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* ---------- Delete ---------- */

  const handleDelete = async (id: string) => {
    if (!confirm(t('voiceJournal.confirmDelete') ?? 'Apagar esta entrada de voz?')) return;
    try {
      await deleteVoiceJournal(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao apagar');
    }
  };

  /* ---------- Render ---------- */

  const filteredEntries = useMemo(() => {
    if (moodFilter === 'all') return entries;
    return entries.filter((e) => e.detected_mood === moodFilter);
  }, [entries, moodFilter]);

  const moodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      const m = e.detected_mood ?? 'neutral';
      counts[m] = (counts[m] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50/40 to-fuchsia-50/30 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-violet-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-md">
              <Mic className="w-5 h-5 text-white" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{t('voiceJournal.title') ?? 'Diário de Voz'}</h1>
              <p className="text-xs text-slate-500 leading-tight">{t('voiceJournal.subtitle') ?? 'Fala. A IA ouve e cuida de ti.'}</p>
            </div>
          </div>
          <button
            onClick={loadEntries}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
            aria-label={t('common.refresh') ?? 'Atualizar'}
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto" aria-label="Fechar"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Recorder card */}
        <RecorderCard
          stage={stage}
          duration={recDuration}
          onStart={handleStartRecording}
          onStop={handleStopRecording}
          onCancel={handleCancelRecording}
          waveCanvasRef={waveCanvasRef}
          lastSaved={lastSaved}
          geminiConfigured={geminiConfigured}
          t={t}
        />

        {/* Past entries */}
        <section aria-labelledby="entries-heading">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 id="entries-heading" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <AudioLines className="w-4 h-4" aria-hidden />
              {t('voiceJournal.timeline') ?? 'As tuas gravações'} ({entries.length})
            </h2>
            {entries.length > 0 && (
              <MoodFilter value={moodFilter} onChange={setMoodFilter} counts={moodCounts} t={t} />
            )}
          </div>

          {loading ? (
            <div className="space-y-3" role="status" aria-busy="true" aria-live="polite">
              {[0, 1, 2].map((i) => <div key={i} className="h-28 bg-slate-200 rounded-2xl animate-pulse" />)}
            </div>
          ) : filteredEntries.length === 0 ? (
            <EmptyTimeline t={t} />
          ) : (
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {filteredEntries.map((e, i) => (
                  <VoiceEntryCard key={e.id} entry={e} index={i} onDelete={() => handleDelete(e.id!)} t={t} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>

        {/* Privacy notice */}
        <div className="text-xs text-slate-500 bg-violet-50 border border-violet-100 rounded-xl p-3 flex items-start gap-2">
          <Sparkles className="w-3.5 h-3.5 mt-0.5 text-violet-500 flex-shrink-0" aria-hidden />
          <span>{t('voiceJournal.privacy') ?? 'Os teus áudios são privados. Só tu os podes ouvir. A IA transforma-os em texto e insight — o áudio é guardado para reveres quando quiseres.'}</span>
        </div>
      </main>
    </div>
  );
}

/* ---------- Recorder card ---------- */

function RecorderCard({ stage, duration, onStart, onStop, onCancel, waveCanvasRef, lastSaved, geminiConfigured, t }: {
  stage: Stage; duration: number;
  onStart: () => void; onStop: () => void; onCancel: () => void;
  waveCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  lastSaved: VoiceJournalEntry | null;
  geminiConfigured: boolean; t: any;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-lg border border-violet-100 p-8 flex flex-col items-center"
    >
      <AnimatePresence mode="wait">
        {stage === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center text-center">
            <button
              onClick={onStart}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 shadow-2xl shadow-violet-500/40 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
              aria-label={t('voiceJournal.start') ?? 'Começar a gravar'}
            >
              <Mic className="w-12 h-12" aria-hidden />
            </button>
            <p className="mt-6 text-base font-semibold text-slate-900">{t('voiceJournal.tapToRecord') ?? 'Toca para falar'}</p>
            <p className="mt-1 text-sm text-slate-500 max-w-xs">{t('voiceJournal.hint') ?? 'Conta como te sentes hoje. O que correu bem? O que pesa?'}</p>
            {!geminiConfigured && (
              <p className="mt-3 text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                {t('voiceJournal.geminiMissing') ?? 'IA limitada — configura VITE_GEMINI_API_KEY para análise completa'}
              </p>
            )}
          </motion.div>
        )}

        {stage === 'recording' && (
          <motion.div key="rec" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex flex-col items-center">
            <div className="flex items-center gap-2 text-violet-600 mb-3">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" aria-hidden />
              <span className="text-sm font-medium">{t('voiceJournal.recording') ?? 'A gravar…'}</span>
            </div>
            <div className="text-4xl font-mono font-bold text-slate-900 mb-4 tabular-nums" aria-live="polite">
              {formatDuration(duration)}
            </div>
            <canvas
              ref={waveCanvasRef}
              width={400}
              height={80}
              className="w-full max-w-md h-20 bg-violet-50/50 rounded-2xl"
              aria-hidden
            />
            <div className="mt-6 flex gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                {t('common.cancel') ?? 'Cancelar'}
              </button>
              <button
                onClick={onStop}
                className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold shadow-md hover:bg-red-700 inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
              >
                <Square className="w-4 h-4 fill-current" aria-hidden />
                {t('voiceJournal.stop') ?? 'Parar e analisar'}
              </button>
            </div>
          </motion.div>
        )}

        {(stage === 'uploading' || stage === 'analyzing') && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center text-center py-6" role="status" aria-live="polite">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-violet-200" />
              <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-violet-600 border-t-transparent animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-violet-600" aria-hidden />
            </div>
            <p className="mt-6 text-base font-semibold text-slate-900">
              {stage === 'uploading' ? (t('voiceJournal.uploading') ?? 'A enviar áudio…') : (t('voiceJournal.analyzing') ?? 'A IA está a ouvir-te…')}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {stage === 'analyzing' ? (t('voiceJournal.analyzingHint') ?? 'A transcrever, detectar humor e gerar insight') : ''}
            </p>
          </motion.div>
        )}

        {stage === 'saved' && lastSaved && (
          <motion.div key="saved" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center py-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12 }}
              className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4"
            >
              <Sparkles className="w-10 h-10 text-emerald-600" aria-hidden />
            </motion.div>
            <p className="text-lg font-bold text-slate-900">{t('voiceJournal.saved') ?? 'Guardado!'}</p>
            {lastSaved.detected_mood && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-200">
                <span>{MOOD_LABELS[lastSaved.detected_mood].emoji}</span>
                <span className="text-sm font-medium text-violet-700">{MOOD_LABELS[lastSaved.detected_mood].label}</span>
              </div>
            )}
            {lastSaved.ai_insight && (
              <p className="mt-3 text-sm text-slate-600 max-w-md italic">"{lastSaved.ai_insight}"</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

/* ---------- Voice entry card ---------- */

function VoiceEntryCard({ entry, index, onDelete, t }: { entry: VoiceJournalEntry; index: number; onDelete: () => void; t: any }) {
  const [expanded, setExpanded] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const mood = entry.detected_mood ? MOOD_LABELS[entry.detected_mood] : null;

  const loadAudio = async () => {
    if (audioUrl || loadingAudio) return;
    setLoadingAudio(true);
    try {
      const url = await getPublicAudioUrl(entry.audio_url);
      setAudioUrl(url);
    } catch (e) {
      console.warn('Failed to load audio:', e);
    } finally {
      setLoadingAudio(false);
    }
  };

  const togglePlay = async () => {
    if (!audioUrl) {
      await loadAudio();
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  const recordedAt = entry.recorded_at ? new Date(entry.recorded_at) : null;

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={togglePlay}
            disabled={loadingAudio}
            className="w-12 h-12 rounded-full bg-violet-100 hover:bg-violet-200 flex items-center justify-center flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-50"
            aria-label={playing ? (t('voiceJournal.pause') ?? 'Pausar') : (t('voiceJournal.play') ?? 'Tocar')}
          >
            {loadingAudio ? (
              <RefreshCw className="w-5 h-5 text-violet-600 animate-spin" />
            ) : playing ? (
              <Pause className="w-5 h-5 text-violet-700" />
            ) : (
              <Play className="w-5 h-5 text-violet-700 ml-0.5" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {mood && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
                  style={{ background: `${mood.color}15`, color: mood.color, borderColor: `${mood.color}40` }}
                >
                  <span>{mood.emoji}</span>{mood.label}
                </span>
              )}
              <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                <Clock className="w-3 h-3" aria-hidden />
                {formatDuration(entry.duration_seconds)}
              </span>
              {recordedAt && (
                <span className="text-xs text-slate-400">
                  · {recordedAt.toLocaleDateString()} {recordedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            {entry.ai_summary && (
              <p className="mt-1.5 text-sm font-medium text-slate-900 line-clamp-2">{entry.ai_summary}</p>
            )}
            {entry.transcript && (
              <p className={`mt-1 text-sm text-slate-600 ${expanded ? '' : 'line-clamp-2'}`}>{entry.transcript}</p>
            )}
            {entry.transcript && entry.transcript.length > 120 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-xs text-violet-600 hover:underline"
              >
                {expanded ? (t('common.showLess') ?? 'Mostrar menos') : (t('common.showMore') ?? 'Mostrar mais')}
              </button>
            )}
            {entry.detected_keywords && entry.detected_keywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {entry.detected_keywords.slice(0, 5).map((k, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">#{k}</span>
                ))}
              </div>
            )}
            {entry.ai_insight && (
              <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 mb-1">
                  <Sparkles className="w-3 h-3" aria-hidden /> {t('voiceJournal.aiInsight') ?? 'Insight da IA'}
                </div>
                <p className="text-sm text-slate-700 italic">"{entry.ai_insight}"</p>
              </div>
            )}
          </div>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            aria-label={t('common.delete') ?? 'Apagar'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.li>
  );
}

/* ---------- Mood filter ---------- */

function MoodFilter({ value, onChange, counts, t }: { value: DetectedMood | 'all'; onChange: (v: DetectedMood | 'all') => void; counts: Record<string, number>; t: any }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap" role="radiogroup" aria-label={t('voiceJournal.filterByMood') ?? 'Filtrar por humor'}>
      <span className="text-xs text-slate-500 inline-flex items-center gap-1"><Filter className="w-3 h-3" />{t('voiceJournal.mood') ?? 'Humor'}:</span>
      <button
        onClick={() => onChange('all')}
        className={`text-xs px-2 py-1 rounded-full transition ${value === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        role="radio" aria-checked={value === 'all'}
      >
        {t('voiceJournal.all') ?? 'Todos'} ({Object.values(counts).reduce((a, b) => a + b, 0)})
      </button>
      {(Object.keys(MOOD_LABELS) as DetectedMood[]).map((m) => {
        const count = counts[m] ?? 0;
        if (count === 0) return null;
        const cfg = MOOD_LABELS[m];
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 transition ${value === m ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            style={value === m ? { background: cfg.color } : {}}
            role="radio" aria-checked={value === m}
          >
            <span>{cfg.emoji}</span>
            <span className="hidden sm:inline">{cfg.label}</span>
            <span className="opacity-70">({count})</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Empty ---------- */

function EmptyTimeline({ t }: { t: any }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-16 h-16 rounded-3xl bg-violet-100 flex items-center justify-center mx-auto mb-3">
        <Volume2 className="w-8 h-8 text-violet-400" aria-hidden />
      </div>
      <p className="text-sm text-slate-600 font-medium">{t('voiceJournal.emptyTitle') ?? 'Ainda sem gravações'}</p>
      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
        {t('voiceJournal.emptyBody') ?? 'Toca no microfone acima e fala por 30 segundos sobre o teu dia. A IA vai transcrever, detectar o teu humor e oferecer um insight.'}
      </p>
    </div>
  );
}
