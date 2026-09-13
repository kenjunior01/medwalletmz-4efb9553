import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Configuração da Loja Global (Shopify Storefront API).
///
/// A Shopify é o gerenciador principal da loja — produtos, stock, preços,
/// encomendas, pagamentos e envios EUA/Canadá vivem lá. A app é a montra:
/// consome a Storefront API (GraphQL) e entrega o checkout à Shopify.
///
/// Prioridade de configuração:
///   1. --dart-define=SHOPIFY_DOMAIN=… SHOPIFY_TOKEN=…   (produção)
///   2. Override guardado no dispositivo (ecrã /shop-config)
abstract final class ShopifyConfig {
  static const _envDomain = String.fromEnvironment('SHOPIFY_DOMAIN');
  static const _envToken = String.fromEnvironment('SHOPIFY_TOKEN');

  /// Versão da Storefront API (pode ser sobreposta via dart-define).
  static const _envApiVersion = String.fromEnvironment('SHOPIFY_API_VERSION');

  /// Cache do override local carregado do SharedPreferences.
  static String? _localDomain;
  static String? _localToken;
  static bool _loaded = false;

  static Future<void> load() async {
    if (_loaded) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      _localDomain = prefs.getString('shopify.domain');
      _localToken = prefs.getString('shopify.token');
    } catch (_) {
      // Storage indisponível — segue só com env.
    }
    _loaded = true;
  }

  /// Normaliza "https://Loja.myshopify.com/admin" → "loja.myshopify.com".
  static String sanitizeDomain(String raw) {
    var d = raw.trim().toLowerCase();
    if (d.startsWith('https://')) d = d.substring(8);
    if (d.startsWith('http://')) d = d.substring(7);
    final slash = d.indexOf('/');
    if (slash > 0) d = d.substring(0, slash);
    return d;
  }

  static bool get hasEnvConfig =>
      _envDomain.isNotEmpty && _envToken.length >= 20;

  static bool get hasLocalConfig =>
      (_localDomain ?? '').isNotEmpty && (_localToken ?? '').length >= 20;

  /// Config efectiva (env > local). null se não configurada.
  static ({String domain, String token, bool fromEnv})? get active {
    if (hasEnvConfig) return (domain: _envDomain, token: _envToken, fromEnv: true);
    if (hasLocalConfig) {
      return (
        domain: sanitizeDomain(_localDomain!),
        token: _localToken!.trim(),
        fromEnv: false,
      );
    }
    return null;
  }

  static String get apiVersion =>
      _envApiVersion.isNotEmpty ? _envApiVersion : '2025-01';

  /// Guarda o override local e activa de imediato.
  static Future<void> saveLocal(String domain, String token) async {
    final d = sanitizeDomain(domain);
    final t = token.trim();
    if (d.isEmpty || t.length < 20) {
      throw const FormatException('Domínio ou token inválido.');
    }
    _localDomain = d;
    _localToken = t;
    _loaded = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('shopify.domain', d);
      await prefs.setString('shopify.token', t);
    } catch (_) {/* sem storage — fica só em memória */}
  }

  /// Remove o override local (a env, se existir, volta a mandar).
  static Future<void> clearLocal() async {
    _localDomain = null;
    _localToken = null;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('shopify.domain');
      await prefs.remove('shopify.token');
    } catch (_) {}
  }

  /// URL do backoffice Shopify (gestão da loja — produtos/encomendas).
  static String adminUrl(String domain) {
    final sub = domain.replaceAll(RegExp(r'\.myshopify\.com$'), '');
    return 'https://admin.shopify.com/store/$sub';
  }

  @visibleForTesting
  static void resetForTests() {
    _localDomain = null;
    _localToken = null;
    _loaded = false;
  }
}
