import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/offline/offline_cache.dart';

/// Favoritos — MESMA tabela `favorites` da versão web (StoreDetail ♥):
///
///   favorites(user_id, store_id → stores.id, product_id → products.id)
///
/// Sincronização web ↔ app em tempo real: a web grava o coração na
/// tabela, a app recebe via `.stream()` do Supabase Realtime (e
/// vice-versa). RLS garante que cada utilizador só vê os seus.
class FavoriteStore {
  const FavoriteStore({
    required this.favoriteId,
    required this.id,
    required this.name,
    this.type,
    this.city,
    this.address,
    this.imageUrl,
    this.rating,
  });

  final String favoriteId;
  final String id;
  final String name;
  final String? type;
  final String? city;
  final String? address;
  final String? imageUrl;
  final double? rating;

  factory FavoriteStore.fromJson(Map<String, dynamic> j) => FavoriteStore(
        favoriteId: j['favorite_id'] as String,
        id: j['id'] as String,
        name: (j['name'] ?? 'Farmácia') as String,
        type: j['type'] as String?,
        city: j['city'] as String?,
        address: j['address'] as String?,
        imageUrl: j['image_url'] as String?,
        rating: double.tryParse(j['rating']?.toString() ?? ''),
      );
}

class FavoriteProduct {
  const FavoriteProduct({
    required this.favoriteId,
    required this.id,
    required this.name,
    this.imageUrl,
    this.price,
  });

  final String favoriteId;
  final String id;
  final String name;
  final String? imageUrl;
  final double? price;

  factory FavoriteProduct.fromJson(Map<String, dynamic> j) =>
      FavoriteProduct(
        favoriteId: j['favorite_id'] as String,
        id: j['id'] as String,
        name: (j['name'] ?? 'Produto') as String,
        imageUrl: j['image_url'] as String?,
        price: double.tryParse(j['price']?.toString() ?? ''),
      );
}

class FavoritesRepository {
  FavoritesRepository(this._client);

  final SupabaseClient _client;

  String? get _uid => _client.auth.currentUser?.id;

  /// Farmácias favoritas (join com `stores`, igual ao web).
  Future<List<FavoriteStore>> fetchStores() async {
    final uid = _uid;
    if (uid == null) return const [];
    try {
      final rows = await OfflineCache.instance.cachedList(
        'favorites_stores',
        fetch: () async {
          final r = await _client
              .from('favorites')
              .select('id as favorite_id, store:stores!store_id('
                  'id, name, type, city, address, image_url, rating)')
              .eq('user_id', uid)
              .not('store_id', 'is', null)
              .order('created_at');
          return [
            for (final x in (r as List))
              {
                ...(((x as Map)['store'] as Map?) ?? const {})
                    .cast<String, dynamic>(),
                'favorite_id': (x as Map)['favorite_id'],
              },
          ];
        },
      );
      return [for (final r in rows) FavoriteStore.fromJson(r)];
    } catch (_) {
      return const [];
    }
  }

  /// Produtos favoritos (join com `products`, igual ao web).
  Future<List<FavoriteProduct>> fetchProducts() async {
    final uid = _uid;
    if (uid == null) return const [];
    try {
      final r = await _client
          .from('favorites')
          .select('id as favorite_id, product:products!product_id('
              'id, name, image_url, price)')
          .eq('user_id', uid)
          .not('product_id', 'is', null)
          .order('created_at');
      final rows = <Map<String, dynamic>>[
        for (final x in (r as List))
          {
            ...(((x as Map)['product'] as Map?) ?? const {})
                .cast<String, dynamic>(),
            'favorite_id': (x as Map)['favorite_id'],
          },
      ];
      return [for (final r in rows) FavoriteProduct.fromJson(r)];
    } catch (_) {
      return const [];
    }
  }

  /// Ids de farmácias favoritas — para o coração no detalhe da
  /// instituição (mesma verificação do useFavorites() do web).
  Future<Set<String>> favoriteStoreIds() async {
    final uid = _uid;
    if (uid == null) return {};
    try {
      final r = await _client
          .from('favorites')
          .select('store_id')
          .eq('user_id', uid)
          .not('store_id', 'is', null);
      return {
        for (final x in (r as List))
          if (x is Map && x['store_id'] != null) x['store_id'] as String,
      };
    } catch (_) {
      return {};
    }
  }

  /// Adiciona / remove o coração de uma farmácia (idempotente).
  /// Devolve true se ficou favorito, false se foi removido.
  Future<bool> toggleStore(String storeId) async {
    final uid = _uid;
    if (uid == null) return false;
    final existing = await _client
        .from('favorites')
        .select('id')
        .eq('user_id', uid)
        .eq('store_id', storeId)
        .limit(1);
    if (existing is List && existing.isNotEmpty) {
      await _client
          .from('favorites')
          .delete()
          .eq('id', (existing.first as Map)['id'] as String);
      return false; // removido
    }
    await _client.from('favorites').insert({
      'user_id': uid,
      'store_id': storeId,
    });
    return true; // adicionado
  }

  /// Remove por id da linha de favorito (coração na lista).
  Future<void> remove(String favoriteId) =>
      _client.from('favorites').delete().eq('id', favoriteId);

  /// Stream realtime dos favoritos: qualquer coração posto na web
  /// aparece aqui sem refresh (e vice-versa). Igual ao padrão
  /// `.stream()` já usado em lab_exam_orders / wallets.
  Stream<List<Map<String, dynamic>>> watchRaw() {
    final uid = _uid;
    if (uid == null) return const Stream.empty();
    return _client
        .from('favorites')
        .stream(primaryKey: ['id'])
        .eq('user_id', uid)
        .order('created_at');
  }
}

final favoritesRepositoryProvider = Provider<FavoritesRepository>((ref) {
  return FavoritesRepository(Supabase.instance.client);
});
