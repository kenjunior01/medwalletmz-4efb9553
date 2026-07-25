import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProvince } from '@/themes';
import { useTranslation } from '@/contexts/CountryContext';
import { useDataSaver } from '@/contexts/DataSaverContext';
import type { ProvinceTheme } from '@/themes/provinces';
import { useA11yAnnounce } from '@/components/a11y';

// ── Simplified SVG paths for Mozambique's 11 provinces ──────────────────
// ViewBox: 0 0 420 620. Coast on the right (east), western border on the left.
// Provinces tile together to form the approximate outline of Mozambique.

const PROVINCE_PATHS: Record<string, string> = {
  // NW — borders Tanzania & Lake Niassa
  'niassa':
    'M58,38 L162,32 L162,242 L58,202 Z',

  // NE coast — borders Tanzania & Indian Ocean
  'cabo-delgado':
    'M162,32 L372,32 L370,82 L366,138 L162,138 Z',

  // North-central — largest inland province
  'nampula':
    'M162,138 L366,138 L363,192 L361,242 L162,242 Z',

  // West-central — borders Zambia & Zimbabwe
  'tete':
    'M58,202 L162,202 L162,312 L62,312 Z',

  // Central-west — borders Zimbabwe
  'manica':
    'M162,242 L212,242 L212,332 L162,332 Z',

  // Central coast — largest coastal province
  'zambezia':
    'M212,242 L361,242 L359,288 L361,332 L212,332 Z',

  // Central coast — Beira port
  'sofala':
    'M62,312 L162,332 L212,332 L361,332 L363,368 L361,402 L122,402 Z',

  // South-central coast — Tofo beaches
  'inhambane':
    'M122,402 L361,402 L359,432 L361,462 L112,462 Z',

  // South — Limpopo river, savanna
  'gaza':
    'M112,462 L361,462 L363,492 L366,522 L102,522 Z',

  // Far south coast — Matola
  'maputo-provincia':
    'M152,522 L366,522 L363,548 L359,568 L157,568 Z',

  // Southern tip — capital city
  'maputo-cidade':
    'M242,568 L322,568 L319,585 L242,585 Z',
};

// Approximate centroid for each province label
const PROVINCE_LABEL_POS: Record<string, { x: number; y: number }> = {
  'niassa':           { x: 108, y: 128 },
  'cabo-delgado':     { x: 268, y: 86  },
  'nampula':          { x: 266, y: 190 },
  'tete':             { x: 110, y: 258 },
  'manica':           { x: 187, y: 288 },
  'zambezia':         { x: 282, y: 288 },
  'sofala':           { x: 232, y: 358 },
  'inhambane':        { x: 240, y: 434 },
  'gaza':            { x: 238, y: 494 },
  'maputo-provincia': { x: 242, y: 546 },
  'maputo-cidade':    { x: 282, y: 578 },
};

// ── Short display names (abbreviated for small labels) ──────────────────
const PROVINCE_SHORT_NAMES: Record<string, string> = {
  'niassa':           'NIASSA',
  'cabo-delgado':     'CABO DELGADO',
  'nampula':          'NAMPULA',
  'tete':             'TETE',
  'manica':           'MANICA',
  'zambezia':         'ZAMBÉZIA',
  'sofala':           'SOFALA',
  'inhambane':        'INHAMBANE',
  'gaza':            'GAZA',
  'maputo-provincia': 'MAPUTO PROV.',
  'maputo-cidade':    'M.CIDADE',
};

interface ProvinceHealthMapProps {
  className?: string;
}

/**
 * ProvinceHealthMap — Interactive SVG map of Mozambique's 11 provinces.
 *
 * Features:
 *  - Each province is a clickable region coloured by its province theme.
 *  - Hover shows a tooltip with the province name.
 *  - Click selects the province via `useProvince().selectProvince()`.
 *  - Respects data-saver mode (disables framer-motion animations).
 *  - Announces selection changes to screen readers.
 *  - Keyboard accessible (Enter / Space to select).
 */
export function ProvinceHealthMap({ className = '' }: ProvinceHealthMapProps) {
  const { province: selectedProvince, provinces, selectProvince } = useProvince();
  const { t } = useTranslation();
  const { enabled: dataSaver } = useDataSaver();
  const { announce } = useA11yAnnounce();

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Build a lookup map for fast province-theme access
  const themeMap = useMemo(
    () => new Map(provinces.map((p) => [p.id, p])),
    [provinces],
  );

  const handleSelect = useCallback(
    (id: string) => {
      const alreadySelected = selectedProvince?.id === id;
      const nextId = alreadySelected ? null : id;
      selectProvince(nextId);

      if (!alreadySelected) {
        const theme = themeMap.get(id);
        const name = theme?.name ?? id;
        announce(t('provinces.explore_province', { province: name, defaultValue: `Explorar ${name}` }));
      }
    },
    [selectProvince, selectedProvince, themeMap, announce, t],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, id: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect(id);
      }
    },
    [handleSelect],
  );

  // Determine if animations should be reduced
  const reducedMotion =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-reduced-motion') === 'true';
  const shouldAnimate = !dataSaver && !reducedMotion;

  const mapLabel = t('provinces.province_explorer', {
    defaultValue: 'Mapa de saúde das províncias de Moçambique',
  });

  return (
    <div className={`relative w-full ${className}`}>
      {/* Screen-reader description */}
      <div className="sr-only" id="province-map-desc">
        {mapLabel}. {provinces.length} províncias.
      </div>

      <svg
        viewBox="0 0 420 620"
        className="w-full h-auto"
        role="img"
        aria-labelledby="province-map-desc"
        aria-label={mapLabel}
      >
        {/* Subtle background glow behind the country */}
        <defs>
          <filter id="province-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Render each province */}
        {provinces.map((prov) => {
          const pathData = PROVINCE_PATHS[prov.id];
          if (!pathData) return null;

          const isSelected = selectedProvince?.id === prov.id;
          const isHovered = hoveredId === prov.id;
          const labelPos = PROVINCE_LABEL_POS[prov.id];
          const shortName = PROVINCE_SHORT_NAMES[prov.id] ?? prov.name;

          // Determine fill color
          let fill: string;
          if (isSelected) {
            fill = prov.colors.primary;
          } else if (isHovered) {
            fill = prov.colors.primaryLight;
          } else {
            // Default: very transparent version of the primary color
            fill = `${prov.colors.primary}30`;
          }

          const strokeColor = isSelected
            ? '#FFFFFF'
            : isHovered
              ? `${prov.colors.primary}`
              : 'rgba(255,255,255,0.25)';
          const strokeWidth = isSelected ? 2.5 : isHovered ? 1.8 : 0.8;

          const motionProps = shouldAnimate
            ? {
                initial: { opacity: 0.7 },
                whileHover: { opacity: 1, scale: 1.03 },
                whileTap: { scale: 0.97 },
                transition: { type: 'spring', stiffness: 300, damping: 20 },
              }
            : {};  

          return (
            <g key={prov.id}>
              {/* Invisible hit area for easier targeting */}
              <path
                d={pathData}
                fill="transparent"
                stroke="none"
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={prov.name}
                aria-pressed={isSelected}
                onClick={() => handleSelect(prov.id)}
                onPointerEnter={() => setHoveredId(prov.id)}
                onPointerLeave={() => setHoveredId(null)}
                onKeyDown={(e) => handleKeyDown(e, prov.id)}
                style={{ outline: 'none' }}
              />

              {/* Visible province shape */}
              <motion.path
                d={pathData}
                fill={fill}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
                pointerEvents="none"
                filter={isSelected ? 'url(#province-glow)' : undefined}
                {...motionProps}
              />

              {/* Province label */}
              {labelPos && (
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="pointer-events-none select-none"
                  style={{
                    fontSize: prov.id === 'manica' || prov.id === 'maputo-cidade' ? '7px' : '8.5px',
                    fontWeight: isSelected ? 700 : 600,
                    fill: isSelected || isHovered ? '#FFFFFF' : 'rgba(255,255,255,0.85)',
                    textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                  }}
                >
                  {shortName}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip (HTML overlay) */}
      <AnimatePresence>
        {hoveredId && !dataSaver && (
          <motion.div
            key={hoveredId}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-popover text-popover-foreground text-xs font-medium shadow-lg border border-border pointer-events-none whitespace-nowrap"
          >
            {(() => {
              const theme = themeMap.get(hoveredId);
              return theme?.name ?? hoveredId;
            })()}
            {(() => {
              const theme = themeMap.get(hoveredId);
              return theme ? (
                <span className="ml-1.5 opacity-60">{theme.culturalSymbol}</span>
              ) : null;
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected province info panel */}
      <AnimatePresence>
        {selectedProvince && (
          <motion.div
            key={selectedProvince.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div
              className="mt-3 rounded-xl p-3 border"
              style={{
                backgroundColor: `${selectedProvince.colors.primary}10`,
                borderColor: `${selectedProvince.colors.primary}30`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg" role="img" aria-hidden="true">
                  {selectedProvince.culturalSymbol}
                </span>
                <h3
                  className="font-semibold text-sm"
                  style={{ color: selectedProvince.colors.primary }}
                >
                  {selectedProvince.name}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('provinces.province_health_network', {
                  province: selectedProvince.name,
                  defaultValue: selectedProvince.description,
                })}
              </p>
              <div
                className="mt-2 h-1 rounded-full"
                style={{
                  background: selectedProvince.gradients.accent,
                }}
                role="presentation"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
