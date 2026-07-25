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

/** Region metadata with emoji flags */
export const REGION_META: Record<string, { label: string; flag: string; description: string }> = {
  africa_south: { label: 'África Austral', flag: '🌍', description: 'Moçambique, Angola, South Africa' },
  africa_east: { label: 'África Oriental', flag: '🌿', description: 'Kenya, Tanzania, Ethiopia, Rwanda' },
  africa_west: { label: 'África Ocidental', flag: '🏖️', description: 'Nigeria, Ghana, Senegal, Guiné-Bissau' },
  africa_north: { label: 'África do Norte', flag: '🏜️', description: 'Marrocos, Egypt' },
  africa_central: { label: 'África Central', flag: '🌳', description: 'Cameroun, RD Congo, São Tomé' },
  latam: { label: 'América Latina', flag: '🌎', description: 'Brasil' },
  europe: { label: 'Europa', flag: '🏰', description: 'Portugal' },
  asia: { label: 'Ásia', flag: '🌏', description: 'India' },
};

export type { RegionTheme };
export { type RegionID } from './types';

// Province-level theming system (Mozambique)
export { ProvinceProvider, useProvince } from './ProvinceThemeProvider';
export { provinces, getProvinceTheme, getProvinceThemeOrDefault, PROVINCE_STORAGE_KEY, type ProvinceTheme } from './provinces';
