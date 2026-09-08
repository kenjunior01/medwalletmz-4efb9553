import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/offline/offline_cache.dart';
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
///
/// ── Catálogo OFFLINE (exclusivo móvel) ───────────────────────────────
/// O conjunto completo é sincronizado em cache local (sqflite) na
/// primeira consulta bem-sucedida e renovado a cada rede viva. Sem
/// internet, a pesquisa, filtros e ordenação CONTINUAM a funcionar
/// sobre a última cópia — essencial em Moçambique, onde a rede cai
/// com frequência e uma farmácia não pode esperar por dados.
class FacilityRepository {
  FacilityRepository(this._client);

  final SupabaseClient _client;

  static const _catalogKey = 'facilities_catalog_v1';

  /// Última consulta veio do cache offline? Observado pelo ecrã para
  /// mostrar o indicador "Offline · dados guardados".
  final ValueNotifier<bool> servedOffline = ValueNotifier<bool>(false);

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
    // ── Rede-primeiro, cache-como-reserva ─────────────────────────────
    // Busca SEMPRE o conjunto completo (as três tabelas) — depois os
    // filtros são aplicados em memória, tanto a dados frescos como a
    // dados em cache. Assim a pesquisa offline mantém o mesmo poder.
    List<Map<String, dynamic>> rows;
    try {
      rows = await _fetchAllRows().timeout(const Duration(seconds: 12));
      await OfflineCache.instance
          .write(_catalogKey, jsonEncode(rows))
          .timeout(const Duration(seconds: 6), onTimeout: () {});
      servedOffline.value = false;
    } catch (_) {
      final cached = await OfflineCache.instance.readRows(_catalogKey);
      if (cached.isEmpty) rethrow;
      rows = cached;
      servedOffline.value = true;
    }

    var facilities = <HealthFacility>[
      for (final r in rows) _facilityFromRow(r),
    ];

    // Deduplicação por nome+cidade (a base web semeia a mesma instituição
    // em mais do que uma tabela; a versão web também deduplica).
    final seen = <String>{};
    facilities = facilities.where((f) {
      final key = '${f.name.toLowerCase().trim()}|${f.city ?? ''}';
      return seen.add(key);
    }).toList();

    // Filtros de texto, tipo e cidade.
    final q = query.trim().toLowerCase();
    if (q.isNotEmpty) {
      facilities = facilities
          .where((f) =>
              f.name.toLowerCase().contains(q) ||
              (f.city ?? '').toLowerCase().contains(q) ||
              (f.description ?? '').toLowerCase().contains(q) ||
              (f.address ?? '').toLowerCase().contains(q))
          .toList();
    }
    if (filter != FacilityFilter.all) {
      final wanted = _matchingTypes(filter);
      facilities =
          facilities.where((f) => wanted.contains(f.type)).toList();
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
  /// Detalhe também respeita o padrão offline: se a rede falhar, serve a
  /// última cópia guardada.
  Future<HealthFacility?> fetchFacility(
    FacilitySource source,
    String id,
  ) async {
    final detailKey = 'facility_detail_${source.name}_$id';
    try {
      final raw = await _fetchSingleRaw(source, id)
          .timeout(const Duration(seconds: 12));
      if (raw != null) {
        await OfflineCache.instance
            .write(detailKey, jsonEncode(raw))
            .timeout(const Duration(seconds: 6), onTimeout: () {});
      }
      return raw == null ? null : _facilityFromRow(raw);
    } catch (_) {
      final cached = await OfflineCache.instance.readRows(detailKey);
      if (cached.isNotEmpty) return _facilityFromRow(cached.first);
      rethrow;
    }
  }

  // ── Rede ────────────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> _fetchAllRows() async {
    // Farmácias (stores.type = 'pharmacy')
    final storeRows = await _client
        .from('stores')
        .select('id, name, type, city, address, description, rating, '
            'latitude, longitude, image_url, phone, delivery_time, '
            'google_place_id')
        .eq('is_active', true);

    // Clínicas / hospitais / laboratórios (clinics)
    final clinicRows = await _client
        .from('clinics')
        .select('id, name, type, city, address, description, '
            'latitude, longitude, image_url, phone, email, website, '
            'is_verified, google_place_id')
        .eq('is_active', true);

    // Veterinárias (veterinary_clinics)
    final vetRows = await _client
        .from('veterinary_clinics')
        .select('id, name, city, address, description, rating, '
            'latitude, longitude, image_url, phone, email, website, '
            'is_verified, emergency_24h')
        .eq('is_active', true);

    return [
      for (final r in (storeRows as List))
        {...Map<String, dynamic>.from(r as Map), '_src': 'store'},
      for (final r in (clinicRows as List))
        {...Map<String, dynamic>.from(r as Map), '_src': 'clinic'},
      for (final r in (vetRows as List))
        {...Map<String, dynamic>.from(r as Map), '_src': 'vet'},
    ];
  }

  Future<Map<String, dynamic>?> _fetchSingleRaw(
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
        if (rows == null) return null;
        return {
          ...Map<String, dynamic>.from(rows as Map),
          '_src': 'store',
        };

      case FacilitySource.clinic:
        final rows = await _client
            .from('clinics')
            .select('id, name, type, city, address, description, '
                'latitude, longitude, image_url, phone, email, website, '
                'is_verified, google_place_id')
            .eq('id', id)
            .maybeSingle();
        if (rows == null) return null;
        return {
          ...Map<String, dynamic>.from(rows as Map),
          '_src': 'clinic',
        };

      case FacilitySource.veterinary:
        final rows = await _client
            .from('veterinary_clinics')
            .select('id, name, city, address, description, rating, '
                'latitude, longitude, image_url, phone, email, website, '
                'is_verified, emergency_24h')
            .eq('id', id)
            .maybeSingle();
        if (rows == null) return null;
        return {
          ...Map<String, dynamic>.from(rows as Map),
          '_src': 'vet',
        };
    }
  }

  // ── Cache helpers ───────────────────────────────────────────────────

  HealthFacility _facilityFromRow(Map<String, dynamic> row) {
    switch (row['_src'] as String?) {
      case 'store':
        return HealthFacility.fromStore(row);
      case 'vet':
        return HealthFacility.fromVet(row);
      case 'clinic':
      default:
        return HealthFacility.fromClinic(row);
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
