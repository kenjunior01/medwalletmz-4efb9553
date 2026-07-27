import { useState, useMemo } from "react";
import {
  Globe, MapPin, Users, Building2, TrendingUp, CreditCard,
  ChevronDown, ChevronUp, Layers,
} from "@/components/icons/lucide-compat";
import { Badge } from "@/components/ui/badge";
import { REGIONS, getCountriesByRegion, useCountry } from "@/contexts/CountryContext";
import type { Country } from "@/contexts/CountryContext";

function getCitiesCount(country: Country): number {
  const cities = country.config?.cities;
  if (Array.isArray(cities)) return cities.length;
  return 0;
}

function getPaymentMethodsCount(country: Country): number {
  const methods = country.config?.payment_methods;
  return Array.isArray(methods) ? methods.length : 0;
}

function isoToFlag(iso: string): string {
  const codePoints = iso.toUpperCase().split("").map((char) => 0x1f1e6 + char.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

export default function RegionalMetrics() {
  const { allCountries } = useCountry();
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  const regionData = useMemo(() => getCountriesByRegion(allCountries), [allCountries]);
  const selectedRegion = regionData.find((r) => r.id === selectedRegionId) ?? null;
  const totalCountries = allCountries.length;
  const totalCities = allCountries.reduce((sum, c) => sum + getCitiesCount(c), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
          <Globe className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            <span className="text-gradient-premium">Painel Regional</span>
          </h1>
          <p className="text-sm text-muted-foreground">Métricas por região e país</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard icon={<Layers className="h-5 w-5" />} label="Regiões" value={regionData.length} color="text-blue-500" bg="bg-blue-500/10" />
        <SummaryCard icon={<MapPin className="h-5 w-5" />} label="Países" value={totalCountries} color="text-emerald-500" bg="bg-emerald-500/10" />
        <SummaryCard icon={<Building2 className="h-5 w-5" />} label="Cidades" value={totalCities} color="text-amber-500" bg="bg-amber-500/10" />
        <SummaryCard icon={<CreditCard className="h-5 w-5" />} label="Moedas" value={new Set(allCountries.map((c) => c.currency_code)).size} color="text-purple-500" bg="bg-purple-500/10" />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold">Regiões</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {regionData.map((region) => (
            <button
              key={region.id}
              onClick={() => setSelectedRegionId((prev) => prev === region.id ? null : region.id)}
              className={`bento-card group flex flex-col items-start gap-2 p-4 text-left transition-all hover:scale-[1.02] ${
                selectedRegionId === region.id ? "ring-2 ring-primary shadow-lg" : ""
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-2xl">{region.emoji}</span>
                {selectedRegionId === region.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
              <span className="font-bold leading-tight">{region.label}</span>
              <Badge variant="secondary" className="text-xs">
                {region.items.length} {region.items.length === 1 ? "país" : "países"}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {selectedRegion && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{selectedRegion.emoji}</span>
            <div>
              <h2 className="text-xl font-black">{selectedRegion.label}</h2>
              <p className="text-sm text-muted-foreground">
                {selectedRegion.items.length} {selectedRegion.items.length === 1 ? "país registado" : "países registados"} · {selectedRegion.items.reduce((sum, c) => sum + getCitiesCount(c), 0)} cidades
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {selectedRegion.items.map((country) => (
              <CountryCard key={country.id} country={country} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: number; color: string; bg: string }) {
  return (
    <div className="bento-card flex items-center gap-3 p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}><span className={color}>{icon}</span></div>
      <div className="min-w-0">
        <p className="text-2xl font-black leading-none">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function CountryCard({ country }: { country: Country }) {
  const cities = getCitiesCount(country);
  const paymentMethods = getPaymentMethodsCount(country);
  return (
    <div className="bento-card flex flex-col gap-3 p-5">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{isoToFlag(country.id)}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold leading-tight">{country.name}</h3>
          <p className="text-xs text-muted-foreground">{country.id}</p>
        </div>
        <Badge variant="outline" className="shrink-0 font-mono text-xs">{country.currency_code}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StatItem icon={<Building2 className="h-3.5 w-3.5" />} label="Cidades" value={cities} />
        <StatItem icon={<CreditCard className="h-3.5 w-3.5" />} label="Pagamentos" value={paymentMethods} />
        <StatItem icon={<Users className="h-3.5 w-3.5" />} label="Locais" value={country.supported_locales?.length ?? 0} />
      </div>
      <div className="flex items-center justify-between border-t border-border/50 pt-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>{country.currency_symbol} ({country.currency_code})</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate max-w-[120px]">{country.timezone}</span>
        </div>
      </div>
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl bg-muted/50 px-2 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-lg font-black leading-none">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
