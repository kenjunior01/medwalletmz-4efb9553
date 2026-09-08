import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/config.dart';
import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/proposal_models.dart';
import 'earn_controller.dart';

/// "Ganhe com o MedWallet" — cresce a rede e ganha dinheiro.
/// Submete instituições que a plataforma ainda não tem (farmácias,
/// clínicas, veterinárias…) com localização, ponto de referência,
/// telefone e 3–4 fotos do exterior. Aprovação = recompensa na carteira.
class EarnHomeScreen extends ConsumerWidget {
  const EarnHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final proposals = ref.watch(myProposalsProvider);
    final stats = ref.watch(contributorStatsProvider);

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
                      'Ganhe com o MedWallet',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Conheces uma farmácia, clínica ou veterinária que a '
                'plataforma não tem? Submete e recebe quando for aprovada.',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.55),
                  fontSize: 13,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 16),

              // ── Hero de recompensa ───────────────────────────────
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0x2E22C55E), Color(0x141E6B9C)],
                  ),
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: const Color(0x4D22C55E)),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'ATÉ '
                                '${AppConfig.rewardPerProposal.toStringAsFixed(0)} '
                                'MT POR INSTITUIÇÃO',
                                style: const TextStyle(
                                  color: AppColors.success,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1,
                                ),
                              ),
                              const SizedBox(height: 5),
                              const Text(
                                'Dinheiro real, sem pontos nem moedas '
                                'virtuais: creditado directamente na tua '
                                'carteira na moeda do país.',
                                style: TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12.5,
                                  height: 1.45,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.savings_rounded,
                            color: AppColors.success, size: 42),
                      ],
                    ),
                    const SizedBox(height: 14),
                    GradientButton(
                      label: 'Adicionar instituição',
                      icon: Icons.add_business_rounded,
                      height: 50,
                      onPressed: () => context.push('/earn-submit'),
                    ),
                  ],
                ),
              )
                  .animate()
                  .fadeIn(duration: 300.ms)
                  .slideY(begin: 0.1, curve: Curves.easeOutCubic),
              const SizedBox(height: 16),

              // ── Estatísticas ─────────────────────────────────────
              Row(
                children: [
                  _StatCard(
                      label: 'Enviadas',
                      value: '${stats.total}',
                      color: AppColors.accent),
                  _StatCard(
                      label: 'Aprovadas',
                      value: '${stats.approved}',
                      color: AppColors.success),
                  _StatCard(
                      label: 'Ganhos',
                      value: formatMZN(stats.earned, withSymbol: false)
                          .replaceAll(' MT', ''),
                      suffix: ' ${stats.currency == 'MZN' ? 'MT' : stats.currency}',
                      color: const Color(0xFFFBBF24)),
                ],
              ),
              const SizedBox(height: 22),

              // ── Como funciona ────────────────────────────────────
              const Text(
                'COMO FUNCIONA',
                style: TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 10),
              _HowStep(
                  n: 1,
                  text:
                      'Identifica uma instituição de saúde nova — farmácia, '
                      'clínica, hospital, laboratório ou veterinária.'),
              _HowStep(
                  n: 2,
                  text:
                      'Preenche os dados: nome, telefone, bairro, paragem ou '
                      'ponto de referência mais próximo e 3–4 fotos do '
                      'exterior.'),
              _HowStep(
                  n: 3,
                  text:
                      'O gestor regional do teu país valida a informação e '
                      'aprova.'),
              _HowStep(
                  n: 4,
                  text:
                      'Recebes a recompensa na carteira e a instituição fica '
                      'visível no directório para toda a comunidade.'),
              const SizedBox(height: 22),

              // ── As minhas submissões ─────────────────────────────
              const Text(
                'AS MINHAS SUBMISSÕES',
                style: TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 10),
              proposals.when(
                loading: () => const ListSkeleton(count: 2, itemHeight: 84),
                error: (e, _) => EmptyState(
                  icon: Icons.wifi_off_rounded,
                  title: 'Não foi possível carregar',
                  message: 'Verifica a ligação e tenta de novo.',
                  actionLabel: 'Recarregar',
                  onAction: () => ref.invalidate(myProposalsProvider),
                ),
                data: (list) {
                  if (list.isEmpty) {
                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.glassFill,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: AppColors.glassBorder),
                      ),
                      child: Column(
                        children: [
                          const Icon(Icons.travel_explore_rounded,
                              color: AppColors.accent, size: 32),
                          const SizedBox(height: 8),
                          Text(
                            'Ainda não submeteste nenhuma instituição.',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.6),
                              fontSize: 12.5,
                            ),
                          ),
                        ],
                      ),
                    );
                  }
                  return Column(
                    children: list
                        .map((p) => _ProposalCard(p: p))
                        .toList(),
                  );
                },
              ),

              if (stats.pending >= AppConfig.maxPendingPerUser) ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    'Tens o máximo de submissões em análise '
                    '(${AppConfig.maxPendingPerUser}). Espera pelas '
                    'avaliações para continuar.',
                    style: TextStyle(
                        color: AppColors.warning, fontSize: 12, height: 1.4),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ── Peças ───────────────────────────────────────────────────────────────

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.color,
    this.suffix = '',
  });

  final String label;
  final String value;
  final Color color;
  final String suffix;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Column(
          children: [
            Text(
              '$value$suffix',
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w800,
                fontSize: 17,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                color: Colors.white.withOpacity(0.5),
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HowStep extends StatelessWidget {
  const _HowStep({required this.n, required this.text});

  final int n;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 24,
            height: 24,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0x2E38BDF8),
            ),
            child: Text(
              '$n',
              style: const TextStyle(
                color: AppColors.accent,
                fontWeight: FontWeight.w800,
                fontSize: 12,
              ),
            ),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: Colors.white.withOpacity(0.66),
                fontSize: 12.8,
                height: 1.45,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProposalCard extends StatelessWidget {
  const _ProposalCard({required this.p});

  final PlaceProposal p;

  @override
  Widget build(BuildContext context) {
    final (label, icon, color) = entityTypeInfo(p.entityType);
    final statusColor = proposalStatusColor(p.status);
    final reward = p.rewardAmount ?? AppConfig.rewardPerProposal;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(17),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(13),
            ),
            child: Icon(icon, color: color, size: 21),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  p.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 13.8,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  '$label · ${p.city}',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.5),
                    fontSize: 11.5,
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.14),
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Text(
                  proposalStatusLabel(p.status),
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                p.rewardPaid
                    ? '+${reward.toStringAsFixed(0)} ${p.rewardCurrency == 'MZN' ? 'MT' : p.rewardCurrency} pago'
                    : '+${reward.toStringAsFixed(0)} se aprovada',
                style: TextStyle(
                  color: p.rewardPaid
                      ? AppColors.success
                      : Colors.white.withOpacity(0.45),
                  fontSize: 10.5,
                  fontWeight:
                      p.rewardPaid ? FontWeight.w800 : FontWeight.w400,
                ),
              ),
            ],
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 260.ms)
        .slideY(begin: 0.07, curve: Curves.easeOutCubic);
  }
}
