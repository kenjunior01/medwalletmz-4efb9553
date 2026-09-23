import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../data/orders_repository.dart';

/// Encomendas de farmácia — espelho da página `/orders` da versão web:
/// abas Activas | Histórico, chips de estado coloridos, actualização
/// realtime (a farmácia avança o estado no painel e a app acompanha).
class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  StreamSubscription? _sub;
  List<PharmacyOrder> _orders = [];
  bool _loading = true;
  bool _active = true; // aba Activas | Histórico

  OrdersRepository get _repo => ref.read(ordersRepositoryProvider);

  @override
  void initState() {
    super.initState();
    _load();
    _sub = _repo.watchOrders().listen((orders) {
      if (!mounted) return;
      setState(() {
        _orders = orders;
        _loading = false;
      });
    });
  }

  Future<void> _load() async {
    final orders = await _repo.fetchOrders();
    if (!mounted) return;
    setState(() {
      _orders = orders;
      _loading = false;
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  List<PharmacyOrder> get _visible => _orders
      .where((o) => _active ? o.isActive : !o.isActive)
      .toList();

  @override
  Widget build(BuildContext context) {
    final visible = _visible;
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Cabeçalho ────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(6, 8, 16, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                    const Icon(Icons.receipt_long_rounded,
                        color: AppColors.accent),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'Encomendas',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 2, 20, 12),
                child: Text(
                  'Pedidos às farmácias — estado sincronizado com a web',
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12.5,
                  ),
                ),
              ),

              // ── Abas ─────────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                child: Row(
                  children: [
                    _Tab(
                      label: 'Activas',
                      selected: _active,
                      count: _orders.where((o) => o.isActive).length,
                      onTap: () => setState(() => _active = true),
                    ),
                    const SizedBox(width: 10),
                    _Tab(
                      label: 'Histórico',
                      selected: !_active,
                      count:
                          _orders.where((o) => !o.isActive).length,
                      onTap: () => setState(() => _active = false),
                    ),
                  ],
                ),
              ),

              // ── Lista ────────────────────────────────────────────
              Expanded(
                child: _loading
                    ? const Center(
                        child: CircularProgressIndicator(
                            color: AppColors.accent),
                      )
                    : visible.isEmpty
                        ? _EmptyOrders(active: _active)
                        : RefreshIndicator(
                            onRefresh: _load,
                            color: AppColors.accent,
                            child: ListView(
                              padding: const EdgeInsets.fromLTRB(
                                  20, 2, 20, 40),
                              children: [
                                for (final order in visible)
                                  _OrderCard(order: order)
                                      .animate()
                                      .fadeIn(
                                        duration: const Duration(
                                            milliseconds: 240),
                                      )
                                      .slideY(begin: 0.06, end: 0),
                              ],
                            ),
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Aba ────────────────────────────────────────────────────────────

class _Tab extends StatelessWidget {
  const _Tab({
    required this.label,
    required this.selected,
    required this.count,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final int count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.accent.withOpacity(0.18)
              : AppColors.glassFill,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected
                ? AppColors.accent.withOpacity(0.55)
                : AppColors.glassBorder,
          ),
        ),
        child: Row(
          children: [
            Text(
              label,
              style: TextStyle(
                color: selected
                    ? AppColors.accent
                    : AppColors.textSecondary,
                fontWeight: FontWeight.w800,
                fontSize: 13,
              ),
            ),
            if (count > 0) ...[
              const SizedBox(width: 6),
              Text(
                '$count',
                style: TextStyle(
                  color: selected
                      ? AppColors.accent
                      : AppColors.textSecondary,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Cartão de encomenda ────────────────────────────────────────────

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order});

  final PharmacyOrder order;

  Color get _statusColor {
    switch (order.status) {
      case 'pending':
        return const Color(0xFFEAB308);
      case 'confirmed':
        return const Color(0xFF3B82F6);
      case 'preparing':
        return const Color(0xFFF97316);
      case 'ready':
        return const Color(0xFFA855F7);
      case 'in_transit':
        return const Color(0xFF06B6D4);
      case 'delivered':
        return const Color(0xFF22C55E);
      case 'cancelled':
        return const Color(0xFFEF4444);
    }
    return AppColors.textSecondary;
  }

  String get _itemsLabel {
    if (order.items.isEmpty) return 'Pedido';
    final first = order.items.first;
    final extra = order.items.length - 1;
    final base =
        '${first.quantity}× ${first.name}';
    return extra > 0 ? '$base +$extra' : base;
  }

  String _fmtDate(DateTime dt) {
    final now = DateTime.now();
    final sameDay =
        dt.year == now.year && dt.month == now.month && dt.day == now.day;
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    if (sameDay) return 'Hoje $hh:$mm';
    final d = dt.day.toString().padLeft(2, '0');
    final m = dt.month.toString().padLeft(2, '0');
    return '$d/$m $hh:$mm';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () => context.push('/order-tracking/${order.id}'),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    // Loja
                    Expanded(
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: (order.storeImageUrl ?? '').isNotEmpty
                                ? Image.network(
                                    order.storeImageUrl!,
                                    width: 40,
                                    height: 40,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) =>
                                        _storeFallback,
                                  )
                                : _storeFallback,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                Text(
                                  order.storeName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: AppColors.textPrimary,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14.5,
                                  ),
                                ),
                                Text(
                                  _fmtDate(order.createdAt),
                                  style: const TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 11.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Estado
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: _statusColor.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                            color: _statusColor.withOpacity(0.5)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(
                              color: _statusColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            order.statusLabel,
                            style: TextStyle(
                              color: _statusColor,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        _itemsLabel,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12.5,
                        ),
                      ),
                    ),
                    if (order.isPriority) ...[
                      const SizedBox(width: 8),
                      const Icon(Icons.bolt_rounded,
                          size: 15, color: Color(0xFFF59E0B)),
                    ],
                    if (order.requiresColdChain) ...[
                      const SizedBox(width: 4),
                      const Icon(Icons.ac_unit_rounded,
                          size: 15, color: Color(0xFF38BDF8)),
                    ],
                    const SizedBox(width: 10),
                    Text(
                      // F33 — formatMZN: "250 MZN" arredondava cêntimos
                      // fora (249,90 MT → "250 MZN").
                      formatMZN(order.total),
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.chevron_right_rounded,
                        size: 18, color: AppColors.textSecondary),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget get _storeFallback => Container(
        width: 40,
        height: 40,
        alignment: Alignment.center,
        decoration: const BoxDecoration(
          color: Color(0x1438BDF8),
          borderRadius: BorderRadius.all(Radius.circular(10)),
        ),
        child: const Icon(Icons.local_pharmacy_rounded,
            color: AppColors.accent, size: 20),
      );
}

// ── Estado vazio ───────────────────────────────────────────────────

class _EmptyOrders extends StatelessWidget {
  const _EmptyOrders({required this.active});

  final bool active;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: const BoxDecoration(
              color: Color(0x1438BDF8),
              shape: BoxShape.circle,
            ),
            child: Icon(
              active
                  ? Icons.receipt_long_rounded
                  : Icons.history_rounded,
              size: 44,
              color: AppColors.accent,
            ),
          ),
          const SizedBox(height: 18),
          Text(
            active
                ? 'Sem encomendas activas'
                : 'Sem encomendas no histórico',
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 44),
            child: Text(
              'Os pedidos feitos à farmácia (na app ou no site) '
              'aparecem aqui com o estado em tempo real.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12.5,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
