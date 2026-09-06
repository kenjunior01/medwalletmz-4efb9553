import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/config.dart';
import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/skeleton.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/proposal_models.dart';
import 'earn_controller.dart';
import 'map_picker_screen.dart';

/// Submissão de instituição — pede exactamente o que os gestores
/// regionais precisam: tipo, nome, telefone, cidade/bairro, paragem
/// mais próxima (ponto de referência) e 3–4 fotos do exterior.
class SubmitProposalScreen extends ConsumerStatefulWidget {
  const SubmitProposalScreen({super.key});

  @override
  ConsumerState<SubmitProposalScreen> createState() =>
      _SubmitProposalScreenState();
}

class _SubmitProposalScreenState extends ConsumerState<SubmitProposalScreen> {
  String _entityType = 'pharmacy';
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _city = TextEditingController();
  final _address = TextEditingController();
  final _neighborhood = TextEditingController();
  final _referencePoint = TextEditingController();
  final _description = TextEditingController();
  final _latCtrl = TextEditingController();
  final _lngCtrl = TextEditingController();

  final _picker = ImagePicker();
  final List<XFile> _photos = [];

  List<(String, String)> _countries = const [('MZ', 'Moçambique')];
  String _countryId = AppConfig.defaultCountry;
  bool _loadingCountries = true;

  bool _submitting = false;
  bool _success = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadCountries();
  }

  Future<void> _loadCountries() async {
    try {
      final client = ref.read(supabaseClientProvider);
      final rows = await client
          .from('countries')
          .select('id, name')
          .eq('is_active', true)
          .order('name');
      if (!mounted) return;
      setState(() {
        _countries = [
          for (final r in rows) (r['id'] as String, (r['name'] ?? '') as String)
        ];
        _loadingCountries = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingCountries = false);
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _city.dispose();
    _address.dispose();
    _neighborhood.dispose();
    _referencePoint.dispose();
    _description.dispose();
    _latCtrl.dispose();
    _lngCtrl.dispose();
    super.dispose();
  }

  bool get _valid =>
      _name.text.trim().length >= 3 && _city.text.trim().isNotEmpty;

  Future<void> _pickPhotos() async {
    try {
      final picked = await _picker.pickMultiImage(
        imageQuality: 70,
        maxWidth: 1600,
      );
      if (picked.isEmpty) return;
      setState(() {
        for (final p in picked) {
          if (_photos.length < 4) _photos.add(p);
        }
      });
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Não foi possível abrir a galeria.')),
        );
      }
    }
  }

  void _removePhoto(int index) => setState(() => _photos.removeAt(index));

  Future<void> _useGps() async {
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied ||
            permission == LocationPermission.deniedForever) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                  content: Text(
                      'Permissão de localização negada — usa o mapa ou '
                      'introduz as coordenadas manualmente.')),
            );
          }
          return;
        }
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium),
      );
      if (!mounted) return;
      setState(() {
        _latCtrl.text = pos.latitude.toStringAsFixed(6);
        _lngCtrl.text = pos.longitude.toStringAsFixed(6);
      });
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('GPS indisponível neste momento.')),
        );
      }
    }
  }

  Future<void> _pickOnMap() async {
    if (!AppConfig.hasMapsKey) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text(
                'Mapa não configurado nesta instalação — introduz as '
                'coordenadas manualmente ou usa o GPS.')),
      );
      return;
    }
    final result = await context.push<List<double>>('/map-picker');
    if (result != null && result.length >= 2 && mounted) {
      setState(() {
        _latCtrl.text = result[0].toStringAsFixed(6);
        _lngCtrl.text = result[1].toStringAsFixed(6);
      });
    }
  }

  Future<void> _submit() async {
    if (_submitting || !_valid) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final uid = ref.read(currentUserIdProvider);
      if (uid == null) throw StateError('sem sessão');
      await ref.read(proposalRepositoryProvider).submit(
            uid: uid,
            entityType: _entityType,
            name: _name.text,
            city: _city.text,
            countryId: _countryId,
            address: _address.text,
            neighborhood: _neighborhood.text,
            referencePoint: _referencePoint.text,
            phone: _phone.text,
            description: _description.text,
            latitude: double.tryParse(_latCtrl.text.replaceAll(',', '.')),
            longitude: double.tryParse(_lngCtrl.text.replaceAll(',', '.')),
            photos: [for (final p in _photos) File(p.path)],
            photoNames: [for (final p in _photos) p.name],
          );
      if (!mounted) return;
      setState(() {
        _success = true;
        _submitting = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = 'Não foi possível enviar. Verifica os dados e tenta de novo.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_success) return _successView();

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
            children: [
              Row(
                children: [
                  IconButton(
                    onPressed: () => context.pop(),
                    icon: const Icon(Icons.arrow_back_rounded,
                        color: AppColors.textPrimary),
                  ),
                  const Expanded(
                    child: Text(
                      'Adicionar instituição',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 19,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // ── Tipo ─────────────────────────────────────────────
              const Text(
                'TIPO DE INSTITUIÇÃO',
                style: _sectionLabel,
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final (value, label, icon, color)
                      in proposalEntityTypes)
                    _TypeChip(
                      label: label,
                      icon: icon,
                      color: color,
                      selected: _entityType == value,
                      onTap: () => setState(() => _entityType = value),
                    ),
                ],
              ),
              const SizedBox(height: 18),

              // ── Identificação ────────────────────────────────────
              TextField(
                controller: _name,
                onChanged: (_) => setState(() {}),
                style: const TextStyle(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                    hintText: 'Nome da instituição *'),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                      style: const TextStyle(color: AppColors.textPrimary),
                      decoration: const InputDecoration(
                          hintText: 'Celular (ex.: 84 123 4567)'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _loadingCountries
                        ? const SizedBox(
                            height: 20,
                            child: Center(
                              child: SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: AppColors.accent),
                              ),
                            ),
                          )
                        : Container(
                            padding:
                                const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.05),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _countryId,
                                isExpanded: true,
                                dropdownColor: const Color(0xFF0B1D31),
                                style: const TextStyle(
                                    color: AppColors.textPrimary,
                                    fontSize: 13),
                                items: [
                                  for (final (id, name) in _countries)
                                    DropdownMenuItem(
                                        value: id, child: Text(name)),
                                ],
                                onChanged: (v) {
                                  if (v != null) {
                                    setState(() => _countryId = v);
                                  }
                                },
                              ),
                            ),
                          ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _city,
                      onChanged: (_) => setState(() {}),
                      style: const TextStyle(color: AppColors.textPrimary),
                      decoration: const InputDecoration(hintText: 'Cidade *'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _neighborhood,
                      style: const TextStyle(color: AppColors.textPrimary),
                      decoration:
                          const InputDecoration(hintText: 'Bairro'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _address,
                style: const TextStyle(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                    hintText: 'Endereço (avenida, rua, número)'),
              ),
              const SizedBox(height: 14),

              // ── Ponto de referência ──────────────────────────────
              Container(
                padding: const EdgeInsets.all(13),
                decoration: BoxDecoration(
                  color: const Color(0x141E6B9C),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0x3338BDF8)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.directions_bus_rounded,
                            color: AppColors.accent, size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Paragem / ponto de referência mais próximo',
                          style: TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w800,
                            fontSize: 12.8,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _referencePoint,
                      style: const TextStyle(color: AppColors.textPrimary),
                      decoration: const InputDecoration(
                        hintText:
                            'Ex.: paragem do Mercado Central, junto ao posto…',
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Ajuda os clientes a encontrar a instituição sem GPS.',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.45),
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // ── Localização ──────────────────────────────────────
              const Text('LOCALIZAÇÃO (GPS ou mapa)', style: _sectionLabel),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _latCtrl,
                      keyboardType: TextInputType.text,
                      style: const TextStyle(color: AppColors.textPrimary),
                      decoration:
                          const InputDecoration(hintText: 'Latitude'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _lngCtrl,
                      keyboardType: TextInputType.text,
                      style: const TextStyle(color: AppColors.textPrimary),
                      decoration:
                          const InputDecoration(hintText: 'Longitude'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: GlassGhostButton(
                      label: 'Usar GPS',
                      icon: Icons.gps_fixed_rounded,
                      height: 46,
                      onPressed: _useGps,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: GlassGhostButton(
                      label: 'Escolher no mapa',
                      icon: Icons.map_rounded,
                      height: 46,
                      onPressed: _pickOnMap,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // ── Fotos ────────────────────────────────────────────
              Text(
                'FOTOS DO EXTERIOR (${_photos.length}/4)',
                style: _sectionLabel,
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (var i = 0; i < _photos.length; i++)
                    Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: Image.file(
                            File(_photos[i].path),
                            width: 86,
                            height: 86,
                            fit: BoxFit.cover,
                          ),
                        ),
                        Positioned(
                          right: -6,
                          top: -6,
                          child: IconButton(
                            onPressed: () => _removePhoto(i),
                            icon: const Icon(Icons.cancel_rounded,
                                color: AppColors.danger, size: 22),
                          ),
                        ),
                      ],
                    ),
                  if (_photos.length < 4)
                    GestureDetector(
                      onTap: _pickPhotos,
                      child: Container(
                        width: 86,
                        height: 86,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                              color: Colors.white.withOpacity(0.15)),
                        ),
                        child: const Icon(Icons.add_a_photo_rounded,
                            color: AppColors.textMuted, size: 24),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                '3–4 fotos da fachada ajudam a aprovação e aparecem no '
                'directório como na versão web.',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.45),
                  fontSize: 11,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 14),

              // ── Descrição ────────────────────────────────────────
              TextField(
                controller: _description,
                maxLines: 3,
                style: const TextStyle(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                  hintText:
                      'Descrição (ex.: aberta 24h, tem materno-infantil…)',
                ),
              ),

              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!,
                    style: const TextStyle(
                        color: Color(0xFFFCA5A5), fontSize: 13)),
              ],

              const SizedBox(height: 20),
              GradientButton(
                label: 'Enviar para análise',
                icon: Icons.send_rounded,
                loading: _submitting,
                enabled: _valid,
                onPressed: _submit,
              ),
              const SizedBox(height: 10),
              Text(
                'Recompensa paga após aprovação do gestor regional do teu '
                'país.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.4),
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _successView() {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 78,
                    height: 78,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Color(0x1A22C55E),
                    ),
                    child: const Icon(Icons.task_alt_rounded,
                        color: AppColors.success, size: 42),
                  ),
                  const SizedBox(height: 18),
                  const Text(
                    'Submissão enviada!',
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'O gestor regional vai analisar. Ficas com a recompensa '
                    'na carteira quando for aprovada — acompanha o estado '
                    'em "Ganhe com o MedWallet".',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.6),
                      fontSize: 13,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 22),
                  GradientButton(
                    label: 'Voltar',
                    icon: Icons.check_rounded,
                    onPressed: () => context.pop(),
                  ),
                ],
              ),
            ),
          ),
        ),
      ).animate().fadeIn(duration: 300.ms),
    );
  }
}

const _sectionLabel = TextStyle(
  color: AppColors.textMuted,
  fontSize: 11,
  fontWeight: FontWeight.w800,
  letterSpacing: 1.2,
);

class _TypeChip extends StatelessWidget {
  const _TypeChip({
    required this.label,
    required this.icon,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected
              ? color.withOpacity(0.18)
              : Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(13),
          border: Border.all(
            color: selected
                ? color.withOpacity(0.6)
                : Colors.white.withOpacity(0.1),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon,
                size: 15, color: selected ? color : AppColors.textMuted),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color:
                    selected ? AppColors.textPrimary : AppColors.textMuted,
                fontSize: 12.3,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
