/**
 * ProvinceVisualEffects — Province-specific visual background effects
 * 
 * Renders layered visual effects for the currently selected province:
 *  1. Gradient overlay (top/bottom hero gradient)
 *  2. Floating cultural symbols (framer-motion)
 *  3. Decorative SVG pattern (capulana, waves, zigzag, dots, lines, crosshatch, scales, stripes)
 *  4. Province glow orb (blurred primary-color circle)
 * 
 * All effects:
 *  - Respect DataSaver mode (disabled when active)
 *  - Respect prefers-reduced-motion
 *  - Use CSS custom properties (--province-primary, etc.)
 *  - Are GPU-accelerated (transform/opacity only, will-change: transform)
 */
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProvince } from '@/themes';
import { useDataSaver } from '@/contexts/DataSaverContext';
import type { ProvinceTheme } from '@/themes/provinces';

interface ProvinceVisualEffectsProps {
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}

// ── Helpers ─────────────────────────────────────────────────

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const intensityMap = {
  low: { opacity: 0.3, scale: 0.8, symbolCount: 1 },
  medium: { opacity: 0.5, scale: 1.0, symbolCount: 2 },
  high: { opacity: 0.7, scale: 1.2, symbolCount: 3 },
} as const;

type IntensityConfig = (typeof intensityMap)[keyof typeof intensityMap];

// ── Gradient Overlay ─────────────────────────────────────────────────

function ProvinceGradientOverlay({ province, intensity }: { province: ProvinceTheme; intensity: IntensityConfig }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-0 h-64 pointer-events-none z-0"
      style={{
        background: `linear-gradient(to bottom, var(--province-gradient-hero, ${province.gradients.hero}), transparent)`,
        opacity: intensity.opacity * 0.35,
        willChange: 'transform',
      }}
    />
  );
}

// ── Floating Cultural Symbols ─────────────────────────────────────────────────

function FloatingCulturalSymbols({ province, count, intensity }: { province: ProvinceTheme; count: number; intensity: IntensityConfig }) {
  const symbols = useMemo(() => {
    const positions = [
      { x: '12%', y: '18%', delay: 0, size: 28 },
      { x: '82%', y: '35%', delay: 1.5, size: 22 },
      { x: '45%', y: '72%', delay: 3.0, size: 24 },
    ];
    return positions.slice(0, count);
  }, [count]);

  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {symbols.map((s, i) => (
        <motion.span
          key={i}
          className="absolute select-none"
          style={{
            left: s.x,
            top: s.y,
            fontSize: `${s.size * intensity.scale}px`,
            willChange: 'transform, opacity',
          }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{
            opacity: [0, 0.25 * intensity.opacity, 0.15 * intensity.opacity, 0.25 * intensity.opacity, 0],
            scale: [0.8, 1.1, 0.95, 1.05, 0.8],
            y: [0, -12, 6, -8, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            delay: s.delay,
            ease: 'easeInOut',
          }}
        >
          {province.culturalSymbol}
        </motion.span>
      ))}
    </div>
  );
}

// ── Province Glow Orb ─────────────────────────────────────────────────

function ProvinceGlowOrb({ province, intensity }: { province: ProvinceTheme; intensity: IntensityConfig }) {
  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none z-0"
      style={{
        top: '-10%',
        right: '-8%',
        width: `${340 * intensity.scale}px`,
        height: `${340 * intensity.scale}px`,
        borderRadius: '50%',
        background: `radial-gradient(circle, var(--province-primary, ${province.colors.primary}) 0%, transparent 70%)`,
        opacity: 0.12 * intensity.opacity,
        filter: 'blur(60px)',
        willChange: 'transform',
      }}
    />
  );
}

// ── SVG Pattern Components ─────────────────────────────────────────────────

function CapulanaPattern({ color, opacity }: { color: string; opacity: number }) {
  return (
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id="capulana-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <polygon points="20,0 40,20 20,40 0,20" fill="none" stroke={color} strokeWidth="0.5" opacity={opacity} />
          <polygon points="20,8 32,20 20,32 8,20" fill="none" stroke={color} strokeWidth="0.3" opacity={opacity * 0.6} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#capulana-pattern)" />
    </svg>
  );
}

function WavesPattern({ color, opacity }: { color: string; opacity: number }) {
  return (
    <svg
      className="absolute bottom-0 left-0 w-full pointer-events-none"
      style={{ height: '120px', willChange: 'transform' }}
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <motion.path
        d="M0,60 C360,100 720,20 1080,60 C1260,80 1380,50 1440,60 L1440,120 L0,120 Z"
        fill={color}
        opacity={opacity * 0.4}
        animate={{
          d: [
            'M0,60 C360,100 720,20 1080,60 C1260,80 1380,50 1440,60 L1440,120 L0,120 Z',
            'M0,70 C360,30 720,90 1080,50 C1260,40 1380,70 1440,50 L1440,120 L0,120 Z',
            'M0,60 C360,100 720,20 1080,60 C1260,80 1380,50 1440,60 L1440,120 L0,120 Z',
          ],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M0,80 C480,50 960,100 1440,70 L1440,120 L0,120 Z"
        fill={color}
        opacity={opacity * 0.25}
        animate={{
          d: [
            'M0,80 C480,50 960,100 1440,70 L1440,120 L0,120 Z',
            'M0,70 C480,95 960,55 1440,85 L1440,120 L0,120 Z',
            'M0,80 C480,50 960,100 1440,70 L1440,120 L0,120 Z',
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  );
}

function ZigzagPattern({ color, opacity }: { color: string; opacity: number }) {
  return (
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id="zigzag-pattern" x="0" y="0" width="24" height="16" patternUnits="userSpaceOnUse">
          <polyline
            points="0,12 6,4 12,12 18,4 24,12"
            fill="none"
            stroke={color}
            strokeWidth="0.8"
            opacity={opacity}
          />
        </pattern>
      </defs>
      <motion.rect
        width="100%"
        height="100%"
        fill="url(#zigzag-pattern)"
        animate={{ x: [0, -24, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        style={{ willChange: 'transform' }}
      />
    </svg>
  );
}

function DotsPattern({ color, opacity }: { color: string; opacity: number }) {
  return (
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id="dots-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
          <circle cx="16" cy="16" r="2" fill={color} opacity={opacity} />
          <circle cx="0" cy="0" r="1.2" fill={color} opacity={opacity * 0.5} />
          <circle cx="32" cy="0" r="1.2" fill={color} opacity={opacity * 0.5} />
          <circle cx="0" cy="32" r="1.2" fill={color} opacity={opacity * 0.5} />
          <circle cx="32" cy="32" r="1.2" fill={color} opacity={opacity * 0.5} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots-pattern)" />
    </svg>
  );
}

function LinesPattern({ color, opacity }: { color: string; opacity: number }) {
  return (
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id="lines-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="20" y2="0" stroke={color} strokeWidth="0.5" opacity={opacity} />
          <line x1="0" y1="10" x2="20" y2="10" stroke={color} strokeWidth="0.3" opacity={opacity * 0.4} />
        </pattern>
      </defs>
      <motion.rect
        width="200%"
        height="100%"
        fill="url(#lines-pattern)"
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        style={{ willChange: 'transform' }}
      />
    </svg>
  );
}

function CrosshatchPattern({ color, opacity }: { color: string; opacity: number }) {
  return (
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id="crosshatch-pattern" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="16" y2="16" stroke={color} strokeWidth="0.4" opacity={opacity} />
          <line x1="16" y1="0" x2="0" y2="16" stroke={color} strokeWidth="0.4" opacity={opacity * 0.6} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#crosshatch-pattern)" />
    </svg>
  );
}

function ScalesPattern({ color, opacity }: { color: string; opacity: number }) {
  return (
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id="scales-pattern" x="0" y="0" width="30" height="26" patternUnits="userSpaceOnUse">
          <path
            d="M0,13 Q15,0 30,13"
            fill="none"
            stroke={color}
            strokeWidth="0.5"
            opacity={opacity}
          />
          <path
            d="M0,13 Q15,26 30,13"
            fill="none"
            stroke={color}
            strokeWidth="0.3"
            opacity={opacity * 0.5}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#scales-pattern)" />
    </svg>
  );
}

function StripesPattern({ color, opacity }: { color: string; opacity: number }) {
  return (
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id="stripes-pattern" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="12" fill={color} opacity={opacity} />
        </pattern>
      </defs>
      <motion.rect
        width="200%"
        height="100%"
        fill="url(#stripes-pattern)"
        animate={{ x: [0, -16.97, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        style={{ willChange: 'transform' }}
      />
    </svg>
  );
}

// ── Pattern Router ─────────────────────────────────────────────────

const PATTERN_COMPONENTS: Record<
  ProvinceTheme['pattern'],
  React.FC<{ color: string; opacity: number }>
> = {
  capulana: CapulanaPattern,
  waves: WavesPattern,
  zigzag: ZigzagPattern,
  dots: DotsPattern,
  lines: LinesPattern,
  crosshatch: CrosshatchPattern,
  scales: ScalesPattern,
  stripes: StripesPattern,
};

function DecorativePattern({ province, intensity }: { province: ProvinceTheme; intensity: IntensityConfig }) {
  const patternOpacity = intensity.opacity * 0.15;
  const PatternComponent = PATTERN_COMPONENTS[province.pattern];

  if (!PatternComponent) return null;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
      style={{ opacity: intensity.opacity }}
    >
      <PatternComponent color={province.colors.primary} opacity={patternOpacity} />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function ProvinceVisualEffects({
  className = '',
  intensity = 'medium',
}: ProvinceVisualEffectsProps) {
  const { province } = useProvince();
  const { enabled: isDataSaver } = useDataSaver();
  const config = intensityMap[intensity];

  // No effects when: no province, data saver, or reduced motion
  if (!province || isDataSaver || prefersReducedMotion()) return null;

  return (
    <AnimatePresence>
      <div
        className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
        style={{ zIndex: 0 }}
        aria-hidden="true"
      >
        {/* Layer 1: Gradient overlay */}
        <ProvinceGradientOverlay province={province} intensity={config} />

        {/* Layer 2: Glow orb */}
        <ProvinceGlowOrb province={province} intensity={config} />

        {/* Layer 3: Decorative pattern */}
        <DecorativePattern province={province} intensity={config} />

        {/* Layer 4: Floating cultural symbols */}
        <FloatingCulturalSymbols
          province={province}
          count={config.symbolCount}
          intensity={config}
        />
      </div>
    </AnimatePresence>
  );
}

export default ProvinceVisualEffects;
