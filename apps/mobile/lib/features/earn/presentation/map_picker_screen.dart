import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../core/config.dart';
import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/gradient_button.dart';

/// Seletor de localização no Google Maps — toca para colocar o pin e
/// confirma. Sem `MAPS_API_KEY` configurada, oferece introdução manual
/// de coordenadas (a app continua utilizável sem a chave).
class MapPickerScreen extends ConsumerStatefulWidget {
  const MapPickerScreen({super.key, this.initial});

  final LatLng? initial;

  @override
  ConsumerState<MapPickerScreen> createState() => _MapPickerScreenState();
}

class _MapPickerScreenState extends ConsumerState<MapPickerScreen> {
  LatLng? _selected;
  GoogleMapController? _mapCtrl;

  static const _defaultCenter = LatLng(-25.969248, 32.573100); // Maputo

  @override
  void initState() {
    super.initState();
    _selected = widget.initial;
  }

  Future<void> _useGps() async {
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied ||
            permission == LocationPermission.deniedForever) return;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings:
            const LocationSettings(accuracy: LocationAccuracy.high),
      );
      if (!mounted) return;
      final target = LatLng(pos.latitude, pos.longitude);
      setState(() => _selected = target);
      await _mapCtrl?.animateCamera(
        CameraUpdate.newLatLngZoom(target, 16),
      );
    } catch (_) {}
  }

  void _confirm() {
    final s = _selected;
    if (s == null) return;
    context.pop([s.latitude, s.longitude]);
  }

  @override
  Widget build(BuildContext context) {
    // Fallback sem chave de API — coordenadas manuais.
    if (!AppConfig.hasMapsKey) return _manualFallback();

    final center = _selected ?? widget.initial ?? _defaultCenter;

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 20, 8),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    const Expanded(
                      child: Text(
                        'Toque no mapa para marcar',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: _useGps,
                      tooltip: 'Minha localização',
                      icon: const Icon(Icons.gps_fixed_rounded,
                          color: AppColors.accent),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: GoogleMap(
                  initialCameraPosition:
                      CameraPosition(target: center, zoom: 15),
                  myLocationButtonEnabled: false,
                  myLocationEnabled: true,
                  zoomControlsEnabled: false,
                  markers: {
                    if (_selected != null)
                      Marker(
                        markerId: const MarkerId('picked'),
                        position: _selected!,
                      ),
                  },
                  onTap: (latLng) => setState(() => _selected = latLng),
                  onMapCreated: (ctrl) => _mapCtrl = ctrl,
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        _selected == null
                            ? 'Nenhum local marcado'
                            : '${_selected!.latitude.toStringAsFixed(6)}, '
                                '${_selected!.longitude.toStringAsFixed(6)}',
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12.5,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: _selected == null ? null : _confirm,
                      icon: Container(
                        width: 46,
                        height: 46,
                        decoration: BoxDecoration(
                          gradient: _selected == null
                              ? const LinearGradient(colors: [
                                  Color(0xFF22344A),
                                  Color(0xFF1A2939)
                                ])
                              : const LinearGradient(
                                  colors: AppColors.buttonGradient),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.check_rounded,
                            color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Fallback manual ───────────────────────────────────────────────

  Widget _manualFallback() {
    final latCtrl = TextEditingController(
        text: widget.initial?.latitude.toStringAsFixed(6) ?? '');
    final lngCtrl = TextEditingController(
        text: widget.initial?.longitude.toStringAsFixed(6) ?? '');

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                IconButton(
                  onPressed: () => context.pop(),
                  icon: const Icon(Icons.arrow_back_rounded,
                      color: AppColors.textPrimary),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Coordenadas da instituição',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'O mapa interativo não está configurado nesta instalação '
                  '(falta a chave MAPS_API_KEY). Introduz as coordenadas '
                  'manualmente — podes copiá-las do Google Maps.',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.55),
                    fontSize: 13,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 18),
                TextField(
                  controller: latCtrl,
                  keyboardType: TextInputType.text,
                  style: const TextStyle(color: AppColors.textPrimary),
                  decoration:
                      const InputDecoration(hintText: 'Latitude (ex.: -25.9692)'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: lngCtrl,
                  keyboardType: TextInputType.text,
                  style: const TextStyle(color: AppColors.textPrimary),
                  decoration:
                      const InputDecoration(hintText: 'Longitude (ex.: 32.5732)'),
                ),
                const SizedBox(height: 20),
                GradientButton(
                  label: 'Usar estas coordenadas',
                  icon: Icons.check_rounded,
                  onPressed: () {
                    final lat = double.tryParse(
                        latCtrl.text.replaceAll(',', '.'));
                    final lng = double.tryParse(
                        lngCtrl.text.replaceAll(',', '.'));
                    if (lat == null || lng == null) return;
                    context.pop([lat, lng]);
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
