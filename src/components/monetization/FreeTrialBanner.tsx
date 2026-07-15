/**
 * src/components/monetization/FreeTrialBanner.tsx
 * ====================================================================
 * Banner promocional de Free Trial que aparece na Home e páginas de planos.
 *
 * Mostra:
 *  - Se o user NÃO está autenticado: "Cria conta — 30 dias grátis"
 *  - Se autenticado mas sem subscrição: "Activa o teu trial de 30 dias"
 *  - Se tem trial activo: "Faltam X dias — assina para manter benefícios"
 *  - Se já usou trial e não tem sub: oculta (não mostrar de novo)
 * ====================================================================
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  Gift, ArrowRight, Clock, Crown, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  getUserActiveSubscription,
  getFreeTrialDaysRemaining,
  hasUsedFreeTrial,
  startFreeTrial,
} from '@/lib/mzMonetization';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'mz_free_trial_dismissed_until';
const DISMISS_DAYS = 3;

type BannerState =
  | { type: 'guest' }
  | { type: 'eligible' }
  | { type: 'trial_active'; daysRemaining: number }
  | { type: 'active_sub' }
  | { type: 'used' }
  | { type: 'hidden' };

export function FreeTrialBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<BannerState>({ type: 'hidden' });
  const [activating, setActivating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() < until) {
      setDismissed(true);
      return;
    }
    if (!user) {
      setState({ type: 'guest' });
      return;
    }
    (async () => {
      const sub = await getUserActiveSubscription(user.id);
      if (sub.status === 'active') {
        const days = await getFreeTrialDaysRemaining(user.id);
        if (days !== null) {
          setState({ type: 'trial_active', daysRemaining: days });
        } else {
          setState({ type: 'active_sub' });
        }
        return;
      }
      const days = await getFreeTrialDaysRemaining(user.id);
      if (days !== null) {
        setState({ type: 'trial_active', daysRemaining: days });
      } else {
        const used = await hasUsedFreeTrial(user.id);
        setState(used ? { type: 'used' } : { type: 'eligible' });
      }
    })();
  }, [user]);

  const dismiss = () => {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
    setDismissed(true);
  };

  const handleActivate = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setActivating(true);
    try {
      const result = await startFreeTrial({
        userId: user.id,
        planSlug: 'premium-individual',
      });
      if (result.success) {
        toast.success('Free Trial activado!', {
          description: '30 dias Premium grátis. Aproveite!',
        });
        setState({ type: 'trial_active', daysRemaining: 30 });
      } else {
        toast.error(result.errorMessage || 'Não foi possível activar o trial.');
      }
    } catch {
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setActivating(false);
    }
  };

  if (dismissed || state.type === 'hidden' || state.type === 'active_sub' || state.type === 'used') {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <Card className={cn(
        'border-0 shadow-md overflow-hidden relative',
        state.type === 'trial_active'
          ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
          : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
      )}>
        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="absolute right-2 top-2 rounded-full p-1 bg-white/20 hover:bg-white/30 z-10"
        >
          <X className="h-3 w-3" />
        </button>
        <div className="p-4">
          {state.type === 'guest' && (
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20">
                <Gift className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">30 dias Premium GRÁTIS</div>
                <div className="text-xs text-white/80 mt-0.5">
                  Sem cartão · sem compromisso · cancela quando quiser
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate('/auth')}
                className="bg-white text-emerald-700 hover:bg-emerald-50 shrink-0"
              >
                Começar <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          )}

          {state.type === 'eligible' && (
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20">
                <Crown className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">Activa o seu Free Trial</div>
                <div className="text-xs text-white/80 mt-0.5">
                  30 dias de Premium · IA ilimitada · lembretes WhatsApp
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={activating}
                onClick={handleActivate}
                className="bg-white text-emerald-700 hover:bg-emerald-50 shrink-0"
              >
                {activating ? 'A activar...' : 'Activar agora'}
              </Button>
            </div>
          )}

          {state.type === 'trial_active' && (
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20">
                <Clock className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">
                  Free Trial — faltam {state.daysRemaining} dias
                </div>
                <div className="text-xs text-white/80 mt-0.5">
                  Mantém os benefícios após o trial · 199 MZN/mês
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate('/planos')}
                className="bg-white text-amber-700 hover:bg-amber-50 shrink-0"
              >
                Ver planos <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
