/**
 * NearbyHealth — "Saúde perto de si"
 *
 * Página que mostra serviços de saúde (hospitais, clínicas, farmácias, dentistas,
 * médicos) próximos da localização atual do utilizador, usando a Places Nearby
 * Search API do Google Maps Platform.
 *
 * Recursos:
 *  - Lista paginada de lugares com foto, rating, distância, tipo, morada
 *  - Botão "Abrir no Maps" para cada lugar
 *  - Seletor de raio (1km / 5km / 10km / 20km)
 *  - Seletor de tipos (hospital, farmácia, dentista, etc.)
 *  - Estado de loading, erro e vazio
 *  - Mapa embed com todos os marcadores
 */
import { useState } from "react";
import { Seo } from "@/components/Seo";
import { useLocation } from "@/contexts/LocationContext";
import { NearbyHealthList } from "@/components/maps/PlaceDetailsWidgets";
import { GoogleMapEmbed } from "@/components/maps/GoogleMapEmbed";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Locate, Building2, Hospital, Store, FlaskConical, Navigation } from "lucide-react";
import { useCountry } from "@/contexts/CountryContext";

const RADIUS_OPTIONS = [
  { label: "1 km", value: 1000 },
  { label: "5 km", value: 5000 },
  { label: "10 km", value: 10000 },
  { label: "20 km", value: 20000 },
];

export default function NearbyHealth() {
  const { coordinates, requestLocation } = useLocation();
  const [radius, setRadius] = useState(5000);
  const { t } = useCountry();

  return (
    <>
      <Seo
        title={t("nearbyHealth.seo_title")}
        description={t("nearbyHealth.seo_description")}
        path="/health/nearby"
      />
      <div className="p-4 flex flex-col gap-4 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Navigation className="h-6 w-6 text-primary" aria-hidden="true" /> {t('nearbyHealth.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('nearbyHealth.subtitle')}
          </p>
        </div>

        {/* Localização */}
        <div className="bento-card p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate">
              {coordinates
                ? `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`
                : t('nearbyHealth.location_disabled')}
            </p>
            <p className="text-[10px] text-muted-foreground">{t('nearbyHealth.your_position')}</p>
          </div>
          {!coordinates && (
            <Button size="sm" variant="outline" onClick={requestLocation} className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-offset-2" aria-label={t("nearbyHealth.activate")}>
              <Locate className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> {t('nearbyHealth.activate')}
            </Button>
          )}
        </div>

        {/* Seletor de raio */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label={t("nearbyHealth.radius")}>
          <span className="text-xs text-muted-foreground flex-shrink-0" id="radius-label">{t('nearbyHealth.radius')}</span>
          {RADIUS_OPTIONS.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant={radius === r.value ? "default" : "outline"}
              className="rounded-full min-h-[44px] focus-visible:ring-2 focus-visible:ring-offset-2"
              onClick={() => setRadius(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>

        {/* Mapa com localização atual */}
        {coordinates && (
          <GoogleMapEmbed
            lat={coordinates.latitude}
            lng={coordinates.longitude}
            title={t('nearbyHealth.your_location')}
            mode="place"
            zoom={14}
            height={200}
            showModeToggle={false}
          />
        )}

        {/* Lista de lugares */}
        {coordinates ? (
          <NearbyHealthList max={20} radiusMeters={radius} />
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground" role="status" aria-live="polite">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
            {t('nearbyHealth.empty_message')}
          </div>
        )}
      </div>
    </>
  );
}
