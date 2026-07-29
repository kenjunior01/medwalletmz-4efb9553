import { useMemo, useEffect, useState, useCallback } from "react";
import { MapPin, ChevronDown, Globe, Languages } from "@/components/icons/lucide-compat";
import { MedWalletLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation as useAppLocation } from "@/contexts/LocationContext";
import { useCountry, getCountriesByRegion } from "@/contexts/CountryContext";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { cn } from "@/lib/utils";

function getGreeting(): { text: string; emoji: string; gradient: string; css: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12)
    return { text: "Bom dia", emoji: "\u2600\ufe0f", gradient: "from-amber-400 to-orange-500", css: "linear-gradient(90deg,#fbbf24,#f97316)" };
  if (hour >= 12 && hour < 18)
    return { text: "Boa tarde", emoji: "\ud83c\udf24\ufe0f", gradient: "from-orange-400 to-rose-500", css: "linear-gradient(90deg,#fb923c,#f43f5e)" };
  return { text: "Boa noite", emoji: "\ud83c\udf19", gradient: "from-indigo-500 to-purple-600", css: "linear-gradient(90deg,#6366f1,#9333ea)" };
}

export function Header() {
  const { city: selectedCity, setCity: setSelectedCity } = useAppLocation();
  const { country, allCountries, setCountryById, locale, setLocale, t } = useCountry();
  const greeting = useMemo(() => getGreeting(), []);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [localeKey, setLocaleKey] = useState(0);

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 20);
  });

  const handleLocaleChange = useCallback((l: string) => {
    setLocale(l);
    setLocaleKey((k) => k + 1);
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
    <motion.header
      className={cn(
        "sticky top-0 z-40 glass-header mw-glass border-b border-border/50 safe-area-top relative overflow-hidden transition-all duration-300",
        isScrolled && "border-border/80"
      )}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="mw-header-mesh" />
      <motion.div
        className="absolute inset-0 bg-background/0 pointer-events-none"
        animate={{ backgroundColor: isScrolled ? "hsl(var(--background) / 0.85)" : "hsl(var(--background) / 0)" }}
        transition={{ duration: 0.3 }}
      />
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 max-w-7xl mx-auto relative z-10">
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
            <DropdownMenuContent align="start" className="w-52 mw-glass rounded-xl p-1">
              {cities.map((city) => (
                <DropdownMenuItem key={city} onClick={() => setSelectedCity(city)} className={`rounded-lg py-2.5 px-3 cursor-pointer transition-all ${city === selectedCity ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  <MapPin className="h-4 w-4 mr-2" />{city}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 flex-col items-center pointer-events-none">
          <span className="text-[10px] font-semibold flex items-center gap-1 leading-none" style={{ background: greeting.css, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {greeting.emoji} {t(`header.greetings.${greeting.text.toLowerCase().replace(" ", "_")}`)}
          </span>
          <div className="mw-logo-breathe">
            <MedWalletLogo size={120} variant="compact" animated showText={false} className="h-8" />
          </div>
        </div>
        <span className="md:hidden text-xs bg-primary/10 px-2 py-0.5 rounded-full">
          {greeting.emoji} {greeting.text.split(",")[0]}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("header.select_language")} className="h-9 w-9 rounded-xl hover:bg-primary/10 no-tap-target" data-size="icon">
                <AnimatePresence mode="wait">
                  <motion.div key={localeKey} initial={{ rotateY: -90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: 90, opacity: 0 }} transition={{ duration: 0.3 }}>
                    <Languages className="h-4 w-4 text-muted-foreground" />
                  </motion.div>
                </AnimatePresence>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 mw-glass rounded-xl p-1">
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
      <div className="absolute bottom-0 left-0 right-0 h-[2px] mw-shimmer-line" style={{ boxShadow: isScrolled ? '0 0 8px var(--region-logo-primary, #0D9488), 0 0 16px var(--region-logo-secondary, #6366F1)' : 'none', transition: 'box-shadow 0.3s ease' }} />
    </motion.header>
  );
}
