/**
 * MedWallet Province-Level Theme System — Mozambique
 * Each of Mozambique's 11 provinces gets a unique visual identity
 * inspired by local landscapes, cultural heritage, and regional aesthetics.
 */
export interface ProvinceTheme {
  id: string;
  name: string;
  nameEn: string;
  capital: string;

  /** Core color palette inspired by provincial identity */
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    secondaryLight: string;
    accent: string;
    background: string;
    surface: string;
  };

  /** Gradient presets for hero sections and cards */
  gradients: {
    hero: string;
    card: string;
    accent: string;
    dark: string;
  };

  /** Ambient particle effects configuration */
  particles: {
    colors: string[];
    count: number;
    speed: number;
    pattern: 'fireflies' | 'pollen' | 'sand' | 'snow' | 'confetti' | 'rainbow' | 'ocean' | 'leaves' | 'mist' | 'stars';
    shape: 'circle' | 'star' | 'diamond' | 'mixed';
  };

  /** Cultural pattern type */
  pattern: 'capulana' | 'waves' | 'zigzag' | 'dots' | 'lines' | 'crosshatch' | 'scales' | 'stripes';

  /** Cultural symbol shown on cards/splash */
  culturalSymbol: string;

  /** Province description */
  description: string; // pt
  descriptionEn: string; // en
}

// ── MAPUTO CIDADE 🏙️ ─────────────────────────────────────────────────────
// Urban capital, modern skyline, glass/steel, teal/navy sophistication
export const maputoCidade: ProvinceTheme = {
  id: 'maputo-cidade',
  name: 'Maputo Cidade',
  nameEn: 'Maputo City',
  capital: 'Maputo',
  colors: {
    primary: '#00838F',
    primaryLight: '#4FB3BF',
    primaryDark: '#005662',
    secondary: '#1A237E',
    secondaryLight: '#534BAE',
    accent: '#FF6D00',
    background: '#F0F7FA',
    surface: '#FFFFFF',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #00838F 0%, #1A237E 50%, #FF6D00 100%)',
    card: 'linear-gradient(145deg, #E0F2F1, #FFFFFF)',
    accent: 'linear-gradient(135deg, #FF6D00, #FF9E40)',
    dark: 'linear-gradient(135deg, #004D56, #0D1347)',
  },
  particles: {
    colors: ['#00838F', '#1A237E', '#FF6D00', '#FFFFFF', '#4FB3BF'],
    count: 35,
    speed: 1.0,
    pattern: 'stars',
    shape: 'circle',
  },
  pattern: 'lines',
  culturalSymbol: '🏙️',
  description: 'Capital moderna com arranha-céus de vidro, baía deslumbrante e vida cultural vibrante.',
  descriptionEn: 'Modern capital with glass skyscrapers, stunning bayfront, and vibrant cultural life.',
};

// ── MAPUTO PROVÍNCIA 🏖️ ──────────────────────────────────────────────────
// Coastal beaches, turquoise waters, sandy shores, relaxed seaside lifestyle
export const maputoProvincia: ProvinceTheme = {
  id: 'maputo-provincia',
  name: 'Maputo Província',
  nameEn: 'Maputo Province',
  capital: 'Matola',
  colors: {
    primary: '#0097A7',
    primaryLight: '#4DB6AC',
    primaryDark: '#006978',
    secondary: '#F9A825',
    secondaryLight: '#FDD835',
    accent: '#00BFA5',
    background: '#F0FAFA',
    surface: '#FFFFFF',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #0097A7 0%, #00BFA5 50%, #F9A825 100%)',
    card: 'linear-gradient(145deg, #E0F7FA, #FFFFFF)',
    accent: 'linear-gradient(135deg, #00BFA5, #64FFDA)',
    dark: 'linear-gradient(135deg, #005662, #00363D)',
  },
  particles: {
    colors: ['#0097A7', '#00BFA5', '#4DB6AC', '#F9A825', '#FFFFFF'],
    count: 25,
    speed: 0.6,
    pattern: 'ocean',
    shape: 'circle',
  },
  pattern: 'waves',
  culturalSymbol: '🏖️',
  description: 'Costa paradisíaca com praias de areia branca, águas cristalinas e resorts tropicais.',
  descriptionEn: 'Paradise coastline with white sand beaches, crystal-clear waters, and tropical resorts.',
};

// ── GAZA 🦁 ──────────────────────────────────────────────────────────────
// Savanna wilderness, Limpopo river, wildlife reserves, golden grasslands
export const gaza: ProvinceTheme = {
  id: 'gaza',
  name: 'Gaza',
  nameEn: 'Gaza',
  capital: 'Xai-Xai',
  colors: {
    primary: '#E65100',
    primaryLight: '#FF9E40',
    primaryDark: '#AC1900',
    secondary: '#795548',
    secondaryLight: '#A1887F',
    accent: '#FFD54F',
    background: '#FFF8E1',
    surface: '#FFFFFF',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #E65100 0%, #FFD54F 50%, #795548 100%)',
    card: 'linear-gradient(145deg, #FFF8E1, #FFFFFF)',
    accent: 'linear-gradient(135deg, #FFD54F, #FFE082)',
    dark: 'linear-gradient(135deg, #4E342E, #3E2723)',
  },
  particles: {
    colors: ['#FFD54F', '#E65100', '#FF9E40', '#795548', '#FFFFFF'],
    count: 20,
    speed: 0.5,
    pattern: 'fireflies',
    shape: 'circle',
  },
  pattern: 'zigzag',
  culturalSymbol: '🦁',
  description: 'Savana dourada com reservas de vida selvagem, rio Limpopo e pôr do sol espetacular.',
  descriptionEn: 'Golden savanna with wildlife reserves, Limpopo river, and spectacular sunsets.',
};

// ── INHAMBANE 🥥 ──────────────────────────────────────────────────────────
// Praias do Tofo, coconut palms, coral reefs, turquoise/coral warm waters
export const inhambane: ProvinceTheme = {
  id: 'inhambane',
  name: 'Inhambane',
  nameEn: 'Inhambane',
  capital: 'Inhambane',
  colors: {
    primary: '#00ACC1',
    primaryLight: '#4DD0E1',
    primaryDark: '#00838F',
    secondary: '#FF7043',
    secondaryLight: '#FF8A65',
    accent: '#00E5FF',
    background: '#E8F5F9',
    surface: '#FFFFFF',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #00ACC1 0%, #00E5FF 40%, #FF7043 100%)',
    card: 'linear-gradient(145deg, #E0F7FA, #FFFFFF)',
    accent: 'linear-gradient(135deg, #00E5FF, #84FFFF)',
    dark: 'linear-gradient(135deg, #005662, #00363D)',
  },
  particles: {
    colors: ['#00ACC1', '#FF7043', '#00E5FF', '#FFD54F', '#FFFFFF'],
    count: 22,
    speed: 0.4,
    pattern: 'sand',
    shape: 'circle',
  },
  pattern: 'waves',
  culturalSymbol: '🥥',
  description: 'Praias do Tofo com recifes de coral, palmeiras de coco e mergulho com tubarões-baleia.',
  descriptionEn: 'Tofo beaches with coral reefs, coconut palms, and whale shark diving.',
};

// ── SOFALA 🏛️ ─────────────────────────────────────────────────────────────
// Historic port of Beira, terracotta architecture, colonial heritage, warm earth tones
export const sofala: ProvinceTheme = {
  id: 'sofala',
  name: 'Sofala',
  nameEn: 'Sofala',
  capital: 'Beira',
  colors: {
    primary: '#C62828',
    primaryLight: '#EF5350',
    primaryDark: '#8E0000',
    secondary: '#D84315',
    secondaryLight: '#FF7043',
    accent: '#FFAB91',
    background: '#FFF5F2',
    surface: '#FFFFFF',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #C62828 0%, #D84315 50%, #FFAB91 100%)',
    card: 'linear-gradient(145deg, #FBE9E7, #FFFFFF)',
    accent: 'linear-gradient(135deg, #FFAB91, #FFCCBC)',
    dark: 'linear-gradient(135deg, #4E0000, #3B0000)',
  },
  particles: {
    colors: ['#C62828', '#D84315', '#FFAB91', '#FFD54F', '#FFFFFF'],
    count: 18,
    speed: 0.5,
    pattern: 'fireflies',
    shape: 'diamond',
  },
  pattern: 'stripes',
  culturalSymbol: '🏛️',
  description: 'Cidade histórica do porto da Beira, herança colonial, arquitetura em terracota.',
  descriptionEn: 'Historic port city of Beira, colonial heritage, terracotta architecture.',
};

// ── MANICA ⛰️ ─────────────────────────────────────────────────────────────
// Chimanimani mountains, emerald highlands, misty peaks, cool climate
export const manica: ProvinceTheme = {
  id: 'manica',
  name: 'Manica',
  nameEn: 'Manica',
  capital: 'Chimoio',
  colors: {
    primary: '#2E7D32',
    primaryLight: '#60AD5E',
    primaryDark: '#005005',
    secondary: '#455A64',
    secondaryLight: '#718792',
    accent: '#A5D6A7',
    background: '#F1F8E9',
    surface: '#FFFFFF',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #2E7D32 0%, #455A64 50%, #A5D6A7 100%)',
    card: 'linear-gradient(145deg, #E8F5E9, #FFFFFF)',
    accent: 'linear-gradient(135deg, #A5D6A7, #C8E6C9)',
    dark: 'linear-gradient(135deg, #1B3A1D, #0D2610)',
  },
  particles: {
    colors: ['#2E7D32', '#A5D6A7', '#455A64', '#C8E6C9', '#FFFFFF'],
    count: 15,
    speed: 0.3,
    pattern: 'mist',
    shape: 'circle',
  },
  pattern: 'crosshatch',
  culturalSymbol: '⛰️',
  description: 'Montanhas Chimanimani com neblina, planaltos esmeraldinos e clima fresco.',
  descriptionEn: 'Chimanimani mountains with mist, emerald highlands, and cool climate.',
};

// ── TETE 🌊 ──────────────────────────────────────────────────────────────
// Zambezi river, coal mining heritage, amber/deep blue, bridge landscapes
export const tete: ProvinceTheme = {
  id: 'tete',
  name: 'Tete',
  nameEn: 'Tete',
  capital: 'Tete',
  colors: {
    primary: '#FF8F00',
    primaryLight: '#FFC046',
    primaryDark: '#C56000',
    secondary: '#0D47A1',
    secondaryLight: '#5393E5',
    accent: '#FFB74D',
    background: '#FFF8E1',
    surface: '#FFFFFF',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #FF8F00 0%, #0D47A1 50%, #FFB74D 100%)',
    card: 'linear-gradient(145deg, #FFF8E1, #FFFFFF)',
    accent: 'linear-gradient(135deg, #FFB74D, #FFE0B2)',
    dark: 'linear-gradient(135deg, #4E3600, #002952)',
  },
  particles: {
    colors: ['#FF8F00', '#0D47A1', '#FFB74D', '#4FC3F7', '#FFFFFF'],
    count: 20,
    speed: 0.5,
    pattern: 'leaves',
    shape: 'diamond',
  },
  pattern: 'scales',
  culturalSymbol: '🌊',
  description: 'Rio Zambezi majestoso, pontes suspensas, mineração de carvão e paisagens épicas.',
  descriptionEn: 'Majestic Zambezi river, suspension bridges, coal mining, and epic landscapes.',
};

// ── ZAMBÉZIA 🌴 ───────────────────────────────────────────────────────────
// Quelimane coconut forests, lime green landscapes, warm sandy culture
export const zambezia: ProvinceTheme = {
  id: 'zambezia',
  name: 'Zambézia',
  nameEn: 'Zambezia',
  capital: 'Quelimane',
  colors: {
    primary: '#7CB342',
    primaryLight: '#AEE571',
    primaryDark: '#4B830D',
    secondary: '#D4A056',
    secondaryLight: '#E8C88A',
    accent: '#8BC34A',
    background: '#F4F9F0',
    surface: '#FFFFFF',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #7CB342 0%, #D4A056 50%, #8BC34A 100%)',
    card: 'linear-gradient(145deg, #F1F8E9, #FFFFFF)',
    accent: 'linear-gradient(135deg, #8BC34A, #C5E1A5)',
    dark: 'linear-gradient(135deg, #33691E, #1B3A0D)',
  },
  particles: {
    colors: ['#7CB342', '#D4A056', '#8BC34A', '#AEE571', '#FFFFFF'],
    count: 22,
    speed: 0.6,
    pattern: 'leaves',
    shape: 'circle',
  },
  pattern: 'capulana',
  culturalSymbol: '🌴',
  description: 'Florestas de coqueiros de Quelimane, capulanas coloridas e cultura costeira rica.',
  descriptionEn: 'Quelimane coconut forests, colorful capulana textiles, and rich coastal culture.',
};

// ── NAMPUULA ⭐ ──────────────────────────────────────────────────────────
// Historic city, Nacala deep port, purple/gold, Swahili trade heritage
export const nampula: ProvinceTheme = {
  id: 'nampula',
  name: 'Nampula',
  nameEn: 'Nampula',
  capital: 'Nampula',
  colors: {
    primary: '#6A1B9A',
    primaryLight: '#9C4DCC',
    primaryDark: '#38006B',
    secondary: '#F9A825',
    secondaryLight: '#FDD835',
    accent: '#CE93D8',
    background: '#F9F0FC',
    surface: '#FFFFFF',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #6A1B9A 0%, #F9A825 50%, #CE93D8 100%)',
    card: 'linear-gradient(145deg, #F3E5F5, #FFFFFF)',
    accent: 'linear-gradient(135deg, #CE93D8, #E1BEE7)',
    dark: 'linear-gradient(135deg, #2A004D, #1A0033)',
  },
  particles: {
    colors: ['#6A1B9A', '#F9A825', '#CE93D8', '#FDD835', '#FFFFFF'],
    count: 28,
    speed: 0.7,
    pattern: 'stars',
    shape: 'star',
  },
  pattern: 'dots',
  culturalSymbol: '⭐',
  description: 'Cidade histórica com herança comercial swahili, porto de Nacala e arquitetura colonial.',
  descriptionEn: 'Historic city with Swahili trade heritage, Nacala deep-water port, and colonial architecture.',
};

// ── CABO DELGADO 💎 ──────────────────────────────────────────────────────
// Pemba beaches, ruby/turquoise, Muslim heritage, pristine islands
export const caboDelgado: ProvinceTheme = {
  id: 'cabo-delgado',
  name: 'Cabo Delgado',
  nameEn: 'Cabo Delgado',
  capital: 'Pemba',
  colors: {
    primary: '#C62828',
    primaryLight: '#F44336',
    primaryDark: '#8E0000',
    secondary: '#0097A7',
    secondaryLight: '#4DB6AC',
    accent: '#EF5350',
    background: '#FFF5F5',
    surface: '#FFFFFF',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #C62828 0%, #0097A7 50%, #EF5350 100%)',
    card: 'linear-gradient(145deg, #FCE4EC, #FFFFFF)',
    accent: 'linear-gradient(135deg, #EF5350, #FFCDD2)',
    dark: 'linear-gradient(135deg, #4E0000, #004D56)',
  },
  particles: {
    colors: ['#C62828', '#0097A7', '#EF5350', '#4DB6AC', '#FFFFFF'],
    count: 24,
    speed: 0.5,
    pattern: 'ocean',
    shape: 'mixed',
  },
  pattern: 'capulana',
  culturalSymbol: '💎',
  description: 'Praias de Pemba, ilhas do Quirimbas, herança muçulmana e rubis naturais.',
  descriptionEn: 'Pemba beaches, Quirimbas islands, Muslim heritage, and natural rubies.',
};

// ── NIASSA 🌲 ──────────────────────────────────────────────────────────────
// Lake Niassa/Malawi, Lichinga plateau, forest green/amber, untouched wilderness
export const niassa: ProvinceTheme = {
  id: 'niassa',
  name: 'Niassa',
  nameEn: 'Niassa',
  capital: 'Lichinga',
  colors: {
    primary: '#1B5E20',
    primaryLight: '#4CAF50',
    primaryDark: '#003300',
    secondary: '#FF8F00',
    secondaryLight: '#FFC046',
    accent: '#81C784',
    background: '#F0F7F0',
    surface: '#FFFFFF',
  },
  gradients: {
    hero: 'linear-gradient(135deg, #1B5E20 0%, #FF8F00 50%, #81C784 100%)',
    card: 'linear-gradient(145deg, #E8F5E9, #FFFFFF)',
    accent: 'linear-gradient(135deg, #81C784, #A5D6A7)',
    dark: 'linear-gradient(135deg, #0D3300, #4E3600)',
  },
  particles: {
    colors: ['#1B5E20', '#FF8F00', '#81C784', '#FFC046', '#FFFFFF'],
    count: 16,
    speed: 0.4,
    pattern: 'stars',
    shape: 'star',
  },
  pattern: 'zigzag',
  culturalSymbol: '🌲',
  description: 'Lago Niassa cristalino, planalto de Lichinga, selva intocada e vida selvagem rara.',
  descriptionEn: 'Crystal-clear Lake Niassa, Lichinga plateau, untouched wilderness, and rare wildlife.',
};

// ── Province Registry ──────────────────────────────────────────────────────

/** All 11 Mozambican provinces */
export const provinces: ProvinceTheme[] = [
  maputoCidade,
  maputoProvincia,
  gaza,
  inhambane,
  sofala,
  manica,
  tete,
  zambezia,
  nampula,
  caboDelgado,
  niassa,
];

/** Lookup map by province id */
const provinceMap = new Map(provinces.map(p => [p.id, p]));

/** Get province theme by id, falls back to undefined if not found */
export function getProvinceTheme(provinceId: string | null | undefined): ProvinceTheme | undefined {
  if (!provinceId) return undefined;
  return provinceMap.get(provinceId);
}

/** Get province theme by id with Maputo Cidade as default */
export function getProvinceThemeOrDefault(provinceId: string | null | undefined): ProvinceTheme {
  return provinceMap.get(provinceId ?? '') ?? maputoCidade;
}

/** LocalStorage key for persisted province selection */
export const PROVINCE_STORAGE_KEY = 'mz_selected_province';
