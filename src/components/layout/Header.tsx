import { useMemo, useEffect } from "react";
import { MapPin, ChevronDown, Globe, Languages } from "@/components/icons/lucide-compat";
import { MedWalletLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation as useAppLocation } from "@/contexts/LocationContext";
import { useCountry, getCountriesByRegion } from "@/contexts/CountryContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";

function getGreeting(): { text: string; emoji: string; gradient: string; css: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12)
    return { text: "Bom dia", emoji: "☀️", gradient: "from-amber-400 to-orange-500", css: "linear-gradient(90deg,#fbbf24,#f97316)" };
  if (hour >= 12 && hour < 18)
    return { text: "Boa tarde", emoji: "🌤️", gradient: "from-orange-400 to-rose-500", css: "linear-gradient(90deg,#fb923c,#f43f5e)" };
  return { text: "Boa noite", emoji: "🌙", gradient: "from-indigo-500 to-purple-600", css: "linear-gradient(90deg,#6366f1,#9333ea)" };
}

export function Header() {
  const { city: selectedCity, setCity: setSelectedCity } = useAppLocation();
  const { country, allCountries, setCountryById, locale, setLocale, t } = useCountry();
  const greeting = useMemo(() => getGreeting(), []);
  const { user } = useAuth();
  const navigate = useNavigate();

  const cities = useMemo(() => {
    if (country?.config?.cities) return country.config.cities;
    if (country?.config?.provinces) return country.config.provinces;
    const defaults: Record<string, string[]> = {
      MZ: ["Maputo", "Beira", "Nampula", "Quelimane", "Tete", "Chimoio", "Pemba", "Inhambane"],
      AO: ["Luanda", "Benguela", "Huambo", "Lubango", "Cabinda"],
      BR: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza"],
      PT: ["Lisboa", "Porto", "Braga", "Coimbra", "Setúbal"],
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
    <motion.header
      className="sticky top-0 z-40 glass-header border-b border-border/50 safe-area-top relative overflow-hidden"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 max-w-7xl mx-auto">
        {/* LEFT: Location */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-1.5 px-2 h-auto py-1.5 hover:bg-primary/10 rounded-xl transition-all min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-[10px] text-muted-foreground font-medium leading-tight truncate">{t("header.deliver_at")}</span>
                  <span className="font-bold text-sm leading-tight truncate max-w-[120px]">{selectedCity}</span>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 glass rounded-xl p-1">
              {cities.map((city) => (
                <DropdownMenuItem
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`rounded-lg py-2.5 px-3 cursor-pointer transition-all ${city === selectedCity ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {city}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* CENTER: Logo + greeting (desktop) */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 flex-col items-center pointer-events-none">
          <span
            className="text-[10px] font-semibold flex items-center gap-1 leading-none"
            style={{
              background: greeting.css,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {greeting.emoji} {t(`header.greetings.${greeting.text.toLowerCase().replace(" ", "_")}`)}
          </span>
          <MedWalletLogo size={120} variant="compact" animated showText={false} className="h-8" />
        </div>

        {/* Mobile greeting pill */}
        <span className="md:hidden text-xs bg-primary/10 px-2 py-0.5 rounded-full">
          {greeting.emoji} {greeting.text.split(",")[0]}
        </span>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("header.select_language")} className="h-9 w-9 rounded-xl hover:bg-primary/10 no-tap-target" data-size="icon">
                <Languages className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 glass rounded-xl p-1">
              {country && country.supported_locales.length > 1 && (
                <div className="pb-1 mb-1 border-b border-border/50">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground px-2 pt-1 tracking-wider">Idioma</p>
                  {country.supported_locales.map((l) => {
                    const labels: Record<string, string> = { pt: "Português", en: "English", es: "Español", fr: "Français", af: "Afrikaans", hi: "हिन्दी", "pt-BR": "Português (BR)" };
                    return (
                      <DropdownMenuItem
                        key={l}
                        onClick={() => setLocale(l)}
                        className={`rounded-lg py-2 px-3 cursor-pointer font-bold text-xs ${l === locale ? "bg-primary text-primary-foreground" : ""}`}
                      >
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
                    <p className="text-[10px] font-bold uppercase text-muted-foreground px-2 pt-1 tracking-wider">
                      {group.emoji} {group.label}
                    </p>
                    {group.items.map((c) => (
                      <DropdownMenuItem
                        key={c.id}
                        onClick={() => setCountryById(c.id)}
                        className={`rounded-lg py-2 px-3 cursor-pointer ${c.id === country?.id ? "bg-primary text-primary-foreground" : ""}`}
                      >
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

      {/* Animated gradient accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{
          background: "linear-gradient(90deg, transparent 0%, #2dd4bf 30%, #6366f1 70%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "header-gradient-shift 3s ease infinite",
        }}
      />
      <style>{`@keyframes header-gradient-shift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>
    </motion.header>
  );
}
