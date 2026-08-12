/**
 * Ecosystem Flows Service ("Sintonia")
 *
 * Implements cross-user-type interconnections within the MedWallet health ecosystem:
 *   - Patient → books a Health Rider to take them to a Health Worker appointment
 *   - Health Worker → requests a rider to deliver prescriptions to a patient
 *   - Promoter → refers a patient to a specific Health Worker + offers rider transport
 *
 * Tables: ecosystem_bookings, health_worker_bookings (linked), health_deliveries (linked)
 */

import { supabase as typedSupabase } from '@/integrations/supabase/client';
// Cast para acesso a tabelas ainda não presentes nos tipos gerados
const supabase = typedSupabase as any;

/* ============================================================
 * Types
 * ============================================================ */

export interface EcosystemBooking {
  id: string;
  created_at: string;
  /** user_id of who created this ecosystem booking */
  initiated_by: string;
  initiator_type: 'patient' | 'health_worker' | 'promoter';
  flow_type: 'patient_to_worker' | 'worker_to_patient_delivery' | 'promoter_referral_transport';
  status: 'pending_rider' | 'rider_assigned' | 'in_progress' | 'completed' | 'cancelled';
  patient_id?: string;
  worker_id?: string;
  rider_id?: string;
  /** Links to health_deliveries table */
  rider_delivery_id?: string;
  /** Links to health_worker_bookings table */
  worker_booking_id?: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_coords?: { lat: number; lng: number };
  dropoff_coords?: { lat: number; lng: number };
  scheduled_date?: string;
  notes?: string;
  estimated_fee?: number;
}

/** Parameters for creating a generic ecosystem booking */
export interface CreateEcosystemBookingParams {
  initiatedBy: string;
  initiatorType: EcosystemBooking['initiator_type'];
  flowType: EcosystemBooking['flow_type'];
  patientId?: string;
  workerId?: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupCoords?: { lat: number; lng: number };
  dropoffCoords?: { lat: number; lng: number };
  scheduledDate?: string;
  notes?: string;
  estimatedFee?: number;
}

/** Display labels for flow types */
export const FLOW_TYPE_LABELS: Record<EcosystemBooking['flow_type'], { label: string; emoji: string; description: string }> = {
  patient_to_worker: {
    label: 'Paciente → Profissional',
    emoji: '🚗',
    description: 'Paciente vai à consulta com transporte de rider',
  },
  worker_to_patient_delivery: {
    label: 'Entrega de Receita',
    emoji: '📦',
    description: 'Profissional solicita rider para entregar medicamentos ao paciente',
  },
  promoter_referral_transport: {
    label: 'Referência + Transporte',
    emoji: '🤝',
    description: 'Promotor referencia paciente e oferece transporte',
  },
};

/** Display labels for statuses */
export const ECOSYSTEM_STATUS_LABELS: Record<EcosystemBooking['status'], { label: string; color: string }> = {
  pending_rider: { label: 'Aguardando Rider', color: 'bg-amber-100 text-amber-700' },
  rider_assigned: { label: 'Rider Atribuído', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'Em Curso', color: 'bg-purple-100 text-purple-700' },
  completed: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelado', color: 'bg-rose-100 text-rose-700' },
};

/* ============================================================
 * Mock Data (for demo / offline mode)
 * ============================================================ */

export const MOCK_ECOSYSTEM_BOOKINGS: EcosystemBooking[] = [
  {
    id: 'eco-mock-001',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    initiated_by: 'patient-user-001',
    initiator_type: 'patient',
    flow_type: 'patient_to_worker',
    status: 'pending_rider',
    patient_id: 'patient-user-001',
    worker_id: 'worker-mock-1',
    pickup_address: 'Bairro Sommerschield, Maputo',
    dropoff_address: 'Av. Julius Nyerere, Clínica Central, Maputo',
    pickup_coords: { lat: -25.9550, lng: 32.5900 },
    dropoff_coords: { lat: -25.9689, lng: 32.5801 },
    scheduled_date: new Date(Date.now() + 86400000).toISOString(),
    notes: 'Consulta de controle com Dra. Ana Mucavele',
    estimated_fee: 150,
  },
  {
    id: 'eco-mock-002',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    initiated_by: 'worker-user-001',
    initiator_type: 'health_worker',
    flow_type: 'worker_to_patient_delivery',
    status: 'rider_assigned',
    patient_id: 'patient-user-002',
    worker_id: 'worker-user-001',
    rider_id: 'rider-mock-001',
    rider_delivery_id: 'delivery-mock-001',
    pickup_address: 'Farmácia Moderna, Av. Julius Nyerere, Maputo',
    dropoff_address: 'Bairro Costa do Sol, Maputo',
    pickup_coords: { lat: -25.9689, lng: 32.5801 },
    dropoff_coords: { lat: -25.9500, lng: 32.5700 },
    notes: 'Entregar insulina + metformina ao paciente. Manter refrigerado.',
    estimated_fee: 120,
  },
  {
    id: 'eco-mock-003',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    initiated_by: 'promoter-user-001',
    initiator_type: 'promoter',
    flow_type: 'promoter_referral_transport',
    status: 'in_progress',
    patient_id: 'patient-user-003',
    worker_id: 'worker-mock-2',
    rider_id: 'rider-mock-002',
    rider_delivery_id: 'delivery-mock-002',
    worker_booking_id: 'booking-mock-001',
    pickup_address: 'Bairro Mafalala, Maputo',
    dropoff_address: 'Matola, Enf. Carlos Cossa (Domicílio)',
    pickup_coords: { lat: -25.9720, lng: 32.5850 },
    dropoff_coords: { lat: -25.9100, lng: 32.5600 },
    scheduled_date: new Date(Date.now() - 3600000).toISOString(),
    notes: 'Referência de promotora comunitária — paciente idoso com dificuldade de locomoção',
    estimated_fee: 250,
  },
  {
    id: 'eco-mock-004',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    initiated_by: 'patient-user-004',
    initiator_type: 'patient',
    flow_type: 'patient_to_worker',
    status: 'completed',
    patient_id: 'patient-user-004',
    worker_id: 'worker-mock-3',
    rider_id: 'rider-mock-003',
    rider_delivery_id: 'delivery-mock-003',
    worker_booking_id: 'booking-mock-002',
    pickup_address: 'Xai-Xai, Gaza, Rua Principal',
    dropoff_address: 'Centro de Saúde de Xai-Xai',
    pickup_coords: { lat: -25.0510, lng: 33.0200 },
    dropoff_coords: { lat: -25.0530, lng: 33.0250 },
    scheduled_date: new Date(Date.now() - 172800000).toISOString(),
    notes: 'Consulta pré-natal com parteira Marta Sibanyana',
    estimated_fee: 80,
  },
];

/* ============================================================
 * Core Functions
 * ============================================================ */

/**
 * Create a cross-flow ecosystem booking.
 * For 'patient_to_worker' flow, also creates linked entries in
 * health_worker_bookings (confirmed) and health_deliveries (pending)
 * so the rider marketplace shows the delivery.
 */
export async function createEcosystemBooking(
  params: CreateEcosystemBookingParams,
): Promise<EcosystemBooking> {
  const bookingRow = {
    initiated_by: params.initiatedBy,
    initiator_type: params.initiatorType,
    flow_type: params.flowType,
    status: 'pending_rider' as const,
    patient_id: params.patientId,
    worker_id: params.workerId,
    pickup_address: params.pickupAddress,
    dropoff_address: params.dropoffAddress,
    pickup_coords: params.pickupCoords ?? null,
    dropoff_coords: params.dropoffCoords ?? null,
    scheduled_date: params.scheduledDate ?? null,
    notes: params.notes ?? null,
    estimated_fee: params.estimatedFee ?? null,
  };

  // For patient_to_worker: also create a worker booking + delivery
  if (params.flowType === 'patient_to_worker' && params.patientId && params.workerId) {
    // 1. Create the worker booking (status: confirmed)
    const { data: workerBooking, error: bookingError } = await supabase
      .from('health_worker_bookings')
      .insert({
        worker_id: params.workerId,
        customer_user_id: params.patientId,
        customer_name: 'Ecosystem Patient',
        customer_phone: '',
        country_code: 'MZ',
        service_type: 'clinic_consultation',
        scheduled_at: params.scheduledDate ?? new Date().toISOString(),
        address: params.dropoffAddress,
        fee: 0,
        worker_earnings: 0,
        platform_fee: 0,
        currency: 'MZN',
        status: 'confirmed',
      })
      .select('id')
      .single();

    if (bookingError) throw new Error(bookingError.message);

    // 2. Create the health delivery (status: pending) so riders see it
    const { data: delivery, error: deliveryError } = await supabase
      .from('health_deliveries')
      .insert({
        customer_user_id: params.patientId,
        customer_name: 'Ecosystem Patient',
        customer_phone: '',
        country_code: 'MZ',
        pickup_type: 'home',
        pickup_name: params.pickupAddress,
        pickup_location: params.pickupCoords ?? { lat: 0, lng: 0 },
        pickup_address: params.pickupAddress,
        dropoff_name: params.dropoffAddress,
        dropoff_location: params.dropoffCoords ?? { lat: 0, lng: 0 },
        dropoff_address: params.dropoffAddress,
        package_type: 'other',
        package_description: 'Ecosystem transport — patient to worker appointment',
        status: 'pending',
        currency: 'MZN',
      })
      .select('id')
      .single();

    if (deliveryError) throw new Error(deliveryError.message);

    // 3. Create the ecosystem booking with linked IDs
    const { data, error } = await supabase
      .from('ecosystem_bookings')
      .insert({
        ...bookingRow,
        worker_booking_id: workerBooking?.id,
        rider_delivery_id: delivery?.id,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as EcosystemBooking;
  }

  // Generic flow (worker_to_patient_delivery or promoter_referral_transport)
  const { data, error } = await supabase
    .from('ecosystem_bookings')
    .insert(bookingRow)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as EcosystemBooking;
}

/**
 * Smart function: Book a rider to take a patient to a Health Worker appointment.
 * This orchestrates the full "patient_to_worker" flow:
 *   1. Creates an ecosystem booking (flow_type: patient_to_worker)
 *   2. Creates a health_worker_booking entry (status: confirmed)
 *   3. Creates a health_delivery entry (status: pending) for the rider marketplace
 *   4. Returns the ecosystem booking with all linked IDs
 */
export async function bookRiderToWorkerAppointment(params: {
  patientId: string;
  workerId: string;
  workerProfession: string;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledDate?: string;
  notes?: string;
}): Promise<EcosystemBooking> {
  // Determine service type based on profession
  const serviceType = params.workerProfession === 'pharmacist'
    ? 'clinic_consultation'
    : params.workerProfession === 'caregiver'
      ? 'caregiver_session'
      : 'clinic_consultation';

  // Step 1: Create the worker booking (confirmed immediately)
  const { data: workerBooking, error: bookingError } = await supabase
    .from('health_worker_bookings')
    .insert({
      worker_id: params.workerId,
      customer_user_id: params.patientId,
      customer_name: 'Ecosystem Patient',
      customer_phone: '',
      country_code: 'MZ',
      service_type: serviceType,
      scheduled_at: params.scheduledDate ?? new Date().toISOString(),
      address: params.dropoffAddress,
      reason: params.notes,
      notes_for_worker: 'Ecosystem booking — patient needs rider transport to this appointment',
      fee: 0,
      worker_earnings: 0,
      platform_fee: 0,
      currency: 'MZN',
      status: 'confirmed',
    })
    .select('id')
    .single();

  if (bookingError) throw new Error(bookingError.message);

  // Step 2: Create the health delivery so it appears in the rider marketplace
  const { data: delivery, error: deliveryError } = await supabase
    .from('health_deliveries')
    .insert({
      customer_user_id: params.patientId,
      customer_name: 'Ecosystem Patient',
      customer_phone: '',
      country_code: 'MZ',
      pickup_type: 'home',
      pickup_name: params.pickupAddress,
      pickup_location: { lat: -25.9689, lng: 32.5801 },
      pickup_address: params.pickupAddress,
      dropoff_name: `${params.workerProfession} — ${params.dropoffAddress}`,
      dropoff_location: { lat: -25.9689, lng: 32.5801 },
      dropoff_address: params.dropoffAddress,
      package_type: 'other',
      package_description: `Ecosystem transport: patient to ${params.workerProfession} appointment`,
      status: 'pending',
      currency: 'MZN',
    })
    .select('id')
    .single();

  if (deliveryError) throw new Error(deliveryError.message);

  // Step 3: Create the ecosystem booking linking everything together
  const { data: ecoBooking, error: ecoError } = await supabase
    .from('ecosystem_bookings')
    .insert({
      initiated_by: params.patientId,
      initiator_type: 'patient',
      flow_type: 'patient_to_worker',
      status: 'pending_rider',
      patient_id: params.patientId,
      worker_id: params.workerId,
      rider_delivery_id: delivery?.id,
      worker_booking_id: workerBooking?.id,
      pickup_address: params.pickupAddress,
      dropoff_address: params.dropoffAddress,
      scheduled_date: params.scheduledDate,
      notes: params.notes,
    })
    .select()
    .single();

  if (ecoError) throw new Error(ecoError.message);
  return ecoBooking as EcosystemBooking;
}

/**
 * Get all ecosystem bookings where the given user is involved
 * (as initiator, patient, worker, or rider).
 * Falls back to mock data on error.
 */
export async function getMyEcosystemBookings(userId: string): Promise<EcosystemBooking[]> {
  const { data, error } = await supabase
    .from('ecosystem_bookings')
    .select('*')
    .or(
      `initiated_by.eq.${userId},patient_id.eq.${userId},worker_id.eq.${userId},rider_id.eq.${userId}`,
    )
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as EcosystemBooking[];
}

/**
 * Get pending rider requests — bookings with status 'pending_rider'.
 * Used by riders browsing the ecosystem marketplace.
 * Falls back to mock data on error.
 */
export async function getPendingRiderRequests(): Promise<EcosystemBooking[]> {
  const { data, error } = await supabase
    .from('ecosystem_bookings')
    .select('*')
    .eq('status', 'pending_rider')
    .order('created_at', { ascending: true })
    .limit(30);

  if (error) throw new Error(error.message);
  return (data ?? []) as EcosystemBooking[];
}

/**
 * Assign a rider to an ecosystem booking.
 * Updates the booking status to 'rider_assigned' and links the delivery.
 */
export async function assignRiderToEcosystemBooking(
  bookingId: string,
  riderId: string,
): Promise<void> {
  // Update ecosystem booking with optimistic lock
  const { error: ecoError } = await supabase
    .from('ecosystem_bookings')
    .update({
      rider_id: riderId,
      status: 'rider_assigned',
    })
    .eq('id', bookingId)
    .eq('status', 'pending_rider');

  if (ecoError) throw new Error(ecoError.message);

  // Also update the linked health delivery if it exists
  const { data: booking } = await supabase
    .from('ecosystem_bookings')
    .select('rider_delivery_id')
    .eq('id', bookingId)
    .maybeSingle();

  if (booking?.rider_delivery_id) {
    await supabase
      .from('health_deliveries')
      .update({
        rider_id: riderId,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', booking.rider_delivery_id);
  }
}

/**
 * Mark an ecosystem booking as completed.
 * Also updates the linked delivery and worker booking statuses.
 */
export async function completeEcosystemBooking(bookingId: string): Promise<void> {
  // Fetch linked IDs first
  const { data: booking, error: fetchError } = await supabase
    .from('ecosystem_bookings')
    .select('rider_delivery_id, worker_booking_id')
    .eq('id', bookingId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);

  // Mark ecosystem booking as completed
  const { error: ecoError } = await supabase
    .from('ecosystem_bookings')
    .update({ status: 'completed' })
    .eq('id', bookingId);

  if (ecoError) throw new Error(ecoError.message);

  // Also complete the linked delivery
  if (booking?.rider_delivery_id) {
    await supabase
      .from('health_deliveries')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', booking.rider_delivery_id);
  }

  // Also complete the linked worker booking
  if (booking?.worker_booking_id) {
    await supabase
      .from('health_worker_bookings')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', booking.worker_booking_id);
  }
}
