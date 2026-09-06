/// País (tabela `countries` — leitura pública).
class CountryLite {
  const CountryLite({
    required this.id,
    required this.name,
    this.currencyCode,
    this.currencySymbol,
    this.phoneCode,
    this.flagUrl,
  });

  final String id;
  final String name;
  final String? currencyCode;
  final String? currencySymbol;
  final String? phoneCode;
  final String? flagUrl;

  factory CountryLite.fromJson(Map<String, dynamic> j) => CountryLite(
        id: j['id'] as String,
        name: (j['name'] ?? '') as String,
        currencyCode: j['currency_code'] as String?,
        currencySymbol: j['currency_symbol'] as String?,
        phoneCode: (j['phone_code'] ?? j['phone_prefix']) as String?,
        flagUrl: j['flag_url'] as String?,
      );
}

/// KPI regional — tabela `regional_kpis` (por país e período).
class RegionalKpi {
  const RegionalKpi({
    required this.countryCode,
    required this.kpiKey,
    required this.kpiValue,
    required this.recordedAt,
    this.kpiUnit,
    this.previousValue,
    this.targetValue,
  });

  final String countryCode;
  final String kpiKey;
  final double kpiValue;
  final String? kpiUnit;
  final double? previousValue;
  final double? targetValue;
  final DateTime recordedAt;

  factory RegionalKpi.fromJson(Map<String, dynamic> j) => RegionalKpi(
        countryCode: j['country_code'] as String,
        kpiKey: j['kpi_key'] as String,
        kpiValue: (j['kpi_value'] as num?)?.toDouble() ?? 0,
        kpiUnit: j['kpi_unit'] as String?,
        previousValue: (j['previous_period_value'] as num?)?.toDouble(),
        targetValue: (j['target_value'] as num?)?.toDouble(),
        recordedAt: DateTime.tryParse(j['recorded_at']?.toString() ?? '') ??
            DateTime.now(),
      );
}

/// Meta trimestral — tabela `regional_goals`.
class RegionalGoal {
  const RegionalGoal({
    required this.countryCode,
    required this.quarter,
    required this.goalKey,
    required this.goalValue,
    required this.currentValue,
    required this.status,
    this.goalUnit,
  });

  final String countryCode;
  final String quarter;
  final String goalKey;
  final double goalValue;
  final double currentValue;
  final String? goalUnit;

  /// on_track | at_risk | behind | achieved | exceeded
  final String status;

  double get progress {
    if (goalValue <= 0) return 0;
    final p = (currentValue / goalValue * 100).clamp(0, 150);
    return p.toDouble();
  }

  factory RegionalGoal.fromJson(Map<String, dynamic> j) => RegionalGoal(
        countryCode: j['country_code'] as String,
        quarter: (j['quarter'] ?? '') as String,
        goalKey: j['goal_key'] as String,
        goalValue: (j['goal_value'] as num?)?.toDouble() ?? 0,
        currentValue: (j['current_value'] as num?)?.toDouble() ?? 0,
        status: j['status'] as String? ?? 'on_track',
        goalUnit: j['goal_unit'] as String?,
      );
}

/// Papéis que abrem o painel de gestão regional (enum `app_role` +
/// valores usados em produção, ex.: regional_manager/regional_ceo).
const managerRoles = <String>[
  'country_manager',
  'admin',
  'regional_manager',
  'regional_ceo',
];

String managerRoleLabel(String r) => switch (r) {
      'country_manager' => 'Gestor de País',
      'regional_manager' => 'Gestor Regional',
      'regional_ceo' => 'CEO Regional',
      'admin' => 'Administrador Global',
      _ => r,
    };
