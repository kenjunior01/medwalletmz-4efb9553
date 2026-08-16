import { createContext, useContext, useEffect, useState, ReactNode } from "react";

import { logger } from '@/lib/logger';
interface DataSaverCtx {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (v: boolean) => void;
}

const Ctx = createContext<DataSaverCtx | null>(null);

function detectInitial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const saved = localStorage.getItem("data-saver");
    if (saved !== null) return saved === "1";
  } catch (e) {
    logger.warn('LocalStorage blocked', { error: e });
  }
  // Respect Save-Data header / connection hint
  const conn = (navigator as any).connection;
  if (conn?.saveData) return true;
  // Auto-enable on 2g, slow-2g, and 3g (common in MZ)
  if (conn?.effectiveType && /2g|slow-2g|3g/.test(conn.effectiveType)) return true;
  // Auto-enable on slow RTT (>300ms) — typical for MZ mobile networks
  if (conn?.rtt && conn.rtt > 300) return true;
  return false;
}

export function DataSaverProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState<boolean>(detectInitial);

  useEffect(() => {
    localStorage.setItem("data-saver", enabled ? "1" : "0");
    document.documentElement.classList.toggle("data-saver", enabled);
  }, [enabled]);

  return (
    <Ctx.Provider value={{ enabled, setEnabled, toggle: () => setEnabled((v) => !v) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useDataSaver() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDataSaver must be used within DataSaverProvider");
  return v;
}