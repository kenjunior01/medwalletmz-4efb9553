import { useMemo, useEffect, useState } from "react";
import { MapPin, ChevronDown, Bell, Sparkles, Globe, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
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
  const { country, allCountries, setCountryById, locale, setLocale } = useCountry();
  const greeting = useMemo(() => getGreeting(), []);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    let cancelled = false;
    const load = async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const rxQ: any = (supabase as any).from('prescriptions').select('id', { count: 'exact', head: true }).eq('patient_id', user.id).gte('created_at', since);
      const orQ: any = (supabase as any).from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', user.id).in('status', ['out_for_delivery', 'ready', 'in_transit']);
      const [rxR, orR] = await Promise.all([rxQ, orQ]);
      const rxC = rxR?.count || 0; const orC = orR?.count || 0;
      if (!cancelled) setUnread((rxC || 0) + (orC || 0));
    };
    load();
    const ch = supabase.channel(`hdr-notif-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions', filter: `patient_id=eq.${user.id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user]);

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50 safe-area-top">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Country Selector */}
          {allCountries.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Selecionar país" className="h-10 w-10 rounded-xl hover:bg-primary/10">
                  {country?.id === 'MZ' ? '🇲🇿' : <Globe className="h-4 w-4" />}
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
                  <span className="text-[10px] text-muted-foreground font-medium">Entregar em</span>
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

        {/* Logo with Greeting */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {greeting.emoji} {greeting.text}
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
                <Button variant="ghost" size="icon" aria-label="Selecionar idioma" className="h-10 w-10 rounded-xl hover:bg-primary/10">
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/orders')} aria-label="Notificações" className="relative hover:bg-primary/10 rounded-xl transition-all h-10 w-10">
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-accent text-accent-foreground text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-background shadow-md">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
