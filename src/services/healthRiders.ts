/**
 * Health Riders Service
 * Yango-style job creation in health-tech niche.
 *
 * Riders deliver: medications from pharmacies, lab samples, medical equipment.
 * They earn per delivery. Platform takes a small cut.
 *
 * Tables: health_riders, health_deliveries, rider_earnings_daily
 */

import { supabase } from '@/integrations/supabase/client';

export type VehicleType = 'bicycle' | 'motorbike' | 'car' | 'foot';
export type RiderOnboardingStep = 'basics' | 'vehicle' | 'documents' | 'payment' | 'review' | 'completed';
export type DeliveryStatus = 'pending' | 'accepted' | 'arriving_pickup' | 'picked_up' | 'in_transit' | 'arriving_dropoff' | 'delivered' | 'cancelled' | 'failed';
export type PickupType = 'pharmacy' | 'lab' | 'clinic' | 'warehouse' | 'home';
export type PackageType = 'medication' | 'lab_sample' | 'equipment' | 'document' | 'other';

export interface HealthRider {
  id?: string;
  user_id?: string;
  country_code: string;
  full_name: string;
  phone: string;
  national_id?: string;
  vehicle_type: VehicleType;
  vehicle_plate?: string;
  vehicle_color?: string;
  license_url?: string;
  id_document_url?: string;
  vehicle_document_url?: string;
  is_verified?: boolean;
  is_online?: boolean;
  current_location?: { lat: number; lng: number; recorded_at?: string };
  rating?: number;
  total_deliveries?: number;
  total_earnings_mzn?: number;
  total_distance_km?: number;
  available_zones?: string[];
  languages?: string[];
  accepts_cold_chain?: boolean;
  max_delivery_distance_km?: number;
  mobile_money_number?: string;
  bank_account?: { bank?: string; account?: string; iban?: string };
  onboarding_step?: RiderOnboardingStep;
  onboarding_progress?: number;
  rejection_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HealthDelivery {
  id?: string;
  rider_id?: string;
  customer_user_id?: string;
  customer_name: string;
  customer_phone: string;
  country_code: string;
  pickup_type: PickupType;
  pickup_name: string;
  pickup_location: { lat: number; lng: number };
  pickup_address?: string;
  dropoff_name?: string;
  dropoff_location: { lat: number; lng: number };
  dropoff_address?: string;
  dropoff_phone?: string;
  package_type: PackageType;
  package_description?: string;
  requires_cold_chain?: boolean;
  requires_signature?: boolean;
  estimated_distance_km?: number;
  estimated_duration_min?: number;
  delivery_fee?: number;
  rider_earnings?: number;
  platform_fee?: number;
  currency?: string;
  status: DeliveryStatus;
  accepted_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  rating?: number;
  rating_comment?: string;
  created_at?: string;
}

export interface RiderEarningsDaily {
  date: string;
  total_deliveries: number;
  total_earnings: number;
  total_distance_km: number;
  total_time_online_min: number;
  avg_rating?: number;
}

export const VEHICLE_LABELS: Record<VehicleType, { label: string; emoji: string; min_fee: number }> = {
  bicycle: { label: 'Bicicleta', emoji: '🚲', min_fee: 50 },
  motorbike: { label: 'Mota', emoji: '🏍️', min_fee: 80 },
  car: { label: 'Carro', emoji: '🚗', min_fee: 150 },
  foot: { label: 'A pé', emoji: '🚶', min_fee: 30 },
};

export const PACKAGE_LABELS: Record<PackageType, { label: string; emoji: string; cold?: boolean }> = {
  medication: { label: 'Medicamentos', emoji: '💊', cold: true },
  lab_sample: { label: 'Sample de laboratório', emoji: '🧪', cold: true },
  equipment: { label: 'Equipamento médico', emoji: '🏥' },
  document: { label: 'Documentos', emoji: '📄' },
  other: { label: 'Outro', emoji: '📦' },
};

export const STATUS_LABELS: Record<DeliveryStatus, { label: string; color: string }> = {
  pending: { label: 'Disponível', color: '#F59E0B' },
  accepted: { label: 'Aceite', color: '#3B82F6' },
  arriving_pickup: { label: 'A caminho do pickup', color: '#3B82F6' },
  picked_up: { label: 'Recolhido', color: '#06B6D4' },
  in_transit: { label: 'Em trânsito', color: '#06B6D4' },
  arriving_dropoff: { label: 'A caminho do destino', color: '#8B5CF6' },
  delivered: { label: 'Entregue', color: '#10B981' },
  cancelled: { label: 'Cancelado', color: '#EF4444' },
  failed: { label: 'Falhou', color: '#EF4444' },
};

/* ---------- Rider CRUD ---------- */

export async function getMyRiderProfile(userId: string): Promise<HealthRider | null> {
  const { data, error } = await supabase
    .from('health_riders')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createRider(userId: string, rider: Omit<HealthRider, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<HealthRider> {
  const { data, error } = await supabase
    .from('health_riders')
    .insert({ ...rider, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateRider(riderId: string, patch: Partial<HealthRider>): Promise<HealthRider> {
  const { data, error } = await supabase
    .from('health_riders')
    .update(patch)
    .eq('id', riderId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateRiderProgress(riderId: string, step: RiderOnboardingStep, progress: number): Promise<void> {
  const { error } = await supabase
    .from('health_riders')
    .update({ onboarding_step: step, onboarding_progress: progress })
    .eq('id', riderId);
  if (error) throw new Error(error.message);
}

export async function toggleRiderOnline(riderId: string, online: boolean): Promise<void> {
  const { error } = await supabase
    .from('health_riders')
    .update({ is_online: online, last_online_at: new Date().toISOString() })
    .eq('id', riderId);
  if (error) throw new Error(error.message);
}

export async function updateRiderLocation(riderId: string, lat: number, lng: number): Promise<void> {
  const { error } = await supabase
    .from('health_riders')
    .update({
      current_location: { lat, lng, recorded_at: new Date().toISOString() },
    })
    .eq('id', riderId);
  if (error) throw new Error(error.message);
}

/* ---------- Document upload ---------- */

export async function uploadRiderDocument(userId: string, docType: 'license' | 'id' | 'vehicle', blob: Blob): Promise<string> {
  const ext = blob.type.split('/')[1] ?? 'jpg';
  const path = `${userId}/${docType}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('rider-documents')
    .upload(path, blob, { contentType: blob.type });
  if (error) throw new Error(error.message);
  return path;
}

/* ---------- Deliveries ---------- */

export async function getAvailableDeliveries(rider: HealthRider, limit = 10): Promise<HealthDelivery[]> {
  // Get pending deliveries in rider's country within max distance
  const { data, error } = await supabase
    .from('health_deliveries')
    .select('*')
    .eq('country_code', rider.country_code)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMyActiveDeliveries(riderId: string): Promise<HealthDelivery[]> {
  const { data, error } = await supabase
    .from('health_deliveries')
    .select('*')
    .eq('rider_id', riderId)
    .in('status', ['accepted', 'arriving_pickup', 'picked_up', 'in_transit', 'arriving_dropoff'])
    .order('accepted_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMyDeliveryHistory(riderId: string, limit = 30): Promise<HealthDelivery[]> {
  const { data, error } = await supabase
    .from('health_deliveries')
    .select('*')
    .eq('rider_id', riderId)
    .in('status', ['delivered', 'cancelled', 'failed'])
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function acceptDelivery(deliveryId: string, riderId: string): Promise<void> {
  const { error } = await supabase
    .from('health_deliveries')
    .update({
      rider_id: riderId,
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', deliveryId)
    .eq('status', 'pending'); // Optimistic lock
  if (error) throw new Error(error.message);
}

export async function updateDeliveryStatus(deliveryId: string, status: DeliveryStatus): Promise<void> {
  const patch: any = { status };
  if (status === 'picked_up') patch.picked_up_at = new Date().toISOString();
  if (status === 'delivered') patch.delivered_at = new Date().toISOString();
  if (status === 'cancelled') patch.cancelled_at = new Date().toISOString();

  const { error } = await supabase
    .from('health_deliveries')
    .update(patch)
    .eq('id', deliveryId);
  if (error) throw new Error(error.message);

  // If delivered, update rider stats using atomic SQL to prevent race conditions
  if (status === 'delivered') {
    const { data: delivery } = await supabase
      .from('health_deliveries')
      .select('rider_id, rider_earnings, estimated_distance_km')
      .eq('id', deliveryId)
      .maybeSingle();
    if (delivery?.rider_id) {
      // Use atomic increment via RPC to avoid read-modify-write race conditions
      const { error: rpcError } = await supabase.rpc('increment_rider_stats', {
        _rider_id: delivery.rider_id,
        _earnings: delivery.rider_earnings ?? 0,
        _distance: delivery.estimated_distance_km ?? 0,
      });
      // Fallback to direct update if RPC doesn't exist yet
      if (rpcError) {
        console.warn('increment_rider_stats RPC not found, using direct update (may have race condition)');
        const { data: rider } = await supabase
          .from('health_riders')
          .select('total_deliveries, total_earnings_mzn, total_distance_km')
          .eq('id', delivery.rider_id)
          .maybeSingle();
        if (rider) {
          await supabase.from('health_riders').update({
            total_deliveries: (rider.total_deliveries ?? 0) + 1,
            total_earnings_mzn: (rider.total_earnings_mzn ?? 0) + (delivery.rider_earnings ?? 0),
            total_distance_km: (rider.total_distance_km ?? 0) + (delivery.estimated_distance_km ?? 0),
          }).eq('id', delivery.rider_id);
        }
      }
    }
  }
}

export async function rateDelivery(deliveryId: string, rating: number, comment?: string): Promise<void> {
  const { error } = await supabase
    .from('health_deliveries')
    .update({ rating, rating_comment: comment, rated_at: new Date().toISOString() })
    .eq('id', deliveryId);
  if (error) throw new Error(error.message);
}

/* ---------- Earnings ---------- */

export async function getEarningsDaily(riderId: string, days = 30): Promise<RiderEarningsDaily[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('rider_earnings_daily')
    .select('*')
    .eq('rider_id', riderId)
    .gte('date', since.toISOString().split('T')[0])
    .order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Compute earnings summary (today, week, month, total) from deliveries. */
export async function getEarningsSummary(riderId: string): Promise<{
  today: number;
  week: number;
  month: number;
  total: number;
  today_count: number;
  week_count: number;
  month_count: number;
}> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now);
  monthStart.setMonth(monthStart.getMonth() - 1);

  const { data, error } = await supabase
    .from('health_deliveries')
    .select('rider_earnings, delivered_at')
    .eq('rider_id', riderId)
    .eq('status', 'delivered')
    .gte('delivered_at', monthStart.toISOString());
  if (error) throw new Error(error.message);

  let today = 0, week = 0, month = 0, todayCount = 0, weekCount = 0, monthCount = 0;
  for (const d of data ?? []) {
    const dt = new Date(d.delivered_at!);
    const earnings = d.rider_earnings ?? 0;
    if (dt >= todayStart) { today += earnings; todayCount++; }
    if (dt >= weekStart) { week += earnings; weekCount++; }
    if (dt >= monthStart) { month += earnings; monthCount++; }
  }

  return {
    today: Math.round(today),
    week: Math.round(week),
    month: Math.round(month),
    total: 0, // computed from rider profile
    today_count: todayCount,
    week_count: weekCount,
    month_count: monthCount,
  };
}

/* ---------- Pricing ---------- */

/**
 * Compute delivery fee based on distance + package type + vehicle.
 * 50% goes to rider, 50% to platform (configurable).
 */
export function computeDeliveryFee(distanceKm: number, packageType: PackageType, vehicleType: VehicleType): {
  fee: number;
  rider_earnings: number;
  platform_fee: number;
} {
  const baseFee = VEHICLE_LABELS[vehicleType].min_fee; // MZN
  const perKm = 15; // MZN per km
  const coldChainSurcharge = PACKAGE_LABELS[packageType].cold ? 30 : 0;
  const fee = baseFee + (distanceKm * perKm) + coldChainSurcharge;
  const riderShare = 0.8; // 80% to rider, 20% to platform (standardized across codebase)
  return {
    fee: Math.round(fee),
    rider_earnings: Math.round(fee * riderShare),
    platform_fee: Math.round(fee * (1 - riderShare)),
  };
}

/* ---------- Mock deliveries (for demo) ---------- */

export const MOCK_DELIVERIES: Omit<HealthDelivery, 'id' | 'rider_id'>[] = [
  {
    customer_name: 'Ana Macuácua',
    customer_phone: '+258 84 123 4567',
    country_code: 'MZ',
    pickup_type: 'pharmacy',
    pickup_name: 'Farmácia Moderna - Av. Julius Nyerere',
    pickup_location: { lat: -25.9689, lng: 32.5801 },
    pickup_address: 'Av. Julius Nyerere, Maputo',
    dropoff_name: 'Ana Macuácua (Casa)',
    dropoff_location: { lat: -25.9550, lng: 32.5900 },
    dropoff_address: 'Bairro Sommerschield, Maputo',
    dropoff_phone: '+258 84 123 4567',
    package_type: 'medication',
    package_description: 'Insulina + metformina (manter refrigerado)',
    requires_cold_chain: true,
    requires_signature: true,
    estimated_distance_km: 3.2,
    estimated_duration_min: 12,
    status: 'pending',
    currency: 'MZN',
  },
  {
    customer_name: 'Carlos Mondlane',
    customer_phone: '+258 82 987 6543',
    country_code: 'MZ',
    pickup_type: 'lab',
    pickup_name: 'Lab. Clínico Instituto Nacional',
    pickup_location: { lat: -25.9620, lng: 32.5780 },
    pickup_address: 'Maputo',
    dropoff_name: 'Clínica Cruz Azul',
    dropoff_location: { lat: -25.9715, lng: 32.5732 },
    dropoff_address: 'Av. 24 de Julho, Maputo',
    package_type: 'lab_sample',
    package_description: 'Sample de sangue (manter refrigerado)',
    requires_cold_chain: true,
    requires_signature: true,
    estimated_distance_km: 2.1,
    estimated_duration_min: 8,
    status: 'pending',
    currency: 'MZN',
  },
  {
    customer_name: 'Maria Sumbana',
    customer_phone: '+258 84 555 1234',
    country_code: 'MZ',
    pickup_type: 'pharmacy',
    pickup_name: 'Farmácia Sónia',
    pickup_location: { lat: -25.9690, lng: 32.5750 },
    pickup_address: 'Av. Kim Il Sung, Maputo',
    dropoff_name: 'Maria Sumbana (Trabalho)',
    dropoff_location: { lat: -25.9650, lng: 32.5850 },
    dropoff_address: 'Centro Comercial, Maputo',
    dropoff_phone: '+258 84 555 1234',
    package_type: 'medication',
    package_description: 'Anti-hipertensivos (losartan, hidroclorotiazida)',
    requires_cold_chain: false,
    requires_signature: false,
    estimated_distance_km: 1.5,
    estimated_duration_min: 6,
    status: 'pending',
    currency: 'MZN',
  },
  {
    customer_name: 'Hospital Central',
    customer_phone: '+258 21 000 000',
    country_code: 'MZ',
    pickup_type: 'warehouse',
    pickup_name: 'Armazém Central MISAU',
    pickup_location: { lat: -25.9655, lng: 32.5832 },
    pickup_address: 'Av. Eduardo Mondlane, Maputo',
    dropoff_name: 'Hospital Central de Maputo',
    dropoff_location: { lat: -25.9655, lng: 32.5832 },
    dropoff_address: 'Av. Eduardo Mondlane, Maputo',
    package_type: 'equipment',
    package_description: 'Caixa de pensos + soro fisiológico',
    requires_cold_chain: false,
    requires_signature: true,
    estimated_distance_km: 0.8,
    estimated_duration_min: 5,
    status: 'pending',
    currency: 'MZN',
  },
];
