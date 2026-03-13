import { UtensilsCrossed, ShoppingBasket, Pill, Truck, Clock, Star, TrendingUp, MapPin, Heart, Gift, ArrowRight } from "lucide-react";
import { PromoBanner } from "@/components/home/PromoBanner";
import { SearchBar } from "@/components/home/SearchBar";
import { BentoGrid } from "@/components/home/BentoGrid";
import { JoyRewardsCard } from "@/components/gamification/JoyRewardsCard";
import { JoyEventsCard } from "@/components/guide/JoyEventsCard";
import { SmartRecommendations } from "@/components/ai/SmartRecommendations";
import { InfluencerPicks } from "@/components/home/InfluencerPicks";
import { WeeklyChallenges } from "@/components/gamification/WeeklyChallenges";
import { DailyHighlights } from "@/components/home/DailyHighlights";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { StatWidget, QuickActionWidget, TopItemsWidget } from "@/components/widgets";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const services = [
  {
    title: "Entrega de Comida",
    description: "Restaurantes e comida rápida",
    icon: UtensilsCrossed,
    href: "/food",
    colorClass: "text-food-foreground",
    bgClass: "gradient-warm",
  },
  {
    title: "Supermercado",
    description: "Mercearia e produtos frescos",
    icon: ShoppingBasket,
    href: "/grocery",
    colorClass: "text-grocery-foreground",
    bgClass: "bg-grocery",
  },
  {
    title: "Farmácia",
    description: "Medicamentos e saúde",
    icon: Pill,
    href: "/pharmacy",
    colorClass: "text-pharmacy-foreground",
    bgClass: "bg-pharmacy",
  },
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
        <div className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-3 py-1.5 rounded-full text-sm font-medium mb-4">
                  <Gift className="h-4 w-4" />
                  Entregas grátis esta semana
                </div>
                <h1 className="text-4xl lg:text-5xl font-extrabold mb-4 leading-tight">
                  Descubra o melhor de{" "}
                  <span className="text-gradient-premium">Maputo</span>
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
              colorClass="text-primary"
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
              colorClass="text-gold"
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
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="w-1.5 h-8 bg-primary rounded-full" />
              Nossos Serviços
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {services.map((service) => (
                <Card 
                  key={service.title}
                  className="cursor-pointer hover:shadow-premium transition-all duration-300 group overflow-hidden border-border/50"
                  onClick={() => navigate(service.href)}
                >
                  <CardContent className="p-6">
                    <div className={`w-16 h-16 rounded-2xl ${service.bgClass} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                      <service.icon className={`h-8 w-8 ${service.colorClass}`} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                    <p className="text-muted-foreground mb-4">{service.description}</p>
                    <div className="flex items-center text-primary font-medium group-hover:gap-2 transition-all">
                      Ver opções <ArrowRight className="h-4 w-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Popular Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="w-1.5 h-8 bg-secondary rounded-full" />
                Popular Perto de Ti
              </h2>
              <Button variant="ghost" className="text-primary font-medium hover:bg-primary/10">
                Ver tudo <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card
                  key={i}
                  className="overflow-hidden hover:shadow-premium transition-all duration-300 cursor-pointer group border-border/50"
                >
                  <div className="h-32 bg-gradient-to-br from-muted via-muted/80 to-muted/50 group-hover:scale-105 transition-transform relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold">Restaurante {i}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-4 w-4 fill-gold text-gold" />
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

  // Mobile Layout - Premium Joy Experience
  return (
    <div className="flex flex-col gap-5 pb-4 animate-fade-in">
      {/* Search Bar with glass effect */}
      <div className="px-4 pt-2">
        <SearchBar />
      </div>

      {/* Promo Banner */}
      <div className="px-4">
        <PromoBanner />
      </div>

      {/* Smart AI Recommendations */}
      <SmartRecommendations />

      {/* Daily Highlights */}
      <DailyHighlights />

      {/* Weekly Challenges */}
      <WeeklyChallenges />

      {/* Bento Grid Categories */}
      <BentoGrid />

      {/* Joy Rewards Card */}
      <div className="px-4">
        <JoyRewardsCard />
      </div>

      {/* Joy Events / Guide */}
      <JoyEventsCard />

      {/* Influencer Picks */}
      <InfluencerPicks />

      {/* Popular Near You */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <span className="w-1.5 h-6 bg-secondary rounded-full" />
            Popular Perto de Ti
          </h2>
          <Button variant="ghost" size="sm" className="text-primary font-medium text-sm px-2 h-8">
            Ver tudo <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="glass rounded-2xl overflow-hidden border border-border/50 transition-all hover:shadow-premium active:scale-[0.98]"
            >
              <div className="h-24 bg-gradient-to-br from-muted via-muted/80 to-muted/50 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <div className="absolute top-2 right-2 bg-secondary text-secondary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  Novo
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-bold text-sm">Restaurante {i}</h3>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-3 w-3 fill-gold text-gold" />
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
