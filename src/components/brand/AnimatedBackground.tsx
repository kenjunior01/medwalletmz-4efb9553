/**
 * AnimatedBackground — Mobile-first, GPU-optimized animated background.
 *
 * Diferenca do AuroraBackground (desktop):
 *   - Menos camadas (3 vs 5) — performance em dispositivos MZ de entrada
 *   - CSS puro para orbs (sem framer-motion) — 60fps constante
 *   - Respeita prefers-reduced-motion E DataSaver
 *   - Paleta ligada aos CSS tokens do tema (primary/secondary/accent)
 *   - Variante 'auth' com efeito de onda cinematografica
 *   - Variante 'subtle' para paginas de conteudo
 *   - Variante 'hero' para landing/CTA sections
 *
 * Uso:
 *   <AnimatedBackground variant="auth" />
 *   <AnimatedBackground variant="subtle" />
 *   <AnimatedBackground variant="hero" />
 */
import { useMemo, useEffect, useState } from 'react';
import { useDataSaver } from '@/contexts/DataSaverContext';
import { cn } from '@/lib/utils';

export type AnimatedBgVariant = 'auth' | 'subtle' | 'hero' | 'onboarding';

export interface AnimatedBackgroundProps {
  className?: string;
  variant?: AnimatedBgVariant;
  children?: React.ReactNode;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

// Orbs otimizados — posicoes pre-calculadas (nao random a cada render)
const AUTH_ORBS = [
  { id: 'a', x: '20%', y: '15%', size: 280, color: 'var(--primary)', opacity: 0.12, dur: 22, delay: 0, dx: 30, dy: 20 },
  { id: 'b', x: '70%', y: '60%', size: 220, color: 'var(--secondary)', opacity: 0.10, dur: 28, delay: -5, dx: -25, dy: -15 },
  { id: 'c', x: '50%', y: '80%', size: 180, color: 'var(--accent)', opacity: 0.08, dur: 18, delay: -10, dx: 15, dy: -25 },
  { id: 'd', x: '10%', y: '55%', size: 160, color: 'var(--primary)', opacity: 0.06, dur: 32, delay: -15, dx: 20, dy: 10 },
] as const;

const SUBTLE_ORBS = [
  { id: 'e', x: '60%', y: '20%', size: 200, color: 'var(--primary)', opacity: 0.06, dur: 30, delay: 0, dx: 10, dy: 8 },
  { id: 'f', x: '25%', y: '70%', size: 160, color: 'var(--secondary)', opacity: 0.04, dur: 35, delay: -8, dx: -8, dy: -12 },
] as const;

const HERO_ORBS = [
  { id: 'g', x: '30%', y: '10%', size: 350, color: 'var(--primary)', opacity: 0.18, dur: 20, delay: 0, dx: 40, dy: 25 },
  { id: 'h', x: '75%', y: '40%', size: 280, color: 'var(--secondary)', opacity: 0.14, dur: 26, delay: -6, dx: -30, dy: -20 },
  { id: 'i', x: '15%', y: '75%', size: 240, color: 'var(--accent)', opacity: 0.10, dur: 22, delay: -12, dx: 20, dy: -30 },
  { id: 'j', x: '85%', y: '85%', size: 200, color: 'var(--primary)', opacity: 0.08, dur: 30, delay: -18, dx: -15, dy: 15 },
  { id: 'k', x: '50%', y: '50%', size: 300, color: 'var(--secondary)', opacity: 0.06, dur: 24, delay: -3, dx: 25, dy: -10 },
] as const;

const ONBOARDING_ORBS = [
  { id: 'l', x: '80%', y: '10%', size: 250, color: 'var(--primary)', opacity: 0.10, dur: 24, delay: 0, dx: -20, dy: 30 },
  { id: 'm', x: '15%', y: '50%', size: 200, color: 'var(--accent)', opacity: 0.08, dur: 20, delay: -7, dx: 25, dy: -15 },
  { id: 'n', x: '60%', y: '85%', size: 180, color: 'var(--secondary)', opacity: 0.07, dur: 28, delay: -14, dx: -15, dy: -20 },
] as const;

function getOrbsForVariant(variant: AnimatedBgVariant) {
  switch (variant) {
    case 'auth': return AUTH_ORBS;
    case 'hero': return HERO_ORBS;
    case 'onboarding': return ONBOARDING_ORBS;
    case 'subtle':
    default: return SUBTLE_ORBS;
  }
}

function Orb({
  x, y, size, color, opacity, dur, delay, dx, dy, still,
}: {
  x: string; y: string; size: number; color: string;
  opacity: number; dur: number; delay: number; dx: number; dy: number;
  still: boolean;
}) {
  return (
    <div
      className={cn(
        'absolute rounded-full will-change-transform',
        !still && 'animate-mw-orb-float',
      )}
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        background: `radial-gradient(circle, hsl(${color}) 0%, transparent 70%)`,
        opacity,
        filter: 'blur(40px)',
        // On touch devices, reduce blur to save GPU
        // (touch devices typically have weaker GPUs and no hover)
        // @ts-expect-error CSS custom properties for animation
        '--mw-orb-dur': `${dur}s`,
        '--mw-orb-dx': `${dx}px`,
        '--mw-orb-dy': `${dy}px`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}
// Onda de gradiente para o hero
function WaveLayer({ variant, still }: { variant: AnimatedBgVariant; still: boolean }) {
  if (variant !== 'hero' && variant !== 'auth') return null;

  return (
    <div
      className={cn(
        'absolute inset-0 will-change-transform',
        !still && 'animate-mw-wave-shift'
      )}
      style={{ opacity: variant === 'hero' ? 0.35 : 0.2 }}
      aria-hidden="true"
    >
      {/* Onda 1 — lenta, larga */}
      <div
        className="absolute -top-1/2 -left-1/4 w-[150%] h-[150%] rounded-full"
        style={{
          background: `conic-gradient(from 180deg at 50% 50%, hsl(var(--primary) / 0.15), hsl(var(--accent) / 0.1), hsl(var(--secondary) / 0.12), hsl(var(--primary) / 0.15))`,
          filter: 'blur(80px)',
        }}
      />
      {/* Onda 2 — mais rapida, menor */}
      <div
        className={cn(
          'absolute -bottom-1/3 -right-1/3 w-[100%] h-[100%] rounded-full',
          !still && 'animate-mw-wave-shift-reverse'
        )}
        style={{
          background: `radial-gradient(circle, hsl(var(--secondary) / 0.2), transparent 60%)`,
          filter: 'blur(60px)',
        }}
      />
    </div>
  );
}

// Grid sutil de pontos para textura
function DotGrid() {
   const dots = useMemo(
    () => Array.from({ length: 20 }, (_, i) => ({
      key: i,
      x: ((i * 23 + 7) % 100),
      y: ((i * 37 + 13) % 100),
      size: (i % 3 === 0) ? 3 : 2,
      delay: (i * 1.3) % 8,
      dur: 4 + (i % 4),
    })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {dots.map((d) => (
        <span
          key={d.key}
          className="absolute rounded-full bg-foreground/5 animate-mw-dot-pulse will-change-opacity"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.size,
            height: d.size,
            animationDelay: `${d.delay}s`,
            // @ts-expect-error CSS custom properties
            '--mw-dot-dur': `${d.dur}s`,
          }}
        />
      ))}
    </div>
  );
}

// Linhas de gradiente cinematicas (hero only)
function CinematicLines({ still }: { still: boolean }) {
  if (still) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div
        className="absolute -inset-x-1/2 top-0 h-[140%] rotate-12 animate-mw-beam-drift"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, transparent 42%, hsl(var(--primary) / 0.12) 50%, transparent 58%, transparent 100%)',
          opacity: 0.5,
        }}
      />
      <div
        className="absolute -inset-x-1/2 top-0 h-[140%] -rotate-6 animate-mw-beam-drift-slow"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, transparent 38%, hsl(var(--secondary) / 0.08) 50%, transparent 62%, transparent 100%)',
          opacity: 0.4,
        }}
      />
    </div>
  );
}

export function AnimatedBackground({
  className,
  variant = 'subtle',
  children,
}: AnimatedBackgroundProps) {
  const { enabled: dataSaver } = useDataSaver();
  const reduced = useReducedMotion();
  const still = dataSaver || reduced;
  const orbs = getOrbsForVariant(variant);

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className
      )}
      aria-hidden="true"
    >
      {/* 1. Base wash — gradiente suave do fundo */}
      <div
        className="absolute inset-0"
        style={{
          background: variant === 'hero'
            ? 'radial-gradient(140% 120% at 50% 0%, hsl(var(--primary) / 0.06) 0%, hsl(var(--background)) 60%)'
            : 'radial-gradient(120% 100% at 50% 0%, hsl(var(--background)) 0%, hsl(var(--background)) 55%, hsl(var(--primary) / 0.04) 100%)',
        }}
      />

      {/* 2. Onda de gradiente (auth/hero) */}
      <WaveLayer variant={variant} still={still} />

      {/* 3. Orbs flutuantes */}
      <div className="absolute inset-0">
        {orbs.map((orb) => (
          <Orb key={orb.id} {...orb} still={still} />
        ))}
      </div>

      {/* 4. Dot grid de textura (subtle/onboarding) */}
      {(variant === 'subtle' || variant === 'onboarding') && <DotGrid />}

      {/* 5. Linhas cinematicas (hero) */}
      {variant === 'hero' && <CinematicLines still={still} />}

      {/* 6. Noise texture — only on hover devices (desktop) to avoid SVG filter cost on mobile */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none hidden [@media(hover:hover)]:block">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <filter id="mw-bg-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#mw-bg-noise)" />
        </svg>
      </div>

      {/* Children */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}

export default AnimatedBackground;
