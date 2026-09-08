import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/config.dart';
import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../data/delivery_models.dart';
import '../data/delivery_repository.dart';

/// TRACKING DE ENTREGA em tempo real (F14).
///
///   • Estado da linha via `.stream(primaryKey:)` (Postgres Changes);
///   • Posição do estafeta via broadcast `dw-delivery-{id}` — o
///     estafeta publica a cada ~8 s enquanto a entrega está activa;
///   • Sem chave de mapas, o ecrã continua utilizável: mostra a
///     timeline de estados e os links "abrir no Google Maps".
class DeliveryTrackingScreen extends ConsumerStatefulWidget {
  const DeliveryTrackingScreen({super.key, required this.deliveryId});

  final String deliveryId;

  @override
  ConsumerState<DeliveryTrackingScreen> createState() =>
      _DeliveryTrackingScreenState();
}

class _DeliveryTrackingScreenState
    extends ConsumerState<DeliveryTrackingScreen> {
  PatientDelivery? _delivery;
  StreamSubscription<PatientDelivery?>? _rowSub;
  RealtimeChannel? _positionChannel;
  StreamSubscription<LatLngPoint>? _positionSub;
  LatLngPoint? _riderPosition;
  GoogleMapController? _mapCtrl;

  @override
  void initState() {
    super.initState();
    _subscribe();
  }

  void _subscribe() {
    final repo = ref.read(deliveryRepositoryProvider);
    _rowSub = repo.watchDelivery(widget.deliveryId).listen((d) {
      if (!mounted) return;
      setState(() => _delivery = d);
      _syncPositionChannel(d);
    });
  }

  /// Ligar/desligar o canal de broadcast conforme o estado da entrega.
  void _syncPositionChannel(PatientDelivery? d) {
    final active = d != null && d.status.isActiveRide;
    if (active && _positionChannel == null) {
      final sub =
          ref.read(deliveryRepositoryProvider).subscribeRiderPosition(d.id);
      _positionChannel = sub.channel;
      _positionSub = sub.positions.listen((p) {
        if (!mounted) return;
        setState(() => _riderPosition = p);
        if (_mapCtrl != null) {
          _mapCtrl!.animateCamera(CameraUpdate.newLatLng(
              LatLng(p.lat, p.lng)));
        }
      });
    } else if (!active && _positionChannel != null) {
      _teardownPosition();
    }
  }

  Future<void> _teardownPosition() async {
    _positionSub?.cancel();
    _positionSub = null;
    final ch = _positionChannel;
    _positionChannel = null;
    if (ch != null) {
      await ref.read(deliveryRepositoryProvider).unsubscribe(ch);
    }
  }

  @override
  void dispose() {
    _rowSub?.cancel();
    _teardownPosition();
    _mapCtrl = null;
    super.dispose();
  }

  Future<void> _cancelDelivery() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bgHigh,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Cancelar entrega?',
            style: TextStyle(color: AppColors.textPrimary)),
        content: Text(
          'O pedido ainda não foi aceite por nenhum estafeta. '
          'Cancelamentos são gratuitos nesta fase.',
          style: TextStyle(color: AppColors.textSecondary, height: 1.45),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Manter'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Cancelar entrega',
                style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (confirmed != true || _delivery == null) return;
    await ref
        .read(deliveryRepositoryProvider)
        .cancelPending(_delivery!.id, 'Cancelado pelo cliente');
  }

  Future<void> _openMaps(LatLngPoint p, String label) async {
    final uri = Uri.parse(
        'https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}');
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final d = _delivery;
    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: const Text('Acompanhar entrega',
              style: TextStyle(fontWeight: FontWeight.w700)),
          actions: [
            if (d != null && d.status == DeliveryStatus.pending)
              IconButton(
                onPressed: _cancelDelivery,
                icon: const Icon(Icons.cancel_outlined,
                    color: AppColors.danger),
                tooltip: 'Cancelar pedido',
              ),
          ],
        ),
        body: d == null
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primary))
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                children: [
                  _LiveMapCard(
                    delivery: d,
                    riderPosition: _riderPosition,
                    onMapCreated: (c) => _mapCtrl = c,
                    onOpenMaps: _openMaps,
                  ),
                  const SizedBox(height: 16),
                  _StatusTimeline(delivery: d),
                  const SizedBox(height: 16),
                  _DetailsCard(delivery: d),
                ],
              ),
      ),
    );
  }
}

// ── Mapa ao vivo ──────────────────────────────────────────────────────

class _LiveMapCard extends StatelessWidget {
  const _LiveMapCard({
    required this.delivery,
    required this.riderPosition,
    required this.onMapCreated,
    required this.onOpenMaps,
  });

  final PatientDelivery delivery;
  final LatLngPoint? riderPosition;
  final void Function(GoogleMapController) onMapCreated;
  final void Function(LatLngPoint, String) onOpenMaps;

  Set<Marker> _markers() {
    final markers = <Marker>{
      Marker(
        markerId: const MarkerId('pickup'),
        position: LatLng(delivery.pickupLocation.lat,
            delivery.pickupLocation.lng),
        infoWindow: InfoWindow(title: 'Recolha', snippet: delivery.pickupName),
        icon: BitmapDescriptor.defaultMarkerWithHue(
            BitmapDescriptor.hueAzure),
      ),
      Marker(
        markerId: const MarkerId('dropoff'),
        position: LatLng(delivery.dropoffLocation.lat,
            delivery.dropoffLocation.lng),
        infoWindow: InfoWindow(
            title: 'Entrega', snippet: delivery.dropoffAddress ?? 'Destino'),
        icon: BitmapDescriptor.defaultMarkerWithHue(
            BitmapDescriptor.hueGreen),
      ),
    };
    if (riderPosition != null) {
      markers.add(Marker(
        markerId: const MarkerId('rider'),
        position: LatLng(riderPosition!.lat, riderPosition!.lng),
        infoWindow: const InfoWindow(title: 'Estafeta'),
        icon:
            BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
      ));
    }
    return markers;
  }

  @override
  Widget build(BuildContext context) {
    final live = riderPosition != null;
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: SizedBox(
        height: 220,
        child: Stack(
          children: [
            Positioned.fill(
              child: AppConfig.hasMapsKey
                  ? GoogleMap(
                      initialCameraPosition: CameraPosition(
                        target: LatLng(
                          riderPosition?.lat ??
                              delivery.dropoffLocation.lat,
                          riderPosition?.lng ??
                              delivery.dropoffLocation.lng,
                        ),
                        zoom: 14,
                      ),
                      markers: _markers(),
                      myLocationEnabled: false,
                      myLocationButtonEnabled: false,
                      zoomControlsEnabled: false,
                      mapToolbarEnabled: false,
                      onMapCreated: onMapCreated,
                    )
                  : _MapFallback(
                      delivery: delivery,
                      onOpenMaps: onOpenMaps,
                    ),
            ),
            Positioned(
              top: 10,
              left: 10,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: (live ? AppColors.success : AppColors.glassFillStrong)
                      .withOpacity(.9),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        color: live ? Colors.white : AppColors.textMuted,
                        shape: BoxShape.circle,
                      ),
                    ).animate(onPlay: (c) => c.repeat()).fadeIn().fadeOut(),
                    const SizedBox(width: 6),
                    Text(
                      live
                          ? 'GPS do estafeta ao vivo'
                          : delivery.status.isActiveRide
                              ? 'A ligar o GPS…'
                              : 'Tracking de estados',
                      style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                          color: live
                              ? Colors.white
                              : AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MapFallback extends StatelessWidget {
  const _MapFallback({required this.delivery, required this.onOpenMaps});

  final PatientDelivery delivery;
  final void Function(LatLngPoint, String) onOpenMaps;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.card,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.map_rounded, size: 18, color: AppColors.accent),
              const SizedBox(width: 8),
              Expanded(
                child: Text('Percurso',
                    style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                        color: AppColors.textPrimary)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _MapLinkRow(
            emoji: '🔵',
            title: 'Recolha · ${delivery.pickupName}',
            point: delivery.pickupLocation,
            onOpenMaps: onOpenMaps,
          ),
          const SizedBox(height: 8),
          _MapLinkRow(
            emoji: '🟢',
            title:
                'Entrega · ${delivery.dropoffAddress ?? delivery.dropoffName ?? 'Destino'}',
            point: delivery.dropoffLocation,
            onOpenMaps: onOpenMaps,
          ),
          if (delivery.estimatedDistanceKm != null) ...[
            const SizedBox(height: 10),
            Text(
              '${delivery.estimatedDistanceKm!.toStringAsFixed(1)} km estimados',
              style: TextStyle(fontSize: 11.5, color: AppColors.textMuted),
            ),
          ],
        ],
      ),
    );
  }
}

class _MapLinkRow extends StatelessWidget {
  const _MapLinkRow({
    required this.emoji,
    required this.title,
    required this.point,
    required this.onOpenMaps,
  });

  final String emoji;
  final String title;
  final LatLngPoint point;
  final void Function(LatLngPoint, String) onOpenMaps;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(emoji, style: const TextStyle(fontSize: 13)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        ),
        GestureDetector(
          onTap: () => onOpenMaps(point, title),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(.18),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Text('Abrir no mapa',
                style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.accent)),
          ),
        ),
      ],
    );
  }
}

// ── Timeline de estados ───────────────────────────────────────────────

class _StatusTimeline extends StatelessWidget {
  const _StatusTimeline({required this.delivery});

  final PatientDelivery delivery;

  Color _colorOf(DeliveryStatus s, bool done, bool current) {
    if (s.isCancelledOrFailed) return AppColors.danger;
    if (done) return AppColors.success;
    if (current) return AppColors.warning;
    return AppColors.textMuted;
  }

  @override
  Widget build(BuildContext context) {
    final cancelled = delivery.status.isCancelledOrFailed;
    final steps = delivery.timeline;
    // Estados intermédios do estafeta (arriving_pickup / arriving_dropoff)
    // mapeiam para o passo equivalente da timeline do cliente.
    int idxOf(DeliveryStatus s) {
      switch (s) {
        case DeliveryStatus.arrivingPickup:
          return steps.indexWhere((e) => e.$1 == DeliveryStatus.accepted);
        case DeliveryStatus.arrivingDropoff:
          return steps.indexWhere((e) => e.$1 == DeliveryStatus.inTransit);
        default:
          return steps.indexWhere((e) => e.$1 == s);
      }
    }

    final currentIdx = idxOf(delivery.status);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(delivery.status.emoji,
                  style: const TextStyle(fontSize: 16)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  cancelled
                      ? 'Entrega ${delivery.status.label.toLowerCase()}'
                      : 'Estado: ${delivery.status.label}',
                  style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                      color: cancelled
                          ? AppColors.danger
                          : AppColors.textPrimary),
                ),
              ),
            ],
          ),
          if (delivery.cancelReason != null) ...[
            const SizedBox(height: 6),
            Text('Motivo: ${delivery.cancelReason}',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
          ],
          const SizedBox(height: 14),
          ...List.generate(steps.length, (i) {
            final (status, ts) = steps[i];
            final done = cancelled
                ? false
                : currentIdx >= 0 && i < currentIdx;
            final current = !cancelled && i == currentIdx;
            final color = _colorOf(status, done, current);
            final last = i == steps.length - 1;
            return IntrinsicHeight(
              child: Row(
                children: [
                  Column(
                    children: [
                      Container(
                        width: 22,
                        height: 22,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: done || current
                              ? color.withOpacity(.22)
                              : AppColors.glassFill,
                          border: Border.all(color: color, width: 1.6),
                        ),
                        child: done
                            ? Icon(Icons.check_rounded,
                                size: 13, color: color)
                            : null,
                      ),
                      if (!last)
                        Container(
                          width: 2,
                          height: 30,
                          color: done
                              ? color.withOpacity(.5)
                              : AppColors.glassBorder,
                        ),
                    ],
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Padding(
                      padding: EdgeInsets.only(bottom: last ? 0 : 12),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(status.label,
                                style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: current
                                        ? FontWeight.w800
                                        : FontWeight.w500,
                                    color: current
                                        ? color
                                        : (done
                                            ? AppColors.textPrimary
                                            : AppColors.textMuted))),
                          ),
                          if (ts != null && (done || current || last))
                            Text(formatDateTime(ts.toLocal()),
                                style: TextStyle(
                                    fontSize: 10.5,
                                    color: AppColors.textMuted)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

// ── Detalhes ──────────────────────────────────────────────────────────

class _DetailsCard extends StatelessWidget {
  const _DetailsCard({required this.delivery});

  final PatientDelivery delivery;

  @override
  Widget build(BuildContext context) {
    final d = delivery;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('DETALHES DA ENCOMENDA',
              style: TextStyle(
                  fontSize: 10.5,
                  letterSpacing: 1.2,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textMuted)),
          const SizedBox(height: 12),
          _DetailRow('${d.packageType.emoji} Tipo',
              d.packageType.label),
          if (d.packageDescription?.isNotEmpty == true)
            _DetailRow('📝 Descrição', d.packageDescription!),
          if (d.requiresColdChain)
            const _DetailRow('❄️ Cadeia de frio', 'Sim (+30 MZN)'),
          _DetailRow('💰 Taxa paga', formatMZN(d.deliveryFee)),
          if (d.estimatedDistanceKm != null)
            _DetailRow('📏 Distância',
                '${d.estimatedDistanceKm!.toStringAsFixed(1)} km'),
          _DetailRow('🏥 Recolha', d.pickupName),
          if (d.dropoffAddress?.isNotEmpty == true)
            _DetailRow('🏠 Destino', d.dropoffAddress!),
          if (d.notes?.isNotEmpty == true) _DetailRow('📌 Notas', d.notes!),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 118,
            child: Text(label,
                style: TextStyle(
                    fontSize: 12, color: AppColors.textSecondary)),
          ),
          Expanded(
            child: Text(value,
                style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary)),
          ),
        ],
      ),
    );
  }
}
