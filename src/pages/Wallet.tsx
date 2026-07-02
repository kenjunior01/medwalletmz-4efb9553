import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, Gift, RefreshCw, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="font-bold">Minha Carteira</h1>
      </header>

      <div className="p-4 space-y-4">
        <Card className="p-6 bg-gradient-to-br from-primary to-pharmacy text-primary-foreground border-none">
          <div className="flex items-center gap-2 text-xs opacity-90"><WalletIcon className="h-4 w-4" /> Saldo disponível</div>
          <p className="text-4xl font-extrabold mt-2">
            {loading ? '...' : (wallet?.balance_mzn ?? 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
            <span className="text-base font-normal ml-2">MZN</span>
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
            <div className="bg-white/10 rounded-lg p-2">
              <p className="opacity-80">Depositado</p>
              <p className="font-bold">{(wallet?.total_deposited ?? 0).toLocaleString()} MZN</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <p className="opacity-80">Gasto</p>
              <p className="font-bold">{(wallet?.total_spent ?? 0).toLocaleString()} MZN</p>
            </div>
          </div>
          <Button variant="secondary" className="w-full mt-4" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Depositar saldo
          </Button>
          <Button asChild variant="outline" className="w-full mt-2 bg-white/10 border-white/30 text-white hover:bg-white/20">
            <a href="/withdraw">Levantar (profissionais)</a>
          </Button>
        </Card>

        <Card className="p-3 bg-gold/5 border-gold/30 text-sm">
          <p className="font-semibold flex items-center gap-1"><Gift className="h-4 w-4 text-gold" /> Bónus de depósito</p>
          <p className="text-xs text-muted-foreground mt-1">
            Recebes <b>+{bonusPct}%</b> em cada depósito. Ex: depositas 1000 MZN, ficas com {1000 + (1000 * bonusPct / 100)} MZN.
          </p>
        </Card>

        <div>
          <h2 className="font-semibold mb-2">Histórico</h2>
          {tx.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">Sem movimentos ainda.</Card>
          ) : (
            <div className="space-y-2">
              {tx.map(t => {
                const Icon = ICONS[t.type] || RefreshCw;
                const isOut = ['debit', 'commission'].includes(t.type);
                return (
                  <Card key={t.id} className="p-3 flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg bg-muted flex items-center justify-center ${COLORS[t.type] || ''}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{t.description || t.type}</p>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 capitalize ${
                          t.status === 'confirmed' ? 'border-emerald/40 text-emerald' :
                          t.status === 'refunded' ? 'border-destructive/40 text-destructive' :
                          'border-gold/40'
                        }`}>{t.status || 'confirmed'}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(t.created_at).toLocaleString('pt-PT')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${isOut ? 'text-destructive' : 'text-pharmacy'} ${t.status === 'refunded' ? 'line-through opacity-60' : ''}`}>
                        {isOut ? '-' : '+'}{Number(t.amount).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{Number(t.balance_after).toFixed(2)} MZN</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Depositar saldo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Valor (MZN)</label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ex: 500" min={50} />
              <p className="text-xs text-muted-foreground mt-1">Mínimo 50 MZN</p>
            </div>
            <div>
              <label className="text-sm font-medium">Método</label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="emola">e-Mola</SelectItem>
                  <SelectItem value="mkesh">Mkesh</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[200, 500, 1000, 2000].map(v => (
                <Button key={v} variant="outline" size="sm" onClick={() => setAmount(String(v))}>{v}</Button>
              ))}
            </div>
            {bonusPreview > 0 && (
              <div className="bg-gold/10 rounded-lg p-2 text-xs">
                <Gift className="h-3 w-3 inline text-gold" /> Recebes +<b>{bonusPreview} MZN</b> de bónus ({bonusPct}%).
              </div>
            )}
            <Button className="w-full" onClick={handleDeposit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar depósito'}
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
