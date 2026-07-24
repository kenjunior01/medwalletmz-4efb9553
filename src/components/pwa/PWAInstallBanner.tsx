import { useEffect } from "react";
import { usePWA } from "@/hooks/usePWA";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

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
