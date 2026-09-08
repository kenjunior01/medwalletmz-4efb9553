import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Ranking público de confiança — MESMAS leituras do web (`Ranking.tsx`):
///   • médicos  → `doctor_profiles` por rating + total_consultations
///   • clínicas → `clinics` (todas e type='hospital')
///   • farmácias/labs/vet → `stores` por type (rating médio e nº avaliações)
class RankedDoctor {
  const RankedDoctor({
    required this.id,
    required this.name,
    required this.rating,
    required this.reviews,
    this.specialty,
    this.avatarUrl,
  });

  final String id;
  final String name;
  final double rating;
  final int reviews;
  final String? specialty;
  final String? avatarUrl;

  factory RankedDoctor.fromJson(Map<String, dynamic> j) {
    final profile = (j['profiles'] as Map?)?.cast<String, dynamic>();
    return RankedDoctor(
      id: (j['user_id'] ?? '') as String,
      name: (profile?['full_name'] ?? 'Médico') as String,
      rating: double.tryParse(j['rating']?.toString() ?? '') ?? 0,
      reviews: (j['total_consultations'] as num?)?.toInt() ?? 0,
      specialty: j['specialty'] as String?,
      avatarUrl: profile?['avatar_url'] as String?,
    );
  }
}

class RankedFacility {
  const RankedFacility({
    required this.id,
    required this.name,
    required this.rating,
    required this.reviews,
    this.city,
    this.address,
  });

  final String id;
  final String name;
  final double rating;
  final int reviews;
  final String? city;
  final String? address;

  factory RankedFacility.fromJson(Map<String, dynamic> j) => RankedFacility(
        id: j['id'] as String,
        name: (j['name'] ?? 'Instituição') as String,
        rating: double.tryParse(j['avg_rating']?.toString() ?? '') ?? 0,
        reviews: (j['reviews_count'] as num?)?.toInt() ?? 0,
        city: j['city'] as String?,
        address: j['address'] as String?,
      );
}

enum RankingTab { doctors, pharmacies, clinics, hospitals, labs, veterinary }

extension RankingTabX on RankingTab {
  String get label {
    switch (this) {
      case RankingTab.doctors:
        return 'Médicos';
      case RankingTab.pharmacies:
        return 'Farmácias';
      case RankingTab.clinics:
        return 'Clínicas';
      case RankingTab.hospitals:
        return 'Hospitais';
      case RankingTab.labs:
        return 'Laboratórios';
      case RankingTab.veterinary:
        return 'Veterinário';
    }
  }
}

class RankingRepository {
  RankingRepository(this._client);

  final SupabaseClient _client;

  /// Top médicos por rating (limite 50, igual ao web).
  Future<List<RankedDoctor>> fetchTopDoctors() async {
    try {
      final rows = await _client
          .from('doctor_profiles')
          .select(
              'user_id, rating, total_consultations, specialty, profiles:profiles!doctor_profiles_user_id_fkey(full_name, avatar_url)')
          .order('rating', ascending: false)
          .order('total_consultations', ascending: false)
          .limit(50);
      return [
        for (final r in (rows as List))
          RankedDoctor.fromJson((r as Map).cast<String, dynamic>()),
      ];
    } catch (_) {
      return const [];
    }
  }

  /// Top instituições de uma tabela com filtro opcional por tipo.
  Future<List<RankedFacility>> fetchTopFacilities(
    RankingTab tab,
  ) async {
    final table = switch (tab) {
      RankingTab.clinics => 'clinics',
      RankingTab.hospitals => 'clinics',
      RankingTab.pharmacies => 'stores',
      RankingTab.labs => 'stores',
      RankingTab.veterinary => 'stores',
      RankingTab.doctors => 'stores', // não usado
    };
    final typeFilter = switch (tab) {
      RankingTab.hospitals => 'hospital',
      RankingTab.pharmacies => 'pharmacy',
      RankingTab.labs => 'laboratory',
      RankingTab.veterinary => 'veterinary',
      _ => null,
    };
    try {
      var query = _client.from(table).select(
          'id, name, avg_rating, reviews_count, city, address, type, is_active');
      if (typeFilter != null) {
        query = query.eq('type', typeFilter);
      } else {
        query = query.eq('is_active', true);
      }
      final rows = await query
          .order('avg_rating', ascending: false)
          .order('reviews_count', ascending: false)
          .limit(50);
      return [
        for (final r in (rows as List))
          RankedFacility.fromJson((r as Map).cast<String, dynamic>()),
      ];
    } catch (_) {
      return const [];
    }
  }
}

final rankingRepositoryProvider = Provider<RankingRepository>((ref) {
  return RankingRepository(Supabase.instance.client);
});
