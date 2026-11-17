/**
 * F54 — LeafletMap: mapa interativo de saúde.
 *
 * Por defeito (100% grátis, sem chave): Leaflet + tiles OpenStreetMap.
 * Opcional: se VITE_GOOGLE_MAPS_API_KEY estiver configurada, renderiza
 * Google Maps em vez do Leaflet (melhor qualidade de mapa onde existir chave).
 *
 * Marcadores: pins SVG por tipo (hospital/clínica/farmácia/lab/maternidade),
 * posição do utilizador, sincronia com a seleção da página, popup com nome.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoPoint } from '@/services/mapsPremium';

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export interface MapPoint {
  id: string;
  name: string;
  geo: GeoPoint;
  type?: string;
  subtitle?: string;
}

const TYPE_COLORS: Record<string, string> = {
  hospital: '#dc2626',
  clinic: '#0ea5e9',
  pharmacy: '#16a34a',
  lab: '#8b5cf6',
  maternity: '#ec4899',
};

const DEFAULT_COLOR = '#2563eb';

function pinSvg(color: string, active: boolean): string {
  const scale = active ? 1.35 : 1;
  return `
    <svg width="${30 * scale}" height="${30 * scale}" viewBox="0 0 30 30" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,.35));">
      <path d="M15 1C8.9 1 4 5.9 4 12c0 8 11 17 11 17s11-9 11-17C26 5.9 21.1 1 15 1z"
            fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="15" cy="12" r="${active ? 5 : 4}" fill="white"/>
    </svg>`;
}

/* ── Ramo Google (opcional, só com chave) ───────────────────────────────── */

type GoogleMapsNS = typeof google.maps;
let gmapsPromise: Promise<GoogleMapsNS> | null = null;

function loadGoogleMaps(key: string): Promise<GoogleMapsNS> {
  const w = window as unknown as { google?: { maps?: GoogleMapsNS } };
  if (w.google?.maps) return Promise.resolve(w.google.maps);
  if (!gmapsPromise) {
    gmapsPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
      s.async = true;
      s.onload = () => {
        const maps = (window as unknown as { google?: { maps?: GoogleMapsNS } }).google?.maps;
        if (maps) resolve(maps); else reject(new Error('Google Maps não carregou'));
      };
      s.onerror = () => reject(new Error('Google Maps indisponível'));
      document.head.appendChild(s);
    });
  }
  return gmapsPromise;
}

function GoogleMapView({
  center, zoom, points, selectedId, userPos, onSelect,
}: {
  center: GeoPoint;
  zoom: number;
  points: MapPoint[];
  selectedId?: string | null;
  userPos?: GeoPoint | null;
  onSelect?: (id: string) => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    loadGoogleMaps(GOOGLE_KEY as string)
      .then((g) => {
        if (!divRef.current || mapRef.current) return;
        mapRef.current = new g.Map(divRef.current, {
          center: { lat: center.lat, lng: center.lng },
          zoom,
          mapTypeControl: false,
          streetViewControl: false,
        });
      })
      .catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = (window as unknown as { google?: { maps?: GoogleMapsNS } }).google?.maps;
    const map = mapRef.current;
    if (failed || !g || !map) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = points.map((p) => {
      const marker = new g.Marker({
        position: { lat: p.geo.lat, lng: p.geo.lng },
        map,
        title: p.name,
        opacity: p.id === selectedId ? 1 : 0.75,
      });
      marker.addListener('click', () => onSelect?.(p.id));
      return marker;
    });
    if (userPos) {
      markersRef.current.push(
        new g.Marker({ position: { lat: userPos.lat, lng: userPos.lng }, map, title: 'Está aqui' }),
      );
    }
  }, [points, selectedId, userPos, onSelect, failed]);

  useEffect(() => {
    const p = points.find((x) => x.id === selectedId);
    if (p) mapRef.current?.panTo({ lat: p.geo.lat, lng: p.geo.lng });
  }, [selectedId, points]);

  if (failed) return <OsmLeafletMapView {...{ center, zoom, points, selectedId, userPos, onSelect }} />;
  return <div ref={divRef} className="h-full w-full" aria-label="Mapa (Google Maps)" />;
}

/* ── Ramo OpenStreetMap / Leaflet (por defeito, grátis) ─────────────────── */

function OsmLeafletMapView({
  center, zoom, points, selectedId, userPos, onSelect,
}: {
  center: GeoPoint;
  zoom: number;
  points: MapPoint[];
  selectedId?: string | null;
  userPos?: GeoPoint | null;
  onSelect?: (id: string) => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, { center: [center.lat, center.lng], zoom, scrollWheelZoom: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const p of points) {
      const active = p.id === selectedId;
      const icon = L.divIcon({
        html: pinSvg(TYPE_COLORS[p.type ?? ''] ?? DEFAULT_COLOR, active),
        className: '!bg-transparent !border-0',
        iconSize: [30, 40],
        iconAnchor: [15, 38],
      });
      L.marker([p.geo.lat, p.geo.lng], { icon, zIndexOffset: active ? 1000 : 0 })
        .addTo(layer)
        .bindPopup(
          `<b>${p.name}</b>${p.subtitle ? `<br/><span style="font-size:11px;color:#555">${p.subtitle}</span>` : ''}`,
        )
        .on('click', () => onSelect?.(p.id));
    }
    if (userPos) {
      L.circleMarker([userPos.lat, userPos.lng], {
        radius: 8,
        color: '#fff',
        weight: 2,
        fillColor: '#2563eb',
        fillOpacity: 1,
      })
        .addTo(layer)
        .bindPopup('<b>Você está aqui</b>');
    }
  }, [points, selectedId, userPos, onSelect]);

  useEffect(() => {
    const p = points.find((x) => x.id === selectedId);
    if (p) mapRef.current?.panTo([p.geo.lat, p.geo.lng]);
  }, [selectedId, points]);

  return <div ref={divRef} className="h-full w-full" aria-label="Mapa (OpenStreetMap)" />;
}

/* ── Componente público ─────────────────────────────────────────────────── */

export function LeafletMap({
  center,
  zoom = 13,
  points,
  selectedId,
  userPos,
  onSelect,
  className = 'h-72 w-full',
}: {
  center: GeoPoint;
  zoom?: number;
  points: MapPoint[];
  selectedId?: string | null;
  userPos?: GeoPoint | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const pointsKey = useMemo(() => points.map((p) => p.id).join('|'), [points]);
  void pointsKey; // estabilidade de referências nos efeitos acima

  if (GOOGLE_KEY) {
    return (
      <div className={className}>
        <GoogleMapView {...{ center, zoom, points, selectedId, userPos, onSelect }} />
      </div>
    );
  }
  return (
    <div className={className}>
      <OsmLeafletMapView {...{ center, zoom, points, selectedId, userPos, onSelect }} />
    </div>
  );
}

export default LeafletMap;
