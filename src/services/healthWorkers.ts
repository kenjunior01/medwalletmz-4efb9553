/**
 * Health Workers Marketplace Service
 * Yango-style job creation for healthcare professionals in MZ/AO.
 *
 * Professions supported:
 *   - doctor, nurse, midwife, ape (Agente Polivalente Elementar)
 *   - pharmacist, lab_tech, caregiver, translator
 *   - traditional_healer, community_health_worker
 *
 * Workers create profile → get verified → list services → receive bookings → earn.
 * Customers browse → filter → book → pay → rate.
 *
 * Tables: health_worker_profiles, health_worker_bookings
 */

import { supabase } from '@/integrations/supabase/client';

export type Profession =
  | 'doctor'
  | 'nurse'
  | 'midwife'
  | 'ape'
  | 'pharmacist'
  | 'lab_tech'
  | 'caregiver'
  | 'translator'
  | 'traditional_healer'
  | 'community_health_worker';

export type WorkerOnboardingStep =
  | 'basics'
  | 'profession'
  | 'credentials'
  | 'availability'
  | 'pricing'
  | 'review'
  | 'completed';

export type ServiceType =
  | 'telehealth'
  | 'home_visit'
  | 'clinic_consultation'
  | 'translation'
  | 'caregiver_session';

export type BookingStatus =
  | 'requested'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export interface Certificate {
  name: string;
  url?: string;
  year?: number;
}

export interface DayAvailability {
  start?: string; // '08:00'
  end?: string; // '17:00'
  off?: boolean;
}

export type AvailabilityHours = Partial<Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', DayAvailability>>;

export interface HealthWorker {
  id?: string;
  user_id?: string;
  country_code: string;
  // Identidade
  full_name: string;
  profile_photo_url?: string;
  bio?: string;
  // Profissão
  profession: Profession;
  specialization?: string;
  years_of_experience?: number;
  // Credenciais
  license_number?: string;
  license_url?: string;
  id_document_url?: string;
  certificates?: Certificate[];
  // Disponibilidade
  is_available?: boolean;
  availability_hours?: AvailabilityHours;
  home_visits_enabled?: boolean;
  telehealth_enabled?: boolean;
  service_radius_km?: number;
  // Localização
  base_location?: { lat: number; lng: number };
  base_address?: string;
  service_zones?: string[];
  // Skills
  languages?: string[];
  conditions_treated?: string[];
  // Preços
  consultation_fee?: number;
  home_visit_fee?: number;
  telehealth_fee?: number;
  currency?: string;
  // Verificação
  is_verified?: boolean;
  verified_at?: string;
  verification_notes?: string;
  // Métricas
  rating?: number;
  total_bookings?: number;
  total_earnings?: number;
  response_time_avg_min?: number;
  // Onboarding
  onboarding_step?: WorkerOnboardingStep;
  onboarding_progress?: number;
  rejection_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkerBooking {
  id?: string;
  worker_id?: string;
  customer_user_id?: string;
  customer_name: string;
  customer_phone: string;
  country_code: string;
  service_type: ServiceType;
  scheduled_at: string;
  duration_minutes?: number;
  location?: { lat: number; lng: number };
  address?: string;
  reason?: string;
  symptoms?: string[];
  notes_for_worker?: string;
  fee: number;
  worker_earnings: number;
  platform_fee: number;
  currency?: string;
  payment_status?: PaymentStatus;
  status: BookingStatus;
  confirmed_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  cancelled_by?: string;
  rating?: number;
  rating_comment?: string;
  rated_at?: string;
  linked_consultation_id?: string;
  linked_prescription_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkerEarningsSummary {
  today_count: number;
  today_earnings: number;
  week_count: number;
  week_earnings: number;
  month_count: number;
  month_earnings: number;
  pending_payout: number;
}

/* ============================================================
 * Labels & Display config
 * ============================================================ */

export const PROFESSION_LABELS: Record<Profession, { label: string; emoji: string; color: string }> = {
  doctor: { label: 'Médico', emoji: '🩺', color: 'bg-blue-100 text-blue-700' },
  nurse: { label: 'Enfermeiro', emoji: '💉', color: 'bg-emerald-100 text-emerald-700' },
  midwife: { label: 'Parteira', emoji: '🤰', color: 'bg-pink-100 text-pink-700' },
  ape: { label: 'APE', emoji: '🏥', color: 'bg-teal-100 text-teal-700' },
  pharmacist: { label: 'Farmacêutico', emoji: '💊', color: 'bg-amber-100 text-amber-700' },
  lab_tech: { label: 'Técnico de Lab', emoji: '🔬', color: 'bg-purple-100 text-purple-700' },
  caregiver: { label: 'Cuidador', emoji: '🤝', color: 'bg-rose-100 text-rose-700' },
  translator: { label: 'Tradutor', emoji: '🗣️', color: 'bg-cyan-100 text-cyan-700' },
  traditional_healer: { label: 'Curandeiro', emoji: '🌿', color: 'bg-green-100 text-green-700' },
  community_health_worker: { label: 'Agente Comunitário', emoji: '👥', color: 'bg-orange-100 text-orange-700' },
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, { label: string; emoji: string; description: string }> = {
  telehealth: { label: 'Teleconsulta', emoji: '📹', description: 'Consulta por vídeo, no teu telemóvel' },
  home_visit: { label: 'Visita ao domicílio', emoji: '🏠', description: 'O profissional vai ter contigo a casa' },
  clinic_consultation: { label: 'Consulta em clínica', emoji: '🏥', description: 'Vais à clínica do profissional' },
  translation: { label: 'Tradução médica', emoji: '🗣️', description: 'Tradutor para consultas em outras línguas' },
  caregiver_session: { label: 'Sessão de cuidador', emoji: '🤝', description: 'Cuidador para idosos ou crónicos' },
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, { label: string; color: string }> = {
  requested: { label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmada', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'Em curso', color: 'bg-purple-100 text-purple-700' },
  completed: { label: 'Concluída', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelada', color: 'bg-rose-100 text-rose-700' },
  no_show: { label: 'Faltou', color: 'bg-gray-200 text-gray-700' },
};

/* ============================================================
 * Pricing — Worker fees by profession (MZN baseline)
 * ============================================================ */

export const DEFAULT_FEES_BY_PROFESSION: Record<Profession, { consultation: number; home_visit: number; telehealth: number }> = {
  doctor: { consultation: 1500, home_visit: 3000, telehealth: 1000 },
  nurse: { consultation: 600, home_visit: 1200, telehealth: 400 },
  midwife: { consultation: 800, home_visit: 1800, telehealth: 500 },
  ape: { consultation: 300, home_visit: 500, telehealth: 200 },
  pharmacist: { consultation: 400, home_visit: 800, telehealth: 300 },
  lab_tech: { consultation: 500, home_visit: 1000, telehealth: 0 },
  caregiver: { consultation: 400, home_visit: 800, telehealth: 0 },
  translator: { consultation: 600, home_visit: 1200, telehealth: 500 },
  traditional_healer: { consultation: 500, home_visit: 1000, telehealth: 300 },
  community_health_worker: { consultation: 200, home_visit: 400, telehealth: 100 },
};

/**
 * Compute fee + worker earnings + platform fee.
 * Worker takes 80%, platform 20%.
 */
export function computeBookingFee(
  serviceType: ServiceType,
  worker: Pick<HealthWorker, 'consultation_fee' | 'home_visit_fee' | 'telehealth_fee' | 'currency'>,
): { fee: number; worker_earnings: number; platform_fee: number } {
  let base = 0;
  if (serviceType === 'telehealth') base = worker.telehealth_fee ?? 0;
  else if (serviceType === 'home_visit') base = worker.home_visit_fee ?? 0;
  else if (serviceType === 'caregiver_session') base = worker.home_visit_fee ?? 0;
  else if (serviceType === 'translation') base = worker.consultation_fee ?? 0;
  else base = worker.consultation_fee ?? 0;

  const worker_earnings = Math.round(base * 0.8 * 100) / 100;
  const platform_fee = Math.round((base - worker_earnings) * 100) / 100;
  return { fee: base, worker_earnings, platform_fee };
}

/* ============================================================
 * Worker Profile CRUD
 * ============================================================ */

export async function getMyWorkerProfile(userId: string): Promise<HealthWorker | null> {
  const { data, error } = await supabase
    .from('health_worker_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as HealthWorker) ?? null;
}

export async function getWorkerById(workerId: string): Promise<HealthWorker | null> {
  const { data, error } = await supabase
    .from('health_worker_profiles')
    .select('*')
    .eq('id', workerId)
    .maybeSingle();
  if (error) throw error;
  return (data as HealthWorker) ?? null;
}

export async function createWorker(
  userId: string,
  worker: Omit<HealthWorker, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'rating' | 'total_bookings' | 'total_earnings' | 'is_verified' | 'verified_at'>,
): Promise<HealthWorker> {
  const { data, error } = await supabase
    .from('health_worker_profiles')
    .insert({ ...worker, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as HealthWorker;
}

export async function updateWorker(workerId: string, patch: Partial<HealthWorker>): Promise<HealthWorker> {
  const { data, error } = await supabase
    .from('health_worker_profiles')
    .update(patch)
    .eq('id', workerId)
    .select()
    .single();
  if (error) throw error;
  return data as HealthWorker;
}

export async function updateWorkerProgress(workerId: string, step: WorkerOnboardingStep, progress: number): Promise<void> {
  await supabase
    .from('health_worker_profiles')
    .update({ onboarding_step: step, onboarding_progress: progress })
    .eq('id', workerId);
}

export async function toggleWorkerAvailable(workerId: string, available: boolean): Promise<void> {
  await supabase
    .from('health_worker_profiles')
    .update({ is_available: available })
    .eq('id', workerId);
}

export async function uploadWorkerDocument(
  userId: string,
  docType: 'license' | 'id' | 'photo',
  blob: Blob,
): Promise<string> {
  const ext = blob.type.split('/')[1] || 'jpg';
  const path = `${userId}/${docType}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('rider-documents')
    .upload(path, blob, { upsert: false, contentType: blob.type });
  if (error) throw error;
  const { data } = supabase.storage.from('rider-documents').getPublicUrl(path);
  return data.publicUrl;
}

/* ============================================================
 * Search & Browse (customer-facing)
 * ============================================================ */

export interface WorkerSearchFilters {
  profession?: Profession;
  service_type?: ServiceType;
  min_rating?: number;
  home_visits_only?: boolean;
  telehealth_only?: boolean;
  language?: string;
  zone?: string;
  limit?: number;
}

export async function searchWorkers(
  countryCode: string,
  filters: WorkerSearchFilters = {},
): Promise<HealthWorker[]> {
  let q = supabase
    .from('health_worker_profiles')
    .select('*')
    .eq('country_code', countryCode)
    .eq('is_verified', true)
    .eq('is_available', true)
    .order('rating', { ascending: false })
    .limit(filters.limit ?? 20);

  if (filters.profession) q = q.eq('profession', filters.profession);
  if (filters.home_visits_only) q = q.eq('home_visits_enabled', true);
  if (filters.telehealth_only) q = q.eq('telehealth_enabled', true);
  if (filters.min_rating) q = q.gte('rating', filters.min_rating);
  if (filters.language) q = q.contains('languages', [filters.language]);
  if (filters.zone) q = q.contains('service_zones', [filters.zone]);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as HealthWorker[];
}

/* ============================================================
 * Bookings CRUD
 * ============================================================ */

export async function getMyBookingsAsCustomer(userId: string, limit = 30): Promise<WorkerBooking[]> {
  const { data, error } = await supabase
    .from('health_worker_bookings')
    .select('*')
    .eq('customer_user_id', userId)
    .order('scheduled_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WorkerBooking[];
}

export async function getMyBookingsAsWorker(workerId: string, limit = 30): Promise<WorkerBooking[]> {
  const { data, error } = await supabase
    .from('health_worker_bookings')
    .select('*')
    .eq('worker_id', workerId)
    .order('scheduled_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WorkerBooking[];
}

export async function createBooking(
  userId: string,
  booking: Omit<WorkerBooking, 'id' | 'customer_user_id' | 'created_at' | 'updated_at' | 'status' | 'confirmed_at' | 'started_at' | 'completed_at' | 'cancelled_at' | 'rating' | 'rating_comment' | 'rated_at'>,
): Promise<WorkerBooking> {
  const { data, error } = await supabase
    .from('health_worker_bookings')
    .insert({ ...booking, customer_user_id: userId, status: 'requested' })
    .select()
    .single();
  if (error) throw error;
  return data as WorkerBooking;
}

export async function updateBookingStatus(bookingId: string, status: BookingStatus): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === 'confirmed') patch.confirmed_at = new Date().toISOString();
  if (status === 'in_progress') patch.started_at = new Date().toISOString();
  if (status === 'completed') patch.completed_at = new Date().toISOString();
  if (status === 'cancelled' || status === 'no_show') patch.cancelled_at = new Date().toISOString();
  await supabase.from('health_worker_bookings').update(patch).eq('id', bookingId);
}

export async function cancelBooking(bookingId: string, cancelledBy: string, reason: string): Promise<void> {
  await supabase
    .from('health_worker_bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: cancelledBy,
      cancel_reason: reason,
    })
    .eq('id', bookingId);
}

export async function rateBooking(bookingId: string, rating: number, comment?: string): Promise<void> {
  await supabase
    .from('health_worker_bookings')
    .update({
      rating,
      rating_comment: comment,
      rated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);
}

/* ============================================================
 * Earnings Summary (for worker dashboard)
 * ============================================================ */

export async function getWorkerEarningsSummary(workerId: string): Promise<WorkerEarningsSummary> {
  const { data, error } = await supabase
    .from('health_worker_bookings')
    .select('worker_earnings, status, completed_at, scheduled_at')
    .eq('worker_id', workerId);
  if (error) throw error;
  const rows = (data ?? []) as Pick<WorkerBooking, 'worker_earnings' | 'status' | 'completed_at' | 'scheduled_at'>[];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfWeek = new Date(now.getTime() - 7 * 86400000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  let today_count = 0, today_earnings = 0;
  let week_count = 0, week_earnings = 0;
  let month_count = 0, month_earnings = 0;
  let pending_payout = 0;

  for (const r of rows) {
    if (r.status !== 'completed') {
      if (r.status === 'confirmed' || r.status === 'in_progress') pending_payout += r.worker_earnings || 0;
      continue;
    }
    const ts = (r.completed_at || r.scheduled_at) as string;
    const earnings = r.worker_earnings || 0;
    if (ts >= startOfToday) { today_count++; today_earnings += earnings; }
    if (ts >= startOfWeek) { week_count++; week_earnings += earnings; }
    if (ts >= startOfMonth) { month_count++; month_earnings += earnings; }
  }

  return {
    today_count, today_earnings,
    week_count, week_earnings,
    month_count, month_earnings,
    pending_payout,
  };
}

/* ============================================================
 * MOCK data (for demo / offline mode)
 * ============================================================ */

export const MOCK_WORKERS: Omit<HealthWorker, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  {
    country_code: 'MZ',
    full_name: 'Dra. Ana Mucavele',
    bio: 'Médica geral com 8 anos de experiência em Maputo. Especial interesse em saúde materna e infantil.',
    profession: 'doctor',
    specialization: 'Medicina Geral',
    years_of_experience: 8,
    license_number: 'OMM-4521',
    is_available: true,
    home_visits_enabled: true,
    telehealth_enabled: true,
    service_radius_km: 15,
    base_address: 'Av. Julius Nyerere, Maputo',
    service_zones: ['Maputo Cidade', 'Matola'],
    languages: ['pt', 'mgh'],
    conditions_treated: ['maternal', 'pediatric', 'hypertension'],
    consultation_fee: 1500,
    home_visit_fee: 3000,
    telehealth_fee: 1000,
    currency: 'MZN',
    is_verified: true,
    rating: 4.9,
    total_bookings: 142,
    total_earnings: 285000,
    onboarding_step: 'completed',
    onboarding_progress: 100,
  },
  {
    country_code: 'MZ',
    full_name: 'Enf. Carlos Cossa',
    bio: 'Enfermeiro com experiência em cuidados domiciliários para idosos e crónicos. Vacinação ao domicílio.',
    profession: 'nurse',
    specialization: 'Cuidados Domiciliários',
    years_of_experience: 6,
    license_number: 'OE-22310',
    is_available: true,
    home_visits_enabled: true,
    telehealth_enabled: false,
    service_radius_km: 20,
    base_address: 'Matola, Maputo',
    service_zones: ['Maputo Cidade', 'Matola', 'Boane'],
    languages: ['pt', 'tsn'],
    conditions_treated: ['elderly', 'chronic', 'wound_care'],
    consultation_fee: 600,
    home_visit_fee: 1200,
    telehealth_fee: 0,
    currency: 'MZN',
    is_verified: true,
    rating: 4.8,
    total_bookings: 88,
    total_earnings: 95400,
    onboarding_step: 'completed',
    onboarding_progress: 100,
  },
  {
    country_code: 'MZ',
    full_name: 'Marta Sibanyana',
    bio: 'Parteira tradicional e enfermeira obstetra. Acompanhamento pré-natal e partos em casa seguros.',
    profession: 'midwife',
    specialization: 'Obstetrícia',
    years_of_experience: 12,
    license_number: 'OE-19872',
    is_available: true,
    home_visits_enabled: true,
    telehealth_enabled: true,
    service_radius_km: 25,
    base_address: 'Xai-Xai, Gaza',
    service_zones: ['Xai-Xai', 'Chókwè'],
    languages: ['pt', 'tsn', 'mgh'],
    conditions_treated: ['maternal', 'newborn'],
    consultation_fee: 800,
    home_visit_fee: 1800,
    telehealth_fee: 500,
    currency: 'MZN',
    is_verified: true,
    rating: 5.0,
    total_bookings: 64,
    total_earnings: 78200,
    onboarding_step: 'completed',
    onboarding_progress: 100,
  },
  {
    country_code: 'MZ',
    full_name: 'João Macuácua',
    bio: 'APE em zona rural. Atendimento básico, referência para hospitais, educação em saúde.',
    profession: 'ape',
    specialization: 'Saúde Comunitária',
    years_of_experience: 4,
    is_available: true,
    home_visits_enabled: true,
    telehealth_enabled: true,
    service_radius_km: 30,
    base_address: 'Inhambane',
    service_zones: ['Inhambane', 'Maxixe'],
    languages: ['pt', 'bit'],
    conditions_treated: ['malaria', 'diarrhea', 'respiratory'],
    consultation_fee: 300,
    home_visit_fee: 500,
    telehealth_fee: 200,
    currency: 'MZN',
    is_verified: true,
    rating: 4.7,
    total_bookings: 213,
    total_earnings: 63900,
    onboarding_step: 'completed',
    onboarding_progress: 100,
  },
  {
    country_code: 'MZ',
    full_name: 'Fátima Chaúque',
    bio: 'Cuidadora de idosos e doentes crónicos. Formada em geriatria básica.',
    profession: 'caregiver',
    specialization: 'Geriatria',
    years_of_experience: 5,
    is_available: true,
    home_visits_enabled: true,
    telehealth_enabled: false,
    service_radius_km: 10,
    base_address: 'Maputo',
    service_zones: ['Maputo Cidade'],
    languages: ['pt', 'mgh'],
    conditions_treated: ['elderly', 'dementia', 'post_stroke'],
    consultation_fee: 400,
    home_visit_fee: 800,
    telehealth_fee: 0,
    currency: 'MZN',
    is_verified: true,
    rating: 4.9,
    total_bookings: 178,
    total_earnings: 142400,
    onboarding_step: 'completed',
    onboarding_progress: 100,
  },
  {
    country_code: 'MZ',
    full_name: 'Tio Domingos Sitói',
    bio: 'Curandeiro verificado, com formação em fitoterapia. Integra medicina tradicional com referência hospitalar quando necessário.',
    profession: 'traditional_healer',
    specialization: 'Fitoterapia',
    years_of_experience: 25,
    is_available: true,
    home_visits_enabled: false,
    telehealth_enabled: true,
    service_radius_km: 0,
    base_address: 'Beira, Sofala',
    service_zones: ['Beira'],
    languages: ['pt', 'ndh'],
    conditions_treated: ['herbal', 'spiritual', 'chronic_pain'],
    consultation_fee: 500,
    home_visit_fee: 0,
    telehealth_fee: 300,
    currency: 'MZN',
    is_verified: true,
    rating: 4.6,
    total_bookings: 96,
    total_earnings: 48000,
    onboarding_step: 'completed',
    onboarding_progress: 100,
  },
  {
    country_code: 'AO',
    full_name: 'Dr. Paulo de Oliveira',
    bio: 'Médico cardiologista em Luanda. Teleconsultas e visitas em clínica.',
    profession: 'doctor',
    specialization: 'Cardiologia',
    years_of_experience: 14,
    license_number: 'OMA-1108',
    is_available: true,
    home_visits_enabled: false,
    telehealth_enabled: true,
    service_radius_km: 0,
    base_address: 'Luanda',
    service_zones: ['Luanda', 'Talatona'],
    languages: ['pt'],
    conditions_treated: ['hypertension', 'cardiac', 'diabetes'],
    consultation_fee: 3500,
    home_visit_fee: 0,
    telehealth_fee: 2500,
    currency: 'AOA',
    is_verified: true,
    rating: 4.8,
    total_bookings: 67,
    total_earnings: 184500,
    onboarding_step: 'completed',
    onboarding_progress: 100,
  },
  {
    country_code: 'MZ',
    full_name: 'Rosa Maluleke',
    bio: 'Tradutora médica em português-inglês-swahili. Acompanha expatriados em consultas.',
    profession: 'translator',
    specialization: 'Médica',
    years_of_experience: 7,
    is_available: true,
    home_visits_enabled: true,
    telehealth_enabled: true,
    service_radius_km: 20,
    base_address: 'Maputo',
    service_zones: ['Maputo Cidade'],
    languages: ['pt', 'en', 'sw'],
    conditions_treated: [],
    consultation_fee: 600,
    home_visit_fee: 1200,
    telehealth_fee: 500,
    currency: 'MZN',
    is_verified: true,
    rating: 5.0,
    total_bookings: 41,
    total_earnings: 31200,
    onboarding_step: 'completed',
    onboarding_progress: 100,
  },
];

export const MOCK_BOOKINGS: Omit<WorkerBooking, 'id' | 'customer_user_id' | 'created_at' | 'updated_at'>[] = [
  {
    worker_id: 'mock-1',
    customer_name: 'Maria Test',
    customer_phone: '+25884000000',
    country_code: 'MZ',
    service_type: 'telehealth',
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    duration_minutes: 30,
    reason: 'Dor de cabeça persistente',
    fee: 1000,
    worker_earnings: 800,
    platform_fee: 200,
    currency: 'MZN',
    payment_status: 'pending',
    status: 'requested',
  },
  {
    worker_id: 'mock-1',
    customer_name: 'João Test',
    customer_phone: '+25884000001',
    country_code: 'MZ',
    service_type: 'home_visit',
    scheduled_at: new Date(Date.now() - 86400000).toISOString(),
    duration_minutes: 60,
    address: 'Bairro Polana, Maputo',
    reason: 'Idoso com dificuldade de mobilidade',
    fee: 3000,
    worker_earnings: 2400,
    platform_fee: 600,
    currency: 'MZN',
    payment_status: 'paid',
    status: 'completed',
    rating: 5,
    rating_comment: 'Excelente atendimento!',
    rated_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  },
];
