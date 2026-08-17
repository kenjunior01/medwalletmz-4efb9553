/**
 * Shared types, constants, and configs for MyConsultations
 */

import type { Appointment } from '@/components/calendar';
import {
  pt as dateFnsPt,
  ptBR as dateFnsPtBR,
  enUS as dateFnsEnUS,
  hi as dateFnsHi,
  es as dateFnsEs,
  fr as dateFnsFr,
  af as dateFnsAf,
} from 'date-fns/locale';
import type { Locale } from 'date-fns';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ViewMode = 'calendar' | 'list';
export type TabKey = 'upcoming' | 'past' | 'cancelled';
export type DateRange = 'all' | 'upcoming_30' | 'past_30' | 'past_90' | 'past_year';

export interface Consultation {
  id: string;
  doctor_id: string;
  patient_id: string;
  scheduled_at: string;
  status: string;
  consultation_type: string;
  duration_minutes: number;
  fee: number;
  reason: string | null;
  notes: string | null;
  created_at: string;
  // joined fields
  doctor_name?: string | null;
  doctor_avatar?: string | null;
  doctor_city?: string | null;
  doctor_specialty?: { name: string; icon: string } | null;
}

// ─── Status config (visual hierarchy) ────────────────────────────────────────

export const STATUS_CONFIG: Record<string, { labelKey: string; badgeClass: string; dotClass: string }> = {
  scheduled: { labelKey: 'myConsultations.status_scheduled', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', dotClass: 'bg-blue-500' },
  confirmed: { labelKey: 'myConsultations.status_confirmed', badgeClass: 'bg-green-50 text-green-700 border-green-200', dotClass: 'bg-green-500' },
  pending: { labelKey: 'myConsultations.status_pending', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200', dotClass: 'bg-amber-500' },
  in_progress: { labelKey: 'myConsultations.status_in_progress', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200', dotClass: 'bg-purple-500' },
  completed: { labelKey: 'myConsultations.status_completed', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotClass: 'bg-emerald-500' },
  cancelled: { labelKey: 'myConsultations.status_cancelled', badgeClass: 'bg-red-50 text-red-700 border-red-200', dotClass: 'bg-red-500' },
  no_show: { labelKey: 'myConsultations.status_no_show', badgeClass: 'bg-gray-100 text-gray-700 border-gray-200', dotClass: 'bg-gray-500' },
};

export const STATUS_MAP: Record<string, Appointment['status']> = {
  scheduled: 'upcoming',
  confirmed: 'upcoming',
  in_progress: 'upcoming',
  pending: 'upcoming',
  completed: 'completed',
  cancelled: 'cancelled',
  no_show: 'cancelled',
};

export const TYPE_MAP: Record<string, Appointment['type']> = {
  video: 'video',
  chat: 'chat',
  in_person: 'in-person',
  'in-person': 'in-person',
};

// ─── Tabs config ──────────────────────────────────────────────────────────────

export const TAB_KEYS: TabKey[] = ['upcoming', 'past', 'cancelled'];

// ─── date-fns locale map (mirrors ConsultationCalendar) ──────────────────────

export const DATE_FNS_LOCALES: Record<string, Locale> = {
  pt: dateFnsPt,
  'pt-BR': dateFnsPtBR,
  en: dateFnsEnUS,
  hi: dateFnsHi,
  es: dateFnsEs,
  fr: dateFnsFr,
  af: dateFnsAf,
  sw: dateFnsAf, // Swahili — fallback to Afrikaans (same as ConsultationCalendar)
  am: dateFnsEnUS, // Amharic — fallback to English
};
