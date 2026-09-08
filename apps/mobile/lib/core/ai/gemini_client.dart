/// Cliente Gemini partilhado — espelha EXACTAMENTE a estratégia da web
/// (`src/lib/gemini.ts`): chamada HTTPS directa a
/// `generativelanguage.googleapis.com` SEM SDK (bundle leve), com:
///   • chave por `--dart-define=GEMINI_API_KEY=...` (opt-in, como FCM);
///   • cadeia de modelos com fallback (flash → flash-lite → 1.5-flash);
///   • degradação graciosa: `GeminiUnavailable` devolvido quando a chave
///     falta/quota esgota/rede falha — cada ecrã mostra o seu fallback
///     (a web faz o mesmo com a "simulação local").
/// Zero alterações de backend: a IA corre no dispositivo, os RESULTADOS
/// são persistidos nas MESMAS tabelas que a web já usa (meddy_messages,
/// vision_scans, voice_journals).
library;

import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

const _kApiKey = String.fromEnvironment('GEMINI_API_KEY');

/// Modelos em ordem de preferência (iguais aos da web + 1.5 legacy).
const _kChatModels = <String>[
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
];
const _kAudioModels = <String>['gemini-2.0-flash', 'gemini-1.5-flash'];

const _kBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

/// A chave está configurada e parece válida?
bool get isGeminiConfigured =>
    _kApiKey.isNotEmpty && !_kApiKey.contains('your_') && _kApiKey.length > 20;

/// Mensagem pronta a mostrar quando a IA não está disponível.
const String kGeminiUnavailableHint =
    'Assistente IA não configurado nesta instalação. '
    'Adiciona --dart-define=GEMINI_API_KEY=... para activar o Meddy, o '
    'scanner de documentos e a análise de áudio.';

/// Lançada quando TODOS os modelos falham (chave ausente, quota, rede).
class GeminiUnavailable implements Exception {
  const GeminiUnavailable(this.reason);
  final String reason;
  @override
  String toString() => 'GeminiUnavailable: $reason';
}

class GeminiMessage {
  const GeminiMessage({required this.role, required this.text});
  final String role; // 'user' | 'model'
  final String text;

  Map<String, dynamic> toPart() => {
        'role': role,
        'parts': [
          {'text': text},
        ],
      };
}

String? _extractText(Map<String, dynamic> data) {
  final candidates = data['candidates'] as List<dynamic>?;
  if (candidates == null || candidates.isEmpty) return null;
  final content = candidates.first['content'] as Map<String, dynamic>?;
  final parts = content?['parts'] as List<dynamic>?;
  if (parts == null) return null;
  return parts.map((p) => p['text'] as String? ?? '').join().trim();
}

bool _isQuota(String msg) =>
    msg.contains('resource_exhausted') ||
    msg.contains('quota') ||
    msg.contains('429');

/// Chamada centralizada com fallback de modelo — tenta cada modelo em
/// ordem até um responder (mesma lógica de `callGemini` da web).
Future<String> _call(
  List<String> models,
  Map<String, dynamic> body,
) async {
  if (!isGeminiConfigured) throw const GeminiUnavailable('SEM_CHAVE');
  Object? lastError;
  for (final model in models) {
    try {
      final uri = Uri.parse('$_kBaseUrl/$model:generateContent?key=$_kApiKey');
      final res = await http
          .post(
            uri,
            headers: const {'Content-Type': 'application/json'},
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 45));
      if (res.statusCode != 200) {
        final err = jsonDecode(res.body);
        final msg = (err?['error']?['message'] ?? 'HTTP ${res.statusCode}')
            .toString();
        throw GeminiUnavailable(_isQuota(msg.toLowerCase()) ? 'QUOTA' : msg);
      }
      final text = _extractText(jsonDecode(res.body) as Map<String, dynamic>);
      if (text == null || text.isEmpty) {
        throw const GeminiUnavailable('RESPOSTA_VAZIA');
      }
      return text;
    } on GeminiUnavailable catch (e) {
      lastError = e;
      continue;
    } on TimeoutException {
      lastError = const GeminiUnavailable('TIMEOUT');
      continue;
    } catch (e) {
      lastError = e;
      continue;
    }
  }
  throw GeminiUnavailable(
      lastError is GeminiUnavailable ? lastError.reason : '$lastError');
}

/// Chat com system prompt + histórico — espelha `geminiChat` da web.
Future<String> geminiChat(
  String prompt, {
  String? systemPrompt,
  double temperature = 0.7,
  int maxOutputTokens = 1024,
  List<GeminiMessage> history = const [],
}) {
  return _call(_kChatModels, {
    'contents': [
      ...history.map((m) => m.toPart()),
      {
        'role': 'user',
        'parts': [
          {'text': prompt},
        ],
      },
    ],
    if (systemPrompt != null)
      'systemInstruction': {
        'parts': [
          {'text': systemPrompt},
        ],
      },
    'generationConfig': {
      'temperature': temperature,
      'maxOutputTokens': maxOutputTokens,
      'topP': 0.9,
    },
  });
}

/// Visão — imagem base64 + prompt, devolve texto (tipicamente JSON).
/// `mimeType` típico: 'image/jpeg'.
Future<String> geminiAnalyzeImage({
  required String prompt,
  required String imageBase64,
  String mimeType = 'image/jpeg',
  double temperature = 0.2,
}) {
  return _call(_kChatModels, {
    'contents': [
      {
        'role': 'user',
        'parts': [
          {'text': prompt},
          {
            'inlineData': {'mimeType': mimeType, 'data': imageBase64},
          },
        ],
      }
    ],
    'generationConfig': {
      'temperature': temperature,
      'maxOutputTokens': 1200,
    },
  });
}

/// Áudio → transcrição + análise (JSON) — espelha `analyzeAudioWithGemini`
/// da web (`voiceJournal.ts`), incluindo o par de modelos de áudio.
Future<String> geminiAnalyzeAudio({
  required String prompt,
  required String audioBase64,
  String mimeType = 'audio/mp4',
}) {
  return _call(_kAudioModels, {
    'contents': [
      {
        'role': 'user',
        'parts': [
          {'text': prompt},
          {
            'inlineData': {'mimeType': mimeType, 'data': audioBase64},
          },
        ],
      }
    ],
    'generationConfig': {
      'temperature': 0.3,
      'maxOutputTokens': 1000,
    },
  });
}

/// Extrai o primeiro objecto JSON de um texto (tolera ```json …``` e
/// texto à volta) — comportamento idêntico ao regex da web.
Map<String, dynamic>? extractJson(String text) {
  final start = text.indexOf('{');
  if (start < 0) return null;
  var depth = 0;
  var inString = false;
  var escaped = false;
  for (var i = start; i < text.length; i++) {
    final c = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (c == r'\') {
      escaped = true;
      continue;
    }
    if (c == '"') inString = !inString;
    if (inString) continue;
    if (c == '{') {
      depth++;
    } else if (c == '}') {
      depth--;
      if (depth == 0) {
        try {
          return jsonDecode(text.substring(start, i + 1))
              as Map<String, dynamic>;
        } catch (_) {
          return null;
        }
      }
    }
  }
  return null;
}
