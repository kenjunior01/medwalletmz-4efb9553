import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/presentation/auth_controller.dart';
import '../../core/location/location_service.dart';
import 'data/facility_repository.dart';
import 'data/facility_model.dart';

final facilityRepositoryProvider = Provider<FacilityRepository>(
  (ref) => FacilityRepository(ref.watch(supabaseClientProvider)),
);

// ── Estado do diretório (equivalente aos filtros da versão web) ─────────

final facilityFilterProvider =
    StateProvider<FacilityFilter>((_) => FacilityFilter.all);

final facilitySortProvider = StateProvider<FacilitySort>((_) => FacilitySort.rating);

final facilitySearchProvider = StateProvider<String>((_) => '');

/// Interruptor "Só a minha cidade" — espelha o `onlyMyCity` da web.
final onlyMyCityProvider = StateProvider<bool>((_) => true);

/// Posição do dispositivo (EXCLUSIVO MÓVEL). Resolvida a pedido quando
/// a ordenação é "Mais próximas"; null se a permissão/GPS falhar —
/// nesse caso a lista funciona igual à web (sem distâncias reais).
final devicePositionProvider = FutureProvider<UserPoint?>((ref) async {
  return LocationService.instance.getCurrentPosition();
});

/// Lista unificada de instituições. Reconstrói quando qualquer filtro
/// muda; a cidade vem do perfil (`default_city`) quando o interruptor
/// está activo, tal como o LocationContext da versão web.
///
/// Diferença MÓVEL: com a ordenação "Mais próximas" a lista usa o GPS
/// do dispositivo e fica ordenada por distância REAL (Haversine).
final facilitiesProvider = FutureProvider<List<HealthFacility>>((ref) async {
  final repo = ref.watch(facilityRepositoryProvider);
  final filter = ref.watch(facilityFilterProvider);
  final sort = ref.watch(facilitySortProvider);
  final query = ref.watch(facilitySearchProvider);
  final onlyMyCity = ref.watch(onlyMyCityProvider);

  String? city;
  if (onlyMyCity) {
    final profile = ref.watch(profileProvider).value;
    city = profile?.defaultCity;
  }

  UserPoint? pos;
  if (sort == FacilitySort.nearby) {
    pos = await ref.watch(devicePositionProvider.future);
  }

  return repo.fetchFacilities(
    filter: filter,
    city: city,
    query: query,
    sort: sort,
    userLat: pos?.latitude,
    userLng: pos?.longitude,
  );
});
