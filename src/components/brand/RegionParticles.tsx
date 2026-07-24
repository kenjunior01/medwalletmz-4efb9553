/**
 * RegionParticles — Ambient particle effects per country
 * 
 * Uses @tsparticles/react with custom configs per region.
 * Particles are region-themed: fireflies for Africa, pollen for Brazil, etc.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions } from '@tsparticles/engine';
import { getTheme } from '@/themes';
import { useCountry } from '@/contexts/CountryContext';
import { useDataSaver } from '@/contexts/DataSaverContext';

interface RegionParticlesProps {
  className?: string;
  density?: number; // Override theme density
}

export function RegionParticles({ className = '', density }: RegionParticlesProps) {
  const { country } = useCountry();
  const { isDataSaver } = useDataSaver();
  const theme = getTheme(country?.id || 'MZ');
  const [init, setInit] = useState(false);

  // Skip particles in data saver mode
  if (isDataSaver) return null;

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setInit(true));
  }, []);

  const particleConfig = useMemo((): ISourceOptions => {
    const p = theme.particles;
    const count = density ?? p.count;

    return {
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
            ? ['circle', 'star', 'diamond'][Math.floor(Math.random() * 3)] as any
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
  }, [theme, density]);

  return (
    <Particles
      id={`particles-${country?.id || 'MZ'}`}
      className={`absolute inset-0 pointer-events-none z-0 ${className}`}
      particlesLoaded={useCallback(async () => {}, [])}
      options={particleConfig}
    />
  );
}

export default RegionParticles;
