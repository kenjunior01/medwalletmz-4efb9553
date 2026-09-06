import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../bookings/domain/booking_models.dart';
import 'consultation_chat_models.dart';

/// Chat especialista↔paciente — tabela `consultation_messages`
/// (realtime) + bucket privado `consultation-attachments`
/// (políticas existentes nas migrations: caminho {user}/{consulta}/…).
class ConsultationChatRepository {
  ConsultationChatRepository(this._client);

  final SupabaseClient _client;

  static const _bucket = 'consultation-attachments';

  // ── Mensagens ─────────────────────────────────────────────────────

  Stream<List<ConsultationMessage>> watchMessages(String consultationId) =>
      _client
          .from('consultation_messages')
          .stream(primaryKey: ['id'])
          .eq('consultation_id', consultationId)
          .order('created_at')
          .map((rows) => rows.map(ConsultationMessage.fromJson).toList());

  Future<void> sendMessage(
    String consultationId, {
    required String message,
    String? attachmentPath,
    String? attachmentType,
    String? attachmentName,
  }) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) throw AuthException('Sessão inexistente');

    await _client.from('consultation_messages').insert({
      'consultation_id': consultationId,
      'sender_id': uid,
      'message': message,
      if (attachmentPath != null) 'attachment_url': attachmentPath,
      if (attachmentType != null) 'attachment_type': attachmentType,
      if (attachmentName != null) 'attachment_name': attachmentName,
    });
  }

  /// Envia ficheiro para o bucket privado — o trigger
  /// `validate_chat_participant` garante no servidor que só os
  /// participantes da consulta escrevem.
  Future<String> uploadAttachment(
    String consultationId,
    File file,
    String fileName,
  ) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) throw AuthException('Sessão inexistente');
    final safeName = fileName.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
    final path =
        '$uid/$consultationId/${DateTime.now().millisecondsSinceEpoch}_$safeName';
    await _client.storage.from(_bucket).upload(path, file);
    return path;
  }

  final Map<String, String> _signedCache = {};

  Future<String?> signedAttachmentUrl(String? path) async {
    if (path == null || path.isEmpty) return null;
    final cached = _signedCache[path];
    if (cached != null) return cached;
    try {
      final url =
          await _client.storage.from(_bucket).createSignedUrl(path, 3600);
      _signedCache[path] = url;
      return url;
    } catch (_) {
      return null;
    }
  }

  // ── Fios de conversa (lista de consultas com identidade) ──────────

  /// Consultas do utilizador (como paciente ou como médico) com o nome
  /// do interlocutor resolvido.
  Stream<List<ConsultationThread>> watchThreads(String uid,
      {required bool asDoctor}) {
    final stream = _client
        .from('consultations')
        .stream(primaryKey: ['id'])
        .eq(asDoctor ? 'doctor_id' : 'patient_id', uid)
        .order('scheduled_at')
        .map((rows) => rows.map(Consultation.fromJson).toList());

    return stream.asyncMap((consultations) async {
      final otherIds = consultations
          .map((c) => asDoctor ? c.patientId : c.doctorId)
          .where((id) => id.isNotEmpty)
          .toSet()
          .toList();
      final info = await _fetchCounterpartInfo(otherIds, asDoctor: asDoctor);
      final threads = consultations.map((c) {
        final otherId = asDoctor ? c.patientId : c.doctorId;
        final (name, avatar, specialty) = info[otherId] ?? (null, null, null);
        return ConsultationThread(
          consultation: c,
          counterpartName: name,
          counterpartAvatar: avatar,
          specialtyName: specialty,
          asDoctor: asDoctor,
        );
      }).toList();
      threads.sort((a, b) => b.sortDate.compareTo(a.sortDate));
      return threads;
    });
  }

  /// Resolve nomes/avatares via `profiles` e especialidade via
  /// `doctor_profiles` (sem FK de embed garantida — consulta manual).
  Future<Map<String, (String?, String?, String?)>> _fetchCounterpartInfo(
    List<String> ids, {
    required bool asDoctor,
  }) async {
    final result = <String, (String?, String?, String?)>{};
    if (ids.isEmpty) return result;

    // Especialidades dos médicos (quando o interlocutor é médico).
    final specialtyByUser = <String, String>{};
    if (!asDoctor) {
      try {
        final rows = await _client
            .from('doctor_profiles')
            .select('user_id, specialty:medical_specialties(name)')
            .inFilter('user_id', ids);
        for (final r in rows) {
          final spec = r['specialty'];
          String? specName;
          if (spec is Map) specName = spec['name'] as String?;
          if (spec is List && spec.isNotEmpty) {
            specName = (spec.first as Map?)?['name'] as String?;
          }
          if (specName != null) {
            specialtyByUser[r['user_id'] as String] = specName;
          }
        }
      } catch (_) {}
    }

    // Nomes e avatares via profiles.
    try {
      final rows = await _client
          .from('profiles')
          .select('id, full_name, avatar_url')
          .inFilter('id', ids);
      for (final r in rows) {
        final id = r['id'] as String;
        result[id] = (
          (r['full_name'] ?? '') as String,
          r['avatar_url'] as String?,
          specialtyByUser[id],
        );
      }
    } catch (_) {}
    return result;
  }
}
