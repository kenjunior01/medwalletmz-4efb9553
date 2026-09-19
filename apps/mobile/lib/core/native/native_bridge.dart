import 'package:flutter/services.dart';

/// ── Ponte nativa Android (F32) ───────────────────────────────────────
///
/// Canal único `mz.medwallet/native` com a MainActivity:
///
///   • App Shortcuts (long-press no ícone) → rotas GoRouter
///     (`/scan-qr`, `/meds`, `/sos`, `/meddy`).
///   • Widget "Próxima Toma" → re-render nativo quando o plano muda.
///
/// Tudo é falha-silenciosa: em iOS/desktop ou sem a ponte, a app
/// funciona exactamente igual (try/catch em toda a superfície).
class NativeBridge {
  NativeBridge._();

  static const MethodChannel _channel = MethodChannel('mz.medwallet/native');

  /// Liga os handlers. Chamar UMA vez no arranque (main.dart).
  ///
  /// [onRoute] recebe a rota de um shortcut: cold start (pull) ou
  /// warm start (push nativo `openRoute`).
  static void init(void Function(String route) onRoute) {
    _channel.setMethodCallHandler((call) async {
      if (call.method == 'openRoute' && call.arguments is String) {
        final route = call.arguments as String;
        if (route.isNotEmpty) onRoute(route);
      }
      return null;
    });
    // Cold start: pergunta ao nativo se um shortcut lançou a app.
    _channel
        .invokeMethod<String>('consumePendingRoute')
        .then((route) {
          if (route != null && route.isNotEmpty) onRoute(route);
        })
        .catchError((_) => null);
  }

  /// Actualiza o widget "Próxima Toma" com o estado do plano.
  ///
  /// [title] nome + dose (ex.: "Paracetamol · 500mg"),
  /// [subtitle] ex.: "Próxima toma · 20:00".
  static Future<void> updateNextDoseWidget({
    required bool hasDose,
    String? title,
    String? subtitle,
  }) async {
    try {
      await _channel.invokeMethod<void>('refreshNextDoseWidget', {
        'hasDose': hasDose,
        'title': title ?? '',
        'subtitle': subtitle ?? '',
      });
    } on MissingPluginException {
      // Sem ponte nativa (iOS/desktop/tests) — ignorar.
    } catch (_) {
      // Canal fechado durante shutdown — ignorar.
    }
  }
}
