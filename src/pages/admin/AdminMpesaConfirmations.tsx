import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, ExternalLink, Loader2 } from 'lucide-react';

export default function AdminMpesaConfirmations() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [txIds, setTxIds] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('mpesa_manual_payments')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openProof = async (path: string) => {
    const { data } = await supabase.storage.from('mpesa-proofs').createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else toast.error('Não foi possível abrir comprovativo');
  };

  const confirm = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.rpc('confirm_mpesa_payment', { _id: id, _mpesa_tx_id: txIds[id] || null });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Pagamento confirmado');
    load();
  };

  const reject = async (id: string) => {
    const reason = window.prompt('Motivo da rejeição:');
    if (!reason) return;
    setBusy(id);
    const { error } = await supabase.rpc('reject_mpesa_payment', { _id: id, _reason: reason });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Rejeitado');
    load();
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Confirmações M-Pesa</h1>
        <p className="text-sm text-muted-foreground">Verifica os comprovativos e credita a carteira do utilizador.</p>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum pagamento pendente.</Card>
      ) : (
        <div className="space-y-3">
          {rows.map(r => (
            <Card key={r.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <p className="font-bold text-lg">{Number(r.amount_mzn).toFixed(2)} MZN</p>
                  <p className="text-xs text-muted-foreground">
                    Ref: <span className="font-mono">{r.reference}</span> · Tel: {r.payer_phone}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString('pt-PT')}
                  </p>
                </div>
                <Badge variant="outline">{r.status}</Badge>
              </div>

              {r.proof_url && (
                <Button size="sm" variant="outline" onClick={() => openProof(r.proof_url)}>
                  <ExternalLink className="h-4 w-4 mr-1" /> Ver comprovativo
                </Button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-center">
                <Input
                  placeholder="ID transação M-Pesa (opcional)"
                  value={txIds[r.id] || ''}
                  onChange={e => setTxIds(prev => ({ ...prev, [r.id]: e.target.value }))}
                />
                <Button onClick={() => confirm(r.id)} disabled={busy === r.id}>
                  {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                  Confirmar
                </Button>
                <Button variant="destructive" onClick={() => reject(r.id)} disabled={busy === r.id}>
                  <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}