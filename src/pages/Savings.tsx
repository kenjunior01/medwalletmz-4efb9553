import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { useCountry } from '@/contexts/CountryContext';
import { logger } from '@/lib/logger';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import {
  PiggyBank, Plus, Baby, Stethoscope, Pill, Microscope,
  Activity, Package, Target, CheckCircle2, RefreshCw, Wallet as WalletIcon, Sparkles,
} from '@/components/icons/lucide-compat';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SavingsGoal {
  id: string;
  name: string;
  category: string;
  target_amount: number;
  saved_amount: number;
  status: string;
  created_at: string;
}

const DEPOSIT_CHIPS = [50, 100, 250, 500];

const CATEGORIES: { id: string; label: string; emoji: string; icon: any }[] = [
  { id: 'parto', label: 'Parto seguro', emoji: '👶', icon: Baby },
  { id: 'cirurgia', label: 'Cirurgia', emoji: '🏥', icon: Stethoscope },
  { id: 'medicacao', label: 'Medicação crónica', emoji: '💊', icon: Pill },
  { id: 'consulta', label: 'Consultas', emoji: '🩺', icon: Stethoscope },
  { id: 'exames', label: 'Exames', emoji: '🔬', icon: Microscope },
  { id: 'equipamento', label: 'Equipamento', emoji: '🦽', icon: Package },
  { id: 'outro', label: 'Outro objetivo', emoji: '🎯', icon: Target },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

/** Barra de progresso em blocos estilo Minecraft — 10 blocos, cada um = 10% */
function BlockyProgress({ pct, completed }: { pct: number; completed: boolean }) {
  const filled = Math.min(10, Math.floor(pct / 10));
  const partial = pct / 10 - filled;
  return (
    <div className="flex gap-1" aria-hidden>
      {Array.from({ length: 10 }).map((_, i) => {
        const isFull = i < filled;
        const isPartial = i === filled && partial > 0;
        return (
          <div key={i} className="h-6 flex-1 rounded-[3px] border border-black/20 relative overflow-hidden bg-muted/70"
            style={{ boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.25), inset 0 2px 0 rgba(255,255,255,0.25)' }}>
            {isFull && (
              <div className={`absolute inset-0 ${completed
                ? 'bg-gradient-to-b from-amber-400 to-amber-600'
                : 'bg-gradient-to-b from-emerald-400 to-emerald-600'}`} />
            )}
            {isPartial && (
              <div className={`absolute inset-y-0 left-0 ${completed
                ? 'bg-gradient-to-b from-amber-400 to-amber-600'
                : 'bg-gradient-to-b from-emerald-400 to-emerald-600'}`}
              style={{ width: `${Math.round(partial * 100)}%` }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Savings() {
  const { user } = useAuth();
  const { t } = useCountry();
  const { wallet } = useWallet();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [category, setCategory] = useState('outro');
  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  const fmt = (v: number) => new Intl.NumberFormat('pt-MZ').format(Math.round(v));

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['savings-goals', user?.id],
    queryFn: async () => {
      if (!user) return [] as SavingsGoal[];
      const { data, error } = await (supabase as any)
        .from('savings_goals')
        .select('*')
        .order('status', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(40);
      if (error) {
        logger.error('savings fetch failed', error.message);
        return [] as SavingsGoal[];
      }
      return (data ?? []) as SavingsGoal[];
    },
    enabled: !!user,
    staleTime: 15_000,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
  };

  const createGoal = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any)
        .from('savings_goals')
        .insert({
          user_id: user!.id,
          name: name.trim(),
          category,
          target_amount: Number(target),
        })
        .select()
        .single();
      if (error) throw error;
      return data as SavingsGoal;
    },
    onSuccess: (g) => {
      toast.success(`Meta “${g.name}” criada — cada bloco é um passo! 🧱`);
      setName(''); setTarget(''); setCreateOpen(false);
      invalidateAll();
    },
    onError: (e: any) => {
      toast.error('Não foi possível criar a meta');
      logger.error('create goal', e?.message);
    },
  });

  const deposit = useMutation({
    mutationFn: async ({ goalId, amount }: { goalId: string; amount: number }) => {
      const { data, error } = await (supabase as any).rpc('deposit_savings', {
        p_goal_id: goalId,
        p_amount: amount,
      });
      if (error) throw error;
      return data as { saved_amount: number; target_amount: number; completed: boolean; bonus_xp: number };
    },
    onSuccess: (data, vars) => {
      invalidateAll();
      setDepositGoal(null);
      setDepositAmount('');
      if (data.completed) {
        confetti({
          particleCount: 130,
          spread: 85,
          shapes: ['square'],
          scalar: 1,
          colors: ['#fbbf24', '#f59e0b', '#10b981', '#3b82f6'],
          origin: { y: 0.35 },
        });
        setTimeout(() => confetti({
          particleCount: 70, spread: 110, shapes: ['square'], scalar: 0.85,
          colors: ['#fbbf24', '#10b981'], origin: { y: 0.3 },
        }), 300);
        toast.success(`🏆 Meta concluída! +50 XP de bónus`);
      } else {
        toast.success(`+${fmt(vars.amount)} MZN guardados (+10 XP)`);
      }
    },
    onError: (e: any) => {
      const code = e?.message ?? '';
      if (code.includes('INSUFFICIENT_BALANCE')) toast.error('Saldo insuficiente — deposita na carteira primeiro');
      else if (code.includes('INVALID_AMOUNT')) toast.error('Depósito mínimo: 10 MZN');
      else toast.error('Falha no depósito');
      logger.error('deposit savings', code);
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <PiggyBank className="h-14 w-14 text-primary" />
        <h1 className="text-2xl font-bold">{t('savings.title') ?? 'Poupança de Saúde'}</h1>
        <p className="text-muted-foreground max-w-sm">
          {t('savings.guest') ?? 'Cria metas de poupança para parto, cirurgia ou medicação — bloco a bloco.'}
        </p>
        <Button onClick={() => (window.location.href = '/auth')}>{t('savings.cta') ?? 'Criar conta'}</Button>
      </div>
    );
  }

  const active = goals.filter((g) => g.status === 'active');
  const done = goals.filter((g) => g.status !== 'active');

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(45deg, white 25%, transparent 25%, transparent 75%, white 75%), linear-gradient(45deg, white 25%, transparent 25%, transparent 75%, white 75%)', backgroundSize: '36px 36px', backgroundPosition: '0 0, 18px 18px' }}
        />
        <div className="relative max-w-3xl mx-auto px-4 pt-8 pb-10">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <PiggyBank className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">{t('savings.title') ?? 'Poupança de Saúde'}</h1>
              <p className="text-white/80 text-sm">{t('savings.subtitle') ?? 'Constrói a tua torre de saúde, bloco a bloco'}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-4 py-1.5 text-sm">
              <WalletIcon className="h-4 w-4" />
              Saldo: <strong>{fmt(wallet?.balance ?? 0)} {wallet?.currency ?? 'MZN'}</strong>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-4 py-1.5 text-sm">
              <Target className="h-4 w-4" />
              Metas ativas: <strong>{active.length}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-6 space-y-5">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full h-12 text-base gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/20">
              <Plus className="h-5 w-5" />
              {t('savings.create') ?? 'Nova meta de poupança'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                {t('savings.create') ?? 'Nova meta'}
              </DialogTitle>
              <DialogDescription>
                {t('savings.createHint') ?? 'Define o objetivo; cada depósito coloca um bloco na tua torre.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Para quê?</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.emoji} {c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Nome da meta</label>
                <Input
                  className="mt-1.5"
                  placeholder="Ex.: Parto na Maternidade"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Alvo (MZN)</label>
                <Input
                  className="mt-1.5"
                  type="number"
                  inputMode="numeric"
                  placeholder="Ex.: 15000"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  min={50}
                />
              </div>
              <Button
                className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500"
                disabled={!name.trim() || !Number(target) || Number(target) < 50 || createGoal.isPending}
                onClick={() => createGoal.mutate()}
              >
                {createGoal.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Criar meta
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          [...Array(2)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)
        ) : active.length === 0 && done.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center space-y-3">
              <div className="text-5xl">🧱</div>
              <p className="font-semibold">{t('savings.emptyTitle') ?? 'A tua primeira torre começa com um bloco'}</p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {t('savings.emptyBody') ?? 'Poupa para um parto, cirurgia ou medicação. Cada depósito adiciona um bloco e dá XP.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {[...active, ...done].map((g) => {
              const pct = Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100));
              const cat = CATEGORY_MAP[g.category];
              const completed = g.status === 'completed';
              return (
                <motion.div key={g.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                  <Card className={`overflow-hidden ${completed ? 'border-amber-500/40 shadow-md shadow-amber-500/10' : ''}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-3xl">{completed ? '🏆' : cat?.emoji ?? '🎯'}</span>
                          <div>
                            <p className="font-bold leading-tight">{g.name}</p>
                            <p className="text-xs text-muted-foreground">{cat?.label ?? 'Meta'}</p>
                          </div>
                        </div>
                        {completed && <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30" variant="outline">Concluída</Badge>}
                      </div>

                      <BlockyProgress pct={pct} completed={completed} />

                      <div className="flex items-baseline justify-between">
                        <p className="text-sm font-bold">
                          {fmt(g.saved_amount)} <span className="text-muted-foreground font-normal">/ {fmt(g.target_amount)} MZN</span>
                        </p>
                        <p className={`text-sm font-extrabold ${completed ? 'text-amber-500' : 'text-emerald-600'}`}>{pct}%</p>
                      </div>

                      {!completed && (
                        <Button
                          size="sm"
                          className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                          onClick={() => { setDepositGoal(g); setDepositAmount(''); }}
                        >
                          <Plus className="h-4 w-4" /> Depositar bloco
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="flex items-start gap-2 text-[11px] text-muted-foreground px-1">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <p>
            {t('savings.security') ?? 'O dinheiro fica na tua carteira MedWallet — os depósitos só saem quando tu mandas e podem ser acompanhados no histórico. Meta concluída desbloqueia +50 XP.'}
          </p>
        </div>
      </div>

      {/* Dialog de depósito */}
      <Dialog open={!!depositGoal} onOpenChange={(o) => !o && setDepositGoal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-amber-500" />
              Depositar em “{depositGoal?.name}”
            </DialogTitle>
            <DialogDescription>
              Faltam <strong>{fmt(Math.max(0, (depositGoal?.target_amount ?? 0) - (depositGoal?.saved_amount ?? 0)))} MZN</strong> para concluir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {DEPOSIT_CHIPS.map((a) => (
                <button
                  key={a}
                  onClick={() => setDepositAmount(String(a))}
                  className={`rounded-lg border py-2 text-sm font-semibold transition-all ${
                    depositAmount === String(a)
                      ? 'border-amber-500 bg-amber-500/10 text-amber-600'
                      : 'border-border hover:border-amber-400/50'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Outro valor (mín. 10)"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              min={10}
            />
            <Button
              className="w-full h-11 gap-2 bg-gradient-to-r from-amber-500 to-orange-500"
              disabled={!Number(depositAmount) || Number(depositAmount) < 10 || deposit.isPending}
              onClick={() => depositGoal && deposit.mutate({ goalId: depositGoal.id, amount: Number(depositAmount) })}
            >
              {deposit.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {deposit.isPending ? 'A depositar…' : 'Colocar bloco 🧱'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
