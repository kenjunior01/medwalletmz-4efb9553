import { Gauge } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useDataSaver } from "@/contexts/DataSaverContext";

export function LowDataToggle() {
  const { enabled, toggle } = useDataSaver();
  return (
    <div className="bento-card p-4 flex items-start gap-3">
      <div className="h-10 w-10 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
        <Gauge className="h-5 w-5 text-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold text-sm">Modo baixo consumo</p>
          <Switch checked={enabled} onCheckedChange={toggle} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
          Esconde imagens pesadas e animações decorativas — ideal para 2G/3G e poupar dados.
        </p>
      </div>
    </div>
  );
}