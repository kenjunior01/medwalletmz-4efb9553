import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FlaskConical, Upload, ArrowLeft, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LabDashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [lab, setLab] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { nav('/auth'); return; }
    (async () => {
      const { data: l } = await (supabase as any).from('clinics')
        .select('*').eq('owner_id', user.id).eq('type', 'laboratory').maybeSingle();
      setLab(l);
      if (l) {
        const { data: o } = await (supabase as any).from('lab_exam_orders')
          .select('*').eq('lab_id', l.id).order('created_at', { ascending: false }).limit(50);
        setOrders(o || []);
      }
      setLoading(false);
    })();
  }, [user]);

  const uploadResult = async (orderId: string, file: File) => {
    if (!user) return;
    const path = `${user.id}/${orderId}-${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage.from('lab-results').upload(path, file, { upsert: true });
    if (upErr) return toast.error(upErr.message);
    const { error } = await (supabase as any).rpc('lab_order_set_result', { _order_id: orderId, _result_url: path });
    if (error) return toast.error(error.message);
    toast.success('Resultado enviado');
    setOrders(o => o.map(x => x.id === orderId ? { ...x, status: 'completed', result_url: path } : x));
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">A carregar…</div>;
  if (!lab) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground mb-4">Ainda não registaste um laboratório.</p>
        <Button onClick={() => nav('/lab/register')}>Registar laboratório</Button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 max-w-5xl mx-auto space-y-4">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => nav('/')} aria-label="Voltar"><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-black flex items-center gap-2"><FlaskConical className="h-6 w-6 text-primary" /> {lab.name}</h1>
          <p className="text-sm text-muted-foreground">{lab.city} · {orders.length} pedidos</p>
        </div>
        <Badge variant={lab.is_verified ? 'default' : 'outline'}>
          {lab.is_verified ? 'Verificado' : 'Pendente aprovação'}
        </Badge>
      </header>

      {!lab.is_verified && (
        <Card className="p-4 bg-warning/10 border-warning/30 text-sm">
          O teu laboratório está a aguardar aprovação da equipa MedWallet. Assim que for verificado, começarás a receber pedidos.
        </Card>
      )}

      <div className="grid gap-3">
        {orders.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">Sem pedidos ainda.</Card>
        ) : orders.map(o => (
          <Card key={o.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Pedido #{o.id.slice(0,8)}</span>
                <Badge variant={o.status === 'completed' ? 'default' : 'outline'} className="text-[10px]">
                  {o.status === 'completed' ? <><CheckCircle2 className="h-3 w-3 mr-1" />Concluído</> : <><Clock className="h-3 w-3 mr-1" />{o.status}</>}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(o.created_at).toLocaleString('pt-MZ')} · {o.total_amount} MZN
              </p>
            </div>
            {o.status !== 'completed' && (
              <label className="cursor-pointer">
                <input type="file" accept="application/pdf" className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadResult(o.id, e.target.files[0])} />
                <Button asChild size="sm" variant="outline"><span><Upload className="h-4 w-4 mr-1.5" /> Enviar PDF</span></Button>
              </label>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}