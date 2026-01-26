import { UtensilsCrossed, ShoppingBasket, Pill, Truck, Clock, Star, TrendingUp, MapPin, Heart, Gift } from "lucide-react";
import { ServiceCard } from "@/components/home/ServiceCard";
import { PromoBanner } from "@/components/home/PromoBanner";
import { SearchBar } from "@/components/home/SearchBar";
import { CategoryItem } from "@/components/home/CategoryItem";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { StatWidget, QuickActionWidget, TopItemsWidget } from "@/components/widgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const isMobile = useIsMobile();

  // Fetch top stores for desktop widgets
  const { data: topStores } = useQuery({
    queryKey: ['top-stores'],
    queryFn: async () => {
      const { data } = await supabase
        .from('stores')
        .select('id, name, type, rating, image_url')
        .eq('is_active', true)
        .order('rating', { ascending: false })
        .limit(5);
      return data || [];
    }
  });

  // Fetch stats for desktop
  const { data: stats } = useQuery({
    queryKey: ['home-stats'],
    queryFn: async () => {
      const [stores, orders] = await Promise.all([
        supabase.from('stores').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('orders').select('id', { count: 'exact', head: true })
      ]);
      return {
        activeStores: stores.count || 0,
        totalOrders: orders.count || 0
      };
    }
  });

  const quickActions = [
    { 
      icon: UtensilsCrossed, 
      label: "Comida", 
      description: "Restaurantes",
      onClick: () => navigate("/food"),
      colorClass: "text-food",
      bgClass: "bg-food/10"
    },
    { 
      icon: ShoppingBasket, 
      label: "Mercado", 
      description: "Supermercados",
      onClick: () => navigate("/grocery"),
      colorClass: "text-grocery",
      bgClass: "bg-grocery/10"
    },
    { 
      icon: Pill, 
      label: "Farmácia", 
      description: "Medicamentos",
      onClick: () => navigate("/pharmacy"),
      colorClass: "text-pharmacy",
      bgClass: "bg-pharmacy/10"
    },
    { 
      icon: Heart, 
      label: "Favoritos", 
      description: "Seus locais",
      onClick: () => navigate("/favorites"),
      colorClass: "text-accent",
      bgClass: "bg-accent/10"
    },
  ];

  // Desktop Layout
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                  Bem-vindo ao <span className="text-primary">MoçambiApp</span>
                </h1>
                <p className="text-lg text-muted-foreground mb-6">
                  A plataforma de entregas mais rápida de Moçambique. Comida, supermercado e farmácia na palma da sua mão.
                </p>
                <div className="max-w-md">
                  <SearchBar />
                </div>
              </div>
              <div className="hidden lg:block">
                <PromoBanner />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatWidget 
              title="Lojas Ativas"
              value={stats?.activeStores || 0}
              subtitle="Na sua cidade"
              icon={MapPin}
              colorClass="text-food"
            />
            <StatWidget 
              title="Pedidos Realizados"
              value={stats?.totalOrders?.toLocaleString() || '0'}
              subtitle="Na plataforma"
              icon={TrendingUp}
              colorClass="text-secondary"
            />
            <StatWidget 
              title="Entrega Rápida"
              value="20-40 min"
              subtitle="Tempo médio"
              icon={Clock}
              colorClass="text-pharmacy"
            />
            <StatWidget 
              title="Satisfação"
              value="4.8"
              subtitle="Avaliação média"
              icon={Star}
              colorClass="text-primary"
            />
          </div>

          {/* Quick Actions and Services */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <QuickActionWidget 
                title="Acesso Rápido"
                actions={quickActions}
              />
            </div>
            
            <TopItemsWidget 
              title="Top Restaurantes"
              items={topStores?.map(store => ({
                id: store.id,
                name: store.name,
                value: store.rating?.toFixed(1) || '-',
                subtitle: store.type,
                image: store.image_url || undefined
              })) || []}
              valueLabel="⭐"
              showRanking={true}
            />
          </div>

          {/* Services Grid */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Nossos Serviços</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {services.map((service) => (
                <Card 
                  key={service.title}
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 group overflow-hidden"
                  onClick={() => navigate(service.href)}
                >
                  <CardContent className="p-6">
                    <div className={`w-16 h-16 rounded-2xl ${service.bgClass} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <service.icon className={`h-8 w-8 ${service.colorClass}`} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                    <p className="text-muted-foreground">{service.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Popular Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Popular Perto de Ti</h2>
              <button className="text-primary font-medium hover:underline">Ver tudo</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card
                  key={i}
                  className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="h-32 bg-gradient-to-br from-muted to-muted/50 group-hover:scale-105 transition-transform" />
                  <CardContent className="p-4">
                    <h3 className="font-semibold">Restaurante {i}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      <span className="text-sm text-muted-foreground">4.{5 + i} • 20-30 min</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Entrega: 50 MZN</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile Layout (existing)
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
                else if (cat.label === "Favoritos") navigate("/favorites");
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
