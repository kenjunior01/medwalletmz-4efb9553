// ========================================================================
// MedWallet Notification Service — Unified Push Notification + Deep Linking
// Works on Web (PWA/Service Worker) and Capacitor (iOS/Android native)
// ========================================================================

import { Capacitor } from '@capacitor/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationCategory =
  | 'message'
  | 'appointment'
  | 'order'
  | 'prescription'
  | 'wallet'
  | 'insurance'
  | 'health_tip'
  | 'marketing'
  | 'system';

export interface NotificationPayload {
  /** Semantic category for routing / icon selection */
  category: NotificationCategory;
  /** Notification title — can be an i18n key or raw string */
  title: string;
  /** Notification body — can be an i18n key or raw string */
  body: string;
  /** Arbitrary key-value data attached to the notification */
  data?: Record<string, any>;
  /** In-app deep-link path, e.g. "/health/consultation/123" */
  deepLink?: string;
  /** Icon URL or asset path */
  icon?: string;
  /** Badge count to display */
  badge?: number;
  /** Unique identifier (auto-generated if omitted) */
  id?: string;
}

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied' | 'prompt';

/** Callback fired when a notification is tapped / action performed */
export type NotificationTapHandler = (payload: NotificationPayload) => void;

// ---------------------------------------------------------------------------
// Platform detection helpers
// ---------------------------------------------------------------------------

function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform?.() ?? false;
}

function isWebWithNotificationSupport(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.Notification !== 'undefined'
  );
}

function isServiceWorkerSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator
  );
}

// ---------------------------------------------------------------------------
// Capacitor plugin loader (lazy — avoids import errors in web builds)
// ---------------------------------------------------------------------------

let PushNotificationsPlugin: any = null;

async function getPushNotificationsPlugin() {
  if (!isNativePlatform()) return null;
  if (PushNotificationsPlugin) return PushNotificationsPlugin;

  try {
    // Dynamic import to prevent web-only bundles from pulling in native code
    const mod = await import('@capacitor/push-notifications');
    PushNotificationsPlugin = mod.PushNotifications;
    return PushNotificationsPlugin;
  } catch {
    console.warn('[NotificationService] @capacitor/push-notifications not available');
    return null;
  }
}

// ---------------------------------------------------------------------------
// NotificationService (Singleton)
// ---------------------------------------------------------------------------

class NotificationService {
  private static instance: NotificationService;
  private initialized = false;
  private tapHandlers: NotificationTapHandler[] = [];
  private scheduledIds = new Map<string, ReturnType<typeof setTimeout>>();

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // -----------------------------------------------------------------------
  // Permission
  // -----------------------------------------------------------------------

  /** Check current permission status */
  getPermissionStatus(): NotificationPermissionStatus {
    if (isNativePlatform()) {
      // On native, we treat it as 'default' until we ask
      return 'default';
    }
    if (!isWebWithNotificationSupport()) return 'denied';
    return window.Notification.permission as NotificationPermissionStatus;
  }

  /** Request notification permission — works on both web and native */
  async requestPermission(): Promise<boolean> {
    // --- Web ---
    if (!isNativePlatform()) {
      if (!isWebWithNotificationSupport()) return false;
      const result = await window.Notification.requestPermission();
      return result === 'granted';
    }

    // --- Capacitor Native ---
    const PushNotifications = await getPushNotificationsPlugin();
    if (!PushNotifications) return false;

    try {
      const result = await PushNotifications.requestPermissions();
      return (
        result.receive === 'granted' ||
        (result as any).granted === true
      );
    } catch (err) {
      console.warn('[NotificationService] Permission request failed:', err);
      return false;
    }
  }

  // -----------------------------------------------------------------------
  // Registration
  // -----------------------------------------------------------------------

  /** Register for native push notifications (Capacitor only). No-op on web. */
  async registerCapacitor(): Promise<void> {
    if (!isNativePlatform()) return;

    const PushNotifications = await getPushNotificationsPlugin();
    if (!PushNotifications) return;

    try {
      await PushNotifications.register();

      // Listen for incoming push while app is in foreground
      PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
        const payload = this.parseCapacitorNotification(notification);
        if (payload) {
          this.emitTap(payload);
        }
      });

      // Listen for notification tap (background or foreground)
      PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
        const payload = this.parseCapacitorNotification(action.notification);
        if (payload) {
          this.handleNotificationTap(payload);
        }
      });
    } catch (err) {
      console.warn('[NotificationService] Capacitor registration failed:', err);
    }
  }

  /** Register a service worker for web push (PWA). No-op when no SW support. */
  async registerWebPush(): Promise<void> {
    if (isNativePlatform()) return;
    if (!isServiceWorkerSupported()) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration) {
        // Register the service worker if not already done
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }
    } catch (err) {
      console.warn('[NotificationService] Web push registration failed:', err);
    }
  }

  /**
   * Full initialization — call once at app startup.
   * Requests permission if needed, registers native/web push,
   * and sets up tap handlers.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (isNativePlatform()) {
      const granted = await this.requestPermission();
      if (granted) {
        await this.registerCapacitor();
      }
    } else {
      await this.registerWebPush();
      this.setupWebNotificationClickHandler();
    }

    this.initialized = true;
  }

  // -----------------------------------------------------------------------
  // Local Notifications
  // -----------------------------------------------------------------------

  /** Show a local notification immediately */
  async showLocal(notification: NotificationPayload): Promise<void> {
    const id = notification.id || crypto.randomUUID();

    // --- Web ---
    if (!isNativePlatform()) {
      if (!isWebWithNotificationSupport()) return;
      if (window.Notification.permission !== 'granted') return;

      try {
        const options: NotificationOptions = {
          body: notification.body,
          icon: notification.icon || '/icon-512.png',
          badge: notification.icon || '/icon.svg',
          tag: id,
          data: {
            deepLink: notification.deepLink,
            category: notification.category,
            ...notification.data,
          },
        };

        if (isServiceWorkerSupported()) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.showNotification(notification.title, options);
            return;
          }
        }

        // Fallback: use Notification constructor directly
        const n = new window.Notification(notification.title, options);
        n.onclick = () => {
          window.focus();
          this.handleNotificationTap(notification);
          n.close();
        };
      } catch (err) {
        console.warn('[NotificationService] showLocal failed:', err);
      }
      return;
    }

    // --- Capacitor Native (Local Notifications) ---
    const PushNotifications = await getPushNotificationsPlugin();
    if (!PushNotifications || typeof PushNotifications.schedule !== 'function') {
      console.warn('[NotificationService] Local scheduling not supported on this native plugin');
      return;
    }

    try {
      await PushNotifications.schedule({
        notifications: [
          {
            title: notification.title,
            body: notification.body,
            id: this.hashToNumericId(id),
            data: {
              deepLink: notification.deepLink,
              category: notification.category,
              ...notification.data,
            },
            icon: notification.icon,
            smallIcon: notification.icon,
            largeIcon: notification.icon,
          },
        ],
      });
    } catch (err) {
      console.warn('[NotificationService] Native local notification failed:', err);
    }
  }

  // -----------------------------------------------------------------------
  // Scheduled Notifications
  // -----------------------------------------------------------------------

  /**
   * Schedule a local notification at a future date.
   * On web: uses setTimeout (only works while tab is open).
   * On native: uses the Capacitor LocalNotifications schedule API.
   */
  async schedule(notification: NotificationPayload, date: Date): Promise<void> {
    const id = notification.id || crypto.randomUUID();
    const now = Date.now();
    const delay = date.getTime() - now;

    if (delay <= 0) {
      // Already past — show immediately
      await this.showLocal({ ...notification, id });
      return;
    }

    // --- Web fallback (setTimeout) ---
    if (!isNativePlatform()) {
      const timer = setTimeout(() => {
        this.showLocal({ ...notification, id });
        this.scheduledIds.delete(id);
      }, delay);
      this.scheduledIds.set(id, timer);
      return;
    }

    // --- Capacitor Native ---
    const PushNotifications = await getPushNotificationsPlugin();
    if (!PushNotifications || typeof PushNotifications.schedule !== 'function') {
      // Fallback to setTimeout on native too if plugin doesn't support schedule
      const timer = setTimeout(() => {
        this.showLocal({ ...notification, id });
        this.scheduledIds.delete(id);
      }, delay);
      this.scheduledIds.set(id, timer);
      return;
    }

    try {
      await PushNotifications.schedule({
        notifications: [
          {
            title: notification.title,
            body: notification.body,
            id: this.hashToNumericId(id),
            schedule: { at: date.toISOString() },
            data: {
              deepLink: notification.deepLink,
              category: notification.category,
              ...notification.data,
            },
            icon: notification.icon,
          },
        ],
      });
    } catch (err) {
      console.warn('[NotificationService] Native schedule failed:', err);
    }
  }

  /** Cancel a scheduled notification by ID */
  async cancel(id: string): Promise<void> {
    // Clear web setTimeout timer
    const timer = this.scheduledIds.get(id);
    if (timer) {
      clearTimeout(timer);
      this.scheduledIds.delete(id);
    }

    // --- Capacitor Native ---
    if (isNativePlatform()) {
      const PushNotifications = await getPushNotificationsPlugin();
      if (PushNotifications && typeof PushNotifications.cancel === 'function') {
        try {
          await PushNotifications.cancel({ notifications: [{ id: this.hashToNumericId(id) }] });
        } catch (err) {
          console.warn('[NotificationService] Cancel failed:', err);
        }
      }
    }
  }

  /** Cancel all scheduled notifications */
  async cancelAll(): Promise<void> {
    // Clear all web timers
    for (const timer of this.scheduledIds.values()) {
      clearTimeout(timer);
    }
    this.scheduledIds.clear();

    // --- Capacitor Native ---
    if (isNativePlatform()) {
      const PushNotifications = await getPushNotificationsPlugin();
      if (PushNotifications && typeof PushNotifications.cancel === 'function') {
        try {
          await PushNotifications.cancel({ notifications: [] });
        } catch (err) {
          console.warn('[NotificationService] CancelAll failed:', err);
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Badge
  // -----------------------------------------------------------------------

  /** Clear the app badge (unread count) */
  async clearBadge(): Promise<void> {
    if (!isNativePlatform()) {
      // Web: use the experimental Badge API if available
      try {
        if ('clearAppBadge' in navigator) {
          await (navigator as any).clearAppBadge();
        }
      } catch {
        // Badge API not supported — silent no-op
      }
      return;
    }

    const PushNotifications = await getPushNotificationsPlugin();
    if (PushNotifications && typeof PushNotifications.removeAllDeliveredNotifications === 'function') {
      try {
        await PushNotifications.removeAllDeliveredNotifications();
      } catch (err) {
        console.warn('[NotificationService] removeAllDeliveredNotifications failed:', err);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Deep-link handling
  // -----------------------------------------------------------------------

  /**
   * Navigate to a deep-link path when a notification is tapped.
   * For PWA: uses SPA navigation within the same origin.
   * For native: the app's router handles the deep link.
   */
  handleNotificationTap(data: Record<string, any>): void {
    const deepLink = data.deepLink || data?.data?.deepLink;
    if (!deepLink) return;

    // Ensure it's an internal path, not an external URL
    if (deepLink.startsWith('http://') || deepLink.startsWith('https://')) {
      // External URLs open in a new tab / browser
      if (typeof window !== 'undefined') {
        window.open(deepLink, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    // Internal SPA path — navigate without full page reload
    if (typeof window !== 'undefined') {
      // Prefer history pushState for SPA navigation (works with react-router)
      const fullPath = deepLink.startsWith('/') ? deepLink : `/${deepLink}`;
      const currentOrigin = window.location.origin;
      const targetUrl = new URL(fullPath, currentOrigin);

      if (window.location.href !== targetUrl.href) {
        window.history.pushState({}, '', fullPath);
        // Dispatch a popstate event so react-router picks it up
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
      } else {
        window.location.href = fullPath;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Event handlers
  // -----------------------------------------------------------------------

  /** Register a tap handler to be called when a notification is interacted with */
  onNotificationTap(handler: NotificationTapHandler): () => void {
    this.tapHandlers.push(handler);
    return () => {
      this.tapHandlers = this.tapHandlers.filter(h => h !== handler);
    };
  }

  private emitTap(payload: NotificationPayload): void {
    for (const handler of this.tapHandlers) {
      try {
        handler(payload);
      } catch (err) {
        console.warn('[NotificationService] Tap handler error:', err);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Web-specific: intercept notification click from service worker
  // -----------------------------------------------------------------------

  private setupWebNotificationClickHandler(): void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === 'NOTIFICATION_CLICK' && data?.payload) {
        this.handleNotificationTap(data.payload);
        this.emitTap(data.payload);
      }
    });
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private parseCapacitorNotification(raw: any): NotificationPayload | null {
    if (!raw) return null;
    const data = raw.data || {};
    return {
      category: data.category || 'system',
      title: raw.title || data.title || '',
      body: raw.body || data.body || '',
      data,
      deepLink: data.deepLink,
      icon: raw.icon || data.icon,
      badge: raw.badge ?? data.badge,
      id: data.id || raw.id,
    };
  }

  /**
   * Convert a UUID string to a positive integer (required by Capacitor
   * LocalNotifications which expects numeric IDs).
   */
  private hashToNumericId(uuid: string): number {
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
      const char = uuid.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const notificationService = NotificationService.getInstance();
