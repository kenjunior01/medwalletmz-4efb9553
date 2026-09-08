import { logger } from '@/lib/logger';

// ─── Types ─────────────────────────────────────────────────────────

export type TripStep = 1 | 2 | 3 | 4;

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  price: number;
}

export interface SimulatedTrip {
  id: string;
  orderNumber: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  estimatedDistance: string;
  estimatedTime: string;
  items: OrderItem[];
  orderTotal: number;
  deliveryFee: number;
  driverEarnings: number;
  paymentMethod: string;
}

// ─── Helpers ───────────────────────────────────────────────────────

export function formatMZN(value: number): string {
  return `${value.toLocaleString('pt-MZ')} MZN`;
}

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Step labels for progress bar ──────────────────────────────────

export const STEP_LABELS = ['Loja', 'Levantamento', 'Entrega'] as const;
