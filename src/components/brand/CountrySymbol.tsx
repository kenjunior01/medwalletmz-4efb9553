/**
 * CountrySymbol — SVG cultural symbols representing each country's identity
 * 
 * Lightweight SVG icons that represent national landmarks, cultural elements,
 * or natural features for each supported country. Used in loading screens,
 * region headers, and identity contexts.
 */

import { useRegionTheme } from '@/themes/RegionThemeProvider';
import { cn } from '@/lib/utils';

interface CountrySymbolProps {
  countryCode?: string;
  size?: number;
  className?: string;
  animated?: boolean;
}

/**
 * Map of country codes to SVG path data for cultural symbols.
 * Each symbol represents something iconic about the country.
 */
const COUNTRY_SYMBOLS: Record<string, {
  name: string;
  description: string;
  paths: string[];
  viewBox: string;
}> = {
  MZ: {
    name: 'Moçambique',
    description: 'Maputo skyline with the iconic Ponte de Maputo',
    viewBox: '0 0 64 64',
    paths: [
      // Bridge (Ponte de Maputo)
      'M4 40 L16 28 L28 36 L40 24 L52 32 L60 28',
      // Building silhouettes
      'M8 48 L8 36 L14 36 L14 48',
      'M18 48 L18 30 L22 30 L22 48',
      'M26 48 L26 34 L32 34 L32 48',
      'M36 48 L36 28 L40 28 L40 48',
      'M44 48 L44 32 L50 32 L50 48',
      'M54 48 L54 36 L58 36 L58 48',
      // Water
      'M0 50 Q8 48 16 50 T32 50 T48 50 T64 50 L64 64 L0 64 Z',
    ],
  },
  BR: {
    name: 'Brasil',
    description: 'Christ the Redeemer silhouette',
    viewBox: '0 0 64 64',
    paths: [
      // Christ the Redeemer simplified
      'M32 8 L30 20 L26 18 L28 24 L24 28 L20 26 L24 32 L20 36 L22 36 L24 40 L26 44 L28 50 L30 54 L32 56 L34 54 L36 50 L38 44 L40 40 L42 36 L44 36 L40 32 L44 28 L40 24 L42 18 L38 20 L36 12 Z',
      // Mountain
      'M8 56 Q16 48 24 52 T40 46 T56 52 L64 56 L64 64 L0 64 L0 56 Z',
    ],
  },
  AO: {
    name: 'Angola',
    description: 'Angolan cultural symbol',
    viewBox: '0 0 64 64',
    paths: [
      'M32 12 L24 32 L12 28 L20 40 L8 48 L24 52 L32 56 L40 52 L56 48 L44 40 L52 28 L40 32 Z',
      'M32 28 L28 36 L22 34 L26 40 L32 42 L38 40 L42 34 L36 36 Z',
    ],
  },
  ZA: {
    name: 'South Africa',
    description: 'Table Mountain silhouette',
    viewBox: '0 0 64 64',
    paths: [
      'M0 40 Q8 24 16 20 Q24 16 32 18 Q40 20 48 22 Q56 24 64 36 L64 64 L0 64 Z',
      'M8 36 Q12 32 16 34 Q20 36 24 34',
      'M4 48 Q8 46 12 48 Q16 50 20 48',
    ],
  },
  PT: {
    name: 'Portugal',
    description: 'Tower of Belem silhouette',
    viewBox: '0 0 64 64',
    paths: [
      'M24 12 L24 8 L28 8 L28 12 L36 12 L36 8 L40 8 L40 12 L40 20 L44 20 L44 56 L20 56 L20 20 L24 20 Z',
      'M22 24 L42 24', 'M22 28 L42 28', 'M22 32 L42 32',
      'M28 20 L28 56', 'M36 20 L36 56',
      'M16 56 L48 56 L48 60 L16 60 Z',
      'M30 8 L32 4 L34 8',
    ],
  },
  IN: {
    name: 'India',
    description: 'Taj Mahal silhouette',
    viewBox: '0 0 64 64',
    paths: [
      'M32 12 L28 20 L20 24 L20 44 L44 44 L44 24 L36 20 Z',
      'M32 4 L30 8 L26 10 L26 14 L38 14 L38 10 L34 8 Z',
      'M16 44 L16 52 L20 56 L44 56 L48 52 L48 44',
      'M12 56 L52 56 L52 60 L12 60 Z',
      'M4 60 L60 60 L60 64 L4 64 Z',
    ],
  },
  KE: {
    name: 'Kenya',
    description: 'Acacia tree silhouette',
    viewBox: '0 0 64 64',
    paths: [
      'M32 16 L20 28 L16 24 L20 32 L12 36 L20 38 L16 44 L24 42 L20 48 L28 46 L32 52',
      'M32 16 L44 28 L48 24 L44 32 L52 36 L44 38 L48 44 L40 42 L44 48 L36 46 L32 52',
      'M30 52 L32 64 L34 52',
    ],
  },
  TZ: {
    name: 'Tanzania',
    description: 'Mount Kilimanjaro silhouette',
    viewBox: '0 0 64 64',
    paths: [
      'M20 56 L28 24 L30 20 L32 12 L34 20 L36 24 L44 56 Z',
      'M32 12 L30 16 L28 18 L30 14 L32 8 L34 14 L36 18 L34 16 Z',
      'M12 56 L20 56 L20 64 L12 64 Z',
      'M44 56 L52 56 L52 64 L44 64 Z',
    ],
  },
  // Generic symbols for countries without custom SVGs
  DEFAULT: {
    name: 'MedWallet',
    description: 'Health cross symbol',
    viewBox: '0 0 64 64',
    paths: [
      'M26 8 L38 8 L38 26 L56 26 L56 38 L38 38 L38 56 L26 56 L26 38 L8 38 L8 26 L26 26 Z',
    ],
  },
};

export function CountrySymbol({
  countryCode = 'MZ',
  size = 48,
  className,
  animated = false,
}: CountrySymbolProps) {
  const theme = useRegionTheme(countryCode);
  const symbol = COUNTRY_SYMBOLS[countryCode] || COUNTRY_SYMBOLS.DEFAULT;
  const fillColor = theme.colors.primary;

  return (
    <svg
      width={size}
      height={size}
      viewBox={symbol.viewBox}
      fill={fillColor}
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        'shrink-0',
        animated && 'animate-pulse',
        className
      )}
      role="img"
      aria-label={symbol.name}
    >
      {symbol.paths.map((path, idx) => (
        <path key={idx} d={path} />
      ))}
    </svg>
  );
}

/**
 * Get the symbol data for a country (for use in contexts that need the raw data)
 */
export function getCountrySymbolData(countryCode: string) {
  return COUNTRY_SYMBOLS[countryCode] || COUNTRY_SYMBOLS.DEFAULT;
}

/**
 * List of all countries with custom symbols
 */
export const COUNTRIES_WITH_SYMBOLS = Object.keys(COUNTRY_SYMBOLS).filter(k => k !== 'DEFAULT');

export default CountrySymbol;
