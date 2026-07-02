import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Coins, Trophy, Flame, ChevronRight, Star, Gift } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function JoyRewardsCard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: gamification } = useQuery({
    queryKey: ['user-gamification', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user
  });

  const { data: achievements } = useQuery({
    queryKey: ['user-achievements', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('user_achievements')
        .select('*, achievement:achievements(*)')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!user
  });

  // Calculate level progress
  const level = gamification?.current_level || 1;
  const xp = gamification?.experience_points || 0;
  const nextLevelXp = level * 500; // 500 XP per level
  const progress = Math.min((xp % 500) / 5, 100);

  if (!user) {
    return (
      <div className="glass rounded-2xl p-4 border border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-premium flex items-center justify-center">
              <Gift className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Pulse</h3>
              <p className="text-xs text-muted-foreground">Ganhe prémios</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Entre na sua conta para ganhar Pulse e desbloquear conquistas!
        </p>
        <Button 
          size="sm" 
          className="w-full gradient-premium text-white"
          onClick={() => navigate('/auth')}
        >
          Entrar agora
        </Button>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 border border-border/50 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center shadow-lg">
              <Coins className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Pulse</h3>
              <p className="text-xs text-muted-foreground">Nível {level}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary text-xs px-2 h-7"
            onClick={() => navigate('/rewards')}
          >
            Ver tudo <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </div>

        {/* Pulse Balance */}
        <div className="bg-gradient-to-r from-secondary/10 to-gold/10 rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Seus Pulse</p>
              <div className="flex items-center gap-1">
                <Coins className="h-5 w-5 text-gold" />
                <span className="font-extrabold text-2xl">{gamification?.joy_coins || 0}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-accent">
                <Flame className="h-4 w-4" />
                <span className="font-bold text-sm">{gamification?.streak_days || 0} dias</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Sequência</p>
            </div>
          </div>
        </div>

        {/* Level Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Progresso para Nível {level + 1}</span>
            <span className="font-medium text-primary">{xp % 500}/{500} XP</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Recent Achievements */}
        {achievements && achievements.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Conquistas Recentes</p>
            <div className="flex gap-2">
              {achievements.map((ua: any) => (
                <div 
                  key={ua.id}
                  className="flex-1 bg-muted/50 rounded-lg p-2 text-center"
                  title={ua.achievement?.description}
                >
                  <span className="text-xl">{ua.achievement?.icon}</span>
                  <p className="text-[10px] font-medium mt-0.5 truncate">{ua.achievement?.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for achievements */}
        {(!achievements || achievements.length === 0) && (
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <Trophy className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Faça pedidos para desbloquear conquistas!</p>
          </div>
        )}
      </div>
    </div>
  );
}
