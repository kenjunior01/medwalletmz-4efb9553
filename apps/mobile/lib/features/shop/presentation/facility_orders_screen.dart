import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../../auth/presentation/auth_controller.dart';

/// F36 — Painel de encomendas das instituições do dono (paridade web
/// /store/orders). Aparece no perfil de quem possui lojas (owner_id):
/// confirmar, preparar, entregar e cancelar pedidos dos clientes.
///
/// Estados EXACTOS do CHECK constraint de orders.status:
/// ('pending','confirmed','preparing','delivering','delivered','cancelled').
/// A RLS "Store owners can update order status" autoriza via owner_id.
class FacilityOrdersScreen extends ConsumerStatefulWidget {
  const FacilityOrdersScreen({super.key});

  @override
  ConsumerState<FacilityOrdersScreen> createState() =>
      _FacilityOrdersScreenState();
}

class _FacilityOrder {
  final String id;
  final String storeId;
  final String status;
  final num subtotal;
  final num deliveryFee;
  final num total;
  final String? deliveryAddress;
  final String? notes;
  final DateTime createdAt;
  final String storeName;
  final List<_FacilityOrderItem> items;

  _FacilityOrder({
    required this.id,
    required this.storeId,
    required this.status,
    required this.subtotal,
    required this.deliveryFee,
    required this.total,
    required this.createdAt,
    required this.storeName,
    required this.items,
    this.deliveryAddress,
    this.notes,
  });

  static _FacilityOrder fromMap(Map<String, dynamic> m, String storeName) {
    final items = <_FacilityOrderItem>[];
    final rawItems = m['items'];
    if (rawItems is List) {
      for (final it in rawItems) {
        if (it is! Map) continue;
        final product = it['product'];
        items.add(_FacilityOrderItem(
          quantity: (it['quantity'] as num?) ?? 0,
          unitPrice: (it['unit_price'] as num?) ?? 0,
          productName: product is Map ? (product['name'] ?? '') as String : '',
        ));
      }
    }
    return _FacilityOrder(
      id: (m['id'] ?? '') as String,
      storeId: (m['store_id'] ?? '') as String,
      status: (m['status'] ?? 'pending') as String,
      subtotal: (m['subtotal'] as num?) ?? 0,
      deliveryFee: (m['delivery_fee'] as num?) ?? 0,
      total: (m['total'] as num?) ?? 0,
      deliveryAddress: m['delivery_address'] as String?,
      notes: m['notes'] as String?,
      createdAt:
          DateTime.tryParse((m['created_at'] ?? '') as String)?.toLocal() ??
              DateTime.now(),
      storeName: storeName,
      items: items,
    );
  }
}

class _FacilityOrderItem {
  final num quantity;
  final num unitPrice;
  final String productName;
  const _FacilityOrderItem({
    required this.quantity,
    required this.unitPrice,
    required this.productName,
  });
}

/// Próximo estado no fluxo (mesmos valores do CHECK constraint).
String? _nextStatus(String current) {
  const flow = ['pending', 'confirmed', 'preparing', 'delivering', 'delivered'];
  final i = flow.indexOf(current);
  if (i < 0 || i >= flow.length - 1) return null;
  return flow[i + 1];
}

String _statusLabel(String s) => switch (s) {
      'pending' => 'Pendente',
      'confirmed' => 'Confirmado',
      'preparing' => 'A preparar',
      'delivering' => 'Em entrega',
      'delivered' => 'Entregue',
      'cancelled' => 'Cancelado',
      _ => s,
    };

IconData _statusIcon(String s) => switch (s) {
      'pending' => Icons.schedule_rounded,
      'confirmed' => Icons.check_circle_rounded,
      'preparing' => Icons.medication_rounded,
      'delivering' => Icons.pedal_bike_rounded,
      'delivered' => Icons.task_alt_rounded,
      'cancelled' => Icons.cancel_rounded,
      _ => Icons.receipt_long_rounded,
    };

Color _statusColor(String s) => switch (s) {
      'pending' => AppColors.warning,
      'confirmed' => AppColors.info,
      'preparing' => AppColors.accent,
      'delivering' => AppColors.teal,
      'delivered' => AppColors.success,
      'cancelled' => AppColors.danger,
      _ => AppColors.textMuted,
    };

class _FacilityOrdersRepo {
  final SupabaseClient _client;

  _FacilityOrdersRepo(this._client);

  Future<List<_FacilityOrder>> fetchOrders(String ownerId) async {
    // 1) Lojas do dono (apenas stores têm encomendas neste esquema).
    final stores = await _client
        .from('stores')
        .select('id, name')
        .eq('owner_id', ownerId)
        .limit(50);
    if (stores.isEmpty) return const [];
    final storeNames = <String, String>{
      for (final s in stores)
        (s['id'] ?? '') as String: (s['name'] ?? 'Loja') as String,
    };

    // 2) Encomendas das lojas + itens.
    final rows = await _client
        .from('orders')
        .select('*, items:order_items(id, quantity, unit_price, '
            'product:products(name))')
        .inFilter('store_id', storeNames.keys.toList())
        .order('created_at', ascending: false)
        .limit(100);

    return [
      for (final r in rows)
        _FacilityOrder.fromMap(
          Map<String, dynamic>.from(r),
          storeNames[(r['store_id'] ?? '') as String] ?? 'Loja',
        ),
    ];
  }

  Future<void> updateStatus(String orderId, String status) async {
    await _client.from('orders').update({'status': status}).eq('id', orderId);
  }
}

final _facilityOrdersRepoProvider = Provider<_FacilityOrdersRepo>((ref) {
  return _FacilityOrdersRepo(Supabase.instance.client);
});

class _FacilityOrdersScreenState extends ConsumerState<FacilityOrdersScreen> {
  List<_FacilityOrder>? _orders;
  bool _loading = true;
  String? _error;
  int _tab = 0; // 0 pendentes · 1 em curso · 2 concluídos
  String? _updatingId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final uid = ref.read(currentUserIdProvider);
      if (uid == null) throw StateError('Sem sessão — volta a entrar.');
      final repo = ref.read(_facilityOrdersRepoProvider);
      final orders = await repo.fetchOrders(uid);
      if (!mounted) return;
      setState(() {
        _orders = orders;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Não foi possível carregar as encomendas: $e';
        _loading = false;
      });
    }
  }

  Future<void> _changeStatus(_FacilityOrder order, String next) async {
    if (_updatingId != null) return;
    setState(() => _updatingId = order.id);
    try {
      final repo = ref.read(_facilityOrdersRepoProvider);
      await repo.updateStatus(order.id, next);
      if (!mounted) return;
      setState(() {
        // Actualização optimista — a lista local reflecte o novo estado.
        final idx = _orders!.indexWhere((o) => o.id == order.id);
        if (idx >= 0) {
          _orders![idx] = _FacilityOrder(
            id: order.id,
            storeId: order.storeId,
            status: next,
            subtotal: order.subtotal,
            deliveryFee: order.deliveryFee,
            total: order.total,
            createdAt: order.createdAt,
            storeName: order.storeName,
            items: order.items,
            deliveryAddress: order.deliveryAddress,
            notes: order.notes,
          );
        }
        _updatingId = null;
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Encomenda: ${_statusLabel(next)}'),
        backgroundColor: AppColors.success,
      ));
    } catch (e) {
      if (!mounted) return;
      setState(() => _updatingId = null);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Erro ao actualizar: $e'),
        backgroundColor: AppColors.danger,
      ));
    }
  }

  List<_FacilityOrder> get _filtered {
    final orders = _orders ?? const <_FacilityOrder>[];
    switch (_tab) {
      case 0:
        return orders.where((o) => o.status == 'pending').toList();
      case 1:
        return orders
            .where((o) =>
                o.status == 'confirmed' ||
                o.status == 'preparing' ||
                o.status == 'delivering')
            .toList();
      default:
        return orders
            .where((o) => o.status == 'delivered' || o.status == 'cancelled')
            .toList();
    }
  }

  @override
  Widget build(BuildContext context) {
    final orders = _orders;
    final pendingCount = orders?.where((o) => o.status == 'pending').length ?? 0;
    final activeCount = orders
            ?.where((o) =>
                o.status == 'confirmed' ||
                o.status == 'preparing' ||
                o.status == 'delivering')
            .length ??
        0;

    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: const Text('Encomendas das Lojas',
              style: TextStyle(fontWeight: FontWeight.w800)),
        ),
        body: _loading
            ? ListSkeleton(count: 4, itemHeight: 128)
            : _error != null
                ? EmptyState(
                    icon: Icons.cloud_off_rounded,
                    title: 'Erro ao carregar',
                    message: _error!,
                    actionLabel: 'Tentar de novo',
                    onAction: _load,
                  )
                : orders == null || orders.isEmpty
                    ? EmptyState(
                        icon: Icons.storefront_rounded,
                        title: 'Sem encomendas',
                        message:
                            'As encomendas dos clientes das tuas lojas aparecem aqui.',
                        actionLabel: 'Actualizar',
                        onAction: _load,
                      )
                    : Column(
                        children: [
                          _buildTabs(pendingCount, activeCount),
                          Expanded(child: _buildList()),
                        ],
                      ),
      ),
    );
  }

  Widget _buildTabs(int pendingCount, int activeCount) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Row(
          children: [
            _buildTab(0, 'Pendentes', pendingCount),
            _buildTab(1, 'Em curso', activeCount),
            _buildTab(2, 'Concluídos', 0),
          ],
        ),
      ),
    );
  }

  Widget _buildTab(int index, String label, int count) {
    final selected = _tab == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _tab = index),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected ? AppColors.primary.withOpacity(0.18) : null,
            borderRadius: BorderRadius.circular(12),
            border: selected
                ? Border.all(color: AppColors.primary.withOpacity(0.35))
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Flexible(
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight:
                        selected ? FontWeight.w800 : FontWeight.w500,
                    color: selected
                        ? AppColors.textPrimary
                        : AppColors.textSecondary,
                  ),
                ),
              ),
              if (count > 0) ...[
                const SizedBox(width: 5),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: AppColors.danger,
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: Text('$count',
                      style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: Colors.white)),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildList() {
    final list = _filtered;
    if (list.isEmpty) {
      return EmptyState(
        icon: Icons.inbox_rounded,
        title: 'Nada aqui',
        message: _tab == 0
            ? 'Sem encomendas pendentes. Novos pedidos aparecem aqui.'
            : _tab == 1
                ? 'Nenhuma encomenda em curso.'
                : 'Ainda sem encomendas concluídas.',
        actionLabel: 'Actualizar',
        onAction: _load,
      );
    }
    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        itemCount: list.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _buildOrderCard(list[i]),
      ),
    );
  }

  Widget _buildOrderCard(_FacilityOrder order) {
    final next = _nextStatus(order.status);
    final color = _statusColor(order.status);
    final busy = _updatingId == order.id;
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
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: color.withOpacity(0.14),
                ),
                child: Icon(_statusIcon(order.status), size: 19, color: color),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '#${order.id.substring(0, order.id.length >= 8 ? 8 : order.id.length)}'
                          .toUpperCase(),
                      style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 13,
                          color: AppColors.textPrimary),
                    ),
                    Text(
                      '${order.storeName} · ${formatRelative(order.createdAt)}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 11.5, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.14),
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Text(_statusLabel(order.status),
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: color)),
              ),
            ],
          ),
          if (order.items.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.glassFill,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  for (final it in order.items)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              '${it.quantity}× ${it.productName}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                  fontSize: 12.5,
                                  color: AppColors.textPrimary),
                            ),
                          ),
                          Text(
                            formatMZN(it.quantity * it.unitPrice),
                            style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ],
          if (order.deliveryAddress != null &&
              order.deliveryAddress!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.place_rounded,
                    size: 14, color: AppColors.textMuted),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(order.deliveryAddress!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 11.5, color: AppColors.textSecondary)),
                ),
              ],
            ),
          ],
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Text(
                  formatMZN(order.total),
                  style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: AppColors.textPrimary),
                ),
              ),
              if (order.status == 'pending') ...[
                _statusButton(
                  label: 'Rejeitar',
                  icon: Icons.close_rounded,
                  color: AppColors.danger,
                  busy: busy,
                  onTap: busy ? null : () => _changeStatus(order, 'cancelled'),
                ),
                const SizedBox(width: 8),
              ],
              if (next != null)
                _statusButton(
                  label: _nextLabel(next),
                  icon: Icons.arrow_forward_rounded,
                  color: AppColors.primary,
                  busy: busy,
                  onTap: busy ? null : () => _changeStatus(order, next),
                ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 240.ms).slideY(begin: 0.05, end: 0);
  }

  String _nextLabel(String next) => switch (next) {
        'confirmed' => 'Confirmar',
        'preparing' => 'A preparar',
        'delivering' => 'Saiu p/ entrega',
        'delivered' => 'Marcar entregue',
        _ => _statusLabel(next),
      };

  Widget _statusButton({
    required String label,
    required IconData icon,
    required Color color,
    required bool busy,
    VoidCallback? onTap,
  }) {
    return Material(
      color: color.withOpacity(0.16),
      borderRadius: BorderRadius.circular(11),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(11),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              busy
                  ? SizedBox(
                      width: 13,
                      height: 13,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: color))
                  : Icon(icon, size: 15, color: color),
              const SizedBox(width: 5),
              Text(label,
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: color)),
            ],
          ),
        ),
      ),
    );
  }
}
