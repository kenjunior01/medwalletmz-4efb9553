import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/gradient_button.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../core/widgets/wallet_card.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/wallet_repository.dart';
import '../domain/wallet_models.dart';
import 'deposit_sheet.dart';
import 'wallet_controller.dart';
import 'withdraw_sheet.dart';

/// Histórico de levantamentos (recarrega ao abrir a aba).
final withdrawalsProvider = FutureProvider<List<WithdrawalRow>>((ref) async {
  final uid = ref.watch(currentUserIdProvider);
  if (uid == null) return const [];
  return ref.watch(walletRepositoryProvider).fetchWithdrawals(uid);
});

/// Carteira: saldo hero + ações + histórico realtime.
class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final walletAsync = ref.watch(walletStreamProvider);
    final txAsync = ref.watch(transactionsProvider);
    final profileAsync = ref.watch(profileProvider);
    final hidden = ref.watch(balanceHiddenProvider);

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 120),
            children: [
              Row(
                children: [
                  const Text(
                    'Carteira',
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () =>
                        ref.read(balanceHiddenProvider.notifier).toggle(),
                    icon: Icon(
                      hidden
                          ? Icons.visibility_off_rounded
                          : Icons.visibility_rounded,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              walletAsync.when(
                loading: () => const WalletSkeleton(),
                error: (e, _) => EmptyState(
                  icon: Icons.wifi_off_rounded,
                  title: 'Carteira offline',
                  message:
                      'Não foi possível carregar o saldo. Verifica a ligação.',
                  actionLabel: 'Tentar de novo',
                  onAction: () => ref.invalidate(walletStreamProvider),
                ),
                data: (wallet) {
                  final profile = profileAsync.value;
                  final card = WalletCard(
                    balance: wallet?.balance ?? 0,
                    ownerName: profile?.fullName,
                    hidden: hidden,
                    onToggleHidden: () =>
                        ref.read(balanceHiddenProvider.notifier).toggle(),
                    onDeposit: () => _openDeposit(context, ref, profile?.fullName),
                  );
                  final stats = _StatsRow(
                    deposited: wallet?.totalDeposited ?? 0,
                    spent: wallet?.totalSpent ?? 0,
                    hidden: hidden,
                  );
                  return Column(
                    children: [
                      card
                          .animate()
                          .fadeIn(duration: 350.ms)
                          .slideY(begin: 0.1, curve: Curves.easeOutCubic),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: GlassGhostButton(
                              label: 'Depositar',
                              icon: Icons.add_card_rounded,
                              onPressed: () =>
                                  _openDeposit(context, ref, profile?.fullName),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: GlassGhostButton(
                              label: 'Levantar',
                              icon: Icons.local_atm_rounded,
                              onPressed: wallet == null
                                  ? null
                                  : () => showModalBottomSheet<void>(
                                        context: context,
                                        isScrollControlled: true,
                                        backgroundColor: Colors.transparent,
                                        builder: (_) => WithdrawSheet(
                                          availableBalance: wallet.balance,
                                        ),
                                      ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      stats
                          .animate(delay: 120.ms)
                          .fadeIn(duration: 350.ms)
                          .slideY(begin: 0.1, curve: Curves.easeOutCubic),
                    ],
                  );
                },
              ),
              const SizedBox(height: 24),
              _WithdrawalsSection(),
              const SizedBox(height: 24),
              const _SectionTitle('Histórico de transações'),
              const SizedBox(height: 12),
              txAsync.when(
                loading: () => const ListSkeleton(count: 5, itemHeight: 72),
                error: (e, _) => EmptyState(
                  icon: Icons.receipt_long_rounded,
                  title: 'Histórico indisponível',
                  message: 'Não foi possível carregar as transações.',
                ),
                data: (txs) {
                  if (txs.isEmpty) {
                    return const EmptyState(
                      icon: Icons.receipt_long_rounded,
                      title: 'Sem transações',
                      message:
                          'O teu histórico aparece aqui. Faz o primeiro depósito via M-Pesa para começar.',
                    );
                  }
                  return Column(
                    children: [
                      for (final tx in txs)
                        _TxTile(tx: tx),
                    ],
                  )
                      .animate()
                      .fadeIn(duration: 300.ms)
                      .slideX(begin: 0.05, curve: Curves.easeOutCubic);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openDeposit(
      BuildContext context, WidgetRef ref, String? name) async {
    final uid = ref.read(currentUserIdProvider);
    if (uid == null) return;
    final profile = ref.read(profileProvider).value;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DepositSheet(
        userId: uid,
        payerName: profile?.fullName ?? 'Utilizador MedWallet',
        payerPhone:
            profile?.phone ?? Supabase.instance.client.auth.currentUser?.phone,
      ),
    );
    // Refresh após voltar (o realtime já cuida, mas garantimos o perfil).
    ref.invalidate(profileProvider);
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({
    required this.deposited,
    required this.spent,
    required this.hidden,
  });

  final double deposited;
  final double spent;
  final bool hidden;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            icon: Icons.south_west_rounded,
            color: AppColors.success,
            label: 'Depositado',
            value: hidden ? '•••' : formatMZN(deposited),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatCard(
            icon: Icons.north_east_rounded,
            color: AppColors.accent,
            label: 'Gasto em saúde',
            value: hidden ? '•••' : formatMZN(spent),
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.color,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final Color color;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color.withOpacity(0.16),
            ),
            child: Icon(icon, color: color, size: 19),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                FittedBox(
                  child: Text(
                    value,
                    style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
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

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Text(
        text,
        style: const TextStyle(
          color: AppColors.textSecondary,
          fontSize: 13,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.6,
        ),
      );
}

/// Últimos levantamentos pedidos (withdrawal_requests) — o usuário vê o
/// estado de cada pedido: em análise, aprovado, pago ou recusado.
class _WithdrawalsSection extends ConsumerWidget {
  const _WithdrawalsSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final withdrawals = ref.watch(withdrawalsProvider);

    return withdrawals.maybeWhen(
      data: (list) {
        if (list.isEmpty) return const SizedBox.shrink();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _SectionTitle('Meus levantamentos'),
            const SizedBox(height: 12),
            for (final w in list.take(5))
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.symmetric(
                    horizontal: 15, vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.glassFill,
                  borderRadius: BorderRadius.circular(15),
                  border: Border.all(color: AppColors.glassBorder),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.local_atm_rounded,
                        color: AppColors.accent, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${formatMZN(w.amount)} · ${w.method}',
                            style: const TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 13.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${formatRelative(w.createdAt)} · ${w.destination}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                color: AppColors.textMuted, fontSize: 11.5),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 9, vertical: 4),
                      decoration: BoxDecoration(
                        color: w.statusColor.withOpacity(0.14),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        w.statusLabel,
                        style: TextStyle(
                          color: w.statusColor,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ).animate().fadeIn(duration: 300.ms);
      },
      orElse: () => const SizedBox.shrink(),
    );
  }
}

class _TxTile extends StatelessWidget {
  const _TxTile({required this.tx});

  final WalletTransaction tx;

  @override
  Widget build(BuildContext context) {
    final positive = tx.isPositive;
    final (icon, color) = switch (tx.type) {
      TxType.deposit => (Icons.add_card_rounded, AppColors.success),
      TxType.debit => (Icons.medical_services_outlined, AppColors.accent),
      TxType.refund => (Icons.replay_circle_filled_rounded, AppColors.teal),
      TxType.bonus => (Icons.card_giftcard_rounded, AppColors.warning),
      _ => (Icons.sync_alt_rounded, AppColors.textSecondary),
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color.withOpacity(0.14),
              border: Border.all(color: color.withOpacity(0.3)),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tx.description?.isNotEmpty == true
                      ? tx.description!
                      : txTypeLabel(tx.type),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Text(
                      formatRelative(tx.createdAt),
                      style: const TextStyle(
                          color: AppColors.textMuted, fontSize: 12),
                    ),
                    if (tx.status == TxStatus.pending) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.warning.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'Pendente',
                          style: TextStyle(
                            color: AppColors.warning,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${positive ? '+' : '-'}${formatMZN(tx.amount, withSymbol: false)}',
                style: TextStyle(
                  color: positive ? AppColors.success : AppColors.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                ),
              ),
              Text(
                'MT',
                style: TextStyle(
                  color: AppColors.textMuted.withOpacity(0.8),
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
