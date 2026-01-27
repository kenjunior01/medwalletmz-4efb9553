import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { WhatsAppButton } from "@/components/support/WhatsAppButton";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <BottomNav />
      <WhatsAppButton />
    </div>
  );
}
