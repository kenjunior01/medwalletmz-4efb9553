import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';

const LEVEL_SEEN_KEY = 'mw_level_seen';

interface LevelUpOverlayProps {
  level: number;
  enabled?: boolean;
}

function blockCelebration() {
  const colors = ['#fbbf24', '#f59e0b', '#10b981', '#3b82f6', '#a78bfa'];
  confetti({
    particleCount: 120,
    spread: 90,
    startVelocity: 45,
    shapes: ['square'],
    scalar: 1.1,
    colors,
    origin: { y: 0.3 },
  });
  setTimeout(() => confetti({ particleCount: 80, spread: 120, shapes: ['square'], scalar: 0.9, colors, origin: { y: 0.25 } }), 250);
  setTimeout(() => confetti({ particleCount: 60, spread: 100, shapes: ['square'], scalar: 0.8, colors, origin: { y: 0.4 } }), 500);
}

/**
 * Overlay de subida de nível: deteta aumento do nível e celebra
 * com confetti em blocos + animação estilo arcade. Também cobre
 * o caso de subir de nível noutro dispositivo (persistido em localStorage).
 */
export default function LevelUpOverlay({ level, enabled = true }: LevelUpOverlayProps) {
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const prevLevel = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !level || level < 1) return;

    // Primeira montagem: comparar com último nível visto (persistente)
    if (prevLevel.current === null) {
      const seen = Number(localStorage.getItem(LEVEL_SEEN_KEY) ?? 0);
      prevLevel.current = level;
      if (level > seen && seen > 0) {
        setCelebrate(level);
        blockCelebration();
      }
      localStorage.setItem(LEVEL_SEEN_KEY, String(Math.max(level, seen)));
      return;
    }

    // Mudança em sessão
    if (level > prevLevel.current) {
      setCelebrate(level);
      blockCelebration();
      localStorage.setItem(LEVEL_SEEN_KEY, String(level));
    }
    prevLevel.current = level;
  }, [level, enabled]);

  const dismiss = () => setCelebrate(null);

  return (
    <AnimatePresence>
      {celebrate !== null && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
          role="dialog"
          aria-label={`Subiste para o nível ${celebrate}`}
        >
          <motion.div
            className="relative flex flex-col items-center gap-4 px-8 py-10 mx-4 rounded-3xl bg-gradient-to-b from-indigo-950/95 to-slate-950/95 border-2 border-yellow-400/60 shadow-2xl shadow-yellow-500/20 max-w-sm text-center cursor-pointer select-none"
            initial={{ scale: 0.5, y: 60, rotate: -3 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            {/* Halo pulsante */}
            <motion.div
              className="absolute -inset-6 rounded-[2.5rem] bg-yellow-400/10"
              animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
            />

            <motion.div
              className="text-6xl"
              animate={{ rotate: [0, -12, 12, 0], scale: [1, 1.25, 1] }}
              transition={{ repeat: Infinity, duration: 1.4, repeatDelay: 0.4 }}
            >
              🏆
            </motion.div>

            <div>
              <motion.p
                className="text-[11px] font-black tracking-[0.35em] text-yellow-300 uppercase"
                initial={{ letterSpacing: '0.1em', opacity: 0 }}
                animate={{ letterSpacing: '0.35em', opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                Subiste de nível!
              </motion.p>
              <motion.h2
                className="mt-1 text-5xl font-black text-white drop-shadow-[0_3px_0_rgba(251,191,36,0.6)]"
                key={celebrate}
                initial={{ scale: 1.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 220 }}
              >
                NÍVEL {celebrate}
              </motion.h2>
              <p className="mt-2 text-sm text-white/70">
                A tua dedicação à saúde está a dar frutos. Continua a minerar, aprender e cuidar!
              </p>
            </div>

            <motion.button
              className="mt-2 rounded-xl bg-gradient-to-b from-yellow-400 to-amber-600 px-6 py-2.5 font-black text-amber-950 shadow-lg shadow-amber-900/40 active:scale-95 transition-transform border-2 border-amber-300/60"
              onClick={dismiss}
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            >
              CONTINUAR
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
