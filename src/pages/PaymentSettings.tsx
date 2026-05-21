import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mpesa, setMpesa] = useState('');
  const [emola, setEmola] = useState('');
  const [mkesh, setMkesh] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('mpesa_number, emola_number, mkesh_number')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setMpesa(data.mpesa_number ?? '');
          setEmola(data.emola_number ?? '');
          setMkesh(data.mkesh_number ?? '');
        }
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ mpesa_number: mpesa || null, emola_number: emola || null, mkesh_number: mkesh || null })
      .eq('user_id', user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Contactos guardados');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 py-3 backdrop-blur border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Dados de Pagamento</h1>
      </header>

      <section className="p-4 space-y-4">
        <Card className="p-4 bg-primary/5 border-primary/20">
          <Wallet className="h-6 w-6 text-primary mb-2" />
          <p className="text-sm">
            Guarde os seus números M-Pesa, e-Mola e Mkesh. Serão usados para identificar os seus pagamentos e enviar recomendações de como transferir.
          </p>
        </Card>

        <div className="space-y-3">
          <div>
            <Label>Número M-Pesa</Label>
            <Input value={mpesa} onChange={(e) => setMpesa(e.target.value)} placeholder="+258 84 000 0000" />
          </div>
          <div>
            <Label>Número e-Mola</Label>
            <Input value={emola} onChange={(e) => setEmola(e.target.value)} placeholder="+258 86 000 0000" />
          </div>
          <div>
            <Label>Número Mkesh</Label>
            <Input value={mkesh} onChange={(e) => setMkesh(e.target.value)} placeholder="+258 82 000 0000" />
          </div>
        </div>

        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? 'A guardar...' : 'Guardar'}
        </Button>
      </section>
    </div>
  );
}