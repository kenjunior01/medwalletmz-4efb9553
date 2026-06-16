import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { OfflineBanner } from "./OfflineBanner";
import { WhatsAppButton } from "@/components/support/WhatsAppButton";
import { DesktopRail } from "./DesktopRail";
import { useNotifications } from "@/hooks/useNotifications";

export function AppLayout() {
  useNotifications();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <OfflineBanner />
      <Header />
      <div className="flex-1 w-full max-w-6xl mx-auto lg:px-6 lg:flex lg:gap-6 lg:pt-2">
        <main className="flex-1 pb-20 min-w-0">
          <Outlet />
        </main>
        <DesktopRail />
      </div>
      <BottomNav />
      <WhatsAppButton />
    </div>
  );
}
