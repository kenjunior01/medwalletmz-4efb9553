import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Trophy, Users } from 'lucide-react';

export default function AdminReferrals() {
  const { data: referrals } = useQuery({
    queryKey: ['admin-referrals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_referrals')
        .select('*, ref:profiles!user_referrals_referrer_id_fkey(full_name), red:profiles!user_referrals_referred_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(200);
      return data || [];
    }
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['admin-referrals-leaderboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_referrals')
        .select('referrer_id, status')
        .eq('status', 'completed');
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => { counts[r.referrer_id] = (counts[r.referrer_id] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const ids = top.map(t => t[0]);
      const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', ids);
      return top.map(([id, n]) => ({
        user_id: id, count: n, name: profs?.find((p: any) => p.user_id === id)?.full_name || 'Anónimo',
      }));
    }
  });

  const total = referrals?.length || 0;
  const completed = referrals?.filter((r: any) => r.status === 'completed').length || 0;
  const totalMzn = (referrals || []).reduce((a: number, r: any) => a + Number(r.bonus_mzn || 0), 0);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Programa de Convites</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div><p className="text-xs text-muted-foreground">Total convites</p><p className="text-2xl font-bold">{total}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Gift className="h-8 w-8 text-pharmacy" />
          <div><p className="text-xs text-muted-foreground">Concluídos</p><p className="text-2xl font-bold">{completed}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Trophy className="h-8 w-8 text-gold" />
          <div><p className="text-xs text-muted-foreground">MZN distribuídos</p><p className="text-2xl font-bold">{totalMzn.toLocaleString()}</p></div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-gold" /> Top Convidadores</CardTitle></CardHeader>
          <CardContent>
            {leaderboard?.length === 0 && <p className="text-sm text-muted-foreground">Sem dados.</p>}
            {leaderboard?.map((l, i) => (
              <div key={l.user_id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <span className="font-bold w-6 text-center">{i + 1}</span>
                <span className="flex-1">{l.name}</span>
                <Badge variant="outline">{l.count} convites</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Atividade Recente</CardTitle></CardHeader>
          <CardContent className="max-h-96 overflow-auto">
            {referrals?.slice(0, 30).map((r: any) => (
              <div key={r.id} className="py-2 border-b last:border-0 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.ref?.full_name || '—'}</span>
                  <Badge variant={r.status === 'completed' ? 'default' : 'outline'}>{r.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  convidou {r.red?.full_name || '—'} • {new Date(r.created_at).toLocaleDateString('pt-MZ')}
                  {r.bonus_mzn ? ` • +${r.bonus_mzn} MZN` : ''}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
