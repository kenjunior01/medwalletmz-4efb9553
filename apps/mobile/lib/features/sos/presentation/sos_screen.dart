import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../core/config.dart';
import '../data/sos_models.dart';
import 'sos_controller.dart';

/// SOS Emergência — botão de pânico com activação por pressão (2,5 s),
/// resumo médico para socorristas, contactos de emergência e histórico
/// de alertas em tempo real.
class SosScreen extends ConsumerStatefulWidget {
  const SosScreen({super.key});

  @override
  ConsumerState<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends ConsumerState<SosScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _hold =
      AnimationController(vsync: this, duration: const Duration(seconds: 3))
        ..addListener(() {
          if (mounted) setState(() {});
        })
        ..addStatusListener((status) {
          if (status == AnimationStatus.completed) _activate();
        });

  String? _bloodType;
  final _conditionsCtrl = TextEditingController();
  final _allergiesCtrl = TextEditingController();
  bool _activating = false;
  String? _activatedId;

  static const _bloodTypes = [
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
  ];

  @override
  void dispose() {
    _hold.dispose();
    _conditionsCtrl.dispose();
    _allergiesCtrl.dispose();
    super.dispose();
  }

  Future<void> _activate() async {
    if (_activating) return;
    HapticFeedback.heavyImpact();
    setState(() => _activating = true);
    try {
      final id = await ref.read(sosRepositoryProvider).activate(
            bloodType: _bloodType,
            chronicConditions: _conditionsCtrl.text
                .split(',')
                .map((s) => s.trim())
                .where((s) => s.isNotEmpty)
                .toList(),
            allergies: _allergiesCtrl.text
                .split(',')
                .map((s) => s.trim())
                .where((s) => s.isNotEmpty)
                .toList(),
            city: null,
            countryId: AppConfig.defaultCountry,
            anonymousPhone: null,
          );
      _activatedId = id;
      if (mounted && id != null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          backgroundColor: AppColors.danger,
          duration: Duration(seconds: 4),
          content: Text(
              'SOS activado. Os teus contactos de emergência foram '
              'notificados.'),
        ));
      }
    } finally {
      if (mounted) setState(() => _activating = false);
    }
  }

  Future<void> _addContact() async {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final relCtrl = TextEditingController();
    bool primary = false;

    final ok = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Container(
          padding: EdgeInsets.fromLTRB(
              22, 18, 22, MediaQuery.of(ctx).viewInsets.bottom + 20),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
                colors: [AppColors.bgHigh, AppColors.bgDeep]),
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Novo contacto de emergência',
                style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 17,
                    fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 4),
              Text(
                'Será notificado quando activares um SOS.',
                style: TextStyle(
                    color: Colors.white.withOpacity(0.55), fontSize: 12.5),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: nameCtrl,
                style: const TextStyle(color: AppColors.textPrimary),
                decoration:
                    const InputDecoration(labelText: 'Nome *'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                style: const TextStyle(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                    labelText: 'Telefone *', hintText: '+258 84 123 4567'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: relCtrl,
                style: const TextStyle(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                    labelText: 'Relação (mãe, irmão, médico…)'),
              ),
              const SizedBox(height: 10),
              SwitchListTile(
                value: primary,
                onChanged: (v) => setSheet(() => primary = v),
                activeColor: AppColors.accent,
                contentPadding: EdgeInsets.zero,
                title: const Text(
                  'Contacto principal',
                  style: TextStyle(
                      color: AppColors.textPrimary, fontSize: 13.5),
                ),
              ),
              const SizedBox(height: 12),
              GradientButton(
                label: 'Adicionar',
                icon: Icons.person_add_alt_rounded,
                onPressed: () => Navigator.of(ctx).pop(true),
              ),
            ],
          ),
        ),
      ),
    );
    if (ok != true) return;
    if (nameCtrl.text.trim().isEmpty || phoneCtrl.text.trim().isEmpty) {
      return;
    }
    try {
      await ref.read(sosRepositoryProvider).addContact(
            name: nameCtrl.text.trim(),
            phone: phoneCtrl.text.trim(),
            relationship: relCtrl.text.trim(),
            isPrimary: primary,
          );
      ref.invalidate(sosContactsProvider);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          backgroundColor: AppColors.danger,
          content: Text('Não foi possível adicionar o contacto.'),
        ));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final contacts = ref.watch(sosContactsProvider);
    final alerts = ref.watch(mySosAlertsProvider);
    SosAlert? activeAlert;
    for (final a in alerts.value ?? const <SosAlert>[]) {
      if (a.isActive) {
        activeAlert = a;
        break;
      }
    }

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
                      'SOS Emergência',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // ── Estado activo ou botão ──────────────────────────
              if (activeAlert != null)
                _ActiveAlertCard(
                  alert: activeAlert,
                  onCancel: () async {
                    final alert = activeAlert;
                    if (alert == null) return;
                    await ref
                        .read(sosRepositoryProvider)
                        .cancel(alert.id);
                  },
                )
              else
                _HoldButton(
                  progress: _activating ? 1 : _hold.value,
                  onHoldStart: _activating ? null : _hold.forward,
                  onHoldEnd: _activating ? null : _hold.reverse,
                ),
              const SizedBox(height: 18),

              // ── Resumo médico ───────────────────────────────────
              _SectionCard(
                title: 'Resumo médico para socorristas',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Grupo sanguíneo',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final t in _bloodTypes)
                          GestureDetector(
                            onTap: () => setState(() => _bloodType = t),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 7),
                              decoration: BoxDecoration(
                                color: _bloodType == t
                                    ? AppColors.danger.withOpacity(0.25)
                                    : AppColors.glassFill,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: _bloodType == t
                                      ? AppColors.danger
                                      : AppColors.glassBorder,
                                ),
                              ),
                              child: Text(
                                t,
                                style: TextStyle(
                                  color: _bloodType == t
                                      ? Colors.white
                                      : AppColors.textSecondary,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _conditionsCtrl,
                      style: const TextStyle(
                          color: AppColors.textPrimary, fontSize: 13),
                      decoration: const InputDecoration(
                        labelText: 'Condições crónicas (separadas por ,)',
                        hintText: 'Ex.: asma, diabetes',
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _allergiesCtrl,
                      style: const TextStyle(
                          color: AppColors.textPrimary, fontSize: 13),
                      decoration: const InputDecoration(
                        labelText: 'Alergias (separadas por ,)',
                        hintText: 'Ex.: penicilina, amendoim',
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // ── SMS de emergência (exclusivo móvel — funciona SEM internet) ──
              _SmsEmergencyCard(
                bloodType: _bloodType,
                conditions: _conditionsCtrl.text,
                allergies: _allergiesCtrl.text,
                contacts: contacts.value ?? const [],
              ),
              const SizedBox(height: 16),

              // ── Contactos ───────────────────────────────────────
              _SectionCard(
                title: 'Contactos de emergência',
                trailing: IconButton(
                  onPressed: _addContact,
                  icon: const Icon(Icons.person_add_alt_rounded,
                      color: AppColors.accent, size: 20),
                ),
                child: contacts.when(
                  loading: () => const ListSkeleton(count: 2, itemHeight: 56),
                  error: (_, __) => const Text(
                    'Não foi possível carregar os contactos.',
                    style: TextStyle(color: AppColors.textSecondary,
                        fontSize: 12.5),
                  ),
                  data: (list) {
                    if (list.isEmpty) {
                      return const Text(
                        'Ainda não tens contactos. Adiciona família ou '
                        'amigos próximos — serão avisados num SOS.',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12.5,
                          height: 1.5,
                        ),
                      );
                    }
                    return Column(
                      children: [
                        for (final c in list)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 16,
                                  backgroundColor:
                                      const Color(0x2EF87171),
                                  child: Text(
                                    initials(c.name),
                                    style: const TextStyle(
                                      color: Color(0xFFF87171),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Flexible(
                                            child: Text(
                                              c.name,
                                              maxLines: 1,
                                              overflow:
                                                  TextOverflow.ellipsis,
                                              style: const TextStyle(
                                                color: AppColors
                                                    .textPrimary,
                                                fontWeight: FontWeight.w700,
                                                fontSize: 13,
                                              ),
                                            ),
                                          ),
                                          if (c.isPrimary) ...[
                                            const SizedBox(width: 6),
                                            const Icon(Icons.star_rounded,
                                                color: Color(0xFFFBBF24),
                                                size: 14),
                                          ],
                                        ],
                                      ),
                                      Text(
                                        '${c.phone}'
                                        '${c.relationship == null ? '' : ' · ${c.relationship}'}',
                                        style: TextStyle(
                                          color: Colors.white
                                              .withOpacity(0.45),
                                          fontSize: 11,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  tooltip: 'Remover',
                                  onPressed: () async {
                                    await ref
                                        .read(sosRepositoryProvider)
                                        .deleteContact(c.id);
                                    ref.invalidate(sosContactsProvider);
                                  },
                                  icon: const Icon(
                                      Icons.delete_outline_rounded,
                                      color: AppColors.textMuted,
                                      size: 19),
                                ),
                              ],
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),

              // ── Histórico ───────────────────────────────────────
              if (alerts.value?.isNotEmpty == true) ...[
                _SectionCard(
                  title: 'Histórico de alertas',
                  child: Column(
                    children: [
                      for (final a in alerts.value!)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            children: [
                              Icon(
                                a.isActive
                                    ? Icons.emergency_rounded
                                    : Icons.history_rounded,
                                color: a.isActive
                                    ? AppColors.danger
                                    : AppColors.textMuted,
                                size: 18,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  '${formatDateTime(a.activatedAt)} · '
                                  '${_statusLabel(a.status)}',
                                  style: TextStyle(
                                    color: Colors.white.withOpacity(0.6),
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _statusLabel(String s) => switch (s) {
        'active' => 'Activo',
        'acknowledged' => 'Reconhecido',
        'resolved' => 'Resolvido',
        'cancelled' => 'Cancelado',
        'false_alarm' => 'Falso alarme',
        _ => s,
      };
}

// ── Botão de pânico com pressão contínua ────────────────────────────

class _HoldButton extends StatelessWidget {
  const _HoldButton({
    required this.progress,
    required this.onHoldStart,
    required this.onHoldEnd,
  });

  final double progress;
  final VoidCallback? onHoldStart;
  final VoidCallback? onHoldEnd;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        GestureDetector(
          onTapDown: (_) => onHoldStart?.call(),
          onTapUp: (_) => onHoldEnd?.call(),
          onTapCancel: onHoldEnd,
          child: Container(
            width: 190,
            height: 190,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.danger.withOpacity(0.12),
              boxShadow: [
                BoxShadow(
                  color: AppColors.danger.withOpacity(0.25 + progress * 0.4),
                  blurRadius: 40 + progress * 30,
                  spreadRadius: 4 + progress * 10,
                ),
              ],
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 190,
                  height: 190,
                  child: CircularProgressIndicator(
                    value: progress,
                    strokeWidth: 6,
                    color: Colors.white,
                    backgroundColor: AppColors.danger.withOpacity(0.2),
                    strokeCap: StrokeCap.round,
                  ),
                ),
                Container(
                  width: 152,
                  height: 152,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFFF87171), Color(0xFFDC2626)],
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.emergency_rounded,
                          color: Colors.white, size: 52),
                      const SizedBox(height: 6),
                      Text(
                        progress > 0
                            ? 'MANTÉM…'
                            : 'MANTÉM PREMIDO',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                          letterSpacing: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Pressiona 3 segundos para activar o alerta com a tua '
          'localização.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.white.withOpacity(0.5),
            fontSize: 12,
            height: 1.45,
          ),
        ),
      ],
    ).animate().fadeIn(duration: 260.ms).scale(
          begin: const Offset(0.94, 0.94),
          curve: Curves.easeOutBack,
        );
  }
}

class _ActiveAlertCard extends StatelessWidget {
  const _ActiveAlertCard({required this.alert, required this.onCancel});

  final SosAlert alert;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.danger.withOpacity(0.12),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.danger.withOpacity(0.5)),
      ),
      child: Column(
        children: [
          const Icon(Icons.emergency_rounded,
              color: AppColors.danger, size: 44),
          const SizedBox(height: 10),
          const Text(
            'SOS ACTIVO',
            style: TextStyle(
              color: AppColors.danger,
              fontWeight: FontWeight.w800,
              fontSize: 20,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Estado: ${alert.status == 'acknowledged'
                ? 'reconhecido pela equipa'
                : 'à espera de ajuda'}'
            '${alert.latitude != null ? ' · localização partilhada' : ''}',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12.5,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 14),
          GlassGhostButton(
            label: 'Estou bem — cancelar alerta',
            icon: Icons.check_rounded,
            onPressed: onCancel,
          ),
        ],
      ),
    ).animate(onPlay: (c) => c.repeat(reverse: true)).shimmer(
          duration: 1600.ms,
          color: Colors.white.withOpacity(0.06),
        );
  }
}

// ── Cartão de secção genérico ───────────────────────────────────────

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.child,
    this.trailing,
  });

  final String title;
  final Widget child;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
              ),
              if (trailing != null) trailing!,
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

/// ── SMS de emergência (EXCLUSIVO MÓVEL) ─────────────────────────────
///
/// Rede móvel sem dados continua a transportar SMS — em Moçambique é a
/// forma mais fiável de pedir socorro quando a internet cai. Este cartão
/// abre a app de mensagens com o resumo médico já escrito (grupo
/// sanguíneo, condições, alergias) e a localização GPS como link do
/// Google Maps, dirigido aos contactos de emergência guardados e aos
/// números oficiais (117 · 119 · 198).
class _SmsEmergencyCard extends StatelessWidget {
  const _SmsEmergencyCard({
    required this.bloodType,
    required this.conditions,
    required this.allergies,
    required this.contacts,
  });

  final String? bloodType;
  final String conditions;
  final String allergies;
  final List<EmergencyContact> contacts;

  static const _officialNumbers = <(String, String, IconData)>[
    ('117', 'Ambulância', Icons.local_hospital_rounded),
    ('119', 'Polícia', Icons.local_police_rounded),
    ('198', 'Bombeiros', Icons.fire_truck_rounded),
  ];

  Future<String?> _positionLink() async {
    try {
      final permission = await Geolocator.checkPermission();
      var granted = permission == LocationPermission.whileInUse ||
          permission == LocationPermission.always;
      if (!granted) {
        final asked = await Geolocator.requestPermission();
        granted = asked == LocationPermission.whileInUse ||
            asked == LocationPermission.always;
      }
      if (!granted) return null;
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium),
      ).timeout(const Duration(seconds: 8));
      return 'https://maps.google.com/?q='
          '${pos.latitude.toStringAsFixed(6)},${pos.longitude.toStringAsFixed(6)}';
    } catch (_) {
      return null;
    }
  }

  Future<String> _buildBody() async {
    final b = StringBuffer('EMERGENCIA MEDICA! Preciso de ajuda urgente.');
    if (bloodType != null && bloodType!.isNotEmpty) {
      b.write(' Grupo sanguineo: $bloodType.');
    }
    final cond = conditions.trim();
    if (cond.isNotEmpty) b.write(' Condicoes: $cond.');
    final alg = allergies.trim();
    if (alg.isNotEmpty) b.write(' Alergias: $alg.');
    final link = await _positionLink();
    if (link != null) b.write(' Localizacao: $link');
    return b.toString();
  }

  Future<void> _send(String phone) async {
    final body = await _buildBody();
    final clean = phone.replaceAll(RegExp(r'[^\d+]'), '');
    if (clean.isEmpty) return;
    final uri = Uri(
      scheme: 'sms',
      path: clean,
      queryParameters: {'body': body},
    );
    try {
      await launchUrl(uri);
    } catch (_) {}
  }

  Future<void> _sendToAll() async {
    for (final c in contacts) {
      if (c.phone.trim().isNotEmpty) await _send(c.phone);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.warning.withOpacity(0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.warning.withOpacity(0.15),
                  border:
                      Border.all(color: AppColors.warning.withOpacity(0.4)),
                ),
                child: const Icon(Icons.sms_failed_rounded,
                    color: AppColors.warning, size: 20),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'SMS de emergência',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.success.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                  border:
                      Border.all(color: AppColors.success.withOpacity(0.4)),
                ),
                child: const Text(
                  'SEM INTERNET',
                  style: TextStyle(
                    color: AppColors.success,
                    fontSize: 9.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            'Abre a app de mensagens com o teu resumo médico e a '
            'localização GPS já escritos — só precisa de rede móvel, '
            'nem dados nem Wi-Fi.',
            style: TextStyle(
              color: Colors.white.withOpacity(0.6),
              fontSize: 12,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 14),
          if (contacts.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: GestureDetector(
                onTap: () {
                  HapticFeedback.mediumImpact();
                  _sendToAll();
                },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                        colors: AppColors.buttonGradient),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.forward_to_inbox_rounded,
                          color: Colors.white, size: 18),
                      const SizedBox(width: 8),
                      Text(
                        'Enviar SMS aos meus contactos (${contacts.length})',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          Row(
            children: [
              for (final (num, label, icon) in _officialNumbers) ...[
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      HapticFeedback.selectionClick();
                      _send(num);
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: AppColors.glassFill,
                        borderRadius: BorderRadius.circular(12),
                        border:
                            Border.all(color: AppColors.glassBorder),
                      ),
                      child: Column(
                        children: [
                          Icon(icon, color: AppColors.accent, size: 20),
                          const SizedBox(height: 4),
                          Text(
                            num,
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text(
                            label,
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.45),
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                if (num != '198') const SizedBox(width: 8),
              ],
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 320.ms);
  }
}
