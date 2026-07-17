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
import { useCountry } from '@/contexts/CountryContext';

export default function PaymentSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { country } = useCountry();
  const [mpesa, setMpesa] = useState('');
  const [emola, setEmola] = useState('');
  const [mkesh, setMkesh] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (supabase.rpc as any)('get_profile_private', { _user_id: user.id })
      .then(({ data }: any) => {
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          setMpesa(row.mpesa_number ?? '');
          setEmola(row.emola_number ?? '');
          setMkesh(row.mkesh_number ?? '');
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
            Guarde os seus dados de pagamento locais. Serão usados para identificar pagamentos e enviar recomendações de transferência.
          </p>
        </Card>

        <div className="space-y-3">
          <div>
            <Label>{country?.id === 'BR' ? 'Chave PIX principal' : 'Número M-Pesa'}</Label>
            <Input value={mpesa} onChange={(e) => setMpesa(e.target.value)} placeholder={country?.id === 'BR' ? 'CPF, email, telefone ou chave aleatória' : '+258 84 000 0000'} />
          </div>
          <div>
            <Label>{country?.id === 'BR' ? 'Conta bancária / agência' : 'Número e-Mola'}</Label>
            <Input value={emola} onChange={(e) => setEmola(e.target.value)} placeholder={country?.id === 'BR' ? 'Banco, agência e conta' : '+258 86 000 0000'} />
          </div>
          <div>
            <Label>{country?.id === 'BR' ? 'Boleto / observações' : 'Número Mkesh'}</Label>
            <Input value={mkesh} onChange={(e) => setMkesh(e.target.value)} placeholder={country?.id === 'BR' ? 'Dados adicionais para recebimento' : '+258 82 000 0000'} />
          </div>
        </div>

        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? 'A guardar...' : 'Guardar'}
        </Button>
      </section>
    </div>
  );
}