import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, Gift, RefreshCw, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import NumberFlow from '@number-flow/react';
import {
  PanelShell, NeuCard, BentoCard, BentoGrid, GlassCard,
  LayeredOrbs, StatusBadge, SkipLink,
} from '@/components/ui/design-system';

const ICONS: Record<string, any> = {
  deposit: ArrowDownCircle, debit: ArrowUpCircle, credit: ArrowDownCircle,
  refund: RefreshCw, bonus: Gift, commission: ArrowUpCircle, referral: Gift,
};
const COLORS: Record<string, string> = {
  deposit: 'text-pharmacy', credit: 'text-pharmacy', refund: 'text-pharmacy',
  bonus: 'text-gold', referral: 'text-gold',
  debit: 'text-destructive', commission: 'text-destructive',
};

export default function Wallet() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallet, loading, deposit } = useWallet();
  const [tx, setTx] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('mpesa');
  const [bonusPct, setBonusPct] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const loadTx = async () => {
    if (!user) return;
    const { data } = await supabase.from('wallet_transactions').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    setTx(data || []);
  };

  useEffect(() => {
    loadTx();
    supabase.from('platform_settings').select('value').eq('key', 'deposit_bonus_percent').maybeSingle()
      .then(({ data }) => { if (data) setBonusPct(Number(data.value)); });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`wallet-tx-${user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${user.id}` },
        (p: any) => setTx(prev => [p.new, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const handleDeposit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 50) { toast.error('Mínimo 50 MZN'); return; }
    setSubmitting(true);
    try {
      const r = await deposit(amt, method);
      toast.success(`Depositado ${amt} MZN${r?.bonus ? ` + ${r.bonus} bónus` : ''}`);
      setOpen(false); setAmount('');
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  const bonusPreview = amount ? Math.round(parseFloat(amount) * bonusPct) / 100 : 0;
  const balance = Number(wallet?.balance_mzn ?? 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <SkipLink />
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-bold text-lg">Minha Carteira</h1>
      </header>

      <main id="main" className="p-4 space-y-5">
        {/* Hero — panel-shell com orbs + saldo animado */}
        <PanelShell className="p-6">
          <LayeredOrbs variant="ocean" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <WalletIcon className="h-4 w-4" aria-hidden="true" /> Saldo disponível
          </div>
          <p
            className="text-5xl font-black mt-2 num-pulse tabular-nums text-gradient-premium"
            aria-live="polite"
          >
            <NumberFlow value={balance} format={{ minimumFractionDigits: 2 }} />
            <span className="text-lg font-semibold ml-2 text-muted-foreground">MZN</span>
          </p>

          <BentoGrid className="mt-5 grid-cols-2 md:grid-cols-2">
            <BentoCard size="sm" className="!col-span-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Depositado</p>
              <p className="text-xl font-bold mt-1 text-pharmacy">
                <NumberFlow value={Number(wallet?.total_deposited ?? 0)} /> <span className="text-xs">MZN</span>
              </p>
            </BentoCard>
            <BentoCard size="sm" className="!col-span-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Gasto</p>
              <p className="text-xl font-bold mt-1 text-primary">
                <NumberFlow value={Number(wallet?.total_spent ?? 0)} /> <span className="text-xs">MZN</span>
              </p>
            </BentoCard>
          </BentoGrid>

          <div className="grid grid-cols-2 gap-2 mt-5">
            <Button
              className="neu-btn h-12 bg-transparent hover:bg-transparent text-foreground font-semibold"
              onClick={() => setOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" aria-hidden="true" /> Depositar
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 border-secondary/40 hover:bg-secondary/10"
            >
              <a href="/withdraw">Levantar</a>
            </Button>
          </div>
        </PanelShell>

        {/* Bonus glass card */}
        <GlassCard className="border-gold/30">
          <p className="font-semibold flex items-center gap-2 text-sm">
            <Gift className="h-4 w-4 text-gold" aria-hidden="true" /> Bónus de depósito
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Recebes <b className="text-gold">+{bonusPct}%</b> em cada depósito.
            Ex.: 1000 MZN → {(1000 + (1000 * bonusPct / 100)).toLocaleString()} MZN.
          </p>
        </GlassCard>

        {/* Histórico */}
        <section aria-labelledby="hist-h">
          <h2 id="hist-h" className="font-bold text-base mb-3">Histórico</h2>
          {tx.length === 0 ? (
            <NeuCard className="text-center text-sm text-muted-foreground py-8">
              Sem movimentos ainda.
            </NeuCard>
          ) : (
            <div className="space-y-2">
              {tx.map(t => {
                const Icon = ICONS[t.type] || RefreshCw;
                const isOut = ['debit', 'commission'].includes(t.type);
                const st = (t.status || 'confirmed') as 'pending' | 'confirmed' | 'refunded';
                return (
                  <NeuCard key={t.id} className="!p-3 flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl neu-inset flex items-center justify-center ${COLORS[t.type] || ''}`}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold truncate">{t.description || t.type}</p>
                        <StatusBadge status={st} />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(t.created_at).toLocaleString('pt-PT')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black tabular-nums ${isOut ? 'text-destructive' : 'text-pharmacy'} ${st === 'refunded' ? 'line-through opacity-60' : ''}`}>
                        {isOut ? '−' : '+'}{Number(t.amount).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {Number(t.balance_after).toFixed(2)} MZN
                      </p>
                    </div>
                  </NeuCard>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Depositar saldo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label htmlFor="dep-amt" className="text-sm font-medium">Valor (MZN)</label>
              <Input id="dep-amt" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ex: 500" min={50} />
              <p className="text-xs text-muted-foreground mt-1">Mínimo 50 MZN</p>
            </div>
            <div>
              <label htmlFor="dep-method" className="text-sm font-medium">Método</label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger id="dep-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="emola">e-Mola</SelectItem>
                  <SelectItem value="mkesh">Mkesh</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[200, 500, 1000, 2000].map(v => (
                <Button key={v} variant="outline" size="sm" onClick={() => setAmount(String(v))} aria-label={`Preencher com ${v} MZN`}>{v}</Button>
              ))}
            </div>
            {bonusPreview > 0 && (
              <div className="bg-gold/10 rounded-lg p-2 text-xs">
                <Gift className="h-3 w-3 inline text-gold" aria-hidden="true" /> Recebes +<b>{bonusPreview} MZN</b> de bónus ({bonusPct}%).
              </div>
            )}
            <Button className="w-full" onClick={handleDeposit} disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /><span className="sr-only">A processar</span></> : 'Confirmar depósito'}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Receberás um SMS de confirmação no telefone associado ao {method.toUpperCase()}.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
