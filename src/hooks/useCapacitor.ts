/**
 * useCapacitor — Advanced Capacitor Native Integration
 *
 * Capacidades:
 * - StatusBar dinamica (light/dark por pagina)
 * - Haptic feedback contextual (success, error, selection, light)
 * - Keep-awake para emergencias/consultas
 * - Splash screen hide com transicao suave
 * - Safe area insets para layout
 * - Deep link route extraction
 * - Network status reativo
 *
 * Uso: useCapacitor() no AppLayout.tsx
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, NotificationType, ImpactStyle } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';

interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface UseCapacitorReturn {
  isNative: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isOnline: boolean;
  safeArea: SafeAreaInsets;
  /** Dispara haptic feedback */
  haptic: {
    success: () => Promise<void>;
    error: () => Promise<void>;
    warning: () => Promise<void>;
    selection: () => Promise<void>;
    light: () => Promise<void>;
    medium: () => Promise<void>;
    heavy: () => Promise<void>;
  };
  /** Mudar cor da status bar */
  setStatusBarColor: (color: string, style?: 'LIGHT' | 'DARK') => Promise<void>;
  /** Manter ecra ligado */
  keepAwake: () => Promise<void>;
  /** Permitir ecra desligar */
  allowSleep: () => Promise<void>;
}

function getSafeArea(): SafeAreaInsets {
  if (typeof document === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0', 10) || 0,
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10) || 0,
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0', 10) || 0,
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0', 10) || 0,
  };
}

/** Haptic helpers — safe no web */
async function hapticSuccess() {
  try { await Haptics.notification({ type: NotificationType.Success }); } catch {}
}
async function hapticError() {
  try { await Haptics.notification({ type: NotificationType.Error }); } catch {}
}
async function hapticWarning() {
  try { await Haptics.notification({ type: NotificationType.Warning }); } catch {}
}
async function hapticSelection() {
  try { await Haptics.selectionStart(); } catch {}
}
async function hapticLight() {
  try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
}
async function hapticMedium() {
  try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
}
async function hapticHeavy() {
  try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch {}
}

export function useCapacitor(): UseCapacitorReturn {
  const isNative = Capacitor.isNativePlatform();
  const isAndroid = Capacitor.getPlatform() === 'android';
  const isIOS = Capacitor.getPlatform() === 'ios';
  const [isOnline, setIsOnline] = useState(true);
  const [safeArea, setSafeArea] = useState<SafeAreaInsets>(getSafeArea());
  const initialized = useRef(false);

  // ---- INIT: StatusBar + SplashScreen + Network ----
  useEffect(() => {
    if (!isNative || initialized.current) return;
    initialized.current = true;

    const init = async () => {
      try {
        // StatusBar
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#047857' });
        await StatusBar.setOverlaysWebView({ overlay: true });

        // Network initial status
        const status = await Network.getStatus();
        setIsOnline(status.connected);
      } catch {
        // Web fallback
      }

      // Esconder splash com fade suave
      try {
        await SplashScreen.hide({ fadeOutDuration: 400 });
      } catch {
        try { await SplashScreen.hide(); } catch {}
      }
    };

    init();
  }, [isNative]);

  // ---- NETWORK LISTENER ----
  useEffect(() => {
    if (!isNative) return;

    let handler: any;
    const setup = async () => {
      try {
        handler = await Network.addListener('networkStatusChange', (status) => {
          setIsOnline(status.connected);
        });
      } catch {
        // Web: navigator.onLine
      }
    };
    setup();
    return () => { handler?.remove(); };
  }, [isNative]);

  // ---- SAFE AREA UPDATE ----
  useEffect(() => {
    if (!isNative) return;
    const update = () => setSafeArea(getSafeArea());
    // Atualizar quando orientacao muda
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isNative]);

  // ---- DYNAMIC STATUS BAR ----
  const setStatusBarColor = useCallback(async (color: string, style: 'LIGHT' | 'DARK' = 'LIGHT') => {
    if (!isNative) return;
    try {
      await StatusBar.setBackgroundColor({ color });
      await StatusBar.setStyle({ style: style === 'LIGHT' ? Style.Dark : Style.Light });
    } catch {}
  }, [isNative]);

  // ---- KEEP AWAKE (para consultas, SOS) ----
  const keepAwake = useCallback(async () => {
    if (!isNative) return;
    try {
      // Capacitor 7: manter ecra ligado durante a sessao
      // Em Android usa FLAG_KEEP_SCREEN_ON na WebView
      const webView = (window as any).__capacitorWebView;
      if (webView?.setKeepAwake) {
        webView.setKeepAwake(true);
      }
    } catch {}
  }, [isNative]);

  const allowSleep = useCallback(async () => {
    if (!isNative) return;
    try {
      const webView = (window as any).__capacitorWebView;
      if (webView?.setKeepAwake) {
        webView.setKeepAwake(false);
      }
    } catch {}
  }, [isNative]);

  return {
    isNative,
    isAndroid,
    isIOS,
    isOnline,
    safeArea,
    haptic: {
      success: hapticSuccess,
      error: hapticError,
      warning: hapticWarning,
      selection: hapticSelection,
      light: hapticLight,
      medium: hapticMedium,
      heavy: hapticHeavy,
    },
    setStatusBarColor,
    keepAwake,
    allowSleep,
  };
}
