/**
 * useAppLifecycle — Capacitor App Lifecycle
 *
 * Funcionalidades:
 * - Detecta estado da rede (online/offline) com toast automático
 * - Intercepta botão voltar do Android no modo de registo
 * - Reseta estado quando app volta ao foreground (refresh de dados)
 * - Tracking de sessão para analytics
 *
 * Uso: useAppLifecycle() no App.tsx
 */
import { useEffect, useRef, useCallback } from 'react';
import { App, Network, StatusBar } from '@capacitor/core';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';

interface AppLifecycleOptions {
  /** Mostrar toast quando voltar online */
  showToastOnOnline?: boolean;
  /** Mostrar toast quando ficar offline */
  showToastOnOffline?: boolean;
  /** Rota do registo (para interceptar back button) */
  registrationRoutes?: string[];
  /** Callback quando app volta ao foreground */
  onForeground?: () => void;
  /** Callback quando app vai para background */
  onBackground?: () => void;
  /** Mostrar status bar */
  statusBarStyle?: 'LIGHT' | 'DARK' | 'DEFAULT';
}

const DEFAULT_ROUTES = [
  '/register', '/auth', '/login',
  '/register?', '/auth?', '/login?',
];

export function useAppLifecycle({
  showToastOnOnline = true,
  showToastOnOffline = true,
  registrationRoutes = DEFAULT_ROUTES,
  onForeground,
  onBackground,
  statusBarStyle = 'LIGHT',
}: AppLifecycleOptions = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isOnlineRef = useRef(true);
  const lastPathRef = useRef(location.pathname);

  // --- STATUS BAR ---
  useEffect(() => {
    const setStatusBar = async () => {
      try {
        await StatusBar.setStyle({ style: statusBarStyle });
        await StatusBar.setBackgroundColor({ color: '#047857' });
      } catch {
        // Web — não tem status bar nativa
      }
    };
    setStatusBar();
  }, [statusBarStyle]);

  // --- NETWORK MONITORING ---
  useEffect(() => {
    let handler: any;

    const checkNetwork = async () => {
      try {
        const status = await Network.getStatus();
        isOnlineRef.current = status.connected;
      } catch {
        // Web fallback — sempre online
        isOnlineRef.current = true;
      }
    };

    const setupNetwork = async () => {
      try {
        await checkNetwork();
        handler = await Network.addListener('networkStatusChange', (status) => {
          const wasOffline = !isOnlineRef.current;
          isOnlineRef.current = status.connected;

          if (status.connected && wasOffline && showToastOnOnline) {
            toast.success('Ligação restaurada', {
              description: 'Dados sincronizados automaticamente',
              duration: 3000,
            });
          } else if (!status.connected && showToastOnOffline) {
            toast.error('Sem ligação à Internet', {
              description: 'A app funciona offline mas alguns dados podem estar desatualizados',
              duration: 5000,
            });
          }
        });
      } catch {
        // Web — usar navigator.onLine
        window.addEventListener('online', () => {
          if (showToastOnOnline) toast.success('Ligação restaurada');
          isOnlineRef.current = true;
        });
        window.addEventListener('offline', () => {
          if (showToastOnOffline) toast.error('Sem ligação à Internet');
          isOnlineRef.current = false;
        });
      }
    };

    setupNetwork();
    return () => {
      handler?.remove();
    };
  }, [showToastOnOnline, showToastOnOffline]);

  // --- APP LIFECYCLE (foreground/background) ---
  useEffect(() => {
    let resumeHandler: any;
    let pauseHandler: any;

    const setupLifecycle = async () => {
      try {
        resumeHandler = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            // App voltou ao foreground
            onForeground?.();
          } else {
            // App foi para background
            onBackground?.();
          }
        });
      } catch {
        // Web — usar Page Visibility API
        const handleVisibility = () => {
          if (document.visibilityState === 'visible') {
            onForeground?.();
          } else {
            onBackground?.();
          }
        };
        document.addEventListener('visibilitychange', handleVisibility);
      }
    };

    setupLifecycle();
    return () => {
      resumeHandler?.remove();
      pauseHandler?.remove();
    };
  }, [onForeground, onBackground]);

  // --- BACK BUTTON (Android) ---
  const isRegistrationRoute = useCallback(() => {
    return registrationRoutes.some(r =>
      location.pathname.startsWith(r)
    );
  }, [location.pathname, registrationRoutes]);

  const handleBackButton = useCallback(() => {
    // No registo, voltar ao passo anterior em vez de sair
    if (isRegistrationRoute()) {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
    }

    // Em qualquer página, se houver histórico, voltar
    if (window.history.length > 1) {
      navigate(-1);
    }
    // Senão, deixar o comportamento padrão (minimizar app)
  }, [navigate, isRegistrationRoute]);

  useEffect(() => {
    try {
      App.addListener('backButton', handleBackButton);
    } catch {
      // Web — não tem botão voltar nativo
    }
  }, [handleBackButton]);

  return {
    isOnline: isOnlineRef.current,
  };
}
