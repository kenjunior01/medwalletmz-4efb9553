/// Broadcaster de posição GPS do estafeta (F14) — a cara visível do
/// tracking em tempo real para o cliente.
///
/// Enquanto houver uma entrega activa (`status` accepted →
/// arriving_dropoff), publica a posição no canal Supabase Realtime
/// BROADCAST `dw-delivery-{id}` a cada 8 s. O cliente subscreve o mesmo
/// canal (feature deliveries) e vê o estafeta a mover-se no mapa.
///
/// Não escreve em nenhuma tabela — os marcos de estado continuam a ser
/// gravados pelo `advanceStatus` existente. Zero alterações de backend.
import 'dart:async';

import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class PositionBroadcaster {
  PositionBroadcaster(this._client);

  final SupabaseClient _client;
  RealtimeChannel? _channel;
  StreamSubscription<Position>? _gps;
  Timer? _timer;
  Position? _last;
  String? _deliveryId;

  bool get isBroadcasting => _channel != null;
  String? get deliveryId => _deliveryId;

  /// Liga o GPS + canal para uma entrega. Chamar de novo com o mesmo id
  /// é um no-op; com id diferente reinicia no canal novo.
  void start(String deliveryId) {
    if (_channel != null && _deliveryId == deliveryId) return;
    stop();
    _deliveryId = deliveryId;
    _channel = _client.channel('dw-delivery-$deliveryId');
    _channel!.subscribe();

    // Pedir permissão silenciosamente — se o estafeta negar, o canal
    // fica ligado sem posições (o cliente vê "A ligar o GPS…").
    () async {
      try {
        var permission = await Geolocator.checkPermission();
        if (permission == LocationPermission.denied) {
          permission = await Geolocator.requestPermission();
        }
        if (permission == LocationPermission.denied ||
            permission == LocationPermission.deniedForever) {
          return;
        }
        await _gps?.cancel();
        _gps = Geolocator.getPositionStream(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.medium,
            distanceFilter: 25, // só publica se andou ≥25 m
          ),
        ).listen((p) => _last = p);
      } catch (_) {}
    }();

    _timer = Timer.periodic(const Duration(seconds: 8), (_) => _publish());
    _publish();
  }

  void _publish() {
    final p = _last;
    final ch = _channel;
    if (p == null || ch == null) return;
    try {
      ch.sendBroadcastMessage(
        event: 'rider_position',
        payload: {'lat': p.latitude, 'lng': p.longitude},
      );
    } catch (_) {}
  }

  /// Desligar tudo — ao concluir/cancelar a entrega ou sair do ecrã.
  Future<void> stop() async {
    _timer?.cancel();
    _timer = null;
    await _gps?.cancel();
    _gps = null;
    final ch = _channel;
    _channel = null;
    _deliveryId = null;
    _last = null;
    if (ch != null) {
      try {
        await _client.removeChannel(ch);
      } catch (_) {}
    }
  }
}
