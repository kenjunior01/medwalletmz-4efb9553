/**
 * Central Google Maps browser key resolver.
 *
 * The Lovable Google Maps connector injects the browser key as
 * `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`. Legacy code still
 * references `VITE_GOOGLE_MAPS_API_KEY`. This helper returns whichever
 * is configured so every Google Maps call keeps working.
 */
export function getGoogleMapsBrowserKey(): string | undefined {
  const env = (import.meta as any).env ?? {};
  return (
    env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY ||
    env.VITE_GOOGLE_MAPS_API_KEY ||
    undefined
  );
}

export const GOOGLE_MAPS_BROWSER_KEY = getGoogleMapsBrowserKey();