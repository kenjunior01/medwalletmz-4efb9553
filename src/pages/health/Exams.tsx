import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FlaskConical, MapPin, Phone, Search, Globe, ClipboardList, CheckCircle2 } from "lucide-react";

export default function Exams() {
  const nav = useNavigate();
  const { city } = useLocation();
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyMyCity, setOnlyMyCity] = useState(() => localStorage.getItem("filter_only_my_city") !== "0");

  useEffect(() => { localStorage.setItem("filter_only_my_city", onlyMyCity ? "1" : "0"); }, [onlyMyCity]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase.from("clinics").select("*").eq("is_active", true).eq("type", "laboratory");
      if (onlyMyCity && city) q = q.eq("city", city);
      const { data } = await q.order("is_verified", { ascending: false }).limit(100);
      setLabs(data || []);
      setLoading(false);
    })();
  }, [city, onlyMyCity]);

  const filtered = useMemo(() =>
    labs.filter((l) => l.name.toLowerCase().includes(search.toLowerCase())),
    [labs, search]
  );

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" /> Exames laboratoriais
          </h1>
          <p className="text-sm text-muted-foreground">
            Marca análises com laboratórios verificados{onlyMyCity && city ? ` em ${city}` : ""}.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => nav("/health/exams/my")}>
          <ClipboardList className="h-4 w-4 mr-1" /> Meus pedidos
        </Button>
      </div>

      <div className="flex items-center justify-between bento-card p-3">
        <Label htmlFor="only-city" className="text-sm cursor-pointer">
          {onlyMyCity ? `Só na minha cidade (${city})` : "Mostrar todas as cidades"}
        </Label>
        <Switch id="only-city" checked={onlyMyCity} onCheckedChange={setOnlyMyCity} />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Procurar laboratório..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bento-card p-8 text-center text-muted-foreground">
          <FlaskConical className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="font-semibold">
            {onlyMyCity && city ? `Sem laboratórios aprovados em ${city}.` : "Sem laboratórios registados."}
          </p>
          {onlyMyCity && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setOnlyMyCity(false)}>
              <Globe className="h-4 w-4 mr-1" /> Ver em todas as cidades
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((l) => (
            <button key={l.id} onClick={() => nav(`/health/exams/lab/${l.id}`)}
              className="bento-card p-4 text-left hover:shadow-medium transition-all">
              <div className="flex items-start gap-3">
                {l.logo_url ? (
                  <img src={l.logo_url} alt={l.name} className="h-14 w-14 rounded-xl object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FlaskConical className="h-7 w-7 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold truncate">{l.name}</h3>
                    {l.is_verified && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{l.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{l.city}</span>
                    {l.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{l.phone}</span>}
                    <Badge variant="outline" className="h-4 text-[9px]">Laboratório</Badge>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}