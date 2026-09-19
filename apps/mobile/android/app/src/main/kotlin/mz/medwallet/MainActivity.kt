package mz.medwallet

import android.content.Intent
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

/// MainActivity — FlutterFragmentActivity (exigido pelo local_auth).
///
/// F32 — ponte nativa única (`mz.medwallet/native`):
///
///   • App Shortcuts (long-press no ícone): o atalho lança esta
///     Activity com extra "route". Cold start → Dart faz pull com
///     `consumePendingRoute`; warm start → `onNewIntent` empurra
///     `openRoute` para o Dart (GoRouter navega).
///
///   • Widget "Próxima Toma": Dart chama `refreshNextDoseWidget`
///     sempre que o plano de medicação muda.
class MainActivity : FlutterFragmentActivity() {

    private var navChannel: MethodChannel? = null
    private var pendingRoute: String? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        // Cold start: rota do shortcut que lançou a app (ainda sem Dart).
        pendingRoute = intent?.getStringExtra(EXTRA_ROUTE) ?: pendingRoute

        navChannel = MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            CHANNEL,
        )
        navChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                // Dart pede a rota pendente (shortcut de cold start).
                "consumePendingRoute" -> {
                    result.success(pendingRoute)
                    pendingRoute = null
                }
                // Dart actualiza o widget "Próxima Toma".
                "refreshNextDoseWidget" -> {
                    try {
                        NextDoseWidgetProvider.refresh(
                            context = applicationContext,
                            hasDose = call.argument<Boolean>("hasDose") ?: false,
                            title = call.argument<String>("title"),
                            subtitle = call.argument<String>("subtitle"),
                        )
                        result.success(null)
                    } catch (_: Exception) {
                        // Widget não colocado / ambiente sem suporte —
                        // a app continua normalmente.
                        result.success(null)
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Warm start: app viva → empurra a rota directamente para o Dart.
        val route = intent.getStringExtra(EXTRA_ROUTE) ?: return
        pendingRoute = route // fallback se o Dart ainda não ouviu
        navChannel?.invokeMethod("openRoute", route)
    }

    companion object {
        const val CHANNEL = "mz.medwallet/native"
        const val EXTRA_ROUTE = "route"
    }
}
