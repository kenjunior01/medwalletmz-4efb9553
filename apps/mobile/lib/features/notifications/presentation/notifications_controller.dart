import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_controller.dart';
import '../data/notification_models.dart';
import '../data/notification_repository.dart';

final notificationRepositoryProvider = Provider<NotificationRepository>(
  (ref) => NotificationRepository(ref.watch(supabaseClientProvider)),
);

/// Notificações do utilizador em tempo real (stream Supabase).
final myNotificationsProvider = StreamProvider<List<AppNotification>>((ref) {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return const Stream.empty();
  return ref.watch(notificationRepositoryProvider).watchMine(uid);
});

/// Contagem de não lidas (estado `pending`) — alimenta o badge do sino
/// e o banner in-app.
final unreadNotificationsProvider = Provider<int>((ref) {
  final list = ref.watch(myNotificationsProvider).value ?? const [];
  return list.where((n) => n.isUnread).length;
});

/// Dicas/comunicados globais (leitura pontual).
final broadcastsProvider = FutureProvider<List<AppNotification>>((ref) {
  return ref.watch(notificationRepositoryProvider).fetchBroadcasts();
});
