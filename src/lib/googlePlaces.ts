/**
 * Google Places API — integração com a Places API (New) do Google Maps Platform.
 *
 * Recursos oferecidos que potenciam a plataforma:
 *  - Place Details: fotos, horários abertura, rating, reviews, website, telefone,
 *    preço, popular times (live e previsão), wheelchair accessible, etc.
 *  - Places Photos: fotos reais tiradas por utilizadores no local
 *  - Nearby Search: "saúde perto de si" — clínicas, hospitais, farmácias próximas
 *  - Text Search: pesquisa por nome/tipo (ex: "farmácia em Maputo")
 *  - Geocoding: converter morada → coordenadas (autocomplete no AdminCuration)
 *
 * Endpoints (REST, sem JS API):
 *  - https://places.googleapis.com/v1/places:searchText
 *  - https://places.googleapis.com/v1/places:searchNearby
 *  - https://places.googleapis.com/v1/places/{placeId}
 *  - https://places.googleapis.com/v1/{place/photo}/media
 *  - https://maps.googleapis.com/maps/api/geocode/json
 *
 * Auth: API Key (header "X-Goog-Api-Key" para Places v1, query ?key= para Geocoding)
 *
 * Custo: a Places API (New) cobra por pedido conforme os campos pedidos
 * (Place Details = $0.04/pedido com fotos; Nearby = $0.032/pedido).
 * Por isso, os campos pedidos são always explicitamente listados em "fieldMask".
 */

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

const PLACES_V1_BASE = "https://places.googleapis.com/v1";
const GEOCODE_BASE = "https://maps.googleapis.com/maps/api/geocode/json";

// ---------- Types ----------

export interface PlacePhoto {
  name: string; // resource name, ex: "places/ChIJ.../photos/AUc..."
  widthPx?: number;
  heightPx?: number;
}

/**
 * Matches the actual Google Places API (New) response shape.
 * Note: `text` and `originalText` are objects {text, languageCode}, NOT plain strings.
 * Rendering `review.text` directly in JSX causes React error #31
 * ("Objects are not valid as a React child").
 */
export interface PlaceReviewText {
  text: string;
  languageCode?: string;
}

export interface PlaceReview {
  /**
   * NOTE: Google Places API (New) does NOT return a top-level `authorName`.
   * The author name lives in `authorAttribution.displayName`.
   * We keep this optional here only for backwards compatibility with legacy code paths,
   * but consumers should prefer `authorAttribution?.displayName`.
   */
  authorName?: string;
  name?: string;
  rating: number;
  text: PlaceReviewText;
  relativePublishTimeDescription?: string;
  originalText?: PlaceReviewText;
  authorAttribution?: {
    displayName: string;
    photoUri?: string;
    uri?: string;
  };
}

export interface BusinessHours {
  periods: Array<{
    openDay: string; // SUN..SAT
    openHour: number; // 0-23
    openMinute: number;
    closeDay?: string;
    closeHour?: number;
    closeMinute?: number;
  }>;
  weekdayDescriptions: string[];
  secondaryHoursType?: string;
}

export interface PopularTimeSlot {
  hour: number;
  popularity: number; // 0-100
}

export interface PlaceDetails {
  id: string;
  displayName?: { text: string; languageCode: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  photos?: PlacePhoto[];
  reviews?: PlaceReview[];
  regularOpeningHours?: BusinessHours;
  currentOpeningHours?: BusinessHours;
  utcOffsetMinutes?: number;
  parkingOptions?: { freeParking?: boolean; paidParking?: boolean };
  accessibilityOptions?: {
    wheelchairAccessibleParking?: boolean;
    wheelchairAccessibleEntrance?: boolean;
    wheelchairAccessibleRestroom?: boolean;
  };
  primaryTypeDisplayName?: { text: string; languageCode: string };
  editorialSummary?: { text: string; languageCode: string };
  // Note: `displayName`, `editorialSummary`, `primaryTypeDisplayName` use the
  // LocalizedText shape {text, languageCode}. Never render the whole object — always use `.text`.
  // popular_times (live) — campo "currentSecondaryOpeningHours" pode trazer popular_times
  // mas em formato complexo; extraímos se disponível.
  livePopularTimes?: PopularTimeSlot[];
}

export interface NearbyPlace {
  id: string;
  displayName?: { text: string; languageCode: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  photos?: PlacePhoto[];
  primaryTypeDisplayName?: { text: string; languageCode: string };
  businessStatus?: "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY";
  distanceMeters?: number;
}

// ---------- Helpers ----------

function fieldMask(fields: string[]): string {
  return fields.join(",");
}

function mapsLanguage(): string {
  // pt-BZ não existe em Places v1; usar pt ou pt-PT
  return "pt";
}

// ---------- Place Details ----------

const PLACE_DETAILS_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "internationalPhoneNumber",
  "nationalPhoneNumber",
  "websiteUri",
  "rating",
  "userRatingCount",
  "googleMapsUri",
  "photos",
  "reviews",
  "regularOpeningHours",
  "currentOpeningHours",
  "utcOffsetMinutes",
  "parkingOptions",
  "accessibilityOptions",
  "primaryTypeDisplayName",
  "editorialSummary",
];

/**
 * Obtém detalhes enriquecidos de um lugar pelo seu Place ID.
 * Use Case: clínicas com `google_place_id` preenchido na BD.
 */
export async function getPlaceDetails(
  placeId: string,
  languageCode = mapsLanguage(),
): Promise<PlaceDetails | null> {
  if (!API_KEY) return null;
  try {
    const url = `${PLACES_V1_BASE}/places/${placeId}?languageCode=${languageCode}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": fieldMask(PLACE_DETAILS_FIELDS),
      },
    });
    if (!res.ok) {
      console.warn("[googlePlaces] getPlaceDetails failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data as PlaceDetails;
  } catch (e) {
    console.warn("[googlePlaces] getPlaceDetails error:", e);
    return null;
  }
}

/**
 * Procura o Place ID mais próximo de uma coordenada usando o tipo fornecido.
 * Útil quando só temos lat/lng mas não o google_place_id na BD.
 */
export async function findPlaceIdByLocation(
  lat: number,
  lng: number,
  type?: string,
): Promise<string | null> {
  if (!API_KEY) return null;
  try {
    const body: any = {
      languageCode: mapsLanguage(),
      includedTypes: type ? [type] : undefined,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 200, // 200m — bem próximo
        },
      },
      rankPreference: "DISTANCE",
      maxResultCount: 1,
    };
    const res = await fetch(`${PLACES_V1_BASE}/places:searchNearby`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.places?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Obtém detalhes de um lugar a partir das coordenadas (procura primeiro o placeId).
 * Cacheia o placeId numa Map para evitar pesquisas repetidas.
 */
const placeIdCache = new Map<string, string | null>();
export async function getPlaceDetailsByCoordinates(
  lat: number,
  lng: number,
  type?: string,
): Promise<PlaceDetails | null> {
  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)},${type || ""}`;
  if (placeIdCache.has(cacheKey)) {
    const id = placeIdCache.get(cacheKey)!;
    return id ? await getPlaceDetails(id) : null;
  }
  const id = await findPlaceIdByLocation(lat, lng, type);
  placeIdCache.set(cacheKey, id);
  if (!id) return null;
  return await getPlaceDetails(id);
}

// ---------- Photo URL ----------

/**
 * Constrói o URL de uma foto do Places Photos API.
 * Atende ao endpoint /places/{name}/media?maxWidthPx=...&maxHeightPx=...
 *
 * Nota: este URL retorna a imagem diretamente (não JSON), ideal para <img src>.
 */
export function buildPhotoUrl(
  photoName: string,
  maxWidthPx = 800,
  maxHeightPx = 600,
): string {
  if (!photoName) return "";
  const url = new URL(`${PLACES_V1_BASE}/${photoName}/media`);
  url.searchParams.set("maxWidthPx", String(maxWidthPx));
  url.searchParams.set("maxHeightPx", String(maxHeightPx));
  if (API_KEY) url.searchParams.set("key", API_KEY);
  return url.toString();
}

// ---------- "Aberto agora?" ----------

/**
 * Determina se um lugar está aberto agora com base nos opening_hours.
 * Usa currentOpeningHours se disponível (já ajustado ao fuso do lugar),
 * senão cai em regularOpeningHours + cálculo manual.
 */
export function isOpenNow(details: PlaceDetails | null): {
  open: boolean;
  closesAt?: string;
  opensAt?: string;
  nextChangeLabel?: string;
} {
  if (!details) return { open: false };

  const hours = details.currentOpeningHours || details.regularOpeningHours;
  if (!hours?.periods?.length) {
    return { open: false };
  }

  const now = new Date();
  // Ajustar para o fuso do lugar se disponível
  let localNow = now;
  if (typeof details.utcOffsetMinutes === "number") {
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    localNow = new Date(utc + details.utcOffsetMinutes * 60000);
  }

  const dayMap = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const today = dayMap[localNow.getDay()];
  const curHour = localNow.getHours();
  const curMin = localNow.getMinutes();
  const curTotalMin = curHour * 60 + curMin;

  for (const period of hours.periods) {
    if (period.openDay !== today) continue;
    const openTotal = period.openHour * 60 + period.openMinute;
    const closeDay = period.closeDay || today;
    let closeTotal = (period.closeHour ?? 0) * 60 + (period.closeMinute ?? 0);

    // Se fecha noutro dia, considera 24h + o tempo até fechar
    if (closeDay !== today) {
      closeTotal = 24 * 60 + closeTotal;
    }

    if (curTotalMin >= openTotal && curTotalMin < closeTotal) {
      const closesAtStr = `${String(period.closeHour ?? 0).padStart(2, "0")}:${String(period.closeMinute ?? 0).padStart(2, "0")}`;
      return {
        open: true,
        closesAt: closesAtStr,
        nextChangeLabel: `Aberto · fecha às ${closesAtStr}`,
      };
    }
  }

  // Encontrar próximo horário de abertura (hoje ou nos próximos dias)
  for (let i = 0; i < 7; i++) {
    const day = dayMap[(localNow.getDay() + i) % 7];
    const period = hours.periods.find((p) => p.openDay === day);
    if (period) {
      const opensAtStr = `${String(period.openHour).padStart(2, "0")}:${String(period.openMinute).padStart(2, "0")}`;
      if (i === 0) {
        return { open: false, opensAt: opensAtStr, nextChangeLabel: `Fechado · abre hoje às ${opensAtStr}` };
      }
      const dayLabel = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][(localNow.getDay() + i) % 7];
      return { open: false, opensAt: opensAtStr, nextChangeLabel: `Fechado · abre ${dayLabel} às ${opensAtStr}` };
    }
  }

  return { open: false };
}

// ---------- Nearby Search (Saúde perto de si) ----------

const NEARBY_FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.photos",
  "places.primaryTypeDisplayName",
  "places.businessStatus",
  "places.distanceMeters",
];

export interface NearbySearchOptions {
  lat: number;
  lng: number;
  radiusMeters?: number; // default 5000 (5km)
  includedTypes?: string[]; // ex: ["hospital", "pharmacy", "doctor"]
  maxResultCount?: number; // default 20
  languageCode?: string;
}

/**
 * Procura lugares de saúde próximos de uma coordenada.
 * Tipos suportados (Places API):
 *  - hospital, pharmacy, doctor, dentist, physiotherapist, veterinary_care
 */
export async function searchNearbyHealth(options: NearbySearchOptions): Promise<NearbyPlace[]> {
  if (!API_KEY) return [];
  const {
    lat,
    lng,
    radiusMeters = 5000,
    includedTypes = ["hospital", "pharmacy", "doctor", "dentist"],
    maxResultCount = 20,
    languageCode = mapsLanguage(),
  } = options;

  try {
    const body = {
      languageCode,
      includedTypes,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radiusMeters,
        },
      },
      rankPreference: "DISTANCE",
      maxResultCount,
    };
    const res = await fetch(`${PLACES_V1_BASE}/places:searchNearby`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": fieldMask(NEARBY_FIELDS),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn("[googlePlaces] searchNearbyHealth failed:", res.status);
      return [];
    }
    const data = await res.json();
    return (data.places as NearbyPlace[]) || [];
  } catch (e) {
    console.warn("[googlePlaces] searchNearbyHealth error:", e);
    return [];
  }
}

// ---------- Text Search ----------

export async function searchTextHealth(
  query: string,
  location?: { lat: number; lng: number },
  radiusMeters = 20000,
): Promise<NearbyPlace[]> {
  if (!API_KEY) return [];
  try {
    const body: any = {
      languageCode: mapsLanguage(),
      textQuery: query,
      maxResultCount: 20,
    };
    if (location) {
      body.locationBias = {
        circle: {
          center: { latitude: location.lat, longitude: location.lng },
          radius: radiusMeters,
        },
      };
    }
    const res = await fetch(`${PLACES_V1_BASE}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": fieldMask(NEARBY_FIELDS),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.places as NearbyPlace[]) || [];
  } catch (e) {
    console.warn("[googlePlaces] searchTextHealth error:", e);
    return [];
  }
}

// ---------- Geocoding (morada → coordenadas) ----------

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId: string;
  partialMatch?: boolean;
}

export async function geocodeAddress(address: string, region = "MZ"): Promise<GeocodeResult[]> {
  if (!API_KEY || !address.trim()) return [];
  try {
    const url = `${GEOCODE_BASE}?address=${encodeURIComponent(address)}&key=${API_KEY}&language=pt&region=${region}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.length) return [];
    return data.results.map((r: any) => ({
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
      formattedAddress: r.formatted_address,
      placeId: r.place_id,
      partialMatch: r.partial_match,
    }));
  } catch (e) {
    console.warn("[googlePlaces] geocodeAddress error:", e);
    return [];
  }
}

/**
 * Reverse geocoding — coordenadas → morada legível.
 */
export async function reverseGeocode(lat: number, lng: number, language = "pt"): Promise<string | null> {
  if (!API_KEY) return null;
  try {
    const url = `${GEOCODE_BASE}?latlng=${lat},${lng}&key=${API_KEY}&language=${language}&result_type=street_address|route|neighborhood|locality`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.length) return null;
    return data.results[0].formatted_address as string;
  } catch {
    return null;
  }
}

// ---------- Tipo Google Maps → nosso tipo interno ----------

export function placesTypeToFacilityType(
  type: string | undefined,
): "hospital" | "clinic" | "pharmacy" | "laboratory" | "doctor" | null {
  if (!type) return null;
  const t = type.toLowerCase();
  if (t.includes("hospital")) return "hospital";
  if (t.includes("pharmacy")) return "pharmacy";
  if (t.includes("doctor") || t.includes("physician")) return "doctor";
  if (t.includes("dentist") || t.includes("dental")) return "doctor";
  if (t.includes("physiotherapist")) return "doctor";
  if (t.includes("laboratory") || t.includes("lab")) return "laboratory";
  if (t.includes("clinic") || t.includes("health")) return "clinic";
  return null;
}

export default {
  getPlaceDetails,
  getPlaceDetailsByCoordinates,
  findPlaceIdByLocation,
  buildPhotoUrl,
  isOpenNow,
  searchNearbyHealth,
  searchTextHealth,
  geocodeAddress,
  reverseGeocode,
  placesTypeToFacilityType,
};
