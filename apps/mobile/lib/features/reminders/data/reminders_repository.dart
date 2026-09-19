import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/reminders/meds_reminder_service.dart';
import '../../meds/data/meds_repository.dart';

/// Lembretes de medicação — 100% local-first.
///
/// A app não tem tabela `medication_reminders` (verificação live: 404 no
/// anon REST). O plano deriva das receitas activas (`prescriptions` +
/// `prescription_items` via `MedsRepository`, com cache offline) e as
/// horas de cada dose derivam da frequência textual
/// (`MedsReminderService.hoursForFrequency`). As preferências do
/// utilizador (ligado/desligado, por medicamento) guardam-se em
/// SharedPreferences — os lembretes continuam a funcionar SEM internet.
class RemindersRepository {
  RemindersRepository(this._client, this._prefs);

  final SupabaseClient _client;
  final SharedPreferences _prefs;

  static const _kMaster = 'reminders.master';
  static const _kMutedPrefix = 'reminders.muted.';
  static const _kPermsAsked = 'reminders.permsAsked';

  MedsRepository get _meds => MedsRepository(_client);

  bool get masterOn => _prefs.getBool(_kMaster) ?? true;
  bool get permsAsked => _prefs.getBool(_kPermsAsked) ?? false;

  Set<String> mutedItems() {
    final keys = _prefs.getKeys().where((k) => k.startsWith(_kMutedPrefix));
    return {
      for (final k in keys)
        if (_prefs.getBool(k) ?? false) k.substring(_kMutedPrefix.length),
    };
  }

  Future<void> setMasterOn(bool value) async {
    await _prefs.setBool(_kMaster, value);
    await reschedule();
  }

  Future<void> setMuted(String prescriptionItemId, bool muted) async {
    await _prefs.setBool('$_kMutedPrefix$prescriptionItemId', muted);
    await reschedule();
  }

  Future<void> markPermsAsked() => _prefs.setBool(_kPermsAsked, true);

  /// Volta a agendar as notificações locais com os medicamentos NÃO
  /// silenciados. Master desligado → cancela tudo.
  Future<void> reschedule() async {
    if (!masterOn) {
      await MedsReminderService.instance.cancelAll();
      return;
    }
    final planned = await _meds.fetchPlanned();
    final muted = mutedItems();
    final enabled = [
      for (final m in planned) if (!muted.contains(m.prescriptionItemId)) m,
    ];
    await MedsReminderService.instance.scheduleForMedications([
      for (final m in enabled)
        (
          id: m.prescriptionItemId,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
        ),
    ]);
  }

  /// Fotografia completa de hoje: plano, registos, histórico e preferências.
  Future<RemindersSnapshot> load() async {
    final results = await Future.wait([
      _meds.fetchPlanned(),
      _meds.fetchDay(DateTime.now()),
      _meds.fetchRecent(days: 14),
    ]);
    return RemindersSnapshot(
      planned: results[0] as List<PlannedMedication>,
      today: results[1] as List<MedicationLog>,
      recent: results[2] as List<MedicationLog>,
      muted: mutedItems(),
      masterOn: masterOn,
      permsAsked: permsAsked,
    );
  }
}

/// Estado materializado do ecrã de lembretes.
class RemindersSnapshot {
  const RemindersSnapshot({
    required this.planned,
    required this.today,
    required this.recent,
    required this.muted,
    required this.masterOn,
    required this.permsAsked,
  });

  final List<PlannedMedication> planned;
  final List<MedicationLog> today;
  final List<MedicationLog> recent;
  final Set<String> muted;
  final bool masterOn;
  final bool permsAsked;

  /// itemId → log de hoje (um registo por item/dia na tabela).
  Map<String, MedicationLog> get todayByItem => {
        for (final l in today)
          if (l.prescriptionItemId != null) l.prescriptionItemId!: l,
      };

  List<PlannedMedication> get enabledMeds => [
        for (final m in planned) if (!muted.contains(m.prescriptionItemId)) m,
      ];

  /// Adesão dos últimos 14 dias (0–100) para o gráfico.
  List<({String day, int percent})> adherenceHistory() {
    final byDay = <String, int>{};
    for (final l in recent) {
      if (!l.isTaken) continue;
      final k = l.loggedDate.toIso8601String().substring(0, 10);
      byDay[k] = (byDay[k] ?? 0) + 1;
    }
    final total = planned.isEmpty ? 1 : planned.length;
    final days = List.generate(
      14,
      (i) => DateTime.now()
          .subtract(Duration(days: 13 - i))
          .toIso8601String()
          .substring(0, 10),
    );
    return [
      for (final d in days)
        (
          day: d,
          percent: ((byDay[d] ?? 0) / total * 100).round().clamp(0, 100),
        ),
    ];
  }
}

/// Próxima dose prevista (consumida pelo cartão da Home).
class NextDose {
  const NextDose({
    required this.medName,
    required this.dosage,
    required this.time,
    required this.streak,
  });

  final String medName;
  final String? dosage;
  final DateTime time;
  final int streak;

  String get countdownLabel {
    final diff = time.difference(DateTime.now());
    if (diff.isNegative) return 'agora';
    final h = diff.inHours;
    final m = diff.inMinutes % 60;
    if (h > 0) {
      return 'em ${h}h${m > 0 ? '${m.toString().padLeft(2, '0')}min' : ''}';
    }
    return 'em $mmin';
  }
}

/// Calcula a próxima dose do plano activo (medicamentos não silenciados
/// e ainda sem registo de toma hoje). Sem plano activo → null.
Future<NextDose?> computeNextDose(SharedPreferences prefs) async {
  final repo = RemindersRepository(Supabase.instance.client, prefs);
  final snap = await repo.load();
  final meds = snap.enabledMeds;
  if (meds.isEmpty) return null;

  final takenByItem = snap.todayByItem;
  final now = DateTime.now();

  ({PlannedMedication med, DateTime time})? best;
  for (final m in meds) {
    if (takenByItem[m.prescriptionItemId]?.isTaken ?? false) continue;
    final hours =
        [...MedsReminderService.hoursForFrequency(m.frequency)]..sort();
    for (final h in hours) {
      var t = DateTime(now.year, now.month, now.day, h);
      if (t.isBefore(now)) t = t.add(const Duration(days: 1));
      if (best == null || t.isBefore(best!.time)) {
        best = (med: m, time: t);
      }
    }
  }
  if (best == null) return null;

  return NextDose(
    medName: best.med.name,
    dosage: best.med.dosage,
    time: best.time,
    streak: MedsRepository.computeStreak(snap.recent),
  );
}

/// Versão leve para a Home — devolve a próxima dose do plano activo.
final nextDoseProvider = FutureProvider.autoDispose<NextDose?>((ref) async {
  final prefs = await SharedPreferences.getInstance();
  return computeNextDose(prefs);
});

/// Joy Coins do utilizador — lê `user_gamification` (mesma tabela da web).
final joyCoinsProvider = FutureProvider.autoDispose<int>((ref) async {
  final client = Supabase.instance.client;
  final uid = client.auth.currentUser?.id;
  if (uid == null) return 0;
  try {
    final rows = await client
        .from('user_gamification')
        .select('joy_coins')
        .eq('user_id', uid)
        .limit(1);
    if (rows.isEmpty) return 0;
    return (rows.first['joy_coins'] as num?)?.toInt() ?? 0;
  } catch (_) {
    return 0;
  }
});
