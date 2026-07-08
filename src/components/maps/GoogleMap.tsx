import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/googleMapsLoader";

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

export function GoogleMap({
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
  const mapRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);
  const lineRef = useRef<any>(null);
  const infoRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    loadGoogleMaps().then((g) => {
      if (cancelled || !ref.current) return;
      mapRef.current = new g.maps.Map(ref.current, {
        center,
        zoom,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });
      infoRef.current = new g.maps.InfoWindow();

      if (onMapClick) {
        mapRef.current.addListener("click", (e: any) => {
          onMapClick(e.latLng.lat(), e.latLng.lng());
        });
      }
    }).catch((e) => {
      if (!cancelled) {
        console.warn("[GoogleMap]", e);
        setLoadError("Mapa indisponível neste momento. A localização e as rotas continuam acessíveis.");
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapRef.current || !(window as any).google) return;
    const g = (window as any).google;
    markerRefs.current.forEach((m) => m.setMap(null));
    markerRefs.current = markers.map((mk) => {
      const marker = new g.maps.Marker({
        position: { lat: mk.lat, lng: mk.lng },
        map: mapRef.current!,
        title: mk.title,
        draggable: mk.draggable,
        icon: mk.color
          ? {
            path: g.maps.SymbolPath.CIRCLE,
            fillColor: mk.color,
            fillOpacity: 1,
            scale: 9,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          }
          : undefined,
      });

      if (mk.draggable && mk.onDragEnd) {
        marker.addListener("dragend", (e: any) => {
          mk.onDragEnd!(e.latLng.lat(), e.latLng.lng());
        });
      }

      if (mk.title || mk.description) {
        marker.addListener("click", () => {
          infoRef.current?.setContent(
            `<div style="min-width:140px"><b>${mk.title ?? ""}</b>${mk.description ? `<br/><span style="font-size:12px;color:#555">${mk.description}</span>` : ""}</div>`
          );
          infoRef.current?.open({ map: mapRef.current!, anchor: marker });
        });
      }
      return marker;
    });
    if (followFirstMarker && markers[0]) {
      mapRef.current.panTo({ lat: markers[0].lat, lng: markers[0].lng });
    }
  }, [markers, followFirstMarker]);

  // Update polyline
  useEffect(() => {
    if (!mapRef.current || !(window as any).google) return;
    const g = (window as any).google;
    lineRef.current?.setMap(null);

    let path = polyline;
    if (encodedPolyline) {
      path = g.maps.geometry.encoding.decodePath(encodedPolyline);
    }

    if (path && path.length >= 2) {
      lineRef.current = new g.maps.Polyline({
        path,
        map: mapRef.current,
        strokeColor: "#047857",
        strokeWeight: 4,
        strokeOpacity: 0.8,
      });

      // Se for rota complexa, ajusta o zoom para caber tudo
      if (encodedPolyline) {
        const bounds = new g.maps.LatLngBounds();
        path.forEach((p: any) => bounds.extend(p));
        mapRef.current.fitBounds(bounds);
      }
    }
  }, [polyline, encodedPolyline]);

  // Update center
  useEffect(() => {
    if (mapRef.current) mapRef.current.panTo(center);
  }, [center.lat, center.lng]);

  if (loadError) {
    return (
      <div className={className} style={{ width: "100%", height }}>
        <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed bg-muted/40 p-4 text-center text-sm text-muted-foreground">
          {loadError}
        </div>
      </div>
    );
  }

  return <div ref={ref} className={className} style={{ width: "100%", height }} />;
}