import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/service_models.dart';

/// Catálogo de serviços de saúde.
class ServicesRepository {
  ServicesRepository(this._client);

  final SupabaseClient _client;

  /// Especialidades (leitura pública, conforme RLS).
  Future<List<Specialty>> fetchSpecialties() async {
    final rows = await _client
        .from('medical_specialties')
        .select('id, name, slug, icon, description')
        .order('name');
    return rows.map(Specialty.fromJson).toList();
  }

  /// Médicos disponíveis com especialidade embutida.
  Future<List<Doctor>> fetchDoctors({String? specialtyId}) async {
    var query = _client.from('doctor_profiles').select(
          'id, user_id, specialty_id, bio, consultation_fee, years_experience, '
          'languages, avatar_url, is_verified, rating, '
          'specialty:medical_specialties(name, icon)',
        );

    if (specialtyId != null) {
      query = query.eq('specialty_id', specialtyId);
    }

    final rows = await query
        .eq('is_available', true)
        .order('rating', ascending: false)
        .limit(30);

    final doctors = rows.map(Doctor.fromJson).toList();
    return _attachNames(doctors);
  }

  /// Nomes via `profiles` — doctor_profiles não tem coluna de nome,
  /// e a FK explícita não existe, por isso resolvemos fora do embed.
  Future<List<Doctor>> _attachNames(List<Doctor> doctors) async {
    if (doctors.isEmpty) return doctors;
    final ids = doctors.map((d) => d.userId).toList();
    try {
      final rows = await _client
          .from('profiles')
          .select('id, full_name')
          .inFilter('id', ids);
      final names = <String, String>{
        for (final r in rows)
          r['id'] as String: (r['full_name'] ?? '') as String,
      };
      return [
        for (final d in doctors)
          Doctor(
            id: d.id,
            userId: d.userId,
            name: names[d.userId],
            bio: d.bio,
            consultationFee: d.consultationFee,
            yearsExperience: d.yearsExperience,
            languages: d.languages,
            avatarUrl: d.avatarUrl,
            isVerified: d.isVerified,
            rating: d.rating,
            specialtyId: d.specialtyId,
            specialtyName: d.specialtyName,
            specialtyIcon: d.specialtyIcon,
          ),
      ];
    } catch (_) {
      return doctors;
    }
  }
}
