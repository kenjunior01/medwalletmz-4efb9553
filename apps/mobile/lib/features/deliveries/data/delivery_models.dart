/// Modelos do módulo ENTREGAS DO PACIENTE (F14) — tabela
/// `health_deliveries` (migration 20260828000000_jobs_module.sql).
///
/// O paciente é o `customer_user_id`: as policies RLS já permitem
///   • INSERT da própria entrega ("Customers can create deliveries");
///   • SELECT das próprias entregas (tracking em tempo real);
///   • UPDATE apenas enquanto `status = 'pending'` (cancelamento).
/// O estafeta faz o resto (aceitar, avançar estado) pela feature riders.
/// Zero alterações de backend.
import 'dart:math' as math;

/// Ponto geográfico simples (jsonb {lat, lng}) com distância
/// haversine — usada para estimar a distância e a taxa.
class LatLngPoint {
  const LatLngPoint({required this.lat, required this.lng});

  factory LatLngPoint.fromMap(dynamic map) => LatLngPoint(
        lat: (map is Map ? (map['lat'] as num?)?.toDouble() : null) ?? 0,
        lng: (map is Map ? (map['lng'] as num?)?.toDouble() : null) ?? 0,
      );

  final double lat;
  final double lng;

  Map<String, dynamic> toMap() => {'lat': lat, 'lng': lng};

  /// Distância haversine em km (raio terrestre 6371 km).
  double distanceToKm(LatLngPoint other) {
    const r = 6371.0;
    final dLat = _rad(other.lat - lat);
    final dLng = _rad(other.lng - lng);
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_rad(lat)) *
            math.cos(_rad(other.lat)) *
            math.sin(dLng / 2) *
            math.sin(dLng / 2);
    return 2 * r * math.asin(math.sqrt(a));
  }

  static double _rad(double deg) => deg * math.pi / 180;
}

/// Tipo de origem da recolha (CHECK da tabela).
enum PickupKind {
  pharmacy('Farmácia', '💊'),
  lab('Laboratório', '🧪'),
  clinic('Clínica', '🏥'),
  warehouse('Armazém', '🏬'),
  home('Domicílio', '🏠');

  const PickupKind(this.label, this.emoji);
  final String label;
  final String emoji;

  String get key {
    switch (this) {
      case PickupKind.lab:
        return 'lab';
      case PickupKind.clinic:
        return 'clinic';
      case PickupKind.warehouse:
        return 'warehouse';
      case PickupKind.home:
        return 'home';
      case PickupKind.pharmacy:
        return 'pharmacy';
    }
  }

  static PickupKind fromKey(String? key) {
    switch (key) {
      case 'lab':
        return PickupKind.lab;
      case 'clinic':
        return PickupKind.clinic;
      case 'warehouse':
        return PickupKind.warehouse;
      case 'home':
        return PickupKind.home;
      default:
        return PickupKind.pharmacy;
    }
  }
}

/// Tipo de encomenda (CHECK da tabela). Medicamentos e amostras
/// implicam cadeia de frio (+30 MZN), igual à web e à feature riders.
enum DeliveryPackage {
  medication('Medicamentos', '💊', true),
  labSample('Amostra laboratorial', '🧪', true),
  equipment('Equipamento médico', '🏥', false),
  document('Documentos', '📄', false),
  other('Outro', '📦', false);

  const DeliveryPackage(this.label, this.emoji, this.coldChain);
  final String label;
  final String emoji;
  final bool coldChain;

  String get key {
    switch (this) {
      case DeliveryPackage.medication:
        return 'medication';
      case DeliveryPackage.labSample:
        return 'lab_sample';
      case DeliveryPackage.equipment:
        return 'equipment';
      case DeliveryPackage.document:
        return 'document';
      case DeliveryPackage.other:
        return 'other';
    }
  }

  static DeliveryPackage fromKey(String? key) {
    switch (key) {
      case 'lab_sample':
        return DeliveryPackage.labSample;
      case 'equipment':
        return DeliveryPackage.equipment;
      case 'document':
        return DeliveryPackage.document;
      case 'other':
        return DeliveryPackage.other;
      default:
        return DeliveryPackage.medication;
    }
  }
}

/// Estado da entrega — subconjunto visível ao cliente (o estafeta
/// avança os estados intermédios; o cliente observa).
enum DeliveryStatus {
  pending('Por aceitar', '⏳'),
  accepted('Aceite', '🙋'),
  arrivingPickup('A caminho da recolha', '🛵'),
  pickedUp('Recolhida', '📦'),
  inTransit('Em trânsito', '🛣️'),
  arrivingDropoff('A chegar', '📍'),
  delivered('Entregue', '✅'),
  cancelled('Cancelada', '✖️'),
  failed('Falhou', '⚠️');

  const DeliveryStatus(this.label, this.emoji);
  final String label;
  final String emoji;

  bool get isTerminal =>
      this == DeliveryStatus.delivered ||
      this == DeliveryStatus.cancelled ||
      this == DeliveryStatus.failed;

  bool get isCancelledOrFailed =>
      this == DeliveryStatus.cancelled || this == DeliveryStatus.failed;

  /// A entrega está a caminho (estafeta activo) — altura de ligar o GPS.
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
      case DeliveryStatus.pending:
        return 'pending';
    }
  }
}

/// Ponto do histórico de tracking (jsonb tracking_history).
class TrackingPoint {
  const TrackingPoint({
    required this.lat,
    required this.lng,
    required this.recordedAt,
    this.status,
  });

  factory TrackingPoint.fromMap(dynamic map) => TrackingPoint(
        lat: (map is Map ? (map['lat'] as num?)?.toDouble() : null) ?? 0,
        lng: (map is Map ? (map['lng'] as num?)?.toDouble() : null) ?? 0,
        recordedAt:
            DateTime.tryParse(map is Map ? '${map['ts'] ?? ''}' : ''),
        status: map is Map ? map['status'] as String? : null,
      );

  final double lat;
  final double lng;
  final DateTime? recordedAt;
  final String? status;
}

/// Entrega do paciente — linha de `health_deliveries`.
class PatientDelivery {
  const PatientDelivery({
    required this.id,
    required this.customerName,
    required this.customerPhone,
    required this.countryCode,
    required this.pickupKind,
    required this.pickupName,
    required this.pickupLocation,
    this.pickupAddress,
    this.dropoffName,
    required this.dropoffLocation,
    this.dropoffAddress,
    this.dropoffPhone,
    required this.packageType,
    this.packageDescription,
    required this.requiresColdChain,
    required this.requiresSignature,
    this.estimatedDistanceKm,
    required this.deliveryFee,
    required this.riderEarnings,
    required this.platformFee,
    required this.status,
    this.riderId,
    this.acceptedAt,
    this.pickedUpAt,
    this.deliveredAt,
    this.cancelledAt,
    this.cancelReason,
    this.notes,
    this.trackingHistory = const [],
    this.createdAt,
  });

  factory PatientDelivery.fromMap(Map<String, dynamic> m) {
    final history = <TrackingPoint>[];
    if (m['tracking_history'] is List) {
      for (final p in m['tracking_history'] as List) {
        history.add(TrackingPoint.fromMap(p));
      }
    }
    return PatientDelivery(
      id: m['id'] as String,
      customerName: m['customer_name'] as String? ?? '',
      customerPhone: m['customer_phone'] as String? ?? '',
      countryCode: m['country_code'] as String? ?? 'MZ',
      pickupKind: PickupKind.fromKey(m['pickup_type'] as String?),
      pickupName: m['pickup_name'] as String? ?? '',
      pickupLocation: LatLngPoint.fromMap(
          m['pickup_location'] ?? const {'lat': 0, 'lng': 0}),
      pickupAddress: m['pickup_address'] as String?,
      dropoffName: m['dropoff_name'] as String?,
      dropoffLocation: LatLngPoint.fromMap(
          m['dropoff_location'] ?? const {'lat': 0, 'lng': 0}),
      dropoffAddress: m['dropoff_address'] as String?,
      dropoffPhone: m['dropoff_phone'] as String?,
      packageType: DeliveryPackage.fromKey(m['package_type'] as String?),
      packageDescription: m['package_description'] as String?,
      requiresColdChain: (m['requires_cold_chain'] as bool?) ?? false,
      requiresSignature: (m['requires_signature'] as bool?) ?? true,
      estimatedDistanceKm: (m['estimated_distance_km'] as num?)?.toDouble(),
      deliveryFee: (m['delivery_fee'] as num?)?.toDouble() ?? 0,
      riderEarnings: (m['rider_earnings'] as num?)?.toDouble() ?? 0,
      platformFee: (m['platform_fee'] as num?)?.toDouble() ?? 0,
      status: DeliveryStatus.fromKey(m['status'] as String?),
      riderId: m['rider_id'] as String?,
      acceptedAt: DateTime.tryParse('${m['accepted_at'] ?? ''}'),
      pickedUpAt: DateTime.tryParse('${m['picked_up_at'] ?? ''}'),
      deliveredAt: DateTime.tryParse('${m['delivered_at'] ?? ''}'),
      cancelledAt: DateTime.tryParse('${m['cancelled_at'] ?? ''}'),
      cancelReason: m['cancel_reason'] as String?,
      notes: m['notes'] as String?,
      trackingHistory: history,
      createdAt: DateTime.tryParse('${m['created_at'] ?? ''}'),
    );
  }

  final String id;
  final String customerName;
  final String customerPhone;
  final String countryCode;
  final PickupKind pickupKind;
  final String pickupName;
  final LatLngPoint pickupLocation;
  final String? pickupAddress;
  final String? dropoffName;
  final LatLngPoint dropoffLocation;
  final String? dropoffAddress;
  final String? dropoffPhone;
  final DeliveryPackage packageType;
  final String? packageDescription;
  final bool requiresColdChain;
  final bool requiresSignature;
  final double? estimatedDistanceKm;
  final double deliveryFee;
  final double riderEarnings;
  final double platformFee;
  final DeliveryStatus status;
  final String? riderId;
  final DateTime? acceptedAt;
  final DateTime? pickedUpAt;
  final DateTime? deliveredAt;
  final DateTime? cancelledAt;
  final String? cancelReason;
  final String? notes;
  final List<TrackingPoint> trackingHistory;
  final DateTime? createdAt;

  /// Passos do percurso para a timeline de tracking (na ordem que o
  /// cliente vive; cancelada/falhada mostrada à parte).
  List<(DeliveryStatus, DateTime?)> get timeline => [
        (DeliveryStatus.pending, createdAt),
        (DeliveryStatus.accepted, acceptedAt),
        (DeliveryStatus.pickedUp, pickedUpAt),
        (DeliveryStatus.inTransit, pickedUpAt),
        (DeliveryStatus.delivered, deliveredAt),
      ];
}
