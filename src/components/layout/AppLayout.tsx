import { Suspense, lazy, useEffect, useCallback, useRef, useState } from "react";
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const handleRefresh = useCallback(async () => {
    // Invalidate all active queries for the current page
    await queryClient.invalidateQueries({ refetchType: 'active' });
  }, [queryClient]);

  // Scroll to top on route change — native app feel
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }
    // Reset header on navigation
    setHeaderCollapsed(false);
  }, [location.pathname]);

  // Collapsible header: hide on scroll down, show on scroll up (mobile only)
  useEffect(() => {
    if (!isMobile) return;
    let lastScrollY = 0;
    let ticking = false;
    const container = scrollContainerRef.current;

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentY = container ? container.scrollTop : window.scrollY;
          // Collapse after scrolling down 40px, expand when scrolling up or near top
          if (currentY > 40 && currentY > lastScrollY) {
            setHeaderCollapsed(true);
          } else {
            setHeaderCollapsed(false);
          }
          lastScrollY = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };

    if (container) {
      container.addEventListener('scroll', onScroll, { passive: true });
      return () => container.removeEventListener('scroll', onScroll);
    } else {
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }
  }, [isMobile]);

  // =============== MOBILE APP SHELL ===============
  // Native app feel: fixed header + scrollable content + fixed bottom nav
  // Uses dvh (dynamic viewport height) to handle mobile browser chrome
  if (isMobile) {
    return (
      <PopupCoordinatorProvider>
        <div className="fixed inset-0 bg-background flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
          {/* Offline banner — thin, at the very top */}
          <OfflineBanner />

          {/* Collapsible Header — fixed, slides up/down */}
          <div
            className="shrink-0 transition-transform duration-200 ease-out z-30"
            style={{ transform: headerCollapsed ? 'translateY(-100%)' : 'translateY(0)' }}
          >
            <Header collapsed={headerCollapsed} />
          </div>

          {/* Scrollable content area — fills remaining space */}
          <main
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <Suspense fallback={<LoadingScreen />}>
              <PullToRefresh onRefresh={handleRefresh}>
                <PageTransition>
                  <div className="pb-2">
                    <Outlet />
                  </div>
                </PageTransition>
              </PullToRefresh>
            </Suspense>
          </main>

          {/* Fixed Bottom Navigation */}
          <BottomNav />

          {/* Popups — rendered above everything */}
          <Suspense fallback={null}>
            <NotificationPermissionPopup />
          </Suspense>
          <Suspense fallback={null}><PWAInstallPrompt /></Suspense>
        </div>
      </PopupCoordinatorProvider>
    );
  }

  // =============== DESKTOP/TABLET LAYOUT ===============
  // Traditional sidebar + header + rail layout
  return (
    <PopupCoordinatorProvider>
      <div className="relative min-h-screen bg-background flex">
        <AppSidebar />
        <div className="relative z-10 flex-1 flex flex-col min-w-0">
          <OfflineBanner />
          <Header />
          <div className="flex-1 w-full max-w-7xl mx-auto lg:px-6 lg:gap-6 lg:pt-2 flex">
            <main className="flex-1 min-w-0">
              <Suspense fallback={<LoadingScreen />}>
                <PageTransition>
                  <Outlet />
                </PageTransition>
              </Suspense>
            </main>
            {device === "desktop" && <DesktopRail />}
          </div>
        </div>

        <Suspense fallback={null}>
          <NotificationPermissionPopup />
        </Suspense>
        <Suspense fallback={null}><PWAInstallPrompt /></Suspense>
      </div>
    </PopupCoordinatorProvider>
  );
}
