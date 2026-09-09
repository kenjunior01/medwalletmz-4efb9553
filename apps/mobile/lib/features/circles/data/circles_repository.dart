import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Círculos de apoio — tabelas `support_circles`,
/// `support_circle_members` e `support_circle_messages` da MESMA base
/// do produto web.
///
/// Comunidade por condição (diabetes, hipertensão, maternidade, saúde
/// mental…) com:
///   • entrada/saída do membro (RLS: cada um gere a própria adesão);
///   • mensagens de grupo com ANONIMATO opcional (`is_anonymous`);
///   • moderação IA do backend (`ai_moderation_status`): pending →
///     approved | flagged | rejected — a app mostra o estado;
///   • REACÇÕES no jsonb `reactions` (formato {"👍": ["uid", …]}) —
///     gravadas com a política "Members can react" + trigger que
///     congela o conteúdo (migração aditiva 20260906000000);
///   • RESPOSTAS via `reply_to` (FK já existente);
///   • REALTIME — a tabela entrou na publication `supabase_realtime`
///     na mesma migração; o chat deixa de precisar de polling;
///   • marca de leitura `last_read_at` (política UPDATE própria) que
///     alimenta os badges de não lidas da lista de círculos.
class SupportCircle {
  const SupportCircle({
    required this.id,
    required this.name,
    required this.conditionTag,
    this.description,
    this.isPrivate = false,
    this.maxMembers = 50,
    this.guidelines,
    this.memberCount = 0,
    this.joined = false,
    this.unread = 0,
  });

  final String id;
  final String name;
  final String conditionTag;
  final String? description;
  final bool isPrivate;
  final int maxMembers;
  final String? guidelines;
  final int memberCount;
  final bool joined;
  final int unread;

  SupportCircle withUnread(int value) => SupportCircle(
        id: id,
        name: name,
        conditionTag: conditionTag,
        description: description,
        isPrivate: isPrivate,
        maxMembers: maxMembers,
        guidelines: guidelines,
        memberCount: memberCount,
        joined: joined,
        unread: value,
      );

  factory SupportCircle.fromJson(Map<String, dynamic> j) => SupportCircle(
        id: j['id'] as String,
        name: (j['name'] ?? 'Círculo') as String,
        conditionTag: (j['condition_tag'] ?? 'geral') as String,
        description: j['description'] as String?,
        isPrivate: j['is_private'] as bool? ?? false,
        maxMembers: (j['max_members'] as num?)?.toInt() ?? 50,
        guidelines: j['ai_guidelines'] as String?,
        memberCount: (j['member_count'] as num?)?.toInt() ?? 0,
        joined: (j['joined'] as bool?) ?? false,
      );
}

class CircleMessage {
  const CircleMessage({
    required this.id,
    required this.circleId,
    required this.userId,
    required this.content,
    required this.createdAt,
    this.isAnonymous = false,
    this.moderationStatus = 'pending',
    this.authorName,
    this.isMine = false,
    this.reactions = const {},
    this.replyToId,
  });

  final String id;
  final String circleId;
  final String userId;
  final String content;
  final DateTime createdAt;
  final bool isAnonymous;
  final String moderationStatus; // pending | approved | flagged | rejected
  final String? authorName;
  final bool isMine;

  /// jsonb `reactions`: {emoji: [user_id, …]}
  final Map<String, List<String>> reactions;

  /// FK `reply_to` — mensagem à qual esta responde.
  final String? replyToId;

  bool get isHiddenByModeration =>
      moderationStatus == 'rejected' || moderationStatus == 'flagged';

  /// Contagem por emoji (ordenada por inserção do mapa).
  Map<String, int> get reactionCounts =>
      {for (final e in reactions.entries) e.key: e.value.length};

  bool iReacted(String emoji, String myId) =>
      reactions[emoji]?.contains(myId) ?? false;

  String get moderationLabel {
    switch (moderationStatus) {
      case 'approved':
        return '';
      case 'flagged':
        return 'Sinalizada pela moderação';
      case 'rejected':
        return 'Removida pela moderação';
      default:
        return 'Em revisão pela moderação';
    }
  }

  factory CircleMessage.fromJson(Map<String, dynamic> j, String myId) {
    final rawReactions = j['reactions'];
    final parsed = <String, List<String>>{};
    if (rawReactions is Map) {
      rawReactions.forEach((k, v) {
        if (k is String && v is List) {
          parsed[k] = [for (final u in v) u.toString()];
        }
      });
    }
    return CircleMessage(
      id: j['id'] as String,
      circleId: j['circle_id'] as String,
      userId: (j['user_id'] ?? '') as String,
      content: (j['content'] ?? '') as String,
      createdAt:
          DateTime.tryParse(j['created_at']?.toString() ?? '') ??
              DateTime.now(),
      isAnonymous: j['is_anonymous'] as bool? ?? false,
      moderationStatus:
          (j['ai_moderation_status'] ?? 'pending') as String,
      isMine: j['user_id'] == myId,
      reactions: parsed,
      replyToId: j['reply_to'] as String?,
    );
  }
}

class CirclesRepository {
  CirclesRepository(this._client);

  final SupabaseClient _client;

  /// Círculos públicos (todos os países) + as minhas adesões + contagem
  /// de membros + não lidas. Sem joins RLS perigosos: consultas simples.
  Future<List<SupportCircle>> fetchCircles({String? conditionTag}) async {
    try {
      var query =
          _client.from('support_circles').select().eq('is_private', false);
      if (conditionTag != null) {
        query = query.eq('condition_tag', conditionTag);
      }
      final rows = await query.order('created_at');
      final circles = [
        for (final r in (rows as List))
          SupportCircle.fromJson((r as Map).cast<String, dynamic>()),
      ];
      if (circles.isEmpty) return const [];

      // Minhas adesões.
      final myRows = await _client
          .from('support_circle_members')
          .select('circle_id')
          .eq('user_id', _client.auth.currentUser?.id ?? '');
      final mine = {
        for (final r in (myRows as List))
          (r as Map)['circle_id'] as String,
      };

      // Não lidas por círculo (mensagens de outros depois do last_read_at).
      final unread = await fetchUnreadCounts();

      // Contagem de membros por círculo (count exact).
      final counts = <String, int>{};
      for (final c in circles) {
        try {
          final res = await _client
              .from('support_circle_members')
              .select('id')
              .eq('circle_id', c.id)
              .count(CountOption.exact);
          counts[c.id] = res.count ?? 0;
        } catch (_) {
          counts[c.id] = 0;
        }
      }

      return [
        for (final c in circles)
          c.withUnread(unread[c.id] ?? 0).copyWith(
                memberCount: counts[c.id] ?? 0,
                joined: mine.contains(c.id),
              ),
      ];
    } catch (_) {
      return const [];
    }
  }

  /// Entra no círculo (RLS: INSERT próprio).
  Future<void> join(String circleId) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return;
    try {
      await _client.from('support_circle_members').upsert({
        'circle_id': circleId,
        'user_id': uid,
        'role': 'member',
      }, onConflict: 'circle_id, user_id');
    } catch (_) {
      rethrow;
    }
  }

  /// Sai do círculo (RLS: DELETE próprio).
  Future<void> leave(String circleId) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return;
    try {
      await _client
          .from('support_circle_members')
          .delete()
          .eq('circle_id', circleId)
          .eq('user_id', uid);
    } catch (_) {}
  }

  /// Sou membro? (para o guard do chat).
  Future<bool> isMember(String circleId) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return false;
    try {
      final rows = await _client
          .from('support_circle_members')
          .select('id')
          .eq('circle_id', circleId)
          .eq('user_id', uid)
          .limit(1);
      return rows is List && rows.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  /// Últimas mensagens do círculo (página de até 80) — usada na
  /// primeira pintura e pelo cache offline.
  Future<List<CircleMessage>> fetchMessages(String circleId) async {
    final uid = _client.auth.currentUser?.id ?? '';
    try {
      final rows = await _client
          .from('support_circle_messages')
          .select()
          .eq('circle_id', circleId)
          .order('created_at', ascending: false)
          .limit(80);
      return [
        for (final r in (rows as List))
          CircleMessage.fromJson((r as Map).cast<String, dynamic>(), uid),
      ].reversed.toList();
    } catch (_) {
      return const [];
    }
  }

  /// REALTIME — a migração aditiva 20260906000000 colocou
  /// `support_circle_messages` na publication `supabase_realtime`.
  /// Snapshot inicial + eventos INSERT/UPDATE (reacções)/DELETE.
  Stream<List<CircleMessage>> streamMessages(String circleId) {
    final uid = _client.auth.currentUser?.id ?? '';
    return _client
        .from('support_circle_messages')
        .stream(primaryKey: ['id'])
        .eq('circle_id', circleId)
        .order('created_at', ascending: false)
        .limit(80)
        .map((rows) {
          final msgs = [
            for (final r in rows)
              CircleMessage.fromJson((r as Map).cast<String, dynamic>(), uid),
          ];
          return msgs.reversed.toList();
        });
  }

  /// Envia mensagem — com anonimato opcional e resposta opcional
  /// (`reply_to`). O backend classifica com moderação IA.
  Future<void> sendMessage(
    String circleId,
    String content, {
    bool anonymous = false,
    String? replyTo,
  }) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return;
    await _client.from('support_circle_messages').insert({
      'circle_id': circleId,
      'user_id': uid,
      'content': content,
      'is_anonymous': anonymous,
      if (replyTo != null) 'reply_to': replyTo,
    });
  }

  /// Apaga a própria mensagem (RLS: DELETE own).
  Future<void> deleteMessage(String messageId) async {
    try {
      await _client.from('support_circle_messages').delete().eq('id', messageId);
    } catch (_) {}
  }

  /// Liga/desliga uma reacção do utilizador actual numa mensagem.
  /// Formato gravado: {"👍": ["uid1","uid2"]} — leitura, alteração e
  /// UPDATE do jsonb (a política de UPDATE + trigger de contenção
  /// garantem que o texto da mensagem não muda).
  Future<void> toggleReaction(String messageId, String emoji) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return;
    try {
      final rows = await _client
          .from('support_circle_messages')
          .select('reactions')
          .eq('id', messageId)
          .limit(1);
      if (rows is! List || rows.isEmpty) return;
      final raw = ((rows.first as Map)['reactions'] as Map?) ?? const {};
      final reactions = <String, List<String>>{
        for (final e in raw.entries)
          if (e.key is String && e.value is List)
            e.key as String: [for (final u in (e.value as List)) u.toString()],
      };
      final users = [...(reactions[emoji] ?? const <String>[])];
      if (users.contains(uid)) {
        users.remove(uid);
      } else {
        users.add(uid);
      }
      if (users.isEmpty) {
        reactions.remove(emoji);
      } else {
        reactions[emoji] = users;
      }
      await _client
          .from('support_circle_messages')
          .update({'reactions': reactions}).eq('id', messageId);
    } catch (_) {
      rethrow;
    }
  }

  /// Marca o círculo como lido (UPDATE da própria adesão — política
  /// "Users update own membership" da migração aditiva).
  Future<void> markRead(String circleId) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return;
    try {
      await _client
          .from('support_circle_members')
          .update({'last_read_at': DateTime.now().toUtc().toIso8601String()})
          .eq('circle_id', circleId)
          .eq('user_id', uid);
    } catch (_) {}
  }

  /// Não lidas por círculo: mensagens de OUTROS utilizadores criadas
  /// depois do meu último `last_read_at` (count exact por círculo).
  Future<Map<String, int>> fetchUnreadCounts() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const {};
    try {
      final memberRows = await _client
          .from('support_circle_members')
          .select('circle_id, last_read_at')
          .eq('user_id', uid);
      final result = <String, int>{};
      for (final m in (memberRows as List)) {
        final row = (m as Map);
        final circleId = row['circle_id'] as String?;
        if (circleId == null) continue;
        final lastRead = row['last_read_at']?.toString();
        try {
          var q = _client
              .from('support_circle_messages')
              .select('id')
              .eq('circle_id', circleId)
              .neq('user_id', uid);
          if (lastRead != null && lastRead.isNotEmpty) {
            q = q.gt('created_at', lastRead);
          }
          final res = await q.count(CountOption.exact);
          final n = res.count ?? 0;
          if (n > 0) result[circleId] = n;
        } catch (_) {}
      }
      return result;
    } catch (_) {
      return const {};
    }
  }

  /// Nomes de autor (perfis públicos) — só para mensagens NÃO anónimas.
  Future<Map<String, String>> fetchAuthorNames(
      List<String> userIds) async {
    if (userIds.isEmpty) return const {};
    try {
      final rows = await _client
          .from('profiles')
          .select('user_id, full_name')
          .inFilter('user_id', userIds);
      return {
        for (final r in (rows as List))
          (r as Map)['user_id'] as String:
              ((r)['full_name'] ?? 'Membro') as String,
      };
    } catch (_) {
      return const {};
    }
  }
}

extension _CircleCopy on SupportCircle {
  SupportCircle copyWith({int? memberCount, bool? joined}) => SupportCircle(
        id: id,
        name: name,
        conditionTag: conditionTag,
        description: description,
        isPrivate: isPrivate,
        maxMembers: maxMembers,
        guidelines: guidelines,
        memberCount: memberCount ?? this.memberCount,
        joined: joined ?? this.joined,
        unread: unread,
      );
}

/// Tags de condição pré-definidas (alinhadas com a versão web).
class CircleTags {
  static const diabetes = 'diabetes';
  static const hipertensao = 'hipertensao';
  static const maternidade = 'maternidade';
  static const saudeMental = 'saudemental';

  static const all = [diabetes, hipertensao, maternidade, saudeMental];

  static String label(String tag) {
    switch (tag) {
      case diabetes:
        return 'Diabetes';
      case hipertensao:
        return 'Hipertensão';
      case maternidade:
        return 'Maternidade';
      case saudeMental:
        return 'Saúde mental';
      default:
        return tag;
    }
  }

  static IconData iconFor(String tag) {
    switch (tag) {
      case diabetes:
        return Icons.water_drop_rounded;
      case hipertensao:
        return Icons.favorite_rounded;
      case maternidade:
        return Icons.child_care_rounded;
      case saudeMental:
        return Icons.self_improvement_rounded;
      default:
        return Icons.group_rounded;
    }
  }
}

/// Emojis de reacção disponíveis nos círculos.
class CircleReactions {
  static const emojis = <String>['👍', '❤️', '😂', '😮', '😢', '🙏', '💪', '🌟'];
}

final circlesRepositoryProvider = Provider<CirclesRepository>((ref) {
  return CirclesRepository(Supabase.instance.client);
});
