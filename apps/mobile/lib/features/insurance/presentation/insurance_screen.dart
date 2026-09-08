import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/skeleton.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/insurance_repository.dart';

final insuranceRepositoryProvider = Provider<InsuranceRepository>((ref) =>
    InsuranceRepository(ref.watch(supabaseClientProvider)));

final insurancePlansProvider =
    FutureProvider<List<InsurancePlan>>((ref) =>
        ref.watch(insuranceRepositoryProvider).fetchPlans());

final myPoliciesProvider =
    FutureProvider<List<MyInsurancePolicy>>((ref) =>
        ref.watch(insuranceRepositoryProvider).fetchMyPolicies());

/// Seguros — planos de saúde disponíveis, cobertura e as minhas
/// apólices. Subscrição cria apólice `pending` (confirmação da
/// seguradora activa depois).
class InsuranceScreen extends ConsumerWidget {
  const InsuranceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plans = ref.watch(insurancePlansProvider);
    final policies = ref.watch(myPoliciesProvider);

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
                      'Seguros de saúde',
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
                'Cobre consultas, farmácia e exames com planos de '
                'seguradoras parceiras. Subscreve e a apólice fica na '
                'tua carteira de saúde.',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.55),
                  fontSize: 12.5,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 16),

              // ── As minhas apólices ─────────────────────────────
              policies.when(
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
                data: (list) {
                  if (list.isEmpty) return const SizedBox.shrink();
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'AS MINHAS APÓLICES',
                        style: TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 10),
                      for (final p in list)
                        _PolicyCard(p: p),
                      const SizedBox(height: 18),
                    ],
                  );
                },
              ),

              // ── Planos disponíveis ─────────────────────────────
              const Text(
                'PLANOS DISPONÍVEIS',
                style: TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 10),
              plans.when(
                loading: () => const ListSkeleton(count: 3, itemHeight: 190),
                error: (_, __) => const EmptyState(
                  icon: Icons.shield_outlined,
                  title: 'Sem planos',
                  message:
                      'Não foi possível carregar os planos de seguro '
                      'neste momento.',
                ),
                data: (list) {
                  if (list.isEmpty) {
                    return const EmptyState(
                      icon: Icons.shield_outlined,
                      title: 'Ainda sem planos activos',
                      message:
                          'As seguradoras parceiras ainda não têm planos '
                          'activos. Volta em breve.',
                    );
                  }
                  return Column(
                    children: [
                      for (final p in list) _PlanCard(plan: p),
                    ],
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

class _PlanCard extends ConsumerWidget {
  const _PlanCard({required this.plan});

  final InsurancePlan plan;

  Future<void> _subscribe(BuildContext context, WidgetRef ref) async {
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        padding: const EdgeInsets.fromLTRB(22, 18, 22, 24),
        decoration: const BoxDecoration(
          gradient:
              LinearGradient(colors: [AppColors.bgHigh, AppColors.bgDeep]),
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Subscrever ${plan.name}',
              style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              'Mensalidade de ${formatMZN(plan.monthlyPrice)} paga por '
              'M-Pesa para a seguradora. A apólice fica pendente até '
              'confirmação e o número de membro é atribuído depois.',
              style: TextStyle(
                color: Colors.white.withOpacity(0.6),
                fontSize: 12.5,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: GlassGhostButton(
                    label: 'Cancelar',
                    onPressed: () => Navigator.of(ctx).pop(false),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: GradientButton(
                    label: 'Subscrever',
                    icon: Icons.shield_rounded,
                    onPressed: () => Navigator.of(ctx).pop(true),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
    if (confirmed != true) return;
    try {
      await ref.read(insuranceRepositoryProvider).subscribe(plan.id);
      ref.invalidate(myPoliciesProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          backgroundColor: AppColors.success,
          content: Text('Subscrição registada — estado pendente de '
              'confirmação.'),
        ));
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          backgroundColor: AppColors.danger,
          content: Text('Não foi possível subscrever este plano.'),
        ));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: const Color(0x2E1E6B9C),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: const Icon(Icons.shield_rounded,
                    color: Color(0xFF38BDF8), size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      plan.name,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w800,
                        fontSize: 14.5,
                      ),
                    ),
                    Text(
                      '${plan.company.name}'
                      '${plan.company.city == null ? '' : ' · ${plan.company.city}'}',
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
                  Text(
                    formatMZN(plan.monthlyPrice),
                    style: const TextStyle(
                      color: AppColors.success,
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                  const Text(
                    '/mês',
                    style: TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 10.5,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _CoveragePill(
                  label: '${plan.coveragePercent.toStringAsFixed(0)}% '
                      'cobertura'),
              const SizedBox(width: 8),
              if (plan.maxCoverage != null)
                _CoveragePill(
                    label:
                        'até ${formatMZN(plan.maxCoverage!, withSymbol: false)}'),
              const Spacer(),
            ],
          ),
          if (plan.description?.isNotEmpty == true) ...[
            const SizedBox(height: 10),
            Text(
              plan.description!,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: Colors.white.withOpacity(0.55),
                fontSize: 12,
                height: 1.45,
              ),
            ),
          ],
          const SizedBox(height: 12),
          GradientButton(
            label: 'Subscrever plano',
            icon: Icons.arrow_forward_rounded,
            height: 44,
            onPressed: () => _subscribe(context, ref),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 220.ms).slideY(
          begin: 0.06,
          curve: Curves.easeOutCubic,
        );
  }
}

class _CoveragePill extends StatelessWidget {
  const _CoveragePill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0x1422C55E),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: AppColors.success,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _PolicyCard extends ConsumerWidget {
  const _PolicyCard({required this.p});

  final MyInsurancePolicy p;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final (label, color) = switch (p.status) {
      'pending' => ('Pendente', AppColors.warning),
      'active' => ('Activa', AppColors.success),
      'cancelled' => ('Cancelada', AppColors.textMuted),
      'expired' => ('Expirada', AppColors.textMuted),
      _ => (p.status, AppColors.textMuted),
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child:
                Icon(Icons.shield_rounded, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  p.memberNumber == null
                      ? 'Apólice ${p.id.substring(0, 8)}'
                      : 'Membro ${p.memberNumber}',
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 13.5,
                  ),
                ),
                Text(
                  formatRelative(p.createdAt),
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.45),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 10.5,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
