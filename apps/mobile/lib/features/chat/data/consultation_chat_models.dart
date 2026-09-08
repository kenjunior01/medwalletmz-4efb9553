import '../../bookings/domain/booking_models.dart';

/// Mensagem do chat consulta↔especialista (tabela
/// `consultation_messages`). `sender_id` é sempre um auth user — o
/// balão direito é o próprio utilizador, seja paciente ou médico.
class ConsultationMessage {
  const ConsultationMessage({
    required this.id,
    required this.consultationId,
    required this.senderId,
    required this.message,
    this.attachmentPath,
    this.attachmentType,
    this.attachmentName,
    required this.createdAt,
  });

  final String id;
  final String consultationId;
  final String senderId;
  final String message;

  /// Caminho no bucket privado `consultation-attachments`
  /// (padrão {user_id}/{consultation_id}/{ficheiro}).
  final String? attachmentPath;
  final String? attachmentType;
  final String? attachmentName;
  final DateTime createdAt;

  bool get hasAttachment =>
      attachmentPath != null && attachmentPath!.isNotEmpty;

  factory ConsultationMessage.fromJson(Map<String, dynamic> j) =>
      ConsultationMessage(
        id: j['id'] as String,
        consultationId: j['consultation_id'] as String,
        senderId: (j['sender_id'] ?? '') as String,
        message: (j['message'] ?? '') as String,
        attachmentPath: j['attachment_url'] as String?,
        attachmentType: j['attachment_type'] as String?,
        attachmentName: j['attachment_name'] as String?,
        createdAt: DateTime.tryParse(j['created_at']?.toString() ?? '') ??
            DateTime.now(),
      );
}

/// Fio de conversa de uma consulta — consulta + identidade do
/// interlocutor (médico para o paciente, paciente para o médico).
class ConsultationThread {
  const ConsultationThread({
    required this.consultation,
    this.counterpartName,
    this.counterpartAvatar,
    this.specialtyName,
    this.asDoctor = false,
  });

  final Consultation consultation;

  /// Nome do outro participante (via profiles/doctor_profiles).
  final String? counterpartName;
  final String? counterpartAvatar;
  final String? specialtyName;

  /// true quando o utilizador autenticado é o médico da consulta.
  final bool asDoctor;

  String get title {
    final n = counterpartName;
    if (n != null && n.trim().isNotEmpty) return n.trim();
    return asDoctor ? 'Paciente' : 'Especialista';
  }

  String get subtitle => asDoctor
      ? 'Consulta · ${consultationStatusLabel(consultation.status)}'
      : (specialtyName ?? 'Especialista');

  DateTime get sortDate => consultation.scheduledAt;
}
