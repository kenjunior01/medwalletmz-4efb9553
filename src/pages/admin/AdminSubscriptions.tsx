import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminSubscriptions() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'pending' | 'active' | 'rejected'>('pending');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('subscriptions')
      .select('*, plan:subscription_plans(name, price_mzn, billing_period)')
      .eq('status', tab)
      .order('created_at', { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [tab]);

  const approve = async (id: string, periodMonths = 1) => {
    const sub = items.find(i => i.id === id);
    if (!sub) return;

    const now = new Date();
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + periodMonths);

    try {
      // 1. Ativar a subscrição
      const { error: subErr } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          started_at: now.toISOString(),
          expires_at: expires.toISOString(),
          reviewed_at: now.toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', id);

      if (subErr) throw subErr;

      // 2. Mapear target_audience para roles
      const audience = sub.plan?.target_audience;
      let roleToAssign = '';
      if (audience === 'doctor') roleToAssign = 'doctor';
      else if (audience === 'clinic' || audience === 'hospital') roleToAssign = 'clinic';
      else if (audience === 'lab') roleToAssign = 'clinic'; // Labs usam clinic role
      else if (audience === 'pharmacy' || audience === 'store_owner') roleToAssign = 'store_owner';
      else if (audience === 'driver') roleToAssign = 'driver';

      if (roleToAssign) {
        // Atribuir role
        await supabase.from('user_roles').upsert({
          user_id: sub.user_id,
          role: roleToAssign as any
        }, { onConflict: 'user_id,role' });

        // Ativar perfis correspondentes
        if (roleToAssign === 'doctor') {
          await supabase.from('doctor_profiles').update({ is_verified: true, is_active: true } as any).eq('user_id', sub.user_id);
        } else if (roleToAssign === 'clinic') {
          await supabase.from('clinics').update({ is_verified: true, is_active: true }).eq('owner_id', sub.user_id);
        } else if (roleToAssign === 'store_owner') {
          await supabase.from('stores').update({ is_active: true }).eq('owner_id', sub.user_id);
        }
      }

      toast.success('Subscrição ativada e permissões atualizadas');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const reject = async (id: string) => {
    const notes = prompt('Motivo da rejeição:');
    if (notes === null) return;
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'rejected',
        admin_notes: notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id,
      })
      .eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Rejeitada');
    load();
  };

  const viewProof = async (path: string) => {
    const { data } = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1">Subscrições</h1>
      <p className="text-sm text-muted-foreground mb-6">Validar pagamentos M-Pesa / e-Mola / Mkesh</p>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="active">Ativas</TabsTrigger>
          <TabsTrigger value="rejected">Rejeitadas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-muted-foreground">A carregar...</p>
        ) : items.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">Nada por aqui.</Card>
        ) : (
          items.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{s.plan?.name}</p>
                    <Badge variant="outline">{s.payment_method?.toUpperCase()}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ref: <span className="font-mono">{s.payment_reference}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">Tel: {s.payment_phone}</p>
                  <p className="text-sm font-semibold mt-1">
                    {s.amount_paid?.toLocaleString('pt-MZ')} MZN
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submetido: {format(new Date(s.created_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                  {s.admin_notes && (
                    <p className="text-xs bg-muted p-2 rounded mt-2">{s.admin_notes}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 w-44">
                  {s.payment_proof_url && (
                    <Button size="sm" variant="outline" onClick={() => viewProof(s.payment_proof_url)}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Comprovativo
                    </Button>
                  )}
                  {tab === 'pending' && (
                    <>
                      <Button size="sm" onClick={() => approve(s.id)}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Aprovar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => reject(s.id)}>
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeitar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}