import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Hospital, Building2, FlaskConical, MapPin, Phone, CheckCircle2 } from "lucide-react";

const TYPES = [
  { key: "clinic", label: "Clínicas", icon: Building2 },
  { key: "hospital", label: "Hospitais", icon: Hospital },
  { key: "laboratory", label: "Laboratórios", icon: FlaskConical },
] as const;

export default function Facilities() {
  const nav = useNavigate();
  const { city } = useLocation();
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

        {TYPES.map(t => (
          <TabsContent key={t.key} value={t.key} className="mt-4">
            {loading ? (
              <div className="grid gap-3 md:grid-cols-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
            ) : items.length === 0 ? (
              <div className="bento-card p-8 text-center text-muted-foreground">
                <t.icon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="font-semibold">Sem {t.label.toLowerCase()} {onlyMyCity && city ? `em ${city}` : "registados"}.</p>
                {onlyMyCity && (
                  <p className="text-xs mt-2">Desliga o filtro acima para ver noutras cidades.</p>
                )}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((c: any) => (
                  <button key={c.id} onClick={() => nav(`/clinic/${c.id}`)}
                    className="bento-card p-4 text-left hover:shadow-medium transition-all">
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
                          {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                          <Badge variant="outline" className="h-4 text-[9px]">{t.label.slice(0, -1)}</Badge>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}