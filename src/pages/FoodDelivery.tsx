import { useState } from "react";
import { Search, SlidersHorizontal, Star, Clock, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const filters = ["Todos", "Próximo", "Melhor Avaliado", "Mais Rápido", "Ofertas"];

const mockRestaurants = [
  {
    id: 1,
    name: "Restaurante Maputo",
    category: "Comida Moçambicana",
    rating: 4.8,
    deliveryTime: "25-35 min",
    deliveryFee: 50,
    image: null,
  },
  {
    id: 2,
    name: "Pizza Express",
    category: "Pizza • Italiana",
    rating: 4.5,
    deliveryTime: "30-45 min",
    deliveryFee: 75,
    image: null,
  },
  {
    id: 3,
    name: "Frango Frito Delícia",
    category: "Frango • Fast Food",
    rating: 4.6,
    deliveryTime: "20-30 min",
    deliveryFee: 40,
    image: null,
  },
  {
    id: 4,
    name: "Mariscos do Mar",
    category: "Frutos do Mar",
    rating: 4.9,
    deliveryTime: "35-50 min",
    deliveryFee: 80,
    image: null,
  },
];

export default function FoodDelivery() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");

  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Entrega de Comida</h1>
        <p className="text-muted-foreground text-sm">Restaurantes perto de ti</p>
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
        {mockRestaurants.map((restaurant) => (
          <div
            key={restaurant.id}
            className="bg-card rounded-xl overflow-hidden shadow-soft border border-border p-3 flex gap-3 transition-all hover:shadow-medium active:scale-[0.99]"
          >
            {/* Image placeholder */}
            <div className="w-24 h-24 bg-gradient-to-br from-food/20 to-food/5 rounded-lg flex-shrink-0" />

            {/* Info */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{restaurant.name}</h3>
                <p className="text-xs text-muted-foreground">{restaurant.category}</p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  <span className="font-medium">{restaurant.rating}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{restaurant.deliveryTime}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Entrega: {restaurant.deliveryFee} MZN
                </span>
                <Button size="sm" className="h-7 text-xs rounded-full">
                  Ver Menu
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
