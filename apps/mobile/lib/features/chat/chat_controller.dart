import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/presentation/auth_controller.dart';
import 'data/chat_repository.dart';

final chatRepositoryProvider = Provider<ChatRepository>(
  (ref) => ChatRepository(ref.watch(supabaseClientProvider)),
);

/// Conversas do utilizador em tempo real.
final conversationsProvider = StreamProvider((ref) {
  return ref.watch(chatRepositoryProvider).watchConversations();
});

/// Mensagens de uma conversa em tempo real.
final chatMessagesProvider =
    StreamProvider.family((ref, String conversationId) {
  return ref.watch(chatRepositoryProvider).watchMessages(conversationId);
});
