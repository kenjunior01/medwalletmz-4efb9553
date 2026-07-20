/**
 * src/components/pwa/PWAInstallPrompt.tsx
 * ====================================================================
 * Banner que aparece em dispositivos móveis Android (e desktop Chrome/Edge)
 * convidando o utilizador a instalar o MedWallet MZ como app nativa.
 *
 * Vantagens para Moçambique:
 *  - Sem Google Play (poupa dados ~30MB APK vs ~3MB PWA install)
 *  - Aparece no launcher do telemóvel como app normal
 *  - Suporta offline (PWA service worker)
 *  - Push notifications nativas
 *
 * Detecta o evento 'beforeinstallprompt' (Chrome/Android/Edge) e mostra
 * banner não-intrusivo após 30s de uso (não perturba no primeiro render).
 * Persiste decisão de "não agora" em localStorage por 7 dias.
 * ====================================================================
 */

import { useEffect, useState } from 'react';
import { Download, X, Smartphone, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const DISMISS_KEY = 'mz_pwa_install_dismissed_until';
const DISMISS_DAYS = 60;
const NEVER_KEY = 'mz_pwa_install_never';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt: () => Promise<void>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Detecta se já está instalado (standalone)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }
    // Utilizador escolheu "Nunca mais mostrar"
    if (localStorage.getItem(NEVER_KEY) === '1') {
      return;
    }
    // iOS não suporta beforeinstallprompt — mostrar dica manual
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (Date.now() > dismissedUntil) {
        const t = setTimeout(() => setVisible(true), 180000); // 3min no iOS
        return () => clearTimeout(t);
      }
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (Date.now() > dismissedUntil) {
        const t = setTimeout(() => setVisible(true), 180000); // 3min em Android
        return () => clearTimeout(t);
      }
    };
    const installedHandler = () => {
      setInstalled(true);
      setVisible(false);
      toast.success('MedWallet MZ instalado com sucesso!', {
        description: 'Abra o ícone no seu telemóvel sempre que precisar.',
      });
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // iOS fallback — abrir instruções
      toast.info('Para instalar no iPhone', {
        description: 'Toque em Partilhar → "Adicionar ao Ecrã Principal".',
        duration: 8000,
      });
      dismiss();
      return;
    }
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalled(true);
      }
      setDeferredPrompt(null);
      setVisible(false);
    } catch {
      toast.error('Não foi possível instalar agora. Tente mais tarde.');
    }
  };

  const dismiss = () => {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
    setVisible(false);
  };

  const neverShowAgain = () => {
    localStorage.setItem(NEVER_KEY, '1');
    setVisible(false);
    toast.success('Não mostraremos mais este aviso.');
  };

  if (installed || !visible) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md px-2 animate-slide-up">
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-xl">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm text-emerald-900">
                  Instale o MedWallet MZ
                </h3>
                <button
                  onClick={dismiss}
                  aria-label="Fechar"
                  className="rounded-full p-1 text-emerald-700 hover:bg-emerald-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-emerald-800 leading-relaxed">
                Acesso rápido ao SOS, lembretes ARV e triagem IA. Poupa dados — funciona offline.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  onClick={handleInstall}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <Download className="h-4 w-4" /> Instalar agora
                </Button>
                <button
                  onClick={dismiss}
                  className="text-xs text-emerald-700 hover:underline px-2"
                >
                  Não agora
                </button>
                <button
                  onClick={neverShowAgain}
                  className="text-xs text-muted-foreground hover:text-emerald-700 hover:underline px-2 ml-auto"
                >
                  Não mostrar mais
                </button>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-700">
                <WifiOff className="h-3 w-3" /> Funciona sem internet · 3MB apenas
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
