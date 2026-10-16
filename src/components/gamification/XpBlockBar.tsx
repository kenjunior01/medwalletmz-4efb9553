import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const XP_PER_LEVEL = 500;
const SEGMENTS = 10;

interface XpBlockBarProps {
  level: number;
  xp: number;
  compact?: boolean;
}

/**
 * Barra de XP em blocos estilo Minecraft — 10 segmentos com brilho
 * varrendo da esquerda para a direita. Cada bloco = 10% do nível.
 */
export default function XpBlockBar({ level, xp, compact = false }: XpBlockBarProps) {
  const xpInLevel = ((xp % XP_PER_LEVEL) + XP_PER_LEVEL) % XP_PER_LEVEL;
  const pct = Math.min(100, (xpInLevel / XP_PER_LEVEL) * 100);
  const filledCount = Math.floor((pct / 100) * SEGMENTS);
  const partial = (pct / 100) * SEGMENTS - filledCount;
  const [shineKey, setShineKey] = useState(0);

  useEffect(() => {
    setShineKey((k) => k + 1);
  }, [filledCount, level]);

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={`font-bold ${compact ? 'text-xs' : 'text-sm'}`}>
          Nível {level}
        </span>
        <span className={`text-muted-foreground ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {Math.round(xpInLevel)}/{XP_PER_LEVEL} XP
        </span>
      </div>
      <div className="relative flex gap-1" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        {Array.from({ length: SEGMENTS }).map((_, i) => {
          const isFull = i < filledCount;
          const isPartial = i === filledCount && partial > 0;
          return (
            <div
              key={i}
              className="relative flex-1 overflow-hidden rounded-[3px] border border-black/25 bg-muted/80"
              style={{
                height: compact ? 10 : 14,
                boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.22)',
              }}
            >
              {isFull && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-700"
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  transition={{ delay: i * 0.045, type: 'spring', stiffness: 320, damping: 22 }}
                  style={{ transformOrigin: 'bottom' }}
                />
              )}
              {isPartial && (
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-700"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(partial * 100)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              )}
            </div>
          );
        })}
        {/* Brilho que varre a barra a cada preenchimento */}
        <motion.div
          key={shineKey}
          className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent"
          initial={{ x: '-120%' }}
          animate={{ x: '420%' }}
          transition={{ duration: 0.9, delay: 0.35, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}
