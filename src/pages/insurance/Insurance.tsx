import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Shield, MapPin, Plus, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Insurance() {
  const navigate = useNavigate();
  const { city } = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["insurance-companies", city],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_companies")
        .select("*")
        .eq("is_active", true)
        .or(`city.eq.${city},cities.cs.{${city}}`)
        .order("is_verified", { ascending: false });
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

      {isLoading ? (
        <div className="grid gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : !data || data.length === 0 ? (
        <div className="bento-card p-8 text-center text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-2 opacity-40" />
          <p className="font-semibold">Ainda não há seguradoras em {city}.</p>
          <p className="text-xs mt-1">És uma seguradora? Regista o teu perfil e alcança milhares de utilizadores.</p>
          <Button className="mt-4" onClick={() => navigate("/insurance/register")}>Registar seguradora</Button>
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
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}