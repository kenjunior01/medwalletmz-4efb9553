import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/ai/gemini_client.dart';

/// Meddy — o mascote IA do MedWallet (paridade com
/// `src/services/meddyCoach.ts` da web).
///
/// Usa as MESMAS tabelas: `meddy_conversations` + `meddy_messages`
/// (migração 20260827000000). A conversa persiste e fica disponível
/// também na web — zero alterações de backend.
///
/// A IA corre no dispositivo via `core/ai/gemini_client.dart` (igual à
/// web, que chama o Gemini client-side). Se a chave não estiver
/// configurada, o Meddy responde em "modo local" com orientação segura
/// e encaminha para as funcionalidades do app — a web faz o mesmo.
///
/// Detecção de crise: o prompt pede um marcador `[CRISE]` quando a
/// mensagem sugere risco (auto-lesão, violência, desespero grave) e a
/// app mostra então o cartão da linha de apoio do país (MZ: 847
/// MISAU…), copiado da lista CRISIS_RESOURCES da web.

class MeddyConversation {
  const MeddyConversation({
    required this.id,
    this.context,
    this.messageCount = 0,
    this.moodBefore,
  });

  final String id;
  final String? context;
  final int messageCount;
  final int? moodBefore;

  static MeddyConversation fromMap(Map<String, dynamic> m) =>
      MeddyConversation(
        id: m['id'] as String,
        context: m['context'] as String?,
        messageCount: (m['message_count'] as int?) ?? 0,
        moodBefore: m['mood_before'] as int?,
      );
}

class MeddyMessage {
  const MeddyMessage({
    required this.id,
    required this.role,
    required this.content,
    this.suggestedActions = const [],
    this.isCrisisFlagged = false,
    required this.createdAt,
  });

  final String id;
  final String role; // 'user' | 'assistant'
  final String content;
  final List<MeddyAction> suggestedActions;
  final bool isCrisisFlagged;
  final DateTime createdAt;

  bool get isUser => role == 'user';

  static MeddyMessage fromMap(Map<String, dynamic> m) {
    final raw = m['suggested_actions'] as List<dynamic>? ?? const [];
    return MeddyMessage(
      id: m['id'] as String,
      role: m['role'] as String,
      content: m['content'] as String,
      suggestedActions: raw
          .map((a) => MeddyAction.fromMap(a as Map<String, dynamic>))
          .toList(),
      isCrisisFlagged: (m['is_crisis_flagged'] as bool?) ?? false,
      createdAt: DateTime.parse(m['created_at'] as String).toLocal(),
    );
  }
}

class MeddyAction {
  const MeddyAction({required this.type, required this.label});
  final String type; // book_appointment | open_journal | open_wallet | …
  final String label;

  static MeddyAction fromMap(Map<String, dynamic> m) => MeddyAction(
        type: (m['type'] ?? 'open_services') as String,
        label: (m['label'] ?? 'Abrir') as String,
      );

  Map<String, dynamic> toMap() => {'type': type, 'label': label};
}

/// Linhas de apoio por país (espelho de CRISIS_RESOURCES da web; MZ em
/// primeiro lugar). Chamável via url_launcher `tel:`.
class CrisisResource {
  const CrisisResource(this.countryCode, this.name, this.phone, this.hours);
  final String countryCode;
  final String name;
  final String phone;
  final String hours;

  static const list = <CrisisResource>[
    CrisisResource('MZ', 'Linha de Apoio Psicológico — MISAU', '847',
        '24/7 · gratuito'),
    CrisisResource('AO', 'Linha de Apoio Psicológico', '111', '24/7'),
    CrisisResource('BR', 'CVV — Valorização da Vida', '188', '24/7'),
    CrisisResource('PT', 'SNS 24 — Apoio Psicológico', '808 24 24 24', '24/7'),
    CrisisResource('IN', 'iCall — Mental Health', '9152987821', 'Seg-Sáb 8h-22h'),
    CrisisResource('KE', 'Befrienders Kenya', '+254 722 178 177', '24/7'),
  ];

  static CrisisResource? forCountry(String? code) {
    if (code == null) return list.first;
    for (final r in list) {
      if (r.countryCode.toLowerCase() == code.toLowerCase()) return r;
    }
    return list.first; // fallback MZ
  }
}

/// Prompt do sistema — mesmo tom da web (mascote caloroso, PT-MZ,
/// multilingue, sem substituir médico, marcador de crise).
const String _kSystemPrompt = '''
És o Meddy 🐻, o mascote e assistente de saúde do MedWallet, super-app de
saúde de Moçambique. FALAS em português de Moçambique (adaptas-te à língua
do utilizador: en, es, fr, sw, zu, xh, hi, bn, ar, zh, ru).

O teu papel:
1. Acolher e conversar sobre bem-estar, sintomas leves, medicação (toma,
   horários, esquecimentos) e emoções — com CALOR e simplicidade.
2. Sugerir passos práticos DENTRO do app: marcar consulta, abrir o diário
   de saúde, verificar receita, falar com um círculo de apoio, ver o
   agente de saúde mais próximo.
3. VALIDAR emoções. NUNCA dês diagnóstico nem conselho médico específico
   que substitua um profissional. Em caso de urgência diz: "Liga 119
   (emergência médica em Moçambique)".

Formato das respostas: 2-4 frases curtas, emoji no máximo 2, tom próximo.
Quando fizer sentido sugerir uma acção do app, TERMINA com uma linha:
[ACOES] tipo1|Etiqueta 1; tipo2|Etiqueta 2
Tipos permitidos: book_appointment, open_journal, open_wallet, open_circles,
open_meds, open_doctors, open_records.

Se a mensagem sugerir risco de auto-lesão, violência ou desespero grave,
começa a resposta com [CRISE] e incentiva contactar a linha de apoio.
''';

class MeddyRepository {
  MeddyRepository(this._sb);
  final SupabaseClient _sb;

  String? get _uid => _sb.auth.currentUser?.id;

  /// Apanha a conversa activa ou cria uma nova (RLS: owns).
  Future<MeddyConversation> getOrCreateConversation({
    String context = 'symptom_discussion',
  }) async {
    final uid = _uid;
    if (uid == null) throw const AuthException('Sessão necessária');
    final rows = await _sb
        .from('meddy_conversations')
        .select('id,context,message_count,mood_before')
        .eq('user_id', uid)
        .eq('is_active', true)
        .order('last_message_at', ascending: false)
        .limit(1);
    if (rows is List && rows.isNotEmpty) {
      return MeddyConversation.fromMap(rows.first as Map<String, dynamic>);
    }
    final inserted = await _sb
        .from('meddy_conversations')
        .insert({'user_id': uid, 'context': context, 'language': 'pt'})
        .select('id,context,message_count,mood_before')
        .single();
    return MeddyConversation.fromMap(inserted);
  }

  /// Mensagens da conversa (histórico persistido — igual na web).
  Future<List<MeddyMessage>> fetchMessages(String conversationId) async {
    final rows = await _sb
        .from('meddy_messages')
        .select()
        .eq('conversation_id', conversationId)
        .order('created_at')
        .limit(120);
    return (rows as List)
        .map((m) => MeddyMessage.fromMap(m as Map<String, dynamic>))
        .toList();
  }

  /// Envia: guarda a mensagem do utilizador, pergunta à IA (histórico
  /// curto) e guarda a resposta do Meddy. Devolve a resposta pronta a
  /// mostrar. Erros de IA devolvem uma resposta de degradação (a web
  /// também nunca "quebra" o chat).
  Future<MeddyMessage> send(
    String conversationId, {
    required String content,
    required List<MeddyMessage> history,
    String? countryCode,
  }) async {
    final uid = _uid;
    if (uid == null) throw const AuthException('Sessão necessária');

    final userRow = await _sb
        .from('meddy_messages')
        .insert({
          'conversation_id': conversationId,
          'role': 'user',
          'content': content,
          'detected_language': 'pt',
        })
        .select()
        .single();

    // 1) Resposta IA — histórico das últimas 10 trocas.
    String reply;
    final crisis = _detectCrisisLocally(content);
    try {
      final hist = history
          .skip(history.length > 10 ? history.length - 10 : 0)
          .map((m) => GeminiMessage(
              role: m.isUser ? 'user' : 'model', text: m.content))
          .toList();
      reply = await geminiChat(
        content,
        systemPrompt: _kSystemPrompt,
        temperature: 0.7,
        maxOutputTokens: 700,
        history: hist,
      );
    } on GeminiUnavailable catch (e) {
      reply = _localFallbackReply(content, e.reason, crisis);
    }

    // 2) Parse de crise + acções sugeridas.
    final isCrisis = crisis || reply.startsWith('[CRISE]');
    reply = reply.replaceFirst('[CRISE]', '').trim();
    final actions = _parseActions(reply);
    reply = _stripActions(reply);
    if (isCrisis) {
      final c = CrisisResource.forCountry(countryCode);
      reply =
          '$reply\n\n📞 ${c.name}: ${c.phone} (${c.hours})';
    }

    final assistantRow = await _sb
        .from('meddy_messages')
        .insert({
          'conversation_id': conversationId,
          'role': 'assistant',
          'content': reply,
          'suggested_actions': actions.map((a) => a.toMap()).toList(),
          'is_crisis_flagged': isCrisis,
          'detected_intent': isCrisis ? 'emotional_distress' : 'health_question',
        })
        .select()
        .single();

    // 3) Contadores da conversa (RLS UPDATE própria).
    try {
      await _sb
          .from('meddy_conversations')
          .update({
            'last_message_at': DateTime.now().toUtc().toIso8601String(),
            'message_count': history.length + 2,
          })
          .eq('id', conversationId);
    } catch (_) {/* não bloqueia o chat */}

    return MeddyMessage.fromMap(assistantRow);
  }

  /// Fecha a conversa activa (próximo toque abre nova).
  Future<void> closeConversation(String conversationId) async {
    await _sb
        .from('meddy_conversations')
        .update({'is_active': false})
        .eq('id', conversationId);
  }

  // ── Internos ─────────────────────────────────────────────────────

  static final RegExp _crisisWords = RegExp(
    r'(matar[- ]?me|suic[ií]dio|não quero viver|nao quero viver|desistir de tudo|'
    r'acabar com (a minha |minha )?vida|me machucar|magoa[r]?[- ]?me de propósito)',
    caseSensitive: false,
  );

  bool _detectCrisisLocally(String text) => _crisisWords.hasMatch(text);

  List<MeddyAction> _parseActions(String reply) {
    final m = RegExp(r'\[ACOES\](.*)$', multiLine: true).firstMatch(reply);
    if (m == null) return const [];
    return m
        .group(1)!
        .split(';')
        .map((p) => p.trim().split('|'))
        .where((p) => p.length == 2)
        .map((p) => MeddyAction(type: p[0].trim(), label: p[1].trim()))
        .take(3)
        .toList();
  }

  String _stripActions(String reply) =>
      reply.replaceAll(RegExp(r'\[ACOES\][^\n]*'), '').trim();

  /// Modo local (sem chave IA): respostas seguras por palavra-chave —
  /// equivalente à "simulação local" do gemini.ts da web.
  String _localFallbackReply(String content, String reason, bool crisis) {
    if (crisis) {
      return 'Sinto que estás a passar por um momento muito difícil e '
          'quero que saibas que não estás sozinho(a). Por favor fala '
          'agora com alguém que te pode apoiar.';
    }
    final t = content.toLowerCase();
    if (t.contains('dor') || t.contains('febre') || t.contains('mal')) {
      return 'Sinto muito que não estejas bem 🤒. Se os sintomas piorarem '
          'ou durarem mais de 2 dias, fala com um médico pelo app — posso '
          'ajudar-te a marcar uma consulta.';
    }
    if (t.contains('medic') || t.contains('comprimid') || t.contains('toma')) {
      return 'Boa pergunta! Podes gerir as tuas medicações na secção "Medicação" '
          'e activar lembretes. Para dúvidas sobre dose ou efeitos, confirma '
          'sempre com o teu médico ou farmácia 💙.';
    }
    if (t.contains('triste') || t.contains('ansios') || t.contains('sozinh')) {
      return 'Obrigado por partilhar isso comigo 💙. Falar já ajuda. Que tal '
          'registar como te sentes no Diário de Saúde ou entrar num círculo '
          'de apoio? Não estás sozinho(a) nisto.';
    }
    return 'Estou aqui contigo 💙. Posso ajudar a marcar consultas, lembrar '
        'medicação, registar o teu humor no diário ou encontrar um agente '
        'de saúde perto de ti. O que precisas hoje?';
  }
}

final meddyRepositoryProvider = Provider<MeddyRepository>(
    (ref) => MeddyRepository(Supabase.instance.client));
