import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/l10n/locale_provider.dart';
import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../core/widgets/wallet_card.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../bookings/domain/booking_models.dart';
import '../../bookings/presentation/bookings_controller.dart';
import '../../notifications/presentation/notifications_controller.dart';
import '../../regional/data/regional_models.dart';
import '../../services/presentation/services_controller.dart';
import '../../wallet/presentation/deposit_sheet.dart';
import '../../wallet/presentation/wallet_controller.dart';
import 'regional_banner.dart';

/// Início: saudação, cartão de saldo, ações rápidas, próxima consulta
/// e médicos em destaque.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileProvider);
    final wallet = ref.watch(walletStreamProvider);
    final hidden = ref.watch(balanceHiddenProvider);
    final consults = ref.watch(myConsultationsProvider);
    final locale = ref.watch(localeProvider);
    final roles =
        ref.watch(userRolesProvider).valueOrNull ?? const <String>[];
    final isManager = roles.any(managerRoles.contains);

    final upcoming = consults.value
        ?.where((c) => c.scheduledAt.isAfter(DateTime.now()))
        .toList();
    final nextConsultation =
        (upcoming != null && upcoming.isNotEmpty) ? upcoming.first : null;

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
            children: [
              // ── Saudação ────────────────────────────────────────────
              Row(
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const LinearGradient(
                          colors: AppColors.heroCardGradient),
                      border:
                          Border.all(color: Colors.white.withOpacity(0.2)),
                    ),
                    child: Text(
                      initials(profile.value?.fullName),
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _greeting(),
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.55),
                            fontSize: 12.5,
                          ),
                        ),
                        profile.when(
                          loading: () =>
                              const AppSkeleton(width: 120, height: 18),
                          error: (_, __) => const Text(
                            'Utilizador',
                            style: TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          data: (p) => Text(
                            firstName(p?.fullName),
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // F11 — Meddy 🐻: chat IA directo do ecrã principal.
                  IconButton(
                    onPressed: () => context.push('/meddy'),
                    tooltip: 'Falar com o Meddy',
                    icon: Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        gradient:
                            const LinearGradient(colors: AppColors.buttonGradient),
                        borderRadius: BorderRadius.circular(10),
                        boxShadow: const [
                          BoxShadow(color: AppColors.glowCyan, blurRadius: 10),
                        ],
                      ),
                      child: const Center(
                        child: Text('🐻', style: TextStyle(fontSize: 17)),
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => context.push('/notifications'),
                    icon: Consumer(builder: (context, ref, _) {
                      final unread = ref.watch(unreadNotificationsProvider);
                      return Badge(
                        isLabelVisible: unread > 0,
                        label: Text('$unread'),
                        backgroundColor: AppColors.danger,
                        child: const Icon(Icons.notifications_rounded,
                            color: AppColors.textSecondary),
                      );
                    }),
                  ),
                ],
              ).animate().fadeIn(duration: 300.ms),

              const SizedBox(height: 18),

              // ── Cartão de saldo (mini) ──────────────────────────────
              WalletCard(
                mini: true,
                balance: wallet.value?.balance ?? 0,
                ownerName: profile.value?.fullName,
                hidden: hidden,
                onTap: () => context.go('/wallet'),
              )
                  .animate(delay: 80.ms)
                  .fadeIn(duration: 350.ms)
                  .slideY(begin: 0.12),

              const SizedBox(height: 18),

              // ── Ações rápidas ───────────────────────────────────────
              Row(
                children: [
                  _QuickAction(
                    icon: Icons.add_card_rounded,
                    label: tr(S.deposit, locale),
                    tint: AppColors.teal,
                    onTap: () => _deposit(context, ref),
                  ),
                  _QuickAction(
                    icon: Icons.medical_services_rounded,
                    label: tr(S.services, locale),
                    tint: AppColors.accent,
                    onTap: () => context.go('/services'),
                  ),
                  _QuickAction(
                    icon: Icons.auto_awesome_rounded,
                    label: tr(S.triage, locale),
                    tint: _Tints.violet,
                    onTap: () => context.push('/triage'),
                  ),
                  _QuickAction(
                    icon: Icons.location_on_rounded,
                    label: tr(S.institutions, locale),
                    tint: _Tints.green,
                    onTap: () => context.go('/facilities'),
                  ),
                ],
              )
                  .animate()
                  .fadeIn(duration: 320.ms)
                  .slideY(begin: 0.15, curve: Curves.easeOutCubic),

              const SizedBox(height: 12),

              // ── Ações rápidas (fila 2) ──────────────────────────────
              Row(
                children: [
                  _QuickAction(
                    icon: Icons.forum_rounded,
                    label: tr(S.chats, locale),
                    tint: _Tints.blue,
                    onTap: () => context.push('/chats'),
                  ),
                  _QuickAction(
                    icon: Icons.description_rounded,
                    label: tr(S.prescriptions, locale),
                    tint: _Tints.amber,
                    onTap: () => context.push('/prescriptions'),
                  ),
                  _QuickAction(
                    icon: Icons.medication_rounded,
                    label: tr(S.meds, locale),
                    tint: _Tints.pink,
                    onTap: () => context.push('/meds'),
                  ),
                  _QuickAction(
                    icon: Icons.emergency_rounded,
                    label: tr(S.sos, locale),
                    tint: AppColors.danger,
                    onTap: () => context.push('/sos'),
                  ),
                ],
              )
                  .animate()
                  .fadeIn(duration: 320.ms)
                  .slideY(begin: 0.15, curve: Curves.easeOutCubic),

              const SizedBox(height: 12),

              // ── Ações rápidas (fila 3) ──────────────────────────────
              Row(
                children: [
                  _QuickAction(
                    icon: Icons.biotech_rounded,
                    label: tr(S.labs, locale),
                    tint: _Tints.green,
                    onTap: () => context.push('/labs'),
                  ),
                  _QuickAction(
                    icon: Icons.savings_rounded,
                    label: tr(S.earn, locale),
                    tint: AppColors.teal,
                    onTap: () => context.push('/earn'),
                  ),
                  _QuickAction(
                    icon: Icons.shield_outlined,
                    label: tr(S.insurance, locale),
                    tint: _Tints.blue,
                    onTap: () => context.push('/insurance'),
                  ),
                  _QuickAction(
                    icon: Icons.groups_rounded,
                    label: tr(S.circles, locale),
                    tint: _Tints.violet,
                    onTap: () => context.push('/circles'),
                  ),
                ],
              )
                  .animate()
                  .fadeIn(duration: 320.ms)
                  .slideY(begin: 0.15, curve: Curves.easeOutCubic),

              const SizedBox(height: 12),

              // ── Ações rápidas (fila 4) ──────────────────────────────
              Row(
                children: [
                  _QuickAction(
                    icon: Icons.folder_shared_rounded,
                    label: tr(S.records, locale),
                    tint: AppColors.accent,
                    onTap: () => context.push('/records'),
                  ),
                  _QuickAction(
                    icon: Icons.card_giftcard_rounded,
                    label: tr(S.referrals, locale),
                    tint: _Tints.pink,
                    onTap: () => context.push('/referrals'),
                  ),
                  _QuickAction(
                    icon: Icons.event_note_rounded,
                    label: tr(S.consultations, locale),
                    tint: _Tints.amber,
                    onTap: () => context.push('/bookings'),
                  ),
                  if (isManager)
                    _QuickAction(
                      icon: Icons.admin_panel_settings_rounded,
                      label: tr(S.management, locale),
                      tint: _Tints.violet,
                      onTap: () => context.push('/manager-hub'),
                    )
                  else
                    _QuickAction(
                      icon: Icons.emergency_rounded,
                      label: 'SOS',
                      tint: AppColors.danger,
                      onTap: () => context.push('/sos'),
                    ),
                ],
              )
                  .animate()
                  .fadeIn(duration: 320.ms)
                  .slideY(begin: 0.15, curve: Curves.easeOutCubic),

              const SizedBox(height: 24),

              // ── Próxima consulta ────────────────────────────────────
              if (nextConsultation != null) ...[
                _NextConsultationCard(consultation: nextConsultation)
                    .animate()
                    .fadeIn(duration: 350.ms)
                    .slideY(begin: 0.1),
                const SizedBox(height: 24),
              ],

              // ── Conteúdo regional da gestão ──────────────────────────
              const RegionalBanner(),
              const SizedBox(height: 16),

              // ── Banner bónus ────────────────────────────────────────
              _PromoBanner(onTap: () => _deposit(context, ref))
                  .animate(delay: 150.ms)
                  .fadeIn(duration: 350.ms),

              const SizedBox(height: 24),

              // ── Médicos em destaque ─────────────────────────────────
              Row(
                children: [
                  const Text(
                    'Cuidados em destaque',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.6,
                    ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () => context.go('/services'),
                    child: const Text(
                      'Ver todos',
                      style: TextStyle(
                          color: AppColors.accent,
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
              const _FeaturedDoctors(),
            ],
          ),
        ),
      ),
    );
  }

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Bom dia ☀️';
    if (h < 18) return 'Boa tarde 🌤️';
    return 'Boa noite 🌙';
  }

  Future<void> _deposit(BuildContext context, WidgetRef ref) async {
    final uid = ref.read(currentUserIdProvider);
    if (uid == null) return;
    final profile = ref.read(profileProvider).value;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DepositSheet(
        userId: uid,
        payerName: profile?.fullName ?? 'Utilizador MedWallet',
        payerPhone:
            profile?.phone ?? Supabase.instance.client.auth.currentUser?.phone,
      ),
    );
  }

}

// ══════════════════════════════════════════════════════════════════
// Componentes locais
// ══════════════════════════════════════════════════════════════════

class _QuickAction extends StatefulWidget {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.onTap,
    required this.tint,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color tint;

  @override
  State<_QuickAction> createState() => _QuickActionState();
}

class _QuickActionState extends State<_QuickAction> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: (_) => setState(() => _pressed = true),
        onTapCancel: () => setState(() => _pressed = false),
        onTapUp: (_) => setState(() => _pressed = false),
        onTap: () {
          HapticFeedback.selectionClick();
          widget.onTap();
        },
        child: AnimatedScale(
          scale: _pressed ? 0.92 : 1,
          duration: const Duration(milliseconds: 110),
          curve: Curves.easeOut,
          child: Column(
            children: [
              Container(
                height: 56,
                decoration: BoxDecoration(
                  color: widget.tint.withOpacity(_pressed ? 0.24 : 0.12),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: widget.tint.withOpacity(_pressed ? 0.55 : 0.26),
                  ),
                ),
                child: Icon(widget.icon, color: widget.tint, size: 24),
              ),
              const SizedBox(height: 7),
              Text(
                widget.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Paleta de realce das ações rápidas — cada serviço tem a sua cor
/// para leitura instantânea (reconhecimento em vez de memória).
abstract final class _Tints {
  static const Color violet = Color(0xFFA78BFA);
  static const Color green = Color(0xFF34D399);
  static const Color blue = Color(0xFF60A5FA);
  static const Color amber = Color(0xFFF5A623);
  static const Color pink = Color(0xFFF472B6);
}

class _NextConsultationCard extends StatelessWidget {
  const _NextConsultationCard({required this.consultation});

  final Consultation consultation;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/bookings'),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.accent.withOpacity(0.14),
                border: Border.all(color: AppColors.accent.withOpacity(0.35)),
              ),
              child: const Icon(Icons.upcoming_rounded,
                  color: AppColors.accent, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Próxima consulta',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.5),
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    consultation.reason?.isNotEmpty == true
                        ? consultation.reason!
                        : 'Consulta médica',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    formatDateTime(consultation.scheduledAt),
                    style: const TextStyle(
                        color: AppColors.textSecondary, fontSize: 12),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded,
                color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}

class _PromoBanner extends StatelessWidget {
  const _PromoBanner({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0x331E6B9C),
              Color(0x1414B8A6),
            ],
          ),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(colors: AppColors.successGradient),
              ),
              child: const Icon(Icons.card_giftcard_rounded,
                  color: Colors.white, size: 22),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Bónus de depósito',
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 14.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Deposita via M-Pesa e recebe bónus no saldo',
                    style: TextStyle(
                        color: AppColors.textSecondary, fontSize: 12),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_rounded,
                color: AppColors.accent, size: 20),
          ],
        ),
      ),
    );
  }
}

class _FeaturedDoctors extends ConsumerWidget {
  const _FeaturedDoctors();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final doctors = ref.watch(doctorsProvider);

    return doctors.maybeWhen(
      data: (list) {
        final top = list.take(3).toList();
        if (top.isEmpty) {
          return const SizedBox.shrink();
        }
        return Column(
          children: [
            for (final d in top)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.glassFill,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.glassBorder),
                ),
                child: Row(
                  children: [
                    Text(d.specialtyIcon ?? '🩺',
                        style: const TextStyle(fontSize: 24)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            d.specialtyName ?? 'Consulta geral',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Row(
                            children: [
                              const Icon(Icons.star_rounded,
                                  color: AppColors.warning, size: 14),
                              const SizedBox(width: 3),
                              Text(
                                '${d.rating.toStringAsFixed(1)} · ${formatMZN(d.consultationFee)}',
                                style: const TextStyle(
                                    color: AppColors.textMuted,
                                    fontSize: 12),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded,
                        color: AppColors.textMuted),
                  ],
                ),
              ),
          ],
        ).animate().fadeIn(duration: 320.ms);
      },
      orElse: () => const Padding(
        padding: EdgeInsets.only(top: 8),
        child: AppSkeleton(height: 72, radius: 18),
      ),
    );
  }
}
