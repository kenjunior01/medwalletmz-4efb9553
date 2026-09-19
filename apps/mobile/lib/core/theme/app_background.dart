import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Fundo "mesh gradient" abissal: gradiente vertical azul-noite com
/// três brilhos radiais posicionados (ciano, turquesa, azul marca),
/// inspirado nas auroras de água do Índico. Usado em todas as telas
/// para identidade visual consistente.
///
/// F32 — os brilhos agora DRIFTAM lentamente (paridade com o
/// `orb-drift` do index.css da web), dando vida ao fundo sem custo
/// GPU relevante (3 transforms de gradientes radiais). Respeita
/// "reduzir movimento" do sistema: nesses dispositivos fica estático.
class AppBackground extends StatefulWidget {
  const AppBackground({super.key, this.child});

  final Widget? child;

  @override
  State<AppBackground> createState() => _AppBackgroundState();
}

class _AppBackgroundState extends State<AppBackground>
    with SingleTickerProviderStateMixin {
  late final AnimationController _drift;

  @override
  void initState() {
    super.initState();
    _drift = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 16000),
    )..repeat();
  }

  @override
  void dispose() {
    _drift.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.of(context).disableAnimations;
    final stack = reduceMotion
        ? _buildStack(0)
        : AnimatedBuilder(
            animation: _drift,
            builder: (context, _) => _buildStack(_drift.value),
          );

    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: AppColors.backgroundGradient,
        ),
      ),
      child: Stack(children: [
        stack,
        if (widget.child != null) Positioned.fill(child: widget.child!),
      ]),
    );
  }

  Widget _buildStack(double t) {
    return Stack(
      children: [
        Positioned(
          top: -160,
          left: -120,
          child: _glow(
            320,
            AppColors.glowBlue,
            dx: _wave(t, 0.0, 14),
            dy: _wave(t, 0.25, 18),
          ),
        ),
        Positioned(
          top: 140,
          right: -140,
          child: _glow(
            300,
            AppColors.glowCyan,
            dx: _wave(t, 0.5, 12),
            dy: _wave(t, 0.15, 16),
          ),
        ),
        Positioned(
          bottom: -180,
          left: -60,
          child: _glow(
            360,
            AppColors.glowTeal,
            dx: _wave(t, 0.8, 16),
            dy: _wave(t, 0.35, 20),
          ),
        ),
      ],
    );
  }

  /// Oscilação suave −1..1 × amplitude, com fase por orb
  /// (equivalente ao keyframe multi-ponto do orb-drift do web).
  double _wave(double t, double phase, double amplitude) =>
      math.sin((t + phase) * 2 * math.pi) * amplitude;

  /// RepaintBoundary + Transform: o glow é rasterizado UMA vez e só
  /// recomposto a cada frame — sem repaint dos gradientes (o fundo
  /// anima a custo quase zero atrás de listas longas).
  Widget _glow(double size, Color color, {double dx = 0, double dy = 0}) =>
      RepaintBoundary(
        child: Transform.translate(
          offset: Offset(dx, dy),
          child: IgnorePointer(
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
          ),
        ),
      );
}
