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

// ─── Simulated trip data ────────────────────────────────────────────

export const MOCK_TRIP: SimulatedTrip = {
  id: 'trip-demo-001',
  orderNumber: '#MW-48721',
  storeName: 'Farmácia Central Maputo',
  storeAddress: 'Av. 24 de Julho, 1234, Maputo',
  storePhone: '+258 84 123 4567',
  customerName: 'Ana Machel',
  customerPhone: '+258 86 987 6543',
  customerAddress: 'Rua da Resistência, 56, Bairro do Jardim, Maputo',
  estimatedDistance: '3.2 km',
  estimatedTime: '12 min',
  items: [
    { id: 'i1', name: 'Paracetamol 500mg', quantity: 2, unit: 'cx', price: 85 },
    { id: 'i2', name: 'Amoxicilina 250mg', quantity: 1, unit: 'cx', price: 320 },
    { id: 'i3', name: 'Vitamina C 1000mg', quantity: 3, unit: 'un', price: 150 },
    { id: 'i4', name: 'Álcool 70%', quantity: 1, unit: 'fr', price: 120 },
  ],
  orderTotal: 675,
  deliveryFee: 75,
  driverEarnings: 52,
  paymentMethod: 'M-Pesa',
};

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
