import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Família / Cuidador — MESMAS tabelas da versão web:
///   • familiares        → `family_members`        (por caretaker_user_id)
///   • logs de medicação → `family_medication_logs` (tomou / saltou)
/// O familiar não precisa de conta própria: o cuidador gere tudo pela app.
class FamilyMember {
  const FamilyMember({
    required this.id,
    required this.fullName,
    required this.relationship,
    this.birthDate,
    this.gender,
    this.bloodType,
    this.allergies = const [],
    this.chronicConditions = const [],
    this.medications = const [],
    this.emergencyContact,
    this.color = '#3B82F6',
    this.isActive = true,
  });

  final String id;
  final String fullName;
  final String relationship; // parent|child|spouse|sibling|grandparent|other
  final DateTime? birthDate;
  final String? gender;
  final String? bloodType;
  final List<String> allergies;
  final List<String> chronicConditions;
  final List<String> medications;
  final String? emergencyContact;
  final String color;
  final bool isActive;

  int? get age {
    final b = birthDate;
    if (b == null) return null;
    final now = DateTime.now();
    var a = now.year - b.year;
    if (now.month < b.month ||
        (now.month == b.month && now.day < b.day)) {
      a--;
    }
    return a;
  }

  String get relationshipLabel {
    switch (relationship) {
      case 'parent':
        return 'Pai/Mãe';
      case 'child':
        return 'Filho(a)';
      case 'spouse':
        return 'Cônjuge';
      case 'sibling':
        return 'Irmão(ã)';
      case 'grandparent':
        return 'Avô/Avó';
      default:
        return 'Familiar';
    }
  }

  Color get uiColor {
    final hex = color.replaceFirst('#', '');
    if (hex.length == 6) {
      final v = int.tryParse(hex, radix: 16);
      if (v != null) return Color(0xFF000000 | v);
    }
    return defaultBlue;
  }

  static const defaultBlue = Color(0xFF3B82F6);

  factory FamilyMember.fromJson(Map<String, dynamic> j) => FamilyMember(
        id: j['id'] as String,
        fullName: (j['full_name'] ?? 'Familiar') as String,
        relationship: (j['relationship'] ?? 'other') as String,
        birthDate: DateTime.tryParse(j['birth_date']?.toString() ?? ''),
        gender: j['gender'] as String?,
        bloodType: j['blood_type'] as String?,
        allergies: [
          for (final a in (j['allergies'] as List?) ?? const []) a.toString(),
        ],
        chronicConditions: [
          for (final c in (j['chronic_conditions'] as List?) ?? const [])
            c.toString(),
        ],
        medications: [
          for (final m in (j['medications'] as List?) ?? const [])
            m.toString(),
        ],
        emergencyContact: j['emergency_contact'] as String?,
        color: (j['color'] ?? '#3B82F6') as String,
        isActive: j['is_active'] as bool? ?? true,
      );
}

/// Log de medicação de hoje para um familiar.
class FamilyMedLog {
  const FamilyMedLog({
    required this.id,
    required this.medicationName,
    required this.scheduledTime,
    this.takenAt,
    this.skippedAt,
    this.skippedReason,
  });

  final String id;
  final String medicationName;
  final String scheduledTime; // 'HH:MM:SS'
  final DateTime? takenAt;
  final DateTime? skippedAt;
  final String? skippedReason;

  bool get isTaken => takenAt != null;
  bool get isSkipped => skippedAt != null;
  bool get isPending => !isTaken && !isSkipped;

  String get timeLabel {
    final parts = scheduledTime.split(':');
    if (parts.length >= 2) return '${parts[0]}:${parts[1]}';
    return scheduledTime;
  }

  factory FamilyMedLog.fromJson(Map<String, dynamic> j) => FamilyMedLog(
        id: j['id'] as String,
        medicationName: (j['medication_name'] ?? 'Medicamento') as String,
        scheduledTime: (j['scheduled_time'] ?? '08:00:00') as String,
        takenAt: DateTime.tryParse(j['taken_at']?.toString() ?? ''),
        skippedAt: DateTime.tryParse(j['skipped_at']?.toString() ?? ''),
        skippedReason: j['skipped_reason'] as String?,
      );
}

class FamilyRepository {
  FamilyRepository(this._client);

  final SupabaseClient _client;

  String? get _uid => _client.auth.currentUser?.id;

  /// Os meus familiares.
  Future<List<FamilyMember>> fetchMembers() async {
    final uid = _uid;
    if (uid == null) return const [];
    try {
      final rows = await _client
          .from('family_members')
          .select()
          .eq('caretaker_user_id', uid)
          .eq('is_active', true)
          .order('created_at');
      return [
        for (final r in (rows as List))
          FamilyMember.fromJson((r as Map).cast<String, dynamic>()),
      ];
    } catch (_) {
      return const [];
    }
  }

  /// Cria ou actualiza um familiar.
  Future<String?> upsertMember({
    String? id,
    required String fullName,
    required String relationship,
    DateTime? birthDate,
    String? gender,
    String? bloodType,
    List<String>? allergies,
    List<String>? chronicConditions,
    List<String>? medications,
    String? emergencyContact,
    String color = '#3B82F6',
  }) async {
    final uid = _uid;
    if (uid == null) return 'Sessão expirada. Entra novamente.';
    try {
      await _client.from('family_members').upsert({
        if (id != null) 'id': id,
        'caretaker_user_id': uid,
        'full_name': fullName,
        'relationship': relationship,
        if (birthDate != null)
          'birth_date': birthDate.toIso8601String().substring(0, 10),
        if (gender != null) 'gender': gender,
        if (bloodType != null && bloodType.isNotEmpty)
          'blood_type': bloodType,
        'allergies': allergies ?? const [],
        'chronic_conditions': chronicConditions ?? const [],
        'medications': medications ?? const [],
        if (emergencyContact != null && emergencyContact.isNotEmpty)
          'emergency_contact': emergencyContact,
        'color': color,
        'is_active': true,
      });
      return null;
    } catch (_) {
      return 'Não foi possível guardar o familiar. Tenta novamente.';
    }
  }

  /// "Remove" um familiar (soft delete — is_active=false).
  Future<void> removeMember(String id) async {
    try {
      await _client
          .from('family_members')
          .update({'is_active': false}).eq('id', id);
    } catch (_) {}
  }

  /// Logs de medicação do familiar (os mais recentes primeiro).
  Future<List<FamilyMedLog>> fetchMedLogs(String memberId) async {
    try {
      final rows = await _client
          .from('family_medication_logs')
          .select()
          .eq('family_member_id', memberId)
          .order('created_at', ascending: false)
          .limit(10);
      return [
        for (final r in (rows as List))
          FamilyMedLog.fromJson((r as Map).cast<String, dynamic>()),
      ];
    } catch (_) {
      return const [];
    }
  }

  /// Adiciona um lembrete de medicação para o familiar.
  Future<String?> addMedLog({
    required String memberId,
    required String medicationName,
    required String scheduledTime, // 'HH:MM'
  }) async {
    final uid = _uid;
    if (uid == null) return 'Sessão expirada. Entra novamente.';
    try {
      await _client.from('family_medication_logs').insert({
        'family_member_id': memberId,
        'caretaker_user_id': uid,
        'medication_name': medicationName,
        'scheduled_time': scheduledTime,
      });
      return null;
    } catch (_) {
      return 'Não foi possível adicionar o lembrete.';
    }
  }

  /// Marca que o familiar tomou (ou saltou) a medicação.
  Future<void> markLog({
    required String logId,
    required bool taken,
    String? skipReason,
  }) async {
    try {
      await _client.from('family_medication_logs').update({
        if (taken) 'taken_at': DateTime.now().toUtc().toIso8601String(),
        if (!taken) 'skipped_at': DateTime.now().toUtc().toIso8601String(),
        if (!taken && skipReason != null) 'skipped_reason': skipReason,
      }).eq('id', logId);
    } catch (_) {}
  }
}

final familyRepositoryProvider = Provider<FamilyRepository>((ref) {
  return FamilyRepository(Supabase.instance.client);
});
