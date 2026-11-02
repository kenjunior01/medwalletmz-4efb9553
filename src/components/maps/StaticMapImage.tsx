/**
 * StaticMapImage — mini-mapa Leaflet/OpenStreetMap (gratuito, sem chave).
 * Renderiza o destino (e a ligação à origem) num mapa leve e não interativo.
 */

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  width?: number;
  height?: number;
  zoom?: number;
  className?: string;
}

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

function pin(color: string) {
  return L.divIcon({
    className: 'mw-map-dot',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export function StaticMapImage({ origin, destination, height = 300, zoom = 14, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.Layer[]>([]);

  useEffect(() => {
    if (!hostRef.current || !destination || mapRef.current) return;
    const map = L.map(hostRef.current, {
      center: [destination.lat, destination.lng],
      zoom,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomControl: false,
      attributionControl: true,
    });
    L.tileLayer(OSM_TILES, { attribution: OSM_ATTR, maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !destination) return;
    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];

    layersRef.current.push(L.marker([destination.lat, destination.lng], { icon: pin('#047857') }).addTo(map));
    if (origin) {
      layersRef.current.push(L.marker([origin.lat, origin.lng], { icon: pin('#ef4444') }).addTo(map));
      const line = L.polyline([[origin.lat, origin.lng], [destination.lat, destination.lng]], {
        color: '#047857',
        weight: 3,
        dashArray: '6 8',
        opacity: 0.7,
      }).addTo(map);
      layersRef.current.push(line);
      map.fitBounds(line.getBounds().pad(0.25));
    } else {
      map.setView([destination.lat, destination.lng], zoom);
    }
  }, [origin, destination, zoom]);

  if (!destination) return null;

  return (
    <div className={`overflow-hidden rounded-2xl bg-muted border border-border ${className}`}>
      <div ref={hostRef} style={{ width: '100%', height, zIndex: 0 }} />
    </div>
  );
}
