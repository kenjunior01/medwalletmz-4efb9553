import { Gauge } from "@/components/icons/lucide-compat";
import { Switch } from "@/components/ui/switch";
import { useDataSaver } from "@/contexts/DataSaverContext";
import { useCountry } from "@/contexts/CountryContext";

export function LowDataToggle() {
  const { enabled, toggle } = useDataSaver();
  const { t } = useCountry();
  return (
    <div className="bento-card p-4 flex items-start gap-3">
      <div className="h-11 w-11 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
        <Gauge className="h-5 w-5 text-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold text-sm">{t('dataSaver.title')}</p>
          <Switch checked={enabled} onCheckedChange={toggle} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
          {t('dataSaver.description')}
        </p>
      </div>
    </div>
  );
}
