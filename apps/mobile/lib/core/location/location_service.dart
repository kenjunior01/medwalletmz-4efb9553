import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

/// Ponto simples (latitude/longitude) desacoplado de google_maps_flutter.
class UserPoint {
  const UserPoint(this.latitude, this.longitude, {this.accuracyM});

  final double latitude;
  final double longitude;
  final double? accuracyM;
}

/// Serviço de localização do dispositivo (EXCLUSIVO MÓVEL).
///
/// A versão web só consegue ordenar por cidade; a app nativa usa o GPS
/// para ordenar as instituições por proximidade REAL ("Perto de mim").
///
/// Degradação graciosa:
///  - permissão negada → devolve null (a app continua a funcionar,
///    apenas sem distâncias precisas);
///  - serviço desligado → devolve null + [lastError] explicativo.
class LocationService {
  LocationService._();
  static final LocationService instance = LocationService._();

  UserPoint? _lastKnown;
  String? lastError;
  bool _askedOnce = false;

  /// Última posição obtida nesta sessão (para evitar re-pedir GPS a cada
  /// filtro — as instituições não se movem).
  UserPoint? get lastKnown => _lastKnown;

  /// true quando o utilizador já negou a permissão nesta sessão — a UI
  /// mostra o botão "Abrir definições" em vez de voltar a pedir.
  bool get permissionDenied => lastError == 'denied';

  Future<UserPoint?> getCurrentPosition({bool forceRefresh = false}) async {
    if (!forceRefresh && _lastKnown != null) return _lastKnown;
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        lastError = 'disabled';
        return _lastKnown;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        if (_askedOnce) {
          lastError = 'denied';
          return _lastKnown;
        }
        _askedOnce = true;
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        lastError = 'denied';
        return _lastKnown;
      }

      // posição aproximada chega mais rápido e gasta menos bateria —
      // para ordenar instituições é suficiente (precisão de bairro).
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
        timeLimit: const Duration(seconds: 10),
      );
      lastError = null;
      _lastKnown = UserPoint(
        pos.latitude,
        pos.longitude,
        accuracyM: pos.accuracy,
      );
      return _lastKnown;
    } catch (e) {
      if (kDebugMode) debugPrint('LocationService: $e');
      lastError ??= 'error';
      return _lastKnown;
    }
  }
}
