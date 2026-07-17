/**
 * MonetizationHub.tsx — Painel único de monetização para o utilizador
 * ====================================================================
 * Mostra de forma unificada:
 *   1. Estado da subscrição actual (ativa / pendente / nenhuma)
 *   2. Carteira M-Pesa (saldo + cashback + transacções recentes)
 *   3. Código de referral + amigos convidados + ganhos
 *   4. Pulse Coins + achievements + leaderboard
 *   5. CTA rápido para upgrade / ver planos
 *
 * Rota: /monetizacao
 * ====================================================================
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, Crown, Wallet as WalletIcon, Gift, Users, Coins, Sparkles,
  TrendingUp, ArrowRight, CheckCircle2, Clock, Loader2, Copy, Share2, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import NumberFlow from '@number-flow/react';
import { getUserActiveSubscription, type UserSubscriptionInfo } from '@/lib/mzMonetization';
import { formatMZN } from '@/lib/mzPlans';

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: typeof Crown }> = {
  active:   { label: 'Ativa',         color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: CheckCircle2 },
  pending:  { label: 'Aguarda validação', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', icon: Clock },
  expired:  { label: 'Expirada',      color: 'text-muted-foreground', bg: 'bg-muted', icon: Clock },
  rejected: { label: 'Rejeitada',     color: 'text-destructive', bg: 'bg-destructive/10', icon: Clock },
  cancelled:{ label: 'Cancelada',     color: 'text-muted-foreground', bg: 'bg-muted', icon: Clock },
  none:     { label: 'Sem plano',     color: 'text-muted-foreground', bg: 'bg-muted', icon: Crown },
};

function genCode(uid: string) {
  return ('MOZ' + uid.replace(/-/g, '').slice(0, 6)).toUpperCase();
}

export default function MonetizationHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallet, loading: walletLoading } = useWallet();

  const [sub, setSub] = useState<UserSubscriptionInfo | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [refCode, setRefCode] = useState('');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [refBonusMzn, setRefBonusMzn] = useState(100);
  const [refBonusCoins, setRefBonusCoins] = useState(100);
  const [txs, setTxs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // 1. Subscrição
      const subInfo = await getUserActiveSubscription(user.id);
      setSub(subInfo);
      setSubLoading(false);

      // 2. Referral code
      const { data: prof } = await (supabase as any)
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .maybeSingle();
      let c = prof?.referral_code;
      if (!c) {
        c = genCode(user.id);
        await (supabase as any).from('profiles').update({ referral_code: c }).eq('user_id', user.id);
      }
      setRefCode(c);

      // 3. Referral history
      const { data: refs } = await (supabase as any)
        .from('user_referrals')
        .select('*, referred_profile:profiles!user_referrals_referred_id_fkey(full_name)')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });
      setReferrals(refs ?? []);

      // 4. Referral bonus config
      const { data: settings } = await (supabase as any)
        .from('platform_settings')
        .select('key, value')
        .in('key', ['referral_bonus_mzn', 'referral_bonus_coins']);
      (settings || []).forEach((s: any) => {
        if (s.key === 'referral_bonus_mzn') setRefBonusMzn(Number(s.value));
        if (s.key === 'referral_bonus_coins') setRefBonusCoins(Number(s.value));
      });

      // 5. Wallet transactions (top 5)
      const { data: txData } = await (supabase as any)
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setTxs(txData ?? []);
    })();
  }, [user]);

  const statusMeta = sub ? STATUS_META[sub.status] : STATUS_META.none;
  const StatusIcon = statusMeta.icon;
  const refLink = `${window.location.origin}/auth?ref=${refCode}`;
  const completedRefs = referrals.filter((r) => r.status === 'completed').length;
  const totalRefMzn = referrals.reduce((a, r) => a + (Number(r.bonus_mzn) || 0), 0);
  const totalRefCoins = referrals.reduce((a, r) => a + (Number(r.bonus_coins) || 0), 0);

  const copyRef = () => {
    navigator.clipboard.writeText(refLink);
    toast.success('Link de convite copiado!');
  };

  const shareRef = async () => {
    const text = `Junta-te ao MedWallet e ganha ${refBonusMzn} MZN + ${refBonusCoins} Pulse! ${refLink}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'MedWallet MZ', text }); } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-6 text-center max-w-sm">
          <Crown className="h-10 w-10 mx-auto text-primary mb-2" />
          <p className="font-bold">Inicia sessão para ver o teu painel</p>
          <Button className="mt-4" onClick={() => navigate('/auth')}>Entrar</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-24">
      {/* HEADER */}
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 py-3 backdrop-blur border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">O meu MedWallet</h1>
        <Button variant="outline" size="sm" onClick={() => navigate('/planos')}>
          <Crown className="h-3.5 w-3.5 mr-1.5" />
          Planos
        </Button>
      </header>

      <section className="p-4 space-y-4 max-w-3xl mx-auto">
        {/* HERO — SUBSCRIPTION STATUS */}
        <Card className={`p-5 ${statusMeta.bg} border-0 relative overflow-hidden`}>
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 dark:bg-white/5 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase font-bold text-muted-foreground">
                  Plano actual
                </p>
                {subLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mt-2" />
                ) : sub?.plan ? (
                  <>
                    <h2 className="text-2xl font-black">{sub.plan.name}</h2>
                    <p className="text-xs text-muted-foreground">{sub.plan.tagline}</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-black">Sem plano</h2>
                    <p className="text-xs text-muted-foreground">Ainda não subscreveste nenhum plano.</p>
                  </>
                )}
              </div>
              <div className="text-right">
                <Badge className={`${statusMeta.color} ${statusMeta.bg} border-0 flex items-center gap-1`}>
                  <StatusIcon className="h-3 w-3" />
                  {statusMeta.label}
                </Badge>
                {sub?.amountPaid && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatMZN(sub.amountPaid)} MZN · {sub.paymentMethod?.toUpperCase()}
                  </p>
                )}
                {sub?.expiresAt && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Expira: {new Date(sub.expiresAt).toLocaleDateString('pt-MZ')}
                  </p>
                )}
              </div>
            </div>

            {/* CTA */}
            {!subLoading && (
              <div className="mt-4">
                {sub?.status === 'none' && (
                  <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={() => navigate('/planos')}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Escolher plano (199 MZN/mês+)
                  </Button>
                )}
                {sub?.status === 'pending' && (
                  <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/50 p-3 rounded-lg">
                    <Clock className="h-3.5 w-3.5 inline mr-1" />
                    Pagamento a aguardar validação. Activará em até 24h.
                  </div>
                )}
                {sub?.status === 'active' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/subscriptions')}
                    >
                      Ver detalhes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/planos')}
                    >
                      Fazer upgrade <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                )}
                {(sub?.status === 'expired' || sub?.status === 'rejected' || sub?.status === 'cancelled') && (
                  <Button
                    className="w-full"
                    onClick={() => navigate('/planos')}
                  >
                    Renovar plano
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* WALLET + REFERRAL GRID */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* WALLET */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <WalletIcon className="h-4 w-4 text-primary" />
                </div>
                <p className="font-bold text-sm">Carteira</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/carteira')}>
                <Plus className="h-3 w-3 mr-1" /> Depositar
              </Button>
            </div>
            {walletLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <p className="text-[10px] uppercase text-muted-foreground">Saldo disponível</p>
                <p className="text-3xl font-black text-primary">
                  <NumberFlow
                    value={wallet?.balance || 0}
                    format={{ style: 'currency', currency: wallet?.currency || 'MZN' }}
                  />
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Depositado</p>
                    <p className="font-bold">{formatMZN(wallet?.total_deposited || 0)} MZN</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Gasto</p>
                    <p className="font-bold">{formatMZN(wallet?.total_spent || 0)} MZN</p>
                  </div>
                </div>
                {txs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-[10px] uppercase text-muted-foreground mb-1.5">Recentes</p>
                    {txs.slice(0, 3).map((t: any) => (
                      <div key={t.id} className="flex justify-between text-xs py-1">
                        <span className="capitalize">{t.type}</span>
                        <span className={Number(t.amount) >= 0 ? 'text-emerald-600 font-bold' : 'text-destructive font-bold'}>
                          {Number(t.amount) >= 0 ? '+' : ''}{formatMZN(Number(t.amount))} MZN
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </Card>

          {/* REFERRAL */}
          <Card className="p-5 bg-gradient-to-br from-primary/5 to-pharmacy/5 border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-pharmacy/10 flex items-center justify-center">
                  <Gift className="h-4 w-4 text-pharmacy" />
                </div>
                <p className="font-bold text-sm">Convida e ganha</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/referrals')}>
                Ver todos
              </Button>
            </div>
            <div className="flex items-center justify-center gap-4 mb-3">
              <div className="text-center">
                <p className="text-2xl font-black text-pharmacy">+{refBonusMzn}</p>
                <p className="text-[10px] text-muted-foreground">MZN por amigo</p>
              </div>
              <div className="text-2xl text-muted-foreground/30">+</div>
              <div className="text-center">
                <p className="text-2xl font-black text-gold">+{refBonusCoins}</p>
                <p className="text-[10px] text-muted-foreground">Pulse</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={refCode}
                className="font-mono text-center font-bold"
              />
              <Button size="icon" variant="outline" onClick={copyRef}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" onClick={shareRef}>
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-1 mt-3 text-center text-xs">
              <div>
                <p className="font-bold">{referrals.length}</p>
                <p className="text-[9px] text-muted-foreground">Convidados</p>
              </div>
              <div>
                <p className="font-bold text-pharmacy">{formatMZN(totalRefMzn)}</p>
                <p className="text-[9px] text-muted-foreground">MZN ganhos</p>
              </div>
              <div>
                <p className="font-bold text-gold">{totalRefCoins}</p>
                <p className="text-[9px] text-muted-foreground">Pulse</p>
              </div>
            </div>
          </Card>
        </div>

        {/* REWARDS + ACHIEVEMENTS QUICK ACCESS */}
        <div className="grid grid-cols-2 gap-3">
          <Card
            className="p-4 cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => navigate('/recompensas')}
          >
            <div className="flex items-center gap-2 mb-2">
              <Coins className="h-4 w-4 text-gold" />
              <p className="font-bold text-sm">Recompensas Pulse</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Achievements, leaderboard e desafios semanais.
            </p>
            <Button variant="ghost" size="sm" className="mt-2 -ml-2 text-primary">
              Ver recompensas <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Card>
          <Card
            className="p-4 cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => navigate('/planos')}
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="font-bold text-sm">Fazer upgrade</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Desbloqueia especialistas, IA imagem, cashback 3%.
            </p>
            <Button variant="ghost" size="sm" className="mt-2 -ml-2 text-primary">
              Ver planos <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Card>
        </div>

        {/* BENEFITS QUICK ACCESS */}
        {sub?.status === 'active' && sub.plan && (
          <Card className="p-4">
            <p className="font-bold text-sm mb-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              Benefícios do teu plano
            </p>
            <ul className="space-y-1.5">
              {sub.plan.features.map((f, i) => (
                <li key={i} className="text-xs flex items-start gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
