import { useEffect, useState } from 'react';
import { Download, X, Zap, WifiOff, Bell } from '@/components/icons/lucide-compat';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const DISMISS_KEY = 'mz_pwa_install_dismissed';

type DeferredPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const BENEFITS = [
  { icon: Zap, text: 'Acesso rápido sem browser' },
  { icon: WifiOff, text: 'Funciona offline' },
  { icon: Bell, text: 'Notificações em tempo real' },
];

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPrompt | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as DeferredPrompt);
    };

    window.addEventListener('beforeinstallprompt', handler);
    const timer = setTimeout(() => {
      if (deferredPrompt || /iPad|iPhone|iPod/.test(navigator.userAgent)) setShow(true);
    }, 30000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      setDeferredPrompt(null);
    }
    setShow(false);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          className="fixed bottom-0 left-0 right-0 z-50"
        >
          <div className="mx-auto max-w-lg p-3">
            <div className="rounded-2xl bg-gradient-to-br from-teal-600 via-indigo-600 to-purple-700 p-4 text-white shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20">
                  <Download className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm">Instala o MedWallet</h3>
                    <button onClick={dismiss} className="rounded-full p-0.5 hover:bg-white/20">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 space-y-1">
                    {BENEFITS.map((b) => (
                      <div key={b.text} className="flex items-center gap-2 text-xs text-white/90">
                        <b.icon className="h-3.5 w-3.5 text-teal-200" /> {b.text}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button onClick={handleInstall} size="sm" className="bg-white text-indigo-700 hover:bg-white/90 font-semibold">
                      <Download className="h-4 w-4 mr-1" /> Instalar
                    </Button>
                    <Button onClick={dismiss} size="sm" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
                      Depois
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
