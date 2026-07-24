import { useEffect, useState } from "react";
import { usePWA } from "@/hooks/usePWA";
import { Button } from "@/components/ui/button";
import { Download, X, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

/**
 * PWAInstallBanner — Mostra banner para instalar a app como PWA
 *
 * Comportamento:
 *   - Mostra banner se canInstall=true e ainda não foi dispensado nesta sessão
 *   - Não mostra se já está instalada (isInstalled=true)
 *   - Persiste dispensa por 7 dias no localStorage
 */
export function PWAInstallBanner() {
  const { canInstall, isInstalled, promptInstall } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Verificar se foi dispensado nos últimos 7 dias
    const dismissedAt = localStorage.getItem('pwa_install_dismissed_at');
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        setDismissed(true);
        return;
      }
      localStorage.removeItem('pwa_install_dismissed_at');
    }
  }, []);

  // Não mostrar se: instalada, dispensada, ou não pode instalar
  if (isInstalled || dismissed || !canInstall) return null;

  const handleInstall = async () => {
    const result = await promptInstall();
    if (result === 'accepted') {
      toast.success('A app foi instalada!', {
        description: 'Acede-a a partir do ícone no teu ecrã inicial.',
      });
    } else if (result === 'dismissed') {
      // Dispensar por 7 dias
      localStorage.setItem('pwa_install_dismissed_at', Date.now().toString());
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_install_dismissed_at', Date.now().toString());
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-40 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950 dark:to-slate-900 shadow-2xl">
        {/* Botão dispensar */}
        <button
          onClick={handleDismiss}
          aria-label="Dispensar"
          className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 p-4">
          {/* Ícone */}
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-lg">
            <img
              src="/icon-192.png"
              alt="MedWallet"
              className="w-7 h-7 rounded-md"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<div class="text-white font-bold">M</div>';
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="font-bold text-sm">Instalar MedWallet</p>
              <Sparkles className="h-3 w-3 text-amber-500" />
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              Acede mais rápido e usa offline.
            </p>
          </div>
        </div>

        <div className="px-4 pb-3">
          <Button
            onClick={handleInstall}
            size="sm"
            className="w-full font-bold gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <Download className="h-4 w-4" />
            Instalar agora
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * PWAUpdateToast — Mostra toast quando há update da PWA disponível
 *
 * Quando o service worker descarrega uma nova versão, mostra um toast
 * com botão para recarregar e aplicar a atualização.
 */
export function PWAUpdateToast() {
  const { updateAvailable, applyUpdate } = usePWA();

  useEffect(() => {
    if (!updateAvailable) return;

    const toastId = toast.success('Nova versão disponível!', {
      description: 'Recarrega para atualizar o MedWallet.',
      duration: Infinity,
      action: {
        label: 'Atualizar',
        onClick: () => applyUpdate(),
      },
      icon: <RefreshCw className="h-4 w-4" />,
    });

    return () => {
      toast.dismiss(toastId);
    };
  }, [updateAvailable, applyUpdate]);

  return null;
}
