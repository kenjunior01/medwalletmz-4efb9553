import { Suspense, lazy, useEffect, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { OfflineBanner } from "./OfflineBanner";
import { DesktopRail } from "./DesktopRail";
import { AppSidebar } from "./AppSidebar";
// Lazy-loaded: framer-motion (~35KB gzip) não precisa estar no bundle inicial
const PWAInstallPrompt = lazy(() => import("@/components/pwa/PWAInstallPrompt"));
import { OfflineIndicator } from "@/components/offline";
import { PopupCoordinatorProvider } from "./PopupCoordinator";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useCapacitor } from "@/hooks/useCapacitor";
import { PageTransition } from "./PageTransition";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { cn } from "@/lib/utils";

// Lazy-load notification popup — was loading framer-motion + Lottie + FloatingParticles on every page
const NotificationPermissionPopup = lazy(() => import("@/components/notifications/NotificationPermissionPopup"));

/** Mapeia o pathname actual para o contexto do Meddy. */
function contextFromPath(pathname: string) {
  if (pathname.startsWith("/health/doctors")) return "empty_doctors";
  if (pathname.startsWith("/health/triage")) return "triage";
  if (pathname.startsWith("/health/education")) return "education";
  if (pathname.startsWith("/pharmacy") || pathname.startsWith("/store")) return "empty_pharmacies";
  if (pathname.startsWith("/orders")) return "orders";
  if (pathname.startsWith("/profile") || pathname.startsWith("/wallet"))
    return pathname.startsWith("/wallet") ? "wallet" : "profile";
  if (pathname.startsWith("/admin/curation")) return "curation";
  return "home";
}

/** Minimal loading state — fast and clean */
function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-[40vh] gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      <p className="text-xs text-muted-foreground">A carregar...</p>
    </div>
  );
}

export function AppLayout() {
  const { isNative } = useCapacitor();
  const location = useLocation();
  const device = useDeviceType();
  const isMobile = device === "mobile";
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    // Invalidate all active queries for the current page
    await queryClient.invalidateQueries({ refetchType: 'active' });
  }, [queryClient]);

  // Scroll to top on route change — native app feel
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  return (
    <PopupCoordinatorProvider>
      <div className="relative min-h-screen bg-background flex">
        {/* No animated backgrounds on mobile — clean, fast, native feel */}
        {!isMobile && <AppSidebar />}
        <div className="relative z-10 flex-1 flex flex-col min-w-0">
          <OfflineBanner />
          <Header />
          <div className="flex-1 w-full max-w-7xl mx-auto lg:px-6 lg:gap-6 lg:pt-2 flex">
            <main className={cn("flex-1 min-w-0", isMobile && "pb-20")}>
              <Suspense fallback={<LoadingScreen />}>
                {isMobile ? (
                  <PullToRefresh onRefresh={handleRefresh}>
                    <PageTransition>
                      <Outlet />
                    </PageTransition>
                  </PullToRefresh>
                ) : (
                  <PageTransition>
                    <Outlet />
                  </PageTransition>
                )}
              </Suspense>
            </main>
            {device === "desktop" && <DesktopRail />}
          </div>
          {isMobile && <BottomNav />}
        </div>

        {/* Lazy-loaded — only fetches JS after 8s delay inside the component */}
        <Suspense fallback={null}>
          <NotificationPermissionPopup />
        </Suspense>
        <Suspense fallback={null}><PWAInstallPrompt /></Suspense>
      </div>
    </PopupCoordinatorProvider>
  );
}
