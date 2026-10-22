import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// F44 — Índice de Saúde (paridade com a web).
///
/// Padrão Vitality dos melhores do nicho: um índice 0–100 em 4 pilares,
/// calculado 100% NO SERVIDOR via RPC `health_index()` (SECURITY DEFINER
/// com auth.uid()) — o cliente não envia nada, apenas renderiza.
class HealthPillar {
  const HealthPillar({
    required this.key,
    required this.label,
    required this.score,
    required this.max,
    required this.tips,
  });

  final String key;
  final String label;
  final int score;
  final int max;
  final List<String> tips;

  double get progress => max <= 0 ? 0 : (score / max).clamp(0.0, 1.0);

  factory HealthPillar.fromMap(Map<String, dynamic> m) {
    final rawTips = m['tips'];
    return HealthPillar(
      key: (m['key'] as String?) ?? '',
      label: (m['label'] as String?) ?? '',
      score: ((m['score'] as num?) ?? 0).toInt(),
      max: ((m['max'] as num?) ?? 0).toInt(),
      tips: rawTips is List
          ? rawTips.map((e) => e.toString()).toList(growable: false)
          : const <String>[],
    );
  }
}

class HealthIndexResult {
  const HealthIndexResult({
    required this.score,
    required this.grade,
    required this.pillars,
  });

  final int score;
  final String grade;
  final List<HealthPillar> pillars;

  factory HealthIndexResult.fromMap(Map<String, dynamic> m) {
    final raw = m['components'];
    return HealthIndexResult(
      score: ((m['score'] as num?) ?? 0).toInt(),
      grade: (m['grade'] as String?) ?? '',
      pillars: raw is List
          ? raw
              .whereType<Map<String, dynamic>>()
              .map(HealthPillar.fromMap)
              .toList(growable: false)
          : const <HealthPillar>[],
    );
  }
}

/// Provider assíncrono do índice (autoDispose — recalcula a cada entrada).
final healthIndexProvider =
    FutureProvider.autoDispose<HealthIndexResult>((ref) async {
  final client = Supabase.instance.client;
  final res = await client.rpc('health_index');
  if (res is! Map<String, dynamic>) {
    throw const FormatException('health_index: resposta inesperada');
  }
  if (res['success'] != true) {
    throw StateError('not_authenticated');
  }
  return HealthIndexResult.fromMap(res);
});
