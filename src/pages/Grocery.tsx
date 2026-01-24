import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Star, Clock, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";
import { Tables } from "@/integrations/supabase/types";

type Store = Tables<"stores">;

const filters = ["Todos", "Próximo", "Melhor Avaliado", "Ofertas"];

export default function Grocery() {
  const navigate = useNavigate();
  const { city: selectedCity } = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStores();
  }, [selectedCity]);

  const fetchStores = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("stores")
        .select("*")
        .eq("type", "grocery")
        .eq("is_active", true);

      if (selectedCity) {
        query = query.eq("city", selectedCity);
      }

      const { data, error } = await query;

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error("Erro ao carregar supermercados:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStores = stores.filter((store) =>
    store.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedStores = [...filteredStores].sort((a, b) => {
    switch (activeFilter) {
      case "Melhor Avaliado":
        return (b.rating || 0) - (a.rating || 0);
      default:
        return 0;
    }
  });

  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Supermercado</h1>
        <p className="text-muted-foreground text-sm">
          Produtos frescos {selectedCity ? `em ${selectedCity}` : "entregues em casa"}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pesquisar supermercados..."
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

      {/* Store List */}
      <div className="flex flex-col gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl overflow-hidden border border-border p-3 flex gap-3">
              <Skeleton className="w-24 h-24 rounded-lg" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))
        ) : sortedStores.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum supermercado encontrado</p>
            <p className="text-sm">Tente ajustar sua pesquisa</p>
          </div>
        ) : (
          sortedStores.map((store) => (
            <div
              key={store.id}
              onClick={() => navigate(`/store/${store.id}`)}
              className="bg-card rounded-xl overflow-hidden shadow-soft border border-border p-3 flex gap-3 transition-all hover:shadow-medium active:scale-[0.99] cursor-pointer"
            >
              {/* Image */}
              <div className="w-24 h-24 rounded-lg flex-shrink-0 overflow-hidden">
                {store.image_url ? (
                  <img
                    src={store.image_url}
                    alt={store.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-grocery/20 to-grocery/5 flex items-center justify-center">
                    <ShoppingBag className="h-8 w-8 text-grocery/50" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{store.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {store.description || "Supermercado"}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-grocery text-grocery" />
                    <span className="font-medium">{store.rating || "Novo"}</span>
                  </div>
                  {store.delivery_time && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{store.delivery_time}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Entrega: {store.delivery_fee || 0} MZN
                  </span>
                  <Button size="sm" className="h-7 text-xs rounded-full bg-grocery hover:bg-grocery/90">
                    Ver Produtos
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
