import { useMemo, useEffect } from "react";
import { MapPin, ChevronDown, Sparkles, Globe, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation as useAppLocation } from "@/contexts/LocationContext";
import { useCountry } from "@/contexts/CountryContext";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";

const cities = [
  "Maputo",
  "Beira",
  "Nampula",
  "Quelimane",
  "Tete",
  "Chimoio",
  "Pemba",
  "Inhambane",
];

function getGreeting(): { text: string; emoji: string; gradient: string } {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return { 
      text: "Bom dia", 
      emoji: "☀️",
      gradient: "from-amber-400 to-orange-500"
    };
  } else if (hour >= 12 && hour < 18) {
    return { 
      text: "Boa tarde", 
      emoji: "🌤️",
      gradient: "from-orange-400 to-rose-500"
    };
  } else {
    return { 
      text: "Boa noite", 
      emoji: "🌙",
      gradient: "from-indigo-500 to-purple-600"
    };
  }
}

export function Header() {
  const { city: selectedCity, setCity: setSelectedCity } = useAppLocation();
  const { country, allCountries, setCountryById, locale, setLocale, t } = useCountry();
  const greeting = useMemo(() => getGreeting(), []);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Dynamic cities based on country config
  const cities = useMemo(() => {
    if (country?.config?.cities) return country.config.cities;
    if (country?.config?.provinces) return country.config.provinces;

    // These fallbacks are now handled in CountryContext STATIC_COUNTRIES,
    // but we keep this as a secondary safety layer.
    const defaults: Record<string, string[]> = {
      'MZ': ["Maputo", "Beira", "Nampula", "Quelimane", "Tete", "Chimoio", "Pemba", "Inhambane"],
      'AO': ["Luanda", "Benguela", "Huambo", "Lubango", "Cabinda"],
      'BR': ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza"],
      'PT': ["Lisboa", "Porto", "Braga", "Coimbra", "Setúbal"],
      'ZA': ["Johannesburg", "Cape Town", "Durban", "Pretoria"],
      'IN': ["Mumbai", "Delhi", "Bangalore"]
    };

    return defaults[country?.id || 'MZ'] || ["Maputo"];
  }, [country]);

  // Ensure selectedCity is valid for the new country
  useEffect(() => {
    if (cities.length > 0 && !cities.includes(selectedCity)) {
      setSelectedCity(cities[0]);
    }
  }, [cities, selectedCity, setSelectedCity]);

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50 safe-area-top">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Country Selector */}
          {allCountries.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('header.select_country')} className="h-10 w-10 rounded-xl hover:bg-primary/10">
                  {country?.flag_url ? <img src={country.flag_url} alt={country.name} className="w-5 h-5" /> : (country?.id === 'MZ' ? '🇲🇿' : <Globe className="h-4 w-4" />)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 glass rounded-xl p-1">
                {allCountries.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => setCountryById(c.id)}
                    className={`rounded-lg py-2 px-3 cursor-pointer ${
                      c.id === country?.id ? "bg-primary text-primary-foreground" : ""
                    }`}
                  >
                    <span className="mr-2">{c.id === 'MZ' ? '🇲🇿' : '🌐'}</span>
                    {c.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Location Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-1.5 px-2 h-auto py-1.5 hover:bg-primary/10 rounded-xl transition-all">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] text-muted-foreground font-medium">{t('header.deliver_at')}</span>
                  <span className="font-bold text-sm">{selectedCity}</span>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 glass rounded-xl p-1">
              {cities.map((city) => (
                <DropdownMenuItem
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`rounded-lg py-2.5 px-3 cursor-pointer transition-all ${
                    city === selectedCity
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {city}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Logo with Greeting - hidden on very narrow screens to avoid overlap */}
        <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 flex-col items-center pointer-events-none">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {greeting.emoji} {t(`header.greetings.${greeting.text.toLowerCase().replace(' ', '_')}`)}
          </span>
          <div className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-secondary" />
            <span className="font-extrabold text-lg text-gradient-premium">
              MedWallet
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Language Selector */}
          {country && country.supported_locales.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('header.select_language')} className="h-10 w-10 rounded-xl hover:bg-primary/10">
                  <Languages className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 glass rounded-xl p-1">
                {country.supported_locales.map((l) => (
                  <DropdownMenuItem
                    key={l}
                    onClick={() => setLocale(l)}
                    className={`rounded-lg py-2 px-3 cursor-pointer uppercase font-bold text-xs ${
                      l === locale ? "bg-primary text-primary-foreground" : ""
                    }`}
                  >
                    {l}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <ThemeToggle />
          <NotificationsPanel />
        </div>
      </div>
    </header>
  );
}
