import { useEffect, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { OfflineBanner } from "./OfflineBanner";
import { DesktopRail } from "./DesktopRail";
import { AppSidebar } from "./AppSidebar";
import { MeddyFloating } from "@/components/mascot/MeddyFloating";
import { SmartEngagementPopUp } from "@/components/notifications/SmartEngagementPopUp";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { useNotifications } from "@/hooks/useNotifications";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useCapacitor } from "@/hooks/useCapacitor";
import { useCountry } from "@/contexts/CountryContext";
import { Loader2 } from "lucide-react";
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
  useCapacitor();
  const { country } = useCountry();
  const { pathname } = useLocation();
  const context = contextFromPath(pathname);
  const device = useDeviceType();
  const isMobile = device === "mobile";

  return (
    <div className="min-h-screen bg-background flex">
      {!isMobile && <AppSidebar />}
      <div className="flex-1 flex flex-col min-w-0">
        <OfflineBanner />
        <Header />
        <div className="flex-1 w-full max-w-7xl mx-auto lg:px-6 lg:gap-6 lg:pt-2 flex">
          <main className={`flex-1 min-w-0 ${isMobile ? "pb-28" : ""}`}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }>
              <Outlet />
            </Suspense>
          </main>
          {device === "desktop" && <DesktopRail />}
        </div>
        {isMobile && <BottomNav />}
      </div>
      <SmartEngagementPopUp />
      <PWAInstallPrompt />
      <MeddyFloating context={context} />
    </div>
  );
}
