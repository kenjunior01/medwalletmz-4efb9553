import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getCurrencySymbol } from '@/lib/currency';
import { ArrowLeft, Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, Gift, RefreshCw, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import NumberFlow from '@number-flow/react';
import {
  PanelShell, NeuCard, BentoCard, BentoGrid, GlassCard,
  LayeredOrbs, StatusBadge, SkipLink,
} from '@/components/ui/design-system';

const ICONS: Record<string, any> = {
  deposit: ArrowDownCircle, debit: ArrowUpCircle, credit: ArrowDownCircle,
  refund: RefreshCw, bonus: Gift, commission: ArrowUpCircle, referral: Gift,
};
const COLORS: Record<string, string> = {
  deposit: 'text-pharmacy', credit: 'text-pharmacy', refund: 'text-pharmacy',
  bonus: 'text-gold', referral: 'text-gold',
  debit: 'text-destructive', commission: 'text-destructive',
};

interface PayAccount {
  id: string;
  method: 'mpesa' | 'emola' | 'mkesh' | 'bank';
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
  stripe: 'Cartão',
  pix: 'PIX',
  upi: 'UPI',
  paystack: 'Paystack',
  ozow: 'Ozow',
  unitel_money: 'Unitel Money',
  multicaixa: 'Multicaixa',
};

export default function Wallet() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { country, t } = useCountry();
  const { wallet, loading } = useWallet();
  const [tx, setTx] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('mpesa');
  const [accounts, setAccounts] = useState<PayAccount[]>([]);
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [bonusPct, setBonusPct] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const loadTx = async () => {
    if (!user) return;
    const { data } = await supabase.from('wallet_transactions').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    setTx(data || []);
  };

  useEffect(() => {
    loadTx();
    supabase.from('platform_settings').select('value').eq('key', 'deposit_bonus_percent').maybeSingle()
      .then(({ data }) => { if (data) setBonusPct(Number(data.value)); });

    supabase.from('platform_payment_accounts').select('*').eq('is_active', true)
      .then(({ data }) => setAccounts((data as any) || []));
  }, [user]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('referrals.copied'));
  };

  const handleDeposit = async () => {
    const amt = parseFloat(amount);
    const currencySymbol = symbol || 'MZN';
    if (!amt || amt < 50) { toast.error(`${t('common.error')}: Min 50 ${currencySymbol}`); return; }
    if (!reference || !phone) { toast.error(t('doctor_register.required_fields_error')); return; }

    setSubmitting(true);
    try {
      // Inserir transação pendente para validação manual (Offline)
      const { error } = await (supabase as any).from('wallet_transactions').insert({
        user_id: user?.id,
        amount: amt,
        type: 'deposit',
        status: 'pending',
        description: `Depósito via ${methodLabel[method] || method} - Ref: ${reference}`,
        metadata: {
          payment_method: method,
          payment_reference: reference,
          payment_phone: phone,
          offline_deposit: true
        }
      });

      if (error) throw error;

      toast.success(t('wallet.success_msg') || 'Solicitação enviada!');
      setOpen(false);
      setAmount('');
      setReference('');
      setPhone('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const bonusPreview = amount ? Math.round(parseFloat(amount) * bonusPct) / 100 : 0;
  const balance = Number(wallet?.balance ?? 0);
  const currency = wallet?.currency || 'MZN';
  const symbol = getCurrencySymbol(currency as any);
  const filteredAccounts = accounts.filter(a => a.method === method);

  const supportedMethods = country?.config?.payment_methods || [
    { id: 'mpesa', name: 'M-Pesa' },
    { id: 'emola', name: 'e-Mola' },
    { id: 'mkesh', name: 'Mkesh' }
  ];

  useEffect(() => {
    if (supportedMethods.length > 0 && !method) {
      setMethod(supportedMethods[0].id);
    }
  }, [supportedMethods, method]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <SkipLink />
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={t('common.back')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-bold text-lg">{t('wallet.title')}</h1>
      </header>

      <main id="main" className="p-4 space-y-5">
        {/* Hero — panel-shell com orbs + saldo animado */}
        <PanelShell className="p-6">
          <LayeredOrbs variant="ocean" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <WalletIcon className="h-4 w-4" aria-hidden="true" /> {t('wallet.available_balance')}
          </div>
          <p
            className="text-5xl font-black mt-2 num-pulse tabular-nums text-gradient-premium"
            aria-live="polite"
          >
            <NumberFlow value={balance} format={{ minimumFractionDigits: 2 }} />
            <span className="text-lg font-semibold ml-2 text-muted-foreground">{currency}</span>
          </p>

          <BentoGrid className="mt-5 grid-cols-2 md:grid-cols-2">
            <BentoCard size="sm" className="!col-span-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t('wallet.deposited')}</p>
              <p className="text-xl font-bold mt-1 text-pharmacy">
                <NumberFlow value={Number(wallet?.total_deposited ?? 0)} /> <span className="text-xs">{currency}</span>
              </p>
            </BentoCard>
            <BentoCard size="sm" className="!col-span-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t('wallet.spent')}</p>
              <p className="text-xl font-bold mt-1 text-primary">
                <NumberFlow value={Number(wallet?.total_spent ?? 0)} /> <span className="text-xs">{currency}</span>
              </p>
            </BentoCard>
          </BentoGrid>

          <div className="grid grid-cols-1 gap-2 mt-5">
            <Button
              className="neu-btn h-12 text-foreground font-bold border-none"
              onClick={() => setOpen(true)}
            >
              <Plus className="h-5 w-5 mr-1" aria-hidden="true" /> {t('wallet.deposit')}
            </Button>
          </div>
        </PanelShell>

        {/* Bonus glass card */}
        <GlassCard className="border-gold/30">
          <p className="font-semibold flex items-center gap-2 text-sm">
            <Gift className="h-4 w-4 text-gold" aria-hidden="true" /> {t('wallet.deposit_bonus')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('wallet.deposit_bonus_desc', { percent: String(bonusPct) })}
          </p>
        </GlassCard>

        {/* Histórico */}
        <section aria-labelledby="hist-h">
          <h2 id="hist-h" className="font-bold text-base mb-3">{t('wallet.history')}</h2>
          {tx.length === 0 ? (
            <NeuCard className="text-center text-sm text-muted-foreground py-8">
              {t('wallet.empty_history')}
            </NeuCard>
          ) : (
            <div className="space-y-2">
              {tx.map(t => {
                const Icon = ICONS[t.type] || RefreshCw;
                const isOut = ['debit', 'commission'].includes(t.type);
                const st = (t.status || 'confirmed') as 'pending' | 'confirmed' | 'refunded';
                return (
                  <NeuCard key={t.id} className="!p-3 flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl neu-inset flex items-center justify-center ${COLORS[t.type] || ''}`}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold truncate">{t.description || t.type}</p>
                        <StatusBadge status={st} />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(t.created_at).toLocaleString('pt-PT')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black tabular-nums ${isOut ? 'text-destructive' : 'text-pharmacy'} ${st === 'refunded' ? 'line-through opacity-60' : ''}`}>
                        {isOut ? '−' : '+'}{Number(t.amount).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {Number(t.balance_after).toFixed(2)} {currency}
                      </p>
                    </div>
                  </NeuCard>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('wallet.deposit_dialog_title')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
              <p className="text-xs text-muted-foreground uppercase font-bold">{t('wallet.instructions')}</p>
              <p className="text-sm mt-1">
                {t('wallet.instructions_desc')}
              </p>
            </div>

            <div>
              <label className="text-sm font-bold">{t('wallet.choose_method')}</label>
              <Tabs value={method} onValueChange={setMethod} className="mt-2">
                <TabsList className={`grid w-full`} style={{ gridTemplateColumns: `repeat(${supportedMethods.length}, 1fr)` }}>
                  {supportedMethods.map((m: any) => (
                    <TabsTrigger key={m.id} value={m.id}>{m.name}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">{t('wallet.transfer_to')}</label>
              {filteredAccounts.length === 0 ? (
                <p className="text-xs text-destructive">{t('wallet.no_accounts')}</p>
              ) : filteredAccounts.map(a => (
                <div key={a.id} className="p-3 border rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">{a.account_name}</p>
                    <p className="font-mono text-lg">{a.account_number}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => copy(a.account_number)}>
                    <Plus className="h-4 w-4 mr-1" /> {t('common.save')}
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-2 border-t">
              <label className="text-sm font-bold">{t('wallet.confirmation')}</label>
              <div>
                <Label htmlFor="dep-amt" className="text-xs">{t('wallet.amount_sent', { currency })}</Label>
                <Input id="dep-amt" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Mínimo 50 ${currency}`} />
              </div>
              <div>
                <Label htmlFor="dep-ref" className="text-xs">{t('wallet.sms_reference')}</Label>
                <Input id="dep-ref" value={reference} onChange={e => setReference(e.target.value)} placeholder="Ex: MP24..." />
              </div>
              <div>
                <Label htmlFor="dep-phone" className="text-xs">{t('wallet.sending_number')}</Label>
                <Input
                  id="dep-phone"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder={country?.config?.phone_placeholder || "Número de envio"}
                />
              </div>
            </div>

            {bonusPreview > 0 && (
              <div className="bg-gold/10 rounded-lg p-2 text-xs">
                <Gift className="h-3 w-3 inline text-gold mr-1" aria-hidden="true" />
                {t('wallet.bonus_notice', { amount: String(bonusPreview), currency, percent: String(bonusPct) })}
              </div>
            )}

            <Button className="w-full" onClick={handleDeposit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : t('wallet.submit_validation')}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              {t('wallet.validation_delay')}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
