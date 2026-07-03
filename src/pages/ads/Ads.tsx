import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, Plus, MapPin, Phone } from "lucide-react";

const CATEGORIES = ["Todas", "Saúde", "Serviços", "Produtos", "Empregos", "Aluguer", "Outros"];

export default function Ads() {
  const navigate = useNavigate();
  const { city } = useLocation();
  const [cat, setCat] = useState("Todas");

  const { data, isLoading } = useQuery({
    queryKey: ["ads", city, cat],
    queryFn: async () => {
      let q = supabase.from("advertisements").select("*").eq("status", "approved").eq("city", city).order("created_at", { ascending: false }).limit(60);
      if (cat !== "Todas") q = q.eq("category", cat);
      const { data } = await q;
      return data || [];
    },
  });

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Megaphone className="h-6 w-6 text-primary" /> Anúncios</h1>
          <p className="text-sm text-muted-foreground">Classificados em <b>{city}</b></p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/ads/mine")}>Meus</Button>
          <Button size="sm" onClick={() => navigate("/ads/new")}><Plus className="h-4 w-4 mr-1" />Publicar</Button>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 no-scrollbar -mx-4 px-4">
        {CATEGORIES.map(c => (
          <Badge key={c} variant={cat === c ? "default" : "outline"} className="cursor-pointer whitespace-nowrap px-4 py-2 rounded-full" onClick={() => setCat(c)}>{c}</Badge>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
      ) : !data || data.length === 0 ? (
        <div className="bento-card p-8 text-center text-muted-foreground">
          <Megaphone className="h-12 w-12 mx-auto mb-2 opacity-40" />
          <p className="font-semibold">Ainda não há anúncios em {city}.</p>
          <Button className="mt-4" onClick={() => navigate("/ads/new")}>Sê o primeiro</Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((a: any) => (
            <div key={a.id} className="bento-card overflow-hidden">
              {a.image_url && <img src={a.image_url} className="w-full h-32 object-cover" alt={a.title} />}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold flex-1">{a.title}</h3>
                  <Badge variant="secondary" className="text-[10px]">{a.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.description}</p>
                {a.price_mzn && <p className="text-lg font-black text-primary mt-2">{Number(a.price_mzn).toLocaleString("pt-MZ")} MZN</p>}
                <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{a.neighborhood || a.city}</span>
                  {a.contact_whatsapp && <a href={`https://wa.me/${a.contact_whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="text-primary font-semibold flex items-center gap-1"><Phone className="h-3 w-3" />WhatsApp</a>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}