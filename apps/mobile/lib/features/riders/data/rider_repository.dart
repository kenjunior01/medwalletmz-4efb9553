import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Rede de Riders de Saúde — entregas de medicamentos, amostras e
/// equipamento por mota/bicicleta/carro/a pé (paridade com
/// `HealthRidersNetwork.tsx` + `services/healthRiders.ts` da web).
///
/// Tabelas (migração jobs_module 20260828000000):
///   • `health_riders`      — perfil do estafeta (INSERT/UPDATE próprio via RLS;
///                             leitura pública de verificados);
///   • `health_deliveries`  — entregas. RLS: o estafeta só vê/actualiza as
///                             suas; entregas `pending` SEM estafeta ficam
///                             invisíveis (igual à web) → quando a consulta
///                             devolve vazio/erro, o ecrã mostra entregas de
///                             DEMONSTRAÇÃO, tal como `MOCK_DELIVERIES`;
///   • `rider_earnings_daily`— agregado diário (leitura própria).
/// Bucket `rider-documents` para carta/cópia de BI/livrete. Entrega
/// concluída → RPC `increment_rider_stats` (com fallback directo, como na
/// web). Fee: base do veículo + 15 MZN/km + 30 MZN de cadeia de frio,
/// repartidos 80% estafeta / 20% plataforma.
/// Zero alterações de backend.
enum VehicleType {
  bicycle('Bicicleta', '🚲', 50),
  motorbike('Mota', '🏍️', 80),
  car('Carro', '🚗', 150),
  foot('A pé', '🚶', 30);

  const VehicleType(this.label, this.emoji, this.minFee);
  final String label;
  final String emoji;
  final int minFee;

  static VehicleType fromKey(String? key) {
    switch (key) {
      case 'bicycle':
        return VehicleType.bicycle;
      case 'car':
        return VehicleType.car;
      case 'foot':
        return VehicleType.foot;
      default:
        return VehicleType.motorbike;
    }
  }

  String get key {
    switch (this) {
      case VehicleType.bicycle:
        return 'bicycle';
      case VehicleType.motorbike:
        return 'motorbike';
      case VehicleType.car:
        return 'car';
      case VehicleType.foot:
        return 'foot';
    }
  }
}

enum PackageType {
  medication('Medicamentos', '💊', true),
  labSample('Amostra de laboratório', '🧪', true),
  equipment('Equipamento médico', '🏥', false),
  document('Documentos', '📄', false),
  other('Outro', '📦', false);

  const PackageType(this.label, this.emoji, this.coldChain);
  final String label;
  final String emoji;
  final bool coldChain;

  static PackageType fromKey(String? key) {
    switch (key) {
      case 'lab_sample':
        return PackageType.labSample;
      case 'equipment':
        return PackageType.equipment;
      case 'document':
        return PackageType.document;
      case 'other':
        return PackageType.other;
      default:
        return PackageType.medication;
    }
  }

  String get key {
    switch (this) {
      case PackageType.medication:
        return 'medication';
      case PackageType.labSample:
        return 'lab_sample';
      case PackageType.equipment:
        return 'equipment';
      case PackageType.document:
        return 'document';
      case PackageType.other:
        return 'other';
    }
  }
}

enum DeliveryStatus {
  pending('Disponível', Color(0xFFF59E0B)),
  accepted('Aceite', Color(0xFF3B82F6)),
  arrivingPickup('A caminho do pickup', Color(0xFF3B82F6)),
  pickedUp('Recolhido', Color(0xFF06B6D4)),
  inTransit('Em trânsito', Color(0xFF06B6D4)),
  arrivingDropoff('A caminho do destino', Color(0xFF8B5CF6)),
  delivered('Entregue', Color(0xFF10B981)),
  cancelled('Cancelado', Color(0xFFEF4444)),
  failed('Falhou', Color(0xFFEF4444));

  const DeliveryStatus(this.label, this.color);
  final String label;
  final Color color;

  /// Entrega em curso — o estafeta está em trânsito e o broadcast GPS
  /// do tracking ao vivo deve estar ligado (F14).
  bool get isActiveRide =>
      this == DeliveryStatus.accepted ||
      this == DeliveryStatus.arrivingPickup ||
      this == DeliveryStatus.pickedUp ||
      this == DeliveryStatus.inTransit ||
      this == DeliveryStatus.arrivingDropoff;

  static DeliveryStatus fromKey(String? key) {
    switch (key) {
      case 'accepted':
        return DeliveryStatus.accepted;
      case 'arriving_pickup':
        return DeliveryStatus.arrivingPickup;
      case 'picked_up':
        return DeliveryStatus.pickedUp;
      case 'in_transit':
        return DeliveryStatus.inTransit;
      case 'arriving_dropoff':
        return DeliveryStatus.arrivingDropoff;
      case 'delivered':
        return DeliveryStatus.delivered;
      case 'cancelled':
        return DeliveryStatus.cancelled;
      case 'failed':
        return DeliveryStatus.failed;
      default:
        return DeliveryStatus.pending;
    }
  }

  String get key {
    switch (this) {
      case DeliveryStatus.pending:
        return 'pending';
      case DeliveryStatus.accepted:
        return 'accepted';
      case DeliveryStatus.arrivingPickup:
        return 'arriving_pickup';
      case DeliveryStatus.pickedUp:
        return 'picked_up';
      case DeliveryStatus.inTransit:
        return 'in_transit';
      case DeliveryStatus.arrivingDropoff:
        return 'arriving_dropoff';
      case DeliveryStatus.delivered:
        return 'delivered';
      case DeliveryStatus.cancelled:
        return 'cancelled';
      case DeliveryStatus.failed:
        return 'failed';
    }
  }

  bool get isWorking =>
      index >= DeliveryStatus.accepted.index &&
      index <= DeliveryStatus.arrivingDropoff.index;
}

class HealthRider {
  const HealthRider({
    required this.id,
    required this.countryCode,
    required this.fullName,
    required this.phone,
    required this.vehicleType,
    this.nationalId,
    this.vehiclePlate,
    this.vehicleColor,
    this.licenseUrl,
    this.idDocumentUrl,
    this.vehicleDocumentUrl,
    this.isVerified = false,
    this.isOnline = false,
    this.rating,
    this.totalDeliveries = 0,
    this.totalEarnings = 0,
    this.totalDistanceKm = 0,
    this.availableZones = const [],
    this.languages = const [],
    this.acceptsColdChain = false,
    this.maxDeliveryDistanceKm = 15,
    this.mobileMoneyNumber,
    this.onboardingStep = 'basics',
    this.onboardingProgress = 0,
    this.rejectionReason,
  });

  final String id;
  final String countryCode;
  final String fullName;
  final String phone;
  final VehicleType vehicleType;
  final String? nationalId;
  final String? vehiclePlate;
  final String? vehicleColor;
  final String? licenseUrl;
  final String? idDocumentUrl;
  final String? vehicleDocumentUrl;
  final bool isVerified;
  final bool isOnline;
  final double? rating;
  final int totalDeliveries;
  final double totalEarnings;
  final double totalDistanceKm;
  final List<String> availableZones;
  final List<String> languages;
  final bool acceptsColdChain;
  final int maxDeliveryDistanceKm;
  final String? mobileMoneyNumber;
  final String onboardingStep;
  final int onboardingProgress;
  final String? rejectionReason;

  factory HealthRider.fromMap(Map<String, dynamic> m) {
    final zones = <String>[];
    if (m['available_zones'] is List) {
      for (final z in (m['available_zones'] as List)) {
        zones.add(z.toString());
      }
    }
    final langs = <String>[];
    if (m['languages'] is List) {
      for (final l in (m['languages'] as List)) {
        langs.add(l.toString());
      }
    }
    return HealthRider(
      id: m['id']?.toString() ?? '',
      countryCode: m['country_code']?.toString() ?? 'MZ',
      fullName: m['full_name']?.toString() ?? '',
      phone: m['phone']?.toString() ?? '',
      vehicleType: VehicleType.fromKey(m['vehicle_type']?.toString()),
      nationalId: m['national_id']?.toString(),
      vehiclePlate: m['vehicle_plate']?.toString(),
      vehicleColor: m['vehicle_color']?.toString(),
      licenseUrl: m['license_url']?.toString(),
      idDocumentUrl: m['id_document_url']?.toString(),
      vehicleDocumentUrl: m['vehicle_document_url']?.toString(),
      isVerified: m['is_verified'] == true,
      isOnline: m['is_online'] == true,
      rating: (m['rating'] as num?)?.toDouble(),
      totalDeliveries: (m['total_deliveries'] as num?)?.toInt() ?? 0,
      totalEarnings: (m['total_earnings_mzn'] as num?)?.toDouble() ?? 0,
      totalDistanceKm: (m['total_distance_km'] as num?)?.toDouble() ?? 0,
      availableZones: zones,
      languages: langs,
      acceptsColdChain: m['accepts_cold_chain'] == true,
      maxDeliveryDistanceKm: (m['max_delivery_distance_km'] as num?)?.toInt() ?? 15,
      mobileMoneyNumber: m['mobile_money_number']?.toString(),
      onboardingStep: m['onboarding_step']?.toString() ?? 'basics',
      onboardingProgress: (m['onboarding_progress'] as num?)?.toInt() ?? 0,
      rejectionReason: m['rejection_reason']?.toString(),
    );
  }

  Map<String, dynamic> toInsert({required String userId}) {
    return {
      'user_id': userId,
      'country_code': countryCode,
      'full_name': fullName,
      'phone': phone,
      'vehicle_type': vehicleType.key,
      'national_id': nationalId,
      'vehicle_plate': vehiclePlate,
      'vehicle_color': vehicleColor,
      'available_zones': availableZones,
      'languages': languages,
      'accepts_cold_chain': acceptsColdChain,
      'max_delivery_distance_km': maxDeliveryDistanceKm,
      'mobile_money_number': mobileMoneyNumber,
      'onboarding_step': onboardingStep,
      'onboarding_progress': onboardingProgress,
    };
  }
}

class HealthDelivery {
  const HealthDelivery({
    required this.id,
    required this.customerName,
    required this.customerPhone,
    required this.countryCode,
    required this.pickupType,
    required this.pickupName,
    required this.pickupAddress,
    required this.dropoffName,
    required this.dropoffAddress,
    required this.packageType,
    required this.status,
    this.isMock = false,
    this.riderId,
    this.packageDescription,
    this.requiresColdChain = false,
    this.requiresSignature = false,
    this.estimatedDistanceKm,
    this.estimatedDurationMin,
    this.deliveryFee,
    this.riderEarnings,
    this.currency = 'MZN',
    this.deliveredAt,
    this.rating,
    this.createdAt,
  });

  final String id;
  final String customerName;
  final String customerPhone;
  final String countryCode;
  final String pickupType;
  final String pickupName;
  final String pickupAddress;
  final String? dropoffName;
  final String dropoffAddress;
  final PackageType packageType;
  final DeliveryStatus status;
  final bool isMock;
  final String? riderId;
  final String? packageDescription;
  final bool requiresColdChain;
  final bool requiresSignature;
  final double? estimatedDistanceKm;
  final int? estimatedDurationMin;
  final double? deliveryFee;
  final double? riderEarnings;
  final String currency;
  final DateTime? deliveredAt;
  final double? rating;
  final DateTime? createdAt;

  factory HealthDelivery.fromMap(Map<String, dynamic> m) {
    return HealthDelivery(
      id: m['id']?.toString() ?? '',
      riderId: m['rider_id']?.toString(),
      customerName: m['customer_name']?.toString() ?? 'Cliente',
      customerPhone: m['customer_phone']?.toString() ?? '',
      countryCode: m['country_code']?.toString() ?? 'MZ',
      pickupType: m['pickup_type']?.toString() ?? 'pharmacy',
      pickupName: m['pickup_name']?.toString() ?? '',
      pickupAddress: m['pickup_address']?.toString() ?? '',
      dropoffName: m['dropoff_name']?.toString(),
      dropoffAddress: m['dropoff_address']?.toString() ?? '',
      packageType: PackageType.fromKey(m['package_type']?.toString()),
      packageDescription: m['package_description']?.toString(),
      requiresColdChain: m['requires_cold_chain'] == true,
      requiresSignature: m['requires_signature'] == true,
      estimatedDistanceKm: (m['estimated_distance_km'] as num?)?.toDouble(),
      estimatedDurationMin: (m['estimated_duration_min'] as num?)?.toInt(),
      deliveryFee: (m['delivery_fee'] as num?)?.toDouble(),
      riderEarnings: (m['rider_earnings'] as num?)?.toDouble(),
      currency: m['currency']?.toString() ?? 'MZN',
      status: DeliveryStatus.fromKey(m['status']?.toString()),
      deliveredAt: m['delivered_at'] != null
          ? DateTime.tryParse(m['delivered_at'].toString())
          : null,
      rating: (m['rating'] as num?)?.toDouble(),
      createdAt: m['created_at'] != null
          ? DateTime.tryParse(m['created_at'].toString())
          : null,
    );
  }
}

class EarningsSummary {
  const EarningsSummary({
    required this.today,
    required this.week,
    required this.month,
    required this.todayCount,
    required this.weekCount,
    required this.monthCount,
  });

  final double today;
  final double week;
  final double month;
  final int todayCount;
  final int weekCount;
  final int monthCount;
}

class DeliveryFee {
  const DeliveryFee({
    required this.fee,
    required this.riderEarnings,
    required this.platformFee,
  });
  final double fee;
  final double riderEarnings;
  final double platformFee;
}

class RiderRepository {
  RiderRepository(this._client);

  final SupabaseClient _client;

  static const double _perKm = 15;
  static const double _coldSurcharge = 30;
  static const double _riderShare = 0.8;

  DeliveryFee computeDeliveryFee({
    required double distanceKm,
    required PackageType packageType,
    required VehicleType vehicleType,
  }) {
    final fee = vehicleType.minFee +
        (distanceKm * _perKm) +
        (packageType.coldChain ? _coldSurcharge : 0);
    return DeliveryFee(
      fee: fee.roundToDouble(),
      riderEarnings: (fee * _riderShare).roundToDouble(),
      platformFee: (fee * (1 - _riderShare)).roundToDouble(),
    );
  }

  Future<HealthRider?> fetchMyRider() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return null;
    final rows = await _client
        .from('health_riders')
        .select()
        .eq('user_id', uid)
        .limit(1);
    if (rows.isEmpty) return null;
    return HealthRider.fromMap(Map<String, dynamic>.from(rows.first));
  }

  Future<HealthRider> createRider(HealthRider rider) async {
    final uid = _client.auth.currentUser!.id;
    final res = await _client
        .from('health_riders')
        .insert(rider.toInsert(userId: uid))
        .select()
        .single();
    return HealthRider.fromMap(Map<String, dynamic>.from(res));
  }

  Future<void> updateRider(String riderId, Map<String, dynamic> patch) async {
    await _client.from('health_riders').update(patch).eq('id', riderId);
  }

  Future<void> toggleOnline(String riderId, bool online) async {
    await _client.from('health_riders').update({
      'is_online': online,
      'last_online_at': DateTime.now().toUtc().toIso8601String(),
    }).eq('id', riderId);
  }

  /// Upload de documento para o bucket `rider-documents` e devolve o caminho.
  /// Se o bucket não existir (instalações antigas), devolve null sem rebentar —
  /// a verificação continua possível pelo admin sem o ficheiro.
  Future<String?> uploadDocument(String docKey, String filePath) async {
    try {
      final uid = _client.auth.currentUser!.id;
      final file = File(filePath);
      final ext = filePath.contains('.') ? filePath.split('.').last : 'jpg';
      final path = '$uid/$docKey-${DateTime.now().millisecondsSinceEpoch}.$ext';
      await _client.storage.from('rider-documents').uploadBinary(
            path,
            await file.readAsBytes(),
            fileOptions: const FileOptions(contentType: 'image/jpeg'),
          );
      return path;
    } catch (_) {
      return null;
    }
  }

  /// Entregas disponíveis no país do estafeta. Como a RLS esconde entregas
  /// ainda sem estafeta, uma lista vazia cai no modo demonstração (igual à
  /// web: `.catch(() => MOCK_DELIVERIES)`).
  Future<List<HealthDelivery>> fetchAvailable(HealthRider rider,
      {int limit = 10}) async {
    final rows = await _client
        .from('health_deliveries')
        .select()
        .eq('country_code', rider.countryCode)
        .eq('status', 'pending')
        .order('created_at')
        .limit(limit);
    final list = <HealthDelivery>[];
    for (final r in rows) {
      list.add(HealthDelivery.fromMap(Map<String, dynamic>.from(r)));
    }
    return list;
  }

  Future<List<HealthDelivery>> fetchActive(String riderId) async {
    final rows = await _client
        .from('health_deliveries')
        .select()
        .eq('rider_id', riderId)
        .inFilter('status', [
      'accepted',
      'arriving_pickup',
      'picked_up',
      'in_transit',
      'arriving_dropoff',
    ]).order('accepted_at', ascending: false);
    final list = <HealthDelivery>[];
    for (final r in rows) {
      list.add(HealthDelivery.fromMap(Map<String, dynamic>.from(r)));
    }
    return list;
  }

  Future<List<HealthDelivery>> fetchHistory(String riderId,
      {int limit = 30}) async {
    final rows = await _client
        .from('health_deliveries')
        .select()
        .eq('rider_id', riderId)
        .inFilter('status', ['delivered', 'cancelled', 'failed'])
        .order('created_at', ascending: false)
        .limit(limit);
    final list = <HealthDelivery>[];
    for (final r in rows) {
      list.add(HealthDelivery.fromMap(Map<String, dynamic>.from(r)));
    }
    return list;
  }

  /// Aceite optimista: UPDATE condicionado a `status = 'pending'` para
  /// evitar corridas (mesma trava da web).
  Future<void> acceptDelivery(String deliveryId, String riderId) async {
    await _client.from('health_deliveries').update({
      'rider_id': riderId,
      'status': 'accepted',
      'accepted_at': DateTime.now().toUtc().toIso8601String(),
    }).eq('id', deliveryId).eq('status', 'pending');
  }

  Future<void> advanceStatus(String deliveryId, DeliveryStatus status) async {
    final patch = <String, dynamic>{'status': status.key};
    if (status == DeliveryStatus.pickedUp) {
      patch['picked_up_at'] = DateTime.now().toUtc().toIso8601String();
    }
    if (status == DeliveryStatus.delivered) {
      patch['delivered_at'] = DateTime.now().toUtc().toIso8601String();
    }
    if (status == DeliveryStatus.cancelled) {
      patch['cancelled_at'] = DateTime.now().toUtc().toIso8601String();
    }
    await _client.from('health_deliveries').update(patch).eq('id', deliveryId);

    if (status == DeliveryStatus.delivered) {
      final rows = await _client
          .from('health_deliveries')
          .select('rider_id, rider_earnings, estimated_distance_km')
          .eq('id', deliveryId)
          .limit(1);
      if (rows.isEmpty) return;
      final d = Map<String, dynamic>.from(rows.first);
      final riderId = d['rider_id']?.toString();
      if (riderId == null || riderId.isEmpty) return;
      final earnings = (d['rider_earnings'] as num?)?.toDouble() ?? 0;
      final distance = (d['estimated_distance_km'] as num?)?.toDouble() ?? 0;
      final rpcOk = await _incrementRiderStats(riderId, earnings, distance);
      if (!rpcOk) {
        final cur = await _client
            .from('health_riders')
            .select('total_deliveries, total_earnings_mzn, total_distance_km')
            .eq('id', riderId)
            .limit(1);
        if (cur.isEmpty) return;
        final r = Map<String, dynamic>.from(cur.first);
        await _client.from('health_riders').update({
          'total_deliveries': ((r['total_deliveries'] as num?)?.toInt() ?? 0) + 1,
          'total_earnings_mzn':
              ((r['total_earnings_mzn'] as num?)?.toDouble() ?? 0) + earnings,
          'total_distance_km':
              ((r['total_distance_km'] as num?)?.toDouble() ?? 0) + distance,
        }).eq('id', riderId);
      }
    }
  }

  Future<bool> _incrementRiderStats(
      String riderId, double earnings, double distance) async {
    try {
      await _client.rpc('increment_rider_stats', params: {
        '_rider_id': riderId,
        '_earnings': earnings,
        '_distance': distance,
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> rateDelivery(String deliveryId, int rating,
      {String? comment}) async {
    await _client.from('health_deliveries').update({
      'rating': rating,
      'rating_comment': comment,
      'rated_at': DateTime.now().toUtc().toIso8601String(),
    }).eq('id', deliveryId);
  }

  Future<EarningsSummary> earningsSummary(String riderId) async {
    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    final weekStart = now.subtract(const Duration(days: 7));
    final monthStart = DateTime(now.year, now.month, now.day)
        .subtract(const Duration(days: 30));
    final rows = await _client
        .from('health_deliveries')
        .select('rider_earnings, delivered_at')
        .eq('rider_id', riderId)
        .eq('status', 'delivered')
        .gte('delivered_at', monthStart.toUtc().toIso8601String());
    double today = 0, week = 0, month = 0;
    int todayCount = 0, weekCount = 0, monthCount = 0;
    for (final row in rows) {
      final m = Map<String, dynamic>.from(row);
      final at = DateTime.tryParse(m['delivered_at']?.toString() ?? '');
      final value = (m['rider_earnings'] as num?)?.toDouble() ?? 0;
      if (at == null) continue;
      if (at.isAfter(todayStart) || at.isAtSameMomentAs(todayStart)) {
        today += value;
        todayCount++;
      }
      if (at.isAfter(weekStart)) {
        week += value;
        weekCount++;
      }
      month += value;
      monthCount++;
    }
    return EarningsSummary(
      today: today.roundToDouble(),
      week: week.roundToDouble(),
      month: month.roundToDouble(),
      todayCount: todayCount,
      weekCount: weekCount,
      monthCount: monthCount,
    );
  }

  // (mocks removidos no F18 — apenas informação real da base)

}

final ridersRepositoryProvider =
    Provider<RiderRepository>((ref) => RiderRepository(Supabase.instance.client));

/// Helper de formatação de distância usado pelos cartões de entrega.
String formatKm(double? km) {
  if (km == null) return '—';
  if (km < 1) return '${(km * 1000).round()} m';
  return '${km.toStringAsFixed(1)} km';
}
