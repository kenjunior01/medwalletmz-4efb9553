import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/presentation/auth_controller.dart';
import 'data/consultation_chat_models.dart';
import 'data/consultation_chat_repository.dart';

final consultationChatRepositoryProvider = Provider<ConsultationChatRepository>(
  (ref) => ConsultationChatRepository(ref.watch(supabaseClientProvider)),
);

/// Mensagens de uma consulta em tempo real.
final consultationMessagesProvider =
    StreamProvider.family<List<ConsultationMessage>, String>((ref, id) {
  return ref.watch(consultationChatRepositoryProvider).watchMessages(id);
});

/// Fios de conversa do utilizador — como paciente ou como médico
/// (detectado pelo role `doctor` em `user_roles`).
final consultationThreadsProvider =
    StreamProvider<List<ConsultationThread>>((ref) {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return const Stream.empty();
  final asDoctor =
      ref.watch(userRolesProvider).value?.contains('doctor') ?? false;
  return ref
      .watch(consultationChatRepositoryProvider)
      .watchThreads(uid, asDoctor: asDoctor);
});
