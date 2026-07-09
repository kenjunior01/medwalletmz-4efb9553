import { useQuery } from "@tanstack/react-query";
import { Wind, AlertCircle, CloudRain, ThermometerSun } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLocation } from "@/contexts/LocationContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { fetchEnvironmentalHealth } from "@/lib/googleEnvironmental";

/**
 * AirQualityWidget — Integração Real com Google Air Quality API.
 * Fornece recomendações de saúde precisas para Moçambique.
 */
export function AirQualityWidget() {
  const { coordinates } = useLocation();

  const { data: envData, isLoading } = useQuery({
    queryKey: ["environmental-health", coordinates?.latitude, coordinates?.longitude],
    queryFn: () => fetchEnvironmentalHealth(coordinates!.latitude, coordinates!.longitude),
    enabled: !!coordinates,
    refetchInterval: 1000 * 60 * 30, // 30 min
  });

  if (isLoading) return <div className="px-4 mt-5"><Skeleton className="h-32 w-full rounded-2xl" /></div>;
  if (!envData || envData.status === "error") return null;

  const getAqiColor = (aqi: number) => {
    if (aqi <= 50) return "text-emerald-600 bg-emerald-500/10 border-emerald-500/20";
    if (aqi <= 100) return "text-amber-600 bg-amber-500/10 border-amber-500/20";
    return "text-destructive bg-destructive/10 border-destructive/20";
  };

  return (
    <section className="px-4 mt-5">
      <Card className={cn(
        "p-4 border shadow-sm relative overflow-hidden transition-all duration-500",
        getAqiColor(envData.aqi)
      )}>
        <div className="flex gap-4 relative z-10">
          <div className="h-12 w-12 rounded-2xl bg-white/40 dark:bg-black/20 backdrop-blur flex items-center justify-center shrink-0 shadow-sm">
            {envData.temp > 30 ? (
              <ThermometerSun className="h-6 w-6 animate-pulse" />
            ) : (
              <Wind className="h-6 w-6" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">Saúde & Ambiente</h3>
                <Badge variant="outline" className="text-[9px] bg-white/50 border-0 font-bold">AQI {envData.aqi}</Badge>
              </div>
              <span className="text-sm font-black">{envData.temp}°C</span>
            </div>

            <p className="text-[12px] leading-snug mt-1.5 font-semibold text-foreground/90">
              {envData.recommendation}
            </p>

            <div className="mt-3 space-y-1.5">
              {envData.alerts.map((alert: any, idx: number) => (
                <div key={idx} className="flex items-start gap-1.5 text-[10px] opacity-90 bg-white/20 dark:bg-black/10 p-2 rounded-lg border border-white/20">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                  <span className="font-medium">{alert.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute -right-4 -bottom-4 opacity-5">
          <CloudRain className="h-24 w-24" />
        </div>
      </Card>
    </section>
  );
}

