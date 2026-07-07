import { useEffect, useState } from "react";

export type DeviceType = "mobile" | "tablet" | "desktop";

function detect(): DeviceType {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1280) return "tablet";
  return "desktop";
}

export function useDeviceType(): DeviceType {
  const [d, setD] = useState<DeviceType>(detect);
  useEffect(() => {
    const on = () => setD(detect());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return d;
}