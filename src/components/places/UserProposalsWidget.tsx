import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Store, Hospital, MapPin, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

interface Proposal {
  id: string;
  name: string;
  entity_type: 'pharmacy' | 'clinic' | 'hospital' | 'doctor' | 'lab' | 'other';
  city: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'duplicate' | 'merged';
  reward_paid: boolean | null;
  reward_mzn: number | null;
  reward_joy_coins: number | null;
  created_at: string;
  image_url: string | null;
}

const entityIcon = {
  pharmacy: Store,
  clinic: Building2,
  hospital: Hospital,
  doctor: Building2,
  lab: Building2,
  other: MapPin,
};

const statusMeta: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  pending:    { icon: Clock,        label: "Em análise", color: "text-warning",        bg: "bg-warning/15" },
  in_review:  { icon: Loader2,      label: "Em revisão", color: "text-secondary",      bg: "bg-secondary/15" },
  approved:   { icon: CheckCircle2, label: "Publicado", color: "text-primary",        bg: "bg-primary/15" },
  rejected:   { icon: XCircle,      label: "Rejeitado", color: "text-destructive",    bg: "bg-destructive/15" },
  duplicate:  { icon: XCircle,      label: "Duplicado", color: "text-muted-foreground", bg: "bg-muted" },
  merged:     { icon: CheckCircle2, label: "Publicado", color: "text-primary",        bg: "bg-primary/15" },
};

/**
 * Mostra as sugestões do utilizador com o estado actual.
 * Aparece no Profile.tsx logo abaixo do menu principal — mantém o
 * utilizador informado sobre recompensas e o que ainda está em análise.
 */
export function UserProposalsWidget({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery<Proposal[]>({
    queryKey: ['my-proposals', userId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('place_proposals')
        .select('id,name,entity_type,city,status,reward_paid,reward_mzn,reward_joy_coins,created_at,image_url')
        .eq('proposed_by', userId)
        .eq('source', 'user_submit')
        .order('created_at', { ascending: false })
        .limit(10);
      return (data ?? []) as Proposal[];
    },
  });

  if (isLoading) {
    return <Skeleton className="h-24 rounded-xl" />;
  }
  if (!data || data.length === 0) {
    return null; // não polui quando o user nunca sugeriu nada
  }

  const totalMzn = data
    .filter((p) => p.status === 'approved' && p.reward_paid)
    .reduce((a, p) => a + (p.reward_mzn ?? 0), 0);
  const totalCoins = data
    .filter((p) => p.status === 'approved' && p.reward_paid)
    .reduce((a, p) => a + (p.reward_joy_coins ?? 0), 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <span className="w-1.5 h-5 bg-gold rounded-full" />
          As minhas sugestões
        </h3>
        {totalMzn + totalCoins > 0 && (
          <span className="text-[10px] text-gold font-bold">
            Já ganhaste +{totalMzn} MZN + {totalCoins} 🪙
          </span>
        )}
      </div>

      <Card className="overflow-hidden border-0 shadow-sm">
        <CardContent className="p-0 divide-y divide-border">
          {data.map((p) => {
            const Icon = entityIcon[p.entity_type] ?? MapPin;
            const meta = statusMeta[p.status];
            const StatusIcon = meta.icon;
            return (
              <div key={p.id} className="flex items-center gap-3 p-3">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    : <Icon className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm leading-tight truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {p.city} · {new Date(p.created_at).toLocaleDateString('pt-MZ')}
                  </p>
                </div>
                <Badge className={`${meta.bg} ${meta.color} border-0 text-[10px]`}>
                  <StatusIcon className="h-3 w-3 mr-0.5" />
                  {meta.label}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground text-center">
        Cada sugestão aprovada recompensa o teu saldo MZN e JoyCoins automaticamente.
      </p>
    </div>
  );
}