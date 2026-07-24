/**
 * MedWallet Regional Theme System
 * Each region/country gets a unique visual identity inspired by
 * national flag colors, cultural patterns, and local aesthetics.
 */

export interface RegionTheme {
  id: string;
  name: string;
  flag: string;
  region: string;

  /** Core color palette derived from national identity */
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    secondaryLight: string;
    accent: string;
    accentLight: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
  };

  /** Gradient presets for hero sections and cards */
  gradients: {
    hero: string;
    heroSubtle: string;
    card: string;
    accent: string;
    dark: string;
  };

  /** Ambient particle effects configuration */
  particles: {
    colors: string[];
    count: number;
    speed: number;
    size: number;
    opacity: number;
    shape: 'circle' | 'star' | 'diamond' | 'mixed';
    pattern?: 'fireflies' | 'pollen' | 'sand' | 'snow' | 'confetti' | 'rainbow';
  };

  /** Logo color overrides */
  logo: {
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
  };

  /** Region-specific decorative patterns (CSS background-image) */
  pattern?: {
    type: 'lines' | 'dots' | 'waves' | 'zigzag' | 'crosshatch' | 'scales';
    opacity: number;
    color: string;
  };

  /** Cultural symbol shown during loading/splash */
  symbol?: string;
}

export type RegionID = 'MZ' | 'BR' | 'AO' | 'ZA' | 'PT' | 'IN' | 'CV' | 'ST' | 'GW' | 'KE' | 'TZ' | 'UG' | 'ET' | 'RW' | 'NG' | 'GH' | 'SN' | 'CI' | 'MA' | 'EG' | 'CM' | 'CD';
