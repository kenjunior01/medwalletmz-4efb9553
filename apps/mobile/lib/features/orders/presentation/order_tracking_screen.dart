import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../data/orders_repository.dart';

/// Tracking de encomenda — espelho da página `/order/:id` da web:
/// timeline de 6 estados (Pendente → … → Entregue), barra de
/// progresso, items, totais e dados do entregador. Avança sozinho
/// via Supabase Realtime (mesma actualização que a web).
class OrderTrackingScreen extends ConsumerStatefulWidget {
  const OrderTrackingScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<OrderTrackingScreen> createState() =>
      _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends ConsumerState<OrderTrackingScreen> {
  StreamSubscription? _sub;
  PharmacyOrder? _order;
  bool _loading = true;
  DriverInfo? _driver;

  static const _steps = [
    ('pending', 'Pendente', 'Aguardando confirmação',
        Icons.schedule_rounded),
    ('confirmed', 'Confirmado', 'Pedido aceite pela farmácia',
        Icons.check_circle_rounded),
    ('preparing', 'A Preparar', 'O pedido está a ser preparado',
        Icons.restaurant_rounded),
    ('ready', 'Pronto', 'Pronto para recolha',
        Icons.inventory_2_rounded),
    ('in_transit', 'A Caminho', 'Entregador a caminho',
        Icons.local_shipping_rounded),
    ('delivered', 'Entregue', 'Pedido entregue!',
        Icons.check_circle_rounded),
  ];

  OrdersRepository get _repo => ref.read(ordersRepositoryProvider);

  @override
  void initState() {
    super.initState();
    _load();
    _sub = _repo.watchOrder(widget.orderId).listen((order) {
      if (!mounted || order == null) return;
      setState(() {
        _order = order;
        _loading = false;
      });
      _loadDriver();
    });
  }

  Future<void> _load() async {
    final order = await _repo.fetchOrder(widget.orderId);
    if (!mounted) return;
    setState(() {
      _order = order;
      _loading = false;
    });
    _loadDriver();
  }

  /// Entregador (driver_assignments + profiles) — igual ao web.
  Future<void> _loadDriver() async {
    final info = await _fetchDriver();
    if (!mounted) return;
    setState(() => _driver = info);
  }

  Future<DriverInfo?> _fetchDriver() async {
    try {
      final client = Supabase.instance.client;
      final rows = await client
          .from('driver_assignments')
          .select('driver_id, status, assigned_at, picked_up_at, '
              'delivered_at')
          .eq('order_id', widget.orderId)
          .limit(1);
      if (rows is! List || rows.isEmpty) return null;
      final a = (rows.first as Map).cast<String, dynamic>();
      final driverId = a['driver_id'] as String?;
      String? name;
      String? phone;
      String? vehicle;
      if (driverId != null) {
        try {
          final p = await client
              .from('profiles')
              .select('full_name, phone, vehicle_type')
              .eq('user_id', driverId)
              .limit(1);
          if (p is List && p.isNotEmpty) {
            final m = (p.first as Map).cast<String, dynamic>();
            name = m['full_name'] as String?;
            phone = m['phone'] as String?;
            vehicle = m['vehicle_type'] as String?;
          }
        } catch (_) {}
      }
      return DriverInfo(
        name: name ?? 'Entregador',
        phone: phone,
        vehicle: vehicle,
        status: a['status'] as String?,
      );
    } catch (_) {
      return null;
    }
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  int get _stepIndex {
    final status = _order?.status;
    if (status == null) return 0;
    final i = _steps.indexWhere((s) => s.$1 == status);
    return i >= 0 ? i : 0;
  }

  bool get _cancelled => _order?.status == 'cancelled';

  @override
  Widget build(BuildContext context) {
    final order = _order;
    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Cabeçalho ────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(6, 8, 16, 4),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon:        Icon(Icons.arrow_back_rounded,
                          color: AppColors.textPrimary),
                    ),
                           Expanded(
                      child: Text(
                        'A acompanhar pedido',
                        style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                           Icon(Icons.sync_rounded,
                        size: 16, color: AppColors.textSecondary),
                  ],
                ),
              ),
              Expanded(
                child: _loading
                    ?        Center(
                        child: CircularProgressIndicator(
                            color: AppColors.accent),
                      )
                    : order == null
                        ? const _NotFound()
                        : RefreshIndicator(
                            onRefresh: _load,
                            color: AppColors.accent,
                            child: ListView(
                              padding: const EdgeInsets.fromLTRB(
                                  20, 8, 20, 40),
                              children: [
                                _StoreCard(order: order),
                                const SizedBox(height: 14),
                                if (_cancelled)
                                  const _CancelledCard()
                                else ...[
                                  _TimelineCard(
                                    order: order,
                                    steps: _steps,
                                    current: _stepIndex,
                                  ),
                                  const SizedBox(height: 14),
                                  if (_driver != null) ...[
                                    _DriverCard(driver: _driver!),
                                    const SizedBox(height: 14),
                                  ],
                                ],
                                _ItemsCard(order: order),
                                const SizedBox(height: 14),
                                _TotalsCard(order: order),
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

// ── Loja ───────────────────────────────────────────────────────────

class _StoreCard extends StatelessWidget {
         _StoreCard({required this.order});

  final PharmacyOrder order;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: (order.storeImageUrl ?? '').isNotEmpty
                ? Image.network(
                    order.storeImageUrl!,
                    width: 48,
                    height: 48,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _fallback,
                  )
                : _fallback,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  order.storeName,
                  style:        TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                  ),
                ),
                if ((order.deliveryAddress ?? '').isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 3),
                    child: Row(
                      children: [
                               Icon(Icons.place_rounded,
                            size: 13, color: AppColors.textSecondary),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            order.deliveryAddress!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style:        TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget get _fallback => Container(
        width: 48,
        height: 48,
        alignment: Alignment.center,
        decoration: const BoxDecoration(
          color: Color(0x1438BDF8),
          borderRadius: BorderRadius.all(Radius.circular(12)),
        ),
        child:        Icon(Icons.local_pharmacy_rounded,
            color: AppColors.accent, size: 22),
      );
}

// ── Timeline ───────────────────────────────────────────────────────

class _TimelineCard extends StatelessWidget {
         _TimelineCard({
    required this.order,
    required this.steps,
    required this.current,
  });

  final PharmacyOrder order;
  final List<(String, String, String, IconData)> steps;
  final int current;

  @override
  Widget build(BuildContext context) {
    final progress = ((current + 1) / steps.length).clamp(0.0, 1.0);
    return Container(
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
              Expanded(
                child: Text(
                  steps[current].$2,
                  style:        TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
              ),
              Text(
                '${(progress * 100).round()}%',
                style:        TextStyle(
                  color: AppColors.accent,
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: const Color(0x22223B4F),
              valueColor:
                         AlwaysStoppedAnimation<Color>(AppColors.accent),
            ),
          ),
          const SizedBox(height: 16),
          for (var i = 0; i < steps.length; i++)
            _StepRow(
              step: steps[i],
              state: i < current
                  ? _StepState.done
                  : i == current
                      ? _StepState.current
                      : _StepState.todo,
              isLast: i == steps.length - 1,
            ),
        ],
      ),
    );
  }
}

enum _StepState { done, current, todo }

class _StepRow extends StatelessWidget {
         _StepRow({
    required this.step,
    required this.state,
    required this.isLast,
  });

  final (String, String, String, IconData) step;
  final _StepState state;
  final bool isLast;

  Color get _color {
    switch (state) {
      case _StepState.done:
        return const Color(0xFF22C55E);
      case _StepState.current:
        return AppColors.accent;
      case _StepState.todo:
        return AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final (key, label, description, icon) = step;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Trilho
          Column(
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: state == _StepState.todo
                      ? const Color(0x14223B4F)
                      : _color.withOpacity(0.16),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: _color.withOpacity(state == _StepState.todo
                        ? 0.35
                        : 0.7),
                  ),
                ),
                child: Icon(icon, size: 15, color: _color),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2,
                    color: state == _StepState.done
                        ? const Color(0xFF22C55E).withOpacity(0.5)
                        : const Color(0x1E223B4F),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),
          // Texto
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 14, top: 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      color: state == _StepState.todo
                          ? AppColors.textSecondary
                          : AppColors.textPrimary,
                      fontWeight: FontWeight.w700,
                      fontSize: 13.5,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    description,
                    style:        TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 11.5,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Entregador ─────────────────────────────────────────────────────

class DriverInfo {
         DriverInfo({
    required this.name,
    this.phone,
    this.vehicle,
    this.status,
  });

  final String name;
  final String? phone;
  final String? vehicle;
  final String? status;
}

class _DriverCard extends StatelessWidget {
         _DriverCard({required this.driver});

  final DriverInfo driver;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              color: Color(0x1438BDF8),
              shape: BoxShape.circle,
            ),
            child:        Icon(Icons.two_wheeler_rounded,
                color: AppColors.accent),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  driver.name,
                  style:        TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
                Text(
                  _vehicleLabel(driver.vehicle),
                  style:        TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          if ((driver.phone ?? '').isNotEmpty)
            IconButton(
              tooltip: 'Ligar ao entregador',
              // F33 — antes era onPressed vazio: o botão de telefone não
              // fazia nada. Agora liga de verdade via url_launcher.
              onPressed: () async {
                final phone = driver.phone?.trim() ?? '';
                if (phone.isEmpty) return;
                try {
                  await launchUrl(
                    Uri(scheme: 'tel', path: phone),
                    mode: LaunchMode.externalApplication,
                  );
                } catch (_) {
                  // dispositivo sem capacidade de chamada — ignora
                }
              },
              icon: const Icon(Icons.phone_rounded,
                  color: Color(0xFF22C55E)),
            ),
        ],
      ),
    );
  }

  String _vehicleLabel(String? v) {
    switch (v) {
      case 'bicycle':
        return 'Bicicleta';
      case 'car':
        return 'Carro';
      default:
        return 'Mota';
    }
  }
}

// ── Items ──────────────────────────────────────────────────────────

class _ItemsCard extends StatelessWidget {
         _ItemsCard({required this.order});

  final PharmacyOrder order;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
                 Text(
            'ITEMS DO PEDIDO',
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(height: 10),
          if (order.items.isEmpty)
                   Text(
              'Sem detalhe de items disponível.',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12.5,
              ),
            )
          else
            for (final item in order.items)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Text(
                      '${item.quantity}×',
                      style:        TextStyle(
                        color: AppColors.accent,
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        item.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style:        TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 13.5,
                        ),
                      ),
                    ),
                    Text(
                      // F33 — formatMZN com cêntimos (era arredondado).
                      formatMZN(item.lineTotal),
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w700,
                        fontSize: 12.5,
                      ),
                    ),
                  ],
                ),
              ),
          if ((order.notes ?? '').isNotEmpty) ...[
            const SizedBox(height: 6),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0x14223B4F),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                order.notes!,
                style:        TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ── Totais ─────────────────────────────────────────────────────────

class _TotalsCard extends StatelessWidget {
         _TotalsCard({required this.order});

  final PharmacyOrder order;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.glassFill,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        children: [
          Row(
            children: [
                     Expanded(
                child: Text('Subtotal',
                    style: TextStyle(
                        color: AppColors.textSecondary, fontSize: 13)),
              ),
              Text(
                formatMZN(order.subtotal),
                style: TextStyle(
                    color: AppColors.textPrimary, fontSize: 13),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
                     Expanded(
                child: Text('Entrega',
                    style: TextStyle(
                        color: AppColors.textSecondary, fontSize: 13)),
              ),
              Text(
                formatMZN(order.deliveryFee),
                style: TextStyle(
                    color: AppColors.textPrimary, fontSize: 13),
              ),
            ],
          ),
          const Divider(height: 18, color: Color(0x1E223B4F)),
          Row(
            children: [
                     Expanded(
                child: Text('Total',
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                    )),
              ),
              Text(
                formatMZN(order.total),
                style: TextStyle(
                  color: AppColors.accent,
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Cancelado / não encontrado ─────────────────────────────────────

class _CancelledCard extends StatelessWidget {
  const _CancelledCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0x14EF4444),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0x55EF4444)),
      ),
      child: const Row(
        children: [
          Icon(Icons.cancel_rounded, color: Color(0xFFEF4444)),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              'Este pedido foi cancelado.',
              style: TextStyle(
                color: Color(0xFFEF4444),
                fontWeight: FontWeight.w700,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NotFound extends StatelessWidget {
  const _NotFound();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
                 Icon(Icons.inventory_2_rounded,
              size: 46, color: AppColors.textSecondary),
          const SizedBox(height: 14),
                 Text(
            'Pedido não encontrado',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontWeight: FontWeight.w700,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 14),
          TextButton(
            onPressed: () => context.push('/orders'),
            child: const Text('Ver as minhas encomendas'),
          ),
        ],
      ),
    );
  }
}
