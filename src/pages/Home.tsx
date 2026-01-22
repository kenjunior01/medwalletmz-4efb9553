import { UtensilsCrossed, ShoppingBasket, Pill, Truck, Clock, Star } from "lucide-react";
import { ServiceCard } from "@/components/home/ServiceCard";
import { PromoBanner } from "@/components/home/PromoBanner";
import { SearchBar } from "@/components/home/SearchBar";
import { CategoryItem } from "@/components/home/CategoryItem";
import { useNavigate } from "react-router-dom";

const services = [
  {
    title: "Entrega de Comida",
    description: "Restaurantes e comida rápida",
    icon: UtensilsCrossed,
    href: "/food",
    colorClass: "text-food-foreground",
    bgClass: "bg-food/10",
  },
  {
    title: "Supermercado",
    description: "Mercearia e produtos frescos",
    icon: ShoppingBasket,
    href: "/grocery",
    colorClass: "text-grocery-foreground",
    bgClass: "bg-grocery/10",
  },
  {
    title: "Farmácia",
    description: "Medicamentos e saúde",
    icon: Pill,
    href: "/pharmacy",
    colorClass: "text-pharmacy-foreground",
    bgClass: "bg-pharmacy/10",
  },
];

const quickCategories = [
  { icon: UtensilsCrossed, label: "Comida", color: "text-food" },
  { icon: ShoppingBasket, label: "Mercado", color: "text-grocery" },
  { icon: Pill, label: "Farmácia", color: "text-pharmacy" },
  { icon: Truck, label: "Entregas", color: "text-secondary" },
  { icon: Clock, label: "Rápido", color: "text-primary" },
  { icon: Star, label: "Favoritos", color: "text-accent" },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6 p-4 animate-fade-in">
      {/* Search Bar */}
      <SearchBar />

      {/* Promo Banner */}
      <PromoBanner />

      {/* Quick Categories */}
      <section>
        <h2 className="font-bold text-lg mb-3">Categorias</h2>
        <div className="flex overflow-x-auto gap-2 no-scrollbar -mx-4 px-4">
          {quickCategories.map((cat) => (
            <CategoryItem
              key={cat.label}
              icon={cat.icon}
              label={cat.label}
              colorClass={cat.color}
              onClick={() => {
                if (cat.label === "Comida") navigate("/food");
                else if (cat.label === "Mercado") navigate("/grocery");
                else if (cat.label === "Farmácia") navigate("/pharmacy");
              }}
            />
          ))}
        </div>
      </section>

      {/* Main Services */}
      <section>
        <h2 className="font-bold text-lg mb-3">Serviços</h2>
        <div className="grid gap-3">
          {services.map((service) => (
            <ServiceCard key={service.title} {...service} />
          ))}
        </div>
      </section>

      {/* Popular Near You */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Popular Perto de Ti</h2>
          <button className="text-sm text-primary font-medium">Ver tudo</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-card rounded-xl overflow-hidden shadow-soft border border-border transition-all hover:shadow-medium"
            >
              <div className="h-24 bg-gradient-to-br from-muted to-muted/50" />
              <div className="p-3">
                <h3 className="font-semibold text-sm">Restaurante {i}</h3>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  <span className="text-xs text-muted-foreground">4.{5 + i} • 20-30 min</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Entrega: 50 MZN</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
