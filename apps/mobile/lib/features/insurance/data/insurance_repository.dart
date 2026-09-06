import 'package:supabase_flutter/supabase_flutter.dart';

/// Seguradora — tabela `insurance_companies`.
class InsuranceCompany {
  const InsuranceCompany({
    required this.id,
    required this.name,
    this.logoUrl,
    this.description,
    this.phone,
    this.city,
    this.rating = 0,
  });

  final String id;
  final String name;
  final String? logoUrl;
  final String? description;
  final String? phone;
  final String? city;
  final double rating;

  factory InsuranceCompany.fromJson(Map<String, dynamic> j) =>
      InsuranceCompany(
        id: j['id'] as String,
        name: (j['name'] ?? '') as String,
        logoUrl: j['logo_url'] as String?,
        description: j['description'] as String?,
        phone: j['phone'] as String?,
        city: j['city'] as String?,
        rating: (j['rating'] as num?)?.toDouble() ?? 0,
      );
}

/// Plano de seguro — tabela `insurance_plans` (embed com a empresa).
class InsurancePlan {
  const InsurancePlan({
    required this.id,
    required this.name,
    required this.company,
    this.description,
    required this.monthlyPrice,
    this.yearlyPrice,
    required this.coveragePercent,
    this.maxCoverage,
    this.coveredServices = const [],
  });

  final String id;
  final String name;
  final InsuranceCompany company;
  final String? description;
  final double monthlyPrice;
  final double? yearlyPrice;
  final double coveragePercent;
  final double? maxCoverage;
  final List<String> coveredServices;

  factory InsurancePlan.fromJson(Map<String, dynamic> j) =>
      InsurancePlan(
        id: j['id'] as String,
        name: (j['name'] ?? '') as String,
        company: InsuranceCompany.fromJson(
            (j['company'] ?? j['insurance_companies'] ?? {}) as Map<String,
                dynamic>),
        description: j['description'] as String?,
        monthlyPrice: (j['monthly_price_mzn'] as num?)?.toDouble() ?? 0,
        yearlyPrice: (j['yearly_price_mzn'] as num?)?.toDouble(),
        coveragePercent:
            (j['coverage_percent'] as num?)?.toDouble() ?? 0,
        maxCoverage: (j['max_coverage_mzn'] as num?)?.toDouble(),
        coveredServices: (j['covered_services'] as List?)
                ?.map((e) => e.toString())
                .toList() ??
            const [],
      );
}

/// Apólice do utilizador — tabela `user_insurance`.
class MyInsurancePolicy {
  const MyInsurancePolicy({
    required this.id,
    required this.planId,
    required this.status,
    required this.createdAt,
    this.memberNumber,
  });

  final String id;
  final String planId;

  /// pending | active | cancelled | expired
  final String status;
  final String? memberNumber;
  final DateTime createdAt;

  factory MyInsurancePolicy.fromJson(Map<String, dynamic> j) =>
      MyInsurancePolicy(
        id: j['id'] as String,
        planId: (j['plan_id'] ?? '') as String,
        status: j['status'] as String? ?? 'pending',
        memberNumber: j['member_number'] as String?,
        createdAt: DateTime.tryParse(j['created_at']?.toString() ?? '') ??
            DateTime.now(),
      );
}

/// Repositório de seguros — planos activos (leitura pública) e
/// subscrição self-service via `user_insurance` (RLS: user_id = uid).
class InsuranceRepository {
  InsuranceRepository(this._client);

  final SupabaseClient _client;

  Future<List<InsurancePlan>> fetchPlans() async {
    try {
      final rows = await _client
          .from('insurance_plans')
          .select(
              'id, name, description, monthly_price_mzn, yearly_price_mzn, '
              'coverage_percent, max_coverage_mzn, covered_services, '
              'company:insurance_companies(id, name, logo_url, '
              'description, phone, city, rating)')
          .eq('is_active', true)
          .order('monthly_price_mzn')
          .limit(50);
      return rows.map(InsurancePlan.fromJson).toList();
    } catch (_) {
      return const [];
    }
  }

  Future<List<MyInsurancePolicy>> fetchMyPolicies() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const [];
    try {
      final rows = await _client
          .from('user_insurance')
          .select('id, plan_id, status, member_number, created_at')
          .eq('user_id', uid)
          .order('created_at', ascending: false)
          .limit(20);
      return rows.map(MyInsurancePolicy.fromJson).toList();
    } catch (_) {
      return const [];
    }
  }

  Future<void> subscribe(String planId) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return;
    await _client.from('user_insurance').insert({
      'user_id': uid,
      'plan_id': planId,
      'status': 'pending',
    });
  }

  Future<void> cancel(String policyId) async {
    await _client
        .from('user_insurance')
        .update({'status': 'cancelled'}).eq('id', policyId);
  }
}
