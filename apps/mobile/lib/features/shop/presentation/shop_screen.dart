import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/shopify_client.dart';
import '../data/shopify_config.dart';
import '../data/shopify_models.dart';
import '../data/shopify_repository.dart';
import 'shop_controller.dart';

/// Loja Global — montra Shopify (dropshipping EUA/Canadá).
///
/// Pesquisa, coleções, ordenação e grelha de produtos com paginação
/// infinita. O carrinho e o checkout vivem no ecossistema Shopify.
class ShopScreen extends ConsumerStatefulWidget {
  const ShopScreen({super.key});

  @override
  ConsumerState<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends ConsumerState<ShopScreen> {
  final _scroll = ScrollController();
  final _searchCtrl = TextEditingController();

  List<ShopifyProduct> _products = [];
  List<ShopifyCollection> _collections = [];
  String? _shopName;
  String? _cursor;
  bool _hasNext = false;

  String? _collection;
  String? _query;
  ProductSort _sort = ProductSort.relevance;

  bool _loading = true;
  bool _loadingMore = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    _initialLoad();
  }

  @override
  void dispose() {
    _scroll.removeListener(_onScroll);
    _scroll.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scroll.position.pixels > _scroll.position.maxScrollExtent - 400 &&
        _hasNext &&
        !_loadingMore &&
        !_loading) {
      _loadMore();
    }
  }

  Future<void> _initialLoad() async {
    await ShopifyConfig.load();
    if (!mounted) return;
    await _load(reset: true);
    // Extras opcionais (nome da loja + coleções) — sem erro visível.
    try {
      final info = await ShopifyRepository.fetchShopInfo();
      if (mounted) setState(() => _shopName = info.name);
    } catch (_) {}
    try {
      final cols = await ShopifyRepository.fetchCollections();
      if (mounted) setState(() => _collections = cols);
    } catch (_) {}
  }

  Future<void> _load({required bool reset}) async {
    reset ? _loading = true : _loadingMore = true;
    if (mounted) setState(() {});
    try {
      final res = await ShopifyRepository.fetchProducts(
        after: reset ? null : _cursor,
        query: _query,
        collection: _collection,
        sort: _sort,
      );
      if (!mounted) return;
      setState(() {
        _products = reset ? res.products : [..._products, ...res.products];
        _cursor = res.cursor;
        _hasNext = res.hasNext;
        _error = null;
      });
    } on ShopifyException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        if (reset) _products = [];
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Não foi possível carregar os produtos da loja.');
    } finally {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadingMore = false;
      });
    }
  }

  Future<void> _loadMore() => _load(reset: false);

  void _applyFilters() {
    HapticFeedback.selectionClick();
    _cursor = null;
    _load(reset: true);
  }

  @override
  Widget build(BuildContext context) {
    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: !ShopifyConfig.hasEnvConfig && !ShopifyConfig.hasLocalConfig
              ? _NotConfigured(onConfig: () => context.push('/shop-config'))
              : CustomScrollView(
                  controller: _scroll,
                  slivers: [
                    _Header(shopName: _shopName),
                    SliverToBoxAdapter(
                      child: _TrustBar(),
                    ),
                    SliverToBoxAdapter(
                      child: _SearchSortBar(
                        searchCtrl: _searchCtrl,
                        sort: _sort,
                        onSubmit: (q) {
                          _query = q;
                          _applyFilters();
                        },
                        onSortChanged: (s) {
                          _sort = s;
                          _applyFilters();
                        },
                      ),
                    ),
                    if (_collections.isNotEmpty)
                      SliverToBoxAdapter(
                        child: _CollectionsBar(
                          collections: _collections,
                          selected: _collection,
                          onSelect: (handle) {
                            _collection = handle;
                            _applyFilters();
                          },
                        ),
                      ),
                    if (_error != null)
                      SliverToBoxAdapter(child: _ErrorBox(error: _error!, onRetry: _applyFilters))
                    else if (_loading)
                      const _GridSkeleton()
                    else if (_products.isEmpty)
                      const _EmptyGrid(hasFilters: false)
                    else
                      _ProductGrid(products: _products),
                    if (_loadingMore)
                             SliverToBoxAdapter(
                        child: Padding(
                          padding: EdgeInsets.all(16),
                          child: Center(
                            child: SizedBox(
                              width: 26,
                              height: 26,
                              child: CircularProgressIndicator(strokeWidth: 2.4, color: AppColors.accent),
                            ),
                          ),
                        ),
                      ),
                    const SliverToBoxAdapter(child: _FooterNote()),
                    const SliverToBoxAdapter(child: SizedBox(height: 110)),
                  ],
                ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Componentes
// ═══════════════════════════════════════════════════════════════════════

class _Header extends ConsumerWidget {
         _Header({this.shopName});

  final String? shopName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartCtrl = ref.watch(shopCartProvider);
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 4),
      sliver: SliverToBoxAdapter(
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF10B981), Color(0xFF0D9488)],
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF10B981).withOpacity(0.35),
                    blurRadius: 18,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: const Icon(Icons.public_rounded, color: Colors.white, size: 26),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                         Text('Loja Global',
                      style: TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 21,
                          fontWeight: FontWeight.w900)),
                  Text(
                    shopName != null ? 'pela Shopify · $shopName' : 'pela Shopify',
                    style:        TextStyle(
                        color: AppColors.textMuted, fontSize: 12),
                  ),
                ],
              ),
            ),
            ListenableBuilder(
              listenable: cartCtrl,
              builder: (context, _) => _CartButton(count: cartCtrl.count),
            ),
            const SizedBox(width: 8),
            IconButton(
              onPressed: () => context.push('/shop-config'),
              icon:        Icon(Icons.settings_rounded, color: AppColors.textSecondary),
              tooltip: 'Gestão da loja',
            ),
          ],
        ),
      ),
    );
  }
}

class _CartButton extends StatelessWidget {
         _CartButton({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/shop-cart'),
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
                   Icon(Icons.shopping_cart_rounded,
                color: AppColors.textSecondary, size: 22),
            if (count > 0)
              Positioned(
                right: 2,
                top: 2,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                  decoration: BoxDecoration(
                    color: AppColors.accent,
                    borderRadius: BorderRadius.circular(9),
                  ),
                  constraints: const BoxConstraints(minWidth: 18),
                  child: Text(
                    count > 99 ? '99+' : '$count',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF04202F)),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _TrustBar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    Widget item(IconData i, String label) => Row(children: [
          Icon(i, size: 14, color: const Color(0xFF10B981)),
          const SizedBox(width: 5),
          Text(label,
              style:        TextStyle(color: AppColors.textMuted, fontSize: 11)),
        ]);
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Wrap(
          spacing: 14,
          runSpacing: 4,
          children: [
            item(Icons.local_shipping_rounded, 'Envio EUA e Canadá'),
            item(Icons.verified_user_rounded, 'Pagamento seguro Shopify'),
            item(Icons.inventory_2_rounded, 'Rastreio incluído'),
          ],
        ),
      ),
    );
  }
}

class _SearchSortBar extends StatelessWidget {
         _SearchSortBar({
    required this.searchCtrl,
    required this.sort,
    required this.onSubmit,
    required this.onSortChanged,
  });

  final TextEditingController searchCtrl;
  final ProductSort sort;
  final ValueChanged<String> onSubmit;
  final ValueChanged<ProductSort> onSortChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 2),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: searchCtrl,
              textInputAction: TextInputAction.search,
              onSubmitted: onSubmit,
              style:        TextStyle(color: AppColors.textPrimary, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Procurar produtos…',
                hintStyle:        TextStyle(color: AppColors.textMuted),
                prefixIcon:        Icon(Icons.search_rounded,
                    color: AppColors.textMuted, size: 20),
                filled: true,
                fillColor: AppColors.glassFill,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(color: AppColors.glassBorder),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide:        BorderSide(color: AppColors.accent),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          PopupMenuButton<ProductSort>(
            initialValue: sort,
            color: AppColors.card,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            onSelected: onSortChanged,
            icon: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.glassFill,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.glassBorder),
              ),
              child:        Icon(Icons.sort_rounded, color: AppColors.textSecondary, size: 20),
            ),
            itemBuilder: (_) => ProductSort.values
                .map((s) => PopupMenuItem(
                      value: s,
                      child: Text(s.labelPt,
                          style:        TextStyle(
                              color: AppColors.textPrimary, fontSize: 13.5)),
                    ))
                .toList(),
          ),
        ],
      ),
    );
  }
}

class _CollectionsBar extends StatelessWidget {
         _CollectionsBar({
    required this.collections,
    required this.selected,
    required this.onSelect,
  });

  final List<ShopifyCollection> collections;
  final String? selected;
  final ValueChanged<String?> onSelect;

  @override
  Widget build(BuildContext context) {
    Widget chip(String? handle, String label) {
      final active = selected == handle;
      return GestureDetector(
        onTap: () => onSelect(handle),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 8),
          decoration: BoxDecoration(
            color: active ? AppColors.primary : AppColors.glassFill,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
                color: active ? AppColors.primarySoft : AppColors.glassBorder),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: active ? Colors.white : AppColors.textSecondary,
            ),
          ),
        ),
      );
    }

    return SizedBox(
      height: 46,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 5),
        children: [
          chip(null, 'Tudo'),
          const SizedBox(width: 8),
          for (final c in collections) ...[
            chip(c.handle, c.title),
            const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }
}

class _ProductGrid extends StatelessWidget {
         _ProductGrid({required this.products});

  final List<ShopifyProduct> products;

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 0.72,
        ),
        delegate: SliverChildBuilderDelegate(
          (context, i) => _ProductCard(product: products[i]),
          childCount: products.length,
        ),
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
         _ProductCard({required this.product});

  final ShopifyProduct product;

  @override
  Widget build(BuildContext context) {
    final p = product;
    return GestureDetector(
      onTap: () => context.push('/shop-product/${p.handle}'),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Imagem
            Expanded(
              child: ClipRRect(
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(20)),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (p.images.isNotEmpty)
                      Image.network(
                        p.images.first.url,
                        fit: BoxFit.cover,
                        loadingBuilder: (_, child, progress) =>
                            progress == null
                                ? child
                                : Container(color: AppColors.bgHigh),
                        errorBuilder: (_, __, ___) => Container(
                          color: AppColors.bgHigh,
                          child:        Icon(Icons.shopping_bag_rounded,
                              color: AppColors.textMuted, size: 34),
                        ),
                      )
                    else
                      Container(
                        color: AppColors.bgHigh,
                        child:        Icon(Icons.shopping_bag_rounded,
                            color: AppColors.textMuted, size: 34),
                      ),
                    if (p.discountPercent > 0)
                      Positioned(
                        left: 8,
                        top: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.danger,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '-${p.discountPercent}%',
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.w900),
                          ),
                        ),
                      ),
                    if (!p.available)
                      Positioned.fill(
                        child: ColoredBox(
                          color: const Color(0x99060F1A),
                          child: Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 5),
                              decoration: BoxDecoration(
                                color: const Color(0xE610263C),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child:        Text('Esgotado',
                                  style: TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w800)),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            // Texto
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (p.vendor != null && p.vendor!.isNotEmpty)
                    Text(
                      p.vendor!.toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style:        TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.6),
                    ),
                  const SizedBox(height: 2),
                  Text(
                    p.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style:        TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        height: 1.15),
                  ),
                  const SizedBox(height: 5),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Flexible(
                        child: Text(
                          p.priceMin.formatted(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style:        TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 13.5,
                              fontWeight: FontWeight.w900),
                        ),
                      ),
                      if (p.discountPercent > 0 && p.priceCompareAt != null)
                        const SizedBox(width: 5),
                      if (p.discountPercent > 0 && p.priceCompareAt != null)
                        Text(
                          p.priceCompareAt!.formatted(),
                          style:        TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 10.5,
                              decoration: TextDecoration.lineThrough),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GridSkeleton extends StatelessWidget {
  const _GridSkeleton();

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 0.72,
        ),
        delegate: SliverChildBuilderDelegate(
          (context, i) => const AppSkeleton(height: 240, radius: 20),
          childCount: 4,
        ),
      ),
    );
  }
}

class _EmptyGrid extends StatelessWidget {
         _EmptyGrid({required this.hasFilters});

  final bool hasFilters;

  @override
  Widget build(BuildContext context) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 60),
        child: Column(
          children: [
                   Icon(Icons.inventory_2_rounded,
                size: 56, color: AppColors.textMuted),
            const SizedBox(height: 14),
                   Text('Nenhum produto encontrado',
                style: TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 15)),
            const SizedBox(height: 6),
            Text(
              'Ainda não há produtos publicados na loja.\nAdiciona-os no Shopify Admin.',
              textAlign: TextAlign.center,
              style:        TextStyle(
                  color: AppColors.textMuted, fontSize: 12.5, height: 1.5),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorBox extends StatelessWidget {
         _ErrorBox({required this.error, required this.onRetry});

  final String error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.danger.withOpacity(0.08),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.danger.withOpacity(0.35)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children:        [
                Icon(Icons.error_outline_rounded,
                    color: AppColors.danger, size: 20),
                SizedBox(width: 8),
                Text('Erro ao carregar a loja',
                    style: TextStyle(
                        color: AppColors.danger,
                        fontWeight: FontWeight.w800,
                        fontSize: 13.5)),
              ],
            ),
            const SizedBox(height: 6),
            Text(error,
                style:        TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12.5,
                    height: 1.45)),
            const SizedBox(height: 12),
            TextButton(
              onPressed: onRetry,
              child: const Text('Tentar novamente'),
            ),
          ],
        ),
      ),
    );
  }
}

class _FooterNote extends StatelessWidget {
  const _FooterNote();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 26, 20, 0),
      child: Text(
        'Checkout e pagamentos processados pela Shopify · Preços em USD (EUA) e CAD (Canadá)',
        textAlign: TextAlign.center,
        style:        TextStyle(color: AppColors.textMuted, fontSize: 10.5, height: 1.5),
      ),
    );
  }
}

/// Ecrã mostrado quando nenhuma loja está ligada.
class _NotConfigured extends StatelessWidget {
         _NotConfigured({required this.onConfig});

  final VoidCallback onConfig;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      children: [
        const SizedBox(height: 60),
        Container(
          width: 84,
          height: 84,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: [
              const Color(0xFF10B981).withOpacity(0.25),
              const Color(0xFF0D9488).withOpacity(0.1),
            ]),
            borderRadius: BorderRadius.circular(26),
            border: Border.all(color: AppColors.glassBorder),
          ),
          child: const Icon(Icons.shopping_bag_rounded,
              size: 42, color: Color(0xFF10B981)),
        ),
        const SizedBox(height: 22),
               Text('Loja Global',
            textAlign: TextAlign.center,
            style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 23,
                fontWeight: FontWeight.w900)),
        const SizedBox(height: 10),
               Text(
          'Produtos internacionais com envio para os EUA e Canadá, '
          'geridos pela Shopify — a plataforma de e-commerce mais '
          'confiável do mundo. A loja ainda não está ligada.',
          textAlign: TextAlign.center,
          style: TextStyle(
              color: AppColors.textSecondary, fontSize: 13.5, height: 1.55),
        ),
        const SizedBox(height: 26),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: AppColors.glassBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
                     Row(children: [
                Icon(Icons.settings_rounded, size: 18, color: AppColors.accent),
                SizedBox(width: 8),
                Text('Ligar a loja em 2 minutos',
                    style: TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w800,
                        fontSize: 14)),
              ]),
              const SizedBox(height: 14),
              _step('1', 'Cria a loja em shopify.com e define os mercados EUA + Canadá.'),
              _step('2', 'Shopify Admin → Settings → Apps → Develop apps → activa a Storefront API.'),
              _step('3', 'Copia o Storefront API access token.'),
              _step('4', 'Cola o domínio e o token na Gestão da Loja.'),
            ],
          ),
        ),
        const SizedBox(height: 22),
        GestureDetector(
          onTap: onConfig,
          child: Container(
            height: 52,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              gradient:        LinearGradient(colors: AppColors.buttonGradient),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Text('Configurar loja agora',
                style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 15)),
          ),
        ),
        const SizedBox(height: 40),
      ],
    );
  }

  Widget _step(String n, String text) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 20,
              height: 20,
              alignment: Alignment.center,
              margin: const EdgeInsets.only(top: 1),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.25),
                borderRadius: BorderRadius.circular(7),
              ),
              child: Text(n,
                  style:        TextStyle(
                      color: AppColors.accent,
                      fontSize: 11,
                      fontWeight: FontWeight.w900)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(text,
                  style:        TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12.5,
                      height: 1.45)),
            ),
          ],
        ),
      );
}
