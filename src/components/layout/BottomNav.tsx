import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { bottomNavByRole, sidebarByRole } from "@/config/navigation";
import { usePrimaryRole } from "@/hooks/usePrimaryRole";
import { Menu, X, ChevronRight, MapPin, PhoneCall, Globe, Sparkles } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCountry } from "@/contexts/CountryContext";
import { useLocation as useAppLocation } from "@/contexts/LocationContext";
import { Button } from "@/components/ui/button";

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = usePrimaryRole();
  const { country, t } = useCountry();
  const { city } = useAppLocation();
  const [open, setOpen] = useState(false);

  const navItems = bottomNavByRole[role] ?? bottomNavByRole.customer;
  const allItems = sidebarByRole[role] ?? sidebarByRole.customer;

  // Filter out items already in bottom nav to avoid duplicates in "More"
  const bottomPaths = new Set(navItems.map(i => i.path));
  const moreItems = allItems.filter(i => !bottomPaths.has(i.path));

  // Group moreItems by group
  const groups = moreItems.reduce((acc, item) => {
    const group = item.group || "Outros";
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, typeof moreItems>);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/70 border-t border-border/50 safe-area-bottom shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
      <div className="flex items-end justify-around py-2 px-1 relative">
        {navItems.slice(0, 4).map(({ path, icon: Icon, label, highlight }) => {
          const isActive = location.pathname === path || (path !== "/" && location.pathname.startsWith(path));
          const translatedLabel = t(label);
          if (highlight) {
            return (
              <NavLink
                key={path}
                to={path}
                aria-label={translatedLabel}
                className="flex flex-col items-center -mt-8 mx-1 mb-1"
              >
                <div className={cn(
                  "h-16 w-16 rounded-full flex items-center justify-center shadow-premium transition-all duration-300",
                  "bg-gradient-to-br from-primary via-primary/90 to-secondary text-primary-foreground",
                  isActive ? "scale-110 ring-4 ring-primary/20" : "hover:scale-105 active:scale-95"
                )}>
                  <Icon className="h-7 w-7" />
                </div>
                <span className="text-[10px] font-black mt-1.5 text-primary uppercase tracking-tighter">{translatedLabel}</span>
              </NavLink>
            );
          }
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1.5 rounded-2xl transition-all duration-300 flex-1",
                isActive
                  ? "text-primary translate-y-[-2px]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-xl transition-all duration-300",
                  isActive && "bg-primary/10 shadow-sm"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-300",
                    isActive && "scale-110"
                  )}
                />
              </div>
              <span className="text-[9px] font-black uppercase tracking-tight">{translatedLabel}</span>
            </NavLink>
          );
        })}

        {/* More Button */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1.5 rounded-2xl transition-all duration-300 flex-1",
                open ? "text-primary translate-y-[-2px]" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn("p-2 rounded-xl transition-all duration-300", open && "bg-primary/10 shadow-sm")}>
                <Menu className={cn("h-5 w-5 transition-transform duration-300", open && "scale-110")} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-tight">{t('common.more') || 'Mais'}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-[2.5rem] px-0 pb-10 max-h-[92vh] overflow-y-auto border-t-2 border-primary/20 shadow-2xl">
            <div className="px-6">
              <SheetHeader className="mb-6 flex flex-row items-center justify-between space-y-0">
                <SheetTitle className="text-2xl font-black flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  MedWallet Hub
                </SheetTitle>
              </SheetHeader>

              {/* User Context Quick Card */}
              <div className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 rounded-3xl p-4 mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-border">
                    {country?.id === 'MZ' ? '🇲🇿' : country?.id === 'BR' ? '🇧🇷' : <Globe className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">Localização Atual</p>
                    <p className="font-black text-sm">{city}, {country?.name}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="rounded-xl font-bold text-primary hover:bg-primary/10" onClick={() => { setOpen(false); navigate('/profile'); }}>
                  Alterar
                </Button>
              </div>

              <div className="space-y-8">
                {Object.entries(groups).map(([group, items]) => (
                  <div key={group} className="space-y-4">
                    <h3 className="text-[10px] uppercase font-black tracking-[0.3em] text-primary/40 px-2">
                      {group}
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5">
                      {items.map((item) => (
                        <button
                          key={item.path}
                          onClick={() => {
                            navigate(item.path);
                            setOpen(false);
                          }}
                          className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:border-primary/30 hover:bg-primary/[0.02] active:bg-primary/[0.05] transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-11 w-11 rounded-2xl bg-muted/50 border border-border flex items-center justify-center shadow-sm group-hover:text-primary group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
                              <item.icon className="h-5 w-5" />
                            </div>
                            <span className="font-black text-sm tracking-tight">{t(item.label)}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Emergency Block */}
                <div className="pt-4">
                   <button
                    onClick={() => { setOpen(false); navigate('/health/triage'); }}
                    className="w-full flex items-center gap-4 p-5 rounded-3xl bg-destructive/10 border-2 border-destructive/20 text-destructive group"
                   >
                    <div className="h-12 w-12 rounded-2xl bg-destructive text-white flex items-center justify-center shadow-lg shadow-destructive/30">
                      <PhoneCall className="h-6 w-6" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-black text-lg leading-none">Emergência</p>
                      <p className="text-xs font-bold opacity-80 mt-1">Triagem imediata com IA</p>
                    </div>
                    <ChevronRight className="h-5 w-5 opacity-50 group-hover:translate-x-1 transition-transform" />
                   </button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
