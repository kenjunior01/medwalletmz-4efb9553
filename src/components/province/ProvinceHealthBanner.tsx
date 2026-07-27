/**
 * ProvinceHealthBanner — Animated banner showing province health stats
 *
 * Displays province name, cultural symbol, and real-time health stats
 * (doctors, pharmacies, clinics) with province-themed gradient background.
 * Supports dismiss via localStorage persistence and framer-motion animations.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Stethoscope, Building2, Pill } from "@/components/icons/lucide-compat";
import { cn } from '@/lib/utils';
import { useProvince } from '@/themes';
import { useCountry } from '@/contexts/CountryContext';
import { useProvinceHealth } from '@/hooks/useProvinceHealth';

interface ProvinceHealthBannerProps {
  /** Additional className for the outer wrapper */
  className?: string;
}

/** Dismiss key scoped to the selected province */
function getDismissKey(provinceId: string): string {
  return `province_banner_dismissed_${provinceId}_${new Date().toDateString()}`;
}

export function ProvinceHealthBanner({ className }: ProvinceHealthBannerProps) {
  const { province } = useProvince();
  const { t } = useCountry();
  const { stats, isLoading } = useProvinceHealth();
  const [visible, setVisible] = useState(() => {
    if (!province) return false;
    return !localStorage.getItem(getDismissKey(province.id));
  });

  // React to province changes (re-show if user switches province)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const _prevProvinceId = useState(province?.id);

  if (!province) return null;

  function handleDismiss() {
    localStorage.setItem(getDismissKey(province.id), 'true');
    setVisible(false);
  }

  const statItems = [
    {
      icon: Stethoscope,
      label: t('provinces.stats.doctors', { defaultValue: 'Médicos' }),
      value: stats?.totalDoctors ?? 0,
    },
    {
      icon: Building2,
      label: t('provinces.stats.pharmacies', { defaultValue: 'Farmácias' }),
      value: stats?.totalPharmacies ?? 0,
    },
    {
      icon: Pill,
      label: t('provinces.stats.clinics', { defaultValue: 'Clínicas' }),
      value: stats?.totalClinics ?? 0,
    },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 260, damping: 25 }}
          className={cn('relative max-w-4xl mx-auto mt-3', className)}
        >
          {/* Banner card */}
          <div
            className="relative overflow-hidden rounded-2xl p-4 sm:p-5 shadow-lg"
            style={{
              background: province.gradients.hero,
              borderBottom: `3px solid ${province.colors.accent}`,
            }}
          >
            {/* Subtle pattern overlay */}
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  province.pattern === 'capulana'
                    ? 'repeating-linear-gradient(45deg, #fff 0px, #fff 2px, transparent 2px, transparent 8px), repeating-linear-gradient(-45deg, #fff 0px, #fff 2px, transparent 2px, transparent 8px)'
                    : province.pattern === 'waves'
                    ? 'repeating-radial-gradient(circle at 50% 100%, transparent 0, transparent 8px, rgba(255,255,255,0.3) 8px, rgba(255,255,255,0.3) 10px)'
                    : province.pattern === 'dots'
                    ? 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)'
                    : undefined,
                backgroundSize:
                  province.pattern === 'dots'
                    ? '12px 12px'
                    : undefined,
              }}
            />

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="absolute top-2.5 right-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/20 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/40 hover:text-white"
              aria-label={t('province.dismiss', { defaultValue: 'Fechar' })}
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {/* Province header */}
            <div className="relative z-10 flex items-center gap-3 mb-3">
              <span className="text-3xl sm:text-4xl">{province.culturalSymbol}</span>
              <div>
                <h2
                  className="text-base sm:text-lg font-black text-white leading-tight"
                  style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
                >
                  {t('province.health_title', {
                    defaultValue: 'Saúde em {name}',
                    name: province.name,
                  })}
                </h2>
                <p
                  className="text-xs sm:text-sm text-white/75 font-medium mt-0.5"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
                >
                  📍 {province.capital}
                </p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              {statItems.map((item) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-sm px-3 py-2.5 border border-white/10"
                >
                  <item.icon className="h-4 w-4 text-white/90 shrink-0" />
                  <div className="min-w-0">
                    <p
                      className="text-lg sm:text-xl font-black text-white leading-none"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                    >
                      {isLoading ? (
                        <span className="inline-block w-6 h-5 animate-pulse rounded bg-white/30" />
                      ) : (
                        item.value.toLocaleString()
                      )}
                    </p>
                    <p className="text-[10px] sm:text-xs text-white/70 font-semibold mt-0.5 truncate">
                      {item.label}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ProvinceHealthBanner;
