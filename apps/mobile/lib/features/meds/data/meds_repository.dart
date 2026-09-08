import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/offline/offline_cache.dart';

/// Registo diário de medicação — tabela `medication_logs`.
/// Um registo por (utilizador, item de receita, dia); medicação
/// ad-hoc (sem receita) tem prescription_item_id nulo.
class MedicationLog {
  const MedicationLog({
    required this.id,
    required this.loggedDate,
    this.prescriptionItemId,
    this.medicationName,
    this.dosage,
    this.takenAt,
    this.skipped = false,
  });

  final String id;
  final DateTime loggedDate;
  final String? prescriptionItemId;
  final String? medicationName;
  final String? dosage;
  final DateTime? takenAt;
  final bool skipped;

  bool get isTaken => takenAt != null;

  factory MedicationLog.fromJson(Map<String, dynamic> j) =>
      MedicationLog(
        id: j['id'] as String,
        loggedDate:
            DateTime.tryParse(j['logged_date']?.toString() ?? '') ??
                DateTime.now(),
        prescriptionItemId: j['prescription_item_id'] as String?,
        medicationName: j['medication_name'] as String?,
        dosage: j['dosage'] as String?,
        takenAt: DateTime.tryParse(j['taken_at']?.toString() ?? ''),
        skipped: j['skipped'] as bool? ?? false,
      );
}

/// Item de receita activo (para o plano de medicação de hoje).
class PlannedMedication {
  const PlannedMedication({
    required this.prescriptionItemId,
    required this.name,
    this.dosage,
    this.frequency,
  });

  final String prescriptionItemId;
  final String name;
  final String? dosage;
  final String? frequency;
}

/// Repositório do PillTracker — usa a RPC `get_today_medication_logs`
/// e a tabela `medication_logs` (RLS própria do utilizador).
class MedsRepository {
  MedsRepository(this._client);

  final SupabaseClient _client;

  /// Medicamentos de receitas recentes (últimos 60 dias).
  /// Com cache offline: sem internet serve o último plano guardado —
  /// os lembretes e o checklist do dia continuam a funcionar offline.
  Future<List<PlannedMedication>> fetchPlanned() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const [];
    try {
      final items = await OfflineCache.instance.cachedList(
        'meds_planned',
        fetch: () async {
          final since = DateTime.now()
              .subtract(const Duration(days: 60))
              .toIso8601String()
              .substring(0, 10);
          final prescriptions = await _client
              .from('prescriptions')
              .select('id')
              .eq('patient_id', uid)
              .gte('created_at', since);
          final ids = [
            for (final p in prescriptions) p['id'] as String,
          ];
          if (ids.isEmpty) return const <Map<String, dynamic>>[];
          final rows = await _client
              .from('prescription_items')
              .select('id, medication_name, dosage, frequency')
              .inFilter('prescription_id', ids);
          return [
            for (final it in rows)
              (it as Map).cast<String, dynamic>(),
          ];
        },
      );
      return [
        for (final it in items)
          PlannedMedication(
            prescriptionItemId: it['id'] as String,
            name: (it['medication_name'] ?? '') as String,
            dosage: it['dosage'] as String?,
            frequency: it['frequency'] as String?,
          ),
      ];
    } catch (_) {
      return const [];
    }
  }

  /// Registos de um dia (yyyy-mm-dd).
  Future<List<MedicationLog>> fetchDay(DateTime day) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const [];
    final d = day.toIso8601String().substring(0, 10);
    try {
      final rows = await _client
          .from('medication_logs')
          .select()
          .eq('user_id', uid)
          .eq('logged_date', d);
      return rows.map(MedicationLog.fromJson).toList();
    } catch (_) {
      return const [];
    }
  }

  /// Histórico dos últimos N dias (para streak e pontos).
  Future<List<MedicationLog>> fetchRecent({int days = 30}) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const [];
    final since = DateTime.now()
        .subtract(Duration(days: days))
        .toIso8601String()
        .substring(0, 10);
    try {
      final rows = await _client
          .from('medication_logs')
          .select()
          .eq('user_id', uid)
          .gte('logged_date', since)
          .order('logged_date', ascending: false);
      return rows.map(MedicationLog.fromJson).toList();
    } catch (_) {
      return const [];
    }
  }

  /// Marca um medicamento do plano como tomado / não tomado.
  Future<void> togglePlanned({
    required String prescriptionItemId,
    required String name,
    String? dosage,
    required bool taken,
  }) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return;
    final today = DateTime.now().toIso8601String().substring(0, 10);
    await _client.from('medication_logs').upsert({
      'user_id': uid,
      'prescription_item_id': prescriptionItemId,
      'medication_name': name,
      if (dosage != null) 'dosage': dosage,
      'logged_date': today,
      'taken_at': taken ? DateTime.now().toUtc().toIso8601String() : null,
      'skipped': false,
    }, onConflict: 'user_id,prescription_item_id,logged_date');
  }

  /// Marca como "não tomei" (com razão opcional).
  Future<void> skipPlanned({
    required String prescriptionItemId,
    required String name,
    String? reason,
  }) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return;
    final today = DateTime.now().toIso8601String().substring(0, 10);
    await _client.from('medication_logs').upsert({
      'user_id': uid,
      'prescription_item_id': prescriptionItemId,
      'medication_name': name,
      'logged_date': today,
      'taken_at': null,
      'skipped': true,
      if (reason != null) 'skipped_reason': reason,
    }, onConflict: 'user_id,prescription_item_id,logged_date');
  }

  /// Adiciona medicação ad-hoc (sem receita) para hoje.
  Future<void> addAdHoc({
    required String name,
    String? dosage,
  }) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return;
    await _client.from('medication_logs').insert({
      'user_id': uid,
      'medication_name': name,
      if (dosage != null && dosage.isNotEmpty) 'dosage': dosage,
      'logged_date': DateTime.now().toIso8601String().substring(0, 10),
    });
  }

  /// Remove um registo ad-hoc.
  Future<void> remove(String logId) async {
    await _client.from('medication_logs').delete().eq('id', logId);
  }

  /// Marca/desmarca um registo existente (ad-hoc).
  Future<void> toggleAdHoc(MedicationLog log) async {
    final taken = !log.isTaken;
    await _client.from('medication_logs').update({
      'taken_at':
          taken ? DateTime.now().toUtc().toIso8601String() : null,
      'skipped': false,
    }).eq('id', log.id);
  }

  /// Streak: dias consecutivos (incluindo hoje se já houve toma)
  /// com pelo menos um medicamento tomado.
  static int computeStreak(List<MedicationLog> recent) {
    final byDay = <String, bool>{};
    for (final l in recent) {
      final key = l.loggedDate.toIso8601String().substring(0, 10);
      if (l.isTaken) byDay[key] = true;
    }
    var streak = 0;
    var day = DateTime.now();
    // Se hoje ainda não registou, começa a contar de ontem.
    if (!byDay.containsKey(day.toIso8601String().substring(0, 10))) {
      day = day.subtract(const Duration(days: 1));
    }
    for (var i = 0; i < 60; i++) {
      final key = day.toIso8601String().substring(0, 10);
      if (byDay[key] == true) {
        streak++;
      } else {
        break;
      }
      day = day.subtract(const Duration(days: 1));
    }
    return streak;
  }
}
