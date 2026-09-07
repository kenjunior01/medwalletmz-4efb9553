import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Saúde Maternal — paridade com `MaternalHealthPage.tsx` da web.
///
/// Tabela `maternal_profiles` (migração de programas de saúde; RLS
/// própria: a paciente lê/cria/edita o próprio perfil — zero backend).
///
/// Cálculos locais (iguais às convenções clínicas usadas pela web):
///   • DPP (data provável do parto) = DUM + 280 dias (regra de Naegele);
///   • Semanas de gestação = dias desde a DUM ÷ 7;
///   • Plano de 8 consultas pré-natais (OMS) gerado a partir da DPP:
///     semanas 12, 20, 26, 30, 34, 36, 38 e 40.
class MaternalProfile {
  const MaternalProfile({
    required this.id,
    this.lmpDate,
    this.eddDate,
    this.gravida,
    this.para,
    this.bloodType,
    this.riskLevel = 'low',
    this.ancVisitsDone = 0,
    this.ancVisitsDue = const [],
    this.partnerName,
    this.partnerPhone,
    this.preferredFacility,
    this.lastBpSystolic,
    this.lastBpDiastolic,
    this.lastWeightKg,
    this.notes,
  });

  final String id;
  final DateTime? lmpDate; // DUM — Last Menstrual Period
  final DateTime? eddDate; // DPP — Estimated Due Date
  final int? gravida; // nº de gravidezes
  final int? para; // nº de nascimentos
  final String? bloodType;
  final String riskLevel; // low|medium|high
  final int ancVisitsDone;
  final List<AncVisit> ancVisitsDue;
  final String? partnerName;
  final String? partnerPhone;
  final String? preferredFacility;
  final int? lastBpSystolic;
  final int? lastBpDiastolic;
  final double? lastWeightKg;
  final String? notes;

  /// Semanas de gestação actuais (a partir da DUM).
  int? get weeksPregnant {
    final l = lmpDate;
    if (l == null) return null;
    final days = DateTime.now().difference(l).inDays;
    if (days < 0 || days > 320) return null;
    return days ~/ 7;
  }

  /// Dias até ao parto (negativo = passou da DPP).
  int? get daysToDue {
    final e = eddDate;
    if (e == null) return null;
    return e.difference(DateTime.now()).inDays;
  }

  String get trimester {
    final w = weeksPregnant ?? 0;
    if (w < 13) return '1º trimestre';
    if (w < 28) return '2º trimestre';
    return '3º trimestre';
  }

  bool get isHighRisk => riskLevel == 'high';

  static MaternalProfile fromMap(Map<String, dynamic> m) {
    final rawVisits = m['anc_visits_due'] as List<dynamic>? ?? const [];
    return MaternalProfile(
      id: m['id'] as String,
      lmpDate: _date(m['lmp_date']),
      eddDate: _date(m['edd_date']),
      gravida: m['gravida'] as int?,
      para: m['para'] as int?,
      bloodType: m['blood_type'] as String?,
      riskLevel: (m['risk_level'] ?? 'low') as String,
      ancVisitsDone: (m['anc_visits_done'] as int?) ?? 0,
      ancVisitsDue: rawVisits
          .map((v) => AncVisit.fromMap(v as Map<String, dynamic>))
          .toList(),
      partnerName: m['partner_name'] as String?,
      partnerPhone: m['partner_phone'] as String?,
      preferredFacility: m['preferred_facility'] as String?,
      lastBpSystolic: m['last_bp_systolic'] as int?,
      lastBpDiastolic: m['last_bp_diastolic'] as int?,
      lastWeightKg: (m['last_weight_kg'] as num?)?.toDouble(),
      notes: m['notes'] as String?,
    );
  }

  static DateTime? _date(dynamic v) =>
      v == null ? null : DateTime.parse(v as String).toLocal();
}

class AncVisit {
  const AncVisit({
    required this.visit,
    required this.dueDate,
    this.done = false,
  });

  final int visit; // 1..8
  final DateTime dueDate;
  final bool done;

  bool get isOverdue => !done && dueDate.isBefore(DateTime.now());

  static AncVisit fromMap(Map<String, dynamic> m) => AncVisit(
        visit: (m['visit'] as int?) ?? 0,
        dueDate: DateTime.parse(m['due_date'] as String).toLocal(),
        done: (m['done'] as bool?) ?? false,
      );

  Map<String, dynamic> toMap() => {
        'visit': visit,
        'due_date': dueDate.toIso8601String().substring(0, 10),
        'done': done,
      };
}

class MaternalRepository {
  MaternalRepository(this._sb);
  final SupabaseClient _sb;

  String? get _uid => _sb.auth.currentUser?.id;

  Future<MaternalProfile?> fetchMine() async {
    final uid = _uid;
    if (uid == null) throw const AuthException('Sessão necessária');
    final rows = await _sb
        .from('maternal_profiles')
        .select()
        .eq('patient_user_id', uid)
        .limit(1);
    if (rows is List && rows.isEmpty) return null;
    return MaternalProfile.fromMap(rows.first as Map<String, dynamic>);
  }

  /// Cria/atualiza o perfil e (re)gera o plano ANC a partir da DUM.
  Future<MaternalProfile> upsertProfile({
    DateTime? lmpDate,
    int? gravida,
    int? para,
    String? bloodType,
    String riskLevel = 'low',
    String? partnerName,
    String? partnerPhone,
    String? preferredFacility,
  }) async {
    final uid = _uid;
    if (uid == null) throw const AuthException('Sessão necessária');

    final existing = await fetchMine();
    final edd =
        lmpDate?.add(const Duration(days: 280)); // regra de Naegele
    final payload = <String, dynamic>{
      'patient_user_id': uid,
      if (lmpDate != null)
        'lmp_date': lmpDate.toIso8601String().substring(0, 10),
      if (edd != null) 'edd_date': edd.toIso8601String().substring(0, 10),
      if (gravida != null) 'gravida': gravida,
      if (para != null) 'para': para,
      if (bloodType != null) 'blood_type': bloodType,
      'risk_level': riskLevel,
      if (partnerName != null) 'partner_name': partnerName,
      if (partnerPhone != null) 'partner_phone': partnerPhone,
      if (preferredFacility != null)
        'preferred_facility': preferredFacility,
      // Regenera plano quando a DUM muda; preserva estados já feitos.
      if (edd != null)
        'anc_visits_due': _buildVisitPlan(edd, existing).map((v) => v.toMap())
            .toList(),
    };

    final Map<String, dynamic> row;
    if (existing == null) {
      row = await _sb.from('maternal_profiles').insert(payload).select().single();
    } else {
      row = await _sb
          .from('maternal_profiles')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
    }
    return MaternalProfile.fromMap(row);
  }

  /// Marca uma consulta pré-natal como realizada (contador + lista).
  Future<MaternalProfile> setVisitDone(
      MaternalProfile profile, int visit, bool done) async {
    final visits = profile.ancVisitsDue
        .map((v) =>
            v.visit == visit ? AncVisit(visit: v.visit, dueDate: v.dueDate, done: done) : v)
        .toList();
    final doneCount = visits.where((v) => v.done).length;
    final row = await _sb
        .from('maternal_profiles')
        .update({
          'anc_visits_due': visits.map((v) => v.toMap()).toList(),
          'anc_visits_done': doneCount,
        })
        .eq('id', profile.id)
        .select()
        .single();
    return MaternalProfile.fromMap(row);
  }

  /// Registo rápido de TA + peso.
  Future<MaternalProfile> saveVitals({
    required int systolic,
    required int diastolic,
    double? weightKg,
  }) async {
    final uid = _uid;
    if (uid == null) throw const AuthException('Sessão necessária');
    final existing = await fetchMine();
    if (existing == null) throw StateError('Sem perfil maternal');
    final row = await _sb
        .from('maternal_profiles')
        .update({
          'last_bp_systolic': systolic,
          'last_bp_diastolic': diastolic,
          if (weightKg != null) 'last_weight_kg': weightKg,
        })
        .eq('id', existing.id)
        .select()
        .single();
    return MaternalProfile.fromMap(row);
  }

  /// Plano OMS de 8 consultas — mantém as já feitas (por nº de visita).
  List<AncVisit> _buildVisitPlan(DateTime edd, MaternalProfile? existing) {
    const weeks = [12, 20, 26, 30, 34, 36, 38, 40];
    final oldDone = <int, bool>{
      for (final v in existing?.ancVisitsDue ?? const <AncVisit>[])
        v.visit: v.done,
    };
    return weeks
        .map((w) {
          final due = edd.subtract(Duration(days: (40 - w) * 7));
          return AncVisit(
            visit: weeks.indexOf(w) + 1,
            dueDate: due,
            done: oldDone[weeks.indexOf(w) + 1] ?? false,
          );
        })
        .toList();
  }
}

final maternalRepositoryProvider = Provider<MaternalRepository>(
    (ref) => MaternalRepository(Supabase.instance.client));
