export interface SimulatedTrip {
  id: string;
  storeName: string;
  storeAddress: string;
  deliveryAddress: string;
  distance: number;
  estimatedTime: number;
  earnings: number;
}

export interface TodayStats {
  deliveries: number;
  earnings: number;
  onlineMinutes: number;
  rating: number;
}

/* ------------------------------------------------------------------ */
/*  Rider Compensation Model — Better than Yango                       */
/* ------------------------------------------------------------------ */
/* MedWallet riders keep MORE than Yango drivers:                       */
/*  • Yango: ~80% of fare (20% platform commission)                     */
/*  • MedWallet: 85% base + bonuses + weekly guarantees               */
/*  • MIN_WALLET_BALANCE is lower than Yango (50 vs 100 MZN)          */
/* ------------------------------------------------------------------ */

export const MIN_WALLET_BALANCE = 50;
export const COUNTDOWN_SECONDS = 15;
export const BONUS_PER_DELIVERY = 20;       // +20 MZN/delivery (vs Yango's ~0-10 MZN bonus)
export const WEEKLY_GUARANTEE = 3000;       // 3.000 MZN minimum/week if 20+ deliveries
export const REFERRAL_BONUS = 300;          // 300 MZN per referral (vs Yango's ~100-200)
export const PLATFORM_COMMISSION_RATE = 0.2;  // 20% platform fee (standardized across codebase)
export const DRIVER_EARNINGS_RATE = 0.8;    // 80% of delivery fee goes to driver (standardized across codebase)
export const PEAK_HOUR_MULTIPLIER = 1.3;    // +30% during peak hours (6-9h, 11-14h, 17-20h)
export const LONG_DISTANCE_BONUS = 25;      // +25 MZN for deliveries > 5km
export const STREAK_BONUS = [50, 80, 120, 150, 200]; // Bonus for 5/10/15/20/25 deliveries/day
export const WEEKLY_TARGET_BONUS = 500;     // +500 MZN if 30+ deliveries in a week

export const SIMULATED_TRIPS: SimulatedTrip[] = [
  {
    id: 'sim-001',
    storeName: 'Farmácia Central Maputo',
    storeAddress: 'Av. 24 de Julho, 123, Maputo',
    deliveryAddress: 'Bairro do Jardim, Rua 42, Maputo',
    distance: 3.2,
    estimatedTime: 12,
    earnings: 102,
  },
  {
    id: 'sim-002',
    storeName: 'LabeMoç - Laboratório',
    storeAddress: 'Av. Eduardo Mondlane, 567, Matola',
    deliveryAddress: 'Costa do Sol, Av. da Marginal, Maputo',
    distance: 5.8,
    estimatedTime: 18,
    earnings: 168,
  },
  {
    id: 'sim-003',
    storeName: 'MedStore - Fármacos e Suplementos',
    storeAddress: 'Rua da Resistência, 89, Maputo',
    deliveryAddress: 'Mavalane, Bairro C, Maputo',
    distance: 4.1,
    estimatedTime: 15,
    earnings: 132,
  },
  {
    id: 'sim-004',
    storeName: 'Clinica Saude+ Maputo',
    storeAddress: 'Av. Julius Nyerere, 210, Maputo',
    deliveryAddress: 'Alto Maé, Rua 17, Maputo',
    distance: 2.5,
    estimatedTime: 10,
    earnings: 90,
  },
  {
    id: 'sim-005',
    storeName: 'Droga Lda - Produtos Médicos',
    storeAddress: 'Rua Consiglieri Pedroso, 45, Maputo',
    deliveryAddress: 'Polana Caneco A, Av. Vladmir Lenin, Maputo',
    distance: 6.3,
    estimatedTime: 22,
    earnings: 198,
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function formatMZN(amount: number): string {
  return `${amount.toLocaleString('pt-MZ')} MZN`;
}

export function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
