import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/ai/gemini_client.dart';

/// Diário de Voz — paridade com `src/services/voiceJournal.ts` da web.
///
/// Fluxo (idêntico ao web, zero backend):
///   1. GRAVAÇÃO local (pacote `record` — substitui o MediaRecorder web);
///   2. UPLOAD para o bucket `voice-journals/{uid}/{ts}.m4a`
///      (storage RLS da migração 20260827000000);
///   3. INSERT em `voice_journals` (processing_status 'pending');
///   4. ANÁLISE IA via Gemini áudio → transcript + mood + sintomas +
///      palavras-chave + resumo + insight (JSON);
///   5. UPDATE da linha (status 'completed').
/// Sem chave IA: a gravação fica pendente e o utilizador pode escrever
/// a nota manualmente (o campo notes vive em ai_summary como fallback).
class VoiceEntry {
  const VoiceEntry({
    required this.id,
    required this.audioUrl,
    required this.durationSeconds,
    this.transcript,
    this.transcriptLanguage,
    this.transcriptConfidence,
    this.detectedMood,
    this.detectedSymptoms = const [],
    this.detectedKeywords = const [],
    this.aiSummary,
    this.aiInsight,
    required this.recordedAt,
    this.status = 'pending',
  });

  final String id;
  final String audioUrl;
  final int durationSeconds;
  final String? transcript;
  final String? transcriptLanguage;
  final double? transcriptConfidence;
  final String? detectedMood; // happy|calm|sad|anxious|angry|neutral|tired
  final List<String> detectedSymptoms;
  final List<String> detectedKeywords;
  final String? aiSummary;
  final String? aiInsight;
  final DateTime recordedAt;
  final String status; // pending|transcribing|analyzing|completed|failed

  bool get isDone => status == 'completed';
  bool get isFailed => status == 'failed';

  static const _moodEmoji = {
    'happy': '😊',
    'calm': '😌',
    'sad': '😔',
    'anxious': '😰',
    'angry': '😠',
    'tired': '🥱',
    'neutral': '🙂',
  };
  String get moodEmoji => _moodEmoji[detectedMood] ?? '🎙️';

  static VoiceEntry fromMap(Map<String, dynamic> m) => VoiceEntry(
        id: m['id'] as String,
        audioUrl: (m['audio_url'] ?? '') as String,
        durationSeconds: (m['duration_seconds'] as int?) ?? 0,
        transcript: m['transcript'] as String?,
        transcriptLanguage: m['transcript_language'] as String?,
        transcriptConfidence: (m['transcript_confidence'] as num?)?.toDouble(),
        detectedMood: m['detected_mood'] as String?,
        detectedSymptoms:
            ((m['detected_symptoms'] as List<dynamic>?) ?? const [])
                .map((e) => e as String)
                .toList(),
        detectedKeywords:
            ((m['detected_keywords'] as List<dynamic>?) ?? const [])
                .map((e) => e as String)
                .toList(),
        aiSummary: m['ai_summary'] as String?,
        aiInsight: m['ai_insight'] as String?,
        recordedAt: DateTime.parse(m['recorded_at'] as String).toLocal(),
        status: (m['processing_status'] ?? 'pending') as String,
      );
}

class VoiceJournalRepository {
  VoiceJournalRepository(this._sb);
  final SupabaseClient _sb;

  String? get _uid => _sb.auth.currentUser?.id;

  Future<List<VoiceEntry>> fetchEntries({int limit = 20}) async {
    final rows = await _sb
        .from('voice_journals')
        .select()
        .order('recorded_at', ascending: false)
        .limit(limit);
    return (rows as List)
        .map((m) => VoiceEntry.fromMap(m as Map<String, dynamic>))
        .toList();
  }

  /// Cria a entrada: upload + insert. Devolve a entrada ainda pendente.
  Future<VoiceEntry> createEntry({
    required String filePath,
    required int durationSeconds,
    String mimeType = 'audio/mp4',
  }) async {
    final uid = _uid;
    if (uid == null) throw const AuthException('Sessão necessária');

    final ext = mimeType == 'audio/mp4' ? 'm4a' : 'wav';
    final path = '$uid/${DateTime.now().millisecondsSinceEpoch}.$ext';
    final bytes = await File(filePath).readAsBytes();
    await _sb.storage.from('voice-journals').uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(
            contentType: mimeType,
            cacheControl: '3600',
          ),
        );

    final row = await _sb
        .from('voice_journals')
        .insert({
          'user_id': uid,
          'audio_url': path,
          'duration_seconds': durationSeconds,
          'processing_status': 'pending',
        })
        .select()
        .single();
    return VoiceEntry.fromMap(row);
  }

  /// Análise IA de uma entrada pendente (transcrição + humor + insight).
  Future<VoiceEntry> analyze(VoiceEntry entry) async {
    final updated = await _sb
        .from('voice_journals')
        .update({'processing_status': 'transcribing'})
        .eq('id', entry.id)
        .select()
        .single();

    try {
      final bytes =
          await _sb.storage.from('voice-journals').download(entry.audioUrl);
      final prompt = '''
Estás a ouvir um diário de voz pessoal sobre saúde e bem-estar.
Analisa o áudio e responde APENAS com JSON válido (sem markdown):
{
  "transcript": "transcrição completa na língua falada",
  "language": "código ISO 639-1 (pt, en, es, fr, hi, sw…)",
  "confidence": 0.0 a 1.0,
  "mood": "happy | calm | sad | anxious | angry | neutral | tired",
  "symptoms": ["sintomas mencionados"],
  "keywords": ["tópicos principais"],
  "summary": "resumo em 1 frase",
  "insight": "insight empático em 2-3 frases, SEM conselho médico — valida sentimentos e sugere 1 pequeno passo de bem-estar"
}
Se não ouvires claramente, define confidence baixo.''';
      final raw = await geminiAnalyzeAudio(
        prompt: prompt,
        audioBase64: base64Encode(bytes),
      );
      final json = extractJson(raw);
      if (json == null) throw const GeminiUnavailable('JSON inválido');
      final row = await _sb
          .from('voice_journals')
          .update({
            'transcript': json['transcript'] as String?,
            'transcript_language': json['language'] as String?,
            'transcript_confidence': (json['confidence'] as num?)?.toDouble(),
            'detected_mood': json['mood'] as String?,
            'detected_symptoms': (json['symptoms'] as List<dynamic>? ?? const [])
                .map((e) => e as String)
                .toList(),
            'detected_keywords': (json['keywords'] as List<dynamic>? ?? const [])
                .map((e) => e as String)
                .toList(),
            'ai_summary': json['summary'] as String?,
            'ai_insight': json['insight'] as String?,
            'processing_status': 'completed',
          })
          .eq('id', entry.id)
          .select()
          .single();
      return VoiceEntry.fromMap(row);
    } on GeminiUnavailable {
      final row = await _sb
          .from('voice_journals')
          .update({'processing_status': 'pending'})
          .eq('id', entry.id)
          .select()
          .single();
      return VoiceEntry.fromMap(row);
    } catch (_) {
      final row = await _sb
          .from('voice_journals')
          .update({'processing_status': 'pending'})
          .eq('id', entry.id)
          .select()
          .single();
      return VoiceEntry.fromMap(row);
    }
  }

  /// Nota escrita manual (fallback sem IA) — vai para ai_summary e
  /// fecha o processamento.
  Future<VoiceEntry> saveManualNote(String id, String note) async {
    final row = await _sb
        .from('voice_journals')
        .update({'ai_summary': note, 'processing_status': 'completed'})
        .eq('id', id)
        .select()
        .single();
    return VoiceEntry.fromMap(row);
  }

  Future<void> delete(String id) async {
    await _sb.from('voice_journals').delete().eq('id', id);
  }
}

final voiceJournalRepositoryProvider = Provider<VoiceJournalRepository>(
    (ref) => VoiceJournalRepository(Supabase.instance.client));

/// Timer helper para a UI (duração da gravação).
Stream<int> recordingTicker() async* {
  var i = 0;
  while (true) {
    yield i;
    i++;
    await Future<void>.delayed(const Duration(seconds: 1));
  }
}