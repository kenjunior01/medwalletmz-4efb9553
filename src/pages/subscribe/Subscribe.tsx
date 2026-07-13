import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Copy, Upload, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { useCountry } from '@/contexts/CountryContext';

interface Plan {
  id: string;
  name: string;
  price_mzn: number;
  billing_period: string;
  target_audience: string;
}
interface PayAccount {
  id: string;
  method: string;
  account_name: string;
  account_number: string;
  instructions: string | null;
}

const methodLabel: Record<string, string> = {
  mpesa: 'M-Pesa',
  emola: 'e-Mola',
  mkesh: 'Mkesh',
  bank: 'Transferência Bancária',
  paypal: 'PayPal',
  stripe: 'Stripe',
  pix: 'PIX',
};

export default function Subscribe() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { country } = useCountry();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [accounts, setAccounts] = useState<PayAccount[]>([]);
  const [method, setMethod] = useState<string>('');
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const supportedMethods = country?.config?.payment_methods || [
    { id: 'mpesa', name: 'M-Pesa' },
    { id: 'emola', name: 'e-Mola' },
    { id: 'mkesh', name: 'Mkesh' }
  ];

  useEffect(() => {
    if (supportedMethods.length > 0 && (!method || !supportedMethods.some((m: any) => m.id === method))) {
      setMethod(supportedMethods[0].id);
    }
  }, [supportedMethods, method]);

  useEffect(() => {
    if (!planId) return;
    supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle()
      .then(({ data }) => setPlan(data as Plan));

    supabase
      .from('platform_payment_accounts')
      .select('*')
      .eq('is_active', true)
      .then(({ data }) => {
        const list = (data as PayAccount[]) ?? [];
        setAccounts(list);
        if (list.length && !method) setMethod(list[0].method);
      });
  }, [planId, method]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const handleSubmit = async () => {
    if (!user || !plan) return;
    if (!reference || !phone) {
      toast.error('Indique a referência e o seu número.');
      return;
    }
    setSubmitting(true);
    try {
      let proofUrl: string | null = null;
      if (file) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from('payment-proofs')
          .upload(path, file);
        if (upErr) throw upErr;
        proofUrl = path;
      }

      const { error } = await supabase.from('subscriptions').insert({
        user_id: user.id,
        plan_id: plan.id,
        status: 'pending',
        payment_method: method,
        payment_reference: reference,
        payment_phone: phone,
        payment_proof_url: proofUrl,
        amount_paid: plan.price_mzn,
        admin_notes: notes || null,
      });
      if (error) throw error;

      toast.success('Pagamento enviado para validação!');
      navigate('/subscriptions');
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao submeter pagamento');
    } finally {
      setSubmitting(false);
    }
  };

  if (!plan) {
    return <div className="p-8 text-center text-muted-foreground">A carregar...</div>;
  }

  const filtered = accounts.filter((a) => a.method === method);
  const currencyCode = country?.currency_code || 'MZN';
  const currencySymbol = country?.currency_symbol || currencyCode;
  const locale = country?.default_locale || 'pt-MZ';

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 py-3 backdrop-blur border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Subscrever {plan.name}</h1>
      </header>

      <section className="p-4 space-y-4">
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total a pagar</p>
              <p className="text-2xl font-bold text-primary">
                {plan.price_mzn.toLocaleString(locale)} {currencySymbol}
              </p>
            </div>
            <Badge>{plan.billing_period === 'monthly' ? 'Mensal' : plan.billing_period}</Badge>
          </div>
        </Card>

        <div>
          <Label className="text-sm font-semibold">1. Escolha o método</Label>
          <Tabs value={method} onValueChange={setMethod} className="mt-2">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${supportedMethods.length}, 1fr)` }}>
              {supportedMethods.map((m: any) => (
                <TabsTrigger key={m.id} value={m.id}>{m.name}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div>
          <Label className="text-sm font-semibold">2. Transfira para</Label>
          {filtered.length === 0 ? (
            <Card className="p-4 mt-2 text-sm text-muted-foreground">
              Conta ainda não configurada. Contacte o suporte.
            </Card>
          ) : (
            filtered.map((a) => (
              <Card key={a.id} className="p-4 mt-2 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">{methodLabel[a.method]}</p>
                    <p className="font-semibold">{a.account_name}</p>
                    <p className="text-lg font-mono mt-1">{a.account_number}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copy(a.account_number)}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
                  </Button>
                </div>
                {a.instructions && (
                  <p className="text-xs text-muted-foreground border-t pt-2">{a.instructions}</p>
                )}
              </Card>
            ))
          )}
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold">3. Confirme o envio</Label>
          <div>
            <Label className="text-xs">Referência / ID da transação</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={country?.id === 'BR' ? 'Ex: PIX123456789' : 'Ex: MP240521.1234.A56789'}
            />
          </div>
          <div>
            <Label className="text-xs">Seu número usado no envio</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={country?.config?.phone_placeholder || '+258 84 000 0000'}
            />
          </div>
          <div>
            <Label className="text-xs">Comprovativo (foto/screenshot)</Label>
            <label className="mt-1 flex items-center gap-2 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground flex-1">
                {file ? file.name : 'Carregar comprovativo'}
              </span>
              {file && <CheckCircle2 className="h-4 w-4 text-primary" />}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div>
            <Label className="text-xs">Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alguma observação para o admin?"
              rows={2}
            />
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'A enviar...' : 'Enviar para validação'}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          A subscrição é ativada após validação do pagamento (até 24h).
        </p>
      </section>
    </div>
  );
}