/**
 * MapEmbed — cartão de localização com mapa Leaflet/OpenStreetMap (gratuito, sem chave).
 * Mesma interface do antigo GoogleMapEmbed: modos place/view/directions,
 * camada satélite (Esri World Imagery) e botões para abrir no app de mapas.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink, Layers, MapPin, Navigation } from "@/components/icons/lucide-compat";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buildExternalDirectionsUrl, fetchFullRoute, decodePolyline, fmtDuration } from "@/lib/openRoutes";

export type MapEmbedMode = "place" | "view" | "directions";

export interface MapEmbedProps {
  lat: number;
  lng: number;
  /** Título exibido acima do mapa e usado no botão "Abrir no Maps" */
  title?: string;
  /** Endereço exibido (opcional) */
  address?: string;
  /** Modo inicial */
  mode?: MapEmbedMode;
  /** Origem para o modo "directions" (ex: localização do utilizador) */
  origin?: { lat: number; lng: number } | null;
  /** Tipo de mapa: roadmap (padrão) ou satellite */
  mapType?: "roadmap" | "satellite";
  /** Zoom 3-19 (padrão 14) */
  zoom?: number;
  /** Altura em px (padrão 280) */
  height?: number;
  /** Mostrar controlos de toggle de modo (padrão true) */
  showModeToggle?: boolean;
  /** Tema visual: 'dark' (padrão, para páginas admin) ou 'light' (para páginas públicas) */
  theme?: 'dark' | 'light';
  /** className extra para o wrapper */
  className?: string;
}

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';
const SAT_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SAT_ATTR = 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics';

export function MapEmbed({
  lat,
  lng,
  title,
  address,
  mode: initialMode = "place",
  origin,
  mapType: initialMapType = "roadmap",
  zoom = 14,
  height = 280,
  showModeToggle = true,
  theme = 'dark',
  className,
}: MapEmbedProps) {
  const [mode, setMode] = useState<MapEmbedMode>(initialMode);
  const [mapType, setMapType] = useState<"roadmap" | "satellite">(initialMapType);
  const [route, setRoute] = useState<{ polyline: string; distanceMeters: number; durationSeconds: number } | null>(null);

  const mapHostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const originRef = useRef(origin);
  originRef.current = origin;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const isDark = theme === 'dark';
  const textLabel = isDark ? 'text-slate-400' : 'text-muted-foreground';
  const toggleBg = isDark ? 'bg-slate-800/60' : 'bg-muted';
  const toggleInactive = isDark ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-muted-foreground hover:text-foreground hover:bg-accent';
  const layerActive = isDark ? 'bg-slate-700 text-white' : 'bg-primary/10 text-primary';
  const layerInactive = isDark ? 'text-slate-400 hover:text-white' : 'text-muted-foreground hover:text-foreground';
  const frameBorder = isDark ? 'border-slate-700' : 'border-border';
  const coordText = isDark ? 'text-slate-400' : 'text-muted-foreground';
  const btnClass = isDark ? 'border-slate-700 text-slate-200' : '';

  // Render do mapa interno
  useEffect(() => {
    if (!mapHostRef.current || mapRef.current) return;
    const map = L.map(mapHostRef.current, {
      center: [lat, lng],
      zoom,
      scrollWheelZoom: true,
    });
    tileRef.current = L.tileLayer(OSM_TILES, { attribution: OSM_ATTR, maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Camada de tiles (mapa/satélite)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    tileRef.current = mapType === 'satellite'
      ? L.tileLayer(SAT_TILES, { attribution: SAT_ATTR, maxZoom: 19 }).addTo(map)
      : L.tileLayer(OSM_TILES, { attribution: OSM_ATTR, maxZoom: 19 }).addTo(map);
  }, [mapType]);

  // Marcador + rota
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    if (lineRef.current) {
      map.removeLayer(lineRef.current);
      lineRef.current = null;
    }
    setRoute(null);

    map.setView([lat, lng], zoom);

    if (mode !== 'view') {
      markerRef.current = L.marker([lat, lng]).addTo(map);
      if (title) markerRef.current.bindPopup(`<b>${title}</b>${address ? `<br/><span style="font-size:12px;color:#555">${address}</span>` : ''}`);
    }

    if (mode === 'directions' && originRef.current) {
      const o = originRef.current;
      // Rota real via OSRM; fallback: linha reta
      fetchFullRoute(o, { lat, lng }).then((r) => {
        if (!mapRef.current) return;
        if (r) {
          const pts = decodePolyline(r.polyline).map((p) => [p.lat, p.lng] as L.LatLngExpression);
          lineRef.current = L.polyline(pts, { color: '#047857', weight: 4, opacity: 0.85 }).addTo(mapRef.current!);
          mapRef.current.fitBounds(lineRef.current.getBounds(), { padding: [24, 24] });
          setRoute({ polyline: r.polyline, distanceMeters: r.distanceMeters, durationSeconds: r.durationSeconds });
        } else {
          lineRef.current = L.polyline([[o.lat, o.lng], [lat, lng]], { color: '#047857', weight: 3, dashArray: '6 8', opacity: 0.7 }).addTo(mapRef.current!);
          mapRef.current.fitBounds(lineRef.current.getBounds(), { padding: [24, 24] });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, mode, zoom, title, address]);

  const modes: Array<{ key: MapEmbedMode; label: string; icon: any }> = [
    { key: "place", label: "Mapa", icon: MapPin },
    { key: "directions", label: "Direções", icon: Navigation },
  ];

  const openInMapsUrl = useMemo(
    () => buildExternalDirectionsUrl(origin, { lat, lng }),
    [lat, lng, origin],
  );

  const showDirectionsHint = mode === 'directions' && !origin;

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
                  onClick={() => setMode(m.key)}
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

      {/* Toggle Mapa / Satélite */}
      <div className="flex items-center gap-1 mb-2">
        <button
          type="button"
          onClick={() => setMapType("roadmap")}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium ${
            mapType === "roadmap" ? layerActive : layerInactive
          }`}
        >
          <Layers className="h-3 w-3" /> Mapa
        </button>
        <button
          type="button"
          onClick={() => setMapType("satellite")}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium ${
            mapType === "satellite" ? layerActive : layerInactive
          }`}
        >
          <Layers className="h-3 w-3" /> Satélite
        </button>
      </div>

      {/* Mapa */}
      <div className={`relative rounded-xl overflow-hidden border ${frameBorder}`} style={{ height }}>
        <div ref={mapHostRef} className="absolute inset-0" style={{ zIndex: 0 }} />
        {showDirectionsHint && (
          <div className={`absolute inset-x-0 bottom-0 z-[500] px-3 py-2 text-center text-xs ${isDark ? 'bg-slate-900/80 text-slate-300' : 'bg-background/80 text-muted-foreground'}`}>
            Partilhe a sua localização para traçar a rota até aqui
          </div>
        )}
        {route && (
          <div className={`absolute left-2 top-2 z-[500] rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow ${isDark ? 'bg-slate-900/85 text-white' : 'bg-background/90 text-foreground'}`}>
            {(route.distanceMeters / 1000).toFixed(1)} km · {fmtDuration(route.durationSeconds)}
          </div>
        )}
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
              href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
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

export default MapEmbed;
