import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { bottomNavByRole, sidebarByRole } from "@/config/navigation";
import { usePrimaryRole } from "@/hooks/usePrimaryRole";
import { Menu, X, ChevronRight, MapPin, PhoneCall, Globe, Sparkles, Stethoscope, Building2, FlaskConical, Truck, Store, ArrowRight, Briefcase, ChevronDown, ChevronUp, LayoutDashboard, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useCountry } from "@/contexts/CountryContext";
import { useLocation as useAppLocation } from "@/contexts/LocationContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { BentoGrid, BentoCard } from "@/components/ui/design-system";

/** Professional institution roles with their metadata */
const INSTITUTION_ROLES = [
  { role: "doctor" as const, icon: Stethoscope, color: "text-blue-500", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/20", gradient: "from-blue-500/5 to-blue-500/10", dashboard: "/doctor/dashboard", register: "/doctor/register" },
  { role: "clinic" as const, icon: Building2, color: "text-gold", bgColor: "bg-gold/10", borderColor: "border-gold/20", gradient: "from-gold/5 to-gold/10", dashboard: "/clinic/dashboard", register: "/clinic/register" },
  { role: "store_owner" as const, icon: Store, color: "text-green-500", bgColor: "bg-green-500/10", borderColor: "border-green-500/20", gradient: "from-green-500/5 to-green-500/10", dashboard: "/store/dashboard", register: "/store/register" },
  { role: "lab" as const, icon: FlaskConical, color: "text-cyan-500", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/20", gradient: "from-cyan-500/5 to-cyan-500/10", dashboard: "/lab/dashboard", register: "/lab/register" },
  { role: "driver" as const, icon: Truck, color: "text-orange-500", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/20", gradient: "from-orange-500/5 to-orange-500/10", dashboard: "/driver/dashboard", register: "/driver/register" },
] as const;

const ROLE_LABELS: Record<string, string> = {
  doctor: "Médico",
  clinic: "Clínica",
  hospital: "Hospital",
  store_owner: "Farmácia/Loja",
  lab: "Laboratório",
  driver: "Condutor",
  veterinary: "Veterinário",
};

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = usePrimaryRole();
  const { country, t } = useCountry();
  const { city } = useAppLocation();
  const { hasRole, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [institutionsOpen, setInstitutionsOpen] = useState(true);

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

  // Compute user's active institution roles
  const activeInstitutionRoles = useMemo(() => {
    if (!user) return [];
    return INSTITUTION_ROLES.filter(ir => hasRole(ir.role));
  }, [user, hasRole]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/70 border-t border-border/50 safe-area-bottom shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
      <div className="flex items-end justify-around py-1.5 px-1 relative max-w-md mx-auto">
        {navItems.slice(0, 4).map(({ path, icon: Icon, label, highlight }) => {
          const isActive = location.pathname === path || (path !== "/" && location.pathname.startsWith(path));
          const translatedLabel = t(label);
          if (highlight) {
            return (
              <NavLink
                key={path}
                to={path}
                aria-label={translatedLabel}
                className="flex flex-col items-center -mt-6 mx-1 mb-0.5 no-tap-target"
              >
                <div className={cn(
                  "h-14 w-14 rounded-full flex items-center justify-center shadow-premium transition-all duration-300 ring-4 ring-background",
                  "bg-gradient-to-br from-primary via-primary/90 to-secondary text-primary-foreground",
                  isActive ? "scale-110 ring-primary/20" : "hover:scale-105 active:scale-95"
                )}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-[9px] font-black mt-1 text-primary uppercase tracking-tighter">{translatedLabel}</span>
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
                  {t('bottomnav.hub_title') || 'MedWallet Hub'}
                </SheetTitle>
              </SheetHeader>

              {/* User Context Quick Card */}
              <div className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 rounded-3xl p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-border">
                    {country?.id === 'MZ' ? '🇲🇿' : country?.id === 'BR' ? '🇧🇷' : <Globe className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">{t('bottomnav.current_location') || 'Localização Atual'}</p>
                    <p className="font-black text-sm">{city}, {country?.name}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="rounded-xl font-bold text-primary hover:bg-primary/10" onClick={() => { setOpen(false); navigate('/profile'); }}>
                  {t('bottomnav.change') || 'Alterar'}
                </Button>
              </div>

              {/* ═══════════════════════════════════════════════ */}
              {/* MY INSTITUTIONS — Bento Grid Hub Section       */}
              {/* ═══════════════════════════════════════════════ */}
              <div className="mb-8">
                <button
                  onClick={() => setInstitutionsOpen(!institutionsOpen)}
                  className="flex items-center gap-2 w-full mb-4 px-2"
                >
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <Briefcase className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <h3 className="text-[10px] uppercase font-black tracking-[0.3em] text-primary flex-1 text-left">
                    {t('bottomnav.my_institutions') || 'As Minhas Instituições'}
                  </h3>
                  {institutionsOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {institutionsOpen && (
                  <>
                    {/* Active Institution Cards — Bento Grid */}
                    {activeInstitutionRoles.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2.5 mb-3">
                        {activeInstitutionRoles.map((inst) => {
                          const Icon = inst.icon;
                          return (
                            <button
                              key={inst.role}
                              onClick={() => {
                                navigate(inst.dashboard);
                                setOpen(false);
                              }}
                              className={cn(
                                "relative overflow-hidden rounded-2xl border p-4 text-left transition-all group active:scale-[0.98]",
                                "bg-gradient-to-br " + inst.gradient + " " + inst.borderColor,
                                "hover:shadow-md hover:border-primary/30"
                              )}
                            >
                              {/* Glow accent */}
                              <div className={cn(
                                "absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-20 blur-xl",
                                inst.bgColor
                              )} />
                              
                              <div className="relative">
                                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-3 border", inst.bgColor, inst.borderColor)}>
                                  <Icon className={cn("h-5 w-5", inst.color)} />
                                </div>
                                <p className="font-black text-sm leading-tight">
                                  {ROLE_LABELS[inst.role] || inst.role}
                                </p>
                                <div className="flex items-center gap-1.5 mt-2">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[9px] px-1.5 py-0 h-4 rounded-full border",
                                      "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                    )}
                                  >
                                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                    {t('bottomnav.active') || 'Activo'}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1 mt-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-[10px] font-bold">{t('bottomnav.open_dashboard') || 'Painel'}</span>
                                  <ChevronRight className="h-3 w-3" />
                                </div>
                              </div>
                            </button>
                          );
                        })}

                        {/* If not all roles are active, show join card */}
                        {activeInstitutionRoles.length < INSTITUTION_ROLES.length && (
                          <button
                            onClick={() => {
                              setOpen(false);
                              navigate('/profile');
                            }}
                            className="relative overflow-hidden rounded-2xl border border-dashed border-primary/20 p-4 text-left transition-all group active:scale-[0.98] hover:border-primary/40"
                          >
                            <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-primary/5 blur-lg" />
                            <div className="relative">
                              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-3">
                                <Plus className="h-5 w-5 text-primary" />
                              </div>
                              <p className="font-black text-sm leading-tight text-primary">
                                {t('bottomnav.add_institution') || 'Adicionar'}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                                {t('bottomnav.add_institution_desc') || 'Mais papéis profissionais'}
                              </p>
                            </div>
                          </button>
                        )}
                      </div>
                    ) : (
                      /* No institution roles — Join as Professional card */
                      <button
                        onClick={() => {
                          setOpen(false);
                          navigate('/profile');
                        }}
                        className="w-full relative overflow-hidden rounded-2xl p-5 text-left transition-all group active:scale-[0.99]"
                      >
                        {/* Gradient background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 rounded-2xl" />
                        <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-primary/10 blur-xl" />
                        <div className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-secondary/10 blur-xl" />
                        
                        <div className="relative flex items-center gap-4">
                          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                            <Stethoscope className="h-7 w-7 text-primary-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-base leading-tight">
                              {t('bottomnav.join_professional') || 'Entrar como Profissional'}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                              {t('bottomnav.join_professional_desc') || 'Registe a sua clínica, farmácia, laboratório ou comece como médico ou condutor'}
                            </p>
                            <div className="flex items-center gap-1 mt-2.5 text-primary">
                              <span className="text-[11px] font-bold">{t('bottomnav.explore_roles') || 'Explorar papéis'}</span>
                              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </div>
                      </button>
                    )}
                  </>
                )}
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
                      <p className="font-black text-lg leading-none">{t('bottomnav.emergency') || 'Emergência'}</p>
                      <p className="text-xs font-bold opacity-80 mt-1">{t('bottomnav.emergency_desc') || 'Triagem imediata com IA'}</p>
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
