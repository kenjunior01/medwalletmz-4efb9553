import { useMemo, useEffect, useState, useCallback } from "react";
import { MapPin, ChevronDown, Globe, Languages, Bell } from "@/components/icons/lucide-compat";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation as useAppLocation } from "@/contexts/LocationContext";
import { useCountry, getCountriesByRegion } from "@/contexts/CountryContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { cn } from "@/lib/utils";

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Bom dia", emoji: "\u2600\ufe0f" };
  if (hour >= 12 && hour < 18) return { text: "Boa tarde", emoji: "\ud83c\udf24\ufe0f" };
  return { text: "Boa noite", emoji: "\ud83c\udf19" };
}

export function Header() {
  const { city: selectedCity, setCity: setSelectedCity } = useAppLocation();
  const { country, allCountries, setCountryById, locale, setLocale, t } = useCountry();
  const greeting = useMemo(() => getGreeting(), []);
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  // Lightweight scroll detection — no framer-motion
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLocaleChange = useCallback((l: string) => {
    setLocale(l);
  }, [setLocale]);

  const cities = useMemo(() => {
    if (country?.config?.cities) return country.config.cities;
    if (country?.config?.provinces) return country.config.provinces;
    const defaults: Record<string, string[]> = {
      MZ: ["Maputo", "Beira", "Nampula", "Quelimane", "Tete", "Chimoio", "Pemba", "Inhambane"],
      AO: ["Luanda", "Benguela", "Huambo", "Lubango", "Cabinda"],
      BR: ["S\u00e3o Paulo", "Rio de Janeiro", "Bras\u00edlia", "Salvador", "Fortaleza"],
      PT: ["Lisboa", "Porto", "Braga", "Coimbra", "Set\u00fabal"],
      ZA: ["Johannesburg", "Cape Town", "Durban", "Pretoria"],
      IN: ["Mumbai", "Delhi", "Bangalore"],
    };
    return defaults[country?.id || "MZ"] || ["Maputo"];
  }, [country]);

  useEffect(() => {
    if (cities.length > 0 && !cities.includes(selectedCity)) {
      setSelectedCity(cities[0]);
    }
  }, [cities, selectedCity, setSelectedCity]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/50 safe-area-top",
        isScrolled
          ? "bg-background shadow-sm"
          : "bg-background"
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 max-w-7xl mx-auto">
        {/* Location selector */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-1.5 px-2 h-auto py-1.5 hover:bg-muted rounded-xl transition-colors min-w-0">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-[10px] text-muted-foreground font-medium leading-tight truncate">{t("header.deliver_at")}</span>
                  <span className="font-bold text-sm leading-tight truncate max-w-[120px]">{selectedCity}</span>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 rounded-xl p-1">
              {cities.map((city) => (
                <DropdownMenuItem key={city} onClick={() => setSelectedCity(city)} className={`rounded-lg py-2.5 px-3 cursor-pointer ${city === selectedCity ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  <MapPin className="h-4 w-4 mr-2" />{city}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center — greeting (desktop only) */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-2 pointer-events-none">
          <span className="text-xs text-muted-foreground font-semibold">
            {greeting.emoji} {t(`header.greetings.${greeting.text.toLowerCase().replace(" ", "_")}`)}
          </span>
        </div>

        {/* Mobile greeting pill */}
        <span className="md:hidden text-xs bg-primary/5 px-2.5 py-0.5 rounded-full text-muted-foreground">
          {greeting.emoji} {greeting.text.split(",")[0]}
        </span>

        {/* Right actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("header.select_language")} className="h-9 w-9 rounded-xl hover:bg-muted no-tap-target" data-size="icon">
                <Languages className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl p-1">
              {country && country.supported_locales.length > 1 && (
                <div className="pb-1 mb-1 border-b border-border/50">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground px-2 pt-1 tracking-wider">Idioma</p>
                  {country.supported_locales.map((l) => {
                    const labels: Record<string, string> = { pt: "Portugu\u00eas", en: "English", es: "Espa\u00f1ol", fr: "Fran\u00e7ais", af: "Afrikaans", sw: "Kiswahili", am: "\u12a0\u121b\u122d\u129b", hi: "\u0939\u093f\u0928\u094d\u0926\u0940", "pt-BR": "Portugu\u00eas (BR)", emk: "Emakhuwa", tsn: "Xichangana", seh: "Cisena", elo: "Elomwe", chw: "Echuwabo" };
                    return (
                      <DropdownMenuItem key={l} onClick={() => handleLocaleChange(l)} className={`rounded-lg py-2 px-3 cursor-pointer font-bold text-xs ${l === locale ? "bg-primary text-primary-foreground" : ""}`}>
                        {labels[l] || l}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              )}
              {allCountries.length > 1 && (() => {
                const regionGroups = getCountriesByRegion(allCountries);
                return regionGroups.map((group) => (
                  <div key={group.id}>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground px-2 pt-1 tracking-wider">{group.emoji} {group.label}</p>
                    {group.items.map((c) => (
                      <DropdownMenuItem key={c.id} onClick={() => setCountryById(c.id)} className={`rounded-lg py-2 px-3 cursor-pointer ${c.id === country?.id ? "bg-primary text-primary-foreground" : ""}`}>
                        {c.name}
                      </DropdownMenuItem>
                    ))}
                  </div>
                ));
              })()}
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle />
          <NotificationsPanel />
        </div>
      </div>
    </header>
  );
}
