/**
 * RegionVisualEffects — World region themed background effects
 * 
 * Renders region-appropriate visual effects based on country/region:
 * - africa_south: Warm sunset particles, ocean wave gradients
 * - africa_east: Mountain silhouettes, savanna golds
 * - africa_west: Rhythmic pulsing dots (kente-inspired), warm earth
 * - africa_north: Sand particles, geometric Islamic patterns
 * - africa_central: Rainforest mist, deep greens
 * - latam: Carnival energy, vibrant greens/yellows
 * - europe: Subtle maritime mist, elegant blues
 * - asia: Mandala-inspired rotating patterns, saffron
 */

import { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRegionTheme } from '@/themes/RegionThemeProvider';
import type { RegionTheme } from '@/themes';
import { cn } from '@/lib/utils';

interface RegionVisualEffectsProps {
  countryCode?: string;
  intensity?: 'subtle' | 'normal' | 'vivid';
  className?: string;
}

// ─── Region Effect Configurations ────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
}

interface RegionEffectConfig {
  particleCount: number;
  particleSpeed: number;
  particleSize: [number, number]; // min, max
  backgroundGradient: string;
  animation: 'float' | 'rain' | 'snow' | 'pulse' | 'wave' | 'spiral' | 'mist' | 'drift';
  overlayPattern?: 'none' | 'waves' | 'mountains' | 'sand-dunes' | 'forest' | 'geometric' | 'mandala';
}

const REGION_EFFECTS: Record<string, RegionEffectConfig> = {
  africa_south: {
    particleCount: 25,
    particleSpeed: 0.3,
    particleSize: [2, 6],
    backgroundGradient: 'linear-gradient(180deg, rgba(255,209,0,0.08) 0%, rgba(0,151,57,0.05) 50%, rgba(212,0,0,0.03) 100%)',
    animation: 'float',
    overlayPattern: 'waves',
  },
  africa_east: {
    particleCount: 20,
    particleSpeed: 0.2,
    particleSize: [3, 8],
    backgroundGradient: 'linear-gradient(180deg, rgba(244,162,97,0.1) 0%, rgba(34,139,34,0.06) 40%, rgba(210,180,140,0.04) 100%)',
    animation: 'drift',
    overlayPattern: 'mountains',
  },
  africa_west: {
    particleCount: 30,
    particleSpeed: 0.5,
    particleSize: [2, 5],
    backgroundGradient: 'linear-gradient(180deg, rgba(255,165,0,0.08) 0%, rgba(139,69,19,0.05) 50%, rgba(255,215,0,0.04) 100%)',
    animation: 'pulse',
    overlayPattern: 'geometric',
  },
  africa_north: {
    particleCount: 35,
    particleSpeed: 0.4,
    particleSize: [1, 4],
    backgroundGradient: 'linear-gradient(180deg, rgba(210,180,140,0.1) 0%, rgba(139,119,101,0.06) 50%, rgba(255,223,128,0.04) 100%)',
    animation: 'drift',
    overlayPattern: 'sand-dunes',
  },
  africa_central: {
    particleCount: 15,
    particleSpeed: 0.15,
    particleSize: [4, 10],
    backgroundGradient: 'linear-gradient(180deg, rgba(0,100,0,0.08) 0%, rgba(34,139,34,0.06) 40%, rgba(0,60,0,0.04) 100%)',
    animation: 'mist',
    overlayPattern: 'forest',
  },
  latam: {
    particleCount: 28,
    particleSpeed: 0.6,
    particleSize: [2, 7],
    backgroundGradient: 'linear-gradient(180deg, rgba(0,156,59,0.08) 0%, rgba(255,223,0,0.06) 50%, rgba(0,39,118,0.04) 100%)',
    animation: 'float',
    overlayPattern: 'none',
  },
  europe: {
    particleCount: 12,
    particleSpeed: 0.15,
    particleSize: [3, 8],
    backgroundGradient: 'linear-gradient(180deg, rgba(100,149,237,0.06) 0%, rgba(176,196,222,0.04) 50%, rgba(70,130,180,0.03) 100%)',
    animation: 'mist',
    overlayPattern: 'waves',
  },
  asia: {
    particleCount: 22,
    particleSpeed: 0.25,
    particleSize: [2, 6],
    backgroundGradient: 'linear-gradient(180deg, rgba(255,153,51,0.08) 0%, rgba(255,215,0,0.05) 50%, rgba(255,99,71,0.04) 100%)',
    animation: 'spiral',
    overlayPattern: 'mandala',
  },
};

const DEFAULT_EFFECT: RegionEffectConfig = REGION_EFFECTS.africa_south;

// ─── Canvas Particle Renderer ────────────────────────────────────────────────

function useParticleCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  config: RegionEffectConfig,
  theme: RegionTheme,
  intensity: string
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const intensityMultiplier = intensity === 'subtle' ? 0.5 : intensity === 'vivid' ? 1.5 : 1;
    const count = Math.floor(config.particleCount * intensityMultiplier);

    let animationFrame: number;
    let particles: Particle[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize particles
    const initParticles = () => {
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push(createParticle(canvas.width, canvas.height, config, theme));
      }
    };

    const createParticle = (w: number, h: number, cfg: RegionEffectConfig, t: RegionTheme): Particle => {
      const [minSize, maxSize] = cfg.particleSize;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * (maxSize - minSize) + minSize,
        speedX: (Math.random() - 0.5) * cfg.particleSpeed * 2,
        speedY: (Math.random() - 0.5) * cfg.particleSpeed * 2,
        opacity: Math.random() * 0.5 + 0.1,
        color: t.particles.colors[Math.floor(Math.random() * t.particles.colors.length)],
        life: 0,
        maxLife: Math.random() * 500 + 300,
      };
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, idx) => {
        p.life++;

        // Animation behavior
        switch (config.animation) {
          case 'float':
            p.x += p.speedX + Math.sin(p.life * 0.02) * 0.3;
            p.y += p.speedY + Math.cos(p.life * 0.015) * 0.2;
            break;
          case 'drift':
            p.x += p.speedX;
            p.y += p.speedY * 0.5 + Math.sin(p.life * 0.01) * 0.1;
            break;
          case 'rain':
            p.y += Math.abs(p.speedY) * 2 + 0.5;
            p.x += Math.sin(p.life * 0.03) * 0.3;
            break;
          case 'pulse':
            p.x += p.speedX;
            p.y += p.speedY;
            p.opacity = 0.1 + Math.abs(Math.sin(p.life * 0.05)) * 0.4;
            break;
          case 'wave':
            p.x += p.speedX;
            p.y += Math.sin(p.x * 0.01 + p.life * 0.02) * 1.5;
            break;
          case 'spiral': {
            const angle = p.life * 0.02 + idx * 0.5;
            p.x += Math.cos(angle) * 0.3 + p.speedX * 0.3;
            p.y += Math.sin(angle) * 0.3 + p.speedY * 0.3;
            break;
          }
          case 'mist':
            p.x += p.speedX * 0.3;
            p.y += p.speedY * 0.1;
            p.opacity = Math.sin(p.life * 0.01) * 0.2 + 0.15;
            p.size += 0.01;
            break;
        }

        // Fade in/out based on life
        const lifeRatio = p.life / p.maxLife;
        const fadeIn = Math.min(p.life / 50, 1);
        const fadeOut = lifeRatio > 0.8 ? (1 - lifeRatio) * 5 : 1;
        const finalOpacity = p.opacity * fadeIn * fadeOut * intensityMultiplier;

        // Wrap around
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.y > canvas.height + 10) p.y = -10;
        if (p.y < -10) p.y = canvas.height + 10;

        // Reset expired particles
        if (p.life >= p.maxLife) {
          particles[idx] = createParticle(canvas.width, canvas.height, config, theme);
          return;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, finalOpacity));
        ctx.fill();

        // Glow effect
        if (p.size > 3) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, Math.min(0.15, finalOpacity * 0.2));
          ctx.fill();
        }
      });

      ctx.globalAlpha = 1;
      animationFrame = requestAnimationFrame(animate);
    };

    initParticles();
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
    };
  }, [config, theme, intensity]);
}

// ─── SVG Overlay Patterns ───────────────────────────────────────────────────

function OverlayPattern({ pattern, theme }: { pattern: string; theme: RegionTheme }) {
  if (pattern === 'none') return null;

  const primaryColor = theme.colors.primary;
  const secondaryColor = theme.colors.secondary;

  switch (pattern) {
    case 'waves':
      return (
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" preserveAspectRatio="none">
          <pattern id="wave-pattern" x="0" y="0" width="200" height="40" patternUnits="userSpaceOnUse">
            <path d="M0 20 Q50 0 100 20 T200 20" fill="none" stroke={primaryColor} strokeWidth="1.5" />
            <path d="M0 30 Q50 10 100 30 T200 30" fill="none" stroke={secondaryColor} strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#wave-pattern)" />
        </svg>
      );

    case 'mountains':
      return (
        <svg className="absolute bottom-0 left-0 w-full h-1/3 opacity-[0.04]" preserveAspectRatio="none">
          <polygon points="0,100% 15%,40% 30%,70% 45%,20% 60%,50% 75%,30% 90%,60% 100%,35% 100%,100%" fill={primaryColor} />
          <polygon points="0,100% 20%,55% 40%,80% 55%,35% 70%,65% 85%,45% 100%,70% 100%,100%" fill={secondaryColor} opacity="0.5" />
        </svg>
      );

    case 'sand-dunes':
      return (
        <svg className="absolute bottom-0 left-0 w-full h-1/4 opacity-[0.05]" preserveAspectRatio="none">
          <path d="M0 80 Q25 40 50 65 T100 55 T150 70 T200 50 T250 60 T300 45 T350 65 L350 100 L0 100 Z" fill={primaryColor} />
          <path d="M0 90 Q30 60 60 75 T120 65 T180 80 T240 60 T300 75 L300 100 L0 100 Z" fill={secondaryColor} opacity="0.5" />
        </svg>
      );

    case 'forest':
      return (
        <svg className="absolute bottom-0 left-0 w-full h-1/3 opacity-[0.04]" preserveAspectRatio="none">
          {Array.from({ length: 12 }).map((_, i) => (
            <g key={i} transform={`translate(${i * 8.3 + 2}, 0)`}>
              <polygon points={`${(i * 8.3 + 5)}% 100% ${(i * 8.3 + 2)}% 40% ${(i * 8.3 + 8)}% 40%`} fill={primaryColor} />
              <polygon points={`${(i * 8.3 + 5)}% 30% ${(i * 8.3 + 3)}% 60% ${(i * 8.3 + 7)}% 60%`} fill={secondaryColor} opacity="0.7" />
            </g>
          ))}
        </svg>
      );

    case 'geometric':
      return (
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
          <defs>
            <pattern id="geo-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill={primaryColor} />
              <rect x="20" y="20" width="20" height="20" fill={primaryColor} />
              <circle cx="20" cy="20" r="3" fill={secondaryColor} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#geo-pattern)" />
        </svg>
      );

    case 'mandala':
      return (
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" viewBox="0 0 400 400">
          <defs>
            <pattern id="mandala-pattern" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
              <circle cx="100" cy="100" r="40" fill="none" stroke={primaryColor} strokeWidth="1" />
              <circle cx="100" cy="100" r="25" fill="none" stroke={secondaryColor} strokeWidth="1" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                <line key={angle}
                  x1={100 + Math.cos((angle * Math.PI) / 180) * 25}
                  y1={100 + Math.sin((angle * Math.PI) / 180) * 25}
                  x2={100 + Math.cos((angle * Math.PI) / 180) * 40}
                  y2={100 + Math.sin((angle * Math.PI) / 180) * 40}
                  stroke={primaryColor} strokeWidth="1"
                />
              ))}
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mandala-pattern)" />
        </svg>
      );

    default:
      return null;
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function RegionVisualEffects({
  countryCode = 'MZ',
  intensity = 'normal',
  className,
}: RegionVisualEffectsProps) {
  const theme = useRegionTheme(countryCode);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const config = useMemo(
    () => REGION_EFFECTS[theme.region] || DEFAULT_EFFECT,
    [theme.region]
  );

  useParticleCanvas(canvasRef, config, theme, intensity);

  return (
    <div className={cn('fixed inset-0 pointer-events-none z-0 overflow-hidden', className)}>
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{ background: config.backgroundGradient }}
      />

      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* SVG overlay pattern */}
      <OverlayPattern pattern={config.overlayPattern || 'none'} theme={theme} />

      {/* Vignette overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, var(--region-bg, #F4FAF4) 100%)',
        }}
      />
    </div>
  );
}

export default RegionVisualEffects;
