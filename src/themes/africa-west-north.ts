/**
 * MedWallet Regional Themes — West Africa, North Africa, Central Africa
 * Inspired by Sahel, Maghreb, tropical forests, and savanna cultures
 */
import type { RegionTheme } from './types';

// ── NIGERIA 🇳🇬 ───────────────────────────────────────────────────────────────
// Green (agriculture), White (peace/unity)
// Pattern: Ankara fabric-inspired bold geometric patterns
export const ng: RegionTheme = {
  id: 'NG', name: 'Nigeria', flag: '🇳🇬', region: 'africa_west',
  colors: {
    primary: '#008751', primaryLight: '#00A86B', primaryDark: '#005C38',
    secondary: '#FFFFFF', secondaryLight: '#F5F5F5',
    accent: '#008751', accentLight: '#00C853',
    background: '#F5FAF7', surface: '#FFFFFF', text: '#1A2B1A', textMuted: '#5A7A5A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #008751 0%, #FFFFFF 50%, #008751 100%)',
    heroSubtle: 'linear-gradient(135deg, #E8F5E9 0%, #FFFFFF 50%, #E8F5E9 100%)',
    card: 'linear-gradient(145deg, #E8F5EE, #FFFFFF)',
    accent: 'linear-gradient(135deg, #008751, #00A86B)',
    dark: 'linear-gradient(135deg, #003D25, #001E14)',
  },
  particles: {
    colors: ['#00C853', '#FFFFFF', '#E0F5EC', '#008751'],
    count: 15, speed: 0.5, size: 2, opacity: 0.4,
    shape: 'circle', pattern: 'fireflies',
  },
  logo: { primary: '#008751', secondary: '#FFFFFF', accent: '#008751', glow: '#00875140' },
  pattern: { type: 'lines', opacity: 0.04, color: '#008751' },
  symbol: '🟢',
};

// ── GHANA 🇬🇭 ────────────────────────────────────────────────────────────────
// Red (sacrifice), Gold (mineral wealth), Green (forests), Black star (freedom)
// Pattern: Kente cloth-inspired woven patterns
export const gh: RegionTheme = {
  id: 'GH', name: 'Ghana', flag: '🇬🇭', region: 'africa_west',
  colors: {
    primary: '#006B3F', primaryLight: '#00994D', primaryDark: '#004D2D',
    secondary: '#FCD116', secondaryLight: '#FFE44D',
    accent: '#CE1126', accentLight: '#E53935',
    background: '#F8FAF5', surface: '#FFFFFF', text: '#1A2B1A', textMuted: '#5A6A5A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #CE1126 0%, #FCD116 35%, #006B3F 100%)',
    heroSubtle: 'linear-gradient(135deg, #FFEBEE 0%, #FFFDE7 35%, #E8F5E9 100%)',
    card: 'linear-gradient(145deg, #F1F8E9, #FFFFFF)',
    accent: 'linear-gradient(135deg, #FCD116, #FFE44D)',
    dark: 'linear-gradient(135deg, #003320, #001A10)',
  },
  particles: {
    colors: ['#FCD116', '#CE1126', '#006B3F', '#000000'],
    count: 25, speed: 0.8, size: 2.5, opacity: 0.5,
    shape: 'star', pattern: 'fireflies',
  },
  logo: { primary: '#006B3F', secondary: '#FCD116', accent: '#CE1126', glow: '#006B3F40' },
  pattern: { type: 'zigzag', opacity: 0.05, color: '#006B3F' },
  symbol: '⭐',
};

// ── SENEGAL 🇸🇳 ──────────────────────────────────────────────────────────────
// Green (hope/progress), Yellow (wealth), Red (life/sacrifice) — Red star
// Pattern: Sahel/Terre verte landscape-inspired warm earth tones
export const sn: RegionTheme = {
  id: 'SN', name: 'Sénégal', flag: '🇸🇳', region: 'africa_west',
  colors: {
    primary: '#00853F', primaryLight: '#00A86B', primaryDark: '#005C2B',
    secondary: '#FCD116', secondaryLight: '#FFE44D',
    accent: '#E31D1A', accentLight: '#FF1744',
    background: '#F8FAF5', surface: '#FFFFFF', text: '#1A2B1A', textMuted: '#5A7A6A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #00853F 0%, #FCD116 50%, #E31D1A 100%)',
    heroSubtle: 'linear-gradient(135deg, #E8F5E9 0%, #FFFDE7 50%, #FFEBEE 100%)',
    card: 'linear-gradient(145deg, #F1F8E9, #FFFFFF)',
    accent: 'linear-gradient(135deg, #FCD116, #FFE44D)',
    dark: 'linear-gradient(135deg, #003D20, #001E10)',
  },
  particles: {
    colors: ['#FCD116', '#00A86B', '#E31D1A', '#FFFFFF'],
    count: 22, speed: 0.7, size: 2.5, opacity: 0.5,
    shape: 'circle', pattern: 'sand',
  },
  logo: { primary: '#00853F', secondary: '#FCD116', accent: '#E31D1A', glow: '#00853F40' },
  pattern: { type: 'dots', opacity: 0.04, color: '#00853F' },
  symbol: '🌴',
};

// ── CÔTE D'IVOIRE 🇨🇮 ────────────────────────────────────────────────────────
// Orange (prosperity), White (peace), Green (hope)
// Pattern: Baoulé fabric-inspired patterns
export const ci: RegionTheme = {
  id: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮', region: 'africa_west',
  colors: {
    primary: '#F77F00', primaryLight: '#FFB74D', primaryDark: '#CC6600',
    secondary: '#FFFFFF', secondaryLight: '#F5F5F5',
    accent: '#009E60', accentLight: '#00C853',
    background: '#FFFAF5', surface: '#FFFFFF', text: '#2E2B1A', textMuted: '#7A7A5A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #F77F00 0%, #FFFFFF 50%, #009E60 100%)',
    heroSubtle: 'linear-gradient(135deg, #FFF3E0 0%, #FFFFFF 50%, #E8F5E9 100%)',
    card: 'linear-gradient(145deg, #FFF8E1, #FFFFFF)',
    accent: 'linear-gradient(135deg, #F77F00, #FFB74D)',
    dark: 'linear-gradient(135deg, #804000, #3D2000)',
  },
  particles: {
    colors: ['#F77F00', '#009E60', '#FFFFFF', '#FFB74D'],
    count: 20, speed: 0.6, size: 2, opacity: 0.4,
    shape: 'circle', pattern: 'fireflies',
  },
  logo: { primary: '#F77F00', secondary: '#009E60', accent: '#FFFFFF', glow: '#F77F0040' },
  pattern: { type: 'lines', opacity: 0.04, color: '#F77F00' },
  symbol: '🪙',
};

// ── MOROCCO 🇲🇦 ──────────────────────────────────────────────────────────────
// Red (hardiness/valor), Green (hope/joy), Star of David/pentacle
// Pattern: Zellige (Moroccan tile) inspired geometric patterns
export const ma: RegionTheme = {
  id: 'MA', name: 'Maroc', flag: '🇲🇦', region: 'africa_north',
  colors: {
    primary: '#C1272D', primaryLight: '#E53935', primaryDark: '#8E0000',
    secondary: '#006233', secondaryLight: '#00994D',
    accent: '#006233', accentLight: '#00A86B',
    background: '#FDF5F5', surface: '#FFFFFF', text: '#2E1A1A', textMuted: '#7A5A5A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #C1272D 0%, #006233 100%)',
    heroSubtle: 'linear-gradient(135deg, #FFEBEE 0%, #E8F5E9 100%)',
    card: 'linear-gradient(145deg, #FFF3F0, #FFFFFF)',
    accent: 'linear-gradient(135deg, #C1272D, #E53935)',
    dark: 'linear-gradient(135deg, #610000, #310000)',
  },
  particles: {
    colors: ['#C1272D', '#006233', '#FFB74D', '#FFFFFF'],
    count: 22, speed: 0.5, size: 2, opacity: 0.4,
    shape: 'diamond', pattern: 'sand',
  },
  logo: { primary: '#C1272D', secondary: '#006233', accent: '#FFB74D', glow: '#C1272D40' },
  pattern: { type: 'zigzag', opacity: 0.04, color: '#C1272D' },
  symbol: '✦',
};

// ── EGYPT 🇪🇬 ────────────────────────────────────────────────────────────────
// Red (revolution/sacrifice), White (bright future), Black (dark past), Gold (eagle)
// Pattern: Pharaonic/geometric hieroglyphic-inspired patterns
export const eg: RegionTheme = {
  id: 'EG', name: 'مصر (Egypt)', flag: '🇪🇬', region: 'africa_north',
  colors: {
    primary: '#C8102E', primaryLight: '#E53935', primaryDark: '#8E0000',
    secondary: '#FFFFFF', secondaryLight: '#F5F5F5',
    accent: '#C09300', accentLight: '#D4A843',
    background: '#FBF8F5', surface: '#FFFFFF', text: '#1A1A1A', textMuted: '#6B6B5A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #C8102E 0%, #FFFFFF 40%, #C09300 100%)',
    heroSubtle: 'linear-gradient(135deg, #FFEBEE 0%, #FFFFFF 40%, #FFF8E1 100%)',
    card: 'linear-gradient(145deg, #FFF8E1, #FFFFFF)',
    accent: 'linear-gradient(135deg, #C09300, #D4A843)',
    dark: 'linear-gradient(135deg, #4A0000, #1A0000)',
  },
  particles: {
    colors: ['#C09300', '#D4A843', '#F5E6B8', '#FFFFFF'],
    count: 25, speed: 0.4, size: 2, opacity: 0.5,
    shape: 'diamond', pattern: 'sand',
  },
  logo: { primary: '#C09300', secondary: '#C8102E', accent: '#FFFFFF', glow: '#C0930040' },
  pattern: { type: 'lines', opacity: 0.03, color: '#C09300' },
  symbol: '🏛️',
};

// ── CAMEROON 🇨🇲 ──────────────────────────────────────────────────────────────
// Green (southern forests), Red (sovereignty), Yellow (sun/stars)
// Pattern: Bamileke mask-inspired bold geometric patterns
export const cm: RegionTheme = {
  id: 'CM', name: 'Cameroun', flag: '🇨🇲', region: 'africa_central',
  colors: {
    primary: '#007A3D', primaryLight: '#00A86B', primaryDark: '#005528',
    secondary: '#FCD116', secondaryLight: '#FFE44D',
    accent: '#D6281F', accentLight: '#E53935',
    background: '#F5FAF5', surface: '#FFFFFF', text: '#1A2B1A', textMuted: '#5A6A5A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #007A3D 0%, #FCD116 40%, #D6281F 100%)',
    heroSubtle: 'linear-gradient(135deg, #E8F5E9 0%, #FFFDE7 40%, #FFEBEE 100%)',
    card: 'linear-gradient(145deg, #F1F8E9, #FFFFFF)',
    accent: 'linear-gradient(135deg, #FCD116, #FFE44D)',
    dark: 'linear-gradient(135deg, #003D20, #001E10)',
  },
  particles: {
    colors: ['#FCD116', '#00A86B', '#D6281F', '#FFFFFF'],
    count: 25, speed: 0.7, size: 2.5, opacity: 0.5,
    shape: 'circle', pattern: 'fireflies',
  },
  logo: { primary: '#007A3D', secondary: '#FCD116', accent: '#D6281F', glow: '#007A3D40' },
  pattern: { type: 'zigzag', opacity: 0.04, color: '#007A3D' },
  symbol: '🦁',
};

// ── DR CONGO 🇨🇩 ──────────────────────────────────────────────────────────────
// Blue (peace), Red (martyrs' blood), Yellow (prosperity), Green (hope)
// Pattern: Kuba cloth-inspired geometric patterns
export const cd: RegionTheme = {
  id: 'CD', name: 'RD Congo', flag: '🇨🇩', region: 'africa_central',
  colors: {
    primary: '#007FFF', primaryLight: '#29B6F6', primaryDark: '#004FB3',
    secondary: '#F7D618', secondaryLight: '#FFEA00',
    accent: '#CE1027', accentLight: '#E53935',
    background: '#F4F8FC', surface: '#FFFFFF', text: '#1A1A2E', textMuted: '#5A5A8A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #007FFF 0%, #CE1027 40%, #F7D618 100%)',
    heroSubtle: 'linear-gradient(135deg, #E3F2FD 0%, #FFEBEE 40%, #FFFDE7 100%)',
    card: 'linear-gradient(145deg, #E8EAF6, #FFFFFF)',
    accent: 'linear-gradient(135deg, #F7D618, #FFEA00)',
    dark: 'linear-gradient(135deg, #003D7A, #001E3D)',
  },
  particles: {
    colors: ['#29B6F6', '#F7D618', '#CE1027', '#FFFFFF'],
    count: 28, speed: 0.6, size: 2.5, opacity: 0.5,
    shape: 'circle', pattern: 'fireflies',
  },
  logo: { primary: '#007FFF', secondary: '#F7D618', accent: '#CE1027', glow: '#007FFF40' },
  pattern: { type: 'dots', opacity: 0.04, color: '#007FFF' },
  symbol: '🌍',
};

// Re-exports for remaining PALOP
export const st: RegionTheme = {
  id: 'ST', name: 'São Tomé e Príncipe', flag: '🇸🇹', region: 'africa_central',
  colors: {
    primary: '#009739', primaryLight: '#00C853', primaryDark: '#006B29',
    secondary: '#FFD100', secondaryLight: '#FFE44D',
    accent: '#D40000', accentLight: '#FF1744',
    background: '#F4FAF4', surface: '#FFFFFF', text: '#1A2E1A', textMuted: '#5A7A5A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #009739 0%, #FFD100 50%, #D40000 100%)',
    heroSubtle: 'linear-gradient(135deg, #E8F5E9 0%, #FFFDE7 50%, #FFEBEE 100%)',
    card: 'linear-gradient(145deg, #F1F8E9, #FFFFFF)',
    accent: 'linear-gradient(135deg, #FFD100, #FFE44D)',
    dark: 'linear-gradient(135deg, #004D25, #002A13)',
  },
  particles: {
    colors: ['#FFD100', '#00C853', '#D40000', '#FFFFFF'],
    count: 20, speed: 0.5, size: 2.5, opacity: 0.5,
    shape: 'circle', pattern: 'pollen',
  },
  logo: { primary: '#009739', secondary: '#FFD100', accent: '#D40000', glow: '#00973940' },
  pattern: { type: 'waves', opacity: 0.03, color: '#009739' },
  symbol: '🦜',
};

export const gw: RegionTheme = {
  id: 'GW', name: 'Guiné-Bissau', flag: '🇬🇼', region: 'africa_west',
  colors: {
    primary: '#006233', primaryLight: '#00994D', primaryDark: '#003D1F',
    secondary: '#FCD116', secondaryLight: '#FFE44D',
    accent: '#D40000', accentLight: '#FF1744',
    background: '#F5FAF5', surface: '#FFFFFF', text: '#1A2B1A', textMuted: '#5A6A5A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #006233 0%, #FCD116 50%, #D40000 100%)',
    heroSubtle: 'linear-gradient(135deg, #E8F5E9 0%, #FFFDE7 50%, #FFEBEE 100%)',
    card: 'linear-gradient(145deg, #F1F8E9, #FFFFFF)',
    accent: 'linear-gradient(135deg, #FCD116, #FFE44D)',
    dark: 'linear-gradient(135deg, #003118, #001A0C)',
  },
  particles: {
    colors: ['#FCD116', '#00994D', '#D40000', '#FFFFFF'],
    count: 20, speed: 0.5, size: 2, opacity: 0.4,
    shape: 'circle', pattern: 'fireflies',
  },
  logo: { primary: '#006233', secondary: '#FCD116', accent: '#D40000', glow: '#00623340' },
  pattern: { type: 'lines', opacity: 0.04, color: '#006233' },
  symbol: '🌴',
};
