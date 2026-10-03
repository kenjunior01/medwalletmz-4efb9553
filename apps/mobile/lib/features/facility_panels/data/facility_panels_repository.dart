import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

/// F37 — Painéis das instituições do dono (paridade com a web F34):
/// clínica (ClinicDashboard), laboratório (LabDashboard) e seguradora
/// (InsuranceDashboard). Todas as queries espelham as versões web
/// (mesmas tabelas, colunas e RPCs), com fallback 2-passos onde a
/// web também o usa (nomes via `profiles`).
///
/// Papéis servidos: `clinic`, `hospital` (clinics), `lab`
/// (clinics.type='laboratory') e `insurance` (insurance_companies).

// ── Clínica ─────────────────────────────────────────────────────────

class ClinicTeamMember {
  final String rowId;
  final String doctorId;
  final String fullName;
  final String? phone;

  const ClinicTeamMember({
    required this.rowId,
    required this.doctorId,
    required this.fullName,
    this.phone,
  });
}

class PanelConsultation {
  final String id;
  final String? patientId;
  final String patientName;
  final DateTime? scheduledAt;
  final String status;
  final num fee;
  final String? type;

  const PanelConsultation({
    required this.id,
    this.patientId,
    required this.patientName,
    this.scheduledAt,
    required this.status,
    required this.fee,
    this.type,
  });
}

class ClinicPanelData {
  final Map<String, dynamic> clinic;
  final bool subActive;
  final List<ClinicTeamMember> team;
  final List<PanelConsultation> today;
  final int monthCount;
  final int monthPatients;
  final num monthRevenue;

  const ClinicPanelData({
    required this.clinic,
    required this.subActive,
    required this.team,
    required this.today,
    required this.monthCount,
    required this.monthPatients,
    required this.monthRevenue,
  });

  int get todayCount => today.length;
  int get teamSize => team.length;
}

// ── Laboratório ─────────────────────────────────────────────────────

class LabOrder {
  final String id;
  final String status;
  final num totalAmount;
  final DateTime createdAt;
  final String? resultUrl;

  const LabOrder({
    required this.id,
    required this.status,
    required this.totalAmount,
    required this.createdAt,
    this.resultUrl,
  });

  bool get isCompleted => status == 'completed';
}

class LabPanelData {
  final Map<String, dynamic> lab;
  final List<LabOrder> orders;

  const LabPanelData({required this.lab, required this.orders});

  int get pending => orders.where((o) => !o.isCompleted).length;
  int get done => orders.where((o) => o.isCompleted).length;
  int get total => orders.length;
  num get monthRevenue {
    final start = DateTime.now();
    final monthStart = DateTime(start.year, start.month, 1);
    return orders
        .where((o) => o.isCompleted && !o.createdAt.isBefore(monthStart))
        .fold(0, (s, o) => s + o.totalAmount);
  }
}

// ── Seguradora ──────────────────────────────────────────────────────

class InsurancePlan {
  final String id;
  final String name;
  final String? description;
  final num monthlyPrice;
  final num coveragePercent;
  final num maxCoverage;
  final List<String> features;

  const InsurancePlan({
    required this.id,
    required this.name,
    this.description,
    required this.monthlyPrice,
    required this.coveragePercent,
    required this.maxCoverage,
    required this.features,
  });
}

class InsuranceMember {
  final String id;
  final String userId;
  final String name;
  final String planId;
  final String status;

  const InsuranceMember({
    required this.id,
    required this.userId,
    required this.name,
    required this.planId,
    required this.status,
  });

  bool get isActive => status == 'active';
}

class InsurancePanelData {
  final Map<String, dynamic> company;
  final List<InsurancePlan> plans;
  final List<InsuranceMember> members;

  const InsurancePanelData({
    required this.company,
    required this.plans,
    required this.members,
  });

  int get activeMembers => members.where((m) => m.isActive).length;

  /// MRR = soma, por plano, dos membros activos × preço mensal (web
  /// InsuranceDashboard usa exactamente esta fórmula).
  num get mrr {
    var sum = 0.0;
    for (final p in plans) {
      final count =
          members.where((m) => m.isActive && m.planId == p.id).length;
      sum += count * p.monthlyPrice;
    }
    return sum;
  }

  int get avgCoverage {
    if (plans.isEmpty) return 0;
    final total =
        plans.fold(0.0, (s, p) => s + p.coveragePercent) / plans.length;
    return total.round();
  }
}

// ── Repositório ─────────────────────────────────────────────────────

class FacilityPanelsRepository {
  final SupabaseClient _sb;

  FacilityPanelsRepository(this._sb);

  // ─── Clínica ──────────────────────────────────────────────────────

  /// Painel completo da clínica do utilizador (null se não possui).
  Future<ClinicPanelData?> fetchClinicPanel(String uid) async {
    final clinic = await _sb
        .from('clinics')
        .select()
        .eq('owner_id', uid)
        .maybeSingle();
    if (clinic == null) return null;
    final clinicMap = Map<String, dynamic>.from(clinic as Map);
    final clinicId = clinicMap['id'] as String;

    // Assinatura Pro de clínica (upsell igual ao web).
    var subActive = false;
    try {
      final subs = await _sb
          .from('subscriptions')
          .select('id, plan:subscription_plans(target_audience)')
          .eq('user_id', uid)
          .eq('status', 'active');
      for (final s in (subs as List)) {
        final plan = s['plan'];
        if (plan is Map && (plan['target_audience'] ?? '') == 'clinic') {
          subActive = true;
          break;
        }
      }
    } catch (_) {
      // joins embebidos podem falhar em esquemas antigos — não bloqueia.
    }

    // Equipa médica: clinic_doctors + nomes via profiles (2 passos).
    final teamRows = await _sb
        .from('clinic_doctors')
        .select()
        .eq('clinic_id', clinicId);
    final team = <ClinicTeamMember>[];
    final doctorIds = <String>[];
    for (final row in (teamRows as List)) {
      final m = Map<String, dynamic>.from(row as Map);
      final id = (m['doctor_id'] ?? '') as String;
      if (id.isEmpty) continue;
      doctorIds.add(id);
      team.add(ClinicTeamMember(
        rowId: m['id'] as String,
        doctorId: id,
        fullName: '',
        phone: m['phone'] as String?,
      ));
    }
    if (doctorIds.isNotEmpty) {
      final profs = await _sb
          .from('profiles')
          .select('user_id, full_name, phone')
          .inFilter('user_id', doctorIds);
      final byId = <String, Map<String, dynamic>>{};
      for (final p in (profs as List)) {
        final pm = Map<String, dynamic>.from(p as Map);
        byId[pm['user_id'] as String] = pm;
      }
      for (var i = 0; i < team.length; i++) {
        final pm = byId[team[i].doctorId];
        if (pm == null) continue;
        team[i] = ClinicTeamMember(
          rowId: team[i].rowId,
          doctorId: team[i].doctorId,
          fullName: (pm['full_name'] ?? '') as String,
          phone: (pm['phone'] ?? team[i].phone) as String?,
        );
      }
    }

    // Consultas: hoje + mês (idêntico ao web; mês limitado a 500).
    final now = DateTime.now();
    final startToday = DateTime(now.year, now.month, now.day);
    final endToday = startToday
        .add(const Duration(days: 1))
        .subtract(const Duration(milliseconds: 1));
    final startMonth = DateTime(now.year, now.month, 1);

    var today = <PanelConsultation>[];
    var monthRows = <Map<String, dynamic>>[];
    if (doctorIds.isNotEmpty) {
      final tdy = await _sb
          .from('consultations')
          .select()
          .inFilter('doctor_id', doctorIds)
          .gte('scheduled_at', startToday.toIso8601String())
          .lte('scheduled_at', endToday.toIso8601String())
          .order('scheduled_at');
      final mth = await _sb
          .from('consultations')
          .select('fee, patient_id, status')
          .inFilter('doctor_id', doctorIds)
          .gte('scheduled_at', startMonth.toIso8601String())
          .limit(500);

      final todayMaps = <Map<String, dynamic>>[];
      for (final row in (tdy as List)) {
        todayMaps.add(Map<String, dynamic>.from(row as Map));
      }
      for (final row in (mth as List)) {
        monthRows.add(Map<String, dynamic>.from(row as Map));
      }

      // Nomes dos pacientes de hoje via profiles.
      final patientIds = todayMaps
          .map((c) => (c['patient_id'] ?? '') as String)
          .where((id) => id.isNotEmpty)
          .toSet()
          .toList();
      final names = <String, String>{};
      if (patientIds.isNotEmpty) {
        final pats = await _sb
            .from('profiles')
            .select('user_id, full_name')
            .inFilter('user_id', patientIds);
        for (final p in (pats as List)) {
          final pm = Map<String, dynamic>.from(p as Map);
          names[pm['user_id'] as String] = (pm['full_name'] ?? '') as String;
        }
      }
      today = todayMaps.map((c) {
        final pid = c['patient_id'] as String?;
        final sched = c['scheduled_at'] as String?;
        return PanelConsultation(
          id: c['id'] as String,
          patientId: pid,
          patientName: pid == null ? '' : (names[pid] ?? ''),
          scheduledAt: sched == null ? null : DateTime.tryParse(sched),
          status: (c['status'] ?? '') as String,
          fee: (c['fee'] ?? 0) as num,
          type: c['type'] as String?,
        );
      }).toList();
    }

    final monthPatients = monthRows.map((c) => c['patient_id']).toSet().length;
    final monthRevenue = monthRows
        .where((c) => c['status'] == 'completed')
        .fold(0, (s, c) => s + ((c['fee'] ?? 0) as num));

    return ClinicPanelData(
      clinic: clinicMap,
      subActive: subActive,
      team: team,
      today: today,
      monthCount: monthRows.length,
      monthPatients: monthPatients,
      monthRevenue: monthRevenue,
    );
  }

  /// Adiciona médico à equipa por nome (igual ao web: procura
  /// `profiles.full_name` com ilike e insere clinic_doctors).
  Future<String> addDoctorByName(String clinicId, String name) async {
    final rows = await _sb
        .from('profiles')
        .select('user_id, full_name')
        .ilike('full_name', '%$name%')
        .limit(1)
        .maybeSingle();
    if (rows == null) {
      throw Exception('Médico não encontrado');
    }
    final profile = Map<String, dynamic>.from(rows as Map);
    await _sb.from('clinic_doctors').insert({
      'clinic_id': clinicId,
      'doctor_id': profile['user_id'],
    });
    return (profile['full_name'] ?? '') as String;
  }

  Future<void> removeDoctor(String rowId) async {
    await _sb.from('clinic_doctors').delete().eq('id', rowId);
  }

  /// Conclui consulta via RPC (mesmo RPC do web).
  Future<void> completeConsultation(String id) async {
    await _sb.rpc('mark_consultation_completed', params: {'_id': id});
  }

  // ─── Laboratório ──────────────────────────────────────────────────

  Future<LabPanelData?> fetchLabPanel(String uid) async {
    final lab = await _sb
        .from('clinics')
        .select()
        .eq('owner_id', uid)
        .eq('type', 'laboratory')
        .maybeSingle();
    if (lab == null) return null;
    final labMap = Map<String, dynamic>.from(lab as Map);
    final labId = labMap['id'] as String;

    final rows = await _sb
        .from('lab_exam_orders')
        .select()
        .eq('lab_id', labId)
        .order('created_at', ascending: false)
        .limit(100);
    final orders = <LabOrder>[];
    for (final row in (rows as List)) {
      final m = Map<String, dynamic>.from(row as Map);
      final created = m['created_at'] as String?;
      orders.add(LabOrder(
        id: m['id'] as String,
        status: (m['status'] ?? 'pending') as String,
        totalAmount: (m['total_amount'] ?? 0) as num,
        createdAt:
            created == null ? DateTime.now() : DateTime.parse(created),
        resultUrl: m['result_url'] as String?,
      ));
    }
    return LabPanelData(lab: labMap, orders: orders);
  }

  /// Upload do resultado (PDF) para o bucket `lab-results` + RPC que
  /// marca a ordem como concluída com o caminho (mesmo fluxo do web).
  Future<void> uploadLabResult({
    required String uid,
    required String orderId,
    required Uint8List bytes,
  }) async {
    final path = '$uid/$orderId-${DateTime.now().millisecondsSinceEpoch}.pdf';
    await _sb.storage.from('lab-results').uploadBinary(
          path,
          bytes,
          fileOptions: const FileOptions(
            contentType: 'application/pdf',
            cacheControl: '3600',
          ),
        );
    await _sb.rpc(
      'lab_order_set_result',
      params: {'_order_id': orderId, '_result_url': path},
    );
  }

  /// URL assinado (60 s) para re-descarregar um resultado.
  Future<String> labResultSignedUrl(String path) async {
    final res =
        await _sb.storage.from('lab-results').createSignedUrl(path, 60);
    return res;
  }

  // ─── Seguradora ───────────────────────────────────────────────────

  Future<InsurancePanelData?> fetchInsurancePanel(String uid) async {
    final companyRow = await _sb
        .from('insurance_companies')
        .select()
        .eq('owner_id', uid)
        .maybeSingle();
    if (companyRow == null) return null;
    final company = Map<String, dynamic>.from(companyRow as Map);
    final companyId = company['id'] as String;

    final planRows = await _sb
        .from('insurance_plans')
        .select()
        .eq('company_id', companyId)
        .order('created_at');
    final plans = <InsurancePlan>[];
    final planIds = <String>[];
    for (final row in (planRows as List)) {
      final m = Map<String, dynamic>.from(row as Map);
      final id = m['id'] as String;
      planIds.add(id);
      final rawFeatures = m['features'];
      final features = <String>[];
      if (rawFeatures is List) {
        for (final f in rawFeatures) {
          if (f != null && '$f'.trim().isNotEmpty) features.add('$f');
        }
      }
      plans.add(InsurancePlan(
        id: id,
        name: (m['name'] ?? '') as String,
        description: m['description'] as String?,
        monthlyPrice: (m['monthly_price_mzn'] ?? 0) as num,
        coveragePercent: (m['coverage_percent'] ?? 0) as num,
        maxCoverage: (m['max_coverage_mzn'] ?? 0) as num,
        features: features,
      ));
    }

    // Membros reais: user_insurance ligado aos planos da seguradora.
    var members = <InsuranceMember>[];
    if (planIds.isNotEmpty) {
      final rows = await _sb
          .from('user_insurance')
          .select()
          .inFilter('plan_id', planIds)
          .order('created_at', ascending: false)
          .limit(50);
      final list = <Map<String, dynamic>>[];
      final userIds = <String>[];
      for (final row in (rows as List)) {
        final m = Map<String, dynamic>.from(row as Map);
        list.add(m);
        final uidRow = (m['user_id'] ?? '') as String;
        if (uidRow.isNotEmpty) userIds.add(uidRow);
      }
      final names = <String, String>{};
      if (userIds.isNotEmpty) {
        final profs = await _sb
            .from('profiles')
            .select('user_id, full_name')
            .inFilter('user_id', userIds.toSet().toList());
        for (final p in (profs as List)) {
          final pm = Map<String, dynamic>.from(p as Map);
          names[pm['user_id'] as String] = (pm['full_name'] ?? '') as String;
        }
      }
      members = list.map((m) {
        final mid = (m['user_id'] ?? '') as String;
        return InsuranceMember(
          id: m['id'] as String,
          userId: mid,
          name: names[mid] ?? '',
          planId: (m['plan_id'] ?? '') as String,
          status: (m['status'] ?? '') as String,
        );
      }).toList();
    }

    return InsurancePanelData(
      company: company,
      plans: plans,
      members: members,
    );
  }

  /// Cria ou actualiza um plano (payload espelha o web: features é
  /// lista de strings).
  Future<void> savePlan({
    required String companyId,
    String? planId,
    required String name,
    String? description,
    required num monthlyPrice,
    required num coveragePercent,
    required num maxCoverage,
    required List<String> features,
  }) async {
    final payload = <String, dynamic>{
      'name': name,
      'description': description,
      'monthly_price_mzn': monthlyPrice,
      'coverage_percent': coveragePercent,
      'max_coverage_mzn': maxCoverage,
      'features': features,
    };
    if (planId == null) {
      await _sb
          .from('insurance_plans')
          .insert({...payload, 'company_id': companyId});
    } else {
      await _sb.from('insurance_plans').update(payload).eq('id', planId);
    }
  }

  Future<void> deletePlan(String planId) async {
    await _sb.from('insurance_plans').delete().eq('id', planId);
  }
}
