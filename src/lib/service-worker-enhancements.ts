/**
 * Service Worker message handlers for enhanced PWA features.
 * Called from main.tsx to register custom SW handlers.
 */

export function registerServiceWorkerHandlers() {
  if (typeof window === 'undefined' || !navigator.serviceWorker) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    const { data } = event;
    
    switch (data?.type) {
      case 'OFFLINE_ACTION_QUEUED':
        console.log('[SW] Offline action queued:', data.action);
        break;
      case 'SYNC_COMPLETE':
        console.log('[SW] Background sync complete');
        break;
      case 'APP_INSTALLED':
        if (typeof (window as any).gtag !== 'undefined') {
          (window as any).gtag?.('event', 'pwa_install', {
            event_category: 'engagement',
            event_label: 'native_install',
          });
        }
        break;
    }
  });

  // Register for periodic background sync (if supported)
  if ('periodicSync' in ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((reg) => {
      try {
        (reg as any).periodicSync.register('health-reminders', {
          minInterval: 12 * 60 * 60 * 1000, // 12 hours
        });
      } catch (e) {
        // Periodic sync not supported or not allowed
      }
    });
  }

  // Listen for connectivity changes
  window.addEventListener('online', () => {
    console.log('[App] Back online — syncing pending actions');
    navigator.serviceWorker.controller?.postMessage({ type: 'SYNC_PENDING' });
  });

  window.addEventListener('offline', () => {
    console.log('[App] Went offline — entering offline mode');
  });
}
