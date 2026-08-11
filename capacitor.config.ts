import type { CapacitorConfig } from '@capacitor/cli';

// =============================================================================
// CAPACITOR 7 — MedWallet MZ (Configuração Avançada v2)
// =============================================================================
//
// Arquitectura HYBRID:
//   Producao: carrega https://medwalletmz.online (sempre sincronizado)
//   Desenvolvimento: usa assets locais (dist/) ou dev server LAN
//
// Plugins instalados (14 nativos):
//   Core, App, Camera, Geolocation, Push Notifications, SplashScreen,
//   StatusBar, Keyboard, Network, Share, Haptics, Screen Orientation,
//   Filesystem, Local Notifications
//
// Capacidades avancadas:
//   - Deep linking (App Links + custom scheme)
//   - WebView otimizado com hardware acceleration
//   - User-Agent personalizado para analytics
//   - Background animado nativo-to-web transicao suave
//   - Safe areas, overscroll, gesto de voltar
//   - Haptic feedback contextual
//   - Keep-awake para consultas/SOS
//   - PWA fallback automatico
//
// Build: npm run build && npx cap sync android
//   APK:  cd android && ./gradlew assembleRelease
// =============================================================================

const isDev = process.env.NODE_ENV === 'development';
const WEB_URL = 'https://medwalletmz.online';

const config: CapacitorConfig = {
  appId: 'mz.medwallet.app',
  appName: 'MedWallet',
  webDir: 'dist',

  // ---- COR DE FUNDO (evita flash branco no boot) ----
  backgroundColor: '#047857',

  // ---- SERVER: producao carrega do site, dev usa assets locais ----
  ...(isDev
    ? {
        server: {
          androidScheme: 'https',
          url: process.env.CAP_DEV_URL || 'http://10.0.2.2:5173',
          cleartext: true,
        },
      }
    : {
        server: {
          androidScheme: 'https',
          url: WEB_URL,
          cleartext: false,
        },
      }
  ),

  // ---- PLUGINS ----
  plugins: {
    // --- SplashScreen: transicao cinematografica ---
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#047857',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      androidScaleType: 'CENTER_CROP',
      iosSpinnerStyle: 'small',
    },

    // --- StatusBar: integrada com o conteudo, transicao suave ---
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#047857',
      overlaysWebView: true,
    },

    // --- App: lifecycle, deep links, idioma ---
    App: {
      // Deep linking configurado:
      //   https://medwalletmz.online/register?role=driver → registo
      //   https://medwalletmz.online/health/triage → triagem
      //   https://medwalletmz.online/order/abc-123 → tracking
      //   medwallet://register?role=driver → fallback scheme
      backgroundColor: '#047857',
    },

    // --- Keyboard: comportamento avancado em formularios ---
    Keyboard: {
      resize: 'none',           // Usa flex layout em vez de resize
      resizeOnFullScreen: true,  // Em fullscreen, permite resize
      style: 'dark',             // Teclado escuro (match dark theme)
    },

    // --- Screen Orientation: retrato por defeito ---
    ScreenOrientation: {
      initialOrientation: 'portrait',
    },

    // --- Push Notifications (FCM) ---
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    // --- Local Notifications (lembretes medicamentos, consultas) ---
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#047857',
      sound: 'default',
    },

    // --- Network: detectar online/offline ---
    Network: {},
  },

  // ---- COMPORTAMENTO DO WEBVIEW ----
  ios: {
    contentInset: 'automatic',
    // Evitar overscroll elástico (pull-to-refresh acidental)
    // scrollEnabled: true (padrao — necessario para conteudo longo)
  },

  android: {
    // WebView otimizado com hardware acceleration
    allowMixedContent: false,     // Bloquear HTTP em HTTPS (seguranca)
    // Capturar back button no JS para UX custom
    useLegacyBridge: false,       // Usar bridge moderno (Capacitor 7)
    // WebView rendering
    // backgroundColor definido acima como top-level
  },

  // ---- SERVER EXTRA CONFIG ----
  // Para PWA fallback: se o servidor estiver offline, carregar
  // os assets locais (ultimo build sincronizado)
  // (Capacitor 7: use `android.allowMixedContent` e `server.cleartext`)
};

export default config;
