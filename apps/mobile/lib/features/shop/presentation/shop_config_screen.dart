import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../data/shopify_client.dart';
import '../data/shopify_config.dart';
import '../data/shopify_repository.dart';
import 'shop_controller.dart';

/// Gestão da Loja Global — ligar a loja Shopify (domínio + token
/// Storefront), testar a ligação e atalhos ao backoffice onde vivem
/// produtos, encomendas e dropshipping (EUA/Canadá).
class ShopConfigScreen extends ConsumerStatefulWidget {
  const ShopConfigScreen({super.key});

  @override
  ConsumerState<ShopConfigScreen> createState() => _ShopConfigScreenState();
}

class _ShopConfigScreenState extends ConsumerState<ShopConfigScreen> {
  final _domainCtrl = TextEditingController();
  final _tokenCtrl = TextEditingController();

  bool _loading = true;
  bool _testing = false;
  String? _connectedName;
  bool _fromEnv = false;
  String? _activeDomain;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    await ShopifyConfig.load();
    final cfg = ShopifyConfig.active;
    if (!mounted) return;
    setState(() {
      _loading = false;
      _fromEnv = cfg?.fromEnv ?? false;
      _activeDomain = cfg?.domain;
      if (cfg != null && cfg.fromEnv) _connectedName = cfg.domain;
    });
  }

  Future<void> _testAndSave() async {
    FocusScope.of(context).unfocus();
    HapticFeedback.mediumImpact();
    setState(() => _testing = true);
    try {
      await ShopifyConfig.saveLocal(_domainCtrl.text, _tokenCtrl.text);
      final shop = await ShopifyRepository.fetchShopInfo();
      await ref.read(shopCartProvider).reset(); // carrinho de outra loja morre
      if (!mounted) return;
      setState(() {
        _connectedName = shop.name;
        _activeDomain = ShopifyConfig.sanitizeDomain(_domainCtrl.text);
        _fromEnv = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          backgroundColor: AppColors.card,
          content: Text('Loja ligada: ${shop.name}',
              style:        TextStyle(color: AppColors.textPrimary)),
        ),
      );
    } on FormatException {
      _showErr('Domínio ou token inválido. Verifica os valores.');
      await ShopifyConfig.clearLocal();
    } on ShopifyException catch (e) {
      _showErr(e.message);
      await ShopifyConfig.clearLocal();
    } catch (_) {
      _showErr('Falha ao ligar à loja. Tenta novamente.');
      await ShopifyConfig.clearLocal();
    } finally {
      if (mounted) setState(() => _testing = false);
    }
  }

  Future<void> _disconnect() async {
    await ShopifyConfig.clearLocal();
    await ref.read(shopCartProvider).reset();
    if (!mounted) return;
    setState(() {
      _connectedName = null;
      _activeDomain = null;
      _tokenCtrl.clear();
    });
  }

  void _showErr(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(behavior: SnackBarBehavior.floating, backgroundColor: AppColors.danger,
          content: Text(msg)),
    );
  }

  Future<void> _open(String url) async {
    final uri = Uri.parse(url);
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && mounted) _showErr('Não foi possível abrir o link.');
  }

  @override
  void dispose() {
    _domainCtrl.dispose();
    _tokenCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return        AppBackground(
        child: Scaffold(
          backgroundColor: Colors.transparent,
          body: Center(
            child: SizedBox(
                width: 30,
                height: 30,
                child: CircularProgressIndicator(
                    strokeWidth: 2.4, color: AppColors.accent)),
          ),
        ),
      );
    }

    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
            children: [
              // Top bar
              Row(
                children: [
                  IconButton(
                    onPressed: () => context.pop(),
                    icon:        Icon(Icons.arrow_back_rounded,
                        color: AppColors.textSecondary),
                  ),
                  const Spacer(),
                         Icon(Icons.settings_rounded,
                      size: 20, color: AppColors.textMuted),
                  const SizedBox(width: 22),
                ],
              ),
              const SizedBox(height: 6),

              // Título
              Row(
                children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                          colors: [Color(0xFF10B981), Color(0xFF0D9488)]),
                      borderRadius: BorderRadius.circular(17),
                    ),
                    child: const Icon(Icons.storefront_rounded,
                        color: Colors.white, size: 26),
                  ),
                  const SizedBox(width: 13),
                         Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Gestão da Loja Global',
                            style: TextStyle(
                                color: AppColors.textPrimary,
                                fontSize: 18,
                                fontWeight: FontWeight.w900)),
                        Text('Shopify Storefront API · dropshipping EUA & Canadá',
                            style: TextStyle(
                                color: AppColors.textMuted, fontSize: 11.5)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Estado actual
              _card(
                child: Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: _connectedName != null
                            ? const Color(0xFF10B981).withOpacity(0.16)
                            : const Color(0xFFF5A623).withOpacity(0.16),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(
                        _connectedName != null
                            ? Icons.check_rounded
                            : Icons.bolt_rounded,
                        size: 22,
                        color: _connectedName != null
                            ? const Color(0xFF34D399)
                            : const Color(0xFFF5A623),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _connectedName ?? 'Nenhuma loja ligada',
                            style:        TextStyle(
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w800,
                                fontSize: 13.5),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _connectedName == null
                                ? 'Liga a tua loja Shopify para activar a montra.'
                                : _fromEnv
                                    ? 'Configurada via build (produção)'
                                    : 'Configurada neste dispositivo',
                            style:        TextStyle(
                                color: AppColors.textMuted, fontSize: 11.5),
                          ),
                        ],
                      ),
                    ),
                    if (_connectedName != null && !_fromEnv)
                      GestureDetector(
                        onTap: _disconnect,
                        child:        Padding(
                          padding: EdgeInsets.all(6),
                          child: Icon(Icons.link_off_rounded,
                              size: 20, color: AppColors.danger),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Formulário
              _card(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                           Text('Ligar loja Shopify',
                        style: TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w800,
                            fontSize: 14)),
                    const SizedBox(height: 4),
                           Text(
                      'Precisas de uma app personalizada com a Storefront API '
                      'activada. O token é público (apenas leitura de '
                      'produtos e carrinhos) — seguro para o dispositivo.',
                      style: TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 11.5,
                          height: 1.45),
                    ),
                    const SizedBox(height: 14),
                    _label('Domínio da loja'),
                    _field(
                      _domainCtrl,
                      'minhaloja.myshopify.com',
                      Icons.language_rounded,
                      TextInputType.url,
                    ),
                    const SizedBox(height: 12),
                    _label('Storefront Access Token'),
                    _field(
                      _tokenCtrl,
                      'shpat_…',
                      Icons.key_rounded,
                      TextInputType.visiblePassword,
                      obscure: true,
                    ),
                    const SizedBox(height: 16),
                    GestureDetector(
                      onTap: _testing ? null : _testAndSave,
                      child: Container(
                        height: 50,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          gradient:        LinearGradient(
                              colors: AppColors.buttonGradient),
                          borderRadius: BorderRadius.circular(15),
                        ),
                        child: _testing
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2.4, color: Colors.white))
                            : const Text('Testar e guardar',
                                style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Guia
              _card(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                           Text('Como obter o token (2 min)',
                        style: TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w800,
                            fontSize: 14)),
                    const SizedBox(height: 12),
                    _step('1', 'Shopify Admin → Settings → Apps and sales channels.'),
                    _step('2', 'Develop apps → Create an app (ex: MedWallet Storefront).'),
                    _step('3', 'Configuration → Storefront API → activa os scopes de produtos e checkouts.'),
                    _step('4', 'Instala a app e copia o token da tab API credentials.'),
                    _step('5', 'Cola aqui o domínio e o token → Testar e guardar.'),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Produção
              _card(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                           Text('Configuração permanente (produção)',
                        style: TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w800,
                            fontSize: 14)),
                    const SizedBox(height: 8),
                           Text(
                      'Para a loja aparecer para todos os utilizadores sem '
                      'configuração local, compila a app com:',
                      style: TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 11.5,
                          height: 1.45),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF060F1A),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.glassBorder),
                      ),
                      child:        Text(
                        '--dart-define=SHOPIFY_DOMAIN=minhaloja.myshopify.com\n'
                        '--dart-define=SHOPIFY_TOKEN=shpat_…',
                        style: TextStyle(
                            color: AppColors.accent,
                            fontSize: 10.5,
                            fontFamily: 'monospace',
                            height: 1.6),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Dropshipping checklist
              _card(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                           Row(children: [
                      Icon(Icons.public_rounded,
                          size: 17, color: Color(0xFF10B981)),
                      SizedBox(width: 8),
                      Text('Dropshipping EUA & Canadá — checklist',
                          style: TextStyle(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w800,
                              fontSize: 14)),
                    ]),
                    const SizedBox(height: 12),
                    _check(Icons.inventory_2_rounded,
                        'Produtos e fornecedores geridos no Shopify Admin — apps de dropshipping (DSers, AutoDS, Zendrop) sincronizam e enviam automaticamente.'),
                    _check(Icons.public_rounded,
                        'Settings → Markets → activa United States e Canada; os preços aparecem em USD e CAD.'),
                    _check(Icons.credit_card_rounded,
                        'Shopify Payments + PayPal no checkout alojado — PCI-DSS nível 1, sem risco para a plataforma.'),
                    _check(Icons.local_shipping_rounded,
                        'Rastreio e e-mails de envio são automáticos pela Shopify.'),
                    const SizedBox(height: 6),
                  ],
                ),
              ),

              // Atalhos admin
              if (_activeDomain != null) ...[
                const SizedBox(height: 14),
                _linkTile('Abrir Shopify Admin',
                    Icons.admin_panel_settings_rounded,
                    () => _open(ShopifyConfig.adminUrl(_activeDomain!))),
                const SizedBox(height: 8),
                _linkTile('Gerir produtos', Icons.inventory_2_rounded,
                    () => _open('${ShopifyConfig.adminUrl(_activeDomain!)}/products')),
                const SizedBox(height: 8),
                _linkTile('Ver encomendas', Icons.receipt_long_rounded,
                    () => _open('${ShopifyConfig.adminUrl(_activeDomain!)}/orders')),
                const SizedBox(height: 8),
                _linkTile('Vendas & analytics', Icons.bar_chart_rounded,
                    () => _open('${ShopifyConfig.adminUrl(_activeDomain!)}/analytics')),
              ],

              const SizedBox(height: 18),
                     Text(
                'O token Storefront é uma chave pública: só permite ler '
                'produtos e criar carrinhos. Nunca uses aqui chaves de Admin API.',
                textAlign: TextAlign.center,
                style: TextStyle(
                    color: AppColors.textMuted, fontSize: 10.5, height: 1.5),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Widgets auxiliares ────────────────────────────────────────────────

  Widget _card({required Widget child}) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: AppColors.glassBorder),
        ),
        child: child,
      );

  Widget _label(String text) => Text(
        text.toUpperCase(),
        style:        TextStyle(
            color: AppColors.textMuted,
            fontSize: 10,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.8),
      );

  Widget _field(
    TextEditingController ctrl,
    String hint,
    IconData icon,
    TextInputType type, {
    bool obscure = false,
  }) =>
      Padding(
        padding: const EdgeInsets.only(top: 6),
        child: TextField(
          controller: ctrl,
          keyboardType: type,
          obscureText: obscure,
          autocorrect: false,
          enableSuggestions: false,
          style:        TextStyle(color: AppColors.textPrimary, fontSize: 13.5),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle:        TextStyle(color: AppColors.textMuted, fontSize: 12.5),
            prefixIcon: Icon(icon, size: 18, color: AppColors.textMuted),
            filled: true,
            fillColor: AppColors.glassFill,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
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
      );

  Widget _step(String n, String text) => Padding(
        padding: const EdgeInsets.only(bottom: 9),
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
                      fontSize: 12,
                      height: 1.45)),
            ),
          ],
        ),
      );

  Widget _check(IconData icon, String text) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 16, color: AppColors.accent),
            const SizedBox(width: 10),
            Expanded(
              child: Text(text,
                  style:        TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      height: 1.5)),
            ),
          ],
        ),
      );

  Widget _linkTile(String label, IconData icon, VoidCallback onTap) =>
      GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.glassBorder),
          ),
          child: Row(
            children: [
              Icon(icon, size: 19, color: AppColors.accent),
              const SizedBox(width: 12),
              Expanded(
                child: Text(label,
                    style:        TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.w700)),
              ),
                     Icon(Icons.open_in_new_rounded,
                  size: 16, color: AppColors.textMuted),
            ],
          ),
        ),
      );
}
