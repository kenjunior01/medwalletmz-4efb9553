import 'package:supabase_flutter/supabase_flutter.dart';

import 'notification_models.dart';

/// Repositório de notificações — `automated_notifications` em tempo real
/// (o mecanismo de entrega do web) + preferências via RPC oficial.
class NotificationRepository {
  NotificationRepository(this._client);

  final SupabaseClient _client;

  /// Notificações do utilizador em tempo real (mais recentes primeiro).
  /// RLS garante que só as linhas do utilizador chegam por este filtro.
  Stream<List<AppNotification>> watchMine(String uid) => _client
      .from('automated_notifications')
      .stream(primaryKey: ['id'])
      .eq('user_id', uid)
      .order('created_at', ascending: false)
      .limit(120)
      .map((rows) => rows.map(AppNotification.fromJson).toList());

  /// Comunicados globais (user_id nulo — dicas e campanhas da
  /// comunidade). Leitura pontual, sem realtime, para não drenar dados.
  Future<List<AppNotification>> fetchBroadcasts({int limit = 12}) async {
    try {
      final rows = await _client
          .from('automated_notifications')
          .select()
          .isNull('user_id')
          .order('created_at', ascending: false)
          .limit(limit);
      return rows.map(AppNotification.fromJson).toList();
    } catch (_) {
      return const [];
    }
  }

  /// Marca uma notificação como apresentada (RPC security definer do
  /// pipeline — não falha a UI se o RPC estiver indisponível).
  Future<void> markDelivered(String id) async {
    try {
      await _client.rpc('mark_notification_sent', params: {
        '_notification_id': id,
        '_status': 'delivered',
      });
    } catch (_) {}
  }

  /// Marca um lote (usado pelo botão "marcar tudo como lida").
  Future<void> markManyDelivered(List<String> ids) async {
    for (final id in ids) {
      await markDelivered(id);
    }
  }

  // ── Preferências ──────────────────────────────────────────────────

  Future<NotificationPrefs> fetchPrefs(String uid) async {
    final rows = await _client
        .from('user_notification_preferences')
        .select()
        .eq('user_id', uid)
        .limit(1);
    if (rows.isEmpty) return const NotificationPrefs();
    return NotificationPrefs.fromJson(
        Map<String, dynamic>.from(rows.first));
  }

  /// Guarda via RPC `upsert_notification_preferences` (assinatura
  /// oficial das migrations — evita depender de políticas de UPDATE).
  Future<void> savePrefs(String uid, NotificationPrefs p) async {
    await _client.rpc('upsert_notification_preferences', params: {
      'p_user_id': uid,
      'p_daily_health_checkin': p.dailyHealthCheckin,
      'p_daily_health_recommendations': p.dailyHealthRecommendations,
      'p_consultation_updates': p.consultationUpdates,
      'p_order_updates': p.orderUpdates,
      'p_quiet_hours_start': p.quietHoursStart,
      'p_quiet_hours_end': p.quietHoursEnd,
    });
  }
}
