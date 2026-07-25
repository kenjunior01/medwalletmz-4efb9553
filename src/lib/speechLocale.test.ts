import { describe, expect, it } from 'vitest';
import { getSpeechLocale } from './speechLocale';

describe('getSpeechLocale', () => {
  it('returns Portuguese-PT for "pt" locale', () => {
    const entry = getSpeechLocale('pt');
    expect(entry.stt).toBe('pt-PT');
    expect(entry.tts).toBe('pt-PT');
    expect(entry.voice).toBe('pt-PT-Neural2-A');
  });

  it('returns Portuguese-BR for "pt-BR" locale', () => {
    const entry = getSpeechLocale('pt-BR');
    expect(entry.stt).toBe('pt-BR');
    expect(entry.tts).toBe('pt-BR');
    expect(entry.voice).toBe('pt-BR-Neural2-A');
  });

  it('returns English-US for "en" locale', () => {
    const entry = getSpeechLocale('en');
    expect(entry.stt).toBe('en-US');
    expect(entry.tts).toBe('en-US');
    expect(entry.voice).toBe('en-US-Neural2-A');
  });

  it('returns Spanish-ES for "es" locale', () => {
    const entry = getSpeechLocale('es');
    expect(entry.stt).toBe('es-ES');
    expect(entry.tts).toBe('es-ES');
    expect(entry.voice).toBe('es-ES-Neural2-A');
  });

  it('returns French-FR for "fr" locale', () => {
    const entry = getSpeechLocale('fr');
    expect(entry.stt).toBe('fr-FR');
    expect(entry.tts).toBe('fr-FR');
    expect(entry.voice).toBe('fr-FR-Neural2-A');
  });

  it('returns Hindi-IN for "hi" locale', () => {
    const entry = getSpeechLocale('hi');
    expect(entry.stt).toBe('hi-IN');
    expect(entry.tts).toBe('hi-IN');
    expect(entry.voice).toBe('hi-IN-Neural2-A');
  });

  it('returns Swahili with TZ for STT and KE for TTS', () => {
    const entry = getSpeechLocale('sw');
    expect(entry.stt).toBe('sw-TZ');
    expect(entry.tts).toBe('sw-KE');
    expect(entry.voice).toBeUndefined();
  });

  it('returns Afrikaans-ZA without Neural2 voice', () => {
    const entry = getSpeechLocale('af');
    expect(entry.stt).toBe('af-ZA');
    expect(entry.tts).toBe('af-ZA');
    expect(entry.voice).toBeUndefined();
  });

  it('returns Amharic-ET without Neural2 voice', () => {
    const entry = getSpeechLocale('am');
    expect(entry.stt).toBe('am-ET');
    expect(entry.tts).toBe('am-ET');
    expect(entry.voice).toBeUndefined();
  });

  it('falls back to Portuguese for unknown locale', () => {
    const entry = getSpeechLocale('xyz');
    expect(entry.stt).toBe('pt-PT');
    expect(entry.tts).toBe('pt-PT');
    expect(entry.voice).toBe('pt-PT-Neural2-A');
  });

  it('falls back to Portuguese for empty string', () => {
    const entry = getSpeechLocale('');
    expect(entry.stt).toBe('pt-PT');
  });

  it('all 9 supported locales return valid entries', () => {
    const locales = ['pt', 'pt-BR', 'en', 'es', 'fr', 'hi', 'sw', 'af', 'am'];
    for (const locale of locales) {
      const entry = getSpeechLocale(locale);
      expect(entry.stt).toBeTruthy();
      expect(entry.tts).toBeTruthy();
      expect(entry.stt.length).toBeGreaterThan(0);
      expect(entry.tts.length).toBeGreaterThan(0);
    }
  });
});
