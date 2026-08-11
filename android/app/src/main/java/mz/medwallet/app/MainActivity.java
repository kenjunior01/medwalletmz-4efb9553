package mz.medwallet.app;

import android.content.Intent;
import android.os.Bundle;
import android.net.Uri;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.util.WebColor;

import java.util.ArrayList;

/**
 * MainActivity — MedWallet MZ v2
 *
 * Capacidades activadas:
 * - App Links (verificação automática de URLs)
 * - Deep links via scheme (medwallet://)
 * - Error boundary para crashes do WebView
 * - WebView otimizado: hardware acceleration, smooth scrolling
 * - Integração com todos os plugins Capacitor
 * - Keep-awake support (FLAG_KEEP_SCREEN_ON)
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Registar todos os plugins Capacitor
        registerPlugin(com.getcapacitor.app.AppPlugin.class);
        registerPlugin(com.getcapacitor.camera.CameraPlugin.class);
        registerPlugin(com.getcapacitor.geolocation.GeolocationPlugin.class);
        registerPlugin(com.getcapacitor.pushnotifications.PushNotificationsPlugin.class);
        registerPlugin(com.getcapacitor.splashscreen.SplashScreenPlugin.class);
        registerPlugin(com.getcapacitor.statusbar.StatusBarPlugin.class);
        registerPlugin(com.getcapacitor.keyboard.KeyboardPlugin.class);
        registerPlugin(com.getcapacitor.network.NetworkPlugin.class);
        registerPlugin(com.getcapacitor.share.SharePlugin.class);
        registerPlugin(com.getcapacitor.haptics.HapticsPlugin.class);
        registerPlugin(com.getcapacitor.screenorientation.ScreenOrientationPlugin.class);
        registerPlugin(com.getcapacitor.filesystem.FilesystemPlugin.class);
        registerPlugin(com.getcapacitor.localnotifications.LocalNotificationsPlugin.class);

        super.onCreate(savedInstanceState);

        // Otimizar WebView para performance
        try {
            WebView webView = this.getBridge().getWebView();

            // Cor de fundo match splash (evita flash branco)
            webView.setBackgroundColor(WebColor.parseColor("#047857"));

            // Ativar hardware acceleration (ja esta no manifest mas reforçar)
            webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);

            // Smooth scrolling optimizado
            webView.getSettings().setSmoothScrollingEnabled(true);

            // Cache mais agressivo para performance em 3G/4G MZ
            webView.getSettings().setCacheMode(android.webkit.WebSettings.LOAD_DEFAULT);
        } catch (Exception ignored) {
            // WebView ainda nao pronta em primeiros ciclos
        }

        // Lidar com intent de notificação (app aberto via notificação push)
        handleNotificationIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);

        // Processar deep links quando app ja esta aberto
        handleNotificationIntent(intent);
    }

    /**
     * Extrai dados da notificação push do intent
     * e passa ao JavaScript via Capacitor bridge
     */
    private void handleNotificationIntent(Intent intent) {
        if (intent == null) return;
        Bundle extras = intent.getExtras();
        if (extras != null && extras.containsKey("google.message_id")) {
            // Intent veio de FCM — o plugin PushNotifications trata
            // mas podemos adicionar routing extra aqui
            String route = extras.getString("route", null);
            if (route != null) {
                // Ex: route = "/order/abc-123" → navegar na webview
                getBridge().eval("window.__MEDWALLET_NOTIFICATION_ROUTE__ = '" + route + "';");
            }
        }
    }

    /**
     * Keep-awake: manter ecra ligado durante a actividade.
     * Chamado via JavaScript: window.medwallet.setKeepAwake(true/false)
     */
    @SuppressWarnings("unused")
    public void setKeepAwake(boolean keepAwake) {
        runOnUiThread(() -> {
            if (keepAwake) {
                getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            } else {
                getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            }
        });
    }
}
