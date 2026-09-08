import '../../facilities/data/facility_model.dart';

/// Alvo de navegação para abrir um chat específico (extra do go_router).
class ChatTarget {
  const ChatTarget({
    required this.conversationId,
    required this.facility,
    this.autoAttach = false,
    this.staffMode = false,
  });

  final String conversationId;
  final HealthFacility facility;

  /// Quando true (envio de receita a partir do detalhe), o ecrã de chat
  /// abre já o selector de imagem.
  final bool autoAttach;

  /// Quando true, o ecrã actua como a INSTITUIÇÃO: as mensagens são
  /// enviadas com sender_role = 'facility' e os balões próprios são os
  /// da instituição (usado pela inbox do dono).
  final bool staffMode;
}

/// Instituição que o utilizador possui (para a inbox do dono).
class OwnedFacility {
  const OwnedFacility({
    required this.source,
    required this.entityId,
    required this.name,
  });

  /// store | clinic | veterinary
  final String source;
  final String entityId;
  final String name;
}

/// Conversa utilizador ↔ instituição (tabela `facility_conversations`).
class FacilityConversation {
  const FacilityConversation({
    required this.id,
    required this.source,
    required this.entityId,
    this.facilityName,
    this.lastMessageAt,
    this.lastMessageText,
    this.lastSenderRole,
    required this.userLastReadAt,
    required this.createdAt,
  });

  final String id;
  final FacilitySource source;
  final String entityId;
  final String? facilityName;
  final DateTime? lastMessageAt;
  final String? lastMessageText;
  final String? lastSenderRole;
  final DateTime userLastReadAt;
  final DateTime createdAt;

  /// Mensagem nova da instituição que o utilizador ainda não abriu.
  bool get hasUnread =>
      lastSenderRole == 'facility' &&
      lastMessageAt != null &&
      lastMessageAt!.isAfter(userLastReadAt);

  DateTime get sortDate => lastMessageAt ?? createdAt;

  factory FacilityConversation.fromJson(Map<String, dynamic> j) {
    return FacilityConversation(
      id: j['id'] as String,
      source: FacilitySource.values.firstWhere(
        (s) => s.name == (j['source'] as String? ?? 'store'),
        orElse: () => FacilitySource.store,
      ),
      entityId: (j['entity_id'] ?? '') as String,
      facilityName: j['facility_name'] as String?,
      lastMessageAt: _date(j['last_message_at']),
      lastMessageText: j['last_message_text'] as String?,
      lastSenderRole: j['last_sender_role'] as String?,
      userLastReadAt:
          _date(j['user_last_read_at']) ?? DateTime.fromMillisecondsSinceEpoch(0),
      createdAt: _date(j['created_at']) ?? DateTime.now(),
    );
  }

  static DateTime? _date(Object? v) =>
      v == null ? null : DateTime.tryParse(v.toString());
}

/// Mensagem de chat (tabela `facility_messages`) — texto e/ou anexo
/// (foto de receita ou documento).
class FacilityMessage {
  const FacilityMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.senderRole,
    this.body,
    this.attachmentPath,
    this.attachmentKind,
    required this.createdAt,
  });

  final String id;
  final String conversationId;
  final String senderId;

  /// customer | facility — nesta app (lado do cliente) o balão
  /// direito é sempre `customer`.
  final String senderRole;
  final String? body;

  /// Caminho no bucket privado `chat-attachments` (URL assinado gerado
  /// a pedido para não expor o ficheiro).
  final String? attachmentPath;
  final String? attachmentKind;
  final DateTime createdAt;

  bool get isMine => senderRole == 'customer';

  /// Balões próprios consoante o modo do ecrã: na inbox do dono da
  /// instituição, as mensagens da instituição são as "minhas".
  bool isMineFor(bool staffMode) =>
      staffMode ? senderRole == 'facility' : senderRole == 'customer';
  bool get hasAttachment =>
      attachmentPath != null && attachmentPath!.isNotEmpty;

  factory FacilityMessage.fromJson(Map<String, dynamic> j) {
    return FacilityMessage(
      id: j['id'] as String,
      conversationId: j['conversation_id'] as String,
      senderId: (j['sender_id'] ?? '') as String,
      senderRole: (j['sender_role'] ?? 'customer') as String,
      body: j['body'] as String?,
      attachmentPath: j['attachment_url'] as String?,
      attachmentKind: j['attachment_kind'] as String?,
      createdAt:
          DateTime.tryParse(j['created_at']?.toString() ?? '') ??
              DateTime.now(),
    );
  }
}
