import { useMemo } from "react";
import { Cloud, Sun, CloudRain, Sparkles, Clock, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface SmartRecommendation {
  id: string;
  title: string;
  subtitle: string;
  reason: string;
  icon: React.ElementType;
  href: string;
  gradient: string;
}

function getTimeBasedContext(): { period: string; emoji: string; suggestion: string } {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 10) {
    return { period: 'manhã', emoji: '☀️', suggestion: 'pequeno-almoço' };
  } else if (hour >= 10 && hour < 12) {
    return { period: 'meio da manhã', emoji: '🌤️', suggestion: 'lanche' };
  } else if (hour >= 12 && hour < 14) {
    return { period: 'hora do almoço', emoji: '🍽️', suggestion: 'almoço' };
  } else if (hour >= 14 && hour < 17) {
    return { period: 'tarde', emoji: '☕', suggestion: 'café' };
  } else if (hour >= 17 && hour < 20) {
    return { period: 'fim de tarde', emoji: '🌅', suggestion: 'lanche da tarde' };
  } else if (hour >= 20 && hour < 23) {
    return { period: 'noite', emoji: '🌙', suggestion: 'jantar' };
  } else {
    return { period: 'madrugada', emoji: '🌃', suggestion: 'snack noturno' };
  }
}

// Mock weather - in production would use a weather API
function getWeatherContext(): { condition: string; icon: React.ElementType; suggestion: string } {
  // Simulating weather based on time (in production, use real weather API)
  const conditions = [
    { condition: 'ensolarado', icon: Sun, suggestion: 'bebidas frescas' },
    { condition: 'nublado', icon: Cloud, suggestion: 'pratos reconfortantes' },
    { condition: 'chuvoso', icon: CloudRain, suggestion: 'sopas quentes' },
  ];
  
  // For demo, randomly pick based on current minute
  const index = new Date().getMinutes() % 3;
  return conditions[index];
}

export function SmartRecommendations() {
  const navigate = useNavigate();
  const timeContext = useMemo(() => getTimeBasedContext(), []);
  const weatherContext = useMemo(() => getWeatherContext(), []);

  const { data: topStores } = useQuery({
    queryKey: ['smart-recommendations-stores'],
    queryFn: async () => {
      const { data } = await supabase
        .from('stores')
        .select('id, name, type, rating')
        .eq('is_active', true)
        .order('rating', { ascending: false })
        .limit(2);
      return data || [];
    }
  });

  const recommendations: SmartRecommendation[] = useMemo(() => {
    const recs: SmartRecommendation[] = [];

    // Weather-based recommendation
    if (weatherContext.condition === 'chuvoso') {
      recs.push({
        id: 'weather-soup',
        title: 'Está a chover em Maputo',
        subtitle: 'Que tal uma sopa quente?',
        reason: 'Recomendação por clima',
        icon: CloudRain,
        href: '/food?category=sopas',
        gradient: 'from-blue-500/20 to-cyan-500/20'
      });
    } else if (weatherContext.condition === 'ensolarado') {
      recs.push({
        id: 'weather-fresh',
        title: 'Dia quente em Maputo',
        subtitle: 'Bebidas geladas e saladas',
        reason: 'Recomendação por clima',
        icon: Sun,
        href: '/food?category=bebidas',
        gradient: 'from-amber-500/20 to-orange-500/20'
      });
    }

    // Time-based recommendation
    recs.push({
      id: 'time-based',
      title: `Hora do ${timeContext.suggestion}`,
      subtitle: `Sugestões para ${timeContext.period}`,
      reason: `${timeContext.emoji} Baseado na hora`,
      icon: Clock,
      href: '/food',
      gradient: 'from-primary/20 to-secondary/20'
    });

    // Trending recommendation
    if (topStores && topStores.length > 0) {
      recs.push({
        id: 'trending',
        title: 'Em Alta Hoje',
        subtitle: topStores[0]?.name || 'Restaurantes populares',
        reason: '🔥 Tendência local',
        icon: TrendingUp,
        href: topStores[0] ? `/store/${topStores[0].id}` : '/food',
        gradient: 'from-accent/20 to-rose-500/20'
      });
    }

    return recs;
  }, [timeContext, weatherContext, topStores]);

  return (
    <section className="px-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-secondary" />
        <h2 className="font-bold text-lg">Para Ti</h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          Personalizado
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
        {recommendations.map((rec) => {
          const Icon = rec.icon;
          return (
            <button
              key={rec.id}
              onClick={() => navigate(rec.href)}
              className={`flex-shrink-0 w-[200px] rounded-2xl p-4 text-left bg-gradient-to-br ${rec.gradient} border border-border/50 hover:shadow-premium transition-all active:scale-[0.98]`}
            >
              <div className="w-10 h-10 rounded-xl bg-background/80 backdrop-blur flex items-center justify-center mb-3">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              
              <h3 className="font-bold text-sm line-clamp-1">{rec.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{rec.subtitle}</p>
              
              <div className="mt-3 text-[10px] text-muted-foreground bg-background/50 rounded-full px-2 py-0.5 inline-block">
                {rec.reason}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
