import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Target, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function WeeklyChallenges() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: challenges } = useQuery({
    queryKey: ['active-challenges'],
    queryFn: async () => {
      const { data } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .gte('ends_at', new Date().toISOString())
        .lte('starts_at', new Date().toISOString())
        .order('joy_coins_reward', { ascending: false });
      return data || [];
    }
  });

  const { data: userProgress } = useQuery({
    queryKey: ['user-challenges', user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data } = await supabase
        .from('user_challenges')
        .select('*')
        .eq('user_id', user.id);
      const map: Record<string, { current_value: number; completed_at: string | null }> = {};
      data?.forEach(uc => { map[uc.challenge_id] = uc; });
      return map;
    },
    enabled: !!user
  });

  const joinChallenge = useMutation({
    mutationFn: async (challengeId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('user_challenges')
        .insert({ user_id: user.id, challenge_id: challengeId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] });
      toast.success('Desafio aceite! Boa sorte! 🎯');
    }
  });

  if (!challenges?.length) return null;

  return (
    <section className="px-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <span className="w-1.5 h-6 bg-accent rounded-full" />
          Desafios da Semana
        </h2>
        <Button variant="ghost" size="sm" className="text-primary font-medium text-sm px-2 h-8" onClick={() => navigate('/rewards')}>
          Ver tudo <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {challenges.slice(0, 4).map((challenge) => {
          const progress = userProgress?.[challenge.id];
          const isJoined = !!progress;
          const isCompleted = !!progress?.completed_at;
          const pct = isJoined ? Math.min((progress.current_value / challenge.target_value) * 100, 100) : 0;

          return (
            <div
              key={challenge.id}
              className={`flex-shrink-0 w-[200px] rounded-2xl p-4 border transition-all ${
                isCompleted 
                  ? 'bg-primary/5 border-primary/30' 
                  : 'glass border-border/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{challenge.icon}</span>
                {isCompleted && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </div>
              <h3 className="font-bold text-sm mb-1 line-clamp-1">{challenge.title}</h3>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{challenge.description}</p>

              {isJoined ? (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{progress.current_value}/{challenge.target_value}</span>
                    <span className="font-medium text-gold">+{challenge.joy_coins_reward} 🪙</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs h-7 border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => user ? joinChallenge.mutate(challenge.id) : navigate('/auth')}
                  disabled={joinChallenge.isPending}
                >
                  <Target className="h-3 w-3 mr-1" /> Aceitar desafio
                </Button>
              )}

              <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                Termina {new Date(challenge.ends_at).toLocaleDateString('pt-MZ', { weekday: 'short' })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
