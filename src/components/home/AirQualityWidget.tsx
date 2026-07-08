import { useQuery } from "@tanstack/react-query";
import { Wind, AlertCircle, CheckCircle2, Info, CloudRain, Sun, ThermometerSun } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLocation } from "@/contexts/LocationContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * AirQualityWidget — Integração com Google Air Quality & Weather API.
 * Fornece recomendações de saúde baseadas no ambiente local em Moçambique.
 */
export function AirQualityWidget() {
  const { coordinates, city } = useLocation();

  // Em uma implementação real, esta query chamaria as APIs via Edge Function
  const { data: envData, isLoading } = useQuery({
    queryKey: ["environmental-health", coordinates?.latitude, coordinates?.longitude],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 1200));

      // Simulação de resposta combinada (Air Quality + Weather + Pollen)
      return {
        aqi: 42,
        category: "Bom",
        temp: 31,
        condition: "Muito Calor",
        pollen: "Moderado",
        recommendation: "O ar está limpo, mas está muito calor em Maputo. Bebe 2L de água hoje para evitar desidratação.",
        alerts: [
          { type: 'heat', message: 'Risco de insolação alto entre as 11h e 15h.' },
          { type: 'pollen', message: 'Nível de pólen moderado: feche as janelas se tiver asma.' }
        ],
        status: "success"
      };
    },
    enabled: !!coordinates,
  });

  if (isLoading) return <Skeleton className="h-32 w-full rounded-2xl mx-4 mt-5" />;
  if (!envData) return null;

  const getAqiColor = (aqi: number) => {
    if (aqi <= 50) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (aqi <= 100) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-destructive bg-destructive/10 border-destructive/20";
  };

  return (
    <section className="px-4 mt-5">
      <Card className={cn(
        "p-4 border shadow-sm relative overflow-hidden",
        getAqiColor(envData.aqi)
      )}>
        <div className="flex gap-4 relative z-10">
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
            {envData.temp > 30 ? <ThermometerSun className="h-6 w-6" /> : <Wind className="h-6 w-6" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">Alerta de Saúde Ambiental</h3>
                <Badge variant="outline" className="text-[9px] bg-white/30 border-0">AQI {envData.aqi}</Badge>
              </div>
              <span className="text-xs font-black">{envData.temp}°C</span>
            </div>

            <p className="text-[11px] leading-snug mt-1.5 font-medium">
              {envData.recommendation}
            </p>

            <div className="mt-3 space-y-1.5">
              {envData.alerts.map((alert: any, idx: number) => (
                <div key={idx} className="flex items-start gap-1.5 text-[10px] opacity-85 bg-white/10 p-1.5 rounded-lg border border-white/5">
                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{alert.message}</span>
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
