import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/offline/offline_cache.dart';

/// Encomendas de farmácia — MESMAS tabelas da versão web
/// (`/orders` e `/order/:id`):
///
///   orders(id, user_id, store_id, status, subtotal, delivery_fee,
///          total, delivery_address, notes, is_priority,
///          requires_cold_chain, created_at, updated_at)
///   order_items(order_id, quantity, unit_price, product_id → products)
///
/// O estado vem da farmácia/web (pending → … → delivered) e chega à
/// app via Supabase Realtime — o mesmo canal "orders-updates" que a
/// versão web subscreve.
class PharmacyOrder {
  final String id;
  final String status;
  final double total;
  final double subtotal;
  final double deliveryFee;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String? deliveryAddress;
  final String? notes;
  final bool isPriority;
  final bool requiresColdChain;
  final String? storeId;

  /// Resolvidos em lote depois do stream (o realtime não faz joins).
  String storeName;
  String? storeImageUrl;
  String? storeType;
  List<OrderItem> items;

  PharmacyOrder({
    required this.id,
    required this.status,
    required this.total,
    required this.subtotal,
    required this.deliveryFee,
    required this.createdAt,
    this.updatedAt,
    this.deliveryAddress,
    this.notes,
    this.isPriority = false,
    this.requiresColdChain = false,
    this.storeId,
    this.storeName = 'Farmácia',
    this.storeImageUrl,
    this.storeType,
    this.items = const [],
  });

  bool get isActive =>
      status != 'delivered' && status != 'cancelled';

  /// Rótulos e cores — espelham statusConfig da versão web.
  String get statusLabel {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'confirmed':
        return 'Confirmado';
      case 'preparing':
        return 'A Preparar';
      case 'ready':
        return 'Pronto';
      case 'in_transit':
        return 'A Caminho';
      case 'delivered':
        return 'Entregue';
      case 'cancelled':
        return 'Cancelado';
    }
    return status;
  }

  factory PharmacyOrder.fromJson(Map<String, dynamic> j) {
    final store = (j['store'] as Map?)?.cast<String, dynamic>();
    final rawItems = (j['order_items'] as List?) ?? const [];
    return PharmacyOrder(
      id: j['id'] as String,
      status: (j['status'] ?? 'pending') as String,
      total: double.tryParse(j['total']?.toString() ?? '') ?? 0,
      subtotal: double.tryParse(j['subtotal']?.toString() ?? '') ?? 0,
      deliveryFee:
          double.tryParse(j['delivery_fee']?.toString() ?? '') ?? 0,
      createdAt:
          (DateTime.tryParse(j['created_at']?.toString() ?? '') ??
                  DateTime.now())
              .toLocal(), // F33: UTC → local ("Hoje/Ontem" ficavam trocados)
      updatedAt: DateTime.tryParse(j['updated_at']?.toString() ?? '')
          ?.toLocal(),
      deliveryAddress: j['delivery_address'] as String?,
      notes: j['notes'] as String?,
      isPriority: j['is_priority'] as bool? ?? false,
      requiresColdChain: j['requires_cold_chain'] as bool? ?? false,
      storeId: store?['id'] as String?,
      storeName: (store?['name'] ?? 'Farmácia') as String,
      storeImageUrl: store?['image_url'] as String?,
      storeType: store?['type'] as String?,
      items: [
        for (final it in rawItems)
          OrderItem.fromJson((it as Map).cast<String, dynamic>()),
      ],
    );
  }
}

class OrderItem {
  const OrderItem({
    required this.quantity,
    required this.unitPrice,
    this.name = 'Produto',
    this.imageUrl,
  });

  final int quantity;
  final double unitPrice;
  final String name;
  final String? imageUrl;

  double get lineTotal => quantity * unitPrice;

  factory OrderItem.fromJson(Map<String, dynamic> j) {
    final product = (j['product'] as Map?)?.cast<String, dynamic>();
    return OrderItem(
      quantity: int.tryParse(j['quantity']?.toString() ?? '') ?? 1,
      unitPrice:
          double.tryParse(j['unit_price']?.toString() ?? '') ?? 0,
      name: (product?['name'] ?? 'Produto') as String,
      imageUrl: product?['image_url'] as String?,
    );
  }
}

class OrdersRepository {
  OrdersRepository(this._client);

  final SupabaseClient _client;

  static const _select = 'id, status, total, subtotal, delivery_fee, '
      'delivery_address, notes, created_at, updated_at, is_priority, '
      'requires_cold_chain, '
      'store:stores(id, name, image_url, type), '
      'order_items(id, quantity, unit_price, product:products(name, image_url))';

  String? get _uid => _client.auth.currentUser?.id;

  /// Lista de encomendas do utilizador (mais recentes primeiro),
  /// com cache offline — a app abre com o histórico mesmo sem rede.
  Future<List<PharmacyOrder>> fetchOrders() async {
    final uid = _uid;
    if (uid == null) return const [];
    try {
      final rows = await OfflineCache.instance.cachedList(
        'orders_all',
        fetch: () async {
          final r = await _client
              .from('orders')
              .select(_select)
              .eq('user_id', uid)
              .order('created_at', ascending: false)
              .limit(60);
          return [
            for (final x in (r as List))
              (x as Map).cast<String, dynamic>(),
          ];
        },
      );
      return [for (final r in rows) PharmacyOrder.fromJson(r)];
    } catch (_) {
      return const [];
    }
  }

  /// Detalhe de uma encomenda (tracking).
  Future<PharmacyOrder?> fetchOrder(String id) async {
    try {
      final r = await _client
          .from('orders')
          .select(_select)
          .eq('id', id)
          .limit(1);
      if (r is List && r.isNotEmpty) {
        return PharmacyOrder.fromJson((r.first as Map).cast<String, dynamic>());
      }
    } catch (_) {}
    return null;
  }

  /// Stream realtime das encomendas do utilizador — a farmácia muda o
  /// estado na web/painel e o tracking da app avança sozinho.
  /// (`.stream()` não aceita joins: resolve store + items em lote,
  /// mesmo padrão de watchMyOrders() dos laboratórios.)
  Stream<List<PharmacyOrder>> watchOrders() {
    final uid = _uid;
    if (uid == null) return const Stream.empty();
    return _client
        .from('orders')
        .stream(primaryKey: ['id'])
        .eq('user_id', uid)
        .order('created_at')
        .asyncMap((rows) async {
          var orders = [
            for (final r in rows)
              PharmacyOrder.fromJson(_withEmbeds(
                (r as Map).cast<String, dynamic>(),
              )),
          ];
          orders.sort((a, b) => b.createdAt.compareTo(a.createdAt));
          orders = orders.take(60).toList();
          await _resolveEmbeds(orders);
          return orders;
        });
  }

  /// Stream realtime de uma encomenda (ecrã de tracking).
  Stream<PharmacyOrder?> watchOrder(String id) {
    return _client
        .from('orders')
        .stream(primaryKey: ['id'])
        .eq('id', id)
        .asyncMap((rows) async {
          if (rows.isEmpty) return null;
          final order = PharmacyOrder.fromJson(_withEmbeds(
            (rows.first as Map).cast<String, dynamic>(),
          ));
          await _resolveEmbeds([order]);
          return order;
        });
  }

  /// stream() entrega apenas colunas próprias — fabrica o shape com
  /// `store`/`order_items` vazios para o fromJson não rebentar.
  Map<String, dynamic> _withEmbeds(Map<String, dynamic> row) => {
        ...row,
        'store': null,
        'order_items': const <dynamic>[],
      };

  /// Resolve stores + order_items (+ nome do produto) em lote para
  /// uma lista de encomendas (silencioso — falha não afecta o estado).
  Future<void> _resolveEmbeds(List<PharmacyOrder> orders) async {
    if (orders.isEmpty) return;
    final storeIds = {
      for (final o in orders)
        if (o.storeId != null) o.storeId!,
    };
    final names = <String, String>{};
    final images = <String, String?>{};
    if (storeIds.isNotEmpty) {
      try {
        final stores = await _client
            .from('stores')
            .select('id, name, image_url')
            .inFilter('id', storeIds.toList());
        for (final s in (stores as List)) {
          final m = (s as Map).cast<String, dynamic>();
          names[m['id'] as String] = (m['name'] ?? 'Farmácia') as String;
          images[m['id'] as String] = m['image_url'] as String?;
        }
      } catch (_) {}
    }
    try {
      final ids = orders.map((o) => o.id).toList();
      final items = await _client
          .from('order_items')
          .select(
              'order_id, quantity, unit_price, product:products(name, image_url)')
          .inFilter('order_id', ids);
      final byOrder = <String, List<OrderItem>>{};
      for (final it in (items as List)) {
        final m = (it as Map).cast<String, dynamic>();
        byOrder.putIfAbsent(m['order_id'] as String, () => []).add(
              OrderItem.fromJson(m),
            );
      }
      for (final o in orders) {
        o.items = byOrder[o.id] ?? const [];
      }
    } catch (_) {}
    for (final o in orders) {
      if (o.storeId != null && names.containsKey(o.storeId)) {
        o.storeName = names[o.storeId]!;
        o.storeImageUrl = images[o.storeId];
      }
    }
  }
}

final ordersRepositoryProvider = Provider<OrdersRepository>((ref) {
  return OrdersRepository(Supabase.instance.client);
});
