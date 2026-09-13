import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'shopify_config.dart';

/// Erro amigável da Storefront API (mensagens em português).
class ShopifyException implements Exception {
  ShopifyException(this.message, [this.code = 'shopify_error']);

  final String message;
  final String code;

  @override
  String toString() => message;
}

/// Cliente GraphQL mínimo para a Shopify Storefront API.
abstract final class ShopifyClient {
  static const _timeout = Duration(seconds: 15);

  /// Executa uma query GraphQL e devolve o `data` cru.
  static Future<Map<String, dynamic>> post(
    String query, [
    Map<String, dynamic>? variables,
  ]) async {
    final cfg = ShopifyConfig.active;
    if (cfg == null) {
      throw ShopifyException(
        'Loja Shopify não ligada. Configura o domínio e o token na Gestão da Loja.',
        'not_configured',
      );
    }
    final uri = Uri.parse(
      'https://${cfg.domain}/api/${ShopifyConfig.apiVersion}/graphql.json',
    );

    final body = jsonEncode({'query': query, 'variables': variables ?? <String, dynamic>{}});
    late http.Response res;
    try {
      res = await http
          .post(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Storefront-Access-Token': cfg.token,
            },
            body: body,
          )
          .timeout(_timeout);
    } on TimeoutException {
      throw ShopifyException(
        'A ligação à loja expirou. Verifica a internet e tenta novamente.',
        'timeout',
      );
    } catch (_) {
      throw ShopifyException(
        'Não foi possível ligar à loja Shopify. Verifica o domínio e a internet.',
        'network',
      );
    }

    if (res.statusCode == 401 || res.statusCode == 403) {
      throw ShopifyException(
        'Token da Storefront API inválido ou sem permissões. Gera um novo no Shopify Admin → Develop apps.',
        'unauthorized',
      );
    }
    if (res.statusCode == 404) {
      throw ShopifyException(
        'Domínio "${cfg.domain}" não responde. Verifica o endereço da loja.',
        'not_found',
      );
    }
    if (res.statusCode != 200) {
      throw ShopifyException(
        'A Shopify respondeu com erro ${res.statusCode}. Tenta novamente em instantes.',
        'http_${res.statusCode}',
      );
    }

    Map<String, dynamic> json;
    try {
      json = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    } catch (_) {
      throw ShopifyException('Resposta inválida da loja Shopify.', 'parse');
    }

    final errors = json['errors'];
    if (errors is List && errors.isNotEmpty) {
      final first = errors.first;
      final msg = first is Map ? (first['message']?.toString() ?? '') : '';
      if (RegExp(r'throttl|limit', caseSensitive: false).hasMatch(msg)) {
        throw ShopifyException(
          'A loja atingiu o limite de pedidos da Shopify. Aguarda alguns segundos.',
          'throttled',
        );
      }
      throw ShopifyException(msg.isEmpty ? 'Erro da loja Shopify.' : msg, 'graphql');
    }

    final data = json['data'];
    if (data is! Map<String, dynamic>) {
      throw ShopifyException('Resposta vazia da loja Shopify.', 'empty');
    }
    return data;
  }
}
