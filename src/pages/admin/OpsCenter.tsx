/**
 * F45 — Torre de Controlo Global (Ops Center)
 * REA: Uber Ops Command Center (live monitoring de marketplace health)
 * + Stripe dashboard (métricas por mercado) + MyChart (clareza clínica).
 *
 * RPCs (F45): global_ops_stats() + global_activity_feed(limit)
 * Tudo agregado NO SERVIDOR — 1 round trip por painel, tempo real por canal.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity, Radio, TrendingUp, Globe, RefreshCw, Users,
  Stethoscope, ShoppingBag, Wallet, UserPlus, Zap,
} from '@/components/icons/lucide-compat';
import { useCountry } from '@/contexts/CountryContext';
import { useGlobalAdminGuard } from '@/hooks/useAdminGuard';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

/* ── tipos da resposta do RPC ──────────────────────────────────────────── */
interface OpsCountry {
  country_id: string;
  country_name: string;
  flag_url: string;
  currency: string;
  users: number;
  doctors: number;
  orders: number;
  gmv: number;
  wallet_balance: number;
  consultations: number;
  new_users_30d: number;
}
interface OpsStats {
  success: boolean;
  error?: string;
  totals?: Record<string, number>;
  countries?: OpsCountry[];
  series?: {
    signups: { day: string; n: number }[];
    orders: { day: string; n: number; gmv: number }[];
    consultations: { day: string; n: number }[];
  };
  computed_at?: string;
}
interface FeedItem { kind: string; title: string; country_id: string | null; at: string; }

const nf = new Intl.NumberFormat('pt', { maximumFractionDigits: 0 });
const money = (v: number) => (Math.abs(v) >= 1_000_000
  ? (v / 1_000_000).toFixed(1).replace('.', ',') + 'M'
  : nf.format(v));

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const KIND_META: Record<string, { icon: typeof Activity; cls: string }> = {
  signup:       { icon: UserPlus,     cls: 'text-emerald-600 bg-emerald-500/10' },
  order:        { icon: ShoppingBag,  cls: 'text-blue-600 bg-blue-500/10' },
  consultation: { icon: Stethoscope,  cls: 'text-rose-600 bg-rose-500/10' },
  prescription: { icon: Zap,          cls: 'text-violet-600 bg-violet-500/10' },
  wallet:       { icon: Wallet,       cls: 'text-amber-600 bg-amber-500/10' },
};

export default function OpsCenter() {
  useGlobalAdminGuard();
  const { t } = useCountry();
  const qc = useQueryClient();
  const [now, setNow] = useState(Date.now());

  const stats = useQuery({
    queryKey: ['ops-center-stats'],
    queryFn: async (): Promise<OpsStats> => {
      const { data, error } = await supabase.rpc('global_ops_stats' as never);
      if (error) throw error;
      return (data ?? { success: false, error: 'empty' }) as OpsStats;
    },
    refetchInterval: 30_000,
  });

  const feed = useQuery({
    queryKey: ['ops-center-feed'],
    queryFn: async (): Promise<FeedItem[]> => {
      const { data, error } = await supabase.rpc('global_activity_feed' as never, { p_limit: 30 } as never);
      if (error) throw error;
      const res = data as { success: boolean; items?: FeedItem[] } | null;
      return res?.items ?? [];
    },
    refetchInterval: 20_000,
  });

  /* Tempo real: qualquer movimento invalida os painéis (padrão admin repo) */
  useEffect(() => {
    const ch = supabase
      .channel('ops-center-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        qc.invalidateQueries({ queryKey: ['ops-center-stats'] });
        qc.invalidateQueries({ queryKey: ['ops-center-feed'] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
        qc.invalidateQueries({ queryKey: ['ops-center-stats'] });
        qc.invalidateQueries({ queryKey: ['ops-center-feed'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations' }, () => {
        qc.invalidateQueries({ queryKey: ['ops-center-stats'] });
        qc.invalidateQueries({ queryKey: ['ops-center-feed'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  /* Relógio do "atualizado há X" */
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const totals = stats.data?.totals;
  const countries = stats.data?.countries ?? [];
  const series = stats.data?.series;

  const growth = useMemo(() => {
    if (!series?.orders) return [];
    return series.orders.map((o, i) => ({
      day: String(o.day).slice(5),
      encomendas: o.n,
      registos: series.signups?.[i]?.n ?? 0,
    }));
  }, [series]);

  const topGmv = useMemo(() => countries[0]?.gmv ?? 0, [countries]);

  const kpis = [
    { key: 'users',       icon: Users,       value: nf.format(totals?.users ?? 0) },
    { key: 'doctors',     icon: Stethoscope, value: nf.format(totals?.doctors ?? 0) },
    { key: 'consults',    icon: Activity,    value: nf.format(totals?.consultations ?? 0) },
    { key: 'orders',      icon: ShoppingBag, value: nf.format(totals?.orders ?? 0) },
    { key: 'gmv',         icon: TrendingUp,  value: money(totals?.gmv ?? 0) },
    { key: 'wallet',      icon: Wallet,      value: money(totals?.wallet_balance ?? 0) },
  ];

  if (stats.isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (stats.data && !stats.data.success) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('opsCenter.denied_title')}</CardTitle>
            <CardDescription>
              {stats.data.error === 'forbidden'
                ? t('opsCenter.denied_body')
                : `${t('opsCenter.rpc_missing')} ${stats.data.error ?? ''}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => stats.refetch()} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" /> {t('opsCenter.retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* ── Cabeçalho ao vivo ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Globe className="h-8 w-8 text-primary" />
            {t('opsCenter.title')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('opsCenter.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
            <Radio className="h-3.5 w-3.5 animate-pulse" /> {t('opsCenter.live')}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {t('opsCenter.updated')} {timeAgo(stats.data?.computed_at ?? new Date().toISOString())} · {now > 0 ? '' : ''}
          </span>
          <Button variant="outline" size="sm" onClick={() => { stats.refetch(); feed.refetch(); }} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> {t('opsCenter.refresh')}
          </Button>
        </div>
      </div>

      {/* ── KPIs globais ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map(({ key, icon: Icon, value }) => (
          <Card key={key} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-black mt-2 tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{t(`opsCenter.kpi_${key}`)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Crescimento 14 dias + ranking GMV ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">{t('opsCenter.growth_title')}</CardTitle>
            <CardDescription>{t('opsCenter.growth_sub')}</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growth} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ocOrd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="ocSig" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.30} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="encomendas" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#ocOrd)" />
                <Area type="monotone" dataKey="registos" stroke="#10b981" strokeWidth={2} fill="url(#ocSig)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('opsCenter.gmv_rank')}</CardTitle>
            <CardDescription>{t('opsCenter.gmv_rank_sub')}</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={countries.slice(0, 6).map(c => ({ name: c.country_id, gmv: c.gmv }))} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} hide />
                <YAxis type="category" dataKey="name" fontSize={12} width={44} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="gmv" radius={[0, 6, 6, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Mapa de mercados (drill-down mundial) ─────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> {t('opsCenter.markets')}
          </CardTitle>
          <CardDescription>{t('opsCenter.markets_sub')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {countries.map(c => {
              const share = topGmv > 0 ? Math.min(100, Math.round((c.gmv / topGmv) * 100)) : 0;
              return (
                <div key={c.country_id} className="rounded-xl border p-4 space-y-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {c.flag_url
                        ? <img src={c.flag_url} alt="" className="h-6 w-9 rounded object-cover" />
                        : <span className="text-lg font-black">{c.country_id}</span>}
                      <span className="font-bold truncate">{c.country_name}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{c.currency}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">{t('opsCenter.kpi_users')}</span>
                    <span className="text-right font-semibold tabular-nums">{nf.format(c.users)}</span>
                    <span className="text-muted-foreground">{t('opsCenter.kpi_doctors')}</span>
                    <span className="text-right font-semibold tabular-nums">{nf.format(c.doctors)}</span>
                    <span className="text-muted-foreground">{t('opsCenter.kpi_consults')}</span>
                    <span className="text-right font-semibold tabular-nums">{nf.format(c.consultations)}</span>
                    <span className="text-muted-foreground">{t('opsCenter.kpi_orders')}</span>
                    <span className="text-right font-semibold tabular-nums">{nf.format(c.orders)}</span>
                    <span className="text-muted-foreground">{t('opsCenter.kpi_gmv')}</span>
                    <span className="text-right font-semibold tabular-nums">{money(c.gmv)} {c.currency}</span>
                    <span className="text-muted-foreground">{t('opsCenter.new30')}</span>
                    <span className="text-right font-semibold tabular-nums text-emerald-600">+{nf.format(c.new_users_30d)}</span>
                  </div>
                  <div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(share, c.users > 0 ? 4 : 0)}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{t('opsCenter.share')} {share}%</p>
                  </div>
                </div>
              );
            })}
            {countries.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full">{t('opsCenter.no_markets')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Atividade ao vivo ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600" /> {t('opsCenter.feed')}
            <Badge variant="outline" className="ml-auto text-[10px] gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> {t('opsCenter.live')}
            </Badge>
          </CardTitle>
          <CardDescription>{t('opsCenter.feed_sub')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 max-h-96 overflow-y-auto">
          {(feed.data ?? []).map((it, i) => {
            const meta = KIND_META[it.kind] ?? KIND_META.signup;
            const Icon = meta.icon;
            const flag = it.country_id ? countries.find(c => c.country_id === it.country_id)?.country_id : null;
            return (
              <div key={`${it.at}-${i}`} className="flex items-center gap-3 py-2 border-b border-border/60 last:border-0">
                <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${meta.cls}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{it.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {flag ? `${flag} · ` : ''}{t(`opsCenter.kind_${it.kind}`)}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">{timeAgo(it.at)}</span>
              </div>
            );
          })}
          {feed.data?.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">{t('opsCenter.feed_empty')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
