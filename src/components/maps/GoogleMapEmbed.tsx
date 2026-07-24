/**
 * GoogleMapEmbed — iframe oficial baseado na Google Maps Embed API.
 *
 * Endpoint: https://www.google.com/maps/embed/v1/{mode}?key=API_KEY&...
 *
 * Diferentemente do URL antigo "maps.google.com/maps?q=...&output=embed" (que o
 * Google passou a bloquear com X-Frame-Options: DENY → ERR_BLOCKED_BY_RESPONSE),
 * o endpoint /maps/embed/v1/ é o canal OFICIAL suportado pelo Google para
 * incorporação em iframes e não é bloqueado.
 *
 * Modos suportados (Google Maps Embed API):
 *  - place      → marcador numa localização (gratuito, ilimitado)
 *  - view       → mapa sem marcador (gratuito, ilimitado)
 *  - directions → rota entre origem e destino (billable)
 *  - streetview → vista panorâmica de rua (billable)
 *  - search     → resultados de busca numa área
 *
 * Recursos que potencializam a plataforma:
 *  - Toggle entre Mapa / Satélite / Street View (rápido, sem recarregar a página)
 *  - Botão "Ver no Maps" abre a app Google Maps nativa (mobile) ou maps.google.com
 *  - Modo "Direções" mostra a rota do utilizador até ao destino (com tráfico)
 *  - Suporte a múltiplos idiomas/region (pt / MZ por defeito)
 *  - Fallback automático para OpenStreetMap caso falte API key (sem quebra)
 *  - Loading skeleton e toast de erro em PT
 */

import { useMemo, useState } from "react";
import { ExternalLink, Layers, MapPin, Navigation, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export type GoogleMapEmbedMode = "place" | "view" | "directions" | "streetview" | "search";

export interface GoogleMapEmbedProps {
  lat: number;
  lng: number;
  /** Título exibido acima do mapa e usado no botão "Abrir no Maps" */
  title?: string;
  /** Endereço exibido (opcional) */
  address?: string;
  /** Modo inicial */
  mode?: GoogleMapEmbedMode;
  /** Origem para o modo "directions" (ex: localização do utilizador) */
  origin?: { lat: number; lng: number } | null;
  /** Tipo de mapa: roadmap (padrão) ou satellite */
  mapType?: "roadmap" | "satellite";
  /** Zoom 0-21 (padrão 14) */
  zoom?: number;
  /** Altura em px (padrão 280) */
  height?: number;
  /** Idioma (padrão pt) */
  language?: string;
  /** Região (padrão MZ) */
  region?: string;
  /** Mostrar controlos de toggle de modo (padrão true) */
  showModeToggle?: boolean;
  /** Tema visual: 'dark' (padrão, para páginas admin) ou 'light' (para páginas públicas) */
  theme?: 'dark' | 'light';
  /** className extra para o wrapper */
  className?: string;
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

/**
 * Constrói o URL oficial do Maps Embed API.
 * Doc: https://developers.google.com/maps/documentation/embed/embedding-map
 */
function buildEmbedUrl(opts: {
  mode: GoogleMapEmbedMode;
  lat: number;
  lng: number;
  origin?: { lat: number; lng: number } | null;
  mapType?: "roadmap" | "satellite";
  zoom?: number;
  language?: string;
  region?: string;
  title?: string;
  address?: string;
}): string {
  const {
    mode,
    lat,
    lng,
    origin,
    mapType = "roadmap",
    zoom = 14,
    language = "pt",
    region = "MZ",
    title,
    address,
  } = opts;

  const q = title || address || `${lat},${lng}`;
  const params = new URLSearchParams({ key: API_KEY, language, region });

  switch (mode) {
    case "place":
      params.set("q", q);
      params.set("center", `${lat},${lng}`);
      params.set("zoom", String(zoom));
      params.set("maptype", mapType);
      return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;

    case "view":
      params.set("center", `${lat},${lng}`);
      params.set("zoom", String(zoom));
      params.set("maptype", mapType);
      return `https://www.google.com/maps/embed/v1/view?${params.toString()}`;

    case "directions":
      params.set("destination", `${lat},${lng}`);
      if (origin) {
        params.set("origin", `${origin.lat},${origin.lng}`);
      } else {
        // Sem origem, usa a própria localização como "ponto de partida"
        params.set("origin", `${lat},${lng}`);
      }
      params.set("avoid", "tolls|ferries");
      return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`;

    case "streetview":
      params.set("location", `${lat},${lng}`);
      params.set("heading", "210");
      params.set("pitch", "10");
      params.set("fov", "90");
      return `https://www.google.com/maps/embed/v1/streetview?${params.toString()}`;

    case "search":
      params.set("q", q);
      params.set("center", `${lat},${lng}`);
      params.set("zoom", String(zoom));
      params.set("maptype", mapType);
      return `https://www.google.com/maps/embed/v1/search?${params.toString()}`;
  }
}

/**
 * URL "Abrir no Maps" — abre a app nativa no mobile ou maps.google.com no desktop.
 * Usa o endpoint universal /maps/dir/?api=1 que respeita o sistema operativo.
 */
function buildOpenInMapsUrl(lat: number, lng: number, origin?: { lat: number; lng: number } | null) {
  const params = new URLSearchParams({ api: "1" });
  params.set("destination", `${lat},${lng}`);
  if (origin) params.set("origin", `${origin.lat},${origin.lng}`);
  params.set("travelmode", "driving");
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function GoogleMapEmbed({
  lat,
  lng,
  title,
  address,
  mode: initialMode = "place",
  origin,
  mapType: initialMapType = "roadmap",
  zoom = 14,
  height = 280,
  language = "pt",
  region = "MZ",
  showModeToggle = true,
  theme = 'dark',
  className,
}: GoogleMapEmbedProps) {
  const [mode, setMode] = useState<GoogleMapEmbedMode>(initialMode);
  const [mapType, setMapType] = useState<"roadmap" | "satellite">(initialMapType);
  const [loading, setLoading] = useState(true);

  // Classes condicionais conforme o tema
  const isDark = theme === 'dark';
  const textLabel = isDark ? 'text-slate-400' : 'text-muted-foreground';
  const toggleBg = isDark ? 'bg-slate-800/60' : 'bg-muted';
  const toggleInactive = isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-muted-foreground hover:text-foreground hover:bg-accent';
  const layerActive = isDark ? 'bg-slate-700 text-white' : 'bg-primary/10 text-primary';
  const layerInactive = isDark ? 'text-slate-400 hover:text-white' : 'text-muted-foreground hover:text-foreground';
  const frameBorder = isDark ? 'border-slate-700 bg-slate-900' : 'border-border bg-muted';
  const loadingText = isDark ? 'text-slate-400' : 'text-muted-foreground';
  const coordText = isDark ? 'text-slate-400' : 'text-muted-foreground';
  const btnClass = isDark ? 'border-slate-700 text-slate-200' : '';

  const hasApiKey = Boolean(API_KEY);

  const embedUrl = useMemo(() => {
    if (!hasApiKey) return "";
    return buildEmbedUrl({ mode, lat, lng, origin, mapType, zoom, language, region, title, address });
  }, [mode, lat, lng, origin, mapType, zoom, language, region, title, address, hasApiKey]);

  const openInMapsUrl = useMemo(
    () => buildOpenInMapsUrl(lat, lng, origin),
    [lat, lng, origin],
  );

  // Fallback para OpenStreetMap quando não há API key (não deverá acontecer,
  // mas garante que o mapa nunca desaparece).
  if (!hasApiKey) {
    const delta = 0.01;
    const osm = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`;
    return (
      <div className={className}>
        <iframe
          title={`map-${title || "location"}`}
          src={osm}
          width="100%"
          height={height}
          loading="lazy"
          style={{ border: 0 }}
        />
        <div className="mt-2">
          <Button asChild size="sm" variant="outline">
            <a href={openInMapsUrl} target="_blank" rel="noreferrer">
              <Navigation className="h-3 w-3 mr-1" /> Abrir no Maps
            </a>
          </Button>
        </div>
      </div>
    );
  }

  const modes: Array<{ key: GoogleMapEmbedMode; label: string; icon: any }> = [
    { key: "place", label: "Mapa", icon: MapPin },
    { key: "directions", label: "Direções", icon: Navigation },
    { key: "streetview", label: "Street View", icon: Camera },
  ];

  return (
    <div className={className}>
      {/* Header com título + toggle de modo */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className={`text-xs font-semibold uppercase tracking-wider ${textLabel} flex items-center gap-2`}>
          <MapPin className="h-3 w-3" /> Localização
        </p>

        {showModeToggle && (
          <div className={`flex items-center gap-1 rounded-lg ${toggleBg} p-0.5`}>
            {modes.map((m) => {
              const Icon = m.icon;
              const active = mode === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    setMode(m.key);
                    setLoading(true);
                  }}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                    active ? "bg-primary text-white" : toggleInactive
                  }`}
                  aria-pressed={active}
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Toggle Mapa / Satélite (só relevante para modos place/view/search) */}
      {(mode === "place" || mode === "view" || mode === "search") && (
        <div className="flex items-center gap-1 mb-2">
          <button
            type="button"
            onClick={() => {
              setMapType("roadmap");
              setLoading(true);
            }}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium ${
              mapType === "roadmap" ? layerActive : layerInactive
            }`}
          >
            <Layers className="h-3 w-3" /> Mapa
          </button>
          <button
            type="button"
            onClick={() => {
              setMapType("satellite");
              setLoading(true);
            }}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium ${
              mapType === "satellite" ? layerActive : layerInactive
            }`}
          >
            <Layers className="h-3 w-3" /> Satélite
          </button>
        </div>
      )}

      {/* Iframe com loading skeleton */}
      <div className={`relative rounded-xl overflow-hidden border ${frameBorder}`}>
        {loading && (
          <div className="absolute inset-0 z-10">
            <Skeleton className="w-full h-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className={`text-xs ${loadingText} animate-pulse`}>A carregar mapa…</p>
            </div>
          </div>
        )}
        <iframe
          key={embedUrl}
          title={`map-${title || "location"}-${mode}-${mapType}`}
          src={embedUrl}
          width="100%"
          height={height}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          style={{ border: 0 }}
          allowFullScreen
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
        />
      </div>

      {/* Coordenadas + botões de ação */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className={`text-xs ${coordText} font-mono`}>
          {lat.toFixed(6)}, {lng.toFixed(6)}
          {address ? ` · ${address}` : ""}
        </p>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline" className={btnClass}>
            <a href={openInMapsUrl} target="_blank" rel="noreferrer">
              <Navigation className="h-3 w-3 mr-1" /> Abrir no Maps
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className={btnClass}>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="h-3 w-3 mr-1" /> Detalhes
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default GoogleMapEmbed;
