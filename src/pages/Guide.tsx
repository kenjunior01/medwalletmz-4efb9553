import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Calendar, Sparkles, Lock, Coins, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useState } from "react";

export default function Guide() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: events } = useQuery({
    queryKey: ['all-joy-events'],
    queryFn: async () => {
      const { data } = await supabase
        .from('joy_events')
        .select('*')
        .eq('is_active', true)
        .order('event_date', { ascending: true });
      return data || [];
    }
  });

  const categories = [
    { id: null, label: 'Todos', icon: '🌟' },
    { id: 'gastronomia', label: 'Gastronomia', icon: '🍽️' },
    { id: 'mercado', label: 'Mercados', icon: '🛍️' },
    { id: 'evento', label: 'Eventos', icon: '🎉' },
    { id: 'tour', label: 'Tours', icon: '🗺️' },
  ];

  const filteredEvents = events?.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          event.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const secretEvents = filteredEvents?.filter(e => e.is_secret);
  const publicEvents = filteredEvents?.filter(e => !e.is_secret);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'gastronomia': return 'bg-food text-food-foreground';
      case 'mercado': return 'bg-grocery text-grocery-foreground';
      case 'evento': return 'bg-secondary text-secondary-foreground';
      case 'tour': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-premium text-white p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20 mb-4"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-6 w-6" />
            <h1 className="text-2xl font-extrabold">Guia Joy</h1>
          </div>
          <p className="text-white/80 text-sm">
            Descubra eventos e lugares secretos em Maputo
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 -mt-4 relative z-10">
        <div className="glass rounded-xl p-1 border border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar eventos..."
              className="pl-10 border-0 bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 mt-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id || 'all'}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events */}
      <div className="px-4 mt-4 space-y-6">
        {/* Secret Events */}
        {secretEvents && secretEvents.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lock className="h-4 w-4 text-accent" />
              <h2 className="font-bold">Lugares Secretos</h2>
              <Badge variant="destructive" className="text-[10px]">Exclusivo</Badge>
            </div>
            
            <div className="space-y-3">
              {secretEvents.map((event) => (
                <EventCard key={event.id} event={event} getCategoryColor={getCategoryColor} />
              ))}
            </div>
          </div>
        )}

        {/* Public Events */}
        {publicEvents && publicEvents.length > 0 && (
          <div>
            <h2 className="font-bold mb-3">Próximos Eventos</h2>
            <div className="space-y-3">
              {publicEvents.map((event) => (
                <EventCard key={event.id} event={event} getCategoryColor={getCategoryColor} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {(!filteredEvents || filteredEvents.length === 0) && (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-bold mb-1">Nenhum evento encontrado</h3>
            <p className="text-sm text-muted-foreground">
              Tente pesquisar por outro termo ou categoria
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({ event, getCategoryColor }: { event: any; getCategoryColor: (cat: string) => string }) {
  const navigate = useNavigate();
  
  return (
    <div 
      className="glass rounded-2xl overflow-hidden border border-border/50 hover:shadow-premium transition-all cursor-pointer"
      onClick={() => navigate(`/guide/${event.id}`)}
    >
      {/* Image */}
      <div className="h-32 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 relative">
        {event.is_secret && (
          <div className="absolute top-3 right-3 bg-accent text-accent-foreground text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Secreto
          </div>
        )}
        <div className="absolute bottom-3 left-3">
          <Badge className={getCategoryColor(event.category)}>
            {event.category}
          </Badge>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold mb-1">{event.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{event.description}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{event.location}</span>
            </div>
            {event.event_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(event.event_date), "dd MMM", { locale: pt })}</span>
              </div>
            )}
          </div>
          
          {event.joy_coins_reward > 0 && (
            <div className="flex items-center gap-1 text-gold font-bold text-sm">
              <Coins className="h-4 w-4" />
              +{event.joy_coins_reward}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
