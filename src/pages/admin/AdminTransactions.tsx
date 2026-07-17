import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, Gift, Wallet as WalletIcon, Search, Plus, Minus, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCountry } from '@/contexts/CountryContext';
import { formatCurrency } from '@/lib/currency';

const STATUS_COLOR: Record<string, string> = {
  confirmed: 'bg-emerald/15 text-emerald border-emerald/40',
  pending: 'bg-amber-500/15 text-amber-600 border-amber-500/40',
  refunded: 'bg-destructive/15 text-destructive border-destructive/40',
  reversed: 'bg-muted text-muted-foreground',
};

const TYPE_ICONS: Record<string, any> = {
  deposit: ArrowDownCircle, debit: ArrowUpCircle, credit: ArrowDownCircle,
  refund: RefreshCw, bonus: Gift, commission: ArrowUpCircle, referral: Gift,
};

export default function AdminTransactions() {
  const { country } = useCountry();
  const currency = (country?.currency_code as any) || 'MZN';
  const fmt = (v: number) => formatCurrency(Number(v || 0), currency);
  const [status, setStatus] = useState<string>('all');
  const [type, setType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [refundFor, setRefundFor] = useState<any>(null);
  const [adjustFor, setAdjustFor] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [adjAmt, setAdjAmt] = useState('');
  const [adjDir, setAdjDir] = useState<'credit' | 'debit'>('credit');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-tx', status, type, search],
    queryFn: async () => {
      let q = supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }).limit(200);
      if (status !== 'all') q = q.eq('status', status);
      if (type !== 'all') q = q.eq('type', type);
      const { data: rows } = await q;
      const ids = Array.from(new Set((rows || []).map(r => r.user_id)));
      const { data: profs } = await (supabase.rpc as any)('list_profiles_admin', { _ids: ids });
      const enriched = (rows || []).map(r => ({ ...r, profile: profs?.find(p => p.user_id === r.user_id) }));
      return search ? enriched.filter(r => r.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) || r.profile?.phone?.includes(search) || r.description?.toLowerCase().includes(search.toLowerCase())) : enriched;
    },
    refetchInterval: 15000,
  });

  const totals = data?.reduce((a: any, t: any) => {
    if (t.status !== 'confirmed') return a;
    if (['debit', 'commission'].includes(t.type)) a.out += Number(t.amount);
    else if (['deposit', 'bonus', 'credit', 'refund', 'referral'].includes(t.type)) a.in += Number(t.amount);
    if (t.type === 'commission') a.commission += Number(t.amount);
    if (t.status === 'refunded' || t.type === 'refund') a.refunds += Number(t.amount);
    return a;
  }, { in: 0, out: 0, commission: 0, refunds: 0 });

  const doRefund = async () => {
    if (!refundFor) return;
    const { error } = await supabase.rpc('wallet_refund', { _tx_id: refundFor.id, _reason: reason || null });
    if (error) return toast.error(error.message);
    toast.success('Reembolso aplicado');
    setRefundFor(null); setReason(''); refetch();
  };

  const doAdjust = async () => {
    const v = parseFloat(adjAmt);
    if (!v || !adjustFor) return;
    const { error } = await supabase.rpc('wallet_admin_adjust', {
      _user_id: adjustFor.user_id, _amount: v, _direction: adjDir, _reason: reason || 'Ajuste manual',
    });
    if (error) return toast.error(error.message);
    toast.success('Ajuste aplicado'); setAdjustFor(null); setAdjAmt(''); setReason(''); refetch();
  };

  const approveDeposit = async (tx: any) => {
    if (!confirm('Confirmas que o valor foi recebido offline?')) return;
    try {
      // Chamamos o RPC de ajuste para efetivar o crédito
      const { error } = await supabase.rpc('wallet_admin_adjust', {
        _user_id: tx.user_id,
        _amount: Number(tx.amount),
        _direction: 'credit',
        _reason: `Aprovação de depósito offline (${tx.metadata?.payment_method?.toUpperCase()}) - Ref: ${tx.metadata?.payment_reference}`,
      });

      if (error) throw error;

      // Marcamos a transação original como confirmada
      await supabase.from('wallet_transactions').update({ status: 'confirmed' }).eq('id', tx.id);

      toast.success('Depósito aprovado e creditado!');
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl panel-shell">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Transações</h1>
          <p className="text-sm text-muted-foreground">Estados, reembolsos e ajustes manuais</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Entradas</p>
          <p className="text-2xl font-bold text-emerald">{fmt(totals?.in || 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Saídas</p>
          <p className="text-2xl font-bold text-primary">{fmt(totals?.out || 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Comissões</p>
          <p className="text-2xl font-bold text-secondary">{fmt(totals?.commission || 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Reembolsos</p>
          <p className="text-2xl font-bold text-destructive">{fmt(totals?.refunds || 0)}</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar nome, telefone ou descrição..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            <SelectItem value="confirmed">Confirmadas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="refunded">Reembolsadas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="deposit">Depósitos</SelectItem>
            <SelectItem value="debit">Pagamentos</SelectItem>
            <SelectItem value="commission">Comissões</SelectItem>
            <SelectItem value="refund">Reembolsos</SelectItem>
            <SelectItem value="bonus">Bónus</SelectItem>
            <SelectItem value="referral">Convites</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card><CardContent className="p-0">
        {isLoading ? <div className="p-8 text-center">A carregar...</div> : (
          <div className="divide-y">
            {data?.map(t => {
              const Icon = TYPE_ICONS[t.type] || RefreshCw;
              const isOut = ['debit', 'commission'].includes(t.type);
              return (
                <div key={t.id} className="p-4 flex items-center gap-4 hover:bg-muted/30">
                  <div className={`h-10 w-10 rounded-xl bg-muted flex items-center justify-center ${isOut ? 'text-destructive' : 'text-emerald'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{t.profile?.full_name || 'Utilizador'}</p>
                      <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLOR[t.status] || ''}`}>{t.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{t.description || t.reference_type}</p>
                    {(t.metadata as any)?.payment_reference && (
                      <p className="text-[10px] font-mono bg-muted/50 inline-block px-1 rounded mt-0.5">
                        REF: {(t.metadata as any).payment_reference} · TEL: {(t.metadata as any).payment_phone || '—'}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString('pt-PT')}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-base font-bold ${isOut ? 'text-destructive' : 'text-emerald'}`}>
                      {isOut ? '-' : '+'}{fmt(Number(t.amount))}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Saldo: {Number(t.balance_after).toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col gap-1 ml-2">
                    {t.type === 'deposit' && t.status === 'pending' && (
                      <Button size="sm" className="bg-emerald hover:bg-emerald/90 text-white" onClick={() => approveDeposit(t)}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovar
                      </Button>
                    )}
                    {t.type === 'debit' && t.status === 'confirmed' && (
                      <Button size="sm" variant="outline" onClick={() => setRefundFor(t)}>
                        <RefreshCw className="h-3 w-3 mr-1" /> Reembolsar
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => { setAdjustFor(t); setAdjDir('credit'); }}>
                      <WalletIcon className="h-3 w-3 mr-1" /> Ajustar
                    </Button>
                  </div>
                </div>
              );
            })}
            {!data?.length && <div className="p-8 text-center text-muted-foreground text-sm">Sem transações.</div>}
          </div>
        )}
      </CardContent></Card>

      <Dialog open={!!refundFor} onOpenChange={() => setRefundFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reembolsar {fmt(Number(refundFor?.amount || 0))}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{refundFor?.description}</p>
          <Input placeholder="Motivo (opcional)" value={reason} onChange={e => setReason(e.target.value)} />
          <Button onClick={doRefund} className="w-full"><RefreshCw className="h-4 w-4 mr-1" />Confirmar reembolso</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!adjustFor} onOpenChange={() => setAdjustFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Ajuste manual</DialogTitle></DialogHeader>
          <div className="flex gap-2">
            <Button variant={adjDir === 'credit' ? 'default' : 'outline'} className="flex-1" onClick={() => setAdjDir('credit')}>
              <Plus className="h-4 w-4 mr-1" /> Creditar
            </Button>
            <Button variant={adjDir === 'debit' ? 'default' : 'outline'} className="flex-1" onClick={() => setAdjDir('debit')}>
              <Minus className="h-4 w-4 mr-1" /> Debitar
            </Button>
          </div>
          <Input type="number" placeholder="Valor" value={adjAmt} onChange={e => setAdjAmt(e.target.value)} />
          <Input placeholder="Motivo (obrigatório)" value={reason} onChange={e => setReason(e.target.value)} />
          <Button onClick={doAdjust} className="w-full" disabled={!adjAmt || !reason}>Aplicar ajuste</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}