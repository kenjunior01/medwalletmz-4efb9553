import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../core/widgets/pressable.dart';

/// F33 — Aparência & Movimento: os MODOS da app.
///
///  · Tema: Sistema / Claro ("Clareza Médica") / Escuro ("Noite Médica")
///  · Movimento: efeitos completos ou economia (fundo estático)
///
/// As escolhas persistem em SharedPreferences e aplicam-se a toda a
/// app no momento (rebuild do MaterialApp + tokens dinâmicos).
class AppearanceScreen extends ConsumerWidget {
  const AppearanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(appThemeModeProvider);
    final motion = ref.watch(motionLevelProvider);
    final themeModeController = ref.read(appThemeModeProvider.notifier);
    final motionController = ref.read(motionLevelProvider.notifier);

    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: const Text('Aparência'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: () => context.pop(),
          ),
        ),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
            children: [
              // ── Pré-visualização ao vivo ────────────────────────────
              _PreviewCard(mode: mode),
              const SizedBox(height: 24),

              // ── Tema ────────────────────────────────────────────────
              Text(
                'Modo',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.6,
                ),
              ),
              const SizedBox(height: 10),
              _ModeCard(
                icon: Icons.brightness_auto_rounded,
                title: 'Sistema',
                subtitle: 'Segue o modo claro/escuro do telemóvel',
                selected: mode == AppThemeMode.system,
                onTap: () => themeModeController.setMode(AppThemeMode.system),
              ),
              const SizedBox(height: 10),
              _ModeCard(
                icon: Icons.light_mode_outlined,
                title: 'Claro',
                subtitle: '"Clareza Médica" — tela periwinkle, cartões brancos',
                selected: mode == AppThemeMode.light,
                onTap: () => themeModeController.setMode(AppThemeMode.light),
              ),
              const SizedBox(height: 10),
              _ModeCard(
                icon: Icons.dark_mode_outlined,
                title: 'Escuro',
                subtitle:
                    '"Noite Médica Abissal" — vidro profundo com brilhos ciano',
                selected: mode == AppThemeMode.dark,
                onTap: () => themeModeController.setMode(AppThemeMode.dark),
              ),

              const SizedBox(height: 28),

              // ── Movimento ───────────────────────────────────────────
              Text(
                'Movimento & Efeitos',
                style: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.6,
                ),
              ),
              const SizedBox(height: 10),
              _ModeCard(
                icon: Icons.auto_awesome_rounded,
                title: 'Efeitos completos',
                subtitle:
                    'Fundo vivo com aurora, poeira cintilante e feixes de luz',
                selected: motion == MotionLevel.full,
                onTap: () => motionController.setLevel(MotionLevel.full),
              ),
              const SizedBox(height: 10),
              _ModeCard(
                icon: Icons.battery_saver_rounded,
                title: 'Economia',
                subtitle:
                    'Fundo estático — poupa bateria em aparelhos mais modestos',
                selected: motion == MotionLevel.reduced,
                onTap: () => motionController.setLevel(MotionLevel.reduced),
              ),

              const SizedBox(height: 28),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Text(
                  'As escolhas ficam guardadas no aparelho e aplicam-se '
                  'a todas as secções da app.',
                  style: TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 12.5,
                    height: 1.5,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Pré-visualização: cartão de vidro + cartão-herói no modo actual.
class _PreviewCard extends StatelessWidget {
         _PreviewCard({required this.mode});

  final AppThemeMode mode;

  @override
  Widget build(BuildContext context) {
    final label = switch (mode) {
      AppThemeMode.system => 'Sistema',
      AppThemeMode.light => 'Claro',
      AppThemeMode.dark => 'Escuro',
    };

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: AppColors.buttonGradient),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.4),
                      blurRadius: 14,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: const Icon(Icons.health_and_safety_rounded,
                    color: Colors.white, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Pré-visualização',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      'Modo actual: $label',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 12.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _chip('Vidro', AppColors.accent),
              const SizedBox(width: 8),
              _chip('Sucesso', AppColors.success),
              const SizedBox(width: 8),
              _chip('Atenção', AppColors.warning),
            ],
          ),
        ],
      ),
    );
  }

  Widget _chip(String label, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: color.withOpacity(0.14),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: color.withOpacity(0.32)),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: color,
            fontSize: 11,
            fontWeight: FontWeight.w700,
          ),
        ),
      );
}

class _ModeCard extends StatelessWidget {
         _ModeCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: onTap,
      scale: 0.98,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.primary.withOpacity(AppColors.isDark ? 0.16 : 0.10)
              : AppColors.glassFill,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: selected
                ? AppColors.primary.withOpacity(0.55)
                : AppColors.glassBorder,
            width: selected ? 1.4 : 1,
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: AppColors.primary.withOpacity(0.25),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ]
              : null,
        ),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: selected
                    ? AppColors.primary.withOpacity(0.22)
                    : AppColors.glassFillStrong,
                borderRadius: BorderRadius.circular(13),
                border: Border.all(
                  color: selected
                      ? AppColors.primary.withOpacity(0.5)
                      : AppColors.glassBorder,
                ),
              ),
              child: Icon(
                icon,
                size: 21,
                color: selected ? AppColors.accent : AppColors.textSecondary,
              ),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
            AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: selected ? AppColors.primary : Colors.transparent,
                border: Border.all(
                  color: selected
                      ? AppColors.primary
                      : AppColors.textMuted.withOpacity(0.5),
                  width: 2,
                ),
              ),
              child: selected
                  ? const Icon(Icons.check_rounded,
                      size: 14, color: Colors.white)
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}
