import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/subscriptions_repository.dart';

/// Planos MedWallet — paridade com `pages/subscribe/*` + `MzPricingPlans`:
/// planos do paciente com checkout M-Pesa manual (referência MW-XXXXXX,
/// instruções e envio do comprovativo), e as minhas subscrições.
class PlansScreen extends ConsumerStatefulWidget {
  const PlansScreen({super.key});

  @override
  ConsumerState<PlansScreen> createState() => _PlansScreenState();
}

class _PlansScreenState extends ConsumerState<PlansScreen> {
  bool _loading = true;
  List<SubPlan> _plans = const [];
  List<MySubscription> _subs = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final repo = ref.read(subscriptionsRepositoryProvider);
    final plans = await repo.fetchPlans('patient');
    final subs = await repo.fetchMySubscriptions();
    if (!mounted) return;
    setState(() {
      _plans = plans;
      _subs = subs;
      _loading = false;
    });
  }

  Future<void> _subscribe(SubPlan plan) async {
    final phone = await _askPhone();
    if (phone == null || phone.isEmpty) return;
    final repo = ref.read(subscriptionsRepositoryProvider);
    final (err, payment) = await repo.subscribe(plan: plan, phone: phone);
    if (!mounted) return;
    if (err != null || payment == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(err ?? 'Erro ao iniciar a subscrição.'),
        backgroundColor: AppColors.warning,
      ));
      return;
    }
    // Instrucções de pagamento → depois o utilizador cola o tx ID.
    if (!mounted) return;
    await _showPaymentInstructions(plan, payment, phone);
    _load();
  }

  Future<String?> _askPhone() async {
    final controller = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bgHigh,
        title: const Text('M-Pesa para cobrar',
            style: TextStyle(
                color: AppColors.textPrimary, fontSize: 17)),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.phone,
          autofocus: true,
          style: const TextStyle(color: AppColors.textPrimary),
          decoration: const InputDecoration(
            hintText: '84x xxx xxx',
            hintStyle: TextStyle(color: AppColors.textMuted),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () =>
                Navigator.pop(ctx, controller.text.trim()),
            child: const Text('Continuar'),
          ),
        ],
      ),
    );
    return result;
  }

  Future<void> _showPaymentInstructions(
      SubPlan plan, MpesaManualPayment payment, String phone) async {
    final txController = TextEditingController();
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bgHigh,
        title: const Text('Paga com M-Pesa',
            style: TextStyle(color: AppColors.textPrimary, fontSize: 17)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _step('1', 'Abre o M-Pesa no teu telefone.'),
              _step('2', 'Escolhe "Pagar Comércio".'),
              _step(
                  '3', 'Número: ${payment.destinationNumber} (MedWallet).'),
              _step('4', 'Valor: ${formatMZN(payment.amount)}.'),
              _step('5',
                  'Referência: ${payment.reference} — usa-a quando possível.'),
              const SizedBox(height: 12),
              const Text(
                  'Depois de pagar, cola o ID de transacção (SMS do M-Pesa) para acelerar a activação:',
                  style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12.5,
                      height: 1.4)),
              const SizedBox(height: 10),
              TextField(
                controller: txController,
                style: const TextStyle(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                  hintText: 'Ex: PP240912.1234.A56789',
                  hintStyle: TextStyle(color: AppColors.textMuted),
                  isDense: true,
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Pago depois'),
          ),
          FilledButton(
            onPressed: () async {
              final tx = txController.text.trim();
              if (tx.isEmpty) {
                Navigator.pop(ctx);
                return;
              }
              // Recupera o id da subscrição criada — o comprovativo
              // actualiza a subscrição pendente mais recente.
              final subs =
                  await ref.read(subscriptionsRepositoryProvider).fetchMySubscriptions();
              final pending = subs
                  .where((s) => s.status == 'pending')
                  .toList();
              if (pending.isNotEmpty) {
                await ref.read(subscriptionsRepositoryProvider).submitProof(
                      subscriptionId: pending.first.id,
                      txReference: tx,
                      phone: phone,
                    );
              }
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Enviar comprovativo'),
          ),
        ],
      ),
    );
  }

  Widget _step(String n, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 18,
            height: 18,
            alignment: Alignment.center,
            margin: const EdgeInsets.only(top: 1),
            decoration: const BoxDecoration(
              color: AppColors.accent,
              shape: BoxShape.circle,
            ),
            child: Text(
              n,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text,
                style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12.5,
                    height: 1.35)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: RefreshIndicator(
            color: AppColors.accent,
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 40),
              children: [
                Row(
                  children: [
                    _IconBtn(
                        icon: Icons.arrow_back_rounded,
                        onTap: () => context.pop()),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Planos MedWallet',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 21,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // As minhas subscrições
                if (_subs.isNotEmpty) ...[
                  const Text(
                    'As minhas subscrições',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 10),
                  for (final s in _subs) _SubTile(sub: s),
                  const SizedBox(height: 18),
                ],

                const Text(
                  'Planos para pacientes',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 10),
                if (_loading)
                  const Column(
                    children: [
                      AppSkeleton(height: 200),
                      SizedBox(height: 12),
                      AppSkeleton(height: 200),
                    ],
                  )
                else if (_plans.isEmpty)
                  const EmptyState(
                    icon: Icons.workspace_premium_rounded,
                    title: 'Sem planos disponíveis',
                    message:
                        'Os planos MedWallet aparecerão aqui quando forem publicados.',
                  )
                else
                  for (final p in _plans)
                    _PlanCard(
                      plan: p,
                      onSubscribe: () => _subscribe(p),
                    ).animate().fadeIn(duration: 240.ms).slideY(
                        begin: 0.04, end: 0),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Widgets
// ═══════════════════════════════════════════════════════════════════════════

class _IconBtn extends StatelessWidget {
  const _IconBtn({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.glassFill,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.glassBorder),
          ),
          child: Icon(icon, color: AppColors.textPrimary, size: 20),
        ),
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({required this.plan, required this.onSubscribe});
  final SubPlan plan;
  final VoidCallback onSubscribe;

  @override
  Widget build(BuildContext context) {
    final featured = (plan.badge ?? '').isNotEmpty;
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: featured
            ? LinearGradient(
                colors: [
                  AppColors.accent.withOpacity(0.22),
                  AppColors.primary.withOpacity(0.12),
                ],
              )
            : null,
        color: featured ? null : AppColors.glassFill,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: featured
              ? AppColors.accent.withOpacity(0.4)
              : AppColors.glassBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  plan.name,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w900,
                    fontSize: 17,
                  ),
                ),
              ),
              if (featured)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.accent.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    plan.badge!,
                    style: const TextStyle(
                      color: AppColors.accent,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                formatMZN(plan.price, withSymbol: false),
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontWeight: FontWeight.w900,
                  fontSize: 26,
                ),
              ),
              const SizedBox(width: 6),
              const Padding(
                padding: EdgeInsets.only(bottom: 4),
                child: Text(
                  'MT/mês',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
          if (plan.description != null &&
              plan.description!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              plan.description!,
              style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12.5,
                  height: 1.4),
            ),
          ],
          if (plan.features.isNotEmpty) ...[
            const SizedBox(height: 12),
            for (final f in plan.features)
              Padding(
                padding: const EdgeInsets.only(bottom: 5),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.check_circle_rounded,
                        size: 15, color: AppColors.success),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        f,
                        style: const TextStyle(
                            color: AppColors.textSecondary, fontSize: 12.5),
                      ),
                    ),
                  ],
                ),
              ),
          ],
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: onSubscribe,
              style: FilledButton.styleFrom(
                backgroundColor:
                    featured ? AppColors.accent : AppColors.glassFillStrong,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Subscrever com M-Pesa',
                  style: TextStyle(fontWeight: FontWeight.w800)),
            ),
          ),
        ],
      ),
    );
  }
}

class _SubTile extends StatelessWidget {
  const _SubTile({required this.sub});
  final MySubscription sub;

  Color get _color {
    switch (sub.status) {
      case 'active':
        return AppColors.success;
      case 'pending':
        return AppColors.warning;
      case 'rejected':
      case 'cancelled':
        return AppColors.danger;
      default:
        return AppColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  sub.planName ?? 'Plano',
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 13.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  sub.expiresAt != null
                      ? 'Válida até ${formatDateShort(sub.expiresAt!)}'
                      : formatRelative(sub.createdAt),
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 11.5),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: _color.withOpacity(0.14),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              sub.statusLabel,
              style: TextStyle(
                color: _color,
                fontSize: 10.5,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
