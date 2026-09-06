import 'package:flutter/material.dart';

import '../../earn/data/proposal_models.dart';
import '../../regional/data/regional_models.dart';

export '../../regional/data/regional_models.dart'
    show CountryLite, RegionalKpi, RegionalGoal, managerRoles, managerRoleLabel;

/// Helper de datas partilhado pelos modelos de gestão.
DateTime? jsonDate(Object? v) =>
    v == null ? null : DateTime.tryParse(v.toString());

/// País com configuração completa (tabela `countries`).
/// Inclui comissões e branding editáveis pelos gestores.
class CountryFull {
  const CountryFull({
    required this.id,
    required this.name,
    this.currencyCode,
    this.currencySymbol,
    this.phoneCode,
    this.flagUrl,
    this.isActive = true,
    this.defaultLocale,
    this.timezone,
    this.commissionRates = const {},
    this.branding = const {},
    this.config = const {},
  });

  final String id;
  final String name;
  final String? currencyCode;
  final String? currencySymbol;
  final String? phoneCode;
  final String? flagUrl;
  final bool isActive;
  final String? defaultLocale;
  final String? timezone;

  /// {pharmacy: 10, doctor: 15, lab: 12, delivery: 5}
  final Map<String, dynamic> commissionRates;

  /// {primary_color, secondary_color, accent_color, home_banner_url}
  final Map<String, dynamic> branding;

  /// Config extra do país (registration_defaults, reward_amount…).
  final Map<String, dynamic> config;

  static Map<String, dynamic> _map(Object? v) =>
      v is Map ? Map<String, dynamic>.from(v) : const {};

  factory CountryFull.fromJson(Map<String, dynamic> j) => CountryFull(
        id: j['id'] as String,
        name: (j['name'] ?? '') as String,
        currencyCode: j['currency_code'] as String?,
        currencySymbol: j['currency_symbol'] as String?,
        phoneCode: (j['phone_code'] ?? j['phone_prefix']) as String?,
        flagUrl: j['flag_url'] as String?,
        isActive: j['is_active'] as bool? ?? true,
        defaultLocale: j['default_locale'] as String?,
        timezone: j['timezone'] as String?,
        commissionRates: _map(j['commission_rates']),
        branding: _map(j['branding_config']),
        config: _map(j['config']),
      );

  double commissionFor(String key) {
    final v = commissionRates[key];
    if (v is num) return v.toDouble();
    return 10;
  }
}

/// Estatísticas agregadas de um país — contagens feitas com
/// `count: 'exact'` por tabela (respeitam RLS do gestor).
class CountryStats {
  const CountryStats({
    required this.countryId,
    this.users = 0,
    this.stores = 0,
    this.clinics = 0,
    this.veterinaries = 0,
    this.consultations = 0,
    this.triages = 0,
    this.pendingProposals = 0,
    this.approvedProposals = 0,
    this.pendingPayments = 0,
    this.activeSos = 0,
  });

  final String countryId;
  final int users;
  final int stores;
  final int clinics;
  final int veterinaries;
  final int consultations;
  final int triages;
  final int pendingProposals;
  final int approvedProposals;
  final int pendingPayments;
  final int activeSos;

  int get institutions => stores + clinics + veterinaries;

  factory CountryStats.fromCounts(String countryId, Map<String, int> c) =>
      CountryStats(
        countryId: countryId,
        users: c['users'] ?? 0,
        stores: c['stores'] ?? 0,
        clinics: c['clinics'] ?? 0,
        veterinaries: c['veterinaries'] ?? 0,
        consultations: c['consultations'] ?? 0,
        triages: c['triages'] ?? 0,
        pendingProposals: c['pendingProposals'] ?? 0,
        approvedProposals: c['approvedProposals'] ?? 0,
        pendingPayments: c['pendingPayments'] ?? 0,
        activeSos: c['activeSos'] ?? 0,
      );
}

/// Instituição unificada dos painéis de gestão — vem de `stores`,
/// `clinics` ou `veterinary_clinics`.
class InstitutionRow {
  const InstitutionRow({
    required this.id,
    required this.source,
    required this.name,
    required this.type,
    this.city,
    this.address,
    this.phone,
    this.isActive = true,
    this.isVerified = false,
    this.latitude,
    this.longitude,
    this.createdAt,
  });

  final String id;

  /// stores | clinics | veterinary_clinics
  final String source;
  final String name;
  final String type;
  final String? city;
  final String? address;
  final String? phone;
  final bool isActive;
  final bool isVerified;
  final double? latitude;
  final double? longitude;
  final DateTime? createdAt;

  factory InstitutionRow.fromJson(String source, Map<String, dynamic> j) =>
      InstitutionRow(
        id: j['id'] as String,
        source: source,
        name: (j['name'] ?? '') as String,
        type: (j['type'] ?? source) as String,
        city: j['city'] as String?,
        address: j['address'] as String?,
        phone: j['phone'] as String?,
        isActive: j['is_active'] as bool? ?? true,
        isVerified: j['is_verified'] as bool? ?? false,
        latitude: (j['latitude'] as num?)?.toDouble(),
        longitude: (j['longitude'] as num?)?.toDouble(),
        createdAt: jsonDate(j['created_at']),
      );

  (String, IconData, Color) get typeInfo {
    switch (source) {
      case 'stores':
        return (
          'Farmácia',
          Icons.local_pharmacy_rounded,
          const Color(0xFF34D399)
        );
      case 'veterinary_clinics':
        return ('Veterinária', Icons.pets_rounded, const Color(0xFFFBBF24));
      default:
        switch (type) {
          case 'hospital':
            return (
              'Hospital',
              Icons.local_hospital_rounded,
              const Color(0xFFF87171)
            );
          case 'laboratory':
            return (
              'Laboratório',
              Icons.science_rounded,
              const Color(0xFFA78BFA)
            );
          default:
            return (
              'Clínica',
              Icons.medical_services_rounded,
              const Color(0xFF38BDF8)
            );
        }
    }
  }

  String get mapsQuery =>
      'https://www.google.com/maps/search/?api=1&query='
      '${Uri.encodeComponent('$name ${city ?? ''}')}';
}

/// Pagamento manual M-Pesa — tabela `mpesa_manual_payments`.
/// Visível a admin global e country_manager (RLS).
class PendingPayment {
  const PendingPayment({
    required this.id,
    required this.reference,
    required this.amount,
    required this.status,
    required this.createdAt,
    this.payerName,
    this.payerPhone,
    this.mpesaTxId,
    this.description,
    this.confirmedAt,
  });

  final String id;
  final String reference;
  final double amount;

  /// pending | confirmed | rejected | expired
  final String status;
  final String? payerName;
  final String? payerPhone;
  final String? mpesaTxId;
  final String? description;
  final DateTime? confirmedAt;
  final DateTime createdAt;

  factory PendingPayment.fromJson(Map<String, dynamic> j) => PendingPayment(
        id: j['id'] as String,
        reference: (j['reference'] ?? '') as String,
        amount: (j['amount_mzn'] as num?)?.toDouble() ?? 0,
        status: j['status'] as String? ?? 'pending',
        payerName: j['payer_name'] as String?,
        payerPhone: j['payer_phone'] as String?,
        mpesaTxId: j['mpesa_transaction_id'] as String?,
        description: j['description'] as String?,
        confirmedAt: jsonDate(j['confirmed_at']),
        createdAt: jsonDate(j['created_at']) ?? DateTime.now(),
      );
}

/// Utilizador visto pela gestão — RPC `list_profiles_admin_full`
/// (admin global: todos; country_manager: só o seu país).
class ManagerUserRow {
  const ManagerUserRow({
    required this.id,
    this.fullName,
    this.phone,
    this.countryId,
    this.city,
    this.createdAt,
  });

  final String id;
  final String? fullName;
  final String? phone;
  final String? countryId;
  final String? city;
  final DateTime? createdAt;

  factory ManagerUserRow.fromJson(Map<String, dynamic> j) => ManagerUserRow(
        id: (j['id'] ?? j['user_id'] ?? '') as String,
        fullName: (j['full_name'] ?? j['name']) as String?,
        phone: j['phone'] as String?,
        countryId: j['country_id'] as String?,
        city: (j['default_city'] ?? j['city']) as String?,
        createdAt: jsonDate(j['created_at']),
      );
}

/// Alerta SOS — tabela `emergency_alerts` (monitor de gestão).
class SosAlertRow {
  const SosAlertRow({
    required this.id,
    required this.status,
    required this.activatedAt,
    this.city,
    this.countryId,
    this.bloodType,
    this.latitude,
    this.longitude,
    this.chronicConditions = const [],
    this.allergies = const [],
  });

  final String id;

  /// active | acknowledged | resolved | cancelled | false_alarm
  final String status;
  final String? city;
  final String? countryId;
  final String? bloodType;
  final double? latitude;
  final double? longitude;
  final List<String> chronicConditions;
  final List<String> allergies;
  final DateTime activatedAt;

  static List<String> strings(Object? v) =>
      v is List ? v.map((e) => e.toString()).toList() : const [];

  factory SosAlertRow.fromJson(Map<String, dynamic> j) {
    final loc = j['location'];
    double? lat, lng;
    if (loc is Map) {
      lat = (loc['latitude'] as num?)?.toDouble();
      lng = (loc['longitude'] as num?)?.toDouble();
    }
    return SosAlertRow(
      id: j['id'] as String,
      status: j['status'] as String? ?? 'active',
      city: j['city'] as String?,
      countryId: j['country_id'] as String?,
      bloodType: j['blood_type'] as String?,
      latitude: lat,
      longitude: lng,
      chronicConditions: strings(j['chronic_conditions']),
      allergies: strings(j['allergies']),
      activatedAt: jsonDate(j['activated_at']) ?? DateTime.now(),
    );
  }

  (String, Color) get statusInfo => switch (status) {
        'active' => ('Activo — precisa de ajuda', const Color(0xFFF87171)),
        'acknowledged' => ('Reconhecido', const Color(0xFFFBBF24)),
        'resolved' => ('Resolvido', const Color(0xFF34D399)),
        'cancelled' => ('Cancelado', const Color(0xFF9FB3C8)),
        'false_alarm' => ('Falso alarme', const Color(0xFF9FB3C8)),
        _ => (status, const Color(0xFF9FB3C8)),
      };
}

/// Conteúdo regional — tabela `regional_content` (campanhas, avisos…).
class RegionalContentItem {
  const RegionalContentItem({
    required this.id,
    required this.countryCode,
    required this.contentType,
    required this.title,
    required this.isActive,
    required this.createdAt,
    this.description,
    this.ctaLabel,
    this.ctaUrl,
    this.accentColor,
    this.isPinned = false,
  });

  final String id;
  final String countryCode;

  /// health_campaign | partner_highlight | emergency_notice |
  /// holiday_schedule | local_tip
  final String contentType;
  final String title;
  final String? description;
  final String? ctaLabel;
  final String? ctaUrl;
  final String? accentColor;
  final bool isActive;
  final bool isPinned;
  final DateTime createdAt;

  factory RegionalContentItem.fromJson(Map<String, dynamic> j) =>
      RegionalContentItem(
        id: j['id'] as String,
        countryCode: (j['country_code'] ?? '') as String,
        contentType: (j['content_type'] ?? 'local_tip') as String,
        title: (j['title'] ?? '') as String,
        description: j['description'] as String?,
        ctaLabel: j['cta_label'] as String?,
        ctaUrl: j['cta_url'] as String?,
        accentColor: j['accent_color'] as String?,
        isActive: j['is_active'] as bool? ?? true,
        isPinned: j['is_pinned'] as bool? ?? false,
        createdAt: jsonDate(j['created_at']) ?? DateTime.now(),
      );

  static const types = <(String, String, IconData)>[
    ('health_campaign', 'Campanha de saúde', Icons.health_and_safety_rounded),
    ('partner_highlight', 'Parceiro em destaque', Icons.handshake_rounded),
    ('emergency_notice', 'Aviso de emergência', Icons.campaign_rounded),
    ('holiday_schedule', 'Horário de feriado', Icons.event_rounded),
    ('local_tip', 'Dica local', Icons.lightbulb_rounded),
  ];

  static (String, IconData) typeInfo(String key) {
    final t =
        types.firstWhere((t) => t.$1 == key, orElse: () => types.last);
    return (t.$2, t.$3);
  }
}

/// Ranking regional — tabela `regional_rankings`.
class RegionalRankingRow {
  const RegionalRankingRow({
    required this.period,
    required this.countryCode,
    this.healthScore,
    this.adherence,
    this.activeUsers,
    this.rankOverall,
    this.badges = const [],
  });

  final String period;
  final String countryCode;
  final double? healthScore;
  final double? adherence;
  final int? activeUsers;
  final int? rankOverall;
  final List<String> badges;

  factory RegionalRankingRow.fromJson(Map<String, dynamic> j) =>
      RegionalRankingRow(
        period: (j['period'] ?? '') as String,
        countryCode: (j['country_code'] ?? '') as String,
        healthScore: (j['health_score'] as num?)?.toDouble(),
        adherence: (j['medication_adherence_pct'] as num?)?.toDouble(),
        activeUsers: (j['active_users_count'] as num?)?.toInt(),
        rankOverall: (j['rank_overall'] as num?)?.toInt(),
        badges: SosAlertRow.strings(j['badges']),
      );
}

/// Atribuição de gestão — junção `country_management` + `user_roles`
/// + `profiles` (só visível a admin global pela RLS).
class ManagerAssignment {
  const ManagerAssignment({
    required this.userId,
    required this.countryId,
    this.roleLabel,
    this.fullName,
    this.phone,
  });

  final String userId;
  final String countryId;
  final String? roleLabel;
  final String? fullName;
  final String? phone;
}

/// Propostas (histórico) — reutiliza PlaceProposal do crowdsourcing.
typedef ProposalRow = PlaceProposal;
