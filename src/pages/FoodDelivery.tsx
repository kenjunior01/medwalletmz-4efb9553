import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, Star, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";
import { Tables } from "@/integrations/supabase/types";

type Store = Tables<"stores">;

const filters = ["Todos", "Próximo", "Melhor Avaliado", "Mais Rápido", "Ofertas"];

export default function FoodDelivery() {
  const navigate = useNavigate();
  const { city: selectedCity } = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [restaurants, setRestaurants] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurants();
  }, [selectedCity]);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("stores")
        .select("*")
        .eq("type", "food")
        .eq("is_active", true);

      if (selectedCity) {
        query = query.eq("city", selectedCity);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRestaurants(data || []);
    } catch (error) {
      console.error("Erro ao carregar restaurantes:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRestaurants = restaurants.filter((restaurant) =>
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedRestaurants = [...filteredRestaurants].sort((a, b) => {
    switch (activeFilter) {
      case "Melhor Avaliado":
        return (b.rating || 0) - (a.rating || 0);
      case "Mais Rápido":
        return (a.delivery_fee || 0) - (b.delivery_fee || 0);
      default:
        return 0;
    }
  });

  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Entrega de Comida</h1>
        <p className="text-muted-foreground text-sm">
          Restaurantes {selectedCity ? `em ${selectedCity}` : "perto de ti"}
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar restaurantes..."
            className="pl-10 h-11 rounded-xl"
          />
        </div>
        <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
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

      {/* Restaurant List */}
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
        ) : sortedRestaurants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum restaurante encontrado</p>
            <p className="text-sm">Tente ajustar sua pesquisa ou filtros</p>
          </div>
        ) : (
          sortedRestaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              onClick={() => navigate(`/store/${restaurant.id}`)}
              className="bg-card rounded-xl overflow-hidden shadow-soft border border-border p-3 flex gap-3 transition-all hover:shadow-medium active:scale-[0.99] cursor-pointer"
            >
              {/* Image */}
              <div className="w-24 h-24 rounded-lg flex-shrink-0 overflow-hidden">
                {restaurant.image_url ? (
                  <img
                    src={restaurant.image_url}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-food/20 to-food/5" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{restaurant.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {restaurant.description || "Restaurante"}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    <span className="font-medium">{restaurant.rating || "Novo"}</span>
                  </div>
                  {restaurant.delivery_time && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{restaurant.delivery_time}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Entrega: {restaurant.delivery_fee || 0} MZN
                  </span>
                  <Button size="sm" className="h-7 text-xs rounded-full">
                    Ver Menu
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
