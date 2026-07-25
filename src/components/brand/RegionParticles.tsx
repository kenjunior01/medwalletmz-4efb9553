/**
 * RegionParticles — Ambient particle effects per country/province
 * 
 * Uses @tsparticles/react with custom configs per region.
 * When a province is selected, province-level particle config takes precedence.
 * Supports 10 patterns: fireflies, pollen, sand, snow, confetti, rainbow,
 * ocean, leaves, mist, stars.
 */
import { useCallback, useMemo } from 'react';
import Particles from '@tsparticles/react';
import type { ISourceOptions } from '@tsparticles/engine';
import { getTheme, useProvince } from '@/themes';
import { useCountry } from '@/contexts/CountryContext';
import { useDataSaver } from '@/contexts/DataSaverContext';
import type { ProvinceTheme } from '@/themes/provinces';

interface RegionParticlesProps {
  className?: string;
  /** Override theme particle density */
  density?: number;
  /** Optional province theme override (if not using context) */
  provinceTheme?: ProvinceTheme;
}

// ── Reduced motion detection ──────────────────────────────────────────────
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Pattern-specific engine configs ───────────────────────────────────────
// These modify the base ISourceOptions to create distinct visual feels.

function applyOceanPattern(base: ISourceOptions, _colors: string[], speed: number): ISourceOptions {
  const particles = (base.particles ?? {}) as any;
  return {
    ...base,
    particles: {
      ...particles,
      move: {
        ...(particles.move ?? {}),
        enable: true,
        speed: speed * 0.8,
        direction: 'bottom',
        random: false,
        straight: false,
        outModes: { default: 'out' },
        // Sine wave via angle oscillation
        angle: { offset: 0, value: 90, enable: true },
        // Wobble: no-op when wobble plugin isn't loaded
        wobble: true,
      } as any,
      // Wider, flatter particles for wave feel
      size: {
        ...(particles.size ?? {}),
        value: { min: 2, max: 5 },
      },
      opacity: {
        ...(particles.opacity ?? {}),
        value: { min: 0.1, max: 0.4 },
      },
    },
  };
}

function applyLeavesPattern(base: ISourceOptions, _colors: string[], speed: number): ISourceOptions {
  const particles = (base.particles ?? {}) as any;
  return {
    ...base,
    particles: {
      ...particles,
      move: {
        ...(particles.move ?? {}),
        enable: true,
        speed: speed * 0.4,
        direction: 'bottom',
        random: true,
        straight: false,
        outModes: { default: 'out' },
        // Horizontal sway
        angle: { offset: 45, value: 90, enable: true },
        // Gravity plugin: graceful no-op when not loaded
        gravity: { enable: true },
      } as any,
      shape: {
        ...(particles.shape ?? {}),
        type: 'circle',
      },
      size: {
        ...(particles.size ?? {}),
        value: { min: 3, max: 7 },
      },
      opacity: {
        ...(particles.opacity ?? {}),
        value: { min: 0.2, max: 0.6 },
        animation: {
          enable: true,
          speed: 0.5,
          sync: false,
        },
      },
    },
  };
}

function applyMistPattern(base: ISourceOptions, _colors: string[], _speed: number): ISourceOptions {
  const particles = (base.particles ?? {}) as any;
  return {
    ...base,
    fpsLimit: 20,
    particles: {
      ...particles,
      move: {
        ...(particles.move ?? {}),
        enable: true,
        speed: 0.2,
        direction: 'none',
        random: true,
        straight: false,
        outModes: { default: 'out' },
      },
      shape: {
        ...(particles.shape ?? {}),
        type: 'circle',
      },
      // Large, blurry particles for mist
      size: {
        ...(particles.size ?? {}),
        value: { min: 30, max: 80 },
        animation: {
          enable: true,
          speed: 0.3,
          sync: false,
        },
      },
      opacity: {
        ...(particles.opacity ?? {}),
        value: { min: 0.01, max: 0.05 },
        animation: {
          enable: true,
          speed: 0.4,
          sync: false,
        },
      },
    },
  };
}

function applyStarsPattern(base: ISourceOptions, _colors: string[], _speed: number): ISourceOptions {
  const particles = (base.particles ?? {}) as any;
  return {
    ...base,
    fpsLimit: 24,
    particles: {
      ...particles,
      move: {
        ...(particles.move ?? {}),
        enable: false, // Stationary
      },
      shape: {
        ...(particles.shape ?? {}),
        type: 'circle',
      },
      size: {
        ...(particles.size ?? {}),
        value: { min: 1, max: 3 },
        animation: {
          enable: true,
          speed: 2,
          sync: false,
        },
      },
      opacity: {
        ...(particles.opacity ?? {}),
        value: { min: 0.1, max: 0.9 },
        animation: {
          enable: true,
          speed: 1.2,
          sync: false,
        },
      },
    },
  };
}

// ── Pattern dispatch ──────────────────────────────────────────────────────

type ParticlePattern = ProvinceTheme['particles']['pattern'];

function applyPatternConfig(
  base: ISourceOptions,
  pattern: ParticlePattern,
  colors: string[],
  speed: number,
): ISourceOptions {
  switch (pattern) {
    case 'ocean':
      return applyOceanPattern(base, colors, speed);
    case 'leaves':
      return applyLeavesPattern(base, colors, speed);
    case 'mist':
      return applyMistPattern(base, colors, speed);
    case 'stars':
      return applyStarsPattern(base, colors, speed);
    default:
      // fireflies, pollen, sand, snow, confetti, rainbow — use base config
      return base;
  }
}

export function RegionParticles({ className = '', density, provinceTheme }: RegionParticlesProps) {
  const { country } = useCountry();
  const { enabled: isDataSaver } = useDataSaver();
  const { province: contextProvince } = useProvince();

  // Determine effective province theme: explicit prop > context
  const province = provinceTheme ?? contextProvince;

  // Skip particles in data saver mode or reduced motion
  if (isDataSaver || prefersReducedMotion()) return null;

  const particleConfig = useMemo((): ISourceOptions => {
    // Province takes precedence when available
    if (province) {
      const pp = province.particles;
      const count = density ?? pp.count;
      // Province themes don't have size/opacity; provide sensible defaults
      const size = 4;
      const opacity = 0.6;

      const base: ISourceOptions = {
        fullScreen: false,
        fpsLimit: 30,
        particles: {
          color: { value: pp.colors },
          links: {
            enable: false,
            distance: 150,
            color: pp.colors[0],
            opacity: 0.1,
            width: 1,
          },
          move: {
            enable: true,
            speed: pp.speed,
            direction: 'none',
            random: true,
            straight: false,
            outModes: { default: 'out' },
          },
          number: {
            value: Math.min(count, 50),
            density: { enable: true, width: 1920, height: 1080 },
          },
          opacity: {
            value: { min: opacity * 0.3, max: opacity },
            animation: {
              enable: true,
              speed: 0.8,
              sync: false,
            },
          },
          shape: {
            type: pp.shape === 'mixed'
              ? (['circle', 'star', 'diamond'] as const)[Math.floor(Math.random() * 3)]
              : pp.shape,
          },
          size: {
            value: { min: size * 0.5, max: size * 1.5 },
            animation: {
              enable: true,
              speed: 1.5,
              sync: false,
            },
          },
        },
        detectRetina: true,
      };

      return applyPatternConfig(base, pp.pattern, pp.colors, pp.speed);
    }

    // Country-level theme
    const theme = getTheme(country?.id || 'MZ');
    const p = theme.particles;
    const count = density ?? p.count;

    const base: ISourceOptions = {
      fullScreen: false,
      fpsLimit: 30,
      particles: {
        color: { value: p.colors },
        links: {
          enable: false,
          distance: 150,
          color: p.colors[0],
          opacity: 0.15,
          width: 1,
        },
        move: {
          enable: true,
          speed: p.speed,
          direction: 'none',
          random: true,
          straight: false,
          outModes: { default: 'out' },
        },
        number: {
          value: Math.min(count, 50),
          density: { enable: true, width: 1920, height: 1080 },
        },
        opacity: {
          value: { min: p.opacity * 0.3, max: p.opacity },
          animation: {
            enable: true,
            speed: 0.8,
            sync: false,
          },
        },
        shape: {
          type: p.shape === 'mixed'
            ? (['circle', 'star', 'diamond'] as const)[Math.floor(Math.random() * 3)]
            : p.shape,
        },
        size: {
          value: { min: p.size * 0.5, max: p.size * 1.5 },
          animation: {
            enable: true,
            speed: 1.5,
            sync: false,
          },
        },
      },
      detectRetina: true,
    };

    // Apply country-level pattern if specified
    if (p.pattern) {
      return applyPatternConfig(base, p.pattern as ParticlePattern, p.colors, p.speed);
    }

    return base;
  }, [country, province, density]);

  const id = province?.id ?? country?.id ?? 'MZ';

  return (
    <Particles
      id={`particles-${id}`}
      className={`absolute inset-0 pointer-events-none z-0 ${className}`}
      particlesLoaded={useCallback(async () => {}, [])}
      options={particleConfig}
    />
  );
}

export default RegionParticles;
