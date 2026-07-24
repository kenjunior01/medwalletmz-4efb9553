/**
 * MedWallet Regional Themes — East Africa
 * Inspired by Great Rift Valley, savannas, highlands, and national flags
 */
import type { RegionTheme } from './types';

// ── KENYA 🇰🇪 ────────────────────────────────────────────────────────────────
// Black (people), Red (struggle), Green (land), White (peace) — Maasai shield
// Pattern: Maasai beadwork-inspired geometric patterns
export const ke: RegionTheme = {
  id: 'KE', name: 'Kenya', flag: '🇰🇪', region: 'africa_east',
  colors: {
    primary: '#BB0000', primaryLight: '#E53935', primaryDark: '#8E0000',
    secondary: '#006600', secondaryLight: '#009933',
    accent: '#FFFFFF', accentLight: '#F5F5F5',
    background: '#FDF5F5', surface: '#FFFFFF', text: '#1A1A1A', textMuted: '#6B5A5A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #1A1A1A 0%, #BB0000 35%, #006600 70%, #FFFFFF 100%)',
    heroSubtle: 'linear-gradient(135deg, #F5F5F5 0%, #FFEBEE 35%, #E8F5E9 70%, #FFFFFF 100%)',
    card: 'linear-gradient(145deg, #FFF3F3, #FFFFFF)',
    accent: 'linear-gradient(135deg, #BB0000, #006600)',
    dark: 'linear-gradient(135deg, #1A1A1A, #0D0D0D)',
  },
  particles: {
    colors: ['#BB0000', '#006600', '#FFFFFF', '#F5F5F5'],
    count: 20, speed: 0.7, size: 2.5, opacity: 0.5,
    shape: 'circle', pattern: 'fireflies',
  },
  logo: { primary: '#006600', secondary: '#BB0000', accent: '#FFFFFF', glow: '#00660040' },
  pattern: { type: 'dots', opacity: 0.05, color: '#BB0000' },
  symbol: '🛡️',
};

// ── TANZANIA 🇹🇿 ───────────────────────────────────────────────────────────────
// Green (land/fertility), Blue (water/Indian Ocean), Yellow (mineral wealth), Black (people)
// Pattern: Tingatinga art-inspired bold shapes
export const tz: RegionTheme = {
  id: 'TZ', name: 'Tanzania', flag: '🇹🇿', region: 'africa_east',
  colors: {
    primary: '#00A651', primaryLight: '#00C853', primaryDark: '#007338',
    secondary: '#009739', secondaryLight: '#00C853',
    accent: '#1A3C8F', accentLight: '#3D5AFE',
    background: '#F4FAF4', surface: '#FFFFFF', text: '#1A2E1A', textMuted: '#5A7A6A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #00A651 0%, #1A3C8F 50%, #FFD700 100%)',
    heroSubtle: 'linear-gradient(135deg, #E8F5E9 0%, #E3F2FD 50%, #FFFDE7 100%)',
    card: 'linear-gradient(145deg, #E8F5E9, #FFFFFF)',
    accent: 'linear-gradient(135deg, #1A3C8F, #3D5AFE)',
    dark: 'linear-gradient(135deg, #003D28, #001A14)',
  },
  particles: {
    colors: ['#00C853', '#1A3C8F', '#FFD700', '#FFFFFF'],
    count: 28, speed: 0.6, size: 2.5, opacity: 0.5,
    shape: 'circle', pattern: 'fireflies',
  },
  logo: { primary: '#00A651', secondary: '#1A3C8F', accent: '#FFD700', glow: '#00A65140' },
  pattern: { type: 'waves', opacity: 0.03, color: '#00A651' },
  symbol: '⛰️',
};

// ── UGANDA 🇺🇬 ───────────────────────────────────────────────────────────────
// Black (people), Yellow (sun/radiance), Red (brotherhood) — Grey crowned crane
// Pattern: Bark cloth-inspired textured patterns
export const ug: RegionTheme = {
  id: 'UG', name: 'Uganda', flag: '🇺🇬', region: 'africa_east',
  colors: {
    primary: '#000000', primaryLight: '#424242', primaryDark: '#000000',
    secondary: '#FFD100', secondaryLight: '#FFEA00',
    accent: '#D40000', accentLight: '#FF1744',
    background: '#FAFAF5', surface: '#FFFFFF', text: '#1A1A1A', textMuted: '#6B6B5A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #1A1A1A 0%, #FFD100 50%, #D40000 100%)',
    heroSubtle: 'linear-gradient(135deg, #F5F5F5 0%, #FFFDE7 50%, #FFEBEE 100%)',
    card: 'linear-gradient(145deg, #F5F5F0, #FFFFFF)',
    accent: 'linear-gradient(135deg, #FFD100, #FFEA00)',
    dark: 'linear-gradient(135deg, #0D0D0D, #000000)',
  },
  particles: {
    colors: ['#FFD100', '#D40000', '#FFFFFF', '#424242'],
    count: 22, speed: 0.8, size: 3, opacity: 0.5,
    shape: 'circle', pattern: 'fireflies',
  },
  logo: { primary: '#000000', secondary: '#FFD100', accent: '#D40000', glow: '#FFD10040' },
  pattern: { type: 'crosshatch', opacity: 0.04, color: '#000000' },
  symbol: '🦢',
};

// ── ETHIOPIA 🇪🇹 ─────────────────────────────────────────────────────────────
// Green (land/fertility), Yellow (peace), Red (power) — Blue pentagram/star
// Pattern: Ethiopian cross-inspired geometric patterns
export const et: RegionTheme = {
  id: 'ET', name: 'Ethiopia', flag: '🇪🇹', region: 'africa_east',
  colors: {
    primary: '#078930', primaryLight: '#00A86B', primaryDark: '#005C20',
    secondary: '#FCDD09', secondaryLight: '#FFF176',
    accent: '#DA121A', accentLight: '#FF1744',
    background: '#F8FAF5', surface: '#FFFFFF', text: '#1A2B1A', textMuted: '#5A6A5A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #078930 0%, #FCDD09 45%, #DA121A 100%)',
    heroSubtle: 'linear-gradient(135deg, #E8F5E9 0%, #FFFDE7 45%, #FFEBEE 100%)',
    card: 'linear-gradient(145deg, #F1F8E9, #FFFFFF)',
    accent: 'linear-gradient(135deg, #FCDD09, #FFF176)',
    dark: 'linear-gradient(135deg, #003D18, #001E0C)',
  },
  particles: {
    colors: ['#FCDD09', '#078930', '#DA121A', '#1565C0'],
    count: 30, speed: 0.7, size: 2.5, opacity: 0.5,
    shape: 'star', pattern: 'fireflies',
  },
  logo: { primary: '#078930', secondary: '#FCDD09', accent: '#DA121A', glow: '#07893040' },
  pattern: { type: 'crosshatch', opacity: 0.04, color: '#078930' },
  symbol: '✦',
};

// ── RWANDA 🇷🇼 ────────────────────────────────────────────────────────────────
// Blue (happiness/peace), Yellow (economic development), Green (hope/prosperity)
// Pattern: Imigongo (cow dung art) inspired spiral motifs
export const rw: RegionTheme = {
  id: 'RW', name: 'Rwanda', flag: '🇷🇼', region: 'africa_east',
  colors: {
    primary: '#00A651', primaryLight: '#00C853', primaryDark: '#007338',
    secondary: '#0072C6', secondaryLight: '#29B6F6',
    accent: '#FCD116', accentLight: '#FFE44D',
    background: '#F4F8FA', surface: '#FFFFFF', text: '#1A2E2E', textMuted: '#5A7A7A',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #0072C6 0%, #FCD116 50%, #00A651 100%)',
    heroSubtle: 'linear-gradient(135deg, #E3F2FD 0%, #FFFDE7 50%, #E8F5E9 100%)',
    card: 'linear-gradient(145deg, #E3F2FD, #FFFFFF)',
    accent: 'linear-gradient(135deg, #FCD116, #FFE44D)',
    dark: 'linear-gradient(135deg, #003D72, #001E3D)',
  },
  particles: {
    colors: ['#29B6F6', '#00C853', '#FCD116', '#FFFFFF'],
    count: 25, speed: 0.6, size: 2, opacity: 0.5,
    shape: 'circle', pattern: 'fireflies',
  },
  logo: { primary: '#0072C6', secondary: '#FCD116', accent: '#00A651', glow: '#0072C640' },
  pattern: { type: 'dots', opacity: 0.04, color: '#0072C6' },
  symbol: '🌱',
};
