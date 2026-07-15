import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Copy, Upload, CheckCircle2, Sparkles, Loader2, Phone, Hash, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useCountry } from '@/contexts/CountryContext';
import { fetchPlanBySlug, type MzPlan } from '@/lib/mzPlans';
import {
  initiateSubscription,
  buildMpesaInstructionsForSubscription,
} from '@/lib/mzMonetization';

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
  const [plan, setPlan] = useState<MzPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [accounts, setAccounts] = useState<PayAccount[]>([]);
  const [method, setMethod] = useState<string>('mpesa');
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Novo estado: instrução M-Pesa gerada após iniciar subscrição
  const [instructions, setInstructions] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);

  const supportedMethods = country?.config?.payment_methods || [
    { id: 'mpesa', name: 'M-Pesa' },
    { id: 'emola', name: 'e-Mola' },
    { id: 'mkesh', name: 'Mkesh' }
  ];

  useEffect(() => {
    if (supportedMethods.length > 0 && (!method || !supportedMethods.some((m: any) => m.id === method))) {
      setMethod(supportedMethods[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  // Carrega plan via slug — usa fetchPlanBySlug (BD + fallback em memória)
  useEffect(() => {
    if (!planId) return;
    setPlanLoading(true);
    fetchPlanBySlug(planId)
      .then((p) => {
        setPlan(p);
        setPlanLoading(false);
        if (!p) {
          toast.error('Plano não encontrado', {
            description: `O slug "${planId}" não existe nem na BD nem em memória.`,
          });
        }
      })
      .catch((e) => {
        console.error('[Subscribe] fetchPlanBySlug error:', e);
        setPlanLoading(false);
      });

    // Carrega contas de pagamento (se existirem)
    supabase
      .from('platform_payment_accounts')
      .select('*')
      .eq('is_active', true)
      .then(({ data }) => {
        const list = (data as PayAccount[]) ?? [];
        setAccounts(list);
      });
  }, [planId]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  // Fluxo NOVO: inicia subscrição + gera referência M-Pesa automaticamente
  const handleInitiate = async () => {
    if (!user || !plan) {
      toast.error('Sessão ou plano inválido.');
      return;
    }
    if (!phone || phone.length < 9) {
      toast.error('Indica o teu número M-Pesa (9 dígitos, com +258).');
      return;
    }
    setSubmitting(true);
    try {
      const result = await initiateSubscription({
        userId: user.id,
        planSlug: plan.slug,
        billing: 'monthly',
        payerPhone: phone,
        payerName: user.email || undefined,
      });

      if (!result.success) {
        toast.error('Não foi possível iniciar subscrição', {
          description: result.errorMessage,
        });
        setSubmitting(false);
        return;
      }

      if (result.subscriptionId) setSubscriptionId(result.subscriptionId);
      if (result.mpesaPayment) setPaymentRef(result.mpesaPayment.reference);
      if (result.instructions) setInstructions(result.instructions);

      toast.success('Subscrição criada — paga via M-Pesa para activar!', {
        description: `Ref: ${result.mpesaPayment?.reference ?? ''}`,
        duration: 6000,
      });
    } catch (e: any) {
      toast.error('Erro inesperado', { description: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Após pagar: utilizador cola a referência M-Pesa recebida por SMS
  // (tx ID) para acelerar a confirmação do admin.
  const handleSubmitProof = async () => {
    if (!user || !plan || !subscriptionId) {
      toast.error('Inicia a subscrição primeiro.');
      return;
    }
    if (!reference) {
      toast.error('Cola o ID de transação M-Pesa recebido por SMS.');
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

      // Atualiza a subscrição com a referência M-Pesa do utilizador
      const { error } = await (supabase as any)
        .from('subscriptions')
        .update({
          payment_reference: reference,
          payment_phone: phone,
          payment_proof_url: proofUrl,
          admin_notes: notes
            ? `Comprovativo: ${notes}`
            : 'Aguarda confirmação admin — utilizador colou tx ID M-Pesa.',
        })
        .eq('id', subscriptionId);
      if (error) throw error;

      toast.success('Comprovativo enviado! A subscrição será activada em até 24h.');
      navigate('/subscriptions');
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao submeter comprovativo');
    } finally {
      setSubmitting(false);
    }
  };

  if (planLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-background p-8 text-center">
        <p className="text-muted-foreground">Plano não encontrado.</p>
        <Button className="mt-4" onClick={() => navigate('/planos')}>
          Ver planos disponíveis
        </Button>
      </div>
    );
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

      <section className="p-4 space-y-4 max-w-xl mx-auto">
        {/* Resumo do plano */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Plano escolhido</p>
              <p className="text-lg font-bold">{plan.name}</p>
              <p className="text-xs text-muted-foreground">{plan.tagline}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase">Total a pagar</p>
              <p className="text-2xl font-bold text-primary">
                {plan.price_mzn.toLocaleString(locale)} {currencySymbol}
              </p>
              <Badge variant="outline">Mensal</Badge>
            </div>
          </div>
          <ul className="mt-3 space-y-1">
            {plan.features.slice(0, 4).map((f, i) => (
              <li key={i} className="text-xs flex items-start gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Se subscrição ainda não foi iniciada: pedir número M-Pesa */}
        {!subscriptionId && (
          <Card className="p-4 space-y-3">
            <div>
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                1. O teu número M-Pesa
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+258 84 000 0000"
                className="mt-1.5"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Vamos gerar uma referência única para associar o pagamento a esta subscrição.
              </p>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={handleInitiate}
              disabled={submitting || !phone}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> A gerar referência...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" /> Gerar referência M-Pesa
                </>
              )}
            </Button>
          </Card>
        )}

        {/* Após iniciar: mostrar instruções M-Pesa + form para colar tx ID */}
        {subscriptionId && instructions && (
          <>
            <Card className="p-4 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-5 w-5 text-emerald-600" />
                <p className="font-bold text-emerald-900 dark:text-emerald-100">
                  Pagamento M-Pesa gerado
                </p>
              </div>
              <pre className="text-[11px] whitespace-pre-wrap font-mono text-emerald-900 dark:text-emerald-100 leading-relaxed">
                {instructions}
              </pre>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => copy(paymentRef || '')}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copiar ref
                </Button>
                <a
                  href="tel:*150*00%23"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <Phone className="h-3.5 w-3.5" /> Abrir M-Pesa
                </a>
              </div>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-2 text-center">
                Subscrição ID: {subscriptionId.slice(0, 8)}…
              </p>
            </Card>

            {/* Form para colar tx ID M-Pesa */}
            <Card className="p-4 space-y-3">
              <div>
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  2. ID de transação M-Pesa (do SMS)
                </Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex: MP240521.1234.A56789"
                  className="mt-1.5 font-mono"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Após pagar, recebe um SMS do M-Pesa com este ID. Cola aqui para acelerar a validação.
                </p>
              </div>

              <div>
                <Label className="text-xs">Comprovativo (foto/screenshot) — opcional</Label>
                <label className="mt-1 flex items-center gap-2 border-2 border-dashed border-border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
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

              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmitProof}
                disabled={submitting || !reference}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> A enviar...
                  </>
                ) : (
                  'Enviar comprovativo para validação'
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                A subscrição é ativada após confirmação do gestor (até 24h).
              </p>
            </Card>
          </>
        )}

        {/* Métodos de pagamento alternativos (informativo) */}
        {!subscriptionId && (
          <div>
            <Label className="text-sm font-semibold">Métodos aceites</Label>
            <Tabs value={method} onValueChange={setMethod} className="mt-2">
              <TabsList
                className="grid w-full"
                style={{ gridTemplateColumns: `repeat(${supportedMethods.length}, 1fr)` }}
              >
                {supportedMethods.map((m: any) => (
                  <TabsTrigger key={m.id} value={m.id}>
                    {m.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {filtered.length === 0 ? (
              <Card className="p-4 mt-2 text-sm text-muted-foreground">
                Conta {methodLabel[method] || method} ainda não configurada — usa M-Pesa (recomendado).
              </Card>
            ) : (
              filtered.map((a) => (
                <Card key={a.id} className="p-4 mt-2 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        {methodLabel[a.method]}
                      </p>
                      <p className="font-semibold">{a.account_name}</p>
                      <p className="text-lg font-mono mt-1">{a.account_number}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => copy(a.account_number)}>
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
                    </Button>
                  </div>
                  {a.instructions && (
                    <p className="text-xs text-muted-foreground border-t pt-2">
                      {a.instructions}
                    </p>
                  )}
                </Card>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}
