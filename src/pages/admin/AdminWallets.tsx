import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wallet, Plus, Search, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminWallets() {
  const [search, setSearch] = useState('');
  const [creditOpen, setCreditOpen] = useState<any>(null);
  const [amt, setAmt] = useState('');
  const [desc, setDesc] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-wallets', search],
    queryFn: async () => {
      const { data: wallets } = await supabase
        .from('wallets')
        .select('user_id, balance_mzn, total_deposited, total_spent, updated_at')
        .order('balance_mzn', { ascending: false })
        .limit(100);
      const ids = (wallets || []).map(w => w.user_id);
      const { data: profs } = await (supabase.rpc as any)('list_profiles_admin', { _ids: ids });
      return (wallets || []).map(w => ({
        ...w,
        profile: profs?.find(p => p.user_id === w.user_id)
      })).filter(w => !search || w.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) || w.profile?.phone?.includes(search));
    }
  });

  const totals = data?.reduce((a, w) => ({
    bal: a.bal + Number(w.balance_mzn), dep: a.dep + Number(w.total_deposited), spent: a.spent + Number(w.total_spent)
  }), { bal: 0, dep: 0, spent: 0 });

  const credit = async () => {
    const v = parseFloat(amt);
    if (!v || !creditOpen) return;
    const { error } = await supabase.rpc('wallet_credit', {
      _user_id: creditOpen.user_id, _amount: v, _type: 'credit', _ref_id: null,
      _description: desc || 'Crédito administrativo',
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Crédito aplicado');
    setCreditOpen(null); setAmt(''); setDesc(''); refetch();
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Carteiras</h1>
      <p className="text-muted-foreground mb-6">Saldo dos utilizadores e movimentos de carteira</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Saldo total em circulação</p>
          <p className="text-2xl font-bold">{(totals?.bal || 0).toLocaleString()} MZN</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total depositado</p>
          <p className="text-2xl font-bold text-pharmacy">{(totals?.dep || 0).toLocaleString()} MZN</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total gasto</p>
          <p className="text-2xl font-bold text-primary">{(totals?.spent || 0).toLocaleString()} MZN</p>
        </CardContent></Card>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Pesquisar por nome ou telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 max-w-sm" />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8 text-center">A carregar...</div> :
            <div className="divide-y">
              {data?.map(w => (
                <div key={w.user_id} className="p-4 flex items-center gap-4 hover:bg-muted/30">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{w.profile?.full_name || 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground">{w.profile?.phone || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{Number(w.balance_mzn).toLocaleString()} MZN</p>
                    <p className="text-[10px] text-muted-foreground">
                      Dep: {Number(w.total_deposited).toLocaleString()} • Gasto: {Number(w.total_spent).toLocaleString()}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setCreditOpen(w)}>
                    <Plus className="h-3 w-3 mr-1" /> Creditar
                  </Button>
                </div>
              ))}
            </div>}
        </CardContent>
      </Card>

      <Dialog open={!!creditOpen} onOpenChange={() => setCreditOpen(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Creditar {creditOpen?.profile?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input type="number" placeholder="Valor MZN" value={amt} onChange={e => setAmt(e.target.value)} />
            <Input placeholder="Descrição (opcional)" value={desc} onChange={e => setDesc(e.target.value)} />
            <Button className="w-full" onClick={credit}>Aplicar crédito</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
