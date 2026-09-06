import 'package:supabase_flutter/supabase_flutter.dart';

/// ── Modelos ──────────────────────────────────────────────────────────

/// Perfil profissional do médico (tabela `doctor_profiles`).
class MyDoctorProfile {
  const MyDoctorProfile({
    required this.userId,
    required this.licenseNumber,
    required this.consultationFee,
    required this.yearsExperience,
    required this.isAvailable,
    required this.isVerified,
    this.specialtyId,
    this.bio,
    this.languages = const ['Português'],
    this.avatarUrl,
    this.rating = 0,
    this.totalConsultations = 0,
  });

  final String userId;
  final String licenseNumber;
  final int consultationFee;
  final int yearsExperience;
  final bool isAvailable;
  final bool isVerified;
  final String? specialtyId;
  final String? bio;
  final List<String> languages;
  final String? avatarUrl;
  final double rating;
  final int totalConsultations;

  factory MyDoctorProfile.fromJson(Map<String, dynamic> j) =>
      MyDoctorProfile(
        userId: (j['user_id'] ?? '') as String,
        licenseNumber: (j['license_number'] ?? '') as String,
        consultationFee: (j['consultation_fee'] as num?)?.toInt() ?? 500,
        yearsExperience: (j['years_experience'] as num?)?.toInt() ?? 0,
        isAvailable: (j['is_available'] as bool?) ?? true,
        isVerified: (j['is_verified'] as bool?) ?? false,
        specialtyId: j['specialty_id'] as String?,
        bio: j['bio'] as String?,
        languages: j['languages'] != null
            ? (j['languages'] as List).map((e) => e.toString()).toList()
            : const ['Português'],
        avatarUrl: j['avatar_url'] as String?,
        rating: (j['rating'] as num?)?.toDouble() ?? 0,
        totalConsultations: (j['total_consultations'] as num?)?.toInt() ?? 0,
      );
}

/// Slot de disponibilidade (`doctor_availability_slots`).
class DoctorSlot {
  const DoctorSlot({
    required this.id,
    required this.startsAt,
    required this.endsAt,
    required this.isBooked,
    this.consultationId,
  });

  final String id;
  final DateTime startsAt;
  final DateTime endsAt;
  final bool isBooked;
  final String? consultationId;

  factory DoctorSlot.fromJson(Map<String, dynamic> j) => DoctorSlot(
        id: j['id'] as String,
        startsAt: DateTime.tryParse(j['starts_at']?.toString() ?? '') ??
            DateTime.now(),
        endsAt: DateTime.tryParse(j['ends_at']?.toString() ?? '') ??
            DateTime.now().add(const Duration(minutes: 30)),
        isBooked: (j['is_booked'] as bool?) ?? false,
        consultationId: j['consultation_id'] as String?,
      );
}

/// Consulta do lado do médico, enriquecida com o nome do paciente.
class DoctorConsultation {
  const DoctorConsultation({
    required this.id,
    required this.patientId,
    required this.scheduledAt,
    required this.durationMinutes,
    required this.consultationType,
    required this.status,
    required this.fee,
    this.reason,
    this.patientName = 'Paciente',
  });

  final String id;
  final String patientId;
  final DateTime scheduledAt;
  final int durationMinutes;
  final String consultationType;
  final String status;
  final double fee;
  final String? reason;
  final String patientName;

  bool get isUpcoming =>
      scheduledAt.isAfter(DateTime.now()) && status == 'scheduled';

  factory DoctorConsultation.fromJson(Map<String, dynamic> j) =>
      DoctorConsultation(
        id: j['id'] as String,
        patientId: (j['patient_id'] ?? '') as String,
        scheduledAt: DateTime.tryParse(j['scheduled_at']?.toString() ?? '') ??
            DateTime.now(),
        durationMinutes: (j['duration_minutes'] as num?)?.toInt() ?? 30,
        consultationType: j['consultation_type'] as String? ?? 'chat',
        status: j['status'] as String? ?? 'scheduled',
        fee: (j['fee'] as num?)?.toDouble() ?? 0,
        reason: j['reason'] as String?,
      );
}

/// Paciente que já consultou com o médico.
class DoctorPatient {
  const DoctorPatient({
    required this.id,
    required this.name,
    required this.consultationCount,
    this.lastVisit,
  });

  final String id;
  final String name;
  final int consultationCount;
  final DateTime? lastVisit;
}

/// KPIs (calculados no cliente a partir das consultas em memória).
class DoctorKpis {
  const DoctorKpis({
    required this.monthCompleted,
    required this.monthRevenue,
    required this.monthPatients,
    required this.upcomingCount,
  });

  final int monthCompleted;
  final double monthRevenue;
  final int monthPatients;
  final int upcomingCount;

  static const empty = DoctorKpis(
      monthCompleted: 0, monthRevenue: 0, monthPatients: 0, upcomingCount: 0);
}

/// ── Repositório ──────────────────────────────────────────────────────

/// Painel do médico: agenda, disponibilidade, slots, pacientes e perfil.
/// Tudo via tabelas/RPC existentes — `consultations`,
/// `doctor_availability_slots`, `doctor_profiles` e
/// `mark_consultation_completed` — sem alterações no backend.
class DoctorRepository {
  DoctorRepository(this._client);

  final SupabaseClient _client;

  // ── Perfil profissional ────────────────────────────────────────────

  Future<MyDoctorProfile?> fetchMyDoctorProfile(String userId) async {
    final rows = await _client
        .from('doctor_profiles')
        .select()
        .eq('user_id', userId)
        .limit(1);
    if (rows.isEmpty) return null;
    return MyDoctorProfile.fromJson(rows.first);
  }

  Future<void> updateDoctorProfile(
    String userId, {
    String? bio,
    int? consultationFee,
    int? yearsExperience,
    List<String>? languages,
    String? licenseNumber,
    String? avatarUrl,
  }) {
    return _client.from('doctor_profiles').update({
      if (bio != null) 'bio': bio,
      if (consultationFee != null) 'consultation_fee': consultationFee,
      if (yearsExperience != null) 'years_experience': yearsExperience,
      if (languages != null) 'languages': languages,
      if (licenseNumber != null) 'license_number': licenseNumber,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
    }).eq('user_id', userId);
  }

  Future<void> toggleAvailability(String userId, bool value) =>
      _client
          .from('doctor_profiles')
          .update({'is_available': value}).eq('user_id', userId);

  // ── Agenda ─────────────────────────────────────────────────────────

  /// Consultas do médico em tempo real, enriquecidas com o nome do
  /// paciente (resolução em lote, sem N+1).
  Stream<List<DoctorConsultation>> watchMyConsultations(String doctorId) =>
      _client
          .from('consultations')
          .stream(primaryKey: ['id'])
          .eq('doctor_id', doctorId)
          .order('scheduled_at')
          .asyncMap((rows) async {
            final list = rows.map(DoctorConsultation.fromJson).toList();
            await _attachPatientNames(list);
            return list;
          });

  Future<void> _attachPatientNames(List<DoctorConsultation> list) async {
    final ids = list.map((c) => c.patientId).toSet().toList();
    if (ids.isEmpty) return;
    try {
      final rows = await _client
          .from('profiles')
          .select('id, full_name')
          .inFilter('id', ids);
      final names = <String, String>{
        for (final r in rows)
          (r['id'] as String): (r['full_name'] ?? 'Paciente') as String,
      };
      for (var i = 0; i < list.length; i++) {
        final c = list[i];
        final name = names[c.patientId];
        if (name != null) {
          list[i] = DoctorConsultation(
            id: c.id,
            patientId: c.patientId,
            scheduledAt: c.scheduledAt,
            durationMinutes: c.durationMinutes,
            consultationType: c.consultationType,
            status: c.status,
            fee: c.fee,
            reason: c.reason,
            patientName: name,
          );
        }
      }
    } catch (_) {
      // nomes em falta não bloqueiam a agenda
    }
  }

  /// Marca a consulta como concluída (RPC oficial do backend, que também
  /// credita o médico e atualiza contadores).
  Future<void> markCompleted(String consultationId) => _client
      .rpc('mark_consultation_completed', params: {'_id': consultationId});

  /// Cancela a consulta (RLS permite patient ou doctor).
  Future<void> cancel(String consultationId) =>
      _client
          .from('consultations')
          .update({'status': 'cancelled'}).eq('id', consultationId);

  // ── Slots de disponibilidade ───────────────────────────────────────

  Future<List<DoctorSlot>> fetchSlots(String doctorId) async {
    final rows = await _client
        .from('doctor_availability_slots')
        .select()
        .eq('doctor_id', doctorId)
        .gte('starts_at', DateTime.now().toUtc().toIso8601String())
        .order('starts_at')
        .limit(200);
    return rows.map(DoctorSlot.fromJson).toList();
  }

  /// Cria slots em série: `days` dias seguidos, entre startHour e
  /// endHour, com a duração indicada — agenda completa de uma vez.
  Future<int> addSlotSeries({
    required String doctorId,
    required int days,
    required int startHour,
    required int endHour,
    required int durationMinutes,
  }) async {
    final now = DateTime.now();
    var created = 0;
    final rows = <Map<String, dynamic>>[];
    for (var d = 1; d <= days; d++) {
      final day = DateTime(now.year, now.month, now.day + d);
      var t = DateTime(day.year, day.month, day.day, startHour);
      final end = DateTime(day.year, day.month, day.day, endHour);
      while (t.isBefore(end)) {
        final slotEnd = t.add(Duration(minutes: durationMinutes));
        if (slotEnd.isAfter(end)) break;
        rows.add({
          'doctor_id': doctorId,
          'starts_at': t.toUtc().toIso8601String(),
          'ends_at': slotEnd.toUtc().toIso8601String(),
        });
        t = slotEnd;
        created++;
      }
    }
    if (rows.isNotEmpty) {
      await _client.from('doctor_availability_slots').insert(rows);
    }
    return created;
  }

  Future<void> deleteSlot(String slotId) =>
      _client.from('doctor_availability_slots').delete().eq('id', slotId);

  // ── Pacientes ──────────────────────────────────────────────────────

  Future<List<DoctorPatient>> fetchPatients(String doctorId) async {
    final rows = await _client
        .from('consultations')
        .select('patient_id, scheduled_at')
        .eq('doctor_id', doctorId)
        .order('scheduled_at', ascending: false)
        .limit(400);

    final agg = <String, List<DateTime>>{};
    for (final r in rows) {
      final pid = (r['patient_id'] ?? '') as String;
      if (pid.isEmpty) continue;
      final when = DateTime.tryParse(r['scheduled_at']?.toString() ?? '');
      agg.putIfAbsent(pid, () => []).add(when ?? DateTime.now());
    }

    final ids = agg.keys.toList();
    if (ids.isEmpty) return const [];
    final names = <String, String>{};
    try {
      final profileRows = await _client
          .from('profiles')
          .select('id, full_name')
          .inFilter('id', ids);
      for (final r in profileRows) {
        names[(r['id'] as String)] = (r['full_name'] ?? 'Paciente') as String;
      }
    } catch (_) {}

    final patients = agg.entries
        .map((e) => DoctorPatient(
              id: e.key,
              name: names[e.key] ?? 'Paciente',
              consultationCount: e.value.length,
              lastVisit: e.value.reduce((a, b) => a.isAfter(b) ? a : b),
            ))
        .toList();
    patients.sort((a, b) =>
        (b.lastVisit ?? DateTime(2000)).compareTo(a.lastVisit ?? DateTime(2000)));
    return patients;
  }

  // ── KPIs ───────────────────────────────────────────────────────────

  DoctorKpis computeKpis(List<DoctorConsultation> all) {
    final now = DateTime.now();
    final monthStart = DateTime(now.year, now.month);
    final completedThisMonth = all
        .where((c) =>
            c.status == 'completed' && c.scheduledAt.isAfter(monthStart))
        .toList();
    final patients = completedThisMonth.map((c) => c.patientId).toSet();
    final upcoming = all.where((c) => c.isUpcoming).length;
    return DoctorKpis(
      monthCompleted: completedThisMonth.length,
      monthRevenue: completedThisMonth.fold(0, (s, c) => s + c.fee),
      monthPatients: patients.length,
      upcomingCount: upcoming,
    );
  }
}
