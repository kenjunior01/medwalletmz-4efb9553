import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/skeleton.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/notification_models.dart';
import 'notifications_controller.dart';

/// Preferências de notificação — gravadas via RPC oficial
/// `upsert_notification_preferences`, com horas de silêncio.
class NotificationPrefsScreen extends ConsumerStatefulWidget {
  const NotificationPrefsScreen({super.key});

  @override
  ConsumerState<NotificationPrefsScreen> createState() =>
      _NotificationPrefsScreenState();
}

class _NotificationPrefsScreenState
    extends ConsumerState<NotificationPrefsScreen> {
  NotificationPrefs? _prefs;
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final uid = ref.read(currentUserIdProvider);
    if (uid == null) {
      setState(() => _loading = false);
      return;
    }
    try {
      final prefs =
          await ref.read(notificationRepositoryProvider).fetchPrefs(uid);
      if (!mounted) return;
      setState(() => _prefs = prefs);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Não foi possível carregar as preferências.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    final uid = ref.read(currentUserIdProvider);
    final prefs = _prefs;
    if (uid == null || prefs == null || _saving) return;
    setState(() => _saving = true);
    try {
      await ref.read(notificationRepositoryProvider).savePrefs(uid, prefs);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Preferências guardadas com sucesso.'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Não foi possível guardar. Tenta de novo.'),
          backgroundColor: AppColors.danger,
        ),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: _loading
              ? ListView(
                  padding: EdgeInsets.all(20),
                  children: [ListSkeleton(count: 5, itemHeight: 72)],
                )
              : ListView(
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
                            'Preferências de notificação',
                            style: TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 19,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Escolhe o que queres receber e quando. As horas de '
                      'silêncio evitam alertas durante o descanso.',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.55),
                        fontSize: 13,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 18),

                    if (_prefs != null) ...[
                      _ToggleCard(
                        emoji: '🌅',
                        title: 'Check-in diário de saúde',
                        subtitle:
                            'Lembrete diário para registares como te sentes '
                            'e manter a tua rotina de saúde.',
                        value: _prefs!.dailyHealthCheckin,
                        onChanged: (v) => setState(
                            () => _prefs = _copy(dailyHealthCheckin: v)),
                      ),
                      _ToggleCard(
                        emoji: '💡',
                        title: 'Recomendações de saúde',
                        subtitle:
                            'Dicas personalizadas, campanhas e comunicados '
                            'da comunidade MedWallet.',
                        value: _prefs!.dailyHealthRecommendations,
                        onChanged: (v) => setState(() =>
                            _prefs =
                                _copy(dailyHealthRecommendations: v)),
                      ),
                      _ToggleCard(
                        emoji: '🩺',
                        title: 'Atualizações de consultas',
                        subtitle:
                            'Confirmações, lembretes e mensagens de '
                            'especialistas sobre as tuas consultas.',
                        value: _prefs!.consultationUpdates,
                        onChanged: (v) => setState(
                            () => _prefs = _copy(consultationUpdates: v)),
                      ),
                      _ToggleCard(
                        emoji: '💳',
                        title: 'Movimentos da carteira',
                        subtitle:
                            'Depósitos, pagamentos e recompensas recebidas '
                            'na tua carteira.',
                        value: _prefs!.orderUpdates,
                        onChanged: (v) =>
                            setState(() => _prefs = _copy(orderUpdates: v)),
                      ),
                      const SizedBox(height: 10),
                      _QuietHoursCard(
                        prefs: _prefs!,
                        onChanged: (start, end) => setState(
                            () => _prefs = _copy(
                                quietHoursStart: start,
                                quietHoursEnd: end)),
                      ),
                    ],

                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(_error!,
                          style: const TextStyle(
                              color: Color(0xFFFCA5A5), fontSize: 13)),
                    ],

                    const SizedBox(height: 18),
                    GradientButton(
                      label: 'Guardar preferências',
                      icon: Icons.check_rounded,
                      loading: _saving,
                      enabled: _prefs != null,
                      onPressed: _save,
                    ),

                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.glassFill,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.glassBorder),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.privacy_tip_rounded,
                              color: AppColors.accent, size: 18),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Alertas de emergência (SOS) ignoram as horas '
                              'de silêncio por segurança.',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.6),
                                fontSize: 12,
                                height: 1.4,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ).animate().fadeIn(duration: 300.ms),
                  ],
                ),
        ),
      ),
    );
  }

  NotificationPrefs _copy({
    bool? dailyHealthCheckin,
    bool? dailyHealthRecommendations,
    bool? consultationUpdates,
    bool? orderUpdates,
    int? quietHoursStart,
    int? quietHoursEnd,
  }) =>
      NotificationPrefs(
        dailyHealthCheckin:
            dailyHealthCheckin ?? _prefs!.dailyHealthCheckin,
        dailyHealthRecommendations: dailyHealthRecommendations ??
            _prefs!.dailyHealthRecommendations,
        consultationUpdates:
            consultationUpdates ?? _prefs!.consultationUpdates,
        orderUpdates: orderUpdates ?? _prefs!.orderUpdates,
        quietHoursStart: quietHoursStart ?? _prefs!.quietHoursStart,
        quietHoursEnd: quietHoursEnd ?? _prefs!.quietHoursEnd,
      );
}

// ── Cartão de toggle ────────────────────────────────────────────────────

class _ToggleCard extends StatelessWidget {
  const _ToggleCard({
    required this.emoji,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  final String emoji;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: const Color(0x141E6B9C),
              borderRadius: BorderRadius.circular(13),
            ),
            child: Text(emoji, style: const TextStyle(fontSize: 18)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w700,
                    fontSize: 13.8,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.55),
                    fontSize: 11.8,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
          Switch.adaptive(
            value: value,
            activeColor: AppColors.accent,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}

// ── Horas de silêncio ───────────────────────────────────────────────────

class _QuietHoursCard extends StatelessWidget {
  const _QuietHoursCard({required this.prefs, required this.onChanged});

  final NotificationPrefs prefs;
  final void Function(int start, int end) onChanged;

  String _label(int h) =>
      '${h.toString().padLeft(2, '0')}:00';

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.bedtime_rounded,
                  color: Color(0xFFA78BFA), size: 18),
              SizedBox(width: 8),
              Text(
                'Horas de silêncio',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w700,
                  fontSize: 13.8,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Notificações não urgentes ficam em pausa entre '
            '${_label(prefs.quietHoursStart)} e ${_label(prefs.quietHoursEnd)}.',
            style: TextStyle(
              color: Colors.white.withOpacity(0.55),
              fontSize: 11.8,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _HourDropdown(
                  value: prefs.quietHoursStart,
                  label: 'Início',
                  onChanged: (v) =>
                      onChanged(v, prefs.quietHoursEnd),
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 10),
                child: Icon(Icons.arrow_forward_rounded,
                    size: 16, color: AppColors.textMuted),
              ),
              Expanded(
                child: _HourDropdown(
                  value: prefs.quietHoursEnd,
                  label: 'Fim',
                  onChanged: (v) =>
                      onChanged(prefs.quietHoursStart, v),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HourDropdown extends StatelessWidget {
  const _HourDropdown({
    required this.value,
    required this.label,
    required this.onChanged,
  });

  final int value;
  final String label;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppColors.textMuted,
            fontSize: 11,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.glassBorder),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<int>(
              value: value,
              isExpanded: true,
              dropdownColor: const Color(0xFF0B1D31),
              style: const TextStyle(
                  color: AppColors.textPrimary, fontSize: 13.5),
              items: [
                for (var h = 0; h <= 23; h++)
                  DropdownMenuItem(
                    value: h,
                    child: Text('${h.toString().padLeft(2, '0')}:00'),
                  ),
              ],
              onChanged: (v) {
                if (v != null) onChanged(v);
              },
            ),
          ),
        ),
      ],
    );
  }
}
