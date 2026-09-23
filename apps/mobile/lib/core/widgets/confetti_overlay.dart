import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Celebração leve em puro Dart/Flutter — ZERO dependências novas.
///
/// `showConfetti(context)` dispara uma rajada de partículas coloridas
/// (paleta MedWallet) que caem do topo com rotação e oscilação, mais uma
/// mensagem opcional a flutuar no centro. Não bloqueia toques
/// (IgnorePointer) e remove-se sozinha após ~3 segundos.
///
/// Usado em: adesão a desafios, conclusão do plano diário de medicação.
void showConfetti(BuildContext context, {String? message}) {
  final overlay = Overlay.maybeOf(context);
  if (overlay == null) return;
  // F33 — guard contra double-remove (dois onDone em corrida lançavam
  // "an OverlayEntry was already removed").
  var removed = false;
  late OverlayEntry entry;
  entry = OverlayEntry(
    builder: (_) => _ConfettiOverlay(
      message: message,
      onDone: () {
        if (removed) return;
        removed = true;
        entry.remove();
      },
    ),
  );
  overlay.insert(entry);
}

class _ConfettiOverlay extends StatefulWidget {
  const _ConfettiOverlay({required this.onDone, this.message});

  final VoidCallback onDone;
  final String? message;

  @override
  State<_ConfettiOverlay> createState() => _ConfettiOverlayState();
}

class _ConfettiOverlayState extends State<_ConfettiOverlay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final List<_Particle> _particles;
  late final Duration _life;

  @override
  void initState() {
    super.initState();
    _life = const Duration(milliseconds: 3200);
    _controller = AnimationController(vsync: this, duration: _life)
      ..forward();

    final rng = math.Random();
    const palette = [
      AppColors.accent,
      AppColors.teal,
      AppColors.success,
      AppColors.warning,
      AppColors.primarySoft,
      Colors.white,
    ];
    _particles = List.generate(70, (i) {
      return _Particle(
        x: rng.nextDouble(), // 0–1 da largura
        delay: rng.nextDouble() * 0.22, // fração da vida
        speed: 0.55 + rng.nextDouble() * 0.45,
        size: 6 + rng.nextDouble() * 7,
        sway: rng.nextDouble() * 2 * math.pi,
        swayAmp: 8 + rng.nextDouble() * 22,
        spin: (rng.nextBool() ? 1 : -1) * (2 + rng.nextDouble() * 6),
        color: palette[i % palette.length],
      );
    });

    Future.delayed(_life + const Duration(milliseconds: 260), () {
      if (mounted) widget.onDone();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    return IgnorePointer(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          final t = _controller.value;
          // Desvanecimento suave no último terço.
          final fade = t < 0.75
              ? 1.0
              : (1.0 - (t - 0.75) / 0.25).clamp(0.0, 1.0);
          return CustomPaint(
            size: size,
            painter: _ConfettiPainter(
              particles: _particles,
              progress: t,
              opacity: fade,
            ),
            child: widget.message == null || t > 0.85
                ? null
                : Align(
                    alignment: const Alignment(0, -0.35),
                    child: Opacity(
                      opacity: (1.0 - ((t - 0.6) / 0.25).clamp(0.0, 1.0))
                          .clamp(0.0, 1.0),
                      child: Transform.scale(
                        scale: 1.0 + 0.35 * (1.0 - (t / 0.35).clamp(0.0, 1.0)),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 22, vertical: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xE60B1D31),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                                color: AppColors.glassHighlight),
                            boxShadow: const [
                              BoxShadow(
                                  color: AppColors.glowCyan, blurRadius: 24),
                            ],
                          ),
                          child: Text(
                            widget.message!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
          );
        },
      ),
    );
  }
}

class _Particle {
  const _Particle({
    required this.x,
    required this.delay,
    required this.speed,
    required this.size,
    required this.sway,
    required this.swayAmp,
    required this.spin,
    required this.color,
  });

  final double x; // 0–1 (fracção da largura)
  final double delay; // atraso inicial (fracção da vida)
  final double speed; // multiplicador de queda
  final double size;
  final double sway; // fase da oscilação horizontal
  final double swayAmp;
  final double spin; // radianos/vida
  final Color color;
}

class _ConfettiPainter extends CustomPainter {
  const _ConfettiPainter({
    required this.particles,
    required this.progress,
    required this.opacity,
  });

  final List<_Particle> particles;
  final double progress;
  final double opacity;

  @override
  void paint(Canvas canvas, Size size) {
    if (opacity <= 0) return;
    final paint = Paint()..style = PaintingStyle.fill;

    for (final p in particles) {
      final local = ((progress - p.delay) * p.speed).clamp(0.0, 1.0);
      if (local <= 0) continue;

      final y = -20.0 + local * (size.height * 0.78 + 40);
      final x = p.x * size.width +
          math.sin(local * 5 * math.pi + p.sway) * p.swayAmp;
      final angle = local * p.spin * math.pi + p.sway;

      paint.color = p.color
          .withOpacity(opacity * (1.0 - 0.35 * local).clamp(0.0, 1.0));

      canvas.save();
      canvas.translate(x, y);
      canvas.rotate(angle);
      // Papelinhos: rectângulos arredondados achatados (efeito 3D pela
      // variação da altura com a rotação).
      final h = p.size * (0.35 + 0.65 * math.cos(angle).abs());
      final r = RRect.fromRectAndRadius(
        Rect.fromCenter(
            center: Offset.zero, width: p.size, height: h.clamp(2.0, 99)),
        Radius.circular(p.size * 0.3),
      );
      canvas.drawRRect(r, paint);
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_ConfettiPainter old) =>
      old.progress != progress || old.opacity != opacity;
}
