import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, Plus, MapPin, Phone, Eye, MessageSquare, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
          {data.map((a: any) => {
            const isHighValue = Number(a.price_mzn) > 5000;
            return (
              <div key={a.id} className={cn(
                "bento-card overflow-hidden group transition-all hover:shadow-md",
                isHighValue && "border-primary/30 ring-1 ring-primary/10"
              )}>
                <div className="relative">
                  {a.image_url ? (
                    <img src={a.image_url} className="w-full h-40 object-cover" alt={a.title} />
                  ) : (
                    <div className="w-full h-40 bg-muted flex items-center justify-center">
                      <Megaphone className="h-10 w-10 text-muted-foreground opacity-20" />
                    </div>
                  )}
                  {isHighValue && (
                    <Badge className="absolute top-2 right-2 bg-primary text-white text-[9px] font-bold">
                      DESTAQUE
                    </Badge>
                  )}
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    <Badge variant="secondary" className="text-[9px] bg-background/80 backdrop-blur border-none">
                      {a.category}
                    </Badge>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors">{a.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[32px]">{a.description}</p>

                  <div className="flex items-center justify-between mt-3">
                    {a.price_mzn ? (
                      <p className="text-base font-black text-primary">{Number(a.price_mzn).toLocaleString("pt-MZ")} MZN</p>
                    ) : (
                      <p className="text-xs font-semibold text-muted-foreground italic">Preço sob consulta</p>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" /> {a.views || 0}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate max-w-[120px]">
                      <MapPin className="h-3 w-3" /> {a.neighborhood || a.city}
                    </span>
                    <div className="flex gap-2">
                      {a.contact_whatsapp && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[10px] border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => window.open(`https://wa.me/${a.contact_whatsapp.replace(/\D/g, "")}`, "_blank")}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" /> WhatsApp
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          const url = `${window.location.origin}/ads/${a.id}`;
                          navigator.clipboard.writeText(url);
                          toast.success("Link do anúncio copiado!");
                        }}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}