import { Seo } from "@/components/Seo";
import { useState, useEffect } from "react";
import { useNavigate, useLocation as useRouterLocation } from "react-router-dom";
import { Search, Pill, Star, Clock, FileText, X, Zap, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";
import { useCountry } from "@/contexts/CountryContext";
import { Tables } from "@/integrations/supabase/types";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { haversineKm } from "@/lib/googleRoutes";
import { MapPin } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";

// Simplify type to avoid deep instantiation errors
type Store = any;

export default function Pharmacy() {
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const { city: selectedCity, coordinates } = useLocation();
  const { country, t } = useCountry();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todas");
  const [pharmacies, setPharmacies] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  const filters = [
    t('pharmacy.filters.all'),
    t('pharmacy.filters.24h'),
    t('pharmacy.filters.top_rated'),
    t('pharmacy.filters.nearby')
  ];

  useEffect(() => {
    if (!activeFilter || !filters.includes(activeFilter)) {
      setActiveFilter(filters[0]);
    }
  }, [filters]);
  const [activePrescription, setActivePrescription] = useState<string | null>(null);
  const [onlyMyCity, setOnlyMyCity] = useState<boolean>(() => {
    return localStorage.getItem("filter_only_my_city") !== "0";
  });

  useEffect(() => {
    localStorage.setItem("filter_only_my_city", onlyMyCity ? "1" : "0");
  }, [onlyMyCity]);

  useEffect(() => {
    const fromState = (routerLocation.state as any)?.prescription_id as string | undefined;
    if (fromState) {
      sessionStorage.setItem('active_prescription', JSON.stringify({ id: fromState, priority: true }));
      setActivePrescription(fromState);
      return;
    }
    const stored = sessionStorage.getItem('active_prescription');
    if (stored) {
      try { setActivePrescription(JSON.parse(stored).id); } catch {}
    }
  }, [routerLocation.state]);

  const clearPrescription = () => {
    sessionStorage.removeItem('active_prescription');
    setActivePrescription(null);
  };

  useEffect(() => {
    fetchPharmacies();
  }, [selectedCity, onlyMyCity]);

  const fetchPharmacies = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("stores")
        .select("*")
        .eq("type", "pharmacy")
        .eq("is_active", true);
      if (onlyMyCity && selectedCity) query = query.eq("city", selectedCity);
      const { data, error } = await query;

      if (error) throw error;
      // Deduplicate by name to avoid showing the same pharmacy twice
      const unique = (data || []).filter((p: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.name === p.name) === i);
      setPharmacies(unique);
    } catch (error) {
      console.error("Erro ao carregar farmácias:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPharmacies = pharmacies.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedPharmacies = [...filteredPharmacies]
    .map(p => {
      let distance = Infinity;
      if (coordinates && p.latitude && p.longitude) {
        distance = haversineKm(
          { lat: coordinates.latitude, lng: coordinates.longitude },
          { lat: Number(p.latitude), lng: Number(p.longitude) }
        );
      }
      return { ...p, distance };
    })
    .sort((a, b) => {
      switch (activeFilter) {
        case t('pharmacy.filters.top_rated'):
          return (b.rating || 0) - (a.rating || 0);
        case t('pharmacy.filters.nearby'):
          return a.distance - b.distance;
        case t('pharmacy.filters.24h'):
          // assume as que têm delivery_fee mais alto ou flag (não há is_24h explicito, mas podemos simular)
          return (a.delivery_fee || 0) - (b.delivery_fee || 0);
        default:
          return 0;
      }
    });

  return (
    <>
      <Seo title={`${t('pharmacy.title')} 24h | MedWallet`} description={t('pharmacy.subtitle')} path="/pharmacy" />
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground">{t('pharmacy.title')}</h1>
        <p className="text-muted-foreground text-sm font-medium">
          {t('pharmacy.subtitle')}{onlyMyCity && selectedCity ? ` em ${selectedCity}` : ` · ${t('pharmacy.all_cities')}`}
        </p>
      </div>

      <div className="flex items-center justify-between bento-card p-3 border-2 border-primary/10">
        <Label htmlFor="only-city" className="text-sm cursor-pointer font-bold">
          {onlyMyCity ? t('pharmacy.only_my_city', { city: selectedCity }) : t('pharmacy.show_all')}
        </Label>
        <Switch id="only-city" checked={onlyMyCity} onCheckedChange={setOnlyMyCity} />
      </div>

      {activePrescription && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 flex items-center gap-3 animate-fade-in">
          <div className="p-2 bg-primary/20 rounded-lg">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold flex items-center gap-1">
              <Zap className="h-3 w-3 text-pharmacy" /> {t('pharmacy.order_with_prescription')}
            </p>
            <p className="text-xs text-muted-foreground">{t('pharmacy.priority_notice')}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearPrescription}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Express Delivery Banner */}
      <div className="bg-pharmacy/10 rounded-xl p-4 flex items-center gap-3">
        <div className="p-2 bg-pharmacy/20 rounded-lg">
          <Pill className="h-6 w-6 text-pharmacy" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{t('pharmacy.express_delivery')}</h3>
          <p className="text-xs text-muted-foreground">{t('pharmacy.delivery_time_desc')}</p>
        </div>
        <Badge className="bg-pharmacy text-white">24h</Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('pharmacy.search_placeholder')}
          className="pl-10 h-11 rounded-xl"
        />
      </div>

      {/* Filters */}
      <div className="flex overflow-x-auto gap-2 no-scrollbar -mx-4 px-4">
        {filters.map((filter) => (
          <Badge
            key={filter}
            variant={activeFilter === filter ? "default" : "outline"}
            className="cursor-pointer whitespace-nowrap px-4 py-2 rounded-full transition-all"
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </Badge>
        ))}
      </div>

      {/* Pharmacy List */}
      <div className="flex flex-col gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl overflow-hidden border border-border p-3 flex gap-3">
              <Skeleton className="w-20 h-20 rounded-lg" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))
        ) : sortedPharmacies.length === 0 ? (
          <div className="bento-card p-8 text-center text-muted-foreground">
            <Pill className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-semibold">
              {onlyMyCity && selectedCity
                ? t('pharmacy.no_pharmacies_city', { city: selectedCity })
                : t('pharmacy.no_pharmacies')}
            </p>
            {onlyMyCity ? (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setOnlyMyCity(false)}>
                <Globe className="h-4 w-4 mr-1" /> {t('pharmacy.view_all_cities')}
              </Button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm mt-1">{t('pharmacy.try_adjust_search')}</p>
                <div className="pt-4 border-t">
                  <p className="text-xs font-bold uppercase tracking-widest mb-3">{t('home.have_pharmacy')}</p>
                  <Button variant="outline" className="rounded-xl border-pharmacy text-pharmacy hover:bg-pharmacy/5" onClick={() => navigate('/store/register')}>
                    <Pill className="h-4 w-4 mr-2" /> {t('profile.register_pharmacy')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          sortedPharmacies.map((pharmacy) => (
            <div
              key={pharmacy.id}
              onClick={() => navigate(`/store/${pharmacy.id}`)}
              className="bg-card rounded-xl border border-border p-3 flex gap-3 transition-all hover:shadow-medium cursor-pointer"
            >
              <div className="w-20 h-20 rounded-lg flex-shrink-0 overflow-hidden">
                <SafeImage
                  src={pharmacy.image_url || undefined}
                  alt={pharmacy.name}
                  className="w-full h-full object-cover"
                  fallbackSrc="/placeholder.svg"
                />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-medium text-sm">{pharmacy.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {pharmacy.city} · {pharmacy.description || "Farmácia"}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-pharmacy text-pharmacy" />
                    <span className="font-medium">{pharmacy.rating || "Novo"}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{pharmacy.distance !== Infinity ? `${pharmacy.distance.toFixed(1)} km` : pharmacy.city}</span>
                  </div>
                  {pharmacy.delivery_time && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{pharmacy.delivery_time}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  {(pharmacy as any).delivery_enabled ? (
                    <span className="text-xs text-muted-foreground">
                      {t('pharmacy.delivery')}: {pharmacy.delivery_fee || 0} {country?.currency_code || 'MZN'}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t('pharmacy.pickup')}</span>
                  )}
                  <Button size="sm" className="h-7 text-xs rounded-full bg-pharmacy hover:bg-pharmacy/90">
                    {t('pharmacy.view_products')}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
    </>
  );
}
