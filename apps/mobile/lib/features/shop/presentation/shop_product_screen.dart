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

/// Detalhe de um produto da Loja Global: galeria, variantes,
/// quantidade, carrinho e compra directa (checkout Shopify).
class ShopProductScreen extends ConsumerStatefulWidget {
  const ShopProductScreen({super.key, required this.handle});

  final String handle;

  @override
  ConsumerState<ShopProductScreen> createState() => _ShopProductScreenState();
}

class _ShopProductScreenState extends ConsumerState<ShopProductScreen> {
  final PageController _gallery = PageController();

  ShopifyProductFull? _data;
  bool _loading = true;
  String? _error;

  int _imgIndex = 0;
  int _qty = 1;
  final Map<String, String> _selected = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _gallery.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    await ShopifyConfig.load();
    // F33 — back rápido durante o load: setState lançava after-dispose.
    if (!mounted) return;
    setState(() => _loading = true);
    try {
      final data = await ShopifyRepository.fetchProduct(widget.handle);
      if (!mounted) return;
      setState(() {
        _data = data;
        _error = data == null
            ? 'Produto não encontrado. Pode ter sido removido da loja.'
            : null;
      });
      if (data != null) _presetFirstAvailable(data);
    } on ShopifyException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Não foi possível carregar o produto.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _presetFirstAvailable(ShopifyProductFull data) {
    // Seleciona a primeira variante DISPONÍVEL (fallback: primeira de todas).
    ShopifyVariant? preset;
    for (final v in data.variants) {
      if (v.available) {
        preset = v;
        break;
      }
    }
    preset ??= data.variants.isNotEmpty ? data.variants.first : null;
    for (final so in preset?.selectedOptions ?? const <ShopifyOptionValue>[]) {
      if (so.name.isNotEmpty) _selected[so.name] = so.value;
    }
  }

  /// Variante que casa com a selecção actual (por pares name/value).
  ShopifyVariant? _resolveVariant(ShopifyProductFull data) {
    if (data.variants.isEmpty) return null;
    if (data.options.isEmpty) return data.variants.first;
    ShopifyVariant? fallback;
    for (final v in data.variants) {
      final all = v.selectedOptions.every(
          (so) => _selected[so.name] == null || _selected[so.name] == so.value);
      final exact = v.selectedOptions
          .every((so) => _selected[so.name] == so.value);
      if (exact) return v;
      if (all && fallback == null) fallback = v;
    }
    return fallback;
  }

  Future<void> _add({required bool goCart}) async {
    final data = _data;
    if (data == null) return;
    final variant = _resolveVariant(data);
    if (variant == null || !variant.available) return;

    HapticFeedback.mediumImpact();
    final cart = ref.read(shopCartProvider);
    final ok = await cart.add(variant.id, qty: _qty);
    if (!mounted) return;

    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          backgroundColor: AppColors.card,
          content: Text(
            'Adicionado ao carrinho · ${data.product.title}',
            style: const TextStyle(color: AppColors.textPrimary),
          ),
          action: goCart
              ? null
              : SnackBarAction(
                  label: 'Ver carrinho',
                  textColor: AppColors.accent,
                  onPressed: () => context.push('/shop-cart'),
                ),
        ),
      );
      if (goCart) context.push('/shop-cart');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          backgroundColor: AppColors.danger,
          content: Text(cart.error ?? 'Não foi possível adicionar ao carrinho.'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(shopCartProvider);

    return AppBackground(
      child: ListenableBuilder(
        listenable: cart,
        builder: (context, _) => Scaffold(
          backgroundColor: Colors.transparent,
          body: SafeArea(
            child: _loading
                ? const _LoadingView()
                : _error != null || _data == null
                    ? _ErrorView(error: _error ?? 'Erro inesperado.')
                    : _ContentView(
                        data: _data!,
                        gallery: _gallery,
                        imgIndex: _imgIndex,
                        selected: _selected,
                        qty: _qty,
                        onImg: (i) => setState(() => _imgIndex = i),
                        onOpt: (name, value) => setState(() => _selected[name] = value),
                        onQty: (q) => setState(() => _qty = q),
                        onAdd: () => _add(goCart: false),
                        onBuy: () => _add(goCart: true),
                      ),
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════

class _LoadingView extends StatelessWidget {
  const _LoadingView();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: const [
        AppSkeleton(height: 320, radius: 24),
        SizedBox(height: 18),
        AppSkeleton(height: 22, radius: 8),
        SizedBox(height: 10),
        AppSkeleton(height: 26, radius: 8, width: 140),
        SizedBox(height: 16),
        AppSkeleton(height: 90, radius: 18),
        SizedBox(height: 16),
        AppSkeleton(height: 50, radius: 16),
      ],
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.error});

  final String error;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline_rounded,
                size: 52, color: AppColors.danger),
            const SizedBox(height: 16),
            Text(error,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13.5,
                    height: 1.5)),
            const SizedBox(height: 22),
            GestureDetector(
              onTap: () => context.go('/shop'),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.glassFill,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.glassBorder),
                ),
                child: const Text('Voltar à loja',
                    style: TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ContentView extends ConsumerWidget {
  const _ContentView({
    required this.data,
    required this.gallery,
    required this.imgIndex,
    required this.selected,
    required this.qty,
    required this.onImg,
    required this.onOpt,
    required this.onQty,
    required this.onAdd,
    required this.onBuy,
  });

  final ShopifyProductFull data;
  final PageController gallery;
  final int imgIndex;
  final Map<String, String> selected;
  final int qty;
  final ValueChanged<int> onImg;
  final void Function(String, String) onOpt;
  final ValueChanged<int> onQty;
  final VoidCallback onAdd;
  final VoidCallback onBuy;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = data.product;
    final variant = _resolve(data);

    // Preço: variante seleccionada, senão intervalo.
    final price = variant?.price ?? p.priceMin;
    final showRange = variant == null && p.priceMin.amount != p.priceMax.amount;

    final canBuy = variant?.available ?? p.available;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: CustomScrollView(
      slivers: [
        // Top bar
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
            child: Row(
              children: [
                IconButton(
                  onPressed: () => context.pop(),
                  icon: const Icon(Icons.arrow_back_rounded,
                      color: AppColors.textSecondary),
                ),
                const Spacer(),
                const Text('Loja Global',
                    style: TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700)),
                const Spacer(),
                const SizedBox(width: 48),
              ],
            ),
          ),
        ),

        // Galeria
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            child: Column(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(26),
                  child: AspectRatio(
                    aspectRatio: 1,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        if (p.images.isNotEmpty)
                          PageView.builder(
                            controller: gallery,
                            itemCount: p.images.length,
                            onPageChanged: onImg,
                            itemBuilder: (_, i) => Image.network(
                              p.images[i].url,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(
                                color: AppColors.bgHigh,
                                child: const Icon(Icons.shopping_bag_rounded,
                                    color: AppColors.textMuted, size: 56),
                              ),
                            ),
                          )
                        else
                          Container(
                            color: AppColors.bgHigh,
                            child: const Icon(Icons.shopping_bag_rounded,
                                color: AppColors.textMuted, size: 56),
                          ),
                        if (p.discountPercent > 0)
                          Positioned(
                            left: 12,
                            top: 12,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: AppColors.danger,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '-${p.discountPercent}% hoje',
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w900),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                if (p.images.length > 1) ...[
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(p.images.length, (i) {
                      final active = i == imgIndex;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        width: active ? 18 : 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: active
                              ? AppColors.accent
                              : AppColors.textMuted.withOpacity(0.4),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      );
                    }),
                  ),
                ],
              ],
            ),
          ),
        ),

        // Info
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              if (p.vendor != null && p.vendor!.isNotEmpty)
                Text(p.vendor!.toUpperCase(),
                    style: const TextStyle(
                        color: AppColors.accent,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1)),
              const SizedBox(height: 4),
              Text(p.title,
                  style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      height: 1.2)),
              const SizedBox(height: 10),
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(price.formatted(),
                      style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 26,
                          fontWeight: FontWeight.w900)),
                  if (showRange)
                    Text(' – ${p.priceMax.formatted()}',
                        style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w800)),
                  const SizedBox(width: 8),
                  if (p.discountPercent > 0 && p.priceCompareAt != null)
                    Text(p.priceCompareAt!.formatted(),
                        style: const TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 14,
                            decoration: TextDecoration.lineThrough)),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Preço em ${price.currencyCode == 'CAD' ? 'dólares canadianos (CAD)' : 'dólares americanos (USD)'} · '
                'envio e impostos no checkout',
                style: const TextStyle(
                    color: AppColors.textMuted, fontSize: 11, height: 1.4),
              ),
              const SizedBox(height: 14),

              // Disponibilidade
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (canBuy)
                    _pill(
                        Icons.check_rounded,
                        'Em stock',
                        const Color(0xFF10B981).withOpacity(0.14),
                        const Color(0xFF34D399))
                  else
                    _pill(
                        Icons.block_rounded,
                        'Esgotado',
                        AppColors.glassFill,
                        AppColors.textMuted),
                  if (canBuy &&
                      data.totalInventory != null &&
                      data.totalInventory! > 0 &&
                      data.totalInventory! <= 10)
                    _pill(
                        Icons.local_fire_department_rounded,
                        'Apenas ${data.totalInventory} unidades',
                        const Color(0xFFF5A623).withOpacity(0.14),
                        const Color(0xFFF5A623)),
                ],
              ),

              // Opções
              for (final opt in data.options) ...[
                const SizedBox(height: 16),
                Text(
                  '${opt.name}${(selected[opt.name] ?? '').isNotEmpty ? '  ·  ${selected[opt.name]}' : ''}',
                  style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontSize: 13,
                      fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final value in opt.values)
                      GestureDetector(
                        onTap: () => onOpt(opt.name, value),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 160),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 9),
                          decoration: BoxDecoration(
                            color: selected[opt.name] == value
                                ? AppColors.primary
                                : AppColors.glassFill,
                            borderRadius: BorderRadius.circular(13),
                            border: Border.all(
                                color: selected[opt.name] == value
                                    ? AppColors.primarySoft
                                    : AppColors.glassBorder),
                          ),
                          child: Text(
                            value,
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: selected[opt.name] == value
                                  ? Colors.white
                                  : AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ],

              const SizedBox(height: 20),

              // Confiança
              Row(
                children: [
                  Expanded(
                      child: _trust(Icons.local_shipping_rounded,
                          'Envio EUA/Canadá')),
                  const SizedBox(width: 8),
                  Expanded(
                      child: _trust(
                          Icons.verified_user_rounded, 'Compra protegida')),
                  const SizedBox(width: 8),
                  Expanded(
                      child:
                          _trust(Icons.inventory_2_rounded, 'Rastreio incluído')),
                ],
              ),

              // Descrição
              if (stripHtml(p.descriptionHtml).isNotEmpty) ...[
                const SizedBox(height: 20),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.glassBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Descrição',
                          style: TextStyle(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w800,
                              fontSize: 13.5)),
                      const SizedBox(height: 8),
                      Text(stripHtml(p.descriptionHtml),
                          style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 12.5,
                              height: 1.6)),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 120),
            ]),
          ),
        ),
      ],
    ),
      bottomNavigationBar:
          _bottomBar(canBuy: canBuy, qty: qty, onQty: onQty, onAdd: onAdd, onBuy: onBuy),
    );
  }

  Widget _bottomBar({required bool canBuy, required int qty, required ValueChanged<int> onQty, required VoidCallback onAdd, required VoidCallback onBuy}) => Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
        decoration: BoxDecoration(
          color: const Color(0xCC0B1D31),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: AppColors.glassBorder),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withOpacity(0.4),
                blurRadius: 26,
                offset: const Offset(0, 10)),
          ],
        ),
        child: SafeArea(
          top: false,
          child: Row(
            children: [
              // Stepper
              Container(
                decoration: BoxDecoration(
                  color: AppColors.glassFill,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.glassBorder),
                ),
                child: Row(
                  children: [
                    _qtyBtn('−', () => onQty(qty > 1 ? qty - 1 : 1)),
                    Text('$qty',
                        style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w900,
                            fontSize: 14)),
                    _qtyBtn('+', () => onQty(qty < 99 ? qty + 1 : 99)),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              // Adicionar
              Expanded(
                child: GestureDetector(
                  onTap: canBuy ? onAdd : null,
                  child: Container(
                    height: 48,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      gradient: canBuy
                          ? const LinearGradient(colors: AppColors.buttonGradient)
                          : null,
                      color: canBuy ? null : AppColors.glassFill,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Text(
                      canBuy ? 'Adicionar' : 'Indisponível',
                      style: TextStyle(
                        color: canBuy
                            ? Colors.white
                            : AppColors.textMuted,
                        fontWeight: FontWeight.w800,
                        fontSize: 13.5,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Comprar agora
              GestureDetector(
                onTap: canBuy ? onBuy : null,
                child: Container(
                  height: 48,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: canBuy
                        ? const Color(0xFF10B981).withOpacity(0.18)
                        : AppColors.glassFill,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                        color: canBuy
                            ? const Color(0xFF34D399).withOpacity(0.5)
                            : AppColors.glassBorder),
                  ),
                  child: const Icon(Icons.bolt_rounded,
                      color: Color(0xFF34D399), size: 24),
                ),
              ),
            ],
          ),
        ),
    );

  ShopifyVariant? _resolve(ShopifyProductFull data) {
    if (data.variants.isEmpty) return null;
    if (data.options.isEmpty) return data.variants.first;
    ShopifyVariant? fallback;
    for (final v in data.variants) {
      final exact =
          v.selectedOptions.every((so) => selected[so.name] == so.value);
      final all = v.selectedOptions.every(
          (so) => selected[so.name] == null || selected[so.name] == so.value);
      if (exact) return v;
      if (all && fallback == null) fallback = v;
    }
    return fallback;
  }

  Widget _pill(IconData icon, String label, Color bg, Color fg) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 13, color: fg),
            const SizedBox(width: 5),
            Text(label,
                style: TextStyle(
                    color: fg, fontSize: 11, fontWeight: FontWeight.w800)),
          ],
        ),
      );

  Widget _trust(IconData icon, String label) => Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        decoration: BoxDecoration(
          color: AppColors.glassFill,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: Column(
          children: [
            Icon(icon, size: 18, color: const Color(0xFF10B981)),
            const SizedBox(height: 4),
            Text(label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    color: AppColors.textMuted, fontSize: 9.5, height: 1.2)),
          ],
        ),
      );

  Widget _qtyBtn(String sym, VoidCallback onTap) => GestureDetector(
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
          child: Text(sym,
              style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 17,
                  fontWeight: FontWeight.w900)),
        ),
      );
}
