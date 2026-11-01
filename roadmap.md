# Roadmap

## Em curso: substituir Google Maps por alternativa gratuita (Leaflet + OpenStreetMap)
- [ ] Infra gratuita: `src/lib/openGeo.ts` (Nominatim), `src/lib/openRoutes.ts` (OSRM + haversine + deep links)
- [ ] Componentes: `OpenMap.tsx`, `MapEmbed.tsx`, `StaticMapImage.tsx` (rewrite), `AddressAutocomplete.tsx`
- [ ] Páginas: DeliveryTrackingMap, Facilities, SuggestPlace, NearbyHealth, Addresses, FacilityDetail, MapsPremium, Orders, Checkout, Doctors, Pharmacy, NearbyProvidersWidget, AdminCuration, GoogleCloudHub
- [ ] Edge functions: `import-places` e `seed-mz-google` → Overpass (OSM); `geocode-address` → Nominatim; apagar `place-photo`
- [ ] Limpeza: apagar GoogleMap/GoogleMapEmbed/GoogleAddressInput/googlePlaces/googleMapsLoader/types google-maps; remover chave de maps do vite.config e `@types/google.maps`
- [ ] Verificar: typecheck, build, browser check nas páginas de mapas
