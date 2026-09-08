import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Fundo "mesh gradient" abissal: gradiente vertical azul-noite com
/// três brilhos radiais posicionados (ciano, turquesa, azul marca),
/// inspirado nas auroras de água do Índico. Usado em todas as telas
/// para identidade visual consistente.
class AppBackground extends StatelessWidget {
  const AppBackground({super.key, this.child});

  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: AppColors.backgroundGradient,
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            top: -160,
            left: -120,
            child: _glow(320, AppColors.glowBlue),
          ),
          Positioned(
            top: 140,
            right: -140,
            child: _glow(300, AppColors.glowCyan),
          ),
          Positioned(
            bottom: -180,
            left: -60,
            child: _glow(360, AppColors.glowTeal),
          ),
          if (child != null) Positioned.fill(child: child!),
        ],
      ),
    );
  }

  Widget _glow(double size, Color color) => IgnorePointer(
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(
              colors: [color, color.withOpacity(0)],
            ),
          ),
        ),
      );
}
