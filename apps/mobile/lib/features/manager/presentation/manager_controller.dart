import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_controller.dart';
import '../data/manager_models.dart';
import '../data/manager_repository.dart';

export '../data/manager_models.dart'
    show
        CountryFull,
        CountryStats,
        InstitutionRow,
        PendingPayment,
        ManagerUserRow,
        SosAlertRow,
        RegionalContentItem,
        RegionalRankingRow,
        ManagerAssignment;

final managerRepositoryProvider =
    Provider<ManagerRepository>((ref) {
  return ManagerRepository(ref.watch(supabaseClientProvider));
});

// Re-exporta os providers antigos da gestão regional para os ecrãs
// existentes continuarem a funcionar.
final regionalRepositoryProvider = Provider<ManagerRepository>(
  (ref) => ref.watch(managerRepositoryProvider),
);

/// Acesso: null = admin global (todos os países), vazio = sem acesso.
final managerAccessProvider = FutureProvider<Set<String>?>((ref) async {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return const {};
  final roles = await ref.watch(userRolesProvider.future);
  final isManager = roles.any(managerRoles.contains);
  if (!isManager) return const {};
  return ref.watch(managerRepositoryProvider).myManagedCountries(uid);
});

/// true se o utilizador é admin global (gestor global).
final isGlobalAdminProvider = FutureProvider<bool>((ref) async {
  final access = await ref.watch(managerAccessProvider.future);
  return access == null;
});

/// Países (completos) no seletor — todos para o admin global, só os
/// geridos para gestores regionais.
final managerCountriesProvider =
    FutureProvider<List<CountryFull>>((ref) async {
  final repo = ref.watch(managerRepositoryProvider);
  final managed = await ref.watch(managerAccessProvider.future);
  if (managed == null) return repo.fetchCountries();
  if (managed.isEmpty) return const [];
  final countries = await repo.fetchCountries();
  if (countries.isEmpty) {
    return [for (final id in managed) CountryFull(id: id, name: id)];
  }
  return [
    for (final c in countries)
      if (managed.contains(c.id)) c,
  ];
});

/// Países de um gestor regional (não admin) — para o hub.
final managedCountryListProvider =
    FutureProvider<List<CountryFull>>((ref) async {
  final managed = await ref.watch(managerAccessProvider.future);
  if (managed == null || managed.isEmpty) return const [];
  final countries = await ref
      .watch(managerRepositoryProvider)
      .fetchCountries();
  if (countries.isEmpty) {
    return [for (final id in managed) CountryFull(id: id, name: id)];
  }
  return [
    for (final c in countries)
      if (managed.contains(c.id)) c,
  ];
});

/// Estatísticas de um país.
final countryStatsProvider =
    FutureProvider.family<CountryStats, String>((ref, countryId) {
  return ref
      .watch(managerRepositoryProvider)
      .fetchStats(countryId);
});

/// Agregado global (admin): stats por país.
final globalStatsProvider =
    FutureProvider<Map<String, CountryStats>>((ref) async {
  final countries = await ref.watch(managerCountriesProvider.future);
  return ref
      .watch(managerRepositoryProvider)
      .fetchGlobalStats(countries);
});

/// Submissões pendentes do país (realtime).
final managerPendingProposalsProvider =
    StreamProvider.family<List<ProposalRow>, String>((ref, countryId) {
  return ref
      .watch(managerRepositoryProvider)
      .watchProposals(countryId, onlyPending: true);
});

/// Histórico completo de submissões do país (realtime).
final managerProposalHistoryProvider =
    StreamProvider.family<List<ProposalRow>, String>((ref, countryId) {
  return ref
      .watch(managerRepositoryProvider)
      .watchProposals(countryId, onlyPending: false);
});
