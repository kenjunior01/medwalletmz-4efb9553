import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/utils/geo.dart';
import 'facility_model.dart';

/// Filtro de tipo do diretório de instituições.
enum FacilityFilter { all, pharmacy, clinic, hospital, laboratory, veterinary }

/// Ordenação, a parir do mesmo conjunto de opções da versão web.
enum FacilitySort { rating, nearby, name }

extension FacilityFilterX on FacilityFilter {
  String get label {
    switch (this) {
      case FacilityFilter.all:
        return 'Todas';
      case FacilityFilter.pharmacy:
        return 'Farmácias';
      case FacilityFilter.clinic:
        return 'Clínicas';
      case FacilityFilter.hospital:
        return 'Hospitais';
      case FacilityFilter.laboratory:
        return 'Laboratórios';
      case FacilityFilter.veterinary:
        return 'Veterinárias';
    }
  }
}

/// Diretório de instituições de saúde — lê as TRÊS tabelas da mesma base
/// da versão web (stores, clinics, veterinary_clinics) e unifica num só
/// modelo de apresentação. Sem produtos: apenas identidade, localização,
/// contactos e chat.
class FacilityRepository {
  FacilityRepository(this._client);

  final SupabaseClient _client;

  /// Lista unificada de instituições activas, com pesquisa, filtro por
  /// tipo, cidade e ordenação (avaliação / proximidade / nome).
  ///
  /// [userLat]/[userLng]: posição aproximada do utilizador (opcional) —
  /// quando presentes calcula a distância Haversine como na web.
  Future<List<HealthFacility>> fetchFacilities({
    FacilityFilter filter = FacilityFilter.all,
    String? city,
    String query = '',
    FacilitySort sort = FacilitySort.rating,
    double? userLat,
    double? userLng,
  }) async {
    final wanted = _matchingTypes(filter);

    // ── Farmácias (stores.type = 'pharmacy') ──────────────────────────
    final storeRows = wanted.contains(FacilityType.pharmacy)
        ? await _client
            .from('stores')
            .select('id, name, type, city, address, description, rating, '
                'latitude, longitude, image_url, phone, delivery_time, '
                'google_place_id')
            .eq('is_active', true)
        : const [];

    // ── Clínicas / hospitais / laboratórios (clinics) ─────────────────
    final clinicRows = wanted
        .any((t) => t != FacilityType.pharmacy && t != FacilityType.veterinary)
        ? await _client
            .from('clinics')
            .select('id, name, type, city, address, description, '
                'latitude, longitude, image_url, phone, email, website, '
                'is_verified, google_place_id')
            .eq('is_active', true)
        : const [];

    // ── Veterinárias (veterinary_clinics) ─────────────────────────────
    final vetRows = wanted.contains(FacilityType.veterinary)
        ? await _client
            .from('veterinary_clinics')
            .select('id, name, city, address, description, rating, '
                'latitude, longitude, image_url, phone, email, website, '
                'is_verified, emergency_24h')
            .eq('is_active', true)
        : const [];

    var facilities = <HealthFacility>[
      ...storeRows.map<HealthFacility>(HealthFacility.fromStore),
      ...clinicRows.map<HealthFacility>(HealthFacility.fromClinic),
      ...vetRows.map<HealthFacility>(HealthFacility.fromVet),
    ];

    // Deduplicação por nome+cidade (a base web semeia a mesma instituição
    // em mais do que uma tabela; a versão web também deduplica).
    final seen = <String>{};
    facilities = facilities.where((f) {
      final key = '${f.name.toLowerCase().trim()}|${f.city ?? ''}';
      return seen.add(key);
    }).toList();

    // Filtros de texto e cidade.
    final q = query.trim().toLowerCase();
    if (q.isNotEmpty) {
      facilities = facilities
          .where((f) =>
              f.name.toLowerCase().contains(q) ||
              (f.city ?? '').toLowerCase().contains(q) ||
              (f.description ?? '').toLowerCase().contains(q))
          .toList();
    }
    if (city != null && city.trim().isNotEmpty) {
      final c = city.trim().toLowerCase();
      facilities =
          facilities.where((f) => (f.city ?? '').toLowerCase() == c).toList();
    }

    // Enriquecimento com distância e ordenação.
    final hasUserPos = userLat != null && userLng != null;
    double distanceOf(HealthFacility f) {
      if (!hasUserPos || !f.hasLocation) return double.infinity;
      return haversineKm(
        lat1: userLat,
        lon1: userLng,
        lat2: f.latitude!,
        lon2: f.longitude!,
      );
    }

    final decorated = [
      for (final f in facilities) (facility: f, distance: distanceOf(f)),
    ];

    decorated.sort((a, b) {
      switch (sort) {
        case FacilitySort.nearby:
          return a.distance.compareTo(b.distance);
        case FacilitySort.name:
          return a.facility.name
              .toLowerCase()
              .compareTo(b.facility.name.toLowerCase());
        case FacilitySort.rating:
          final r = (b.facility.rating ?? 0).compareTo(a.facility.rating ?? 0);
          return r != 0 ? r : a.distance.compareTo(b.distance);
      }
    });

    // Distância calculada é guardada num mapa lateral para os cartões.
    _lastDistances = {
      for (final d in decorated) d.facility.id: d.distance,
    };

    return decorated.map((d) => d.facility).toList();
  }

  Map<String, double> _lastDistances = const {};

  /// Distância (km) calculada na última [fetchFacilities] — Infinity se
  /// não aplicável. Consultada pelos cartões após o fetch.
  double distanceFor(HealthFacility facility) =>
      _lastDistances[facility.id] ?? double.infinity;

  /// Detalhe de uma instituição, qualquer que seja a tabela de origem.
  Future<HealthFacility?> fetchFacility(
    FacilitySource source,
    String id,
  ) async {
    switch (source) {
      case FacilitySource.store:
        final rows = await _client
            .from('stores')
            .select('id, name, type, city, address, description, rating, '
                'latitude, longitude, image_url, phone, delivery_time, '
                'google_place_id')
            .eq('id', id)
            .maybeSingle();
        return rows == null ? null : HealthFacility.fromStore(rows);

      case FacilitySource.clinic:
        final rows = await _client
            .from('clinics')
            .select('id, name, type, city, address, description, '
                'latitude, longitude, image_url, phone, email, website, '
                'is_verified, google_place_id')
            .eq('id', id)
            .maybeSingle();
        return rows == null ? null : HealthFacility.fromClinic(rows);

      case FacilitySource.veterinary:
        final rows = await _client
            .from('veterinary_clinics')
            .select('id, name, city, address, description, rating, '
                'latitude, longitude, image_url, phone, email, website, '
                'is_verified, emergency_24h')
            .eq('id', id)
            .maybeSingle();
        return rows == null ? null : HealthFacility.fromVet(rows);
    }
  }

  Set<FacilityType> _matchingTypes(FacilityFilter filter) {
    switch (filter) {
      case FacilityFilter.all:
        return FacilityType.values.toSet();
      case FacilityFilter.pharmacy:
        return {FacilityType.pharmacy};
      case FacilityFilter.clinic:
        return {FacilityType.clinic};
      case FacilityFilter.hospital:
        return {FacilityType.hospital};
      case FacilityFilter.laboratory:
        return {FacilityType.laboratory};
      case FacilityFilter.veterinary:
        return {FacilityType.veterinary};
    }
  }
}
