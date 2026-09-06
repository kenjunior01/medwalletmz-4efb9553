import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../facilities/data/facility_model.dart';
import 'chat_models.dart';

/// Chat com instituições — usa as tabelas aditivas `facility_conversations`
/// e `facility_messages` e o bucket privado `chat-attachments`
/// (ver supabase/migrations/20260905000000_facility_chat.sql).
/// Tempo real via streams do Supabase, como no resto da app.
class ChatRepository {
  ChatRepository(this._client);

  final SupabaseClient _client;

  static const _bucket = 'chat-attachments';

  // ── Conversas ──────────────────────────────────────────────────────

  /// Abre (ou reutiliza) a conversa com uma instituição via RPC
  /// `open_facility_conversation` e devolve o id.
  Future<String> openConversation(HealthFacility facility) async {
    final id = await _client.rpc(
      'open_facility_conversation',
      params: {
        'p_source': facility.source.name,
        'p_entity_id': facility.id,
        'p_facility_name': facility.name,
      },
    );
    return id.toString();
  }

  /// Lista de conversas do utilizador em tempo real (RLS filtra as suas).
  Stream<List<FacilityConversation>> watchConversations() {
    return _client
        .from('facility_conversations')
        .stream(primaryKey: ['id'])
        .order('created_at', ascending: false)
        .map((rows) {
          final list =
              rows.map(FacilityConversation.fromJson).toList();
          list.sort((a, b) => b.sortDate.compareTo(a.sortDate));
          return list;
        });
  }

  /// Marca a conversa como lida (esconde o ponto de não lidas).
  Future<void> markRead(String conversationId) async {
    await _client
        .from('facility_conversations')
        .update({
          'user_last_read_at': DateTime.now().toUtc().toIso8601String(),
        })
        .eq('id', conversationId);
  }

  // ── Mensagens ──────────────────────────────────────────────────────

  /// Mensagens da conversa em tempo real, ordenadas por criação.
  Stream<List<FacilityMessage>> watchMessages(String conversationId) {
    return _client
        .from('facility_messages')
        .stream(primaryKey: ['id'])
        .eq('conversation_id', conversationId)
        .order('created_at')
        .map((rows) => rows.map(FacilityMessage.fromJson).toList());
  }

  /// Envia texto e/ou anexo como cliente (sender_role = customer).
  Future<void> sendMessage(
    String conversationId, {
    String? body,
    String? attachmentPath,
    String? attachmentKind,
    String senderRole = 'customer',
  }) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) throw AuthException('Sessão inexistente');

    await _client.from('facility_messages').insert({
      'conversation_id': conversationId,
      'sender_id': uid,
      'sender_role': senderRole,
      'body': body,
      'attachment_url': attachmentPath,
      'attachment_kind': attachmentKind,
    });
  }

  // ── Inbox do dono da instituição (staff) ───────────────────────────

  /// Instituições que o utilizador possui (3 tabelas de origem,
  /// campo `owner_id`). Devolve (source, id, nome).
  Future<List<OwnedFacility>> fetchMyFacilities(String ownerId) async {
    final out = <OwnedFacility>[];
    final sources = {
      'store': 'stores',
      'clinic': 'clinics',
      'veterinary': 'veterinary_clinics',
    };
    for (final entry in sources.entries) {
      try {
        final rows = await _client
            .from(entry.value)
            .select('id, name')
            .eq('owner_id', ownerId)
            .limit(50);
        for (final r in rows) {
          out.add(OwnedFacility(
            source: entry.key,
            entityId: (r['id'] ?? '') as String,
            name: (r['name'] ?? 'Instituição') as String,
          ));
        }
      } catch (_) {
        // tabela sem acesso para este utilizador — ignora
      }
    }
    return out;
  }

  // ── Anexos (receitas fotografadas / documentos) ────────────────────

  /// Envia o ficheiro para o bucket privado e devolve o caminho a
  /// guardar em `attachment_url`. Caminho: {conversation_id}/{nome}.
  Future<String> uploadAttachment(
    String conversationId,
    File file,
    String fileName,
  ) async {
    final safeName =
        fileName.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
    final path =
        '$conversationId/${DateTime.now().millisecondsSinceEpoch}_$safeName';

    await _client.storage.from(_bucket).upload(path, file);
    return path;
  }

  final Map<String, String> _signedCache = {};

  /// URL assinado (1 h) para apresentar um anexo — assinaturas em cache
  /// por caminho para não repetir chamadas em rebuilds.
  Future<String?> signedAttachmentUrl(String? path) async {
    if (path == null || path.isEmpty) return null;
    final cached = _signedCache[path];
    if (cached != null) return cached;
    try {
      final url = await _client.storage
          .from(_bucket)
          .createSignedUrl(path, 3600);
      _signedCache[path] = url;
      return url;
    } catch (_) {
      return null;
    }
  }
}
