import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Coins, Trophy, Flame, Star, Gift, Users, ChevronRight, Lock, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";

export default function Rewards() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: gamification } = useQuery({
    queryKey: ['user-gamification-full', user?.id],
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

  const { data: allAchievements } = useQuery({
    queryKey: ['all-achievements'],
    queryFn: async () => {
      const { data } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('requirement_value', { ascending: true });
      return data || [];
    }
  });

  const { data: userAchievements } = useQuery({
    queryKey: ['user-achievements-full', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);
      return data?.map(a => a.achievement_id) || [];
    },
    enabled: !!user
  });

  const { data: transactions } = useQuery({
    queryKey: ['joy-transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('joy_coin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user
  });

  const level = gamification?.current_level || 1;
  const xp = gamification?.experience_points || 0;
  const progress = Math.min((xp % 500) / 5, 100);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'explorer': return '🗺️';
      case 'gourmet': return '🍽️';
      case 'social': return '👥';
      case 'loyalty': return '💎';
      default: return '⭐';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
        <Gift className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-2">Joy Rewards</h1>
        <p className="text-muted-foreground text-center mb-6">
          Entre na sua conta para ver suas recompensas e conquistas
        </p>
        <Button onClick={() => navigate('/auth')} className="gradient-premium text-white">
          Entrar agora
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-premium text-white p-6 pb-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20 mb-4"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold">Joy Rewards</h1>
              <p className="text-white/80 text-sm">Nível {level} • {gamification?.total_orders || 0} pedidos</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <Coins className="h-6 w-6 text-yellow-300" />
                <span className="text-3xl font-extrabold">{gamification?.joy_coins || 0}</span>
              </div>
              <p className="text-xs text-white/70">JoyCoins</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 -mt-12 relative z-10">
        <div className="glass rounded-2xl p-4 border border-border/50 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-accent mb-1">
              <Flame className="h-5 w-5" />
              <span className="font-bold text-lg">{gamification?.streak_days || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground">Dias seguidos</p>
          </div>
          <div className="text-center border-x border-border">
            <div className="flex items-center justify-center gap-1 text-secondary mb-1">
              <Trophy className="h-5 w-5" />
              <span className="font-bold text-lg">{userAchievements?.length || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground">Conquistas</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-primary mb-1">
              <Star className="h-5 w-5" />
              <span className="font-bold text-lg">{gamification?.total_reviews || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground">Avaliações</p>
          </div>
        </div>

        {/* Level Progress */}
        <div className="mt-4 glass rounded-xl p-4 border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Nível {level}</span>
            <span className="text-xs text-muted-foreground">{xp % 500}/500 XP para Nível {level + 1}</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-6">
        <Tabs defaultValue="achievements" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="achievements">Conquistas</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="referral">Indicar</TabsTrigger>
          </TabsList>

          <TabsContent value="achievements" className="space-y-3">
            {allAchievements?.map((achievement) => {
              const isUnlocked = userAchievements?.includes(achievement.id);
              return (
                <div 
                  key={achievement.id}
                  className={`rounded-xl p-4 border transition-all ${
                    isUnlocked 
                      ? 'bg-primary/5 border-primary/30' 
                      : 'bg-muted/30 border-border/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                      isUnlocked ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      {isUnlocked ? achievement.icon : <Lock className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-bold text-sm ${!isUnlocked && 'text-muted-foreground'}`}>
                        {achievement.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-0.5 text-gold font-bold text-sm">
                        <Coins className="h-4 w-4" />
                        +{achievement.joy_coins_reward}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {getCategoryIcon(achievement.category)} {achievement.category}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="history" className="space-y-2">
            {transactions?.length === 0 && (
              <div className="text-center py-8">
                <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Nenhuma transação ainda</p>
              </div>
            )}
            {transactions?.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{tx.description || tx.transaction_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString('pt-MZ')}
                  </p>
                </div>
                <span className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </span>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="referral">
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full gradient-gold mx-auto flex items-center justify-center mb-4">
                <Users className="h-10 w-10 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Indique Amigos</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Ganhe 100 JoyCoins por cada amigo que fizer o primeiro pedido!
              </p>
              <div className="bg-muted rounded-lg p-4 mb-4">
                <p className="text-xs text-muted-foreground mb-1">Seu código de indicação</p>
                <p className="font-mono font-bold text-xl">JOY{user.id.slice(0, 6).toUpperCase()}</p>
              </div>
              <Button className="w-full gradient-premium text-white">
                Partilhar código <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
