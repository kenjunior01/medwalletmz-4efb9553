/**
 * AdminMonetization.tsx — Dashboard Admin de Monetização MZ
 * ====================================================================
 * Página única onde o admin pode:
 *   1. Ver KPIs consolidados (pending/confirmed/today/total MZN)
 *   2. Listar pagamentos M-Pesa pendentes e confirmar/rejeitar
 *   3. Listar subscrições pendentes (com plano + utilizador)
 *   4. Sincronizar planos MZ à BD (botão "Re-sincronizar planos")
 *   5. Ver timeline de activações recentes
 *
 * Rota: /admin/monetization
 * Guard: useGlobalAdminGuard (apenas admin global)
 * ====================================================================
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalAdminGuard } from '@/hooks/useAdminGuard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, CheckCircle2, XCircle, Loader2, RefreshCw, Wallet, TrendingUp,
  Clock, Crown, Users, Sparkles, Phone, Copy, Search, Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  getMonetizationStats,
  listPendingPaymentsForAdmin,
  listPendingSubscriptionsForAdmin,
  confirmSubscriptionPayment,
  rejectSubscriptionPayment,
  type MonetizationStats,
} from '@/lib/mzMonetization';
import { seedMzPlans, MZ_ALL_PLANS, formatMZN } from '@/lib/mzPlans';

interface PendingPayment {
  id: string;
  reference: string;
  amount_mzn: number;
  description: string;
  payer_phone?: string;
  payer_name?: string;
  created_at: string;
  metadata?: any;
  subscription_id?: string;
}

interface PendingSub {
  id: string;
  user_id: string;
  amount_paid: number;
  payment_method: string;
  created_at: string;
  plan_name: string;
  plan_slug: string;
}

interface RecentActivation {
  id: string;
  amount_mzn: number;
  reference: string;
  confirmed_at: string;
  payer_phone?: string;
  description?: string;
}

export default function AdminMonetization() {
  useGlobalAdminGuard();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<MonetizationStats | null>(null);
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [subs, setSubs] = useState<PendingSub[]>([]);
  const [recent, setRecent] = useState<RecentActivation[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedLoading, setSeedLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [txInput, setTxInput] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, sub, r] = await Promise.all([
        getMonetizationStats(),
        listPendingPaymentsForAdmin(),
        listPendingSubscriptionsForAdmin(),
        fetchRecentActivations(),
      ]);
      setStats(s);
      setPayments(p as PendingPayment[]);
      setSubs(sub as PendingSub[]);
      setRecent(r);
    } catch (e) {
      console.error('[AdminMonetization] refresh error:', e);
      toast.error('Erro ao carregar dados de monetização.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Auto-refresh a cada 30s
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  async function fetchRecentActivations(): Promise<RecentActivation[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('mpesa_manual_payments')
        .select('id, amount_mzn, reference, confirmed_at, payer_phone, description')
        .eq('status', 'confirmed')
        .order('confirmed_at', { ascending: false })
        .limit(10);
      if (error || !data) return [];
      return data.map((r: any) => ({
        id: r.id,
        amount_mzn: Number(r.amount_mzn),
        reference: r.reference,
        confirmed_at: r.confirmed_at,
        payer_phone: r.payer_phone,
        description: r.description,
      }));
    } catch {
      return [];
    }
  }

  async function handleConfirm(p: PendingPayment) {
    if (!user) return;
    const txId = txInput[p.id]?.trim();
    if (!txId) {
      toast.error('Cola o ID de transação M-Pesa para confirmar.');
      return;
    }
    setConfirming(p.id);
    try {
      const ok = await confirmSubscriptionPayment({
        paymentId: p.id,
        mpesaTransactionId: txId,
        adminId: user.id,
      });
      if (ok) {
        toast.success(`Pagamento ${p.reference} confirmado! Subscrição activada.`);
        setTxInput((prev) => ({ ...prev, [p.id]: '' }));
        await refresh();
      } else {
        toast.error('Falha ao confirmar pagamento.');
      }
    } finally {
      setConfirming(null);
    }
  }

  async function handleReject(p: PendingPayment) {
    if (!user) return;
    setRejecting(p.id);
    try {
      const ok = await rejectSubscriptionPayment({
        paymentId: p.id,
        reason: 'Rejeitado pelo admin (sem ID de transação válido)',
        adminId: user.id,
      });
      if (ok) {
        toast.success(`Pagamento ${p.reference} rejeitado.`);
        await refresh();
      } else {
        toast.error('Falha ao rejeitar pagamento.');
      }
    } finally {
      setRejecting(null);
    }
  }

  async function handleSeed() {
    setSeedLoading(true);
    try {
      const { seeded, failed } = await seedMzPlans();
      if (failed.length === 0) {
        toast.success(`${seeded} planos MZ sincronizados com a BD.`, {
          description: 'Todos os 14 planos (6 B2C + 8 B2B) estão agora disponíveis para subscrição.',
        });
      } else {
        toast.warning(`${seeded} sincronizados, ${failed.length} falharam.`, {
          description: `Falhas: ${failed.join(', ')}`,
        });
      }
    } finally {
      setSeedLoading(false);
    }
  }

  const filteredPayments = payments.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.reference.toLowerCase().includes(q) ||
      (p.payer_phone || '').toLowerCase().includes(q) ||
      (p.payer_name || '').toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  });

  const filteredSubs = subs.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.plan_name.toLowerCase().includes(q) ||
      s.plan_slug.toLowerCase().includes(q) ||
      s.user_id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* HEADER */}
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 py-3 backdrop-blur border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">Monetização MZ</h1>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
        <Button size="sm" onClick={handleSeed} disabled={seedLoading}>
          {seedLoading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          )}
          Sincronizar planos
        </Button>
      </header>

      <section className="p-4 space-y-4 max-w-5xl mx-auto">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Receita hoje"
            value={`${stats ? formatMZN(stats.confirmedAmountTodayMzn) : '—'} MZN`}
            sub={`${stats?.confirmedToday ?? 0} pagamentos confirmados`}
            icon={TrendingUp}
            color="text-emerald-600"
            bg="bg-emerald-50 dark:bg-emerald-950/30"
          />
          <KpiCard
            label="Total confirmado"
            value={`${stats ? formatMZN(stats.totalConfirmedMzn) : '—'} MZN`}
            sub="All-time (M-Pesa)"
            icon={Wallet}
            color="text-primary"
            bg="bg-primary/5"
          />
          <KpiCard
            label="Pendentes"
            value={`${stats ? formatMZN(stats.pendingAmountMzn) : '—'} MZN`}
            sub={`${stats?.pendingPayments ?? 0} pagamentos aguardam`}
            icon={Clock}
            color="text-amber-600"
            bg="bg-amber-50 dark:bg-amber-950/30"
          />
          <KpiCard
            label="Subs activas"
            value={`${stats?.activeSubscriptions ?? 0}`}
            sub={`${stats?.pendingSubscriptions ?? 0} aguardam validação`}
            icon={Crown}
            color="text-purple-600"
            bg="bg-purple-50 dark:bg-purple-950/30"
          />
        </div>

        {/* SEARCH */}
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por referência, telefone, plano…"
            className="pl-9"
          />
        </div>

        {/* TABS */}
        <Tabs defaultValue="payments">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="payments" className="gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              Pagamentos ({filteredPayments.length})
            </TabsTrigger>
            <TabsTrigger value="subs" className="gap-1.5">
              <Crown className="h-3.5 w-3.5" />
              Subscrições ({filteredSubs.length})
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Activadas ({recent.length})
            </TabsTrigger>
          </TabsList>

          {/* PAGAMENTOS PENDENTES */}
          <TabsContent value="payments" className="space-y-3 mt-4">
            {loading ? (
              <Card className="p-8 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
                A carregar pagamentos pendentes...
              </Card>
            ) : filteredPayments.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                Sem pagamentos pendentes. Tudo confirmado!
              </Card>
            ) : (
              filteredPayments.map((p) => (
                <Card key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono font-bold text-sm">{p.reference}</p>
                        <Badge variant="outline">{formatMZN(p.amount_mzn)} MZN</Badge>
                        {p.subscription_id && (
                          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                            <Crown className="h-3 w-3 mr-1" />
                            Subscrição
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        {p.payer_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {p.payer_phone}
                          </span>
                        )}
                        {p.payer_name && <span className="truncate">{p.payer_name}</span>}
                        <span className="text-muted-foreground">
                          {new Date(p.created_at).toLocaleString('pt-MZ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acções */}
                  <div className="mt-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <Input
                      value={txInput[p.id] || ''}
                      onChange={(e) => setTxInput((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      placeholder="ID transação M-Pesa (do SMS do cliente)"
                      className="font-mono text-xs flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(p)}
                      disabled={confirming === p.id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {confirming === p.id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      )}
                      Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(p)}
                      disabled={rejecting === p.id}
                    >
                      {rejecting === p.id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                      )}
                      Rejeitar
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* SUBSCRIÇÕES PENDENTES */}
          <TabsContent value="subs" className="space-y-3 mt-4">
            {loading ? (
              <Card className="p-8 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
                A carregar subscrições...
              </Card>
            ) : filteredSubs.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <Crown className="h-8 w-8 mx-auto mb-2" />
                Sem subscrições pendentes.
              </Card>
            ) : (
              filteredSubs.map((s) => (
                <Card key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Crown className="h-4 w-4 text-purple-600" />
                        <p className="font-bold text-sm">{s.plan_name}</p>
                        <Badge variant="outline">{formatMZN(s.amount_paid)} MZN</Badge>
                        <Badge variant="outline" className="capitalize">
                          {s.payment_method}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 font-mono">
                        {s.id.slice(0, 8)}… · user: {s.user_id.slice(0, 8)}…
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Criada: {new Date(s.created_at).toLocaleString('pt-MZ')}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ACTIVAÇÕES RECENTES */}
          <TabsContent value="recent" className="space-y-3 mt-4">
            {loading ? (
              <Card className="p-8 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
                A carregar activações recentes...
              </Card>
            ) : recent.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                Sem activações recentes.
              </Card>
            ) : (
              recent.map((r) => (
                <Card key={r.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-mono font-bold text-sm">{r.reference}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.description || 'Pagamento confirmado'}
                      </p>
                      {r.payer_phone && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="h-2.5 w-2.5" /> {r.payer_phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">{formatMZN(r.amount_mzn)} MZN</p>
                    <p className="text-[10px] text-muted-foreground">
                      {r.confirmed_at && new Date(r.confirmed_at).toLocaleString('pt-MZ')}
                    </p>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* PLANOS MZ INFO */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="font-bold text-sm">Planos MZ carregados em memória</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {MZ_ALL_PLANS.map((p) => (
              <div
                key={p.slug}
                className="flex items-center justify-between p-2 rounded border border-border/50"
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                    {p.slug}
                  </p>
                </div>
                <Badge variant="outline" className="ml-1 shrink-0">
                  {formatMZN(p.price_mzn)}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

// ---------- Subcomponente KPI ----------
function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof Wallet;
  color: string;
  bg: string;
}) {
  return (
    <Card className={`p-3 ${bg} border-0`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <p className="text-[10px] uppercase font-bold text-muted-foreground">{label}</p>
      </div>
      <p className={`text-lg font-black ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </Card>
  );
}
