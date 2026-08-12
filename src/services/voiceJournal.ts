/**
 * Voice Journal Service
 * Audio diary with Speech-to-Text + AI mood/insight extraction.
 *
 * Strategy:
 *  1. Record audio via MediaRecorder (browser-native, no SDK)
 *  2. Upload to Supabase storage (voice-journals bucket)
 *  3. Send audio to Gemini (supports audio input via inlineData)
 *     - Gemini transcribes + detects mood + symptoms + keywords + insight
 *  4. Fallback: Web Speech API for real-time browser transcription
 *  5. Save transcript + AI analysis to voice_journals table
 *
 * Tables: voice_journals
 */

import { supabase as typedSupabase } from '@/integrations/supabase/client';
// Cast para acesso a tabelas ainda não presentes nos tipos gerados
const supabase = typedSupabase as any;
import { isGeminiConfigured } from '@/lib/gemini';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const AUDIO_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];

export type ProcessingStatus = 'pending' | 'transcribing' | 'analyzing' | 'completed' | 'failed';

export type DetectedMood = 'happy' | 'calm' | 'sad' | 'anxious' | 'angry' | 'neutral' | 'tired';

export interface VoiceJournalEntry {
  id?: string;
  user_id?: string;
  audio_url: string;
  duration_seconds: number;
  transcript?: string;
  transcript_language?: string;
  transcript_confidence?: number;
  detected_mood?: DetectedMood;
  detected_symptoms?: string[];
  detected_keywords?: string[];
  ai_summary?: string;
  ai_insight?: string;
  recorded_at?: string;
  created_at?: string;
  processing_status?: ProcessingStatus;
}

export interface AudioAnalysisResult {
  transcript: string;
  language: string;
  confidence: number;
  mood: DetectedMood;
  symptoms: string[];
  keywords: string[];
  summary: string;
  insight: string;
}

/* ---------- Recording ---------- */

export interface RecordingController {
  start: () => Promise<void>;
  stop: () => Promise<{ blob: Blob; durationSeconds: number } | null>;
  cancel: () => void;
  isRecording: () => boolean;
  getAnalyser: () => AnalyserNode | null;
}

/**
 * Create a recording controller using MediaRecorder.
 * Captures audio via microphone, emits amplitude data via AnalyserNode.
 */
export function createRecordingController(): RecordingController {
  let mediaRecorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: Blob[] = [];
  let startTime = 0;
  let analyser: AnalyserNode | null = null;
  let audioContext: AudioContext | null = null;

  const isRecording = () => mediaRecorder?.state === 'recording';

  const start = async () => {
    if (isRecording()) return;
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    chunks = [];
    const mimeType = pickMimeType();
    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.start(1000); // collect every 1s
    startTime = Date.now();
  };

  const stop = () => {
    return new Promise<{ blob: Blob; durationSeconds: number } | null>((resolve) => {
      if (!mediaRecorder || !isRecording()) {
        resolve(null);
        return;
      }
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mediaRecorder?.mimeType || 'audio/webm' });
        const durationSeconds = Math.round((Date.now() - startTime) / 1000);
        cleanup();
        resolve({ blob, durationSeconds });
      };
      mediaRecorder.stop();
    });
  };

  const cancel = () => {
    if (mediaRecorder && isRecording()) {
      try { mediaRecorder.stop(); } catch { /* noop */ }
    }
    cleanup();
  };

  const cleanup = () => {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    if (audioContext?.state !== 'closed') {
      audioContext?.close().catch(() => {});
    }
    audioContext = null;
    analyser = null;
    mediaRecorder = null;
    chunks = [];
  };

  const getAnalyser = () => analyser;

  return { start, stop, cancel, isRecording, getAnalyser };
}

function pickMimeType(): string | undefined {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c;
  }
  return undefined;
}

/* ---------- Upload ---------- */

export async function uploadVoiceAudio(userId: string, blob: Blob): Promise<string> {
  const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('ogg') ? 'ogg' : 'm4a';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('voice-journals').upload(path, blob, {
    contentType: blob.type,
    cacheControl: '3600',
  });
  if (error) throw new Error(error.message);
  return path;
}

/* ---------- AI Analysis (audio → text + mood + insight) ---------- */

/**
 * Send audio to Gemini for transcription + analysis.
 * Returns null if Gemini is not configured (caller should fall back to Web Speech API).
 */
export async function analyzeAudioWithGemini(blob: Blob): Promise<AudioAnalysisResult | null> {
  if (!isGeminiConfigured()) return null;

  const base64 = await blobToBase64(blob);
  const prompt = `Estás a ouvir um diário de voz pessoal sobre saúde e bem-estar.
Analisa o áudio e responde APENAS com JSON válido (sem markdown) neste formato:
{
  "transcript": "transcrição completa palavra-a-palavra na língua falada",
  "language": "código ISO 639-1 (pt, en, es, fr, hi, sw, etc.)",
  "confidence": 0.0 a 1.0,
  "mood": "happy | calm | sad | anxious | angry | neutral | tired",
  "symptoms": ["sintomas mencionados, ex: dor de cabeça, insónia, fadiga"],
  "keywords": ["tópicos principais, ex: trabalho, família, sono"],
  "summary": "resumo em 1 frase do que a pessoa partilhou",
  "insight": "insight empático e prático em 2-3 frases. NÃO dês conselho médico. Valida os sentimentos, sugere 1 pequeno passo de bem-estar."
}
Se não conseguires ouvir claramente, define confidence baixo e transcribe o que entenderes.`;

  const inlineData = {
    mimeType: blob.type || 'audio/webm',
    data: base64,
  };

  let lastError: unknown = null;
  for (const model of AUDIO_MODELS) {
    try {
      const url = `${BASE_URL}/${model}:generateContent?key=${API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1000, topP: 0.9 },
        }),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(`Gemini ${response.status}: ${(errBody as any)?.error?.message ?? response.statusText}`);
      }
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Resposta sem JSON');
      const parsed = JSON.parse(jsonMatch[0]) as AudioAnalysisResult;
      return parsed;
    } catch (e) {
      lastError = e;
      continue;
    }
  }
  console.warn('[voiceJournal] Gemini audio analysis failed:', lastError);
  return null;
}

/* ---------- Web Speech API fallback (browser-native) ---------- */

export interface WebSpeechResult {
  transcript: string;
  language: string;
  confidence: number;
}

/**
 * Use the Web Speech API (browser-native) to transcribe speech in real time.
 * This is free and works offline in Chrome/Edge. Returns a controller that
 * the caller can use to start/stop and collect interim results.
 */
export function createWebSpeechController(onResult: (r: WebSpeechResult, isFinal: boolean) => void): {
  start: (lang: string) => Promise<void>;
  stop: () => void;
  isSupported: () => boolean;
} {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  let recognition: any = null;

  return {
    isSupported: () => Boolean(SpeechRecognition),
    start: async (lang: string) => {
      if (!SpeechRecognition) throw new Error('Web Speech API not supported');
      recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i];
          if (r.isFinal) final += r[0].transcript;
          else interim += r[0].transcript;
        }
        if (final) onResult({ transcript: final, language: lang, confidence: 0.9 }, true);
        else if (interim) onResult({ transcript: interim, language: lang, confidence: 0.5 }, false);
      };
      recognition.onerror = (e: any) => console.warn('[webSpeech] error:', e.error);
      recognition.start();
    },
    stop: () => {
      try { recognition?.stop(); } catch { /* noop */ }
    },
  };
}

/* ---------- DB operations ---------- */

export async function saveVoiceJournal(userId: string, entry: Omit<VoiceJournalEntry, 'id' | 'user_id'>): Promise<VoiceJournalEntry> {
  const { data, error } = await supabase
    .from('voice_journals')
    .insert({ user_id: userId, ...entry })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getVoiceJournals(userId: string, limit = 30): Promise<VoiceJournalEntry[]> {
  const { data, error } = await supabase
    .from('voice_journals')
    .select('*')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteVoiceJournal(id: string): Promise<void> {
  const { error } = await supabase.from('voice_journals').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getPublicAudioUrl(audioPath: string): Promise<string | null> {
  const { data } = supabase.storage.from('voice-journals').createSignedUrl(audioPath, 3600);
  return data?.signedUrl ?? null;
}

/* ---------- Mood helpers ---------- */

export const MOOD_LABELS: Record<DetectedMood, { label: string; emoji: string; color: string }> = {
  happy: { label: 'Feliz', emoji: '😊', color: '#F59E0B' },
  calm: { label: 'Calmo', emoji: '😌', color: '#10B981' },
  sad: { label: 'Triste', emoji: '😢', color: '#3B82F6' },
  anxious: { label: 'Ansioso', emoji: '😰', color: '#8B5CF6' },
  angry: { label: 'Irritado', emoji: '😤', color: '#EF4444' },
  neutral: { label: 'Neutro', emoji: '😐', color: '#64748B' },
  tired: { label: 'Cansado', emoji: '😴', color: '#06B6D4' },
};

/** Format duration in MM:SS */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/* ---------- util ---------- */

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // strip data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
