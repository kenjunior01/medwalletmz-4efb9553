/**
 * Componentes de UI que consomem a Places API do Google Maps Platform.
 *
 * Exporta:
 *  - PlacePhotosCarousel   → carrossel de fotos reais do local (Places Photos API)
 *  - OpenNowBadge          → badge "Aberto agora" / "Fechado" em tempo real
 *  - PopularTimesChart     → gráfico de horas de pico (bar chart inline)
 *  - PlaceReviewsList      → reviews reais do Google (com autor + rating + data)
 *  - PlaceDetailsEnriched  → wrapper que busca e injeta dados Places numa facility
 *  - NearbyHealthList      → "Saúde perto de si" usando Nearby Search
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Star,
  TrendingUp,
  Users,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  getPlaceDetails,
  getPlaceDetailsByCoordinates,
  buildPhotoUrl,
  isOpenNow,
  searchNearbyHealth,
  placesTypeToFacilityType,
  type PlaceDetails,
  type NearbyPlace,
} from "@/lib/googlePlaces";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "@/contexts/LocationContext";

// ---------- OpenNowBadge ----------

export function OpenNowBadge({ details }: { details: PlaceDetails | null }) {
  const status = isOpenNow(details);
  if (!details) {
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <Clock className="h-3 w-3" /> Horário indisponível
      </Badge>
    );
  }
  return (
    <Badge
      variant={status.open ? "default" : "secondary"}
      className={`gap-1 text-xs ${status.open ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}
      title={status.nextChangeLabel}
    >
      <span className={`h-2 w-2 rounded-full ${status.open ? "bg-white animate-pulse" : "bg-slate-500"}`} />
      {status.open ? "Aberto agora" : "Fechado"}
      {status.closesAt && <span className="opacity-80">· até {status.closesAt}</span>}
      {status.opensAt && <span className="opacity-80">· abre {status.opensAt}</span>}
    </Badge>
  );
}

// ---------- PlacePhotosCarousel ----------

export function PlacePhotosCarousel({
  photos,
  placeName,
  height = 220,
}: {
  photos: PlaceDetails["photos"];
  placeName: string;
  height?: number;
}) {
  const [idx, setIdx] = useState(0);
  if (!photos?.length) return null;

  const photoUrl = (i: number) => {
    const p = photos[i];
    if (!p?.name) return "";
    return buildPhotoUrl(p.name, 800, height);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i - 1 + photos.length) % photos.length);
  };
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i + 1) % photos.length);
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-slate-100 group"
      style={{ height }}
    >
      <img
        key={idx}
        src={photoUrl(idx)}
        alt={`${placeName} — foto ${idx + 1}`}
        className="w-full h-full object-cover transition-opacity duration-300"
        loading="lazy"
      />

      {photos.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Próxima foto"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.slice(0, 8).map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setIdx(i);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-6 bg-white" : "w-1.5 bg-white/50"
                }`}
                aria-label={`Ir para foto ${i + 1}`}
              />
            ))}
          </div>

          <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
            {idx + 1} / {photos.length}
          </div>
        </>
      )}

      <p className="absolute bottom-2 right-2 text-[9px] text-white/60">
        Fotos via Google Places
      </p>
    </div>
  );
}

// ---------- PlaceReviewsList ----------

export function PlaceReviewsList({
  reviews,
  max = 3,
}: {
  reviews: PlaceDetails["reviews"];
  max?: number;
}) {
  if (!reviews?.length) return null;
  return (
    <div className="space-y-3 mt-3">
      {reviews.slice(0, max).map((r, i) => (
        <div key={i} className="rounded-lg border border-slate-200 p-3 bg-white">
          <div className="flex items-center gap-2 mb-1.5">
            {r.authorAttribution?.photoUrl ? (
              <img
                src={r.authorAttribution.photoUrl}
                alt={r.authorName}
                className="h-6 w-6 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-600">
                {r.authorName?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{r.authorName}</p>
              <p className="text-[10px] text-slate-500">{r.relativePublishTimeDescription}</p>
            </div>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star
                  key={s}
                  className={`h-3 w-3 ${
                    s < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-700 line-clamp-3">{r.text}</p>
        </div>
      ))}
      {reviews.length > max && (
        <p className="text-xs text-slate-500 text-center">
          +{reviews.length - max} avaliações no Google Maps
        </p>
      )}
    </div>
  );
}

// ---------- PopularTimesChart (simplificado) ----------

export function PopularTimesChart({
  popularTimes,
  liveHour,
}: {
  popularTimes?: number[]; // array length 24, popularidade 0-100 por hora
  liveHour?: number;
}) {
  if (!popularTimes || popularTimes.length !== 24) {
    return null;
  }
  const max = Math.max(...popularTimes, 1);
  const currentHour = liveHour ?? new Date().getHours();

  return (
    <div className="rounded-lg border border-slate-200 p-3 bg-white">
      <p className="text-xs font-semibold mb-2 flex items-center gap-1">
        <TrendingUp className="h-3 w-3 text-primary" /> Horas de pico (popularidade)
      </p>
      <div className="flex items-end gap-0.5 h-16">
        {popularTimes.map((v, h) => {
          const heightPct = (v / max) * 100;
          const isNow = h === currentHour;
          return (
            <div
              key={h}
              className="flex-1 flex flex-col items-center justify-end"
              title={`${h}h: ${v}% popularidade`}
            >
              <div
                className={`w-full rounded-t-sm transition-all ${
                  isNow ? "bg-primary" : "bg-slate-300"
                }`}
                style={{ height: `${Math.max(heightPct, 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-slate-400">
        <span>00h</span>
        <span>06h</span>
        <span>12h</span>
        <span>18h</span>
        <span>23h</span>
      </div>
      <p className="text-[10px] text-slate-500 mt-1">
        Barra azul = hora atual · Dados do Google Maps
      </p>
    </div>
  );
}

// ---------- PlaceDetailsEnriched ----------

/**
 * Hook que busca os detalhes do Places API para uma facility.
 * Estratégia: usa google_place_id se existir, senão procura por coordenadas.
 */
export function usePlaceDetailsForFacility(facility: {
  google_place_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  type?: string;
  name?: string;
}) {
  return useQuery({
    queryKey: ["place-details", facility.google_place_id, facility.latitude, facility.longitude],
    queryFn: async () => {
      if (facility.google_place_id) {
        return await getPlaceDetails(facility.google_place_id);
      }
      if (facility.latitude && facility.longitude) {
        const placesType = facility.type === "hospital"
          ? "hospital"
          : facility.type === "pharmacy"
          ? "pharmacy"
          : facility.type === "laboratory"
          ? "doctor"
          : undefined;
        return await getPlaceDetailsByCoordinates(
          facility.latitude,
          facility.longitude,
          placesType,
        );
      }
      return null;
    },
    enabled: Boolean(facility.google_place_id || (facility.latitude && facility.longitude)),
    staleTime: 1000 * 60 * 30, // 30 min de cache
    retry: 1,
  });
}

// ---------- NearbyHealthList ----------

export function NearbyHealthList({
  max = 10,
  radiusMeters = 5000,
}: {
  max?: number;
  radiusMeters?: number;
}) {
  const { coordinates } = useLocation();
  const [items, setItems] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coordinates) return;
    setLoading(true);
    setError(null);
    searchNearbyHealth({
      lat: coordinates.latitude,
      lng: coordinates.longitude,
      radiusMeters,
      maxResultCount: max,
    })
      .then((results) => {
        setItems(results);
        if (results.length === 0) {
          setError("Não encontramos serviços de saúde próximos da sua localização.");
        }
      })
      .catch(() => setError("Erro ao procurar serviços de saúde. Tente novamente."))
      .finally(() => setLoading(false));
  }, [coordinates?.latitude, coordinates?.longitude, max, radiusMeters]);

  if (!coordinates) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
        Ative a sua localização para ver serviços de saúde perto de si.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">{error}</div>;
  }

  return (
    <div className="space-y-2">
      {items.map((p) => {
        const t = placesTypeToFacilityType(p.primaryTypeDisplayName?.text);
        const photo = p.photos?.[0];
        const photoUrl = photo ? buildPhotoUrl(photo.name, 200, 200) : null;
        return (
          <div
            key={p.id}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition-shadow"
          >
            <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
              {photoUrl ? (
                <img src={photoUrl} alt={p.displayName?.text || ""} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Users className="h-5 w-5" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{p.displayName?.text || "Sem nome"}</p>
              <p className="text-xs text-slate-500 truncate">{p.formattedAddress || "Sem morada"}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {t && <Badge variant="outline" className="text-[10px] capitalize">{t}</Badge>}
                {typeof p.rating === "number" && (
                  <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                    {p.rating.toFixed(1)}
                  </span>
                )}
                {p.distanceMeters != null && (
                  <span className="text-[10px] text-slate-400">
                    {p.distanceMeters < 1000
                      ? `${p.distanceMeters} m`
                      : `${(p.distanceMeters / 1000).toFixed(1)} km`}
                  </span>
                )}
              </div>
            </div>
            {p.googleMapsUri && (
              <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
                <a href={p.googleMapsUri} target="_blank" rel="noreferrer" aria-label="Abrir no Maps">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- LoadingState ----------

export function PlaceDetailsLoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-32 rounded-full" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

export function PlaceDetailsLoadingInline() {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <Loader2 className="h-3 w-3 animate-spin" /> A carregar dados do Google…
    </div>
  );
}
