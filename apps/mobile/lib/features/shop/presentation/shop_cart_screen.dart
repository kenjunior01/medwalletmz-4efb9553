import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../data/shopify_models.dart';
import 'shop_controller.dart';

/// Carrinho da Loja Global — linhas, quantidades, subtotal e
/// checkout alojado da Shopify (pagamento/envio EUA-Canadá).
class ShopCartScreen extends ConsumerStatefulWidget {
  const ShopCartScreen({super.key});

  @override
  ConsumerState<ShopCartScreen> createState() => _ShopCartScreenState();
}

class _ShopCartScreenState extends ConsumerState<ShopCartScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(shopCartProvider).refresh();
    });
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
          child: Column(
            children: [
              // Top bar
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 20, 6),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => context.pop(),
                      icon:        Icon(Icons.arrow_back_rounded,
                          color: AppColors.textSecondary),
                    ),
                    const Spacer(),
                           Icon(Icons.shopping_cart_rounded,
                        size: 18, color: AppColors.textSecondary),
                    const SizedBox(width: 7),
                    Text(
                      cart.count > 0 ? 'Carrinho (${cart.count})' : 'Carrinho',
                      style:        TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(width: 28),
                  ],
                ),
              ),

              Expanded(
                child: cart.loading ? const _Loading() : _body(cart),
              ),
            ],
          ),
        ),
        ),
      ),
    );
  }

  Widget _body(ShopCartController cart) {
    if (cart.lines.isEmpty) return const _Empty();
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 6, 20, 0),
      children: [
        for (final line in cart.lines) _Line(line: line),
        if (cart.error != null)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Text(
              cart.error!,
              textAlign: TextAlign.center,
              style:        TextStyle(color: AppColors.danger, fontSize: 12),
            ),
          ),
        _Summary(cart: cart),
        const SizedBox(height: 18),
        _TrustRow(),
        const SizedBox(height: 110),
      ],
    );
  }
}

class _Loading extends StatelessWidget {
  const _Loading();

  @override
  Widget build(BuildContext context) {
    return        Center(
      child: SizedBox(
        width: 34,
        height: 34,
        child: CircularProgressIndicator(strokeWidth: 2.6, color: AppColors.accent),
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
                   Icon(Icons.shopping_cart_outlined,
                size: 58, color: AppColors.textMuted),
            const SizedBox(height: 16),
                   Text('O teu carrinho está vazio',
                style: TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w800,
                    fontSize: 15.5)),
            const SizedBox(height: 8),
                   Text(
              'Explora a Loja Global e encontra produtos\ncom envio para os EUA e Canadá.',
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: AppColors.textMuted, fontSize: 12.5, height: 1.5),
            ),
            const SizedBox(height: 24),
            GestureDetector(
              onTap: () => context.push('/shop'),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 26, vertical: 13),
                decoration: BoxDecoration(
                  gradient:        LinearGradient(
                      colors: AppColors.buttonGradient),
                  borderRadius: BorderRadius.circular(15),
                ),
                child: const Text('Explorar produtos',
                    style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 14)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Line extends ConsumerWidget {
   const _Line({required this.line});

  final ShopifyCartLine line;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final controller = ref.read(shopCartProvider);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Imagem
          GestureDetector(
            onTap: () => context.push('/shop-product/${line.productHandle}'),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: SizedBox(
                width: 72,
                height: 72,
                child: line.imageUrl != null
                    ? Image.network(
                        line.imageUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _imgFallback(),
                      )
                    : _imgFallback(),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        line.productTitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style:        TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w700,
                            fontSize: 13.5,
                            height: 1.25),
                      ),
                    ),
                    GestureDetector(
                      onTap: () => controller.remove(line.id),
                      child:        Padding(
                        padding: EdgeInsets.all(4),
                        child: Icon(Icons.delete_outline_rounded,
                            size: 19, color: AppColors.textMuted),
                      ),
                    ),
                  ],
                ),
                if (line.variantTitle != 'Default Title' &&
                    line.variantTitle.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(line.variantTitle,
                        style:        TextStyle(
                            color: AppColors.textMuted, fontSize: 11)),
                  ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    // Stepper
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.glassFill,
                        borderRadius: BorderRadius.circular(11),
                        border: Border.all(color: AppColors.glassBorder),
                      ),
                      child: Row(
                        children: [
                          _stepBtn('−', () => controller.updateQty(line.id, line.quantity - 1)),
                          Text('${line.quantity}',
                              style:        TextStyle(
                                  color: AppColors.textPrimary,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 13)),
                          _stepBtn('+', () => controller.updateQty(line.id, line.quantity + 1)),
                        ],
                      ),
                    ),
                    const Spacer(),
                    Text(
                      line.linePrice.formatted(),
                      style:        TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w900,
                          fontSize: 13.5),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _imgFallback() => Container(
        color: AppColors.bgHigh,
        child:        Icon(Icons.inventory_2_rounded,
            color: AppColors.textMuted, size: 26),
      );

  Widget _stepBtn(String sym, VoidCallback onTap) => GestureDetector(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
          child: Text(sym,
              style:        TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 15,
                  fontWeight: FontWeight.w900)),
        ),
      );
}

class _Summary extends ConsumerWidget {
   const _Summary({required this.cart});

  final ShopCartController cart;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = cart.cart;
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.glassBorder),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
                     Text('Subtotal',
                  style: TextStyle(
                      color: AppColors.textSecondary, fontSize: 13)),
              Text(c?.subtotal?.formatted() ?? '—',
                  style:        TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w800,
                      fontSize: 13.5)),
            ],
          ),
          const SizedBox(height: 4),
                 Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Envio e impostos',
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
              Text('no próximo passo',
                  style: TextStyle(color: AppColors.textMuted, fontSize: 11.5)),
            ],
          ),
                 Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Divider(
                color: AppColors.glassBorder, height: 1, thickness: 1),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // F33 — "Total" era enganador: é o subtotal (envio/impostos
              // ficam para o checkout, como a linha acima já avisa).
              // Tokens dinâmicos: sem const (AppColors é getter).
              Text('Subtotal',
                  style: TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w800,
                      fontSize: 14.5)),
              Text(c?.subtotal?.formatted() ?? '—',
                  style:        TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w900,
                      fontSize: 17)),
            ],
          ),
          const SizedBox(height: 16),
          GestureDetector(
            onTap: cart.busy
                ? null
                : () async {
                    final ok = await cart.openCheckout();
                    if (!ok && context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          behavior: SnackBarBehavior.floating,
                          content: const Text(
                              'Não foi possível abrir o checkout. Tenta novamente.'),
                        ),
                      );
                    }
                  },
            child: Container(
              height: 52,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                gradient:
                           LinearGradient(colors: AppColors.successGradient),
                borderRadius: BorderRadius.circular(16),
              ),
              child: cart.busy
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                          strokeWidth: 2.4, color: Colors.white))
                  : const Text('Finalizar compra segura',
                      style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 14.5)),
            ),
          ),
          const SizedBox(height: 10),
                 Text(
            'Serás redireccionado para o checkout alojado da Shopify — '
            'cartão, Apple Pay, Google Pay e PayPal.',
            textAlign: TextAlign.center,
            style:
                TextStyle(color: AppColors.textMuted, fontSize: 10.5, height: 1.45),
          ),
        ],
      ),
    );
  }
}

class _TrustRow extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    Widget item(IconData i, String label) => Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
            decoration: BoxDecoration(
              color: AppColors.glassFill,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.glassBorder),
            ),
            child: Column(
              children: [
                Icon(i, size: 18, color: const Color(0xFF10B981)),
                const SizedBox(height: 5),
                Text(label,
                    textAlign: TextAlign.center,
                    style:        TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 9.5,
                        height: 1.2)),
              ],
            ),
          ),
        );
    return Row(
      children: [
        item(Icons.verified_user_rounded, 'Pagamento protegido PCI-DSS'),
        const SizedBox(width: 8),
        item(Icons.local_shipping_rounded, 'Rastreio enviado por e-mail'),
      ],
    );
  }
}
