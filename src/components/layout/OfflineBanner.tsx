import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="sticky top-0 z-[60] bg-destructive text-destructive-foreground px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-md animate-fade-in">
      <WifiOff className="h-3.5 w-3.5" />
      Estás offline — a mostrar dados em cache. Algumas acções estão indisponíveis.
    </div>
  );
}