import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PwaState {
  /** Se a app pode ser instalada (beforeinstallprompt disparou) */
  canInstall: boolean;
  /** Se a app já está instalada (running in standalone mode) */
  isInstalled: boolean;
  /** Se o service worker foi registado com sucesso */
  swRegistered: boolean;
  /** Se há uma atualização do SW pendente */
  updateAvailable: boolean;
  /** Função para instalar a app (apenas se canInstall=true) */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  /** Função para aplicar a atualização do SW (reload) */
  applyUpdate: () => void;
}

/**
 * usePWA — Hook para gerir instalação e updates da PWA
 *
 * Funcionalidades:
 *   - Detecta se a app está em modo standalone (instalada)
 *   - Captura beforeinstallprompt para mostrar botão "Instalar app"
 *   - Detecta updates do service worker e oferece reload
 *   - Funciona com vite-plugin-pwa
 */
export function usePWA(): PwaState {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [swRegistered, setSwRegistered] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // ── Detectar modo standalone (app instalada) ────────────────────────────
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches
        || (navigator as any).standalone === true
        || document.referrer.includes('android-app://');
      setIsInstalled(standalone);
    };
    checkStandalone();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);

    // ── Capturar beforeinstallprompt ────────────────────────────────────────
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
      console.log('[PWA] App pronta para instalar');
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // ── Detectar appinstalled ───────────────────────────────────────────────
    const handleAppInstalled = () => {
      setCanInstall(false);
      setDeferredPrompt(null);
      setIsInstalled(true);
      console.log('[PWA] App instalada com sucesso');
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // ── Service Worker (vite-plugin-pwa) ────────────────────────────────────
    if ('serviceWorker' in navigator) {
      // vite-plugin-pwa regista o SW automaticamente quando injectRegister='auto'
      // Mas podemos detectar updates via eventos
      navigator.serviceWorker.ready.then((registration) => {
        setSwRegistered(true);
        console.log('[PWA] Service Worker ativo:', registration.scope);

        // Verificar updates periodicamente
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          console.log('[PWA] Nova versão descarregada, a instalar...');
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nova versão instalada mas a antiga ainda está ativa
              console.log('[PWA] Atualização pronta. Chama applyUpdate() para recarregar.');
              setUpdateAvailable(true);
            }
          });
        });

        // Verificar updates a cada hora
        setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 60 * 1000);
      }).catch((err) => {
        console.warn('[PWA] Service Worker falhou:', err);
      });

      // Detectar quando o novo SW toma controlo
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Novo Service Worker assumiu controlo');
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setCanInstall(false);
    return choice.outcome;
  };

  const applyUpdate = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Skip waiting e reload
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    setTimeout(() => window.location.reload(), 500);
  };

  return {
    canInstall,
    isInstalled,
    swRegistered,
    updateAvailable,
    promptInstall,
    applyUpdate,
  };
}
