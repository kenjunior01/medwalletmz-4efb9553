import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_controller.dart';
import '../data/prescription_repository.dart';
import '../domain/prescription_models.dart';

final prescriptionRepositoryProvider = Provider<PrescriptionRepository>(
  (ref) => PrescriptionRepository(ref.watch(supabaseClientProvider)),
);

/// Receitas do utilizador — como paciente ou como médico (role).
final prescriptionsProvider = StreamProvider<List<Prescription>>((ref) {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return const Stream.empty();
  final asDoctor = ref.watch(userRolesProvider).value?.contains('doctor') ??
      false;
  return ref
      .watch(prescriptionRepositoryProvider)
      .watchPrescriptions(uid, asDoctor: asDoctor);
});

/// Itens por receita (family).
final prescriptionItemsProvider =
    FutureProvider.family<List<PrescriptionItem>, String>((ref, idsKey) {
  final ids = idsKey.split(',');
  return ref
      .watch(prescriptionRepositoryProvider)
      .fetchItems(ids);
});
