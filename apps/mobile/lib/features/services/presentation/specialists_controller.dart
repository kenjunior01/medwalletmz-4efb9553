import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_controller.dart';
import '../data/services_repository.dart';
import '../domain/service_models.dart';

/// Critério de ordenação da lista de especialistas.
enum SpecialistSort { rating, price, experience }

/// Especialistas filtrados por especialidade (family por
/// `{specialtyId}|{sort}`) — usado pela rota pós-triagem e pelo
/// catálogo de saúde.
final specialistsProvider = FutureProvider.family<List<Doctor>, String>(
  (ref, key) async {
    final parts = key.split('|');
    final specialtyId = parts[0] == 'all' ? null : parts[0];
    final sort = SpecialistSort.values.firstWhere(
      (s) => s.name == (parts.length > 1 ? parts[1] : 'rating'),
      orElse: () => SpecialistSort.rating,
    );

    final repo = ref.watch(specialistsRepositoryProvider);
    final list = await repo.fetchDoctors(specialtyId: specialtyId);
    switch (sort) {
      case SpecialistSort.rating:
        list.sort((a, b) => b.rating.compareTo(a.rating));
      case SpecialistSort.price:
        list.sort((a, b) => a.consultationFee.compareTo(b.consultationFee));
      case SpecialistSort.experience:
        list.sort((a, b) => b.yearsExperience.compareTo(a.yearsExperience));
    }
    return list;
  },
);

/// Chave de provider a partir do estado do ecrã.
String specialistsKey(String? specialtyId, SpecialistSort sort) =>
    '${specialtyId ?? 'all'}|${sort.name}';

final specialistsRepositoryProvider = Provider<ServicesRepository>(
  (ref) => ServicesRepository(ref.watch(supabaseClientProvider)),
);
