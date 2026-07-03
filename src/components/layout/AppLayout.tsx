import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { OfflineBanner } from "./OfflineBanner";
import { DesktopRail } from "./DesktopRail";
import { MeddyFloating } from "@/components/mascot/MeddyFloating";
import { useNotifications } from "@/hooks/useNotifications";
import type { Context } from "@/components/mascot/MeddyMessages";

/**
 * Mapeia o pathname actual para o contexto do Meddy.
 * Assim o mascote sabe dizer coisas relevantes consoante onde estás.
 */
function contextFromPath(pathname: string): Context {
  if (pathname.startsWith('/health/doctors')) return 'empty_doctors';
  if (pathname.startsWith('/health/triage')) return 'triage';
  if (pathname.startsWith('/health/education')) return 'education';
  if (pathname.startsWith('/pharmacy') || pathname.startsWith('/store')) return 'empty_pharmacies';
  if (pathname.startsWith('/orders')) return 'orders';
  if (pathname.startsWith('/profile') || pathname.startsWith('/wallet')) return pathname.startsWith('/wallet') ? 'wallet' : 'profile';
  if (pathname.startsWith('/admin/curation')) return 'curation';
  return 'home';
}

export function AppLayout() {
  useNotifications();
  const { pathname } = useLocation();
  const context = contextFromPath(pathname);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <OfflineBanner />
      <Header />
      <div className="flex-1 w-full max-w-6xl mx-auto lg:px-6 lg:gap-6 lg:pt-2">
        <main className="flex-1 pb-20 min-w-0">
          <Outlet />
        </main>
        <DesktopRail />
      </div>
      <BottomNav />
      <MeddyFloating context={context} />
    </div>
  );
}
