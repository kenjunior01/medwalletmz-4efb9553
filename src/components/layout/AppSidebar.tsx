import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { sidebarByRole } from "@/config/navigation";
import { usePrimaryRole } from "@/hooks/usePrimaryRole";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useCountry } from "@/contexts/CountryContext";

/** Sidebar for tablet (icons only) and desktop (icons + labels grouped). */
export function AppSidebar() {
  const { pathname } = useLocation();
  const { role } = usePrimaryRole();
  const device = useDeviceType();
  const { t } = useCountry();
  const items = sidebarByRole[role] ?? sidebarByRole.customer;
  const compact = device === "tablet";

  // Group by section (desktop only)
  const groups: Record<string, typeof items> = {};
  for (const it of items) {
    const g = it.group ?? "Menu";
    (groups[g] ||= []).push(it);
  }

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