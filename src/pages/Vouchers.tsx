import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { useCountry } from '@/contexts/CountryContext';
import { logger } from '@/lib/logger';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import {
  Gift, Send, Copy, CheckCircle2, Ticket, Heart, ShieldCheck,
  Sparkles, MessageCircle, XCircle, RefreshCw, Wallet as WalletIcon,
} from '@/components/icons/lucide-compat';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VoucherRow {
  id: string;
  code: string;
  sender_id: string;
  recipient_phone: string | null;
  recipient_user_id: string | null;
  amount: number;
  category: string;
  message: string | null;
  status: string;
  redeemed_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const AMOUNT_CHIPS = [100, 200, 500, 1000];

const CATEGORY_LABELS: Record<string, string> = {
  farmacia: 'Farmácia',
  consulta: 'Consulta',
  exames: 'Exames',
  qualquer: 'Uso livre',
};

const CATEGORY_EMOJI: Record<string, string> = {
  farmacia: '💊',
  consulta: '🩺',
  exames: '🔬',
  qualquer: '🎁',
};

function blockConfetti() {
  confetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 38,
    shapes: ['square'],
    scalar: 0.9,
    colors: ['#10b981', '#34d399', '#fbbf24', '#f59e0b', '#3b82f6'],
    origin: { y: 0.35 },
  });
  setTimeout(() => confetti({
    particleCount: 50,
    spread: 100,
    shapes: ['square'],
    scalar: 0.8,
    colors: ['#10b981', '#fbbf24'],
    origin: { y: 0.3 },
  }), 250);
}

export default function Vouchers() {
  const { user } = useAuth();
  const { t } = useCountry();
  const { wallet } = useWallet();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(200);
  const [customAmount, setCustomAmount] = useState('');
  const [category, setCategory] = useState('qualquer');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [redeemCode, setRedeemCode] = useState('');
  const [created, setCreated] = useState<{ code: string; amount: number } | null>(null);

  const fmt = (v: number) => new Intl.NumberFormat('pt-MZ').format(v);

  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: ['health-vouchers', user?.id],
    queryFn: async () => {
      if (!user) return [] as VoucherRow[];
      const { data, error } = await (supabase as any)
        .from('health_vouchers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(60);
      if (error) {
        logger.error('vouchers fetch failed', error.message);
        return [] as VoucherRow[];
      }
      return (data ?? []) as VoucherRow[];
    },
    enabled: !!user,
    staleTime: 20_000,
  });

  const sent = useMemo(() => vouchers.filter((v) => v.sender_id === user?.id), [vouchers, user]);
  const received = useMemo(
    () => vouchers.filter((v) => user && v.sender_id !== user.id && (v.redeemed_by === user.id || v.recipient_user_id === user.id)),
    [vouchers, user]
  );

  const createVoucher = useMutation({
    mutationFn: async () => {
      const finalAmount = customAmount ? Number(customAmount) : amount;
      const { data, error } = await (supabase as any).rpc('create_health_voucher', {
        p_amount: finalAmount,
        p_category: category,
        p_message: message || null,
        p_recipient_phone: phone || null,
        p_days_valid: 60,
      });
      if (error) throw error;
      return data as { code: string; amount: number };
    },
    onSuccess: (data) => {
      blockConfetti();
      setCreated(data);
      setMessage('');
      setPhone('');
      setCustomAmount('');
      queryClient.invalidateQueries({ queryKey: ['health-vouchers'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success(`Voucher de ${fmt(data.amount)} MZN criado!`);
    },
    onError: (e: any) => {
      const code = e?.message ?? '';
      if (code.includes('INSUFFICIENT_BALANCE')) toast.error('Saldo insuficiente na carteira');
      else if (code.includes('INVALID_AMOUNT')) toast.error('Valor entre 10 e 50 000 MZN');
      else toast.error('Não foi possível criar o voucher');
      logger.error('create voucher failed', code);
    },
  });

  const redeem = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc('redeem_health_voucher', {
        p_code: redeemCode,
      });
      if (error) throw error;
      return data as { amount: number; category: string; sender_message: string | null };
    },
    onSuccess: (data) => {
      blockConfetti();
      setRedeemCode('');
      queryClient.invalidateQueries({ queryKey: ['health-vouchers'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success(`+${fmt(data.amount)} MZN na carteira! Voucher resgatado 🎉`);
    },
    onError: (e: any) => {
      const code = e?.message ?? '';
      if (code.includes('VOUCHER_NOT_FOUND')) toast.error('Código não encontrado');
      else if (code.includes('SELF_REDEEM')) toast.error('Não podes resgatar o teu próprio voucher');
      else if (code.includes('VOUCHER_EXPIRED')) toast.error('Este voucher já expirou');
      else if (code.includes('VOUCHER_NOT_ACTIVE')) toast.error('Voucher já utilizado ou cancelado');
      else toast.error('Falha ao resgatar voucher');
      logger.error('redeem failed', code);
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc('cancel_health_voucher', { p_voucher_id: id });
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-vouchers'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Voucher cancelado — valor devolvido à carteira');
    },
    onError: () => toast.error('Não foi possível cancelar'),
  });

  const shareText = (code: string, amt: number) =>
    encodeURIComponent(
      `🎁 Recebi um Voucher de Saúde MedWallet de ${fmt(amt)} MZN para ti!\nCódigo: ${code}\nResgata na app: ${window.location.origin}/vouchers`
    );

  const shareVoucher = (code: string, amt: number) => {
    window.open(`https://wa.me/?text=${shareText(code, amt)}`, '_blank');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Gift className="h-14 w-14 text-primary" />
        <h1 className="text-2xl font-bold">{t('vouchers.title') ?? 'Voucher de Saúde'}</h1>
        <p className="text-muted-foreground max-w-sm">
          {t('vouchers.guest') ?? 'Envia ajuda médica à tua família: vouchers de farmácia, consulta ou exames.'}
        </p>
        <Button onClick={() => (window.location.href = '/auth')}>{t('vouchers.cta') ?? 'Criar conta'}</Button>
      </div>
    );
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { label: string; cls: string }> = {
      active: { label: 'Ativo', cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
      redeemed: { label: 'Resgatado', cls: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
      cancelled: { label: 'Cancelado', cls: 'bg-muted text-muted-foreground border-border' },
      expired: { label: 'Expirado', cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
    };
    const s = map[status] ?? map.cancelled;
    return <Badge variant="outline" className={`${s.cls} text-[11px]`}>{s.label}</Badge>;
  };

  const VoucherCard = ({ v, isSent }: { v: VoucherRow; isSent: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="overflow-hidden border-border/60">
        <div className={`h-1.5 w-full ${v.status === 'active' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-muted'}`} />
        <CardContent className="p-4 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{CATEGORY_EMOJI[v.category] ?? '🎁'}</span>
              <div>
                <p className="font-bold leading-tight">{fmt(v.amount)} MZN</p>
                <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[v.category] ?? 'Uso livre'}</p>
              </div>
            </div>
            <StatusBadge status={v.status} />
          </div>
          {v.message && (
            <p className="text-xs italic text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              “{v.message}”
            </p>
          )}
          <div className="flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2">
            <code className="text-sm font-mono font-semibold tracking-wider">{v.code}</code>
            <button
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => { navigator.clipboard.writeText(v.code); toast.success('Código copiado'); }}
              aria-label="Copiar código"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {isSent
                ? (v.recipient_phone ? `Para ${v.recipient_phone}` : 'Sem telefone definido')
                : `Recebido ${new Date(v.redeemed_at ?? v.created_at).toLocaleDateString('pt-PT')}`}
            </span>
            {v.expires_at && <span>Expira {new Date(v.expires_at).toLocaleDateString('pt-PT')}</span>}
          </div>
          {isSent && v.status === 'active' && (
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="secondary" className="flex-1 gap-1.5" onClick={() => shareVoucher(v.code, v.amount)}>
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </Button>
              <Button size="sm" variant="ghost" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => cancel.mutate(v.id)}>
                <XCircle className="h-3.5 w-3.5" /> Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 2px, transparent 2px), radial-gradient(circle at 70% 60%, white 2px, transparent 2px)', backgroundSize: '42px 42px' }}
        />
        <div className="relative max-w-3xl mx-auto px-4 pt-8 pb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-11 w-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Gift className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">{t('vouchers.title') ?? 'Voucher de Saúde'}</h1>
              <p className="text-white/80 text-sm">{t('vouchers.subtitle') ?? 'Envia cuidado à tua família, mesmo à distância'}</p>
            </div>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-4 py-1.5 text-sm">
            <WalletIcon className="h-4 w-4" />
            Saldo: <strong>{fmt(wallet?.balance ?? 0)} {wallet?.currency ?? 'MZN'}</strong>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-6 space-y-5">
        {/* Resgatar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/20 shadow-lg">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-stretch">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('vouchers.redeem') ?? 'Resgatar voucher'}
                </label>
                <Input
                  placeholder="MW-XXXX-XXXX"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                  className="font-mono tracking-wider"
                  maxLength={16}
                />
              </div>
              <Button
                className="sm:self-end gap-2 bg-gradient-to-r from-emerald-600 to-teal-500"
                disabled={redeemCode.length < 6 || redeem.isPending}
                onClick={() => redeem.mutate()}
              >
                {redeem.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                {redeem.isPending ? 'A resgatar…' : 'Resgatar'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Criar */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full h-12 text-base gap-2 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 shadow-lg shadow-emerald-500/20">
              <Heart className="h-5 w-5" />
              {t('vouchers.create') ?? 'Criar voucher para a família'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {t('vouchers.create') ?? 'Novo voucher de saúde'}
              </DialogTitle>
              <DialogDescription>
                {t('vouchers.createHint') ?? 'O valor sai da tua carteira e vira um código que a família resgata.'}
              </DialogDescription>
            </DialogHeader>

            {created ? (
              <div className="space-y-4 text-center py-2">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                <div>
                  <p className="text-sm text-muted-foreground">Voucher de <strong>{fmt(created.amount)} MZN</strong> pronto!</p>
                  <div className="mt-2 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 px-4 py-3">
                    <code className="text-lg font-mono font-bold tracking-widest text-emerald-600">{created.code}</code>
                    <button onClick={() => { navigator.clipboard.writeText(created.code); toast.success('Código copiado'); }}>
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 gap-2 bg-[#25D366] hover:bg-[#20bd5a]" onClick={() => shareVoucher(created.code, created.amount)}>
                    <MessageCircle className="h-4 w-4" /> Enviar WhatsApp
                  </Button>
                  <Button variant="outline" onClick={() => { setCreated(null); setOpen(false); }}>Fechar</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Valor (MZN)</label>
                  <div className="mt-1.5 grid grid-cols-4 gap-2">
                    {AMOUNT_CHIPS.map((a) => (
                      <button
                        key={a}
                        onClick={() => { setAmount(a); setCustomAmount(''); }}
                        className={`rounded-lg border py-2 text-sm font-semibold transition-all ${
                          !customAmount && amount === a
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                            : 'border-border hover:border-emerald-400/50'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <Input
                    className="mt-2"
                    type="number"
                    inputMode="numeric"
                    placeholder="Outro valor (10–50 000)"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    min={10}
                    max={50000}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Para quê?</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qualquer">🎁 Uso livre</SelectItem>
                      <SelectItem value="farmacia">💊 Farmácia</SelectItem>
                      <SelectItem value="consulta">🩺 Consulta</SelectItem>
                      <SelectItem value="exames">🔬 Exames</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Mensagem (opcional)</label>
                  <Textarea
                    className="mt-1.5 min-h-[70px]"
                    placeholder="Ex.: Curate logo, mamã! 💚"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={160}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Telefone (opcional)</label>
                  <Input
                    className="mt-1.5"
                    type="tel"
                    placeholder="+258 84 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full h-11 gap-2 bg-gradient-to-r from-emerald-600 to-teal-500"
                  disabled={createVoucher.isPending}
                  onClick={() => createVoucher.mutate()}
                >
                  {createVoucher.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {createVoucher.isPending ? 'A criar…' : 'Emitir voucher'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Listas */}
        <Tabs defaultValue="sent">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="sent" className="gap-1.5"><Send className="h-4 w-4" />Enviados ({sent.length})</TabsTrigger>
            <TabsTrigger value="received" className="gap-1.5"><Gift className="h-4 w-4" />Recebidos ({received.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="sent" className="mt-4 space-y-3">
            {isLoading ? (
              [...Array(2)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
            ) : sent.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Send className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">{t('vouchers.emptySent') ?? 'Ainda não enviaste vouchers.'}</p>
              </div>
            ) : (
              sent.map((v) => <VoucherCard key={v.id} v={v} isSent />)
            )}
          </TabsContent>

          <TabsContent value="received" className="mt-4 space-y-3">
            {isLoading ? (
              [...Array(2)].map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
            ) : received.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Gift className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">{t('vouchers.emptyReceived') ?? 'Ainda não recebeste vouchers. Partilha o teu código com a família!'}</p>
              </div>
            ) : (
              received.map((v) => <VoucherCard key={v.id} v={v} isSent={false} />)
            )}
          </TabsContent>
        </Tabs>

        {/* Segurança */}
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground px-1">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <p>
            {t('vouchers.security') ?? 'Vouchers protegidos por código único e validação no servidor. O valor só sai da carteira quando emites; cancelamento devolve 100%.'}
          </p>
        </div>
      </div>
    </div>
  );
}
