import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../data/health_score_repository.dart';

/// F44 — Índice de Saúde 🫀 (paridade com a web).
///
/// Índice 0–100 em 4 pilares calculado no servidor (RPC `health_index`).
/// O cliente apenas renderiza — nunca envia dados nem quantias.
class HealthScoreScreen extends ConsumerWidget {
  const HealthScoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(healthIndexProvider);
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 20, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    Text(
                      'Índice de Saúde',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: () =>
                          ref.invalidate(healthIndexProvider),
                      tooltip: 'Recalcular',
                      icon: Icon(Icons.refresh_rounded,
                          color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: async.when(
                  loading: () => const Center(
                      child: CircularProgressIndicator(strokeWidth: 2)),
                  error: (e, _) => _ErrorView(message: e.toString()),
                  data: (r) => _Body(result: r),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/* ═════════════════════════ Estado de erro ═════════════════════════ */

class _ErrorView extends ConsumerWidget {
  const _ErrorView({required this.message});

  final String message;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.info_outline_rounded,
                color: Color(0xFFF59E0B), size: 40),
            const SizedBox(height: 12),
            Text(
              'Não foi possível calcular o índice',
              style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Verifique a ligação. Se persistir, a migração F44 '
              '(RPC health_index) ainda não foi aplicada no Supabase.',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () => ref.invalidate(healthIndexProvider),
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Tentar novamente'),
            ),
          ],
        ),
      ),
    );
  }
}

/* ═════════════════════════ Corpo principal ═════════════════════════ */

Color _gradeColor(String grade) {
  switch (grade) {
    case 'Excelente':
      return const Color(0xFF10B981);
    case 'Bom':
      return const Color(0xFF38BDF8);
    case 'Atenção':
      return const Color(0xFFF59E0B);
    default:
      return const Color(0xFFFB7185);
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.result});

  final HealthIndexResult result;

  static const _pillarIcons = <String, IconData>{
    'perfil': Icons.shield_outlined,
    'adesao': Icons.medication_outlined,
    'habitos': Icons.favorite_outline,
    'cuidado': Icons.folder_shared_outlined,
  };

  static const _pillarRoutes = <String, String>{
    'perfil': '/records',
    'adesao': '/meds',
    'habitos': '/journal',
    'cuidado': '/records',
  };

  @override
  Widget build(BuildContext context) {
    final gaugeColor = _gradeColor(result.grade);
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Gauge(score: result.score, grade: result.grade, color: gaugeColor),
          const SizedBox(height: 18),
          for (final p in result.pillars) ...[
            _PillarCard(
              pillar: p,
              icon: _pillarIcons[p.key] ?? Icons.monitor_heart_outlined,
              route: _pillarRoutes[p.key],
            ),
            const SizedBox(height: 12),
          ],
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.lock_outline_rounded,
                  size: 14, color: AppColors.textSecondary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'O índice é recalculado a cada abertura e nunca partilha '
                  'dados clínicos — é seu e privado.',
                  style: TextStyle(
                      color: AppColors.textSecondary, fontSize: 12),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/* ═════════════════════════ Medidor radial ═════════════════════════ */

class _Gauge extends StatelessWidget {
  const _Gauge({
    required this.score,
    required this.grade,
    required this.color,
  });

  final int score;
  final String grade;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 220,
      height: 220,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: const Size(220, 220),
            painter: _GaugePainter(progress: score / 100, color: color),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '$score',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 56,
                  height: 1.0,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'de 100',
                style: TextStyle(
                    color: AppColors.textSecondary, fontSize: 12),
              ),
              const SizedBox(height: 10),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.14),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: color.withOpacity(0.45)),
                ),
                child: Text(
                  grade,
                  style: TextStyle(
                    color: color,
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _GaugePainter extends CustomPainter {
  _GaugePainter({required this.progress, required this.color});

  final double progress;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 14;
    const stroke = 14.0;
    const startAngle = -3.1415926535897932 / 2; // topo
    final sweep = 3.1415926535897932 * 2 * progress.clamp(0.0, 1.0);

    final track = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round
      ..color = Colors.white.withOpacity(0.08);
    canvas.drawCircle(center, radius, track);

    if (sweep > 0.01) {
      final arc = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..color = color
        ..maskFilter =
            MaskFilter.blur(BlurStyle.solid, stroke * 0.12);
      canvas.drawArc(Rect.fromCircle(center: center, radius: radius),
          startAngle, sweep, false, arc);
    }
  }

  @override
  bool shouldRepaint(_GaugePainter old) =>
      old.progress != progress || old.color != color;
}

/* ═════════════════════════ Cartão de pilar ═════════════════════════ */

class _PillarCard extends StatelessWidget {
  const _PillarCard({
    required this.pillar,
    required this.icon,
    required this.route,
  });

  final HealthPillar pillar;
  final IconData icon;
  final String? route;

  @override
  Widget build(BuildContext context) {
    final pct = (pillar.progress * 100).round();
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF5B6CFF), Color(0xFF7C5CFF)],
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, size: 20, color: Colors.white),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  pillar.label,
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Text(
                '$pct%',
                style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: pillar.progress,
              minHeight: 8,
              backgroundColor: AppColors.glassBorder,
              valueColor:
                  const AlwaysStoppedAnimation<Color>(Color(0xFF7C5CFF)),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${pillar.score} de ${pillar.max} pontos',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
          ),
          if (pillar.tips.isNotEmpty) ...[
            const SizedBox(height: 8),
            for (final tip in pillar.tips)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.check_circle_outline_rounded,
                        size: 14, color: const Color(0xFF7C5CFF)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        tip,
                        style: TextStyle(
                            color: AppColors.textSecondary, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
          ],
          if (route != null)
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () => context.push(route!),
                style: TextButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                  foregroundColor: const Color(0xFF8B9CFF),
                ),
                icon: const Icon(Icons.arrow_forward_rounded, size: 15),
                label: const Text('Melhorar agora',
                    style: TextStyle(fontSize: 12)),
              ),
            ),
        ],
      ),
    );
  }
}
