/**
 * DashboardShell — shell responsivo para dashboards de admin/manager/store.
 * ---------------------------------------------------------------
 * Resolve 3 problemas identificados na auditoria:
 *   1. Sidebar fixa de 256px (w-64) ocupa 68% da tela em mobile (375px)
 *   2. Sem Header com voltar / sem BottomNav
 *   3. Sem safe-area-inset
 *
 * Solução:
 *   - Desktop (md+): sidebar fixa à esquerda + conteúdo à direita (igual antes)
 *   - Mobile: sidebar vira um Sheet (drawer) aberto por um botão hambúrguer
 *     num header sticky top com safe-area-top
 *
 * Uso:
 *   <DashboardShell
 *     title="Painel Admin"
 *     badge="Global Admin"
 *     menuItems={menuItems}
 *     onSignOut={handleSignOut}
 *   >
 *     <Outlet />
 *   </DashboardShell>
 */
import { useState, type ReactNode } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, LogOut, ChevronLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardMenuItem {
  icon: any;
  label: string;
  path: string;
  highlight?: boolean;
}

interface Props {
  title: string;
  badge?: string;
  menuItems: DashboardMenuItem[];
  onSignOut?: () => void;
  children: ReactNode;
  /** Logo/brand element opcional (default: nome do app) */
  brand?: ReactNode;
}

export function DashboardShell({
  title,
  badge,
  menuItems,
  onSignOut,
  children,
  brand,
}: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (path: string) =>
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(path));

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="p-6 border-b border-border bg-primary/5">
        {brand ?? (
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            MedWallet
          </h1>
        )}
        {badge && (
          <Badge variant="outline" className="text-[10px] uppercase mt-1">
            {badge}
          </Badge>
        )}
      </div>

      <nav className="flex-1 p-4 overflow-y-auto no-scrollbar">
        <ul className="space-y-1">
          {menuItems.map(({ icon: Icon, label, path, highlight }) => (
            <li key={path}>
              <Link
                to={path}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors no-tap-target",
                  isActive(path)
                    ? "bg-primary text-primary-foreground font-bold"
                    : highlight
                      ? "hover:bg-secondary/15 text-secondary bg-secondary/5"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {onSignOut && (
        <div className="p-4 border-t border-border safe-area-bottom">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive hover:text-destructive no-tap-target"
            onClick={() => {
              onSignOut();
              onNavigate?.();
            }}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — desktop apenas */}
      <aside className="hidden md:flex w-64 bg-card border-r border-border flex-col">
        <SidebarContent />
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile com botão hambúrguer + voltar */}
        <header className="md:hidden sticky top-0 z-40 glass border-b border-border/50 safe-area-top">
          <div className="flex items-center gap-2 px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              aria-label="Voltar"
              className="h-10 w-10 rounded-xl hover:bg-primary/10 no-tap-target"
              data-size="icon"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-black text-base truncate">{title}</h1>
              {badge && (
                <p className="text-[10px] text-muted-foreground uppercase font-bold">
                  {badge}
                </p>
              )}
            </div>
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Abrir menu"
                  className="h-10 w-10 rounded-xl hover:bg-primary/10 no-tap-target"
                  data-size="icon"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <SheetHeader className="sr-only">
                  <SheetTitle>{title} — Menu</SheetTitle>
                </SheetHeader>
                <SidebarContent onNavigate={() => setDrawerOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
