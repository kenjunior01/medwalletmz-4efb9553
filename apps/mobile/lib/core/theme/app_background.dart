import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_colors.dart';
import 'theme_controller.dart';

/// Fundo vivo MedWallet — quatro camadas em paridade com o sistema
/// `AnimatedBackground`/aurora da web:
///
///   1. gradiente vertical base (tokens do modo);
///   2. feixes de luz diagonais que derivam lentamente (`mw-beam-drift`);
///   3. três brilhos radiais com drift senoidal (`orb-drift`, F32);
///   4. poeira cintilante — estrelas no escuro, brilho azul-ouro no
///      claro (`star-twinkle` da web).
///
/// Tudo a custo GPU quase zero: transformações sobre camadas
/// rasterizadas (RepaintBoundary) e UM painter de 26 círculos. Respeita
/// o modo "Economia de efeitos" (ui.motion) e "reduzir movimento" do
/// sistema — nesses casos renderiza um frame estático.
class AppBackground extends ConsumerStatefulWidget {
  const AppBackground({super.key, this.child});

  final Widget? child;

  @override
  ConsumerState<AppBackground> createState() => _AppBackgroundState();
}

class _AppBackgroundState extends ConsumerState<AppBackground>
    with SingleTickerProviderStateMixin {
  late final AnimationController _drift;

  // Poeira cintilante — posições determinísticas (ângulo dourado).
  static final List<_Star> _stars = List.generate(26, (i) {
    final rand = math.Random(i * 7919);
    return _Star(
      dx: (i * 137.5 % 100) / 100, // distribuição dourada 0..1
      dy: rand.nextDouble(),
      radius: 0.7 + rand.nextDouble() * 1.6,
      speed: 0.35 + rand.nextDouble() * 0.9,
      phase: rand.nextDouble(),
    );
  });

  @override
  void initState() {
    super.initState();
    _drift = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 16000),
    )..repeat();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // F33 — com "reduzir animações" activo o ticker continuava a
    // correr sem consumidor (desperdício de bateria). Para/retoma
    // conforme a preferência do sistema.
    final reduce = MediaQuery.of(context).disableAnimations;
    if (reduce) {
      if (_drift.isAnimating) _drift.stop();
    } else if (!_drift.isAnimating) {
      _drift.repeat();
    }
  }

  @override
  void dispose() {
    _drift.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final motion = ref.watch(motionLevelProvider);
    final systemReduce = MediaQuery.of(context).disableAnimations;
    final animate = motion == MotionLevel.full && !systemReduce;

    final stack = animate
        ? AnimatedBuilder(
            animation: _drift,
            builder: (context, _) => _buildStack(_drift.value),
          )
        : _buildStack(0.25);

    return DecoratedBox(
      decoration: BoxDecoration(
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
        // ── 2. Feixes de luz diagonais (mw-beam-drift) ──────────────
        Positioned.fill(
          child: RepaintBoundary(
            child: _Beams(t: t, color: AppColors.beamColor),
          ),
        ),
        // ── 3. Brilhos mesh com drift (orb-drift) ───────────────────
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
        // ── 4. Poeira cintilante (star-twinkle) ─────────────────────
        Positioned.fill(
          child: RepaintBoundary(
            child: CustomPaint(
              painter: _StarDustPainter(
                t: t,
                stars: _stars,
                color: AppColors.starColor,
              ),
            ),
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

/// Feixes de luz — 2 faixas diagonais translúcidas que derivam com
/// velocidades diferentes (paridade `beam-drift`/`beam-drift-slow`).
class _Beams extends StatelessWidget {
  const _Beams({required this.t, required this.color});

  final double t;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          _beam(
            x: _sweep(t, 0.0, 0.35),
            angle: 0.21, // ~12°
            opacity: 1.0,
          ),
          _beam(
            x: _sweep(t, 0.45, 0.3),
            angle: -0.10, // ~−6° (beam-slow)
            opacity: 0.7,
            width: 120,
          ),
        ],
      ),
    );
  }

  /// Percorre −30%..+30% da largura em vaivém.
  double _sweep(double t, double phase, double amp) =>
      math.sin((t + phase) * 2 * math.pi) * amp;

  Widget _beam({
    required double x,
    required double angle,
    required double opacity,
    double width = 84,
  }) {
    // FractionallySizedBox via LayoutBuilder seria exacto; aqui usamos
    // um Align com fatores −0.3..0.3 (equivale a % da largura).
    // Alignment.x ∈ [−1..1] mapeia a largura; x∈[−0.35..0.35] → ×2
    // cobre −0.7..0.7 (varre quase toda a largura em vaivém).
    return Align(
      alignment: Alignment(x * 2, -0.6),
      child: Transform.rotate(
        angle: angle,
        origin: const Offset(0, 400),
        child: Container(
          width: width,
          height: 1200,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              // Multiplica pela opacidade-base do token (withOpacity
              // SUBSTITUI o alpha, não multiplica).
              colors: [
                color.withOpacity(0),
                color.withOpacity(color.opacity * 0.9 * opacity),
                color.withOpacity(0),
              ],
              stops: const [0.0, 0.5, 1.0],
            ),
          ),
        ),
      ),
    );
  }
}

class _Star {
  const _Star({
    required this.dx,
    required this.dy,
    required this.radius,
    required this.speed,
    required this.phase,
  });

  final double dx; // 0..1 da largura
  final double dy; // 0..1 da altura
  final double radius;
  final double speed; // ciclos por varredura do controlador
  final double phase;
}

class _StarDustPainter extends CustomPainter {
  _StarDustPainter({
    required this.t,
    required this.stars,
    required this.color,
  });

  final double t;
  final List<_Star> stars;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;
    for (final s in stars) {
      final twinkle =
          0.30 + 0.70 * (0.5 + 0.5 * math.sin((t * s.speed + s.phase) * 2 * math.pi));
      paint.color = color.withOpacity(color.opacity * twinkle);
      canvas.drawCircle(
        Offset(s.dx * size.width, s.dy * size.height),
        s.radius,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_StarDustPainter oldDelegate) =>
      oldDelegate.t != t || oldDelegate.color != color;
}
