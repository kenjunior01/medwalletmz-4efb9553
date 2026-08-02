import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Receipt } from '@/components/icons/lucide-compat';
import { PaymentReceiptCard, type ReceiptRecord } from '@/components/payments/PaymentReceiptCard';

export default function Receipts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from('payment_receipts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      const rows: ReceiptRecord[] = data || [];
      const ids = Array.from(new Set(rows.flatMap((r) => [r.payer_id, r.payee_id].filter(Boolean) as string[])));
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', ids);
        const map = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));
        rows.forEach((r) => {
          r.payer_name = map.get(r.payer_id) || 'Paciente';
          r.payee_name = r.payee_id ? map.get(r.payee_id) || 'Profissional' : undefined;
        });
      }
      setReceipts(rows);
      setLoading(false);
    })();
  }, [user]);

  const paid = receipts.filter((r) => r.payer_id === user?.id);
  const received = receipts.filter((r) => r.payee_id === user?.id);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Helmet>
        <title>Recibos e comprovativos | MedWallet</title>
        <meta name="description" content="Consulta, descarrega em PDF e partilha os comprovativos dos teus pagamentos de consultas e serviços de saúde." />
      </Helmet>

      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Recibos e comprovativos</h1>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}</div>
        ) : receipts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Receipt className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Ainda não tens comprovativos. Os pagamentos feitos com saldo da carteira geram recibo automaticamente.</p>
          </div>
        ) : (
          <Tabs defaultValue="paid">
            <TabsList className="w-full">
              <TabsTrigger value="paid" className="flex-1">Pagos ({paid.length})</TabsTrigger>
              <TabsTrigger value="received" className="flex-1">Recebidos ({received.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="paid" className="space-y-3 mt-4">
              {paid.map((r) => <PaymentReceiptCard key={r.id} receipt={r} perspective="payer" />)}
              {paid.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Sem pagamentos.</p>}
            </TabsContent>
            <TabsContent value="received" className="space-y-3 mt-4">
              {received.map((r) => <PaymentReceiptCard key={r.id} receipt={r} perspective="payee" />)}
              {received.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Sem valores recebidos.</p>}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
