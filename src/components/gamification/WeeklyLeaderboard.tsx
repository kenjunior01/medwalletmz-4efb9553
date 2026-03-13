import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Medal, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface LeaderboardEntry {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  weekly_orders: number;
  user_level: number;
  joy_coins: number;
}

export function WeeklyLeaderboard() {
  const { user } = useAuth();

  const { data: leaderboard } = useQuery({
    queryKey: ['weekly-leaderboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('weekly_leaderboard' as any)
        .select('*')
        .limit(10);
      return (data as unknown as LeaderboardEntry[]) || [];
    }
  });

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-gold" />;
    if (index === 1) return <Medal className="h-5 w-5 text-muted-foreground" />;
    if (index === 2) return <Medal className="h-5 w-5 text-accent" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{index + 1}</span>;
  };

  const getRankBg = (index: number) => {
    if (index === 0) return 'bg-gold/10 border-gold/30';
    if (index === 1) return 'bg-muted/50 border-border/50';
    if (index === 2) return 'bg-accent/5 border-accent/20';
    return 'border-border/30';
  };

  if (!leaderboard?.length) {
    return (
      <div className="text-center py-6">
        <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhum pedido esta semana ainda</p>
        <p className="text-xs text-muted-foreground">Seja o primeiro no ranking!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {leaderboard.map((entry, index) => {
        const isCurrentUser = entry.user_id === user?.id;
        return (
          <div
            key={entry.user_id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${getRankBg(index)} ${
              isCurrentUser ? 'ring-2 ring-primary/30' : ''
            }`}
          >
            <div className="flex-shrink-0 w-6 flex justify-center">
              {getRankIcon(index)}
            </div>
            <Avatar className="h-9 w-9">
              <AvatarImage src={entry.avatar_url || undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {(entry.full_name || '?').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isCurrentUser ? 'text-primary' : ''}`}>
                {entry.full_name || 'Anónimo'} {isCurrentUser && '(Tu)'}
              </p>
              <p className="text-xs text-muted-foreground">Nível {entry.user_level}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-sm">{entry.weekly_orders}</p>
              <p className="text-[10px] text-muted-foreground">pedidos</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
