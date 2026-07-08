import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { bottomNavByRole } from "@/config/navigation";
import { usePrimaryRole } from "@/hooks/usePrimaryRole";

export function BottomNav() {
  const location = useLocation();
  const { role } = usePrimaryRole();
  const navItems = bottomNavByRole[role] ?? bottomNavByRole.customer;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border safe-area-bottom">
      <div className="flex items-end justify-around py-2 px-2 relative">
        {navItems.map(({ path, icon: Icon, label, highlight }) => {
          const isActive = location.pathname === path || (path !== "/" && location.pathname.startsWith(path));
          if (highlight) {
            return (
              <NavLink
                key={path}
                to={path}
                aria-label={label}
                className="flex flex-col items-center -mt-6 mx-1"
              >
                <div className={cn(
                  "h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-transform",
                  "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground",
                  isActive ? "scale-110 ring-4 ring-primary/20" : "hover:scale-105"
                )}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-semibold mt-1 text-primary">{label}</span>
              </NavLink>
            );
          }
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200 flex-1",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "p-1.5 rounded-xl transition-all duration-200",
                  isActive && "bg-primary/10"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive && "scale-110"
                  )}
                />
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
