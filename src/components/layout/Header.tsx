import { useState } from "react";
import { MapPin, ChevronDown, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function Header() {
  const [selectedCity, setSelectedCity] = useState("Maputo");

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border safe-area-top">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Location Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-1 px-2 h-auto py-1">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">{selectedCity}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {cities.map((city) => (
              <DropdownMenuItem
                key={city}
                onClick={() => setSelectedCity(city)}
                className={city === selectedCity ? "bg-primary/10 text-primary" : ""}
              >
                <MapPin className="h-4 w-4 mr-2" />
                {city}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Logo */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <span className="font-bold text-lg bg-gradient-to-r from-primary to-food bg-clip-text text-transparent">
            MoçambiApp
          </span>
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-accent text-accent-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            3
          </span>
        </Button>
      </div>
    </header>
  );
}
