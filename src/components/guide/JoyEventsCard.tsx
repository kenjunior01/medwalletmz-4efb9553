import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Calendar, Sparkles, Lock, ChevronRight, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export function JoyEventsCard() {
  const navigate = useNavigate();

  const { data: events } = useQuery({
    queryKey: ['joy-events'],
    queryFn: async () => {
      const { data } = await supabase
        .from('joy_events')
        .select('*')
        .eq('is_active', true)
        .order('event_date', { ascending: true })
        .limit(3);
      return data || [];
    }
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'gastronomia': return 'bg-food/10 text-food';
      case 'mercado': return 'bg-grocery/10 text-grocery';
      case 'evento': return 'bg-secondary/10 text-secondary';
      case 'tour': return 'bg-primary/10 text-primary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <section className="px-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <span className="w-1.5 h-6 bg-accent rounded-full" />
          Guia Joy
          <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">
            NOVO
          </Badge>
        </h2>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary font-medium text-sm px-2 h-8"
          onClick={() => navigate('/guide')}
        >
          Explorar <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
        </Button>
      </div>

      <div className="space-y-3">
        {events?.map((event) => (
          <div 
            key={event.id}
            className="glass rounded-2xl p-4 border border-border/50 relative overflow-hidden group cursor-pointer hover:shadow-premium transition-all"
            onClick={() => navigate(`/guide/${event.id}`)}
          >
            {/* Secret badge */}
            {event.is_secret && (
              <div className="absolute top-3 right-3 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" />
                Secreto
              </div>
            )}

            <div className="flex gap-3">
              {/* Image placeholder */}
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <Badge className={`${getCategoryColor(event.category)} text-[10px] font-medium mb-1`}>
                  {event.category}
                </Badge>
                
                <h3 className="font-bold text-sm line-clamp-1">{event.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{event.description}</p>
                
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[100px]">{event.location}</span>
                  </div>
                  
                  {event.event_date && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(event.event_date), "dd MMM", { locale: pt })}</span>
                    </div>
                  )}
                  
                  {event.joy_coins_reward > 0 && (
                    <div className="flex items-center gap-0.5 text-xs text-gold font-medium">
                      <Coins className="h-3 w-3" />
                      +{event.joy_coins_reward}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {(!events || events.length === 0) && (
          <div className="glass rounded-2xl p-6 text-center border border-border/50">
            <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Novos eventos em breve!</p>
          </div>
        )}
      </div>
    </section>
  );
}
