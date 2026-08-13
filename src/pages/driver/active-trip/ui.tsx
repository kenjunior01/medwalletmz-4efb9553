import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Camera,
  Star,
} from '@/components/icons/lucide-compat';
import { cn } from '@/lib/utils';
import { formatTimer, STEP_LABELS } from './types';
import type { TripStep } from './types';

// ─── StepProgressBar ──────────────────────────────────────────────

export function StepProgressBar({ currentStep }: { currentStep: TripStep }) {
  const progressIndex = Math.min(currentStep - 1, 2) as 0 | 1 | 2;

  return (
    <div className="flex items-center justify-between px-2 py-4">
      {STEP_LABELS.map((label, i) => {
        const isActive = i === progressIndex;
        const isCompleted = i < progressIndex;

        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            {/* Circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors',
                  isActive && 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/40',
                  isCompleted && 'bg-emerald-600 border-emerald-500 text-white',
                  !isActive && !isCompleted && 'bg-zinc-800 border-zinc-600 text-zinc-500'
                )}
                animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {isCompleted ? <CheckCircle className="w-5 h-5" /> : <span>{i + 1}</span>}
              </motion.div>
              <span
                className={cn(
                  'text-[10px] sm:text-xs font-medium text-center leading-tight max-w-[60px]',
                  isActive ? 'text-emerald-400' : isCompleted ? 'text-emerald-500' : 'text-zinc-600'
                )}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEP_LABELS.length - 1 && (
              <div className="flex-1 mx-2 mb-5">
                <div className="h-0.5 w-full rounded-full bg-zinc-700 relative overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── TimerBar ─────────────────────────────────────────────────────

export function TimerBar({ elapsedSeconds }: { elapsedSeconds: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <Clock className="w-4 h-4 text-emerald-400" />
      <span className="text-emerald-400 font-mono text-lg font-semibold tracking-wider">
        {formatTimer(elapsedSeconds)}
      </span>
    </div>
  );
}

// ─── CancelDialog ─────────────────────────────────────────────────

export function CancelDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Cancelar Entrega?</h3>
        </div>
        <p className="text-zinc-400 text-sm mb-6">
          Se cancelar esta entrega, a encomenda será reencaminhada para outro motorista. Esta acção não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-zinc-600 text-zinc-300 hover:bg-zinc-800"
            onClick={onCancel}
          >
            Voltar
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onConfirm}
          >
            Cancelar Entrega
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── PhotoProofStep ───────────────────────────────────────────────

export function PhotoProofStep({
  onCapture,
  captured,
}: {
  onCapture: () => void;
  captured: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3"
    >
      <div
        className={cn(
          'w-32 h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all',
          captured
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-zinc-600 bg-zinc-800/50 hover:border-emerald-400 hover:bg-emerald-500/5'
        )}
        onClick={onCapture}
        role="button"
        aria-label={captured ? 'Foto capturada' : 'Tirar foto da entrega'}
      >
        {captured ? (
          <>
            <CheckCircle className="w-8 h-8 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">Foto adicionada</span>
          </>
        ) : (
          <>
            <Camera className="w-8 h-8 text-zinc-500" />
            <span className="text-xs text-zinc-500 font-medium">Tirar foto</span>
          </>
        )}
      </div>
      <p className="text-[11px] text-zinc-500 text-center">
        Fotografia de comprovativo da entrega (opcional)
      </p>
    </motion.div>
  );
}

// ─── RatingStars ──────────────────────────────────────────────────

export function RatingStars({
  rating,
  onRate,
}: {
  rating: number;
  onRate: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          whileTap={{ scale: 0.85 }}
          onClick={() => onRate(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
          aria-label={`Avaliar ${star} estrelas`}
        >
          <Star
            className={cn(
              'w-8 h-8 transition-colors',
              (hovered || rating) >= star
                ? 'text-amber-400 fill-amber-400'
                : 'text-zinc-600'
            )}
          />
        </motion.button>
      ))}
    </div>
  );
}
