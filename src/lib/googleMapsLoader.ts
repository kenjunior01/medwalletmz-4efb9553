let loadPromise: Promise<any> | null = null;

const KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY) as string | undefined;
const CHANNEL = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

/** Load Google Maps JS API once (async, with callback), returns the `google` global. */
export function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as any).google?.maps?.Map) return Promise.resolve((window as any).google);
  if (loadPromise) return loadPromise;
  if (!KEY) return Promise.reject(new Error("Google Maps browser key não configurada"));

  loadPromise = new Promise((resolve, reject) => {
    const cbName = `__gmapsInit_${Math.random().toString(36).slice(2)}`;
    (window as any)[cbName] = () => resolve((window as any).google);
    const s = document.createElement("script");
    const params = new URLSearchParams({
      key: KEY,
      loading: "async",
      callback: cbName,
      libraries: "places,geometry",
    });
    if (CHANNEL) params.set("channel", CHANNEL);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Falha a carregar Google Maps"));
    document.head.appendChild(s);
  });

  return loadPromise;
}