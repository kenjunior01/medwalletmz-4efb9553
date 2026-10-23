import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// F46 — Linha Temporal de Saúde (paridade com a web).
///
/// Padrão MyChart/Epic: TODA a vida clínica numa única linha temporal —
/// consultas, análises (com estado do resultado), prescrições, registos
/// clínicos e diário. Um único round-trip via RPC `health_timeline()`
/// (SECURITY DEFINER com auth.uid() — o paciente só vê a sua vida).
class TimelineItem {
  const TimelineItem({
    required this.kind,
    required this.title,
    required this.at,
    this.detail,
    this.meta = const <String, dynamic>{},
  });

  final String kind; // consultation | lab | prescription | record | journal
  final String title;
  final String? detail;
  final DateTime at;
  final Map<String, dynamic> meta;

  bool get hasResult => meta['has_result'] == true;

  factory TimelineItem.fromMap(Map<String, dynamic> m) => TimelineItem(
        kind: (m['kind'] as String?) ?? 'record',
        title: (m['title'] as String?) ?? '',
        detail: m['detail'] as String?,
        at: DateTime.tryParse((m['at'] as String?) ?? '') ??
            DateTime.fromMillisecondsSinceEpoch(0),
        meta: (m['meta'] as Map<String, dynamic>?) ??
            const <String, dynamic>{},
      );
}

final healthTimelineProvider =
    FutureProvider.autoDispose<List<TimelineItem>>((ref) async {
  final res = await Supabase.instance.client.rpc(
    'health_timeline',
    params: {'p_limit': 120},
  );
  if (res is! Map<String, dynamic>) {
    throw const FormatException('health_timeline: resposta inesperada');
  }
  if (res['success'] != true) {
    throw StateError((res['error'] as String?) ?? 'erro_desconhecido');
  }
  final raw = res['items'];
  return raw is List
      ? raw
          .whereType<Map<String, dynamic>>()
          .map(TimelineItem.fromMap)
          .toList(growable: false)
      : const <TimelineItem>[];
});
