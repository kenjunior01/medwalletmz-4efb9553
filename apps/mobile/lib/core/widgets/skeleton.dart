import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

import '../theme/app_colors.dart';

/// Skeletons com shimmer azul para estados de carregamento.
/// Mantêm a silhueta real do layout (menor saltos visuais).
class AppSkeleton extends StatelessWidget {
  const AppSkeleton({super.key, this.width, this.height = 16, this.radius = 10});

  final double? width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: const Color(0xFF16324D),
      highlightColor: const Color(0xFF245070),
      period: const Duration(milliseconds: 1400),
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(radius),
        ),
      ),
    );
  }
}

/// Placeholder completo do ecrã carteira enquanto o stream conecta.
class WalletSkeleton extends StatelessWidget {
  const WalletSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        children: [
          const SizedBox(height: 24),
          const AppSkeleton(height: 190, radius: 28),
          const SizedBox(height: 28),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: List.generate(4,
                (_) => const AppSkeleton(width: 64, height: 64, radius: 20)),
          ),
          const SizedBox(height: 30),
          ...List.generate(
            4,
            (_) => const Padding(
              padding: EdgeInsets.only(bottom: 14),
              child: AppSkeleton(height: 72, radius: 20),
            ),
          ),
        ],
      ),
    );
  }
}

/// Placeholder genérico para listas.
class ListSkeleton extends StatelessWidget {
  const ListSkeleton({super.key, this.itemHeight = 84, this.count = 4});

  final double itemHeight;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        count,
        (_) => Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: AppSkeleton(height: itemHeight, radius: 20),
        ),
      ),
    );
  }
}

/// Estado vazio ilustrado com ícone em círculo de vidro.
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 84,
              height: 84,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.glassFill,
                border: Border.all(color: AppColors.glassBorder),
                gradient: RadialGradient(
                  colors: [AppColors.primary.withOpacity(0.25), Colors.transparent],
                ),
              ),
              child: Icon(icon, size: 38, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 18),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 17,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 13.5,
                height: 1.45,
              ),
            ),
            if (actionLabel != null) ...[
              const SizedBox(height: 20),
              TextButton(
                onPressed: onAction,
                child: Text(
                  actionLabel!,
                  style: const TextStyle(
                    color: AppColors.accent,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
