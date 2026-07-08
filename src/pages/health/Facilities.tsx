import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Hospital, Building2, FlaskConical, MapPin, Phone, CheckCircle2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleMap, type GMarker } from "@/components/maps/GoogleMap";
import { haversineKm } from "@/lib/googleRoutes";
import { Navigation } from "lucide-react";

const TYPES = [
  { key: "clinic", label: "Clínicas", icon: Building2 },
  { key: "hospital", label: "Hospitais", icon: Hospital },
  { key: "laboratory", label: "Laboratórios", icon: FlaskConical },
] as const;

export default function Facilities() {
  const nav = useNavigate();
  const { city, location: userLoc } = useLocation() as any;
  const [sp, setSp] = useSearchParams();
  const initial = (sp.get("type") as any) || "clinic";
  const [tab, setTab] = useState<string>(initial);
  const [onlyMyCity, setOnlyMyCity] = useState<boolean>(() => localStorage.getItem("filter_only_my_city") !== "0");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { localStorage.setItem("filter_only_my_city", onlyMyCity ? "1" : "0"); }, [onlyMyCity]);
  useEffect(() => { setSp({ type: tab }, { replace: true }); }, [tab]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase.from("clinics").select("*").eq("is_active", true).eq("type", tab);
      if (onlyMyCity && city) q = q.eq("city", city);
      const { data } = await q.order("is_verified", { ascending: false }).limit(100);
      setItems(data || []);
      setLoading(false);
    })();
  }, [tab, city, onlyMyCity]);

  const meta = TYPES.find(t => t.key === tab)!;

  // Ordena por distância se tivermos localização
  const withDist = items.map((c: any) => ({
    ...c,
    _dist: (userLoc?.lat && c.latitude && c.longitude)
      ? haversineKm({ lat: userLoc.lat, lng: userLoc.lng }, { lat: c.latitude, lng: c.longitude })
      : null,
  })).sort((a, b) => (a._dist ?? 9999) - (b._dist ?? 9999));

  const markers: GMarker[] = withDist
    .filter(c => c.latitude && c.longitude)
    .slice(0, 40)
    .map(c => ({
      id: c.id, lat: c.latitude, lng: c.longitude,
      title: c.name, description: c.address ?? c.city,
      color: c.is_verified ? "#047857" : "#f59e0b",
    }));

  const openDirections = (c: any) => {
    if (!c.latitude || !c.longitude) return;
    const origin = userLoc ? `${userLoc.lat},${userLoc.lng}` : "";
    const url = `https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}${origin ? `&origin=${origin}` : ""}&travelmode=driving`;
    window.open(url, "_blank");
  };

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <meta.icon className="h-6 w-6 text-primary" /> Instituições de saúde
        </h1>
        <p className="text-sm text-muted-foreground">
          {onlyMyCity && city ? `${meta.label} em ${city}` : `${meta.label} · todas as cidades`}
        </p>
      </div>

      <div className="flex items-center justify-between bento-card p-3">
        <Label htmlFor="only-city" className="text-sm cursor-pointer">
          {onlyMyCity ? `Só na minha cidade (${city})` : "Mostrar tudo"}
        </Label>
        <Switch id="only-city" checked={onlyMyCity} onCheckedChange={setOnlyMyCity} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full">
          {TYPES.map(t => (
            <TabsTrigger key={t.key} value={t.key} className="flex items-center gap-1">
              <t.icon className="h-4 w-4" />{t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {markers.length > 0 && (
          <div className="mt-4 rounded-2xl overflow-hidden border">
            <GoogleMap
              center={userLoc ?? { lat: markers[0].lat, lng: markers[0].lng }}
              markers={markers}
              zoom={12}
              height={260}
            />
          </div>
        )}

        {TYPES.map(t => (
          <TabsContent key={t.key} value={t.key} className="mt-4">
            {loading ? (
              <div className="grid gap-3 md:grid-cols-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
            ) : withDist.length === 0 ? (
              <div className="bento-card p-8 text-center text-muted-foreground">
                <t.icon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="font-semibold">
                  {onlyMyCity && city
                    ? `Sem ${t.label.toLowerCase()} aprovadas em ${city}.`
                    : `Sem ${t.label.toLowerCase()} registadas.`}
                </p>
                {onlyMyCity && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setOnlyMyCity(false)}>
                    <Globe className="h-4 w-4 mr-1" /> Ver em todas as cidades
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {withDist.map((c: any) => (
                  <div key={c.id} className="bento-card p-4 hover:shadow-medium transition-all">
                   <button onClick={() => nav(`/clinic/${c.id}`)} className="w-full text-left">
                    <div className="flex items-start gap-3">
                      {c.logo_url ? (
                        <img src={c.logo_url} alt={c.name} className="h-14 w-14 rounded-xl object-cover" />
                      ) : (
                        <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                          <t.icon className="h-7 w-7 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold truncate">{c.name}</h3>
                          {c.is_verified && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.city}</span>
                          {c._dist !== null && (
                            <span className="flex items-center gap-1 text-primary font-semibold">
                              {c._dist < 1 ? `${Math.round(c._dist*1000)} m` : `${c._dist.toFixed(1)} km`}
                            </span>
                          )}
                          {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                          <Badge variant="outline" className="h-4 text-[9px]">{t.label.slice(0, -1)}</Badge>
                        </div>
                      </div>
                    </div>
                   </button>
                   {c.latitude && c.longitude && (
                     <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => openDirections(c)}>
                       <Navigation className="h-3.5 w-3.5 mr-1" /> Ver rotas no Google Maps
                     </Button>
                   )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}