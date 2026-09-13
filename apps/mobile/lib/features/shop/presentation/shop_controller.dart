import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/shopify_client.dart';
import '../data/shopify_models.dart';
import '../data/shopify_repository.dart';

/// Estado global do carrinho da Loja Global (Shopify Storefront Cart API).
///
/// O carrinho vive na Shopify e o id é persistido no dispositivo — o
/// cliente pode começar no telemóvel e terminar o checkout noutro canal.
/// Pagamento, envio (EUA/Canadá) e impostos são geridos pela Shopify.
///
/// Usa Riverpod core (Provider) + ChangeNotifier: os ecrãs observam o
/// controller com `ref.watch(shopCartProvider)` e reconstruem com
/// `ListenableBuilder(listenable: cart)`.
class ShopCartController extends ChangeNotifier {
  ShopifyCart? cart;
  bool loading = false;
  bool busy = false;
  String? error;

  int get count => cart?.totalQuantity ?? 0;

  List<ShopifyCartLine> get lines => cart?.lines ?? const <ShopifyCartLine>[];

  Future<void> refresh() async {
    final id = await CartStore.read();
    if (id == null) {
      cart = null;
      notifyListeners();
      return;
    }
    loading = true;
    error = null;
    notifyListeners();
    try {
      cart = await ShopifyRepository.fetchCart(id); // null se expirou
    } on ShopifyException catch (e) {
      if (e.code == 'not_found') {
        cart = null;
        await CartStore.write(null);
      } else {
        error = e.message;
      }
    } catch (_) {
      error = 'Não foi possível actualizar o carrinho.';
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  /// Devolve true se adicionou com sucesso.
  Future<bool> add(String variantId, {int qty = 1}) async {
    busy = true;
    error = null;
    notifyListeners();
    try {
      final currentId = await CartStore.read();
      if (currentId != null) {
        try {
          cart = await ShopifyRepository.cartLinesAdd(
              currentId, [(variantId: variantId, qty: qty)]);
          await CartStore.write(cart!.id);
          return true;
        } on ShopifyException catch (e) {
          // Carrinho pode ter expirado — cria um novo abaixo.
          if (e.code != 'not_found' && e.code != 'user_error') rethrow;
        }
      }
      final fresh = await ShopifyRepository.cartCreate(
          [(variantId: variantId, qty: qty)]);
      cart = fresh;
      await CartStore.write(fresh.id);
      return true;
    } on ShopifyException catch (e) {
      error = e.message;
      return false;
    } catch (_) {
      error = 'Erro ao adicionar ao carrinho.';
      return false;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> updateQty(String lineId, int qty) async {
    final id = cart?.id ?? await CartStore.read();
    if (id == null) return;
    busy = true;
    error = null;
    notifyListeners();
    try {
      if (qty <= 0) {
        cart = await ShopifyRepository.cartLinesRemove(id, [lineId]);
      } else {
        cart = await ShopifyRepository.cartLinesUpdate(
            id, [(lineId: lineId, qty: qty)]);
      }
    } on ShopifyException catch (e) {
      error = e.message;
    } catch (_) {
      error = 'Erro ao actualizar o carrinho.';
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> remove(String lineId) => updateQty(lineId, 0);

  /// Limpa o carrinho local (ex.: loja trocada).
  Future<void> reset() async {
    cart = null;
    await CartStore.write(null);
    notifyListeners();
  }

  /// Abre o checkout alojado da Shopify (pagamento, envio, impostos).
  Future<bool> openCheckout() async {
    final url = cart?.checkoutUrl;
    if (url == null || url.isEmpty) return false;
    final uri = Uri.parse(url);
    return launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}

/// Provider global do carrinho — instância única partilhada pelos ecrãs.
final shopCartProvider = Provider<ShopCartController>((ref) {
  final controller = ShopCartController();
  ref.onDispose(controller.dispose);
  return controller;
});
