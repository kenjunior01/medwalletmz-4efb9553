/**
 * ProvinceSelector — Beautiful grid of Mozambique's 11 provinces
 * 
 * Each card displays the province gradient, name, capital, and cultural symbol.
 * On selection, stores the province in localStorage and context.
 * Responsive: 2 cols mobile, 3 cols tablet, 4 cols desktop.
 */
import { motion } from 'framer-motion';
import { useProvince } from '@/themes/ProvinceThemeProvider';
import type { ProvinceTheme } from '@/themes/provinces';
import { cn } from '@/lib/utils';

interface ProvinceSelectorProps {
  /** Optional className for the outer container */
  className?: string;
  /** Callback after a province is selected */
  onProvinceSelect?: (province: ProvinceTheme) => void;
  /** Whether to show a "clear selection" option */
  showClear?: boolean;
}

/** Animation variants for staggered card entrance */
const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

export function ProvinceSelector({
  className,
  onProvinceSelect,
  showClear = true,
}: ProvinceSelectorProps) {
  const { province, provinces, selectProvince, clearProvince } = useProvince();

  function handleSelect(p: ProvinceTheme) {
    selectProvince(p.id);
    onProvinceSelect?.(p);
  }

  function handleClear() {
    clearProvince();
  }

  return (
    <div className={cn('w-full', className)}>
      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {provinces.map((p) => {
          const isActive = province?.id === p.id;
          return (
            <motion.button
              key={p.id}
              variants={cardVariants}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(p)}
              className={cn(
                'relative overflow-hidden rounded-2xl p-4 sm:p-5 text-left transition-shadow duration-300',
                'border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                isActive
                  ? 'border-white/60 shadow-lg ring-2 ring-offset-2 ring-offset-background'
                  : 'border-white/20 hover:border-white/40 hover:shadow-md',
              )}
              style={{
                background: p.gradients.hero,
                ringColor: isActive ? p.colors.primary : undefined,
                // @ts-expect-error ring color override
                ['--tw-ring-color' as string]: isActive ? p.colors.primary : undefined,
              }}
            >
              {/* Gradient overlay for readability */}
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  background: `linear-gradient(180deg, transparent 30%, ${p.colors.primaryDark}88 100%)`,
                }}
              />

              {/* Active indicator */}
              {isActive && (
                <div className="absolute top-2 right-2 z-10">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: p.colors.primary }}
                  >
                    ✓
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="relative z-10 flex flex-col gap-1.5">
                {/* Cultural symbol */}
                <span className="text-2xl sm:text-3xl">{p.culturalSymbol}</span>

                {/* Province name */}
                <h3
                  className="text-sm sm:text-base font-bold text-white leading-tight"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                >
                  {p.name}
                </h3>

                {/* Capital */}
                <p className="text-xs text-white/70 font-medium">
                  📍 {p.capital}
                </p>

                {/* Pattern badge */}
                <span
                  className="mt-1 inline-flex self-start items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90"
                  style={{ backgroundColor: `${p.colors.primary}66` }}
                >
                  {p.pattern}
                </span>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Clear selection button */}
      {showClear && province && (
        <motion.div
          className="mt-4 flex justify-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={handleClear}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-5 py-2.5',
              'text-sm font-semibold text-foreground/70',
              'border border-border bg-card/80 backdrop-blur-sm',
              'hover:bg-card hover:text-foreground hover:border-border',
              'transition-all duration-200',
            )}
          >
            <span>✕</span>
            Limpar seleção de província
          </button>
        </motion.div>
      )}
    </div>
  );
}

export default ProvinceSelector;
