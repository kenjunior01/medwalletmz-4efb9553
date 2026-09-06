/// Notificação — tabela `automated_notifications`.
///
/// Pipeline do web: Edge Functions inserem a linha (`pending`) → o
/// cliente subscreve em tempo real e apresenta o banner local → ao ser
/// vista, chamamos o RPC `mark_notification_sent(id, 'delivered')`.
/// "Não lida" = estado `pending` (ainda não apresentada ao utilizador).
class AppNotification {
  const AppNotification({
    required this.id,
    this.userId,
    required this.title,
    required this.body,
    this.channel = 'push',
    this.vertical = 'community',
    this.priority = 'normal',
    this.status = 'pending',
    this.scheduledFor,
    this.metadata = const {},
    required this.createdAt,
  });

  final String id;
  final String? userId;

  /// push | sms | email
  final String channel;
  final String title;
  final String body;

  /// consultas | saude | carteira | comunidade | sistema …
  final String vertical;
  final String priority;

  /// pending | sent | delivered | failed
  final String status;
  final DateTime? scheduledFor;
  final Map<String, dynamic> metadata;
  final DateTime createdAt;

  bool get isUnread => status == 'pending';

  /// Rota interna opcional enviada no metadata (ex.: '/bookings').
  String? get route => metadata['route'] as String?;

  static DateTime? _date(Object? v) =>
      v == null ? null : DateTime.tryParse(v.toString());

  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
        id: j['id'] as String,
        userId: j['user_id'] as String?,
        title: (j['title'] ?? '') as String,
        body: (j['body'] ?? '') as String,
        channel: (j['channel'] ?? 'push') as String,
        vertical: (j['vertical'] ?? 'community') as String,
        priority: (j['priority'] ?? 'normal') as String,
        status: (j['status'] ?? 'pending') as String,
        scheduledFor: _date(j['scheduled_for']),
        metadata: j['metadata'] is Map
            ? Map<String, dynamic>.from(j['metadata'] as Map)
            : const {},
        createdAt: _date(j['created_at']) ?? DateTime.now(),
      );
}

/// Preferências — tabela `user_notification_preferences`.
/// Cada utilizador escolhe o que quer receber e as horas de silêncio.
class NotificationPrefs {
  const NotificationPrefs({
    this.dailyHealthCheckin = true,
    this.dailyHealthRecommendations = true,
    this.consultationUpdates = true,
    this.orderUpdates = true,
    this.quietHoursStart = 22,
    this.quietHoursEnd = 7,
  });

  final bool dailyHealthCheckin;
  final bool dailyHealthRecommendations;
  final bool consultationUpdates;
  final bool orderUpdates;
  final int quietHoursStart;
  final int quietHoursEnd;

  factory NotificationPrefs.fromJson(Map<String, dynamic> j) =>
      NotificationPrefs(
        dailyHealthCheckin: j['daily_health_checkin'] as bool? ?? true,
        dailyHealthRecommendations:
            j['daily_health_recommendations'] as bool? ?? true,
        consultationUpdates: j['consultation_updates'] as bool? ?? true,
        orderUpdates: j['order_updates'] as bool? ?? true,
        quietHoursStart: (j['quiet_hours_start'] as num?)?.toInt() ?? 22,
        quietHoursEnd: (j['quiet_hours_end'] as num?)?.toInt() ?? 7,
      );
}

/// Catálogo de verticais apresentadas no centro de notificações.
const notificationVerticals = <String, (String, String)>{
  // chave: (rótulo, ícone textual leve)
  'consultas': ('Consultas', '🩺'),
  'saude': ('Saúde', '💚'),
  'carteira': ('Carteira', '💳'),
  'comunidade': ('Comunidade', '🌍'),
  'sistema': ('Sistema', '⚙️'),
};

(String, String) verticalInfo(String key) =>
    notificationVerticals[key] ?? ('Notificação', '🔔');
