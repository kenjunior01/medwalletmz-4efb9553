/**
 * OpenMap — mapa interativo baseado em Leaflet + OpenStreetMap (gratuito, sem chave).
 * Substitui o GoogleMap com a mesma interface de props.
 */

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { decodePolyline } from '@/lib/openRoutes';
import { logger } from '@/lib/logger';

export interface GMarker {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  description?: string;
  color?: string; // hex/CSS color
  draggable?: boolean;
  onDragEnd?: (lat: number, lng: number) => void;
}

interface Props {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: GMarker[];
  height?: number | string;
  className?: string;
  polyline?: { lat: number; lng: number }[];
  encodedPolyline?: string;
  followFirstMarker?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}

const MAPUTO = { lat: -25.9692, lng: 32.5732 };

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function dotIcon(color?: string) {
  const c = color || '#047857';
  return L.divIcon({
    className: 'mw-map-dot',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${c};border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export function OpenMap({
  center = MAPUTO,
  zoom = 13,
  markers = [],
  height = 300,
  className,
  polyline,
  encodedPolyline,
  followFirstMarker,
  onMapClick,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRefs = useRef<L.Marker[]>([]);
  const lineRef = useRef<L.Polyline | null>(null);
  const clickCb = useRef(onMapClick);
  clickCb.current = onMapClick;

  // Criar mapa uma única vez
  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    try {
      const map = L.map(ref.current, {
        center: [center.lat, center.lng],
        zoom,
        zoomControl: true,
        scrollWheelZoom: true,
      });
      L.tileLayer(OSM_TILES, { attribution: OSM_ATTR, maxZoom: 19 }).addTo(map);
      map.on('click', (e: L.LeafletMouseEvent) => {
        clickCb.current?.(e.latlng.lat, e.latlng.lng);
      });
      mapRef.current = map;
      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (e) {
      logger.warn('[OpenMap]', { error: e });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marcadores
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerRefs.current.forEach((m) => map.removeLayer(m));
    markerRefs.current = markers.map((mk) => {
      const marker = L.marker([mk.lat, mk.lng], {
        icon: dotIcon(mk.color),
        draggable: mk.draggable ?? false,
        title: mk.title ?? '',
      }).addTo(map);
      if (mk.title || mk.description) {
        const desc = mk.description
          ? `<br/><span style="font-size:12px;color:#555">${escapeHtml(mk.description)}</span>`
          : '';
        marker.bindPopup(`<b>${escapeHtml(mk.title ?? '')}</b>${desc}`);
      }
      if (mk.draggable && mk.onDragEnd) {
        marker.on('dragend', () => {
          const p = marker.getLatLng();
          mk.onDragEnd!(p.lat, p.lng);
        });
      }
      return marker;
    });
    if (followFirstMarker && markers[0]) {
      map.panTo([markers[0].lat, markers[0].lng]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, followFirstMarker]);

  // Linha de rota
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (lineRef.current) {
      map.removeLayer(lineRef.current);
      lineRef.current = null;
    }

    let path: L.LatLngExpression[] | null = null;
    if (polyline && polyline.length >= 2) {
      path = polyline.map((p) => [p.lat, p.lng]);
    } else if (encodedPolyline) {
      const pts = decodePolyline(encodedPolyline);
      if (pts.length >= 2) path = pts.map((p) => [p.lat, p.lng]);
    }

    if (path) {
      lineRef.current = L.polyline(path, {
        color: '#047857',
        weight: 4,
        opacity: 0.8,
      }).addTo(map);
      if (encodedPolyline) map.fitBounds(lineRef.current.getBounds(), { padding: [24, 24] });
    }
  }, [polyline, encodedPolyline]);

  // Centro
  useEffect(() => {
    mapRef.current?.panTo([center.lat, center.lng]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);

  return <div ref={ref} className={className} style={{ width: '100%', height, zIndex: 0 }} />;
}
