/**
 * Maps Premium — Find health facilities with real-time traffic routing
 *
 * Features:
 *  - User location detection (geolocation)
 *  - Facility list sorted by driving time (with traffic if Google Maps key set)
 *  - Filter by facility type (hospital/clinic/pharmacy/lab/maternity)
 *  - Filter for 24h facilities
 *  - Map embed (Google Maps if configured, OpenStreetMap fallback)
 *  - Step-by-step route drawer with ETA + traffic level
 *  - "Open in maps app" button (iOS/Android/Google Maps)
 *  - Inline call button
 *  - Skeleton/empty/error states
 *  - WCAG 2.1 AA
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Navigation, Clock, Phone, Star, Hospital, Stethoscope, Pill,
  TestTube, Baby, Filter, RefreshCw, AlertTriangle, X, Car, Footprints,
  ExternalLink, Crosshair, CheckCircle2, Circle, ChevronDown, ChevronUp,
  TrafficCone,
} from '@/components/icons/lucide-compat';
import { useCountry } from '@/contexts/CountryContext';
import {
  FacilityWithDistance, GeoPoint, RouteResult,
  computeDistances, getRoute, getCurrentLocation, getEmbedMapUrl,
  openInExternalMaps, reverseGeocode, isMapsConfigured, MOCK_FACILITIES,
} from '@/services/mapsPremium';

type FacilityTypeKey = 'hospital' | 'clinic' | 'pharmacy' | 'lab' | 'maternity';

const FACILITY_ICONS: Record<FacilityTypeKey, React.ComponentType<{ className?: string }>> = {
  hospital: Hospital,
  clinic: Stethoscope,
  pharmacy: Pill,
  lab: TestTube,
  maternity: Baby,
};

const FACILITY_COLORS: Record<FacilityTypeKey, string> = {
  hospital: '#EF4444',
  clinic: '#3B82F6',
  pharmacy: '#10B981',
  lab: '#8B5CF6',
  maternity: '#EC4899',
};

const TRAFFIC_COLORS = {
  light: { color: '#10B981', label: 'Fluido' },
  moderate: { color: '#F59E0B', label: 'Moderado' },
  heavy: { color: '#EF4444', label: 'Intenso' },
};

export default function MapsPremium() {
  const { t } = useCountry();
  const [origin, setOrigin] = useState<GeoPoint | null>(null);
  const [originLabel, setOriginLabel] = useState<string>('');
  const [facilities, setFacilities] = useState<FacilityWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<FacilityTypeKey | 'all'>('all');
  const [only24h, setOnly24h] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [showRoute, setShowRoute] = useState(false);

  const mapsConfigured = useMemo(() => isMapsConfigured(), []);

  const detectLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loc = await getCurrentLocation();
      setOrigin(loc);
      const geocoded = await reverseGeocode(loc);
      setOriginLabel(geocoded.address ?? `${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}`);
      const withDistances = await computeDistances(loc, MOCK_FACILITIES);
      setFacilities(withDistances);
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível obter a sua localização');
      // Fallback to Maputo city center
      const fallback: GeoPoint = { lat: -25.9692, lng: 32.5732, label: 'Maputo' };
      setOrigin(fallback);
      setOriginLabel('Maputo (localização por defeito)');
      const withDistances = await computeDistances(fallback, MOCK_FACILITIES);
      setFacilities(withDistances);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  const filtered = useMemo(() => {
    let list = facilities;
    if (typeFilter !== 'all') list = list.filter((f) => f.type === typeFilter);
    if (only24h) list = list.filter((f) => f.is_24h);
    return list;
  }, [facilities, typeFilter, only24h]);

  const selectedFacility = useMemo(
    () => facilities.find((f) => f.id === selectedId) ?? null,
    [facilities, selectedId],
  );

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    setShowRoute(false);
    setRoute(null);
  };

  const handleGetRoute = async () => {
    if (!origin || !selectedFacility) return;
    setLoadingRoute(true);
    setShowRoute(true);
    try {
      const r = await getRoute(origin, selectedFacility.geo);
      setRoute(r);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao calcular rota');
    } finally {
      setLoadingRoute(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50/40 to-cyan-50/30 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-md">
              <Navigation className="w-5 h-5 text-white" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{t('mapsPremium.title') ?? 'Mapas de Saúde'}</h1>
              <p className="text-xs text-slate-500 leading-tight">
                {mapsConfigured
                  ? (t('mapsPremium.subtitlePremium') ?? 'Com trânsito em tempo real')
                  : (t('mapsPremium.subtitleBasic') ?? 'Localização e distâncias')}
              </p>
            </div>
          </div>
          <button
            onClick={detectLocation}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            aria-label={t('mapsPremium.refreshLocation') ?? 'Atualizar localização'}
          >
            <Crosshair className={`w-4 h-4 text-slate-600 ${loading ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <div role="alert" className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto" aria-label="Fechar"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Origin banner */}
        {origin && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-xl bg-white border border-slate-200 flex items-center gap-3"
          >
            <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500">{t('mapsPremium.yourLocation') ?? 'A sua localização'}</div>
              <div className="text-sm font-medium text-slate-900 truncate">{originLabel || '…'}</div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List */}
          <div>
            {/* Filters */}
            <div className="mb-4 space-y-3">
              <div className="flex items-center gap-1.5 flex-wrap" role="radiogroup" aria-label={t('mapsPremium.filterType') ?? 'Tipo de unidade'}>
                <FilterChip
                  active={typeFilter === 'all'}
                  onClick={() => setTypeFilter('all')}
                  label={t('mapsPremium.all') ?? 'Todos'}
                  role="radio"
                  aria-checked={typeFilter === 'all'}
                />
                {(Object.keys(FACILITY_ICONS) as FacilityTypeKey[]).map((tp) => {
                  const Icon = FACILITY_ICONS[tp];
                  const labelMap: Record<FacilityTypeKey, string> = {
                    hospital: t('mapsPremium.hospital') ?? 'Hospital',
                    clinic: t('mapsPremium.clinic') ?? 'Clínica',
                    pharmacy: t('mapsPremium.pharmacy') ?? 'Farmácia',
                    lab: t('mapsPremium.lab') ?? 'Laboratório',
                    maternity: t('mapsPremium.maternity') ?? 'Maternidade',
                  };
                  return (
                    <FilterChip
                      key={tp}
                      active={typeFilter === tp}
                      onClick={() => setTypeFilter(tp)}
                      label={labelMap[tp]}
                      icon={<Icon className="w-3.5 h-3.5" />}
                      color={FACILITY_COLORS[tp]}
                      role="radio"
                      aria-checked={typeFilter === tp}
                    />
                  );
                })}
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={only24h}
                  onChange={(e) => setOnly24h(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {t('mapsPremium.only24h') ?? 'Só aberto 24h'}
              </label>
            </div>

            {/* List */}
            {loading ? (
              <div className="space-y-3" role="status" aria-busy="true" aria-live="polite">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-200 rounded-2xl animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-10 h-10 mx-auto text-slate-300" aria-hidden />
                <p className="mt-2 text-sm text-slate-500">{t('mapsPremium.noResults') ?? 'Sem unidades encontradas'}</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {filtered.map((f, idx) => (
                  <FacilityCard
                    key={f.id}
                    facility={f}
                    selected={f.id === selectedId}
                    onSelect={() => handleSelect(f.id)}
                    index={idx}
                    t={t}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Map + route */}
          <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
            {/* Map embed */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              {selectedFacility ? (
                <iframe
                  title={selectedFacility.name}
                  src={getEmbedMapUrl(selectedFacility.geo, 14)}
                  className="w-full h-72"
                  loading="lazy"
                />
              ) : origin ? (
                <iframe
                  title="map"
                  src={getEmbedMapUrl(origin, 12)}
                  className="w-full h-72"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-72 bg-slate-100 flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-slate-300" />
                </div>
              )}
            </div>

            {/* Selected facility detail + route */}
            <AnimatePresence mode="wait">
              {selectedFacility && (
                <motion.div
                  key={selectedFacility.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${FACILITY_COLORS[selectedFacility.type]}20`, color: FACILITY_COLORS[selectedFacility.type] }}
                      aria-hidden
                    >
                      {(() => {
                        const Icon = FACILITY_ICONS[selectedFacility.type];
                        return <Icon className="w-5 h-5" />;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900">{selectedFacility.name}</h3>
                      {selectedFacility.address && <p className="text-sm text-slate-500">{selectedFacility.address}</p>}
                      <div className="mt-1 flex items-center gap-2 flex-wrap text-xs">
                        {selectedFacility.is_24h && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> 24h
                          </span>
                        )}
                        {selectedFacility.opening_hours && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="w-3 h-3" /> {selectedFacility.opening_hours}
                          </span>
                        )}
                        {selectedFacility.rating && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <Star className="w-3 h-3 fill-current" /> {selectedFacility.rating}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick stats */}
                  {selectedFacility.distance_km !== undefined && (
                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <div className="text-xs text-slate-500">{t('mapsPremium.distance') ?? 'Distância'}</div>
                        <div className="font-bold text-slate-900">{selectedFacility.distance_km} km</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <div className="text-xs text-slate-500">{t('mapsPremium.eta') ?? 'ETA'}</div>
                        <div className="font-bold text-slate-900">
                          {selectedFacility.duration_with_traffic_min ?? selectedFacility.duration_min} min
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <div className="text-xs text-slate-500">{t('mapsPremium.traffic') ?? 'Trânsito'}</div>
                        <div
                          className="font-bold inline-flex items-center gap-1 justify-center"
                          style={{ color: TRAFFIC_COLORS[selectedFacility.traffic_level ?? 'light'].color }}
                        >
                          <TrafficCone className="w-3.5 h-3.5" />
                          {TRAFFIC_COLORS[selectedFacility.traffic_level ?? 'light'].label}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleGetRoute}
                      disabled={loadingRoute}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      {loadingRoute ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                      {t('mapsPremium.getRoute') ?? 'Ver rota'}
                    </button>
                    {selectedFacility.phone && (
                      <a
                        href={`tel:${selectedFacility.phone}`}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      >
                        <Phone className="w-4 h-4" />
                        {t('mapsPremium.call') ?? 'Ligar'}
                      </a>
                    )}
                    <button
                      onClick={() => openInExternalMaps(selectedFacility.geo, selectedFacility.name)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {t('mapsPremium.openApp') ?? 'Abrir app'}
                    </button>
                  </div>

                  {/* Route details */}
                  <AnimatePresence>
                    {showRoute && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-slate-100"
                      >
                        <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                          <Car className="w-4 h-4" aria-hidden /> {t('mapsPremium.routeSteps') ?? 'Indicações'}
                        </h4>
                        {loadingRoute ? (
                          <div className="space-y-2">
                            {[0, 1, 2].map((i) => <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />)}
                          </div>
                        ) : route ? (
                          <>
                            <div className="grid grid-cols-3 gap-2 mb-3 text-center text-xs">
                              <div><div className="text-slate-500">{t('mapsPremium.distance') ?? 'Distância'}</div><div className="font-bold">{route.total_distance_km} km</div></div>
                              <div><div className="text-slate-500">{t('mapsPremium.eta') ?? 'ETA'}</div><div className="font-bold">{route.total_duration_with_traffic_min} min</div></div>
                              <div>
                                <div className="text-slate-500">{t('mapsPremium.traffic') ?? 'Trânsito'}</div>
                                <div className="font-bold" style={{ color: TRAFFIC_COLORS[route.traffic_level].color }}>
                                  {TRAFFIC_COLORS[route.traffic_level].label}
                                </div>
                              </div>
                            </div>
                            <ol className="space-y-2 text-sm">
                              {route.steps.map((s, i) => (
                                <li key={i} className="flex gap-2">
                                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs flex items-center justify-center font-bold">
                                    {i + 1}
                                  </span>
                                  <span className="text-slate-700">{s.instruction}</span>
                                  <span className="ml-auto text-xs text-slate-400 flex-shrink-0">{s.distance_km} km</span>
                                </li>
                              ))}
                            </ol>
                          </>
                        ) : null}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------- Facility card ---------- */

function FacilityCard({ facility, selected, onSelect, index, t }: {
  facility: FacilityWithDistance; selected: boolean; onSelect: () => void; index: number; t: any;
}) {
  const Icon = FACILITY_ICONS[facility.type];
  const color = FACILITY_COLORS[facility.type];
  const traffic = TRAFFIC_COLORS[facility.traffic_level ?? 'light'];

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
    >
      <button
        onClick={onSelect}
        className={`w-full text-left p-3 rounded-2xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
          selected ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
        }`}
        aria-pressed={selected}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}20`, color }}
            aria-hidden
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900 truncate">{facility.name}</span>
              {facility.is_24h && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">24h</span>
              )}
            </div>
            {facility.address && <div className="text-xs text-slate-500 truncate">{facility.address}</div>}
          </div>
          {facility.distance_km !== undefined && (
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-bold text-slate-900">{facility.distance_km} km</div>
              <div className="text-xs" style={{ color: traffic.color }}>
                {facility.duration_with_traffic_min ?? facility.duration_min} min · {traffic.label}
              </div>
            </div>
          )}
        </div>
      </button>
    </motion.li>
  );
}

/* ---------- Filter chip ---------- */

function FilterChip({ active, onClick, label, icon, color, ...rest }: {
  active: boolean; onClick: () => void; label: string; icon?: React.ReactNode; color?: string; role?: string;
} & React.AriaAttributes) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
        active ? 'text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
      style={active && color ? { background: color } : active ? { background: '#1E40AF' } : {}}
      {...rest}
    >
      {icon}
      {label}
    </button>
  );
}
