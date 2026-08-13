import { AnimatePresence, motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/design-system';
import { Clock } from '@/components/icons/lucide-compat';
import { formatTime } from './types';

interface OnlineTimerProps {
  isOnline: boolean;
  elapsedSeconds: number;
}

export function OnlineTimer({ isOnline, elapsedSeconds }: OnlineTimerProps) {
  return (
    <AnimatePresence>
      {isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <GlassCard
            className={`border ${
              isOnline
                ? 'bg-zinc-900/80 border-emerald-500/20'
                : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/15">
                  <Clock className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-sm text-white/70">Tempo online</span>
              </div>
              <span className="text-lg font-bold text-emerald-400 tabular-nums font-mono">
                {formatTime(elapsedSeconds)}
              </span>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
