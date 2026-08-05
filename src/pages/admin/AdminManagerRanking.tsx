import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, TrendingUp, TrendingDown, Users, Activity, Wallet, Shield } from '@/components/icons/lucide-compat';

type Row = {
  user_id: string; full_name: string | null; email: string | null; role: string;
  country_id: string | null; province_id: string | null; scope_label: string;
  total_users: number; new_users: number; active_users: number;
  consultations_completed: number; revenue: number; manager_commission: number;
  art_adherence: number; ape_visits: number;
  revenue_recent: number; revenue_previous: number;
  users_recent: number; users_previous: number;
  declining: boolean; score: number;
};

const PERIODS = [
  { days: 7, label: '7 dias' },
  { days: 30, label: '30 dias' },
  { days: 90, label: 'Trimestre' },
];

const MEDALS = ['🥇', '🥈', '🥉'];

export default function AdminManagerRanking() {
  const [days, setDays] = useState(30);

  const { data, isLoading, error } = useQuery({
    queryKey: ['manager-ranking', days],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('manager_performance_ranking', { _days: days });
      if (error) throw error;
      return (data || []) as Row[];
    },
  });

  const rows = data || [];
  const totalRevenue = rows.reduce((s, r) => s + Number(r.revenue || 0), 0);
  const totalCommission = rows.reduce((s, r) => s + Number(r.manager_commission || 0), 0);
  const atRisk = rows.filter((r) => r.declining);

  const money = (v: number) => `${Number(v || 0).toLocaleString('pt-MZ', { maximumFractionDigits: 0 })} MT`;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" /> Ranking Nacional de Gestores
          </h1>
          <p className="text-muted-foreground text-sm">
            Operação descentralizada, controlo financeiro centralizado. Split automático 60% gestor / 40% plataforma.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border p-1">
          {PERIODS.map((p) => (
            <Button key={p.days} size="sm" variant={days === p.days ? 'default' : 'ghost'} onClick={() => setDays(p.days)}>
              {p.label}
            </Button>
          ))}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Gestores activos</p>
          <p className="text-2xl font-black">{rows.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> Receita das regiões</p>
          <p className="text-2xl font-black">{money(totalRevenue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Comissões de gestores (60%)</p>
          <p className="text-2xl font-black text-primary">{money(totalCommission)}</p>
        </CardContent></Card>
        <Card className={atRisk.length ? 'border-destructive/50' : undefined}><CardContent className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Precisam de coaching</p>
          <p className="text-2xl font-black">{atRisk.length}</p>
        </CardContent></Card>
      </div>

      {atRisk.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2"><CardTitle className="text-base">Alerta de duas quinzenas em queda</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {atRisk.map((r) => r.full_name || r.email || r.scope_label).join(', ')} — receita e novos utilizadores caíram face à quinzena anterior. Accionar suporte intensivo, não sanção.
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : error ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Sem permissão ou erro ao carregar o ranking.</CardContent></Card>
      ) : !rows.length ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">Ainda não há gestores regionais atribuídos.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => {
            const growth = Number(r.revenue_recent) - Number(r.revenue_previous);
            return (
              <Card key={`${r.user_id}-${r.scope_label}`} className={r.declining ? 'border-destructive/40' : i === 0 ? 'border-primary/50' : undefined}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 text-center text-xl font-black">{MEDALS[i] || `#${i + 1}`}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{r.full_name || r.email || 'Gestor'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.scope_label} · {r.role === 'country_manager' ? 'Gestor de país' : 'Gestor provincial'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-primary">{r.score}</p>
                      <p className="text-[10px] text-muted-foreground">pontos</p>
                    </div>
                    <Badge variant={r.declining ? 'destructive' : 'secondary'} className="gap-1">
                      {r.declining ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                      {growth >= 0 ? '+' : ''}{money(growth)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                    <Kpi icon={<Users className="h-3 w-3" />} label="Utilizadores" value={r.total_users} />
                    <Kpi label="Novos" value={r.new_users} />
                    <Kpi icon={<Activity className="h-3 w-3" />} label="Activos" value={r.active_users} />
                    <Kpi label="Consultas" value={r.consultations_completed} />
                    <Kpi label="Visitas APE" value={r.ape_visits} />
                    <Kpi label="Adesão TARV" value={`${r.art_adherence}%`} highlight={Number(r.art_adherence) >= 90} />
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t pt-2">
                    <span>Receita da região: <strong className="text-foreground">{money(r.revenue)}</strong></span>
                    <span>Comissão do gestor (60%): <strong className="text-primary">{money(r.manager_commission)}</strong></span>
                    <span>Plataforma (40%): <strong className="text-foreground">{money(Number(r.revenue) - Number(r.manager_commission))}</strong></span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Toda a receita passa pela carteira digital e o split é calculado pelo sistema — o gestor não movimenta valores manualmente.
      </p>
    </div>
  );
}

function Kpi({ label, value, icon, highlight }: { label: string; value: number | string; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2">
      <p className={`text-base font-bold ${highlight ? 'text-primary' : ''}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">{icon}{label}</p>
    </div>
  );
}
