import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Registos médicos do paciente — tabelas `medical_records` e
/// `medical_record_shares` + bucket `medical-records` (pasta
/// `{user_id}/`, policies próprias da MESMA base do web).
///
/// Tipos: exam, prescription, report, vaccine, image, other.
class MedicalRecord {
  const MedicalRecord({
    required this.id,
    required this.title,
    required this.recordType,
    required this.createdAt,
    this.description,
    this.fileUrl,
    this.fileMime,
    this.issuedAt,
    this.issuedBy,
  });

  final String id;
  final String title;
  final String recordType;
  final String? description;
  final String? fileUrl;
  final String? fileMime;
  final DateTime? issuedAt;
  final String? issuedBy;
  final DateTime createdAt;

  bool get hasFile => (fileUrl ?? '').isNotEmpty;

  String get typeLabel {
    switch (recordType) {
      case 'exam':
        return 'Exame';
      case 'prescription':
        return 'Receita';
      case 'report':
        return 'Relatório';
      case 'vaccine':
        return 'Vacina';
      case 'image':
        return 'Imagem';
      default:
        return 'Outro';
    }
  }

  factory MedicalRecord.fromJson(Map<String, dynamic> j) => MedicalRecord(
        id: j['id'] as String,
        title: (j['title'] ?? 'Registo') as String,
        recordType: (j['record_type'] ?? 'exam') as String,
        description: j['description'] as String?,
        fileUrl: j['file_url'] as String?,
        fileMime: j['file_mime'] as String?,
        issuedAt: _parseDate(j['issued_at']),
        issuedBy: j['issued_by'] as String?,
        createdAt:
            DateTime.tryParse(j['created_at']?.toString() ?? '') ??
                DateTime.now(),
      );

  static DateTime? _parseDate(dynamic raw) {
    if (raw == null) return null;
    return DateTime.tryParse(raw.toString());
  }
}

/// Partilha de um registo com um médico (revogável).
class RecordShare {
  const RecordShare({
    required this.id,
    required this.recordId,
    required this.doctorId,
    required this.sharedAt,
    this.revokedAt,
    this.doctorName,
  });

  final String id;
  final String recordId;
  final String doctorId;
  final DateTime sharedAt;
  final DateTime? revokedAt;
  final String? doctorName;

  bool get isActive => revokedAt == null;

  factory RecordShare.fromJson(Map<String, dynamic> j) => RecordShare(
        id: j['id'] as String,
        recordId: j['record_id'] as String,
        doctorId: (j['doctor_id'] ?? '') as String,
        sharedAt:
            DateTime.tryParse(j['shared_at']?.toString() ?? '') ??
                DateTime.now(),
        revokedAt: DateTime.tryParse(j['revoked_at']?.toString() ?? ''),
      );
}

class RecordsRepository {
  RecordsRepository(this._client);

  final SupabaseClient _client;

  /// Os meus registos (RLS do próprio paciente).
  Future<List<MedicalRecord>> fetchMyRecords() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const [];
    try {
      final rows = await _client
          .from('medical_records')
          .select()
          .eq('patient_id', uid)
          .order('created_at', ascending: false);
      return [
        for (final r in (rows as List))
          MedicalRecord.fromJson((r as Map).cast<String, dynamic>()),
      ];
    } catch (_) {
      return const [];
    }
  }

  /// Cria o registo (com anexo opcional já carregado).
  Future<String?> createRecord({
    required String title,
    required String recordType,
    String? description,
    String? issuedBy,
    DateTime? issuedAt,
    File? attachment,
    String? attachmentMime,
  }) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return 'Sessão expirada. Entra novamente.';
    if (title.trim().isEmpty) return 'Dá um título ao registo.';

    try {
      String? fileUrl;
      if (attachment != null) {
        fileUrl = await uploadAttachment(
          FileWrapper(file: attachment),
          suggestedName: 'registo-${DateTime.now().millisecondsSinceEpoch}',
        );
      }
      await _client.from('medical_records').insert({
        'patient_id': uid,
        'title': title.trim(),
        'record_type': recordType,
        if (description != null && description.trim().isNotEmpty)
          'description': description.trim(),
        if (fileUrl != null) 'file_url': fileUrl,
        if (fileUrl != null && attachmentMime != null)
          'file_mime': attachmentMime,
        if (issuedAt != null)
          'issued_at': issuedAt.toIso8601String().substring(0, 10),
        if (issuedBy != null && issuedBy.trim().isNotEmpty)
          'issued_by': issuedBy.trim(),
      });
      return null;
    } catch (e) {
      return 'Não foi possível guardar o registo. Tenta novamente.';
    }
  }

  /// Apaga o registo (e tenta remover o ficheiro do bucket).
  Future<void> deleteRecord(MedicalRecord record) async {
    try {
      await _client
          .from('medical_records')
          .delete()
          .eq('id', record.id);
      if (record.hasFile) {
        try {
          final path = Uri.parse(record.fileUrl!).path
              .split('/medical-records/')
              .last;
          await _client.storage
              .from('medical-records')
              .remove([Uri.decodeComponent(path)]);
        } catch (_) {}
      }
    } catch (_) {}
  }

  /// Carrega um anexo para `medical-records/{uid}/…` (policy própria).
  /// Devolve o path completo (gravado em file_url — o web usa o mesmo
  /// formato e a policy do médico faz match por file_url).
  Future<String?> uploadAttachment(
    FileWrapper wrapper, {
    String? suggestedName,
  }) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return null;
    try {
      final Uint8List bytes = wrapper.readAsBytes();
      final ext = wrapper.extension ?? 'jpg';
      final name =
          '${suggestedName ?? 'anexo'}-${DateTime.now().millisecondsSinceEpoch}.$ext';
      final path = '$uid/$name';
      await _client.storage
          .from('medical-records')
          .uploadBinary(path, bytes,
              fileOptions: const FileOptions(upsert: false));
      return path;
    } catch (_) {
      return null;
    }
  }

  /// URL assinado (1 h) para o dono abrir o anexo.
  Future<String?> signedUrl(String fileUrl) async {
    try {
      return await _client.storage
          .from('medical-records')
          .createSignedUrl(fileUrl, 3600);
    } catch (_) {
      return null;
    }
  }

  // ── Partilhas com médicos ────────────────────────────────────────

  /// Partilhas activas de um registo (com nome do médico).
  Future<List<RecordShare>> fetchShares(String recordId) async {
    try {
      final rows = await _client
          .from('medical_record_shares')
          .select()
          .eq('record_id', recordId)
          .order('shared_at', ascending: false);
      final shares = [
        for (final r in (rows as List))
          RecordShare.fromJson((r as Map).cast<String, dynamic>()),
      ];
      // Resolver nomes dos médicos via profiles.
      final ids = [
        for (final s in shares)
          if (s.isActive) s.doctorId,
      ].toSet().toList();
      if (ids.isEmpty) return shares;
      final names = <String, String>{};
      try {
        final profiles = await _client
            .from('profiles')
            .select('user_id, full_name')
            .inFilter('user_id', ids);
        for (final p in (profiles as List)) {
          names[(p as Map)['user_id'] as String] =
              ((p)['full_name'] ?? 'Médico') as String;
        }
      } catch (_) {}
      return [
        for (final s in shares)
          RecordShare(
            id: s.id,
            recordId: s.recordId,
            doctorId: s.doctorId,
            sharedAt: s.sharedAt,
            revokedAt: s.revokedAt,
            doctorName: names[s.doctorId],
          ),
      ];
    } catch (_) {
      return const [];
    }
  }

  /// Partilha o registo com o médico (UNIQUE record_id+doctor_id).
  Future<String?> shareWithDoctor(
      MedicalRecord record, String doctorId) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return 'Sessão expirada.';
    try {
      await _client.from('medical_record_shares').upsert({
        'record_id': record.id,
        'patient_id': uid,
        'doctor_id': doctorId,
        'revoked_at': null,
      }, onConflict: 'record_id, doctor_id');
      return null;
    } catch (_) {
      return 'Não foi possível partilhar. Tenta novamente.';
    }
  }

  /// Revoga uma partilha.
  Future<void> revokeShare(RecordShare share) async {
    try {
      await _client.from('medical_record_shares').update({
        'revoked_at': DateTime.now().toUtc().toIso8601String(),
      }).eq('id', share.id);
    } catch (_) {}
  }

  /// Médicos com quem já tem consulta (para o seletor de partilha) —
  /// via doctor_profiles + profiles.
  Future<List<DoctorOption>> fetchMyDoctors() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const [];
    try {
      final rows = await _client
          .from('consultations')
          .select('doctor_id')
          .eq('patient_id', uid);
      final ids = {
        for (final r in (rows as List))
          if ((r as Map)['doctor_id'] != null) r['doctor_id'] as String,
      }.toList();
      if (ids.isEmpty) return const [];
      final docs = await _client
          .from('doctor_profiles')
          .select('user_id, specialty_id')
          .inFilter('user_id', ids);
      final result = <DoctorOption>[];
      for (final d in (docs as List)) {
        final docId = (d as Map)['user_id'] as String;
        final prof = await _client
            .from('profiles')
            .select('full_name')
            .eq('user_id', docId)
            .limit(1);
        final name = prof is List && prof.isNotEmpty
            ? (((prof.first as Map)['full_name'] ?? 'Médico') as String)
            : 'Médico';
        result.add(DoctorOption(userId: docId, name: name));
      }
      return result;
    } catch (_) {
      return const [];
    }
  }
}

/// Wrapper mínimo de ficheiro para não acoplar o repo ao image_picker.
class FileWrapper {
  const FileWrapper({required this.file, this.extension});

  final File file;
  final String? extension;

  Uint8List readAsBytes() => file.readAsBytesSync();
}

class DoctorOption {
  const DoctorOption({required this.userId, required this.name});

  final String userId;
  final String name;
}

final recordsRepositoryProvider = Provider<RecordsRepository>((ref) {
  return RecordsRepository(Supabase.instance.client);
});
