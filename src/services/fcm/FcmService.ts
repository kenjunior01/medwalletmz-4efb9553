/**
 * FcmService — Serviço Firebase Cloud Messaging (FCM)
 *
 * Responsável pela gestão de notificações push via FCM em todas as plataformas:
 * - Nativo (Android/iOS): Usa o plugin @capacitor/push-notifications
 * - Web/PWA: Usa o Firebase Web SDK (firebase/messaging) com import dinâmico
 *
 * O Firebase é utilizado EXCLUSIVAMENTE para push notifications.
 * Toda a restante infraestrutura (auth, bd, etc.) usa Supabase.
 *
 * Uso:
 *   import { fcmService } from '@/services/fcm/FcmService';
 *   await fcmService.init(userId);
 */

import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

import { logger } from '@/lib/logger';
// @capacitor/push-notifications loaded dynamically to avoid pulling it into the web bundle
let PushNotifications: any = null;
let pushNotificationTypes: any = null;
async function loadPushNotifications() {
  if (!PushNotifications) {
    try {
      const mod = await import('@capacitor/push-notifications');
      PushNotifications = mod.PushNotifications;
      pushNotificationTypes = mod;
    } catch {
      logger.info('[FcmService] @capacitor/push-notifications not available (web)');
    }
  }
  return PushNotifications;
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Plataforma de registo do dispositivo */
export type DevicePlatform = 'web' | 'android' | 'ios';

/** Payload de uma notificação FCM recebida */
export interface FcmMessage {
  /** Título da notificação */
  title?: string;
  /** Corpo da notificação */
  body?: string;
  /** Dados personalizados enviados pelo servidor */
  data?: Record<string, any>;
  /** Identificador único da notificação */
  messageId?: string;
}

/** Callback para mensagens FCM recebidas */
export type FcmMessageCallback = (message: FcmMessage) => void;

/** Estado do serviço FCM */
export interface FcmServiceState {
  /** Se o serviço já foi inicializado */
  initialized: boolean;
  /** Se a permissão de notificação foi concedida */
  permissionGranted: boolean;
  /** Token FCM actual (null se ainda não obtido) */
  currentToken: string | null;
  /** Plataforma detectada */
  platform: DevicePlatform;
}

/** Configuração do Firebase App (preencher com valores reais) */
export interface FirebaseAppConfig {
  apiKey: string;
   authDomain: string;
   projectId: string;
   storageBucket: string;
   messagingSenderId: string;
   appId: string;
   vapidKey?: string;
}

// ---------------------------------------------------------------------------
// Detecção de plataforma
// ---------------------------------------------------------------------------

/**
 * Determina a plataforma actual do dispositivo.
 * Usa Capacitor.isNativePlatform() para distinguir nativo de web.
 */
function detectPlatform(): DevicePlatform {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
  }
  return 'web';
}

// ---------------------------------------------------------------------------
// Tipos internos para Firebase SDK (carregado dinamicamente)
// ---------------------------------------------------------------------------

/** Abstracção do módulo firebase/messaging para evitar dependência estática */
interface FirebaseMessagingModule {
  getMessaging: (app?: any) => any;
  getToken: (messaging: any, options?: { vapidKey?: string }) => Promise<string>;
  onMessage: (messaging: any, callback: (payload: any) => void) => () => void;
  deleteToken: (messaging: any) => Promise<boolean>;
}

/** Abstracção do módulo firebase/app */
interface FirebaseAppModule {
  initializeApp: (config: any) => any;
}

// ---------------------------------------------------------------------------
// Configuração Firebase (placeholder)
// ---------------------------------------------------------------------------

/**
 * Configuração do Firebase App.
 * Substituir pelos valores reais do projecto Firebase Console.
 * O VAPID key é necessário para Web Push.
 */
const FIREBASE_CONFIG: FirebaseAppConfig = {
  apiKey: import.meta.env.VITE_FCM_API_KEY || '',
  authDomain: import.meta.env.VITE_FCM_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FCM_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FCM_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FCM_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FCM_APP_ID || '',
  vapidKey: import.meta.env.VITE_FCM_VAPID_KEY || '',
};

// ---------------------------------------------------------------------------
// FcmService (Singleton)
// ---------------------------------------------------------------------------

class FcmService {
  private static instance: FcmService;

  /** Se o serviço já foi inicializado */
  private initialized = false;

  /** Token FCM actual */
  private currentToken: string | null = null;

  /** Plataforma detectada */
  private platform: DevicePlatform;

  /** Se a permissão foi concedida */
  private permissionGranted = false;

  /** Instância do Firebase Messaging (web apenas, carregada dinamicamente) */
  private firebaseMessaging: any = null;

  /** Instância do Firebase App (web apenas) */
  private firebaseApp: any = null;

  /** Subscritores de mensagens FCM */
  private messageListeners: FcmMessageCallback[] = [];

  /** Handlers de listeners do Capacitor (para cleanup) */
  private capacitorListeners: Array<() => void> = [];

  /** Unsubscribe function do Firebase onMessage (web) */
  private firebaseUnsubscribe: (() => void) | null = null;

  /** Utilizador actual (para refresh de token) */
  private currentUserId: string | null = null;

  private constructor() {
    this.platform = detectPlatform();
  }

  // -----------------------------------------------------------------------
  // Singleton
  // -----------------------------------------------------------------------

  /**
   * Retorna a instância única do FcmService.
   * Implementação padrão Singleton.
   */
  static getInstance(): FcmService {
    if (!FcmService.instance) {
      FcmService.instance = new FcmService();
    }
    return FcmService.instance;
  }

  // -----------------------------------------------------------------------
  // Estado público
  // -----------------------------------------------------------------------

  /**
   * Retorna o estado actual do serviço FCM.
   * Útil para debugging e para a hook useFcm.
   */
  getState(): FcmServiceState {
    return {
      initialized: this.initialized,
      permissionGranted: this.permissionGranted,
      currentToken: this.currentToken,
      platform: this.platform,
    };
  }

  // -----------------------------------------------------------------------
  // init — Inicialização completa
  // -----------------------------------------------------------------------

  /**
   * Inicializa o serviço FCM. Chamado uma vez após autenticação.
   *
   * Fluxo:
   * 1. Solicita permissão de notificação ao utilizador
   * 2. Obtém o token FCM (nativo ou web)
   * 3. Guarda o token na tabela `user_devices` do Supabase
   * 4. Regista listeners para mensagens recebidas
   *
   * @param userId - ID do utilizador autenticado no Supabase
   */
  async init(userId: string): Promise<void> {
    if (this.initialized && this.currentUserId === userId) {
      // Já inicializado para o mesmo utilizador — apenas re-registar listeners
      return;
    }

    this.currentUserId = userId;
    this.platform = detectPlatform();

    // Retry up to 2 times with exponential backoff
    const MAX_RETRIES = 2;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (this.platform === 'web') {
          await this.initWeb();
        } else {
          await this.initNative();
        }
        this.initialized = true;
        return; // Success — exit retry loop
      } catch (err) {
        logger.warn(`[FcmService] Init attempt ${attempt + 1} failed:`, { error: err });
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // getToken — Obter token FCM
  // -----------------------------------------------------------------------

  /**
   * Obtém o token de registo FCM.
   *
   * - Nativo: Usa o plugin @capacitor/push-notifications (PushNotifications.register())
   * - Web/PWA: Usa o Firebase Web SDK (getToken) ou Web Push API como fallback
   *
   * @returns Token FCM ou null se não foi possível obter
   */
  async getToken(): Promise<string | null> {
    // Retornar token em cache se ainda é válido
    if (this.currentToken) {
      return this.currentToken;
    }

    if (this.platform === 'web') {
      return this.getWebToken();
    } else {
      return this.getNativeToken();
    }
  }

  // -----------------------------------------------------------------------
  // saveTokenToSupabase — Persistir token no Supabase
  // -----------------------------------------------------------------------

  /**
   * Guarda (upsert) o token FCM na tabela `user_devices` do Supabase.
   *
   * Campos da tabela:
   * - user_id: UUID do utilizador
   * - platform: 'web' | 'android' | 'ios'
   * - fcm_token: Token de registo FCM
   * - updated_at: Timestamp da última actualização
   *
   * O upsert usa o par (user_id, platform) como chave de conflito.
   *
   * @param token - Token FCM a guardar
   * @param userId - ID do utilizador no Supabase
   */
  async saveTokenToSupabase(token: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_devices')
        .upsert(
          {
            user_id: userId,
            platform: this.platform,
            fcm_token: token,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,platform' }
        );

      if (error) {
        logger.warn('[FcmService] Erro ao guardar token no Supabase:', error.message);
      } else {
        this.currentToken = token;
      }
    } catch (err) {
      logger.warn('[FcmService] Excepção ao guardar token no Supabase:', { error: err });
    }
  }

  // -----------------------------------------------------------------------
  // onMessage — Escutar mensagens FCM
  // -----------------------------------------------------------------------

  /**
   * Regista um callback para receber mensagens FCM recebidas.
   *
   * - Nativo: Usa listeners do @capacitor/push-notifications
   *   (pushNotificationReceived para foreground)
   * - Web: Usa onMessage do Firebase Messaging SDK
   *
   * @param callback - Função chamada quando uma mensagem é recebida
   * @returns Função para remover o listener (cleanup)
   */
  onMessage(callback: FcmMessageCallback): () => void {
    this.messageListeners.push(callback);

    // Retornar função de unsubscribe
    return () => {
      this.messageListeners = this.messageListeners.filter(cb => cb !== callback);
    };
  }

  // -----------------------------------------------------------------------
  // destroy — Limpeza de recursos
  // -----------------------------------------------------------------------

  /**
   * Remove todos os listeners e limpa recursos.
   * Chamado ao fazer logout ou ao desmontar a aplicação.
   */
  destroy(): void {
    // Remover listeners do Capacitor
    for (const unsubscribe of this.capacitorListeners) {
      try {
        unsubscribe();
      } catch {
        // Ignorar erros durante cleanup
      }
    }
    this.capacitorListeners = [];

    // Remover listener do Firebase onMessage
    if (this.firebaseUnsubscribe) {
      try {
        this.firebaseUnsubscribe();
      } catch {
        // Ignorar erros durante cleanup
      }
      this.firebaseUnsubscribe = null;
    }

    // Limpar estado
    this.messageListeners = [];
    this.currentToken = null;
    this.firebaseMessaging = null;
    this.firebaseApp = null;
    this.initialized = false;
    this.permissionGranted = false;
    this.currentUserId = null;

    logger.info('[FcmService] Serviço destruído e recursos limpos.');
  }

  // =======================================================================
  // Métodos privados — Inicialização Web
  // =======================================================================

  /**
   * Inicializa o FCM para Web/PWA.
   * Carrega o Firebase SDK dinamicamente (pode não estar instalado).
   */
  private async initWeb(): Promise<void> {
    // Tentar carregar Firebase SDK dinamicamente
    let firebaseAppMod: FirebaseAppModule;
    let firebaseMessagingMod: FirebaseMessagingModule;

    try {
      firebaseAppMod = await import(/* @vite-ignore */ 'firebase/app');
      firebaseMessagingMod = await import(/* @vite-ignore */ 'firebase/messaging');
    } catch {
      logger.info('[FcmService] Firebase SDK não disponível no web. ' +
        'O caminho web/PWA de FCM está desactivado. ' +
        'Instale firebase para activar: npm install firebase');
      return;
    }

    // Verificar se a configuração está preenchida
    if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId) {
      logger.info('[FcmService] Configuração Firebase incompleta. ' +
        'Defina VITE_FCM_API_KEY, VITE_FCM_PROJECT_ID e outras variáveis no .env');
      return;
    }

    try {
      // Inicializar Firebase App
      this.firebaseApp = firebaseAppMod.initializeApp(FIREBASE_CONFIG);
      this.firebaseMessaging = firebaseMessagingMod.getMessaging(this.firebaseApp);

      // Solicitar permissão Web Push
      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';

      if (!this.permissionGranted) {
        logger.info('[FcmService] Permissão de notificação negada pelo utilizador (web).');
        return;
      }

      // Obter token FCM para web
      const token = await this.getWebToken();
      if (token && this.currentUserId) {
        await this.saveTokenToSupabase(token, this.currentUserId);
      }

      // Registar listener para mensagens em foreground
      this.firebaseUnsubscribe = firebaseMessagingMod.onMessage(
        this.firebaseMessaging,
        (payload: any) => {
          const message = this.parseFirebasePayload(payload);
          this.emitMessage(message);
        }
      );
    } catch (err) {
      logger.warn('[FcmService] Erro na inicialização web do Firebase:', { error: err });
    }
  }

  /**
   * Obtém o token FCM para Web/PWA.
   * Tenta Firebase SDK primeiro, depois Web Push API como fallback.
   */
  private async getWebToken(): Promise<string | null> {
    // Se já temos instância do Firebase Messaging, usar getToken
    if (this.firebaseMessaging) {
      try {
        const { getToken } = await import(/* @vite-ignore */ 'firebase/messaging');
        const options: { vapidKey?: string } = {};
        if (FIREBASE_CONFIG.vapidKey) {
          options.vapidKey = FIREBASE_CONFIG.vapidKey;
        }
        const token = await getToken(this.firebaseMessaging, options);
        if (token) {
          this.currentToken = token;
          return token;
        }
      } catch (err) {
        logger.warn('[FcmService] Erro ao obter token via Firebase SDK:', { error: err });
      }
    }

    // Fallback: Web Push API directa (sem Firebase)
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.getRegistration('/');
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            // Converter subscription para string — não é um token FCM verdadeiro
            // mas pode ser usado como identificador único do dispositivo
            const key = await subscription.getKey('p256dh');
            if (key) {
              const token = btoa(Array.from(new Uint8Array(key), b => String.fromCharCode(b)).join(''));
              this.currentToken = token;
              return token;
            }
          }
        }
      } catch {
        // Web Push não disponível — não é erro crítico
      }
    }

    return null;
  }

  // =======================================================================
  // Métodos privados — Inicialização Nativa (Capacitor)
  // =======================================================================

  /**
   * Inicializa o FCM para plataformas nativas (Android/iOS).
   * Usa o plugin @capacitor/push-notifications que é configurado
   * com o google-services.json (Android) ou GoogleService-Info.plist (iOS).
   */
  private async initNative(): Promise<void> {
    try {
      const PN = await loadPushNotifications();
      if (!PN) {
        logger.info('[FcmService] Push notifications not available on this platform.');
        return;
      }

      // Solicitar permissão ao utilizador
      const result = await PN.requestPermissions();
      this.permissionGranted =
        result.receive === 'granted' ||
        (result as any).granted === true;

      if (!this.permissionGranted) {
        logger.info('[FcmService] Permissão de notificação negada pelo utilizador (nativo).');
        return;
      }

      // Registar para receber notificações push
      await PN.register();

      // Obter token (é emitido via evento 'registration')
      // Também tentamos obter directamente
      const token = await this.getNativeToken();
      if (token && this.currentUserId) {
        await this.saveTokenToSupabase(token, this.currentUserId);
      }

      // Registar listeners do Capacitor
      await this.setupNativeListeners();
    } catch (err) {
      logger.warn('[FcmService] Erro na inicialização nativa:', { error: err });
    }
  }

  /**
   * Obtém o token FCM para plataformas nativas.
   * O token é recebido via evento 'registration' do plugin Capacitor.
   * Este método tenta obter um token previamente guardado ou aguarda o evento.
   */
  private getNativeToken(): Promise<string | null> {
    return new Promise((resolve) => {
      // Se já temos o token, retornar imediatamente
      if (this.currentToken) {
        resolve(this.currentToken);
        return;
      }

      const PN = PushNotifications;
      if (!PN) {
        resolve(null);
        return;
      }

      // Timeout de 10 segundos para evitar espera infinita
      const timeout = setTimeout(() => {
        logger.warn('[FcmService] Timeout ao aguardar token nativo.');
        resolve(null);
      }, 10_000);

      // Registar listener temporário para o evento de registo
      const registrationListener = PN.addListener(
        'registration',
        (token: any) => {
          clearTimeout(timeout);
          this.currentToken = token.value;
          logger.info('[FcmService] Token FCM nativo recebido.');

          // Guardar no Supabase automaticamente
          if (this.currentUserId && token.value) {
            this.saveTokenToSupabase(token.value, this.currentUserId);
          }

          resolve(token.value);
        }
      );

      // Guardar referência para cleanup
      this.capacitorListeners.push(() => registrationListener.then((h: any) => h?.remove()));
    });
  }

  /**
   * Configura os listeners nativos para notificações recebidas.
   * - pushNotificationReceived: Notificação recebida com a app em foreground
   * - pushNotificationActionPerformed: Utilizador tocou na notificação
   */
  private async setupNativeListeners(): Promise<void> {
    const PN = PushNotifications;
    if (!PN) return;

    // Listener para notificações recebidas (foreground)
    const receivedListener = await PN.addListener(
      'pushNotificationReceived',
      (notification: any) => {
        const message: FcmMessage = {
          title: notification.title || undefined,
          body: notification.body || undefined,
          data: notification.data as Record<string, any> | undefined,
          messageId: notification.id || undefined,
        };
        this.emitMessage(message);
      }
    );
    this.capacitorListeners.push(() => receivedListener.remove());

    // Listener para acção do utilizador (toque na notificação)
    const actionListener = await PN.addListener(
      'pushNotificationActionPerformed',
      (action: any) => {
        const notification = action.notification;
        const message: FcmMessage = {
          title: notification.title || undefined,
          body: notification.body || undefined,
          data: {
            ...(notification.data as Record<string, any> | undefined),
            actionId: action.actionId,
          },
          messageId: notification.id || undefined,
        };
        this.emitMessage(message);
      }
    );
    this.capacitorListeners.push(() => actionListener.remove());
  }

  // =======================================================================
  // Métodos privados — Utilitários
  // =======================================================================

  /**
   * Emite uma mensagem para todos os listeners registados.
   * @param message - Mensagem FCM recebida
   */
  private emitMessage(message: FcmMessage): void {
    for (const callback of this.messageListeners) {
      try {
        callback(message);
      } catch (err) {
        logger.warn('[FcmService] Erro no callback de mensagem:', { error: err });
      }
    }
  }

  /**
   * Converte o payload do Firebase Web SDK para o formato FcmMessage.
   * @param payload - Payload bruto do Firebase onMessage
   */
  private parseFirebasePayload(payload: any): FcmMessage {
    return {
      title: payload.notification?.title || undefined,
      body: payload.notification?.body || undefined,
      data: payload.data || undefined,
      messageId: payload.messageId || undefined,
    };
  }
}

// ---------------------------------------------------------------------------
// Exportação do singleton
// ---------------------------------------------------------------------------

/** Instância única do serviço FCM. Usar em vez de criar novas instâncias. */
export const fcmService = FcmService.getInstance();
