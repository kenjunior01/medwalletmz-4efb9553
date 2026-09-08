/// Repositório de ENTREGAS DO PACIENTE (F14) — tabela
/// `health_deliveries` + RPC `wallet_debit` (existentes).
///
/// Pagamento: INSERT (pending) → RPC `wallet_debit` transaccional
/// (deixa rastro em `wallet_transactions` com ref_id da entrega) →
/// se o débito falhar (saldo insuficiente, erro de rede), a entrega é
/// CANCELADA por compensação — nunca fica paga a meio.
///
/// Tracking em tempo real (zero alterações de backend):
///   • estado: `.stream(primaryKey:)` sobre a própria linha (RLS do
///     cliente permite SELECT) — status/timestamps actualizam ao vivo;
///   • posição GPS do estafeta: Supabase Realtime BROADCAST no canal
///     `dw-delivery-{id}` — o estafeta publica (feature riders,
///     `PositionBroadcaster`), o cliente subscreve. Sem tabelas novas.
import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'delivery_models.dart';

class DeliveryRepository {
  DeliveryRepository(this._client);

  final SupabaseClient _client;

  static const double _perKm = 15;
  static const double _coldSurcharge = 30;
  static const double _riderShare = 0.8;

  /// Base por veículo (igual a `VehicleType` da feature riders e à
  /// web) — a escolha do veículo no pedido mantém a taxa coerente com
  /// o estafeta que aceitar.
  static const Map<String, (String, double)> vehicleBase = {
    'foot': ('A pé', 30),
    'bicycle': ('Bicicleta', 50),
    'motorbike': ('Mota', 80),
    'car': ('Carro', 150),
  };

  /// Taxa estimada — espelho exacto de `computeDeliveryFee` (web +
  /// riders): base do veículo + 15 MZN/km + 30 MZN de cadeia de frio,
  /// 80% estafeta / 20% plataforma.
  static ({double fee, double riderEarnings, double platformFee}) computeFee({
    required double distanceKm,
    required bool coldChain,
    String vehicleKey = 'motorbike',
  }) {
    final base = vehicleBase[vehicleKey]?.$2 ?? 80;
    final fee = base + (distanceKm * _perKm) + (coldChain ? _coldSurcharge : 0);
    return (
      fee: fee.roundToDouble(),
      riderEarnings: (fee * _riderShare).roundToDouble(),
      platformFee: (fee * (1 - _riderShare)).roundToDouble(),
    );
  }

  // ── Pedidos do cliente ─────────────────────────────────────────────

  /// Criar + pagar o pedido de entrega (ver topo da classe).
  Future<PatientDelivery> createDelivery({
    required String customerName,
    required String customerPhone,
    required String countryCode,
    required PickupKind pickupKind,
    required String pickupName,
    required LatLngPoint pickupLocation,
    String? pickupAddress,
    required String dropoffName,
    required LatLngPoint dropoffLocation,
    String? dropoffAddress,
    String? dropoffPhone,
    required DeliveryPackage packageType,
    String? packageDescription,
    required bool requiresColdChain,
    required double distanceKm,
    required String vehicleKey,
    String? notes,
  }) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) throw Exception('Sessão expirada');
    final quote = computeFee(
      distanceKm: distanceKm,
      coldChain: requiresColdChain,
      vehicleKey: vehicleKey,
    );
    final Map<String, dynamic> row;
    try {
      final rows = await _client
          .from('health_deliveries')
          .insert({
            'customer_user_id': uid,
            'customer_name': customerName,
            'customer_phone': customerPhone,
            'country_code': countryCode,
            'pickup_type': pickupKind.key,
            'pickup_name': pickupName,
            'pickup_location': pickupLocation.toMap(),
            'pickup_address': pickupAddress,
            'dropoff_name': dropoffName,
            'dropoff_location': dropoffLocation.toMap(),
            'dropoff_address': dropoffAddress,
            'dropoff_phone': dropoffPhone,
            'package_type': packageType.key,
            'package_description': packageDescription,
            'requires_cold_chain': requiresColdChain,
            'requires_signature': true,
            'estimated_distance_km': double.parse(
                distanceKm.toStringAsFixed(2)),
            'delivery_fee': quote.fee,
            'rider_earnings': quote.riderEarnings,
            'platform_fee': quote.platformFee,
            'status': 'pending',
            'source': 'app',
            'notes': notes,
          })
          .select()
          .single();
      row = rows;
    } catch (e) {
      throw Exception('Não foi possível registar a entrega: $e');
    }

    final id = row['id'] as String;
    try {
      await _client.rpc('wallet_debit', params: {
        '_user_id': uid,
        '_amount': quote.fee,
        '_service_type': 'delivery',
        '_ref_id': id,
        '_description': 'Entrega · $pickupName → ${dropoffName.isEmpty ? dropoffAddress ?? 'destino' : dropoffName}',
      });
    } catch (e) {
      // Compensação: sem saldo a entrega não fica pendurada.
      try {
        await _client
            .from('health_deliveries')
            .update({
              'status': 'cancelled',
              'cancel_reason': 'Pagamento da carteira falhou',
              'cancelled_at': DateTime.now().toUtc().toIso8601String(),
            })
            .eq('id', id)
            .eq('status', 'pending');
      } catch (_) {}
      rethrow;
    }
    return PatientDelivery.fromMap(row);
  }

  /// As entregas do utilizador (mais recentes primeiro).
  Future<List<PatientDelivery>> fetchMyDeliveries() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const [];
    try {
      final rows = await _client
          .from('health_deliveries')
          .select()
          .eq('customer_user_id', uid)
          .order('created_at', ascending: false)
          .limit(30);
      return (rows as List)
          .map((m) =>
              PatientDelivery.fromMap(Map<String, dynamic>.from(m as Map)))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  /// Cancelar enquanto ainda está por aceitar (RLS só permite UPDATE
  /// em `status = 'pending'`).
  Future<void> cancelPending(String id, String reason) async {
    await _client
        .from('health_deliveries')
        .update({
          'status': 'cancelled',
          'cancel_reason': reason,
          'cancelled_at': DateTime.now().toUtc().toIso8601String(),
        })
        .eq('id', id)
        .eq('status', 'pending');
  }

  // ── Tracking em tempo real ─────────────────────────────────────────

  /// Estado da entrega ao vivo (stream Postgres Changes filtrada por
  /// id — a RLS do cliente garante o SELECT).
  Stream<PatientDelivery?> watchDelivery(String id) => _client
      .from('health_deliveries')
      .stream(primaryKey: ['id'])
      .eq('id', id)
      .map((rows) =>
          rows.isEmpty ? null : PatientDelivery.fromMap(rows.first));

  /// Posição GPS do estafeta ao vivo — canal de broadcast
  /// `dw-delivery-{id}`. O estafeta publica a cada ~8 s (feature
  /// riders); o cliente apenas subscreve. Sem tabelas novas.
  ({RealtimeChannel channel, Stream<LatLngPoint> positions})
      subscribeRiderPosition(String deliveryId) {
    final channel = _client.channel('dw-delivery-$deliveryId');
    final controller = StreamController<LatLngPoint>.broadcast();
    channel.onBroadcast(
      event: 'rider_position',
      callback: (payload) {
        final lat = (payload?['lat'] as num?)?.toDouble();
        final lng = (payload?['lng'] as num?)?.toDouble();
        if (lat != null && lng != null) {
          controller.add(LatLngPoint(lat: lat, lng: lng));
        }
      },
    ).subscribe();
    return (
      channel: channel,
      positions: controller.stream,
    );
  }

  Future<void> unsubscribe(RealtimeChannel channel) async {
    await _client.removeChannel(channel);
  }
}

final deliveryRepositoryProvider = Provider<DeliveryRepository>(
  (ref) => DeliveryRepository(Supabase.instance.client),
);
