import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { sidebarByRole } from "@/config/navigation";
import { usePrimaryRole } from "@/hooks/usePrimaryRole";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useCountry } from "@/contexts/CountryContext";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope, Building2, FlaskConical, Truck, Store,
  Briefcase, ChevronDown, ChevronUp, LayoutDashboard,
  Plus
} from "lucide-react";
import { useState, useMemo } from "react";

/** Professional institution roles with their metadata */
const INSTITUTION_ROLES = [
  { role: "doctor" as const, icon: Stethoscope, color: "text-blue-500", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/20", dashboard: "/doctor/dashboard", label: "Médico" },
  { role: "clinic" as const, icon: Building2, color: "text-gold", bgColor: "bg-gold/10", borderColor: "border-gold/20", dashboard: "/clinic/dashboard", label: "Clínica" },
  { role: "store_owner" as const, icon: Store, color: "text-green-500", bgColor: "bg-green-500/10", borderColor: "border-green-500/20", dashboard: "/store/dashboard", label: "Farmácia" },
  { role: "lab" as const, icon: FlaskConical, color: "text-cyan-500", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/20", dashboard: "/lab/dashboard", label: "Lab" },
  { role: "driver" as const, icon: Truck, color: "text-orange-500", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/20", dashboard: "/driver/dashboard", label: "Condutor" },
] as const;

/** Sidebar for tablet (icons only) and desktop (icons + labels grouped). */
export function AppSidebar() {
  const { pathname } = useLocation();
  const { role } = usePrimaryRole();
  const device = useDeviceType();
  const { t } = useCountry();
  const { hasRole, user } = useAuth();
  const items = sidebarByRole[role] ?? sidebarByRole.customer;
  const compact = device === "tablet";
  const [institutionsOpen, setInstitutionsOpen] = useState(true);

  // Group by section (desktop only)
  const groups: Record<string, typeof items> = {};
  for (const it of items) {
    const g = it.group ?? "Menu";
    (groups[g] ||= []).push(it);
  }

  // Compute user's active institution roles
  const activeInstitutions = useMemo(() => {
    if (!user) return [];
    return INSTITUTION_ROLES.filter(ir => hasRole(ir.role));
  }, [user, hasRole]);

  return (
    <aside
      className={cn(
        "hidden md:flex sticky top-0 self-start h-screen border-r border-border bg-background/95 backdrop-blur flex-col overflow-y-auto relative",
        compact ? "w-16" : "w-60"
      )}
    >
      {/* Gradient accent bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
      <div className={cn("px-3 py-4 border-b border-border", compact && "px-2")}>
        <NavLink to="/" className="flex items-center gap-2">
          <img src="/icon-512.png" alt="MedWallet" className="h-8 w-8 rounded-lg" />
          {!compact && <span className="font-black text-base">MedWallet</span>}
        </NavLink>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* MY INSTITUTIONS — Command Center Section       */}
      {/* ═══════════════════════════════════════════════ */}
      {activeInstitutions.length > 0 && (
        <div className={cn("border-b border-border px-2 py-2", compact && "px-1 py-2")}>
          {/* Section Header — Collapsible on desktop */}
          {!compact ? (
            <button
              onClick={() => setInstitutionsOpen(!institutionsOpen)}
              className="flex items-center gap-1.5 w-full px-2 mb-1.5 group"
            >
              <Briefcase className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex-1 text-left">
                {t('sidebar.my_institutions') || 'Instituições'}
              </span>
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 min-w-[16px] justify-center">
                {activeInstitutions.length}
              </Badge>
              {institutionsOpen ? (
                <ChevronUp className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
            </button>
          ) : (
            <div className="w-full flex justify-center mb-1.5">
              <Briefcase className="h-3.5 w-3.5 text-primary" />
            </div>
          )}

          {/* Role Badges */}
          {(institutionsOpen || compact) && (
            compact ? (
              /* Tablet: Horizontal scrollable icon row */
              <div className="flex gap-1 overflow-x-auto px-1 py-0.5 scrollbar-none">
                {activeInstitutions.map((inst) => {
                  const Icon = inst.icon;
                  const isActive = pathname === inst.dashboard || pathname.startsWith(inst.dashboard);
                  return (
                    <NavLink
                      key={inst.role}
                      to={inst.dashboard}
                      title={inst.label}
                      className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border transition-all",
                        isActive
                          ? `${inst.bgColor} ${inst.borderColor} ring-1 ring-primary/30`
                          : "border-border hover:border-primary/30 hover:bg-muted/50"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", isActive ? inst.color : "text-muted-foreground")} />
                    </NavLink>
                  );
                })}
              </div>
            ) : (
              /* Desktop: Role badge cards */
              <div className="space-y-0.5">
                {activeInstitutions.map((inst) => {
                  const Icon = inst.icon;
                  const isActive = pathname === inst.dashboard || pathname.startsWith(inst.dashboard);
                  return (
                    <NavLink
                      key={inst.role}
                      to={inst.dashboard}
                      className={cn(
                        "flex items-center gap-2.5 mx-1 px-2 py-1.5 rounded-lg text-sm transition-all group",
                        isActive
                          ? `${inst.bgColor} font-semibold border-l-2`
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-2 border-transparent"
                      )}
                      style={isActive ? { borderLeftColor: 'var(--primary)' } : undefined}
                    >
                      <div className={cn(
                        "h-7 w-7 rounded-md flex items-center justify-center shrink-0 border transition-all",
                        inst.bgColor, inst.borderColor,
                        "group-hover:scale-110"
                      )}>
                        <Icon className={cn("h-3.5 w-3.5", isActive ? inst.color : "text-muted-foreground")} />
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn("truncate text-xs font-semibold", isActive && inst.color)}>{inst.label}</span>
                        <Badge
                          variant="outline"
                          className="text-[8px] h-3.5 px-1 rounded-full border bg-emerald-500/10 text-emerald-600 border-emerald-500/30 shrink-0"
                        >
                          ●
                        </Badge>
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

      <nav className="flex-1 py-3">
        {Object.entries(groups).map(([group, its]) => (
          <div key={group} className="mb-3">
            {!compact && (
              <p className="px-4 mb-1 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                {group}
              </p>
            )}
            <ul className="flex flex-col">
              {its.map(({ path, icon: Icon, label }) => {
                const active =
                  pathname === path ||
                  (path !== "/" && pathname.startsWith(path));
                const translatedLabel = t(label);
                return (
                  <li key={path}>
                    <NavLink
                      to={path}
                      title={compact ? translatedLabel : undefined}
                      className={cn(
                        "flex items-center gap-3 mx-2 px-2 py-2 rounded-lg text-sm transition-all",
                        active
                          ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        compact && "justify-center"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!compact && <span className="truncate">{translatedLabel}</span>}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
