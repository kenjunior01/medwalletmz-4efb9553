import { Seo } from "@/components/Seo";
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";
import { useCountry } from '@/contexts/CountryContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Hospital, Building2, FlaskConical, MapPin, CheckCircle2, Globe, Clock, Filter, Navigation, Search, ChevronDown, ChevronRight, Phone, PhoneCall, X, Star, Shield, Map, List, RotateCcw, SlidersHorizontal, Clock3, TrendingUp, Zap } from '@/components/icons/lucide-compat';
import { SafeImage } from "@/components/ui/safe-image";
import { GoogleMap, type GMarker } from "@/components/maps/GoogleMap";
import { haversineKm } from "@/lib/googleRoutes";
import { buildGoogleMapsDirectionsUrl, getSafeImageUrl } from "@/lib/healthRoutes";
import { motion, AnimatePresence } from "framer-motion";

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" },
  }),
};

const filterPanelVariants = {
  collapsed: { height: 0, opacity: 0 },
  open: { height: "auto", opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } },
};

export default function Facilities() {
  const nav = useNavigate();
  const { city, coordinates, requestLocation } = useLocation();
  const { t, country } = useCountry();
  const userLoc = coordinates ? { lat: coordinates.latitude, lng: coordinates.longitude } : null;
  const [sp, setSp] = useSearchParams();
  const initial = (sp.get("type") as string) || "clinic";
  const [tab, setTab] = useState<string>(initial);
  const [onlyMyCity, setOnlyMyCity] = useState<boolean>(() => localStorage.getItem("filter_only_my_city") !== "0");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("distance");
  const [showMap, setShowMap] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("facilities_recent_searches") || "[]"); } catch { return []; }
  });

  const TYPES = [
    { key: "clinic", label: t("facilities.type_clinic"), icon: Building2 },
    { key: "hospital", label: t("facilities.type_hospital"), icon: Hospital },
    { key: "laboratory", label: t("facilities.type_laboratory"), icon: FlaskConical },
  ];

  const SPECIALTIES = [
    { key: "all", label: t("facilities.specialty_all") },
    { key: "general", label: t("facilities.specialty_general") },
    { key: "cardiology", label: t("facilities.specialty_cardiology") },
    { key: "pediatrics", label: t("facilities.specialty_pediatrics") },
    { key: "gynecology", label: t("facilities.specialty_gynecology") },
    { key: "dermatology", label: t("facilities.specialty_dermatology") },
    { key: "orthopedics", label: t("facilities.specialty_orthopedics") },
    { key: "neurology", label: t("facilities.specialty_neurology") },
    { key: "ophthalmology", label: t("facilities.specialty_ophthalmology") },
    { key: "psychiatry", label: t("facilities.specialty_psychiatry") },
    { key: "dental", label: t("facilities.specialty_dental") },
  ];

  const SORT_OPTIONS = [
    { key: "distance", label: t("facilities.sort_distance") },
    { key: "rating", label: t("facilities.sort_rating") },
    { key: "name", label: t("facilities.sort_name") },
    { key: "availability", label: t("facilities.sort_availability") },
  ];

  const saveRecentSearch = useCallback((q: string) => {
    if (!q.trim()) return;
    const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("facilities_recent_searches", JSON.stringify(updated));
  }, [recentSearches]);

  useEffect(() => { localStorage.setItem("filter_only_my_city", onlyMyCity ? "1" : "0"); }, [onlyMyCity]);
  useEffect(() => { setSp({ type: tab }, { replace: true }); }, [tab]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase.from("clinics").select("*").eq("is_active", true).eq("type", tab);
      if (onlyMyCity && city) q = q.eq("city", city);
      if (specialty !== "all") q = q.or(`specialties.ilike.%${specialty}%,medical_specialties.ilike.%${specialty}%`);
      const { data, error: fetchError } = await q.order("is_verified", { ascending: false }).limit(100);
      if (fetchError) throw fetchError;
      setItems(data || []);
    } catch (err: any) {
      setError(err?.message || t("common.error"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab, city, onlyMyCity, specialty]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const meta = TYPES.find(tp => tp.key === tab)!;

  function isOpenNow(operatingHours: string | null | undefined): boolean | null {
    if (!operatingHours) return null;
    const match = operatingHours.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const now = new Date();
    const day = now.getDay();
    if (day === 0 || day === 6) return false;
    const openMins = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    const closeMins = parseInt(match[3], 10) * 60 + parseInt(match[4], 10);
    const currentMins = now.getHours() * 60 + now.getMinutes();
    return currentMins >= openMins && currentMins < closeMins;
  }

  const withDist = items.map((c: any) => ({
    ...c,
    _dist: (userLoc?.lat && c.latitude && c.longitude)
      ? haversineKm({ lat: userLoc.lat, lng: userLoc.lng }, { lat: c.latitude, lng: c.longitude })
      : null,
    _open: isOpenNow(c.operating_hours),
  }));

  const searched = withDist.filter((c: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.address?.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q);
  }).filter((c: any) => {
    if (onlyOpen) return c._open === true;
    return true;
  });

  const sorted = [...searched].sort((a, b) => {
    switch (sortBy) {
      case "distance": return (a._dist ?? 9999) - (b._dist ?? 9999);
      case "rating": return ((b.rating ?? 0) - (a.rating ?? 0));
      case "name": return (a.name || "").localeCompare(b.name || "");
      case "availability": return (a._open === true ? 0 : 1) - (b._open === true ? 0 : 1);
      default: return 0;
    }
  });

  const markers: GMarker[] = sorted
    .filter(c => c.latitude && c.longitude)
    .slice(0, 40)
    .map(c => ({
      id: c.id, lat: c.latitude, lng: c.longitude,
      title: c.name, description: c.address ?? c.city,
      color: c.is_verified ? "#047857" : "#f59e0b",
    }));

  const openDirections = (c: any) => {
    if (!c.latitude || !c.longitude) return;
    const origin = userLoc ? { lat: userLoc.lat, lng: userLoc.lng } : null;
    const destination = { lat: c.latitude, lng: c.longitude };
    const url = buildGoogleMapsDirectionsUrl(origin, destination, "driving");
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSearchSubmit = () => { saveRecentSearch(searchQuery); };

  return (
    <>
      <Seo
        title={t("facilities.seo_title")}
        description={t("facilities.seo_description")}
        path="/health/facilities"
      />
      <div className="p-4 flex flex-col gap-4 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <meta.icon className="h-6 w-6 text-primary" aria-hidden="true" /> {t("facilities.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {onlyMyCity && city
              ? t("facilities.subtitle_in_city", { type: meta.label, city })
              : t("facilities.subtitle_all_cities", { type: meta.label })}
          </p>
        </div>

        {/* Search form with recent searches */}
        <form
          role="search"
          aria-label={t("facilities.search_label")}
          className="flex flex-col gap-2"
          onSubmit={e => { e.preventDefault(); handleSearchSubmit(); }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Input
              placeholder={t("facilities.search_placeholder")}
              className="pl-9 pr-9 h-11"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label={t("health.search_facilities")}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t("facilities.clear_search")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Recent searches chips */}
          {recentSearches.length > 0 && !searchQuery && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar" role="list" aria-label={t("facilities.recent_searches")}>
              {recentSearches.map(s => (
                <button
                  key={s}
                  role="listitem"
                  onClick={() => setSearchQuery(s)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted/60 text-xs text-muted-foreground hover:bg-muted transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Clock className="h-3 w-3" aria-hidden="true" /> {s}
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Type tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full" role="tablist">
            {TYPES.map(tp => (
              <TabsTrigger
                key={tp.key}
                value={tp.key}
                className="flex items-center justify-center gap-1 min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                role="tab"
                aria-selected={tab === tp.key}
              >
                <tp.icon className="h-4 w-4" aria-hidden="true" /> {tp.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Action row: city toggle, filters, sort, list/map toggle, geolocation */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bento-card p-2 pr-3">
              <Switch
                id="only-city"
                checked={onlyMyCity}
                onCheckedChange={setOnlyMyCity}
                aria-label={t("facilities.only_my_city_label")}
              />
              <Label htmlFor="only-city" className="text-xs cursor-pointer whitespace-nowrap">
                {onlyMyCity && city
                  ? t("facilities.only_my_city_on", { city })
                  : t("facilities.only_my_city_off")}
              </Label>
            </div>

            <button
              onClick={() => setFiltersOpen(o => !o)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring ${filtersOpen ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}
              aria-expanded={filtersOpen}
              aria-controls="filters-panel"
              aria-label={t("facilities.toggle_filters")}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> {t("facilities.filters")}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>

            <button
              onClick={() => { if (!userLoc) requestLocation(); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t("facilities.use_my_location")}
            >
              <Navigation className="h-4 w-4" aria-hidden="true" /> {t("facilities.my_location")}
            </button>

            {markers.length > 0 && (
              <button
                onClick={() => setShowMap(m => !m)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors min-h-[44px] ml-auto focus-visible:ring-2 focus-visible:ring-ring ${showMap ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}
                aria-label={showMap ? t("facilities.show_list") : t("facilities.show_map")}
                aria-pressed={showMap}
              >
                {showMap ? <List className="h-4 w-4" /> : <Map className="h-4 w-4" />}
                {showMap ? t("facilities.list_view") : t("facilities.map_view")}
              </button>
            )}
          </div>

          {/* Collapsible filter panel */}
          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                id="filters-panel"
                initial="collapsed"
                animate="open"
                exit="collapsed"
                variants={filterPanelVariants}
                className="overflow-hidden"
              >
                <div className="bento-card p-4 flex flex-col gap-4">
                  {/* Specialty filter */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">{t("facilities.specialty")}</p>
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar" role="listbox" aria-label={t("health.filter_by_specialty")}>
                      {SPECIALTIES.map(s => (
                        <button
                          key={s.key}
                          role="option"
                          aria-selected={specialty === s.key}
                          onClick={() => setSpecialty(s.key)}
                          className={`px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring ${
                            specialty === s.key
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/50 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sort + open now filter */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("facilities.sort_by")}</p>
                      {SORT_OPTIONS.map(s => (
                        <button
                          key={s.key}
                          onClick={() => setSortBy(s.key)}
                          className={`px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring ${
                            sortBy === s.key
                              ? "bg-primary/10 text-primary border border-primary/30"
                              : "bg-muted/50 text-muted-foreground hover:bg-muted"
                          }`}
                          aria-pressed={sortBy === s.key}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setOnlyOpen(o => !o)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring ${
                        onlyOpen
                          ? "bg-emerald/10 text-emerald border border-emerald/30"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                      aria-pressed={onlyOpen}
                      aria-label={t("facilities.open_now_only")}
                    >
                      <Zap className="h-3.5 w-3.5" aria-hidden="true" /> {t("facilities.open_now")}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Map view */}
          <AnimatePresence>
            {showMap && markers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl overflow-hidden border"
              >
                <GoogleMap
                  center={userLoc ?? { lat: markers[0].lat, lng: markers[0].lng }}
                  markers={markers}
                  zoom={12}
                  height={300}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {TYPES.map(tp => (
            <TabsContent key={tp.key} value={tp.key} className="mt-0">
              {/* Loading skeleton */}
              {loading ? (
                <div role="status" aria-label={t("common.loading")} className="grid gap-3 md:grid-cols-2">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bento-card p-4 flex items-start gap-3">
                      <Skeleton className="h-14 w-14 rounded-xl flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-1/2" />
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16 rounded-full" />
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                /* Error state with retry */
                <div className="bento-card p-8 text-center" role="alert">
                  <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                    <X className="h-6 w-6 text-destructive" />
                  </div>
                  <p className="font-semibold text-destructive mb-1">{t("facilities.error_title")}</p>
                  <p className="text-sm text-muted-foreground mb-4">{error}</p>
                  <Button
                    variant="outline"
                    className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={fetchData}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" /> {t("facilities.retry")}
                  </Button>
                </div>
              ) : sorted.length === 0 ? (
                /* Empty state with suggestions */
                <div className="bento-card p-8 text-center text-muted-foreground" role="status">
                  <tp.icon className="h-11 w-11 mx-auto mb-2 opacity-40" aria-hidden="true" />
                  <p className="font-semibold mb-1">
                    {onlyMyCity && city
                      ? t("facilities.empty_in_city", { type: meta.label.toLowerCase(), city })
                      : t("facilities.empty_no_results", { type: meta.label.toLowerCase() })}
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1.5 mt-3 text-left max-w-xs mx-auto">
                    <li className="flex items-center gap-2">
                      <ChevronRight className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                      {t("facilities.suggestion_different_filter")}
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                      {t("facilities.suggestion_expand_radius")}
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                      {t("facilities.suggestion_check_spelling")}
                    </li>
                  </ul>
                  <div className="flex gap-2 justify-center mt-4 flex-wrap">
                    {onlyMyCity && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => setOnlyMyCity(false)}
                      >
                        <Globe className="h-4 w-4 mr-1" aria-hidden="true" /> {t("facilities.see_all_cities")}
                      </Button>
                    )}
                    {searchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => { setSearchQuery(""); setSpecialty("all"); setOnlyOpen(false); }}
                      >
                        <X className="h-4 w-4 mr-1" aria-hidden="true" /> {t("facilities.clear_filters")}
                      </Button>
                    )}
                  </div>
                  {!onlyMyCity && (
                    <div className="pt-4 mt-4 border-t border-border/50">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 opacity-60">{t("facilities.manager_cta_title")}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-2xl border-primary/20 text-primary hover:bg-primary/5 font-bold min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => nav(tab === "laboratory" ? "/lab/register" : "/clinic/register")}
                      >
                        {t("facilities.register_cta", { type: meta.label.slice(0, -1) })}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                /* Facility list */
                <div className="grid gap-3 md:grid-cols-2" role="list" aria-label={t("facilities.facility_list")}>
                  {sorted.map((c: any, i: number) => (
                    <motion.div
                      key={c.id}
                      custom={i}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      className="bento-card p-4 hover:shadow-medium transition-all"
                      role="listitem"
                    >
                      <button
                        onClick={() => nav(`/health/facilities/${c.id}`)}
                        className="w-full text-left min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                        aria-label={`${c.name} - ${c.city || ""}`}
                      >
                        <div className="flex items-start gap-3">
                          {c.logo_url || c.image_url ? (
                            <SafeImage
                              src={getSafeImageUrl(c.logo_url || c.image_url)}
                              alt={c.name}
                              className="h-14 w-14 rounded-xl object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <tp.icon className="h-7 w-7 text-primary" aria-hidden="true" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-bold truncate">{c.name}</h3>
                              {c.is_verified && (
                                <span className="flex items-center gap-0.5" title={t("facilities.verified_tooltip")}>
                                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" aria-label={t("facilities.verified")} />
                                  <Shield className="h-3 w-3 text-primary/70" aria-hidden="true" />
                                </span>
                              )}
                            </div>
                            {c.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{c.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" aria-hidden="true" />{c.city}
                              </span>
                              {c._dist !== null && (
                                <span className="flex items-center gap-1 text-primary font-semibold">
                                  {c._dist < 1 ? `${Math.round(c._dist * 1000)} m` : `${c._dist.toFixed(1)} km`}
                                </span>
                              )}
                              {c.rating > 0 && (
                                <span className="flex items-center gap-0.5 text-amber-600">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                                  <span className="font-semibold">{c.rating.toFixed(1)}</span>
                                </span>
                              )}
                              {c._open === true && (
                                <span className="flex items-center gap-1 text-emerald font-semibold">
                                  <Clock3 className="h-3 w-3" aria-hidden="true" />{t("facilities.open")}
                                </span>
                              )}
                              {c._open === false && (
                                <span className="flex items-center gap-1 text-destructive font-semibold">
                                  <Clock className="h-3 w-3" aria-hidden="true" />{t("facilities.closed")}
                                </span>
                              )}
                              <Badge variant="outline" className="h-5 text-[9px] px-1.5">{tp.label.slice(0, -1)}</Badge>
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Quick actions */}
                      <div className="flex gap-2 mt-3">
                        {c.phone && (
                          <a
                            href={`tel:${c.phone}`}
                            className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={t("facilities.call_facility", { name: c.name })}
                          >
                            <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" /> {t("facilities.call")}
                          </a>
                        )}
                        {c.latitude && c.longitude && (
                          <button
                            className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => openDirections(c)}
                            aria-label={t("facilities.get_directions", { name: c.name })}
                          >
                            <Navigation className="h-3.5 w-3.5" aria-hidden="true" /> {t("facilities.directions")}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Results count */}
        {!loading && !error && sorted.length > 0 && (
          <p className="text-xs text-muted-foreground text-center" role="status">
            {t("facilities.results_count", { count: sorted.length.toString(), type: meta.label.toLowerCase() })}
          </p>
        )}
      </div>
    </>
  );
}
