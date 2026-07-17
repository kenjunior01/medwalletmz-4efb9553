/**
 * src/components/monetization/FreeTrialBanner.tsx
 * ====================================================================
 * Banner promocional na Home.
 *
 * Modelo novo (B2B-focused):
 *  - Pacientes: GRÁTIS PARA SEMPRE (sem trial, sem cartão)
 *  - Profissionais/Instituições: pagam (CTA /planos)
 *
 * Mostra:
 *  - Se user NÃO autenticado: "Cria conta — grátis para sempre"
 *  - Se user autenticado como paciente: oculto (já tem tudo grátis)
 *  - Se user autenticado como profissional/instituição sem sub: "Activa plano Pro"
 * ====================================================================
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRole';
import { motion } from 'framer-motion';
import {
  Gift, ArrowRight, X, Crown, Sparkles, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'mz_free_patient_dismissed_until';
const DISMISS_DAYS = 7;

export function FreeTrialBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roles } = useUserRoles();
  const [dismissed, setDismissed] = useState(false);

  // Verifica dismiss
  useState(() => {
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() < until) setDismissed(true);
  });

  const dismiss = () => {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
    setDismissed(true);
  };

  // Determina o estado do banner
  const isProfessional = user && roles.some(r =>
    ['doctor', 'clinic', 'hospital', 'lab', 'store_owner', 'driver', 'insurance', 'veterinary'].includes(r)
  );

  // Não mostrar para:
  // - user dismissed
  // - paciente autenticado (já tem tudo grátis)
  if (dismissed) return null;
  if (user && !isProfessional) return null;

  const handleCta = () => {
    if (!user) {
      navigate('/auth');
    } else {
      navigate('/planos');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <Card
        className={cn(
          'border-0 shadow-md overflow-hidden relative',
          !user
            ? 'bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 text-white'
            : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white'
        )}
      >
        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="absolute right-2 top-2 rounded-full p-1 bg-white/20 hover:bg-white/30 z-10"
        >
          <X className="h-3 w-3" />
        </button>
        <div className="p-4">
          {!user ? (
            // Guest — grátis para sempre
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20">
                <Gift className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm flex items-center gap-1.5 flex-wrap">
                  Pacientes grátis para sempre
                  <span className="bg-white text-emerald-700 text-[9px] font-black rounded-full px-1.5 py-0.5">
                    SEM CARTÃO
                  </span>
                </div>
                <div className="text-xs text-white/80 mt-0.5">
                  Triagem IA ilimitada · consultas · lembretes · registos
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCta}
                className="bg-white text-emerald-700 hover:bg-emerald-50 shrink-0"
              >
                Criar conta <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          ) : (
            // Profissional sem subscrição
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20">
                <Crown className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">
                  Activa o teu Plano Pro
                </div>
                <div className="text-xs text-white/80 mt-0.5">
                  Acede a milhares de pacientes · a partir de 250 MZN/mês
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCta}
                className="bg-white text-blue-700 hover:bg-blue-50 shrink-0"
              >
                Ver planos <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        {!user && (
          <div className="px-4 pb-2 flex items-center gap-1.5 text-[10px] text-white/70">
            <Heart className="h-3 w-3 fill-white/70" />
            <span>Pacientes atraem profissionais — juntos construímos saúde para Moçambique</span>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
