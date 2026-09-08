import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_controller.dart';
import '../data/regional_models.dart';
import '../data/regional_repository.dart';

final regionalRepositoryProvider = Provider<RegionalRepository>(
  (ref) => RegionalRepository(ref.watch(supabaseClientProvider)),
);

/// O utilizador pode gerir? Papéis + países (null = admin global).
final regionalAccessProvider = FutureProvider<Set<String>?>((ref) async {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return const {};
  final roles = await ref.watch(userRolesProvider.future);
  final isManager = roles.any(managerRoles.contains);
  if (!isManager) return const {};
  return ref.watch(regionalRepositoryProvider).myManagedCountries(uid);
});

/// Países disponíveis no seletor (todos, ou apenas os geridos).
final managerCountriesProvider = FutureProvider<List<CountryLite>>((ref) async {
  final repo = ref.watch(regionalRepositoryProvider);
  final countries = await repo.fetchCountries();
  final managed = await ref.watch(regionalAccessProvider.future);
  if (managed == null) return countries; // admin global
  if (countries.isEmpty) {
    return [
      for (final id in managed) CountryLite(id: id, name: id),
    ];
  }
  return [
    for (final c in countries)
      if (managed.contains(c.id)) c,
  ];
});
