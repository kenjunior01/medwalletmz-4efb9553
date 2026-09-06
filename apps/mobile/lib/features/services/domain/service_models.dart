/// Especialidade — tabela `medical_specialties` (leitura pública).
class Specialty {
  const Specialty({
    required this.id,
    required this.name,
    this.slug,
    this.icon,
    this.description,
  });

  final String id;
  final String name;
  final String? slug;
  final String? icon;
  final String? description;

  factory Specialty.fromJson(Map<String, dynamic> json) => Specialty(
        id: json['id'] as String,
        name: json['name'] as String? ?? 'Especialidade',
        slug: json['slug'] as String?,
        icon: json['icon'] as String?,
        description: json['description'] as String?,
      );
}

/// Médico — tabela `doctor_profiles` + embed de `medical_specialties`.
/// O nome vem de `profiles` (resolvido fora — doctor_profiles não tem
/// coluna de nome).
class Doctor {
  const Doctor({
    required this.id,
    required this.userId,
    this.name,
    this.bio,
    required this.consultationFee,
    this.yearsExperience = 0,
    this.languages = const [],
    this.avatarUrl,
    this.isVerified = false,
    this.rating = 0,
    this.specialtyId,
    this.specialtyName,
    this.specialtyIcon,
  });

  final String id;
  final String userId;

  /// Nome do profissional (via `profiles.full_name`).
  final String? name;
  final String? bio;
  final double consultationFee;
  final int yearsExperience;
  final List<String> languages;
  final String? avatarUrl;
  final bool isVerified;
  final double rating;
  final String? specialtyId;
  final String? specialtyName;
  final String? specialtyIcon;

  String get displayName {
    final n = name;
    if (n == null || n.trim().isEmpty) return 'Profissional de saúde';
    return n.trim();
  }

  factory Doctor.fromJson(Map<String, dynamic> json) {
    // O embed pode vir como objeto ou lista — tratamos os dois casos.
    final spec = json['specialty'];
    Map<String, dynamic>? specMap;
    if (spec is Map<String, dynamic>) {
      specMap = spec;
    } else if (spec is List && spec.isNotEmpty) {
      specMap = spec.first as Map<String, dynamic>?;
    }

    final langs = json['languages'];
    return Doctor(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      name: json['name'] as String?,
      bio: json['bio'] as String?,
      consultationFee: (json['consultation_fee'] as num?)?.toDouble() ?? 500,
      yearsExperience: (json['years_experience'] as num?)?.toInt() ?? 0,
      languages: langs is List ? langs.cast<String>() : const [],
      avatarUrl: json['avatar_url'] as String?,
      isVerified: json['is_verified'] as bool? ?? false,
      rating: (json['rating'] as num?)?.toDouble() ?? 0,
      specialtyId: json['specialty_id'] as String?,
      specialtyName: specMap?['name'] as String?,
      specialtyIcon: specMap?['icon'] as String?,
    );
  }
}
