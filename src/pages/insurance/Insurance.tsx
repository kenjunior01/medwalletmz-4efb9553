import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Shield, MapPin, Plus, CheckCircle2, Globe, Sparkles, Smartphone, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function Insurance() {
  const navigate = useNavigate();
  const { city } = useLocation();
  const [onlyMyCity, setOnlyMyCity] = useState<boolean>(() => localStorage.getItem("filter_only_my_city") !== "0");
  useEffect(() => { localStorage.setItem("filter_only_my_city", onlyMyCity ? "1" : "0"); }, [onlyMyCity]);

  const { data, isLoading } = useQuery({
    queryKey: ["insurance-companies", city, onlyMyCity],
    queryFn: async () => {
      let q = supabase
        .from("insurance_companies")
        .select("*")
        .eq("is_verified", true)
        .eq("is_active", true)
        .order("is_verified", { ascending: false });
      if (onlyMyCity && city) q = q.or(`city.eq.${city},cities.cs.{${city}}`);
      const { data } = await q;
      return data || [];
    },
  });

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Seguros de Saúde
          </h1>
          <p className="text-sm text-muted-foreground">
            Seguradoras disponíveis em <b>{city}</b>. Escolhe um plano e usa em consultas e farmácia.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/insurance/register")}>
          <Plus className="h-4 w-4 mr-1" /> Registar
        </Button>
      </div>

      <Card className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10 border-none relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Smartphone className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold">Micro-seguros M-Pesa</h3>
            <p className="text-[11px] text-muted-foreground">Planos a partir de 50 MZN/mês. Paga com saldo M-Pesa ou MedWallet.</p>
          </div>
          <Button size="sm" variant="ghost" className="h-8 text-[10px]" onClick={() => navigate("/partners")}>
            Saber mais <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </div>
      </Card>

      <div className="flex items-center justify-between bento-card p-3">
        <Label htmlFor="ins-city" className="text-sm cursor-pointer flex items-center gap-2">
          {onlyMyCity ? <><MapPin className="h-4 w-4" />Só em {city}</> : <><Globe className="h-4 w-4" />Todas as cidades</>}
        </Label>
        <Switch id="ins-city" checked={onlyMyCity} onCheckedChange={setOnlyMyCity} />
      </div>

      {isLoading ? (
        <div className="grid gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : !data || data.length === 0 ? (
        <div className="bento-card p-8 text-center text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-2 opacity-40" />
          <p className="font-semibold">
            {onlyMyCity ? `Sem seguradoras aprovadas em ${city}.` : "Ainda não há seguradoras aprovadas."}
          </p>
          {onlyMyCity && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setOnlyMyCity(false)}>
              <Globe className="h-4 w-4 mr-1" /> Mostrar todas as cidades
            </Button>
          )}
          <div className="mt-4">
            <Button onClick={() => navigate("/insurance/register")}>Registar seguradora</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((c: any) => (
            <button
              key={c.id}
              onClick={() => navigate(`/insurance/${c.id}`)}
              className="bento-card p-4 text-left hover:shadow-medium transition-all"
            >
              <div className="flex items-start gap-3">
                {c.logo_url ? (
                  <img src={c.logo_url} alt={c.name} className="h-14 w-14 rounded-xl object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className="h-7 w-7 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold truncate">{c.name}</h3>
                    {c.is_verified && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{c.description || "Seguro de saúde"}</p>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{c.city}</span>
                    {c.cities?.length > 1 && <Badge variant="outline" className="h-4 text-[9px]">+{c.cities.length - 1} cidades</Badge>}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Badge variant="secondary" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-100">Consultas</Badge>
                    <Badge variant="secondary" className="text-[9px] bg-blue-50 text-blue-700 border-blue-100">Farmácia</Badge>
                    <Badge variant="secondary" className="text-[9px] bg-amber-50 text-amber-700 border-amber-100">Exames</Badge>
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