/**
 * Maps app locales to speech recognition (STT) and text-to-speech (TTS) language codes.
 *
 * - `stt`: BCP-47 tag used by Web Speech API (recognition.lang) — must be supported by the browser.
 * - `tts`: BCP-47 tag for Google Cloud TTS (languageCode) and SpeechSynthesis (utterance.lang).
 * - `voice`: Google Cloud TTS Neural2 voice name for best quality.
 */

interface SpeechLocaleEntry {
  stt: string;
  tts: string;
  voice?: string;
}

const SPEECH_LOCALE_MAP: Record<string, SpeechLocaleEntry> = {
  pt:     { stt: 'pt-PT', tts: 'pt-PT', voice: 'pt-PT-Neural2-A' },
  'pt-BR': { stt: 'pt-BR', tts: 'pt-BR', voice: 'pt-BR-Neural2-A' },
  en:     { stt: 'en-US', tts: 'en-US', voice: 'en-US-Neural2-A' },
  es:     { stt: 'es-ES', tts: 'es-ES', voice: 'es-ES-Neural2-A' },
  fr:     { stt: 'fr-FR', tts: 'fr-FR', voice: 'fr-FR-Neural2-A' },
  hi:     { stt: 'hi-IN', tts: 'hi-IN', voice: 'hi-IN-Neural2-A' },
  sw:     { stt: 'sw-TZ', tts: 'sw-KE', voice: undefined }, // Google TTS uses sw-KE, STT uses sw-TZ
  af:     { stt: 'af-ZA', tts: 'af-ZA', voice: undefined }, // No Neural2 for Afrikaans
  am:     { stt: 'am-ET', tts: 'am-ET', voice: undefined }, // No Neural2 for Amharic
};

/** Default fallback to Portuguese (Mozambique default) */
const DEFAULT_ENTRY: SpeechLocaleEntry = SPEECH_LOCALE_MAP['pt'];

/**
 * Returns the speech locale entry for a given app locale code.
 * Falls back to Portuguese if the locale is not found.
 */
export function getSpeechLocale(locale: string): SpeechLocaleEntry {
  return SPEECH_LOCALE_MAP[locale] || DEFAULT_ENTRY;
}

export type { SpeechLocaleEntry };
