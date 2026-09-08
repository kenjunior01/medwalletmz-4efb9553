import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Diário de bem-estar — tabela `health_journal` (1 entrada por dia,
/// UNIQUE(user_id, entry_date)). A coluna `ai_insight` é preenchida por um
/// job semanal no backend (Gemini) — a app apenas a mostra quando existe.
class JournalEntry {
  const JournalEntry({
    required this.entryDate,
    this.mood,
    this.energy,
    this.sleepHours,
    this.sleepQuality,
    this.painLevel,
    this.symptoms = const [],
    this.notes,
    this.gratitude,
    this.aiInsight,
  });

  final DateTime entryDate;
  final int? mood; // 1..5
  final int? energy; // 1..5
  final double? sleepHours;
  final int? sleepQuality; // 1..5
  final int? painLevel; // 0..10
  final List<String> symptoms;
  final String? notes;
  final String? gratitude;
  final String? aiInsight;

  bool get isFilled =>
      mood != null ||
      energy != null ||
      sleepHours != null ||
      notes != null ||
      gratitude != null;

  factory JournalEntry.fromJson(Map<String, dynamic> j) => JournalEntry(
        entryDate:
            DateTime.tryParse(j['entry_date']?.toString() ?? '') ??
                DateTime.now(),
        mood: (j['mood'] as num?)?.toInt(),
        energy: (j['energy'] as num?)?.toInt(),
        sleepHours: double.tryParse(j['sleep_hours']?.toString() ?? ''),
        sleepQuality: (j['sleep_quality'] as num?)?.toInt(),
        painLevel: (j['pain_level'] as num?)?.toInt(),
        symptoms: [
          for (final s in (j['symptoms'] as List?) ?? const [])
            s.toString(),
        ],
        notes: j['notes'] as String?,
        gratitude: j['gratitude'] as String?,
        aiInsight: j['ai_insight'] as String?,
      );
}

class JournalRepository {
  JournalRepository(this._client);

  final SupabaseClient _client;

  String? get _uid => _client.auth.currentUser?.id;

  String _dateKey(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  /// Entrada de hoje (ou de um dia específico).
  Future<JournalEntry?> fetchToday([DateTime? day]) async {
    final uid = _uid;
    if (uid == null) return null;
    try {
      final row = await _client
          .from('health_journal')
          .select()
          .eq('user_id', uid)
          .eq('entry_date', _dateKey(day ?? DateTime.now()))
          .maybeSingle();
      if (row == null) return null;
      return JournalEntry.fromJson((row as Map).cast<String, dynamic>());
    } catch (_) {
      return null;
    }
  }

  /// Histórico recente (para o gráfico de humor e streak).
  Future<List<JournalEntry>> fetchRecent({int days = 14}) async {
    final uid = _uid;
    if (uid == null) return const [];
    try {
      final since =
          DateTime.now().subtract(Duration(days: days));
      final rows = await _client
          .from('health_journal')
          .select()
          .eq('user_id', uid)
          .gte('entry_date', _dateKey(since))
          .order('entry_date', ascending: false)
          .limit(days);
      return [
        for (final r in (rows as List))
          JournalEntry.fromJson((r as Map).cast<String, dynamic>()),
      ];
    } catch (_) {
      return const [];
    }
  }

  /// Streak de dias consecutivos com entrada.
  int computeStreak(List<JournalEntry> entries) {
    final dates = entries
        .where((e) => e.isFilled)
        .map((e) => DateTime(e.entryDate.year, e.entryDate.month,
            e.entryDate.day))
        .toSet();
    if (dates.isEmpty) return 0;
    var streak = 0;
    var cursor = DateTime.now();
    // Permite que a entrada de "hoje" ainda não exista sem quebrar o streak.
    if (!dates.contains(DateTime(cursor.year, cursor.month, cursor.day))) {
      cursor = cursor.subtract(const Duration(days: 1));
    }
    while (dates
        .contains(DateTime(cursor.year, cursor.month, cursor.day))) {
      streak++;
      cursor = cursor.subtract(const Duration(days: 1));
    }
    return streak;
  }

  /// Guarda (ou actualiza) a entrada do dia — upsert no par user_id+entry_date.
  Future<String?> upsertToday({
    int? mood,
    int? energy,
    double? sleepHours,
    int? sleepQuality,
    int? painLevel,
    List<String>? symptoms,
    String? notes,
    String? gratitude,
  }) async {
    final uid = _uid;
    if (uid == null) return 'Sessão expirada. Entra novamente.';
    try {
      await _client.from('health_journal').upsert({
        'user_id': uid,
        'entry_date': _dateKey(DateTime.now()),
        if (mood != null) 'mood': mood,
        if (energy != null) 'energy': energy,
        if (sleepHours != null) 'sleep_hours': sleepHours,
        if (sleepQuality != null) 'sleep_quality': sleepQuality,
        if (painLevel != null) 'pain_level': painLevel,
        if (symptoms != null) 'symptoms': symptoms,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
        if (gratitude != null && gratitude.isNotEmpty)
          'gratitude': gratitude,
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      }, onConflict: 'user_id,entry_date');
      return null;
    } catch (_) {
      return 'Não foi possível guardar a entrada. Tenta novamente.';
    }
  }
}

final journalRepositoryProvider = Provider<JournalRepository>((ref) {
  return JournalRepository(Supabase.instance.client);
});
