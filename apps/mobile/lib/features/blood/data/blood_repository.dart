import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Banco de Sangue MedWallet — MESMAS tabelas da versão web:
///   • dadores           → `blood_donors`            (1 por utilizador)
///   • pedidos           → `blood_requests`          (status open/fulfilled…)
///   • voluntariados     → `blood_donation_matches`  (UNIQUE request+donor)
///   • campanhas         → `blood_donation_campaigns`
/// Ao concluir uma doação, o trigger `reward_blood_donation` do backend credita
/// 100 MT na carteira via `wallet_credit` — a app apenas lê o resultado.
class BloodDonor {
  const BloodDonor({
    required this.bloodType,
    this.fullName,
    this.phone,
    this.birthDate,
    this.weightKg,
    this.neighborhood,
    this.isAvailable = true,
    this.healthNotes,
    this.totalDonations = 0,
    this.lastDonationDate,
    this.isRegistered = false,
  });

  final String bloodType;
  final String? fullName;
  final String? phone;
  final DateTime? birthDate;
  final double? weightKg;
  final String? neighborhood;
  final bool isAvailable;
  final String? healthNotes;
  final int totalDonations;
  final DateTime? lastDonationDate;
  final bool isRegistered;

  factory BloodDonor.fromJson(Map<String, dynamic> j) => BloodDonor(
        bloodType: (j['blood_type'] ?? 'O+') as String,
        fullName: j['full_name'] as String?,
        phone: j['phone'] as String?,
        birthDate: DateTime.tryParse(j['birth_date']?.toString() ?? ''),
        weightKg: double.tryParse(j['weight_kg']?.toString() ?? ''),
        neighborhood: j['neighborhood'] as String?,
        isAvailable: j['is_available'] as bool? ?? true,
        healthNotes: j['health_notes'] as String?,
        totalDonations: (j['total_donations'] as num?)?.toInt() ?? 0,
        lastDonationDate:
            DateTime.tryParse(j['last_donation_date']?.toString() ?? ''),
        isRegistered: true,
      );
}

/// Pedido de sangue aberto — `blood_requests`.
class BloodRequest {
  const BloodRequest({
    required this.id,
    required this.bloodType,
    required this.city,
    required this.urgency,
    required this.unitsNeeded,
    required this.createdAt,
    this.patientName,
    this.hospitalName,
    this.contactPhone,
    this.unitsReceived = 0,
    this.reason,
    this.deadline,
    this.isMine = false,
  });

  final String id;
  final String bloodType;
  final String city;
  final String urgency; // normal | urgent | critical
  final int unitsNeeded;
  final DateTime createdAt;
  final String? patientName;
  final String? hospitalName;
  final String? contactPhone;
  final int unitsReceived;
  final String? reason;
  final DateTime? deadline;
  final bool isMine;

  bool get isCritical => urgency == 'critical';
  bool get isUrgent => urgency == 'urgent' || urgency == 'critical';
  double get progress =>
      unitsNeeded <= 0 ? 0 : (unitsReceived / unitsNeeded).clamp(0, 1);

  String get urgencyLabel {
    switch (urgency) {
      case 'critical':
        return 'Crítico';
      case 'urgent':
        return 'Urgente';
      default:
        return 'Normal';
    }
  }

  factory BloodRequest.fromJson(Map<String, dynamic> j, {String? myId}) =>
      BloodRequest(
        id: j['id'] as String,
        bloodType: (j['blood_type'] ?? '?') as String,
        city: (j['city'] ?? '—') as String,
        urgency: (j['urgency'] ?? 'normal') as String,
        unitsNeeded: (j['units_needed'] as num?)?.toInt() ?? 1,
        createdAt:
            DateTime.tryParse(j['created_at']?.toString() ?? '') ??
                DateTime.now(),
        patientName: j['patient_name'] as String?,
        hospitalName:
            (j['hospital_name_manual'] ?? j['hospital_name']) as String?,
        contactPhone: j['contact_phone'] as String?,
        unitsReceived: (j['units_received'] as num?)?.toInt() ?? 0,
        reason: j['reason'] as String?,
        deadline: DateTime.tryParse(j['deadline']?.toString() ?? ''),
        isMine: myId != null && j['created_by'] == myId,
      );
}

/// Campanha de doação — `blood_donation_campaigns`.
class BloodCampaign {
  const BloodCampaign({
    required this.id,
    required this.title,
    required this.city,
    required this.startsAt,
    required this.endsAt,
    this.description,
    this.address,
    this.targetUnits,
    this.bloodTypesNeeded = const [],
  });

  final String id;
  final String title;
  final String city;
  final DateTime startsAt;
  final DateTime endsAt;
  final String? description;
  final String? address;
  final int? targetUnits;
  final List<String> bloodTypesNeeded;

  bool get isLive {
    final now = DateTime.now();
    return now.isAfter(startsAt) && now.isBefore(endsAt);
  }

  factory BloodCampaign.fromJson(Map<String, dynamic> j) => BloodCampaign(
        id: j['id'] as String,
        title: (j['title'] ?? 'Campanha') as String,
        city: (j['city'] ?? '—') as String,
        startsAt:
            DateTime.tryParse(j['starts_at']?.toString() ?? '') ??
                DateTime.now(),
        endsAt:
            DateTime.tryParse(j['ends_at']?.toString() ?? '') ??
                DateTime.now(),
        description: j['description'] as String?,
        address: j['address'] as String?,
        targetUnits: (j['target_units'] as num?)?.toInt(),
        bloodTypesNeeded: [
          for (final t in (j['blood_types_needed'] as List?) ?? const [])
            t.toString(),
        ],
      );
}

/// O meu voluntariado num pedido — `blood_donation_matches`.
class BloodMatch {
  const BloodMatch({
    required this.id,
    required this.requestId,
    required this.status,
    required this.createdAt,
    this.scheduledAt,
  });

  final String id;
  final String requestId;
  final String status; // offered | accepted | declined | completed | cancelled
  final DateTime createdAt;
  final DateTime? scheduledAt;

  String get statusLabel {
    switch (status) {
      case 'offered':
        return 'Disponibilizado';
      case 'accepted':
        return 'Aceite';
      case 'declined':
        return 'Recusado';
      case 'completed':
        return 'Doação concluída';
      case 'cancelled':
        return 'Cancelado';
    }
    return status;
  }

  factory BloodMatch.fromJson(Map<String, dynamic> j) => BloodMatch(
        id: j['id'] as String,
        requestId: j['request_id'] as String,
        status: (j['status'] ?? 'offered') as String,
        createdAt:
            DateTime.tryParse(j['created_at']?.toString() ?? '') ??
                DateTime.now(),
        scheduledAt: DateTime.tryParse(j['scheduled_at']?.toString() ?? ''),
      );
}

class BloodRepository {
  BloodRepository(this._client);

  final SupabaseClient _client;

  String? get _uid => _client.auth.currentUser?.id;

  /// O meu registo de dador (null se ainda não sou dador).
  Future<BloodDonor?> fetchMyDonor() async {
    final uid = _uid;
    if (uid == null) return null;
    try {
      final row = await _client
          .from('blood_donors')
          .select()
          .eq('user_id', uid)
          .maybeSingle();
      if (row == null) return null;
      return BloodDonor.fromJson((row as Map).cast<String, dynamic>());
    } catch (_) {
      return null;
    }
  }

  /// Cria ou actualiza o meu registo de dador (RLS: próprio user_id).
  Future<String?> upsertMyDonor({
    required String bloodType,
    String? fullName,
    String? phone,
    DateTime? birthDate,
    double? weightKg,
    String? neighborhood,
    String? healthNotes,
  }) async {
    final uid = _uid;
    if (uid == null) return 'Sessão expirada. Entra novamente.';
    try {
      await _client.from('blood_donors').upsert({
        'user_id': uid,
        'blood_type': bloodType,
        'full_name': fullName,
        'phone': phone,
        if (birthDate != null)
          'birth_date': birthDate.toIso8601String().substring(0, 10),
        if (weightKg != null) 'weight_kg': weightKg,
        if (neighborhood != null && neighborhood.isNotEmpty)
          'neighborhood': neighborhood,
        if (healthNotes != null && healthNotes.isNotEmpty)
          'health_notes': healthNotes,
        'is_available': true,
      }, onConflict: 'user_id');
      return null;
    } catch (_) {
      return 'Não foi possível guardar o registo. Tenta novamente.';
    }
  }

  /// Alterna disponibilidade do dador.
  Future<void> setAvailability(bool available) async {
    final uid = _uid;
    if (uid == null) return;
    try {
      await _client
          .from('blood_donors')
          .update({'is_available': available}).eq('user_id', uid);
    } catch (_) {}
  }

  /// Pedidos abertos, mais críticos primeiro (mesma leitura do web).
  Future<List<BloodRequest>> fetchOpenRequests() async {
    final uid = _uid;
    try {
      final rows = await _client
          .from('blood_requests')
          .select()
          .eq('status', 'open')
          .order('created_at', ascending: false)
          .limit(30);
      final list = [
        for (final r in (rows as List))
          BloodRequest.fromJson((r as Map).cast<String, dynamic>(),
              myId: uid),
      ];
      // Críticos e urgentes primeiro.
      list.sort((a, b) {
        int w(String u) => u == 'critical' ? 0 : (u == 'urgent' ? 1 : 2);
        return w(a.urgency).compareTo(w(b.urgency));
      });
      return list;
    } catch (_) {
      return const [];
    }
  }

  /// Cria um pedido de sangue (RLS: created_by = auth.uid()).
  Future<String?> createRequest({
    required String bloodType,
    required String city,
    required String hospitalName,
    required String contactPhone,
    String? patientName,
    int unitsNeeded = 1,
    String urgency = 'urgent',
    String? reason,
    DateTime? deadline,
    String? notes,
  }) async {
    final uid = _uid;
    if (uid == null) return 'Sessão expirada. Entra novamente.';
    try {
      await _client.from('blood_requests').insert({
        'created_by': uid,
        'blood_type': bloodType,
        'urgency': urgency,
        'units_needed': unitsNeeded,
        'hospital_name_manual': hospitalName,
        if (patientName != null && patientName.isNotEmpty)
          'patient_name': patientName,
        'contact_phone': contactPhone,
        'city': city,
        if (reason != null && reason.isNotEmpty) 'reason': reason,
        if (deadline != null) 'deadline': deadline.toUtc().toIso8601String(),
        if (notes != null && notes.isNotEmpty) 'notes': notes,
        'status': 'open',
      });
      return null;
    } catch (_) {
      return 'Não foi possível publicar o pedido. Verifica os dados.';
    }
  }

  /// Campanhas activas (janela temporal ainda válida).
  Future<List<BloodCampaign>> fetchCampaigns() async {
    try {
      final rows = await _client
          .from('blood_donation_campaigns')
          .select()
          .eq('is_active', true)
          .gte('ends_at', DateTime.now().toUtc().toIso8601String())
          .order('starts_at')
          .limit(15);
      return [
        for (final r in (rows as List))
          BloodCampaign.fromJson((r as Map).cast<String, dynamic>()),
      ];
    } catch (_) {
      return const [];
    }
  }

  /// Voluntario-me para um pedido (UNIQUE request+donor no backend).
  Future<String?> volunteer(String requestId) async {
    final uid = _uid;
    if (uid == null) return 'Sessão expirada. Entra novamente.';
    try {
      await _client.from('blood_donation_matches').insert({
        'request_id': requestId,
        'donor_user_id': uid,
        'status': 'offered',
      });
      return null;
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('duplicate') || msg.contains('unique')) {
        return 'Já disponibilizaste para este pedido. Obrigado!';
      }
      return 'Não foi possível registar a disponibilidade agora.';
    }
  }

  /// Os meus voluntariados (com estado real da doação).
  Future<List<BloodMatch>> fetchMyMatches() async {
    final uid = _uid;
    if (uid == null) return const [];
    try {
      final rows = await _client
          .from('blood_donation_matches')
          .select()
          .eq('donor_user_id', uid)
          .order('created_at', ascending: false)
          .limit(10);
      return [
        for (final r in (rows as List))
          BloodMatch.fromJson((r as Map).cast<String, dynamic>()),
      ];
    } catch (_) {
      return const [];
    }
  }
}

final bloodRepositoryProvider = Provider<BloodRepository>((ref) {
  return BloodRepository(Supabase.instance.client);
});
