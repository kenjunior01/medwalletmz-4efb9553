import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/gradient_button.dart';

/// Onboarding de primeira utilização — 3 ecrãs de marca com PageView,
/// indicador de pontos e atalho "Saltar". Só aparece uma vez
/// (flag `onboarding_done` em SharedPreferences).
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _page = 0;

  static const _slides = [
    (
      icon: Icons.account_balance_wallet_rounded,
      title: 'A tua carteira de saúde',
      text:
          'Saldo digital para consultas, exames e farmácia. Deposita e '
          'recebe por M-Pesa, com histórico completo e bónus de fidelidade.',
      emoji: '💳',
    ),
    (
      icon: Icons.medication_rounded,
      title: 'Nunca esqueças a medicação',
      text:
          'Lembretes no telemóvel para cada dose, mesmo sem internet. '
          'Checklist diária, streak de adesão e guias de saúde offline '
          'validados pelo MISAU.',
      emoji: '💊',
    ),
    (
      icon: Icons.emoji_events_rounded,
      title: 'Ganha Joy Coins',
      text:
          'Cumpre desafios semanais, sobe no ranking da comunidade e '
          'desbloqueia conquistas. A tua saúde vale recompensas de verdade.',
      emoji: '🏆',
    ),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboarding_done', true);
    if (!mounted) return;
    final logged = authRefresh.session != null ||
        Supabase.instance.client.auth.currentSession != null;
    context.go(logged ? '/home' : '/login');
  }

  @override
  Widget build(BuildContext context) {
    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Column(
            children: [
              // Saltar
              Align(
                alignment: Alignment.topRight,
                child: TextButton(
                  onPressed: _finish,
                  child:        Text(
                    'Saltar',
                    style: TextStyle(
                      color: AppColors.textMuted,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              Expanded(
                child: PageView.builder(
                  controller: _controller,
                  itemCount: _slides.length,
                  onPageChanged: (i) => setState(() => _page = i),
                  itemBuilder: (context, i) {
                    final s = _slides[i];
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Ícone-arte em vidro com glow
                          Container(
                            width: 132,
                            height: 132,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(40),
                              gradient:        LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: AppColors.heroCardGradient,
                              ),
                              border: Border.all(
                                  color: Colors.white.withOpacity(0.18)),
                              boxShadow:        [
                                BoxShadow(
                                    color: AppColors.glowCyan, blurRadius: 44),
                              ],
                            ),
                            child: Center(
                              child: Text(s.emoji,
                                  style: const TextStyle(fontSize: 54)),
                            ),
                          )
                              .animate(delay: (i * 40).ms)
                              .fadeIn(duration: 450.ms)
                              .scale(
                                  begin: const Offset(0.85, 0.85),
                                  end: const Offset(1, 1),
                                  curve: Curves.easeOutBack),
                          const SizedBox(height: 36),
                          Text(
                            s.title,
                            textAlign: TextAlign.center,
                            style:        TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 24,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.3,
                            ),
                          ).animate().fadeIn(delay: 120.ms, duration: 400.ms),
                          const SizedBox(height: 14),
                          Text(
                            s.text,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.62),
                              fontSize: 14.5,
                              height: 1.5,
                            ),
                          ).animate().fadeIn(delay: 220.ms, duration: 400.ms),
                        ],
                      ),
                    );
                  },
                ),
              ),
              // Pontos + CTA
              Padding(
                padding: const EdgeInsets.fromLTRB(32, 0, 32, 26),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(
                        _slides.length,
                        (i) => AnimatedContainer(
                          duration: const Duration(milliseconds: 240),
                          margin: const EdgeInsets.symmetric(horizontal: 5),
                          height: 8,
                          width: i == _page ? 26 : 8,
                          decoration: BoxDecoration(
                            color: i == _page
                                ? AppColors.accent
                                : Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(6),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 26),
                    GradientButton(
                      label: _page == _slides.length - 1
                          ? 'Começar agora'
                          : 'Avançar',
                      icon: _page == _slides.length - 1
                          ? Icons.arrow_forward_rounded
                          : Icons.arrow_forward_rounded,
                      onPressed: () {
                        if (_page == _slides.length - 1) {
                          _finish();
                        } else {
                          _controller.nextPage(
                            duration: const Duration(milliseconds: 380),
                            curve: Curves.easeOutCubic,
                          );
                        }
                      },
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
}
