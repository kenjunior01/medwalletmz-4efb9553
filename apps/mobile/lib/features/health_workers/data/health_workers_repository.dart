import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/utils/formatters.dart';

/// Agentes de Saúde — marketplace de profissionais de saúde
/// (paridade com `HealthWorkerMarketplace.tsx` da web).
///
/// Tabelas `health_worker_profiles` + `health_worker_bookings`
/// (migração jobs_module 20260828000000):
///   • PERFIS: leitura pública de verificados (`is_verified = true`);
///   • RESERVAS: cliente insere a própria reserva (RLS) com fee /
///     worker_earnings (80%) / platform_fee (20%) — mesma fórmula da
///     web — e paga pela CARTEIRA via RPC `wallet_debit` (transacional,
///     deixa rastro em wallet_transactions), depois marca
///     `payment_status = 'paid'` (RLS UPDATE própria do cliente).
/// Zero alterações de backend.
class HealthWorker {
  const HealthWorker({
    required this.id,
    required this.fullName,
    required this.profession,
    this.photoUrl,
    this.bio,
    this.specialization,
    this.yearsOfExperience,
    this.isAvailable = true,
    this.homeVisitsEnabled = false,
    this.telehealthEnabled = true,
    this.consultationFee,
    this.homeVisitFee,
    this.telehealthFee,
    this.languages = const [],
    this.conditionsTreated = const [],
    this.rating = 5.0,
    this.totalBookings = 0,
    this.responseTimeAvgMin,
    this.countryCode = 'MZ',
  });

  final String id;
  final String fullName;
  final String profession;
  final String? photoUrl;
  final String? bio;
  final String? specialization;
  final int? yearsOfExperience;
  final bool isAvailable;
  final bool homeVisitsEnabled;
  final bool telehealthEnabled;
  final double? consultationFee;
  final double? homeVisitFee;
  final double? telehealthFee;
  final List<String> languages;
  final List<String> conditionsTreated;
  final double rating;
  final int totalBookings;
  final int? responseTimeAvgMin;
  final String countryCode;

  String get professionLabel => professionLabels[profession] ?? profession;
  String get initials {
    final parts = fullName.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }

  /// Fee cobrado por tipo de serviço (fallback: tabela da web).
  double? feeFor(String serviceType) {
    switch (serviceType) {
      case 'telehealth':
        return telehealthFee;
      case 'home_visit':
      case 'caregiver_session':
        return homeVisitFee;
      case 'translation':
        return consultationFee;
      default:
        return consultationFee;
    }
  }

  static const professionLabels = <String, String>{
    'doctor': 'Médico/a',
    'nurse': 'Enfermeiro/a',
    'midwife': 'Parteira',
    'ape': 'Agente Polivalente (APE)',
    'pharmacist': 'Farmacêutico/a',
    'lab_tech': 'Técnico de Laboratório',
    'caregiver': 'Cuidador/a',
    'translator': 'Tradutor/a',
    'traditional_healer': 'Curandeiro/a tradicional',
    'community_health_worker': 'Agente Comunitário',
  };

  static HealthWorker fromMap(Map<String, dynamic> m) => HealthWorker(
        id: m['id'] as String,
        fullName: (m['full_name'] ?? '') as String,
        profession: (m['profession'] ?? 'nurse') as String,
        photoUrl: m['profile_photo_url'] as String?,
        bio: m['bio'] as String?,
        specialization: m['specialization'] as String?,
        yearsOfExperience: m['years_of_experience'] as int?,
        isAvailable: (m['is_available'] as bool?) ?? true,
        homeVisitsEnabled: (m['home_visits_enabled'] as bool?) ?? false,
        telehealthEnabled: (m['telehealth_enabled'] as bool?) ?? true,
        consultationFee: (m['consultation_fee'] as num?)?.toDouble(),
        homeVisitFee: (m['home_visit_fee'] as num?)?.toDouble(),
        telehealthFee: (m['telehealth_fee'] as num?)?.toDouble(),
        languages:
            ((m['languages'] as List<dynamic>?) ?? const []).map((e) => e as String).toList(),
        conditionsTreated: ((m['conditions_treated'] as List<dynamic>?) ?? const [])
            .map((e) => e as String)
            .toList(),
        rating: (m['rating'] as num?)?.toDouble() ?? 5.0,
        totalBookings: (m['total_bookings'] as int?) ?? 0,
        responseTimeAvgMin: m['response_time_avg_min'] as int?,
        countryCode: (m['country_code'] ?? 'MZ') as String,
      );
}

class WorkerBooking {
  const WorkerBooking({
    required this.id,
    required this.workerId,
    required this.serviceType,
    required this.scheduledAt,
    required this.durationMinutes,
    required this.fee,
    required this.status,
    required this.paymentStatus,
    this.workerName,
    this.reason,
    this.address,
    this.rating,
  });

  final String id;
  final String workerId;
  final String serviceType;
  final DateTime scheduledAt;
  final int durationMinutes;
  final double fee;
  final String status; // requested|confirmed|in_progress|completed|…
  final String paymentStatus; // pending|paid|refunded|failed
  final String? workerName;
  final String? reason;
  final String? address;
  final int? rating;

  String get statusLabel {
    switch (status) {
      case 'requested':
        return 'Pedida';
      case 'confirmed':
        return 'Confirmada';
      case 'in_progress':
        return 'Em curso';
      case 'completed':
        return 'Concluída';
      case 'cancelled':
        return 'Cancelada';
      case 'no_show':
        return 'Faltou';
      default:
        return status;
    }
  }

  String get serviceLabel => serviceTypeLabel(serviceType);

  bool get isCancellable =>
      (status == 'requested' || status == 'confirmed') &&
      scheduledAt.isAfter(DateTime.now());

  static WorkerBooking fromMap(Map<String, dynamic> m) => WorkerBooking(
        id: m['id'] as String,
        workerId: m['worker_id'] as String,
        serviceType: (m['service_type'] ?? 'telehealth') as String,
        scheduledAt: DateTime.parse(m['scheduled_at'] as String).toLocal(),
        durationMinutes: (m['duration_minutes'] as int?) ?? 30,
        fee: (m['fee'] as num?)?.toDouble() ?? 0,
        status: (m['status'] ?? 'requested') as String,
        paymentStatus: (m['payment_status'] ?? 'pending') as String,
        workerName: m['worker_name'] is Map<String, dynamic>
            ? (m['worker_name']['full_name'] as String?)
            : null,
        reason: m['reason'] as String?,
        address: m['address'] as String?,
        rating: m['rating'] as int?,
      );
}

/// Rótulo de tipo de serviço (usado no modelo e no pagamento).
String serviceTypeLabel(String serviceType) {
  switch (serviceType) {
    case 'telehealth':
      return 'Telessaúde';
    case 'home_visit':
      return 'Visita domiciliária';
    case 'clinic_consultation':
      return 'Consulta na clínica';
    case 'translation':
      return 'Tradução';
    case 'caregiver_session':
      return 'Cuidado ao domicílio';
    default:
      return serviceType;
  }
}

/// Fees base por profissão (espelho de DEFAULT_FEES_BY_PROFESSION da
/// web) — usadas quando o perfil não tem preços preenchidos.
const Map<String, Map<String, double>> kDefaultFees = {
  'doctor': {'consultation': 1500, 'home_visit': 3000, 'telehealth': 1000},
  'nurse': {'consultation': 600, 'home_visit': 1200, 'telehealth': 400},
  'midwife': {'consultation': 800, 'home_visit': 1800, 'telehealth': 500},
  'ape': {'consultation': 300, 'home_visit': 500, 'telehealth': 200},
  'pharmacist': {'consultation': 400, 'home_visit': 800, 'telehealth': 300},
  'lab_tech': {'consultation': 500, 'home_visit': 1000, 'telehealth': 0},
  'caregiver': {'consultation': 400, 'home_visit': 800, 'telehealth': 0},
  'translator': {'consultation': 600, 'home_visit': 1200, 'telehealth': 500},
  'traditional_healer':
      {'consultation': 500, 'home_visit': 1000, 'telehealth': 300},
  'community_health_worker':
      {'consultation': 200, 'home_visit': 400, 'telehealth': 100},
};

double? effectiveFee(HealthWorker w, String serviceType) {
  final v = w.feeFor(serviceType);
  if (v != null && v > 0) return v;
  final defaults = kDefaultFees[w.profession];
  if (defaults == null) return null;
  switch (serviceType) {
    case 'telehealth':
      return defaults['telehealth'];
    case 'home_visit':
    case 'caregiver_session':
      return defaults['home_visit'];
    default:
      return defaults['consultation'];
  }
}

class HealthWorkersRepository {
  HealthWorkersRepository(this._sb);
  final SupabaseClient _sb;

  String? get _uid => _sb.auth.currentUser?.id;

  /// Profissionais verificados (RLS pública), do melhor avaliado.
  Future<List<HealthWorker>> fetchWorkers({String? profession}) async {
    var query = _sb
        .from('health_worker_profiles')
        .select()
        .eq('is_verified', true);
    if (profession != null && profession.isNotEmpty) {
      query = query.eq('profession', profession);
    }
    final rows = await query.order('rating', ascending: false).limit(50);
    return (rows as List)
        .map((m) => HealthWorker.fromMap(m as Map<String, dynamic>))
        .where((w) => w.fullName.isNotEmpty)
        .toList();
  }

  Future<List<WorkerBooking>> fetchMyBookings() async {
    final rows = await _sb
        .from('health_worker_bookings')
        .select('*, worker_name:health_worker_profiles(full_name)')
        .eq('customer_user_id', _uid!)
        .order('scheduled_at', ascending: false)
        .limit(25);
    return (rows as List)
        .map((m) => WorkerBooking.fromMap(m as Map<String, dynamic>))
        .toList();
  }

  /// Reservar + pagar da carteira (mesma sequência da web/labs):
  ///   1. INSERT da reserva (status requested, payment pending);
  ///   2. RPC wallet_debit (transaccional — falha se saldo insuficiente
  ///      e devolve erro, nada fica pago a meio);
  ///   3. UPDATE payment_status='paid' (RLS do cliente).
  Future<WorkerBooking> book({
    required HealthWorker worker,
    required String serviceType,
    required DateTime scheduledAt,
    int durationMinutes = 30,
    String? reason,
    String? address,
  }) async {
    final uid = _uid;
    if (uid == null) throw const AuthException('Sessão necessária');

    final fee = effectiveFee(worker, serviceType) ?? 0;
    if (fee <= 0) throw StateError('Serviço sem preço definido');
    final workerEarnings = (fee * 0.8 * 100).round() / 100;
    final platformFee = (fee - workerEarnings).toStringAsFixed(2);

    final row = await _sb
        .from('health_worker_bookings')
        .insert({
          'worker_id': worker.id,
          'customer_user_id': uid,
          'country_code': worker.countryCode,
          'service_type': serviceType,
          'scheduled_at': scheduledAt.toUtc().toIso8601String(),
          'duration_minutes': durationMinutes,
          if (address != null && address.isNotEmpty) 'address': address,
          if (reason != null && reason.isNotEmpty) 'reason': reason,
          'fee': fee,
          'worker_earnings': workerEarnings,
          'platform_fee': double.parse(platformFee),
          'currency': 'MZN',
          'payment_status': 'pending',
          'status': 'requested',
        })
        .select()
        .single();

    final bookingId = row['id'] as String;
    try {
      await _sb.rpc('wallet_debit', params: {
        '_user_id': uid,
        '_amount': fee,
        '_service_type': 'worker_booking',
        '_ref_id': bookingId,
        '_description':
            'Reserva ${worker.fullName} · ${serviceTypeLabel(serviceType)}',
      });
      final paid = await _sb
          .from('health_worker_bookings')
          .update({'payment_status': 'paid'})
          .eq('id', bookingId)
          .select()
          .single();
      return WorkerBooking.fromMap(paid);
    } catch (e) {
      // Sem saldo ou falha de pagamento → cancela a reserva para não
      // deixar pedidos "fantasma" pendentes.
      try {
        await _sb
            .from('health_worker_bookings')
            .update({'status': 'cancelled'})
            .eq('id', bookingId);
      } catch (_) {}
      rethrow;
    }
  }

  Future<void> cancel(String bookingId) async {
    await _sb
        .from('health_worker_bookings')
        .update({'status': 'cancelled'})
        .eq('id', bookingId);
  }

  /// Avalia a reserva concluída (1-5 estrelas + comentário).
  Future<void> rate(String bookingId,
      {required int rating, String? comment}) async {
    await _sb.from('health_worker_bookings').update({
      'rating': rating,
      if (comment != null && comment.isNotEmpty) 'rating_comment': comment,
      'rated_at': DateTime.now().toUtc().toIso8601String(),
    }).eq('id', bookingId);
  }
}

final healthWorkersRepositoryProvider = Provider<HealthWorkersRepository>(
    (ref) => HealthWorkersRepository(Supabase.instance.client));

/// Helper p/ apresentação da taxa nas cartas.
String feeLabel(double? fee) =>
    fee == null || fee <= 0 ? '—' : formatMZN(fee);
