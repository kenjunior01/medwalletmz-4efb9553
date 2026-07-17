import type { CapacitorConfig } from '@capacitor/cli';

// =============================================================================
// CONFIGURAÇÃO CAPACITOR — MedWallet
// =============================================================================
// Estratégia HYBRID:
//   - Em produção (Android/iOS): a app carrega a versão WEB da plataforma
//     (https://medwalletmz.online), mantendo-se sempre sincronizada.
//   - Em desenvolvimento: usa os assets locais (dist/) para testar mudanças
//     antes de fazer deploy.
//
// Vantagens desta abordagem:
//   1. Single source of truth: qualquer deploy na web reflecte-se na app
//   2. Não precisa de fazer rebuild do APK para cada mudança
//   3. Funciona offline com service worker (PWA) cached no webview
//   4. Atualizações instantâneas (sem passar pela revisão da Play Store)
//
// Quando fazer rebuild do APK:
//   - Mudar permissões Android (AndroidManifest.xml)
//   - Mudar ícone da app
//   - Mudar appId (NUNCA depois de publicado)
//   - Mudar versão (versionCode/versionName) para Play Store
// =============================================================================

const isDev = process.env.NODE_ENV === 'development';
const WEB_URL = 'https://medwalletmz.online';

const config: CapacitorConfig = {
  appId: 'mz.medwallet.app',
  appName: 'MedWallet',
  webDir: 'dist',

  // Em produção: carrega a versão web (sempre sincronizada)
  // Em desenvolvimento: usa assets locais
  ...(isDev ? {} : {
    server: {
      androidScheme: 'https',
      url: WEB_URL,
      cleartext: false,
    },
  }),

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#047857",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#ffffff",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#047857',
      overlaysWebView: false,
    },
    // Push notifications via Firebase Cloud Messaging
    // Necessita google-services.json em android/app/
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
