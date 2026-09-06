import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../../services/domain/service_models.dart';
import '../data/triage_models.dart';
import 'triage_controller.dart';
import 'triage_wizard_screen.dart';

/// Resultado da triagem — severidade, orientação, sinais de alarme,
/// auto-cuidados e, acima de tudo, a **recomendação de especialidade**
/// com atalho directo para a lista de especialistas dessa área.
class TriageResultScreen extends ConsumerWidget {
  const TriageResultScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final outcome =
        GoRouterState.of(context).extra is TriageOutcome
            ? GoRouterState.of(context).extra! as TriageOutcome
            : null;

    if (outcome == null) {
      // Aberto sem resultado — volta ao assistente.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) context.pushReplacement('/triage');
      });
      return const Scaffold(
        body: AppBackground(child: SizedBox.expand()),
      );
    }

    final result = outcome.result;
    final specialty = outcome.specialty is Specialty
        ? outcome.specialty! as Specialty
        : null;
    final history = ref.watch(triageHistoryProvider);

    final (color, icon, label) = switch (result.severity) {
      'emergencia' || 'emergência' || 'emergency' => (
          AppColors.danger,
          Icons.emergency_rounded,
          'EMERGÊNCIA'
        ),
      'alta' || 'high' => (
          AppColors.warning,
          Icons.warning_amber_rounded,
          'SEVERIDADE ALTA'
        ),
      'baixa' || 'low' => (
          AppColors.success,
          Icons.check_circle_rounded,
          'SEVERIDADE BAIXA'
        ),
      _ => (
          AppColors.accent,
          Icons.info_rounded,
          'SEVERIDADE MODERADA'
        ),
    };

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
            children: [
              Row(
                children: [
                  IconButton(
                    onPressed: () => context.pop(),
                    icon: const Icon(Icons.arrow_back_rounded,
                        color: AppColors.textPrimary),
                  ),
                  const Expanded(
                    child: Text(
                      'Resultado da triagem',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // ── Severidade ───────────────────────────────────────
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.glassFill,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: color.withOpacity(0.45)),
                  boxShadow: [
                    BoxShadow(
                      color: color.withOpacity(0.12),
                      blurRadius: 26,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: color.withOpacity(0.16),
                      ),
                      child: Icon(icon, color: color, size: 24),
                    ),
                    const SizedBox(width: 13),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            label,
                            style: TextStyle(
                              color: color,
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1,
                            ),
                          ),
                          if (result.provider == 'local_rules')
                            Padding(
                              padding: const EdgeInsets.only(top: 3),
                              child: Text(
                                'Analisado pelo motor local (IA offline '
                                'indisponível)',
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.45),
                                  fontSize: 10.5,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.1),
              const SizedBox(height: 14),

              // ── Recomendação ─────────────────────────────────────
              Text(
                result.recommendation,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 14.5,
                  height: 1.6,
                ),
              ),

              // ── Especialidade recomendada ────────────────────────
              if (specialty != null) ...[
                const SizedBox(height: 20),
                _SpecialtyCard(specialty: specialty),
              ] else ...[
                const SizedBox(height: 20),
                GlassGhostButton(
                  label: 'Ver clínicos gerais disponíveis',
                  icon: Icons.medical_services_rounded,
                  onPressed: () => context.push('/specialists'),
                ),
              ],

              // ── Sinais de alarme ─────────────────────────────────
              if (result.redFlags.isNotEmpty) ...[
                const SizedBox(height: 18),
                const _SectionHeading(
                    title: 'Sinais de alarme', color: AppColors.danger),
                ...result.redFlags.map((f) => _Bullet(text: f, color: color)),
              ],

              // ── Auto-cuidados ────────────────────────────────────
              if (result.selfCare.isNotEmpty) ...[
                const SizedBox(height: 16),
                const _SectionHeading(
                    title: 'Auto-cuidados', color: AppColors.success),
                ...result.selfCare.map((f) => _Bullet(
                    text: f, color: AppColors.success)),
              ],

              // ── Causas possíveis ─────────────────────────────────
              if (result.possibleCauses.isNotEmpty) ...[
                const SizedBox(height: 16),
                const _SectionHeading(
                    title: 'Causas possíveis', color: AppColors.accent),
                ...result.possibleCauses
                    .map((f) => _Bullet(text: f, color: AppColors.accent)),
              ],

              if (result.whenToSeekHelp != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.schedule_rounded,
                          color: AppColors.warning, size: 17),
                      const SizedBox(width: 9),
                      Expanded(
                        child: Text(
                          result.whenToSeekHelp!,
                          style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 12.5,
                              height: 1.45),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 14),
              Text(
                'Orientação informativa — não substitui consulta médica.\n'
                'Emergências: 117 ou 84 146 (INAS).',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.4),
                  fontSize: 11,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 12),
              GlassGhostButton(
                label: 'Fazer nova triagem',
                icon: Icons.refresh_rounded,
                onPressed: () => context.pushReplacement('/triage'),
              ),

              // ── Histórico ────────────────────────────────────────
              const SizedBox(height: 26),
              const Text(
                'HISTÓRICO DE TRIAGENS',
                style: TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 10),
              history.when(
                loading: () => const ListSkeleton(count: 2, itemHeight: 76),
                error: (e, _) => const SizedBox.shrink(),
                data: (logs) {
                  if (logs.isEmpty) {
                    return Text(
                      'As tuas triagens anteriores aparecem aqui.',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.45),
                        fontSize: 12.5,
                      ),
                    );
                  }
                  return Column(
                    children: logs
                        .take(6)
                        .map((log) => _HistoryCard(log: log))
                        .toList(),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Cartão da especialidade recomendada ─────────────────────────────────

class _SpecialtyCard extends StatelessWidget {
  const _SpecialtyCard({required this.specialty});

  final Specialty specialty;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
            colors: [Color(0x2E1E6B9C), Color(0x141E6B9C)]),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0x5538BDF8)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.recommend_rounded,
                  color: AppColors.accent, size: 19),
              SizedBox(width: 8),
              Text(
                'ESPECIALIDADE RECOMENDADA',
                style: TextStyle(
                  color: AppColors.accent,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.1,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Text(
                specialty.icon ?? '🩺',
                style: const TextStyle(fontSize: 26),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      specialty.name,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if (specialty.description != null &&
                        specialty.description!.isNotEmpty)
                      Text(
                        specialty.description!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.55),
                          fontSize: 12,
                          height: 1.4,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          GradientButton(
            label: 'Ver especialistas de ${specialty.name}',
            icon: Icons.arrow_forward_rounded,
            height: 48,
            onPressed: () => context.push('/specialists',
                extra: specialty),
          ),
        ],
      ),
    )
        .animate(delay: 120.ms)
        .fadeIn(duration: 340.ms)
        .slideY(begin: 0.12, curve: Curves.easeOutCubic);
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({required this.title, required this.color});

  final String title;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: TextStyle(
        color: color,
        fontWeight: FontWeight.w800,
        fontSize: 13.5,
      ),
    );
  }
}

class _Bullet extends StatelessWidget {
  const _Bullet({required this.text, required this.color});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('• ', style: TextStyle(color: color)),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12.5,
                  height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryCard extends StatelessWidget {
  const _HistoryCard({required this.log});

  final TriageLog log;

  @override
  Widget build(BuildContext context) {
    final severity = (log.severity ?? 'moderada').toLowerCase();
    final color = switch (severity) {
      'emergencia' || 'emergência' => AppColors.danger,
      'alta' => AppColors.warning,
      'baixa' => AppColors.success,
      _ => AppColors.accent,
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 9,
            height: 38,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(5),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  log.symptoms,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 12.8,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  '${formatDateShort(log.createdAt)} · '
                  '${log.suggestedSpecialty ?? 'sem especialidade'}',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.45),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
