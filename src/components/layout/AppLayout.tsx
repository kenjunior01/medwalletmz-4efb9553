import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { OfflineBanner } from "./OfflineBanner";
import { DesktopRail } from "./DesktopRail";
import { AppSidebar } from "./AppSidebar";
import { MeddyFloating } from "@/components/mascot/MeddyFloating";
import { SmartEngagementPopUp } from "@/components/notifications/SmartEngagementPopUp";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import NotificationPermissionPopup from "@/components/notifications/NotificationPermissionPopup";
import { PopupCoordinatorProvider } from "./PopupCoordinator";
import { useNotifications } from "@/hooks/useNotifications";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useCapacitor } from "@/hooks/useCapacitor";
import { useCountry } from "@/contexts/CountryContext";
import { MedWalletLogo } from "@/components/brand";
import AuroraBackground from "@/components/brand/AuroraBackground";
import type { Context } from "@/components/mascot/MeddyMessages";

/** Mapeia o pathname actual para o contexto do Meddy. */
function contextFromPath(pathname: string): Context {
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

/** Branded loading state replacing the bare spinner. */
function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-5">
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
      >
        <MedWalletLogo size={56} variant="icon" animated />
      </motion.div>
      <div className="h-1 w-24 rounded-full overflow-hidden">
        <div
          className="h-full w-full rounded-full bg-gradient-to-r from-primary via-accent to-primary"
          style={{
            backgroundSize: "200% 100%",
            animation: "brand-shimmer 1.6s ease-in-out infinite",
          }}
        />
      </div>
      <style>{`@keyframes brand-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

export function AppLayout() {
  useNotifications();
  useCapacitor();
  const { country } = useCountry();
  const location = useLocation();
  const context = contextFromPath(location.pathname);
  const device = useDeviceType();
  const isMobile = device === "mobile";

  return (
    <PopupCoordinatorProvider>
      <div className="relative min-h-screen bg-background flex">
        {/* Persistent subtle aurora behind everything */}
        <AuroraBackground intensity="soft" className="fixed inset-0" />

        {!isMobile && <AppSidebar />}
        <div className="relative z-10 flex-1 flex flex-col min-w-0">
          <OfflineBanner />
          <Header />
          <div className="flex-1 w-full max-w-7xl mx-auto lg:px-6 lg:gap-6 lg:pt-2 flex">
            <main className={`flex-1 min-w-0 ${isMobile ? "pb-28" : ""}`}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <Suspense fallback={<LoadingScreen />}>
                    <Outlet />
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </main>
            {device === "desktop" && <DesktopRail />}
          </div>
          {isMobile && <BottomNav />}
        </div>

        <SmartEngagementPopUp />
        <PWAInstallPrompt />
        <NotificationPermissionPopup />
        <MeddyFloating context={context} />
      </div>
    </PopupCoordinatorProvider>
  );
}
