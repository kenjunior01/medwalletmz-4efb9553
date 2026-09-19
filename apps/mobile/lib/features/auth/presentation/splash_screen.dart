import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../emergency_card/data/emergency_card_repository.dart';

/// ─────────────────────────────────────────────────────────────────────
/// SPLASH "BATIMENTO QUE ACORDA" (F32) — inspirado na identidade
/// animada da versão web (LoadingScreen + mw-ecg-line + mw-pulse-ring
/// + mw-float-up + text-shimmer) e elevado para um padrão nativo:
///
///  1. Logo em vidro com glow a respirar + anéis de pulso a expandir
///  2. Linha ECG que se desenha sozinha (CustomPainter, zero deps)
///  3. Partículas médicas a flutuar (pílula, coração, vacina…)
///  4. Wordmark com varrimento shimmer ciano→âmbar (paleta da web)
///  5. Linha de progresso shimmer teal→âmbar→teal
///
/// Tudo com UM AnimationController repetido + flutter_animate (já
/// dependência) — nenhum pacote novo, custo GPU mínimo.
/// ─────────────────────────────────────────────────────────────────────
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  /// Motor único do "vivo": ECG, partículas, shimmer e anéis.
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();

    // Rota após a pequena apresentação (a sessão já vem do Supabase
    // offline-first — o splash é cerimónia de marca, não espera rede).
    Future.delayed(const Duration(milliseconds: 2400), () async {
      if (!mounted) return;
      final logged = authRefresh.session != null;
      // Sessão aberta: refresca o cache da Ficha de Emergência (o único
      // ecrã acessível com a app bloqueada — precisa de dados frescos).
      if (logged) EmergencyCardRepository.instance.refresh();
      if (logged) {
        context.go('/home');
        return;
      }
      // F32 — primeira utilização → onboarding (uma única vez).
      final prefs = await SharedPreferences.getInstance();
      final seen = prefs.getBool('onboarding_done') ?? false;
      if (!mounted) return;
      context.go(seen ? '/login' : '/onboarding');
    });
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: Stack(
          children: [
            // Partículas médicas a subir (paridade com a web).
            const Positioned.fill(child: _MedicalParticles()),

            // Centro: logo + ECG + wordmark.
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const _BeatingLogo(),

                  const SizedBox(height: 22),

                  // Linha ECG — assinatura visual da web, agora nativa.
                  SizedBox(
                    width: 230,
                    height: 40,
                    child: AnimatedBuilder(
                      animation: _pulse,
                      builder: (_, __) => CustomPaint(
                        painter: _EcgPainter(progress: _pulse.value),
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Wordmark com varrimento shimmer (como o text-shimmer
                  // do index.css da web).
                  const _ShimmerWordmark(),
                  const SizedBox(height: 6),
                  Text(
                    'Saúde na palma da mão · Moçambique',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.6),
                      fontSize: 13.5,
                      letterSpacing: 0.2,
                    ),
                  ).animate().fadeIn(
                        delay: 500.ms,
                        duration: 600.ms,
                        curve: Curves.easeOut,
                      ),

                  const SizedBox(height: 40),

                  // Linha de progresso shimmer teal→âmbar→teal.
                  const _ShimmerProgressLine(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════
// Logo com batimento: glow a respirar + 2 anéis de pulso (mw-pulse-ring)
// + entrada com mola suave.
// ══════════════════════════════════════════════════════════════════════
class _BeatingLogo extends StatelessWidget {
  const _BeatingLogo();

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        // Anéis de pulso a expandir (dois, desfasados 900 ms).
        _pulseRing(delay: 0),
        _pulseRing(delay: 900),

        // Glow a respirar atrás do logótipo (mw-breathe).
        Container(
          width: 128,
          height: 128,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(colors: [
              AppColors.accent.withOpacity(0.22),
              AppColors.accent.withOpacity(0),
            ]),
          ),
        )
            .animate(onPlay: (c) => c.repeat(reverse: true))
            .scale(
              begin: const Offset(0.92, 0.92),
              end: const Offset(1.1, 1.1),
              duration: 1300.ms,
              curve: Curves.easeInOut,
            ),

        // Logótipo em vidro — entrada com mola + flutuar suave contínuo.
        Container(
          width: 96,
          height: 96,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(28),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFF2E86BF),
                AppColors.primary,
                Color(0xFF0C3555),
              ],
            ),
            border: Border.all(color: Colors.white.withOpacity(0.22)),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withOpacity(0.55),
                blurRadius: 42,
                offset: const Offset(0, 16),
              ),
            ],
          ),
          child: const Icon(
            Icons.health_and_safety_rounded,
            size: 48,
            color: Colors.white,
          ),
        )
            .animate(delay: 80.ms)
            .scale(
              begin: const Offset(0.55, 0.55),
              end: const Offset(1, 1),
              duration: 700.ms,
              curve: Curves.easeOutBack,
            )
            .fadeIn(duration: 320.ms)
            .then()
            .shimmer(
              delay: 500.ms,
              duration: 1400.ms,
              color: Colors.white.withOpacity(0.5),
            ),
      ],
    );
  }

  Widget _pulseRing(int delay) => Container(
        width: 96,
        height: 96,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: AppColors.accent.withOpacity(0.45),
            width: 1.6,
          ),
        ),
      )
          .animate(delay: delay.ms, onPlay: (c) => c.repeat())
          .scale(
            begin: const Offset(1, 1),
            end: const Offset(2.05, 2.05),
            duration: 1800.ms,
            curve: Curves.easeOutCubic,
          )
          .fadeOut(duration: 1800.ms, curve: Curves.easeOutCubic);
}

// ══════════════════════════════════════════════════════════════════════
// Pintor da linha ECG — desenha o traçado cardíaco com "cabeça" luminosa
// que percorre o caminho (o stroke-dasharray/dashoffset do CSS web,
// reinterpretado em CustomPainter).
// ══════════════════════════════════════════════════════════════════════
class _EcgPainter extends CustomPainter {
  _EcgPainter({required this.progress});

  /// 0..1 — posição da cabeça do traçado (loop contínuo).
  final double progress;

  // Mesmo traçado do SVG da web (viewBox 200×40), escalado ao widget.
  static const _points = <Offset>[
    Offset(0, 20), Offset(40, 20), Offset(50, 20), Offset(55, 8),
    Offset(60, 32), Offset(65, 5), Offset(70, 35), Offset(75, 20),
    Offset(85, 20), Offset(90, 15), Offset(95, 20), Offset(140, 20),
    Offset(145, 12), Offset(150, 28), Offset(155, 20), Offset(200, 20),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final sx = size.width / 200;
    final sy = size.height / 40;
    final path = Path()..moveTo(_points.first.dx * sx, _points.first.dy * sy);
    for (var i = 1; i < _points.length; i++) {
      path.lineTo(_points[i].dx * sx, _points[i].dy * sy);
    }

    final metrics = path.computeMetrics().toList();
    if (metrics.isEmpty) return;
    final metric = metrics.first;
    final total = metric.length;

    // Janela desenhada: cabeça = progress, cauda = progress - 0.42
    // (o traçado "acende" e apaga como o dashoffset do CSS). Os limites
    // já são garantidos pela aritmética — sem clamp (evita num/double).
    final head = total * progress;
    final tail = total * (progress - 0.42);

    final Path window = tail < 0
        ? Path()
          ..addPath(metric.extractPath(0, head), Offset.zero)
          // Prologues ainda não desenhados nesta volta (wrap).
          ..addPath(metric.extractPath(total + tail, total), Offset.zero)
        : metric.extractPath(tail, head);

    // Traçado com gradiente ciano→turquesa (paleta da web).
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..shader = const LinearGradient(
        colors: [AppColors.accent, AppColors.teal, AppColors.accent],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    canvas.drawPath(window, paint);

    // Cabeça luminosa: halo + núcleo branco.
    final pos = metric.getTangentForOffset(head)?.position;
    if (pos != null) {
      canvas.drawCircle(
        pos,
        7,
        Paint()
          ..shader = RadialGradient(colors: [
            AppColors.accent.withOpacity(0.35),
            AppColors.accent.withOpacity(0),
          ]).createShader(Rect.fromCircle(center: pos, radius: 7)),
      );
      canvas.drawCircle(pos, 2.6, Paint()..color = Colors.white);
    }
  }

  @override
  bool shouldRepaint(_EcgPainter oldDelegate) =>
      oldDelegate.progress != progress;
}

// ══════════════════════════════════════════════════════════════════════
// Wordmark com varrimento shimmer — o "text-shimmer" do web
// (gradiente a correr por trás do texto via ShaderMask).
// ══════════════════════════════════════════════════════════════════════
class _ShimmerWordmark extends StatefulWidget {
  const _ShimmerWordmark();

  @override
  State<_ShimmerWordmark> createState() => _ShimmerWordmarkState();
}

class _ShimmerWordmarkState extends State<_ShimmerWordmark>
    with SingleTickerProviderStateMixin {
  late final AnimationController _sweep;

  @override
  void initState() {
    super.initState();
    _sweep = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2600),
    )..repeat();
  }

  @override
  void dispose() {
    _sweep.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _sweep,
      builder: (context, child) {
        // O brilho atravessa o texto via translação do gradiente
        // (stops fixos — sem risco de stops fora de 0..1).
        final t = _sweep.value * 3 - 1.5;
        return ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
            colors: [
              Colors.white,
              AppColors.accent,
              Color(0xFFFBBF24), // âmbar da web (region-logo-accent)
              AppColors.accent,
              Colors.white,
            ],
            stops: [0, 0.3, 0.5, 0.7, 1],
          )
              .transform(GradientTranslation(t))
              .createShader(bounds),
          child: child,
        );
      },
      child: const Text(
        'MedWallet',
        style: TextStyle(
          color: Colors.white,
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
    );
  }
}

// ══════════════════════════════════════════════════════════════════════
// Linha de progresso shimmer — a mw-shimmer-line do web
// (transparente → teal → âmbar → teal → transparente a correr).
// ══════════════════════════════════════════════════════════════════════
class _ShimmerProgressLine extends StatefulWidget {
  const _ShimmerProgressLine();

  @override
  State<_ShimmerProgressLine> createState() => _ShimmerProgressLineState();
}

class _ShimmerProgressLineState extends State<_ShimmerProgressLine>
    with SingleTickerProviderStateMixin {
  late final AnimationController _shimmer;

  @override
  void initState() {
    super.initState();
    _shimmer = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat();
  }

  @override
  void dispose() {
    _shimmer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(4),
      child: SizedBox(
        width: 150,
        height: 3.5,
        child: AnimatedBuilder(
          animation: _shimmer,
          builder: (context, _) => CustomPaint(
            painter: _ShimmerLinePainter(phase: _shimmer.value),
          ),
        ),
      ),
    )
        .animate()
        .fadeIn(delay: 800.ms, duration: 500.ms)
        .slideY(begin: 0.6, end: 0, duration: 500.ms, curve: Curves.easeOut);
  }
}

class _ShimmerLinePainter extends CustomPainter {
  _ShimmerLinePainter({required this.phase});

  final double phase;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.centerLeft,
        end: Alignment.centerRight,
        colors: const [
          Colors.transparent,
          AppColors.teal,
          Color(0xFFFBBF24),
          AppColors.teal,
          Colors.transparent,
        ],
        stops: const [0, 0.3, 0.5, 0.7, 1],
        transform: GradientTranslation(phase * 2 - 1),
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    canvas.drawRect(Offset.zero & size, paint);
  }

  @override
  bool shouldRepaint(_ShimmerLinePainter oldDelegate) =>
      oldDelegate.phase != phase;
}

/// Desloca o gradiente horizontalmente (equivalente ao
/// background-position animado do CSS).
class GradientTranslation extends GradientTransform {
  const GradientTranslation(this.dx);
  final double dx;

  @override
  Matrix4? transform(Rect bounds, {TextDirection? textDirection}) =>
      Matrix4.translationValues(dx * bounds.width, 0, 0);
}

// ══════════════════════════════════════════════════════════════════════
// Partículas médicas a flutuar — a MEDICAL_PARTICLES + mw-float-up do
// web: ícones de saúde sobem lentamente, rodando e desvanecendo.
// Um único controller (10 s) alimenta todas as fases.
// ══════════════════════════════════════════════════════════════════════
class _MedicalParticles extends StatefulWidget {
  const _MedicalParticles();

  @override
  State<_MedicalParticles> createState() => _MedicalParticlesState();
}

class _MedicalParticlesState extends State<_MedicalParticles>
    with SingleTickerProviderStateMixin {
  late final AnimationController _flow;

  static const _specs = <(IconData, double, double, double)>[
    // ícone, esquerda (0..1), fase (0..1), tamanho
    (Icons.medication_rounded, 0.10, 0.00, 15),
    (Icons.stethoscope_rounded, 0.26, 0.22, 13),
    (Icons.monitor_heart_rounded, 0.48, 0.40, 17),
    (Icons.vaccines_rounded, 0.70, 0.10, 12),
    (Icons.favorite_rounded, 0.86, 0.55, 14),
    (Icons.medication_liquid_rounded, 0.36, 0.66, 11),
    (Icons.health_and_safety_rounded, 0.60, 0.80, 14),
  ];

  @override
  void initState() {
    super.initState();
    _flow = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 11000),
    )..repeat();
  }

  @override
  void dispose() {
    _flow.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.of(context).disableAnimations) {
      return const SizedBox.shrink(); // acessibilidade: sem movimento
    }
    return AnimatedBuilder(
      animation: _flow,
      builder: (context, _) => LayoutBuilder(
        builder: (context, constraints) {
          final h = constraints.maxHeight;
          final w = constraints.maxWidth;
          return Stack(
            clipBehavior: Clip.none,
            children: [
              for (final (icon, left, phase, size) in _specs)
                _particle(icon, left, phase, size, h, w),
            ],
          );
        },
      ),
    );
  }

  Widget _particle(
    IconData icon,
    double left,
    double phase,
    double size,
    double h,
    double w,
  ) {
    // t = posição no percurso (0 = fundo, 1 = topo).
    final t = (_flow.value + phase) % 1;
    final y = h * (1.04 - 1.12 * t);
    // Aparece e desaparece suavemente ao longo do percurso
    // (sin(πt) ∈ [0,1] → opacidade ∈ [0, 0.20]; sem clamp).
    final opacity = math.sin(t * math.pi) * 0.20;
    final angle = math.sin(t * math.pi * 2) * 0.35;

    return Positioned(
      left: w * left,
      top: y,
      child: Transform.rotate(
        angle: angle,
        child: Opacity(
          opacity: opacity,
          child: Icon(icon, size: size, color: AppColors.accent),
        ),
      ),
    );
  }
}
