import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/googleMapsLoader";

export interface GMarker {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  description?: string;
  color?: string; // hex/CSS color
}

interface Props {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: GMarker[];
  height?: number | string;
  className?: string;
  polyline?: { lat: number; lng: number }[];
  followFirstMarker?: boolean;
}

const MAPUTO = { lat: -25.9692, lng: 32.5732 };

export function GoogleMap({
  center = MAPUTO,
  zoom = 13,
  markers = [],
  height = 300,
  className,
  polyline,
  followFirstMarker,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);
  const lineRef = useRef<any>(null);
  const infoRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
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
    }).catch((e) => console.warn("[GoogleMap]", e));
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
    if (polyline && polyline.length >= 2) {
      lineRef.current = new g.maps.Polyline({
        path: polyline,
        map: mapRef.current,
        strokeColor: "#047857",
        strokeWeight: 3,
        strokeOpacity: 0.8,
      });
    }
  }, [polyline]);

  // Update center
  useEffect(() => {
    if (mapRef.current) mapRef.current.panTo(center);
  }, [center.lat, center.lng]);

  return <div ref={ref} className={className} style={{ width: "100%", height }} />;
}