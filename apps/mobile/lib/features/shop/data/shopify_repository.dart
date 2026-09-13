import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'shopify_client.dart';
import 'shopify_models.dart';

/// Repositório da Loja Global — todas as operações Storefront API.
///
/// Encomendas, pagamentos, stock e envios (EUA/Canadá) ficam 100% na
/// Shopify; aqui só lemos a montra e gerimos o carrinho pré-checkout.
abstract final class ShopifyRepository {
  // ── Fragments GraphQL ───────────────────────────────────────────────
  static const _money = 'amount currencyCode';
  static const _image = 'url altText';
  static const _card = '''
      id handle title vendor description availableForSale tags createdAt
      images(first: 2) { edges { node { $_image } } }
      priceRange { minVariantPrice { $_money } maxVariantPrice { $_money } }
      compareAtPriceRange { minVariantPrice { $_money } }
      collections(first: 3) { edges { node { handle title } } }
''';
  static const _cartFields = '''
      id checkoutUrl totalQuantity
      cost { subtotalAmount { $_money } totalAmount { $_money } }
      lines(first: 100) {
        edges { node {
          id quantity
          cost { totalAmount { $_money } }
          merchandise {
            ... on ProductVariant {
              id title price { $_money } image { $_image }
              product { id handle title vendor }
            }
          }
        } }
      }
''';

  // ── Loja ────────────────────────────────────────────────────────────
  static Future<ShopifyShopInfo> fetchShopInfo() async {
    final data = await ShopifyClient.post('''
      query { shop { name description } }
    ''');
    return ShopifyShopInfo.fromJson(shopMap(data['shop']));
  }

  // ── Produtos ────────────────────────────────────────────────────────
  static Future<({List<ShopifyProduct> products, String? cursor, bool hasNext})>
      fetchProducts({
    int first = 24,
    String? after,
    String? query,
    String? collection,
    ProductSort sort = ProductSort.relevance,
  }) async {
    final q = [
      if (query != null && query.trim().isNotEmpty) query.trim(),
      if (collection != null && collection.isNotEmpty)
        "collection:'$collection'",
    ].join(' ');

    final data = await ShopifyClient.post('''
      query Products(\$first: Int!, \$after: String, \$query: String, \$sortKey: ProductSortKeys, \$reverse: Boolean) {
        products(first: \$first, after: \$after, query: \$query, sortKey: \$sortKey, reverse: \$reverse) {
          edges { node { $_card } }
          pageInfo { hasNextPage endCursor }
        }
      }
    ''', {
      'first': first,
      'after': after,
      'query': q.isEmpty ? null : q,
      'sortKey': sort.key,
      'reverse': sort.reverse,
    });

    final productsNode = data['products'] as Map?;
    final edges = (productsNode?['edges'] as List?) ?? const [];
    final items = edges
        .map((e) => e is Map
            ? ShopifyProduct.fromJson(shopMap(e['node']))
            : null)
        .whereType<ShopifyProduct>()
        .toList();
    final info = productsNode?['pageInfo'] as Map?;
    return (
      products: items,
      cursor: info?['endCursor'] as String?,
      hasNext: (info?['hasNextPage'] as bool?) ?? false,
    );
  }

  static Future<ShopifyProductFull?> fetchProduct(String handle) async {
    final data = await ShopifyClient.post('''
      query ProductByHandle(\$handle: String!) {
        product(handle: \$handle) {
          $_card
          descriptionHtml
          totalInventory
          options { name values }
          variants(first: 50) {
            edges { node {
              id title availableForSale price { $_money }
              selectedOptions { name value }
            } }
          }
        }
      }
    ''', {'handle': handle});

    final p = data['product'];
    if (p is! Map) return null;

    final options = <ShopifyOption>[];
    final rawOpts = (p['options'] as List?) ?? const [];
    for (final o in rawOpts) {
      if (o is Map) {
        options.add(ShopifyOption(
          name: (o['name'] as String?) ?? '',
          values: ((o['values'] as List?) ?? const [])
              .whereType<String>()
              .toList(),
        ));
      }
    }
    final variants = <ShopifyVariant>[];
    final rawVars = p['variants'] is Map
        ? ((p['variants']['edges'] as List?) ?? const [])
        : const [];
    for (final e in rawVars) {
      if (e is Map) {
        variants.add(ShopifyVariant.fromJson(shopMap(e['node'])));
      }
    }
    return ShopifyProductFull(
      product: ShopifyProduct.fromJson(Map<String, dynamic>.from(p)),
      options: options,
      variants: variants,
      totalInventory: p['totalInventory'] is int
          ? p['totalInventory'] as int
          : int.tryParse('${p['totalInventory']}'),
    );
  }

  // ── Coleções ────────────────────────────────────────────────────────
  static Future<List<ShopifyCollection>> fetchCollections(
      {int first = 20}) async {
    final data = await ShopifyClient.post('''
      query Collections(\$first: Int!) {
        collections(first: \$first) {
          edges { node { id handle title image { $_image } } }
        }
      }
    ''', {'first': first});
    final cols = data['collections'] as Map?;
    final edges = (cols?['edges'] as List?) ?? const [];
    return edges
        .map((e) => e is Map
            ? ShopifyCollection.fromJson(shopMap(e['node']))
            : null)
        .whereType<ShopifyCollection>()
        .toList();
  }

  // ── Carrinho (Storefront Cart API) ──────────────────────────────────
  static Future<ShopifyCart> cartCreate(List<({String variantId, int qty})> lines) async {
    final data = await ShopifyClient.post('''
      mutation CartCreate(\$lines: [CartLineInput!]!) {
        cartCreate(input: { lines: \$lines }) {
          cart { $_cartFields }
          userErrors { field message }
        }
      }
    ''', {
      'lines': lines
          .map((l) => {'merchandiseId': l.variantId, 'quantity': l.qty})
          .toList(),
    });
    final res = data['cartCreate'] as Map;
    _throwUserErrors(res['userErrors']);
    final cart = res['cart'];
    if (cart is! Map) throw ShopifyException('Não foi possível criar o carrinho.');
    return ShopifyCart.fromJson(shopMap(cart));
  }

  static Future<ShopifyCart?> fetchCart(String cartId) async {
    final data = await ShopifyClient.post('''
      query Cart(\$cartId: ID!) { cart(id: \$cartId) { $_cartFields } }
    ''', {'cartId': cartId});
    final cart = data['cart'];
    return cart is Map ? ShopifyCart.fromJson(shopMap(cart)) : null;
  }

  static Future<ShopifyCart> cartLinesAdd(
      String cartId, List<({String variantId, int qty})> lines) async {
    final data = await ShopifyClient.post('''
      mutation CartLinesAdd(\$cartId: ID!, \$lines: [CartLineUpdateInput!]!) {
        cartLinesAdd(cartId: \$cartId, lines: \$lines) {
          cart { $_cartFields }
          userErrors { field message }
        }
      }
    ''', {
      'cartId': cartId,
      'lines': lines
          .map((l) => {'merchandiseId': l.variantId, 'quantity': l.qty})
          .toList(),
    });
    final res = data['cartLinesAdd'] as Map;
    _throwUserErrors(res['userErrors']);
    final cart = res['cart'];
    if (cart is! Map) throw ShopifyException('Carrinho não encontrado.');
    return ShopifyCart.fromJson(shopMap(cart));
  }

  static Future<ShopifyCart> cartLinesUpdate(
      String cartId, List<({String lineId, int qty})> lines) async {
    final data = await ShopifyClient.post('''
      mutation CartLinesUpdate(\$cartId: ID!, \$lines: [CartLineUpdateInput!]!) {
        cartLinesUpdate(cartId: \$cartId, lines: \$lines) {
          cart { $_cartFields }
          userErrors { field message }
        }
      }
    ''', {
      'cartId': cartId,
      'lines': lines
          .map((l) => {'id': l.lineId, 'quantity': l.qty})
          .toList(),
    });
    final res = data['cartLinesUpdate'] as Map;
    _throwUserErrors(res['userErrors']);
    final cart = res['cart'];
    if (cart is! Map) throw ShopifyException('Carrinho não encontrado.');
    return ShopifyCart.fromJson(shopMap(cart));
  }

  static Future<ShopifyCart> cartLinesRemove(
      String cartId, List<String> lineIds) async {
    final data = await ShopifyClient.post('''
      mutation CartLinesRemove(\$cartId: ID!, \$lineIds: [ID!]!) {
        cartLinesRemove(cartId: \$cartId, lineIds: \$lineIds) {
          cart { $_cartFields }
          userErrors { field message }
        }
      }
    ''', {'cartId': cartId, 'lineIds': lineIds});
    final res = data['cartLinesRemove'] as Map;
    _throwUserErrors(res['userErrors']);
    final cart = res['cart'];
    if (cart is! Map) throw ShopifyException('Carrinho não encontrado.');
    return ShopifyCart.fromJson(shopMap(cart));
  }

  static void _throwUserErrors(dynamic errs) {
    if (errs is List && errs.isNotEmpty) {
      final first = errs.first;
      final msg = first is Map ? (first['message']?.toString() ?? '') : '';
      throw ShopifyException(
          msg.isEmpty ? 'A loja recusou a operação.' : msg, 'user_error');
    }
  }
}

/// Ordenação disponível na montra.
enum ProductSort {
  relevance('RELEVANCE', false),
  bestSelling('BEST_SELLING', false),
  newest('CREATED_AT', true),
  priceAsc('PRICE', false),
  priceDesc('PRICE', true);

  const ProductSort(this.key, this.reverse);
  final String key;
  final bool reverse;

  String get labelPt => switch (this) {
        relevance => 'Relevância',
        bestSelling => 'Mais vendidos',
        newest => 'Novidades',
        priceAsc => 'Preço: mais baixo',
        priceDesc => 'Preço: mais alto',
      };
}

/// Chave do carrinho persistida no dispositivo.
class CartStore {
  static const _key = 'shopify.cartId';

  static Future<String?> read() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_key);
    } catch (_) {
      return null;
    }
  }

  static Future<void> write(String? id) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (id == null) {
        await prefs.remove(_key);
      } else {
        await prefs.setString(_key, id);
      }
    } catch (_) {}
  }
}
