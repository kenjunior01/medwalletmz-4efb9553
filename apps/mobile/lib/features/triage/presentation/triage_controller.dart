import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_controller.dart';
import '../data/triage_models.dart';
import '../data/triage_repository.dart';

final triageRepositoryProvider = Provider<TriageRepository>(
  (ref) => TriageRepository(ref.watch(supabaseClientProvider)),
);

/// Histórico de triagens do utilizador em tempo real.
final triageHistoryProvider = StreamProvider<List<TriageLog>>((ref) {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return const Stream.empty();
  return ref.watch(triageRepositoryProvider).watchMyTriages(uid);
});
