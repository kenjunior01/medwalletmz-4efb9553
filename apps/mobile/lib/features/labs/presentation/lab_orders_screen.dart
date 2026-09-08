import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/labs_repository.dart';

/// Histórico dos pedidos de exames laboratoriais — estado realtime
/// (stream lab_exam_orders), abertura do resultado (result_url) e
/// cancelamento de pedidos ainda pendentes.
class LabOrdersScreen extends ConsumerStatefulWidget {
  const LabOrdersScreen({super.key});

  @override
  ConsumerState<LabOrdersScreen> createState() => _LabOrdersScreenState();
}

class _LabOrdersScreenState extends ConsumerState<LabOrdersScreen> {
  late final Stream<List<LabOrder>> _stream;
  bool _cancelling = false;

  @override
  void initState() {
    super.initState();
    _stream = ref.read(labsRepositoryProvider).watchMyOrders();
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'completed':
        return AppColors.success;
      case 'cancelled':
        return AppColors.danger;
      case 'confirmed':
      case 'sample_collected':
      case 'in_progress':
        return AppColors.accent;
      default:
        return AppColors.warning;
    }
  }

  IconData _statusIcon(String status) {
    switch (status) {
      case 'completed':
        return Icons.check_circle_rounded;
      case 'cancelled':
        return Icons.cancel_rounded;
      case 'sample_collected':
        return Icons.local_shipping_rounded;
      case 'in_progress':
        return Icons.science_rounded;
      case 'confirmed':
        return Icons.verified_rounded;
      default:
        return Icons.hourglass_top_rounded;
    }
  }

  Future<void> _cancel(LabOrder order) async {
    final client = ref.read(labsRepositoryProvider);
    setState(() => _cancelling = true);
    // Cancelamento directo (RLS garante que só o dono edita).
    try {
      await client.cancelOrder(order.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Pedido cancelado.'),
          behavior: SnackBarBehavior.floating,
        ));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content:
              Text('Não foi possível cancelar. Contacta o laboratório.'),
          behavior: SnackBarBehavior.floating,
        ));
      }
    }
    if (mounted) setState(() => _cancelling = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              // ── Cabeçalho ────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(6, 8, 16, 10),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    const Expanded(
                      child: Text(
                        'Os meus exames',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    TextButton.icon(
                      onPressed: () => context.push('/labs'),
                      icon: const Icon(Icons.add_circle_outline_rounded,
                          size: 17, color: AppColors.accent),
                      label: const Text('Novo',
                          style: TextStyle(
                              color: AppColors.accent,
                              fontWeight: FontWeight.w800,
                              fontSize: 13)),
                    ),
                  ],
                ),
              ),

              // ── Lista realtime ───────────────────────────────────
              Expanded(
                child: StreamBuilder<List<LabOrder>>(
                  stream: _stream,
                  builder: (context, snap) {
                    if (snap.connectionState == ConnectionState.waiting &&
                        !snap.hasData) {
                      return ListView.separated(
                        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                        itemCount: 4,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (_, __) => const AppSkeleton(
                            width: double.infinity, height: 110, radius: 20),
                      );
                    }
                    final orders = snap.data ?? const <LabOrder>[];
                    if (orders.isEmpty) {
                      return Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.biotech_rounded,
                                  size: 44, color: AppColors.textMuted),
                              const SizedBox(height: 14),
                              const Text(
                                'Sem pedidos ainda',
                                style: TextStyle(
                                    color: AppColors.textPrimary,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 16),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'Escolhe um laboratório, marca os exames e paga da carteira — o histórico aparece aqui.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 12.5),
                              ),
                              const SizedBox(height: 18),
                              ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                ),
                                onPressed: () => context.push('/labs'),
                                icon: const Icon(Icons.search_rounded,
                                    size: 17),
                                label: const Text('Ver laboratórios'),
                              ),
                            ],
                          ),
                        ),
                      );
                    }
                    return ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                      itemCount: orders.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, i) {
                        final o = orders[i];
                        return _OrderCard(
                          order: o,
                          statusColor: _statusColor(o.status),
                          statusIcon: _statusIcon(o.status),
                          cancelling: _cancelling,
                          onCancel: o.isCancellable
                              ? () => _cancel(o)
                              : null,
                          onOpenResult: o.hasResult
                              ? () async {
                                  try {
                                    await launchUrl(
                                        Uri.parse(o.resultUrl!),
                                        mode:
                                            LaunchMode.externalApplication);
                                  } catch (_) {}
                                }
                              : null,
                        )
                            .animate(delay: (50 * i).ms)
                            .fadeIn()
                            .slideY(begin: 0.06, curve: Curves.easeOut);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({
    required this.order,
    required this.statusColor,
    required this.statusIcon,
    required this.cancelling,
    this.onCancel,
    this.onOpenResult,
  });

  final LabOrder order;
  final Color statusColor;
  final IconData statusIcon;
  final bool cancelling;
  final VoidCallback? onCancel;
  final VoidCallback? onOpenResult;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.055),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.10)),
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
                  borderRadius: BorderRadius.circular(12),
                  color: AppColors.primary.withOpacity(0.22),
                ),
                child: const Icon(Icons.biotech_rounded,
                    color: AppColors.accent, size: 20),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.labName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w800,
                          fontSize: 14),
                    ),
                    Text(
                      '${formatDateShort(order.createdAt)} · ${order.items.length} exame(s)',
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 11.5),
                    ),
                  ],
                ),
              ),
              // Estado.
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.14),
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(statusIcon, size: 12, color: statusColor),
                    const SizedBox(width: 4),
                    Text(
                      order.statusLabel,
                      style: TextStyle(
                          color: statusColor,
                          fontSize: 10,
                          fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          // Exames do pedido.
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final item in order.items.take(4))
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.06),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    item.name,
                    style: const TextStyle(
                        color: AppColors.textSecondary, fontSize: 10.5),
                  ),
                ),
              if (order.items.length > 4)
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.06),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '+${order.items.length - 4}',
                    style: const TextStyle(
                        color: AppColors.textSecondary, fontSize: 10.5),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          // Agendamento / colheita.
          if (order.scheduledAt != null || order.homeCollection) ...[
            Row(
              children: [
                if (order.scheduledAt != null) ...[
                  const Icon(Icons.event_rounded,
                      size: 13, color: AppColors.accent),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      formatDateTime(order.scheduledAt!),
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 11),
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
                if (order.homeCollection) ...[
                  const Icon(Icons.home_rounded,
                      size: 13, color: AppColors.success),
                  const SizedBox(width: 4),
                  const Flexible(
                    child: Text(
                      'Colheita ao domicílio',
                      style: TextStyle(
                          color: AppColors.success, fontSize: 11),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 10),
          ],
          // Total + acções.
          Row(
            children: [
              Text(
                formatMZN(order.total),
                style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 15),
              ),
              const Spacer(),
              if (onOpenResult != null)
                TextButton.icon(
                  onPressed: onOpenResult,
                  icon: const Icon(Icons.open_in_new_rounded,
                      size: 14, color: AppColors.success),
                  label: const Text('Resultado',
                      style: TextStyle(
                          color: AppColors.success,
                          fontSize: 12,
                          fontWeight: FontWeight.w800)),
                ),
              if (onCancel != null)
                TextButton.icon(
                  onPressed: cancelling ? null : onCancel,
                  icon: Icon(Icons.close_rounded,
                      size: 14,
                      color: AppColors.danger.withOpacity(0.9)),
                  label: const Text('Cancelar',
                      style: TextStyle(
                          color: AppColors.danger,
                          fontSize: 12,
                          fontWeight: FontWeight.w700)),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
