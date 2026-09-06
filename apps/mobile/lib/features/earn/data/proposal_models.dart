import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

/// Proposta de instituição — tabela `place_proposals`.
/// Um contribuidor (proposed_by) submete instituições que a plataforma
/// ainda não tem; ao ser aprovada por um gestor regional, recebe
/// DINHEIRO REAL na carteira (reward_amount/reward_currency — moeda do
/// país da instituição). Não existem pontos/coins.
class PlaceProposal {
  const PlaceProposal({
    required this.id,
    required this.entityType,
    required this.name,
    required this.status,
    required this.createdAt,
    required this.countryId,
    this.city = '',
    this.address,
    this.neighborhood,
    this.referencePoint,
    this.phone,
    this.description,
    this.imagePath,
    this.extraPhotos = const [],
    this.latitude,
    this.longitude,
    this.rewardAmount,
    this.rewardCurrency,
    this.rewardPaid = false,
    this.reviewNotes,
    this.publishedId,
  });

  final String id;

  /// pharmacy | clinic | hospital | lab | veterinary | doctor | other
  final String entityType;
  final String name;
  final String city;
  final String? address;

  /// Bairro — onde fica.
  final String? neighborhood;

  /// Ponto de referência / paragem mais próxima (pedido dos gestores).
  final String? referencePoint;
  final String? phone;
  final String? description;

  /// Caminho público no bucket `proposal-photos` (foto principal).
  final String? imagePath;

  /// Fotos 2..4 guardadas em raw_payload.extra_photos.
  final List<String> extraPhotos;
  final double? latitude;
  final double? longitude;

  final double? rewardAmount;
  final String? rewardCurrency;
  final bool rewardPaid;
  final String? reviewNotes;
  final String? publishedId;

  /// pending | in_review | approved | rejected | duplicate | merged
  final String status;
  final String countryId;
  final DateTime createdAt;

  List<String> get allPhotos => [
        if (imagePath != null && imagePath!.isNotEmpty) imagePath!,
        ...extraPhotos.where((p) => p.isNotEmpty),
      ];

  static DateTime? _date(Object? v) =>
      v == null ? null : DateTime.tryParse(v.toString());

  factory PlaceProposal.fromJson(Map<String, dynamic> j) {
    Map<String, dynamic> payload = const {};
    if (j['raw_payload'] is Map) {
      payload = Map<String, dynamic>.from(j['raw_payload'] as Map);
    }
    final extras = payload['extra_photos'];

    return PlaceProposal(
      id: j['id'] as String,
      entityType: (j['entity_type'] ?? 'other') as String,
      name: (j['name'] ?? '') as String,
      city: (j['city'] ?? '') as String,
      address: j['address'] as String?,
      neighborhood: j['neighborhood'] as String?,
      referencePoint: j['reference_point'] as String?,
      phone: j['phone'] as String?,
      description: j['description'] as String?,
      imagePath: j['image_url'] as String?,
      extraPhotos: extras is List ? extras.cast<String>() : const [],
      latitude: (j['latitude'] as num?)?.toDouble(),
      longitude: (j['longitude'] as num?)?.toDouble(),
      rewardAmount: (j['reward_amount'] as num?)?.toDouble() ??
          (j['reward_mzn'] as num?)?.toDouble(),
      rewardCurrency: j['reward_currency'] as String? ?? 'MZN',
      rewardPaid: j['reward_paid'] as bool? ?? false,
      reviewNotes: j['review_notes'] as String?,
      publishedId: j['published_id'] as String?,
      status: j['status'] as String? ?? 'pending',
      countryId: j['country_id'] as String? ?? 'MZ',
      createdAt: _date(j['created_at']) ?? DateTime.now(),
    );
  }
}

// ── Tipos de instituição apresentados ───────────────────────────────────

const proposalEntityTypes = <(String, String, IconData, Color)>[
  // (valor BD, rótulo, ícone, cor)
  ('pharmacy', 'Farmácia', Icons.local_pharmacy_rounded, Color(0xFF34D399)),
  ('clinic', 'Clínica', Icons.medical_services_rounded, Color(0xFF38BDF8)),
  ('hospital', 'Hospital', Icons.local_hospital_rounded, Color(0xFFF87171)),
  ('lab', 'Laboratório', Icons.science_rounded, Color(0xFFA78BFA)),
  ('veterinary', 'Veterinária', Icons.pets_rounded, Color(0xFFFBBF24)),
  ('doctor', 'Consultório/Médico', Icons.medical_information_rounded,
      Color(0xFF38BDF8)),
  ('other', 'Outro', Icons.category_rounded, Color(0xFF9FB3C8)),
];

(String, IconData, Color) entityTypeInfo(String key) {
  final t = proposalEntityTypes.firstWhere(
    (t) => t.$1 == key,
    orElse: () => proposalEntityTypes.last,
  );
  return (t.$2, t.$3, t.$4);
}

// ── Estados ─────────────────────────────────────────────────────────────

String proposalStatusLabel(String s) => switch (s) {
      'pending' => 'Em análise',
      'in_review' => 'Em revisão',
      'approved' => 'Aprovada',
      'rejected' => 'Rejeitada',
      'duplicate' => 'Duplicada',
      'merged' => 'Fundida',
      _ => s,
    };

Color proposalStatusColor(String s) => switch (s) {
      'pending' || 'in_review' => AppColors.warning,
      'approved' => AppColors.success,
      'rejected' || 'duplicate' || 'merged' => AppColors.danger,
      _ => AppColors.textMuted,
    };
