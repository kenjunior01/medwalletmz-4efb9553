/**
 * MedWallet Theme Registry
 * Central registry mapping country codes to their visual themes
 */
import type { RegionTheme } from './types';
import { mz, br, ao, za, pt, ind, cv } from './africa-south';
import { ke, tz, ug, et, rw } from './africa-east';
import { ng, gh, sn, ci, ma, eg, cm, cd, st, gw } from './africa-west-north';

/** Complete theme registry — all 21 countries */
export const THEMES: Record<string, RegionTheme> = {
  MZ: mz,
  BR: br,
  AO: ao,
  ZA: za,
  PT: pt,
  IN: ind,
  CV: cv,
  ST: st,
  GW: gw,
  KE: ke,
  TZ: tz,
  UG: ug,
  ET: et,
  RW: rw,
  NG: ng,
  GH: gh,
  SN: sn,
  CI: ci,
  MA: ma,
  EG: eg,
  CM: cm,
  CD: cd,
};

/** Get theme by country code */
export function getTheme(countryCode: string): RegionTheme {
  return THEMES[countryCode] || THEMES['MZ']; // Fallback to Mozambique
}

/** Get all themes as array */
export function getAllThemes(): RegionTheme[] {
  return Object.values(THEMES);
}

/** Get themes by region */
export function getThemesByRegion(region: string): RegionTheme[] {
  return getAllThemes().filter(t => t.region === region);
}

/** Region metadata with cultural identity, symbols, and landmarks */
export interface RegionMetaInfo {
  label: string;
  flag: string;
  description: string;
  symbol: string;
  pattern: string;
  landmarks: string[];
  culturalElement: string;
}

export const REGION_META: Record<string, RegionMetaInfo> = {
  africa_south: {
    label: 'Africa Austral',
    flag: '🌍',
    description: 'Mocambique, Angola, South Africa, Portugal, Cabo Verde',
    symbol: '🦁',
    pattern: 'waves',
    landmarks: ['Maputo', 'Luanda', 'Cape Town', 'Lisboa'],
    culturalElement: 'Ubuntu - "Eu sou porque nos somos"',
  },
  africa_east: {
    label: 'Africa Oriental',
    flag: '🌿',
    description: 'Kenya, Tanzania, Ethiopia, Uganda, Rwanda',
    symbol: '🏞️',
    pattern: 'mountains',
    landmarks: ['Nairobi', 'Dar es Salaam', 'Addis Ababa', 'Kigali'],
    culturalElement: 'Great Rift Valley - Berco da humanidade',
  },
  africa_west: {
    label: 'Africa Ocidental',
    flag: '🏖️',
    description: 'Nigeria, Ghana, Senegal, Guine-Bissau, Costa Marfim',
    symbol: '🥁',
    pattern: 'geometric',
    landmarks: ['Lagos', 'Accra', 'Dakar', 'Bissau'],
    culturalElement: 'Ritmos etexteis Kente - Heranca cultural viva',
  },
  africa_north: {
    label: 'Africa do Norte',
    flag: '🏜️',
    description: 'Marrocos, Egipto',
    symbol: '🕌',
    pattern: 'sand-dunes',
    landmarks: ['Casablanca', 'Cairo'],
    culturalElement: 'Padroes geometricos islamicos e arte berbere',
  },
  africa_central: {
    label: 'Africa Central',
    flag: '🌳',
    description: 'Camaroun, RD Congo, Sao Tome e Principe',
    symbol: '🌍',
    pattern: 'forest',
    landmarks: ['Yaounde', 'Kinshasa', 'Sao Tome'],
    culturalElement: 'Bacia do Congo - Coracao verde de Africa',
  },
  latam: {
    label: 'America Latina',
    flag: '🌎',
    description: 'Brasil',
    symbol: '⚽',
    pattern: 'none',
    landmarks: ['Sao Paulo', 'Rio de Janeiro', 'Brasilia'],
    culturalElement: 'Carnaval, samba e cultura vibrante',
  },
  europe: {
    label: 'Europa',
    flag: '🏰',
    description: 'Portugal',
    symbol: '⚓',
    pattern: 'waves',
    landmarks: ['Lisboa', 'Porto', 'Faro'],
    culturalElement: 'Heranca maritima e Fado - Saudade universal',
  },
  asia: {
    label: 'Asia',
    flag: '🌏',
    description: 'India',
    symbol: '🕉️',
    pattern: 'mandala',
    landmarks: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai'],
    culturalElement: 'Ayurveda e tradicoes milenares de saude',
  },
};

export type { RegionTheme };
export { type RegionID } from './types';

// Province-level theming system (Mozambique)
export { ProvinceProvider, useProvince } from './ProvinceThemeProvider';
export { provinces, getProvinceTheme, getProvinceThemeOrDefault, PROVINCE_STORAGE_KEY, type ProvinceTheme } from './provinces';
