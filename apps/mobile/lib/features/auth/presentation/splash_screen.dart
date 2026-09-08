import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';

/// Splash de marca: logo em vidro com pulso + barra de progresso fina,
/// redireciona após 1.6 s (a sessão já vem do Supabase offline-first).
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 1600), () {
      if (!mounted) return;
      final logged = authRefresh.session != null;
      context.go(logged ? '/home' : '/login');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _logo().animate(onPlay: (c) => c.repeat(reverse: true)).scale(
                    begin: const Offset(1, 1),
                    end: const Offset(1.06, 1.06),
                    duration: 1200.ms,
                    curve: Curves.easeInOut,
                  ),
              const SizedBox(height: 26),
              const Text(
                'MedWallet',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 30,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.5,
                ),
              ).animate().fadeIn(delay: 250.ms, duration: 500.ms).slideY(
                    begin: 0.4,
                    end: 0,
                    duration: 500.ms,
                    curve: Curves.easeOutCubic,
                  ),
              const SizedBox(height: 6),
              Text(
                'Saúde na palma da mão · Moçambique',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.6),
                  fontSize: 13.5,
                ),
              ).animate().fadeIn(delay: 500.ms, duration: 500.ms),
              const SizedBox(height: 44),
              const SizedBox(
                width: 120,
                child: LinearProgressIndicator(
                  color: AppColors.accent,
                  backgroundColor: AppColors.glassFill,
                  minHeight: 3,
                  borderRadius: BorderRadius.all(Radius.circular(4)),
                ),
              ).animate().fadeIn(delay: 700.ms),
            ],
          ),
        ),
      ),
    );
  }

  Widget _logo() => Container(
        width: 96,
        height: 96,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: AppColors.heroCardGradient,
          ),
          border: Border.all(color: Colors.white.withOpacity(0.2)),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withOpacity(0.6),
              blurRadius: 40,
              offset: const Offset(0, 16),
            ),
          ],
        ),
        child: const Icon(
          Icons.health_and_safety_rounded,
          size: 48,
          color: Colors.white,
        ),
      );
}
