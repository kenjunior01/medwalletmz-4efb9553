/**
 * MedWallet Regional Themes — Africa South & PALOP
 * Inspired by national flag colors, cultural textiles, and local landscapes
 */
import type { RegionTheme } from './types';

// ── MOZAMBIQUE 🇲🇿 ─────────────────────────────────────────────────────────
// Green (forest/land), Yellow (mineral wealth), Red (struggle/independence)
// Pattern: Capulana-inspired geometric stripes
export const mz: RegionTheme = {
  id: 'MZ', name: 'Moçambique', flag: '🇲🇿', region: 'africa_south',
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
    count: 30, speed: 0.8, size: 3, opacity: 0.6,
    shape: 'circle', pattern: 'fireflies',
  },
  logo: { primary: '#009739', secondary: '#FFD100', accent: '#D40000', glow: '#00973940' },
  pattern: { type: 'stripes', opacity: 0.04, color: '#009739' },
  symbol: '🌿',
};

// ── BRAZIL 🇧🇷 ────────────────────────────────────────────────────────────────
// Green (forest), Yellow (mineral), Blue (sky/celestial globe)
// Pattern: Tropical/organic flowing shapes
export const br: RegionTheme = {
  id: 'BR', name: 'Brasil', flag: '🇧🇷', region: 'latam',
  colors: {
    primary: '#009C3B', primaryLight: '#00C853', primaryDark: '#006B28',
    secondary: '#FFDF00', secondaryLight: '#FFEB3B',
    accent: '#002776', accentLight: '#1565C0',
    background: '#F5FAF5', surface: '#FFFFFF', text: '#1A2B1A', textMuted: '#4A6B5A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #009C3B 0%, #FFDF00 45%, #002776 100%)',
    heroSubtle: 'linear-gradient(135deg, #E8F5E9 0%, #FFFDE7 50%, #E3F2FD 100%)',
    card: 'linear-gradient(145deg, #E8F5E9, #FFFFFF)',
    accent: 'linear-gradient(135deg, #FFDF00, #FFEB3B)',
    dark: 'linear-gradient(135deg, #001B52, #000C2E)',
  },
  particles: {
    colors: ['#FFDF00', '#00C853', '#42A5F5', '#FFFFFF'],
    count: 35, speed: 1.0, size: 2.5, opacity: 0.5,
    shape: 'circle', pattern: 'pollen',
  },
  logo: { primary: '#009C3B', secondary: '#FFDF00', accent: '#002776', glow: '#009C3B40' },
  pattern: { type: 'waves', opacity: 0.03, color: '#009C3B' },
  symbol: '🌺',
};

// ── ANGOLA 🇦🇴 ────────────────────────────────────────────────────────────────
// Red (struggle/independence), Black (Africa/continent), Yellow (wealth/star)
// Pattern: Kente-inspired geometric motifs
export const ao: RegionTheme = {
  id: 'AO', name: 'Angola', flag: '🇦🇴', region: 'africa_south',
  colors: {
    primary: '#C62828', primaryLight: '#EF5350', primaryDark: '#8E0000',
    secondary: '#FFD600', secondaryLight: '#FFEA00',
    accent: '#212121', accentLight: '#484848',
    background: '#FDF5F5', surface: '#FFFFFF', text: '#1A1A1A', textMuted: '#6B5A5A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #C62828 0%, #212121 50%, #FFD600 100%)',
    heroSubtle: 'linear-gradient(135deg, #FFEBEE 0%, #F5F5F5 50%, #FFFDE7 100%)',
    card: 'linear-gradient(145deg, #FFEBEE, #FFFFFF)',
    accent: 'linear-gradient(135deg, #FFD600, #FFEA00)',
    dark: 'linear-gradient(135deg, #4A0000, #1A0000)',
  },
  particles: {
    colors: ['#FFD600', '#FF8F00', '#C62828', '#212121'],
    count: 25, speed: 0.6, size: 3, opacity: 0.5,
    shape: 'diamond', pattern: 'fireflies',
  },
  logo: { primary: '#C62828', secondary: '#FFD600', accent: '#212121', glow: '#C6282840' },
  pattern: { type: 'zigzag', opacity: 0.04, color: '#C62828' },
  symbol: '⚔️',
};

// ── SOUTH AFRICA 🇿🇦 ─────────────────────────────────────────────────────────
// Rainbow Nation: Red, Blue, Green, Yellow, Black, White (Y-shape unity)
// Pattern: Ndebele-inspired colorful geometric borders
export const za: RegionTheme = {
  id: 'ZA', name: 'South Africa', flag: '🇿🇦', region: 'africa_south',
  colors: {
    primary: '#007749', primaryLight: '#00A86B', primaryDark: '#005532',
    secondary: '#FFB81C', secondaryLight: '#FFD54F',
    accent: '#002395', accentLight: '#1565C0',
    background: '#F5F8F5', surface: '#FFFFFF', text: '#1A1A2E', textMuted: '#5A5A7A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #007749 0%, #FFB81C 30%, #002395 60%, #DE3831 100%)',
    heroSubtle: 'linear-gradient(135deg, #E8F5E9 0%, #FFF8E1 30%, #E3F2FD 70%, #FFEBEE 100%)',
    card: 'linear-gradient(145deg, #F0F7F0, #FFFFFF)',
    accent: 'linear-gradient(135deg, #FFB81C, #DE3831)',
    dark: 'linear-gradient(135deg, #001B33, #000C1A)',
  },
  particles: {
    colors: ['#DE3831', '#FFB81C', '#007749', '#002395', '#FFFFFF', '#212121'],
    count: 40, speed: 1.2, size: 2, opacity: 0.4,
    shape: 'mixed', pattern: 'rainbow',
  },
  logo: { primary: '#007749', secondary: '#FFB81C', accent: '#DE3831', glow: '#00774940' },
  pattern: { type: 'crosshatch', opacity: 0.03, color: '#007749' },
  symbol: '🌈',
};

// ── PORTUGAL 🇵🇹 ─────────────────────────────────────────────────────────────
// Green (hope), Red (blood/courage), Yellow (armillary sphere), Blue (celestial)
// Pattern: Azulejo-inspired tile patterns
export const pt: RegionTheme = {
  id: 'PT', name: 'Portugal', flag: '🇵🇹', region: 'europe',
  colors: {
    primary: '#006600', primaryLight: '#009933', primaryDark: '#003D00',
    secondary: '#FF0000', secondaryLight: '#FF4444',
    accent: '#FFCC00', accentLight: '#FFE066',
    background: '#F8FAF5', surface: '#FFFFFF', text: '#1A2E1A', textMuted: '#5A6A5A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #006600 0%, #FF0000 60%, #FFCC00 100%)',
    heroSubtle: 'linear-gradient(135deg, #E8F5E9 0%, #FFEBEE 60%, #FFFDE7 100%)',
    card: 'linear-gradient(145deg, #F1F8E9, #FFFFFF)',
    accent: 'linear-gradient(135deg, #FFCC00, #FFE066)',
    dark: 'linear-gradient(135deg, #003300, #001A00)',
  },
  particles: {
    colors: ['#009933', '#FF0000', '#FFCC00', '#FFFFFF'],
    count: 20, speed: 0.5, size: 2, opacity: 0.4,
    shape: 'diamond', pattern: 'fireflies',
  },
  logo: { primary: '#006600', secondary: '#FF0000', accent: '#FFCC00', glow: '#00660040' },
  pattern: { type: 'dots', opacity: 0.04, color: '#006600' },
  symbol: '🏰',
};

// ── INDIA 🇮🇳 ────────────────────────────────────────────────────────────────
// Saffron (courage/sacrifice), White (peace/truth), Green (faith/prosperity), Navy (chakra)
// Pattern: Mandala-inspired circular geometry
export const ind: RegionTheme = {
  id: 'IN', name: 'India', flag: '🇮🇳', region: 'asia',
  colors: {
    primary: '#FF9933', primaryLight: '#FFB74D', primaryDark: '#CC7A00',
    secondary: '#138808', secondaryLight: '#19A50D',
    accent: '#000080', accentLight: '#1565C0',
    background: '#FFFCF5', surface: '#FFFFFF', text: '#2E2E1A', textMuted: '#7A7A5A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #FF9933 0%, #FFFFFF 45%, #138808 100%)',
    heroSubtle: 'linear-gradient(135deg, #FFF3E0 0%, #FFFFFF 45%, #E8F5E9 100%)',
    card: 'linear-gradient(145deg, #FFF8E1, #FFFFFF)',
    accent: 'linear-gradient(135deg, #000080, #1565C0)',
    dark: 'linear-gradient(135deg, #804D00, #3D2500)',
  },
  particles: {
    colors: ['#FF9933', '#138808', '#000080', '#FFFFFF'],
    count: 25, speed: 0.7, size: 2, opacity: 0.5,
    shape: 'star', pattern: 'fireflies',
  },
  logo: { primary: '#FF9933', secondary: '#138808', accent: '#000080', glow: '#FF993340' },
  pattern: { type: 'dots', opacity: 0.03, color: '#FF9933' },
  symbol: '☸️',
};

// ── CABO VERDE 🇨🇻 ────────────────────────────────────────────────────────────
// Blue (ocean/sky), White (peace), Red (effort), Yellow (stars/hope)
// Pattern: Atlantic waves / nautical themes
export const cv: RegionTheme = {
  id: 'CV', name: 'Cabo Verde', flag: '🇨🇻', region: 'africa_west',
  colors: {
    primary: '#003893', primaryLight: '#1565C0', primaryDark: '#001B4D',
    secondary: '#FEDF00', secondaryLight: '#FFEA00',
    accent: '#CF142B', accentLight: '#E53935',
    background: '#F4F6FC', surface: '#FFFFFF', text: '#1A1A2E', textMuted: '#5A5A8A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #003893 0%, #FEDF00 60%, #CF142B 100%)',
    heroSubtle: 'linear-gradient(135deg, #E3F2FD 0%, #FFFDE7 60%, #FFEBEE 100%)',
    card: 'linear-gradient(145deg, #E8EAF6, #FFFFFF)',
    accent: 'linear-gradient(135deg, #FEDF00, #FFEA00)',
    dark: 'linear-gradient(135deg, #001B4D, #000D29)',
  },
  particles: {
    colors: ['#42A5F5', '#FEDF00', '#CF142B', '#FFFFFF'],
    count: 20, speed: 0.4, size: 2.5, opacity: 0.5,
    shape: 'circle', pattern: 'sand',
  },
  logo: { primary: '#003893', secondary: '#FEDF00', accent: '#CF142B', glow: '#00389340' },
  pattern: { type: 'waves', opacity: 0.04, color: '#003893' },
  symbol: '🌊',
};
