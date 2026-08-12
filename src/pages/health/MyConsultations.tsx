/**
 * MyConsultations — Consultation history & upcoming appointments
 *
 * Data source: `consultations` table (Supabase) + joined `profiles`,
 * `doctor_profiles`, `medical_specialties`.
 *
 * UX patterns (mirrors Home + HealthWallet improvements):
 * 1. Skeleton loading states (ShimmerCard + Skeleton, role="status")
 * 2. Progressive disclosure — tabs "Próximas" / "Passadas" / "Canceladas"
 *    + collapsible filters panel + calendar/list view toggle
 * 3. WCAG 2.1 AA — 44px touch targets, aria-labels, role="tablist"/"tab"/"tabpanel",
 *    role="list"/"listitem", role="status"/"alert", focus-visible rings
 * 4. Framer-motion — card stagger, tab transition, filter panel expand
 * 5. All Portuguese strings via t() from useCountry() / myConsultations namespace
 * 6. Friendly error state with retry CTA (role="alert")
 * 7. Differentiated empty states per tab
 * 8. Status badges with clear visual hierarchy (color + dot + label)
 * 9. Quick actions — view details, join video call, reschedule, cancel
 * 10. Countdown indicators with urgency (high/medium/low)
 * 11. Doctor info — avatar/photo, name, specialty, city
 * 12. Filters — by date range, doctor, specialty + search
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ShimmerCard } from '@/components/ui/premium';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConsultationCalendar } from '@/components/calendar';
import type { Appointment } from '@/components/calendar';
import {
  ArrowLeft,
  Calendar as CalIcon,
  CalendarDays,
  List,
  FileText,
  X,
  Stethoscope,
  Video,
  MessageCircle,
  MapPin,
  AlertCircle,
  RefreshCw,
  Search as SearchIcon,
  Filter,
  Clock,
  Loader2,
  CalendarClock,
  Ban,
  CalendarCheck,
} from '@/components/icons/lucide-compat';
import { toast } from 'sonner';
import {
  format,
  parseISO,
  differenceInMinutes,
  differenceInHours,
  differenceInCalendarDays,
} from 'date-fns';
import { pt as dateFnsPt, ptBR as dateFnsPtBR, enUS as dateFnsEnUS, hi as dateFnsHi, es as dateFnsEs, fr as dateFnsFr, af as dateFnsAf } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { cn } from '@/lib/utils';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';

// ─── Types ──────────────────────────────────────────────────────────────────

type ViewMode = 'calendar' | 'list';
type TabKey = 'upcoming' | 'past' | 'cancelled';
type DateRange = 'all' | 'upcoming_30' | 'past_30' | 'past_90' | 'past_year';

interface Consultation {
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

const STATUS_CONFIG: Record<string, { labelKey: string; badgeClass: string; dotClass: string }> = {
  scheduled: { labelKey: 'myConsultations.status_scheduled', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', dotClass: 'bg-blue-500' },
  confirmed: { labelKey: 'myConsultations.status_confirmed', badgeClass: 'bg-green-50 text-green-700 border-green-200', dotClass: 'bg-green-500' },
  pending: { labelKey: 'myConsultations.status_pending', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200', dotClass: 'bg-amber-500' },
  in_progress: { labelKey: 'myConsultations.status_in_progress', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200', dotClass: 'bg-purple-500' },
  completed: { labelKey: 'myConsultations.status_completed', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotClass: 'bg-emerald-500' },
  cancelled: { labelKey: 'myConsultations.status_cancelled', badgeClass: 'bg-red-50 text-red-700 border-red-200', dotClass: 'bg-red-500' },
  no_show: { labelKey: 'myConsultations.status_no_show', badgeClass: 'bg-gray-100 text-gray-700 border-gray-200', dotClass: 'bg-gray-500' },
};

const STATUS_MAP: Record<string, Appointment['status']> = {
  scheduled: 'upcoming',
  confirmed: 'upcoming',
  in_progress: 'upcoming',
  pending: 'upcoming',
  completed: 'completed',
  cancelled: 'cancelled',
  no_show: 'cancelled',
};

const TYPE_MAP: Record<string, Appointment['type']> = {
  video: 'video',
  chat: 'chat',
  in_person: 'in-person',
  'in-person': 'in-person',
};

// ─── Tabs config ──────────────────────────────────────────────────────────────

const TAB_KEYS: TabKey[] = ['upcoming', 'past', 'cancelled'];

// ─── date-fns locale map (mirrors ConsultationCalendar) ──────────────────────

const DATE_FNS_LOCALES: Record<string, Locale> = {
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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MyConsultations() {
  const { user } = useAuth();
  const { t, locale } = useCountry();
  const navigate = useNavigate();

  // ─── State ──────────────────────────────────────────────────────────────
  const [items, setItems] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDoctor, setFilterDoctor] = useState<string>('all');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<DateRange>('all');

  // Ref for cancelling stale fetches
  const fetchTokenRef = useRef(0);

  // ─── Fetch data ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async (isRefresh = false) => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const token = ++fetchTokenRef.current;

    try {
      const { data, error: fetchErr } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', user.id)
        .order('scheduled_at', { ascending: false });

      if (fetchErr) throw fetchErr;

      const list: any[] = (data || []) as any[];
      const ids = [...new Set(list.map((c) => c.doctor_id).filter(Boolean))];

      if (ids.length) {
        const [profsRes, docsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('user_id, full_name, default_city, avatar_url')
            .in('user_id', ids),
          supabase
            .from('doctor_profiles')
            .select('user_id, avatar_url, medical_specialties(name, icon)')
            .in('user_id', ids),
        ]);

        const profs = profsRes.data || [];
        const docs = docsRes.data || [];

        list.forEach((c) => {
          const p = profs.find((pp: any) => pp.user_id === c.doctor_id);
          const d = docs.find((dd: any) => dd.user_id === c.doctor_id);
          c.doctor_name = p?.full_name || null;
          c.doctor_avatar = d?.avatar_url || p?.avatar_url || null;
          c.doctor_city = p?.default_city || null;
          c.doctor_specialty = d?.medical_specialties || null;
        });
      }

      // Ignore if a newer fetch has started
      if (token !== fetchTokenRef.current) return;

      setItems(list as Consultation[]);

      if (isRefresh) toast.success(t('myConsultations.refreshed'));
    } catch (err) {
      console.error('MyConsultations: fetch failed', err);
      if (token === fetchTokenRef.current) {
        setError(t('myConsultations.error_title'));
      }
    } finally {
      if (token === fetchTokenRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user, t]);

  useEffect(() => {
    fetchData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ─── Bucket consultations by tab ────────────────────────────────────────
  const buckets = useMemo(() => {
    const now = new Date();
    const upcoming: Consultation[] = [];
    const past: Consultation[] = [];
    const cancelled: Consultation[] = [];

    items.forEach((c) => {
      const dt = c.scheduled_at ? new Date(c.scheduled_at) : null;
      if (c.status === 'cancelled' || c.status === 'no_show') {
        cancelled.push(c);
      } else if (c.status === 'completed' || (dt && dt < now)) {
        past.push(c);
      } else {
        upcoming.push(c);
      }
    });

    // Upcoming: ascending (closest first); past/cancelled: most recent first
    upcoming.sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
    );

    return { upcoming, past, cancelled };
  }, [items]);

  // ─── Filter options derived from data ───────────────────────────────────
  const { doctorOptions, specialtyOptions } = useMemo(() => {
    const doctorsMap = new Map<string, string>();
    const specsSet = new Set<string>();
    items.forEach((c) => {
      if (c.doctor_id && c.doctor_name) doctorsMap.set(c.doctor_id, c.doctor_name);
      if (c.doctor_specialty?.name) specsSet.add(c.doctor_specialty.name);
    });
    return {
      doctorOptions: Array.from(doctorsMap.entries()).map(([id, name]) => ({ id, name })),
      specialtyOptions: Array.from(specsSet.values()).sort(),
    };
  }, [items]);

  const hasActiveFilters =
    filterDoctor !== 'all' ||
    filterSpecialty !== 'all' ||
    filterDateRange !== 'all' ||
    searchQuery.trim().length > 0;

  // ─── Apply filters + search to active tab bucket ────────────────────────
  const filteredItems = useMemo(() => {
    const list = buckets[activeTab];
    const q = searchQuery.trim().toLowerCase();
    const now = new Date();

    return list.filter((c) => {
      // Search
      if (q) {
        const haystack = `${c.doctor_name || ''} ${c.doctor_specialty?.name || ''} ${c.reason || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      // Doctor filter
      if (filterDoctor !== 'all' && c.doctor_id !== filterDoctor) return false;
      // Specialty filter
      if (filterSpecialty !== 'all' && c.doctor_specialty?.name !== filterSpecialty) return false;
      // Date range filter
      if (filterDateRange !== 'all') {
        const dt = c.scheduled_at ? new Date(c.scheduled_at) : null;
        if (!dt) return false;
        if (filterDateRange === 'upcoming_30') {
          const limit = new Date();
          limit.setDate(now.getDate() + 30);
          if (dt < now || dt > limit) return false;
        } else if (filterDateRange === 'past_30') {
          const limit = new Date();
          limit.setDate(now.getDate() - 30);
          if (dt < limit || dt > now) return false;
        } else if (filterDateRange === 'past_90') {
          const limit = new Date();
          limit.setDate(now.getDate() - 90);
          if (dt < limit || dt > now) return false;
        } else if (filterDateRange === 'past_year') {
          const limit = new Date();
          limit.setFullYear(now.getFullYear() - 1);
          if (dt < limit || dt > now) return false;
        }
      }
      return true;
    });
  }, [buckets, activeTab, searchQuery, filterDoctor, filterSpecialty, filterDateRange]);

  // ─── Calendar appointments (always full list) ───────────────────────────
  const calendarAppointments: Appointment[] = useMemo(() => {
    return items
      .filter((c) => c.scheduled_at)
      .map((c) => {
        const dt = parseISO(c.scheduled_at);
        const endDate = new Date(dt.getTime() + (c.duration_minutes || 30) * 60_000);
        return {
          id: c.id,
          date: format(dt, 'yyyy-MM-dd'),
          startTime: format(dt, 'HH:mm'),
          endTime: format(endDate, 'HH:mm'),
          doctorName: c.doctor_name || t('myConsultations.doctor_unknown'),
          specialty: c.doctor_specialty?.name || t('myConsultations.specialty_unknown'),
          status: STATUS_MAP[c.status] || 'upcoming',
          type: TYPE_MAP[c.consultation_type] || 'chat',
        };
      });
  }, [items, t]);

  // ─── Per-tab counts ─────────────────────────────────────────────────────
  const counts = useMemo(
    () => ({
      upcoming: buckets.upcoming.length,
      past: buckets.past.length,
      cancelled: buckets.cancelled.length,
    }),
    [buckets],
  );

  // ─── Action handlers ────────────────────────────────────────────────────
  const cancelConsultation = useCallback(
    async (c: Consultation) => {
      if (!window.confirm(t('myConsultations.cancel_confirm'))) return;
      setBusy(c.id);
      try {
        const { error: cancelErr } = await supabase
          .from('consultations')
          .update({ status: 'cancelled' })
          .eq('id', c.id);
        if (cancelErr) throw cancelErr;

        // Best-effort: cancel reminders + free the slot
        await Promise.all([
          supabase
            .from('consultation_reminders')
            .update({ status: 'cancelled' })
            .eq('consultation_id', c.id)
            .is('sent_at', null),
          supabase
            .from('doctor_availability_slots')
            .update({ is_booked: false, consultation_id: null })
            .eq('consultation_id', c.id),
        ]);

        setItems((prev) =>
          prev.map((x) => (x.id === c.id ? { ...x, status: 'cancelled' } : x)),
        );
        toast.success(t('myConsultations.cancel_success'));
      } catch (e: any) {
        toast.error(e?.message || t('common.error'));
      } finally {
        setBusy(null);
      }
    },
    [t],
  );

  const rescheduleConsultation = useCallback(
    async (c: Consultation) => {
      setBusy(c.id);
      try {
        // Cancel existing consultation (without prompt — user already chose reschedule)
        const { error: cancelErr } = await supabase
          .from('consultations')
          .update({ status: 'cancelled' })
          .eq('id', c.id);
        if (cancelErr) throw cancelErr;

        await Promise.all([
          supabase
            .from('consultation_reminders')
            .update({ status: 'cancelled' })
            .eq('consultation_id', c.id)
            .is('sent_at', null),
          supabase
            .from('doctor_availability_slots')
            .update({ is_booked: false, consultation_id: null })
            .eq('consultation_id', c.id),
        ]);

        setItems((prev) =>
          prev.map((x) => (x.id === c.id ? { ...x, status: 'cancelled' } : x)),
        );

        toast.info(t('myConsultations.reschedule_redirect'));

        // Find the doctor profile id and navigate to the booking page
        const { data: dp } = await supabase
          .from('doctor_profiles')
          .select('id')
          .eq('user_id', c.doctor_id)
          .maybeSingle();

        if (dp?.id) navigate(`/health/book/${dp.id}`);
        else navigate('/health/doctors');
      } catch (e: any) {
        toast.error(e?.message || t('common.error'));
        setBusy(null);
      }
    },
    [t, navigate],
  );

  const joinVideoCall = useCallback(
    (c: Consultation) => {
      navigate(`/health/room/${c.id}`);
    },
    [navigate],
  );

  const viewDetails = useCallback(
    (c: Consultation) => {
      navigate(`/health/consultation/${c.id}`);
    },
    [navigate],
  );

  const clearFilters = useCallback(() => {
    setFilterDoctor('all');
    setFilterSpecialty('all');
    setFilterDateRange('all');
    setSearchQuery('');
  }, []);

  // ─── Format helpers ─────────────────────────────────────────────────────
  const dateFnsLocale: Locale = DATE_FNS_LOCALES[locale] || dateFnsPt;

  const formatDateTime = (iso: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return format(d, "d 'de' MMM, HH:mm", { locale: dateFnsLocale });
  };

  const formatBookedDate = (iso: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return format(d, "d 'de' MMM 'de' yyyy", { locale: dateFnsLocale });
  };

  // ─── Countdown indicator (upcoming consultations only) ──────────────────
  const getCountdown = (
    c: Consultation,
  ): { text: string; urgency: 'high' | 'medium' | 'low' } | null => {
    if (!c.scheduled_at) return null;
    if (!['scheduled', 'confirmed', 'pending', 'in_progress'].includes(c.status)) return null;

    const dt = new Date(c.scheduled_at);
    const now = new Date();
    const minsUntil = differenceInMinutes(dt, now);

    if (minsUntil < 0) return null;

    if (minsUntil < 5) {
      return { text: t('myConsultations.countdown_starts_now'), urgency: 'high' };
    }
    if (minsUntil < 60) {
      return {
        text: t('myConsultations.countdown_minutes', { minutes: String(minsUntil) }),
        urgency: 'high',
      };
    }
    const hoursUntil = differenceInHours(dt, now);
    if (hoursUntil < 24) {
      return {
        text: t('myConsultations.countdown_hours', { hours: String(hoursUntil) }),
        urgency: 'medium',
      };
    }
    const daysUntil = differenceInCalendarDays(dt, now);
    if (daysUntil === 1) {
      return { text: t('myConsultations.countdown_tomorrow'), urgency: 'low' };
    }
    return {
      text: t('myConsultations.countdown_days', { days: String(daysUntil) }),
      urgency: 'low',
    };
  };

  const canModify = (c: Consultation): boolean =>
    ['scheduled', 'confirmed'].includes(c.status) &&
    !!c.scheduled_at &&
    new Date(c.scheduled_at) > new Date();

  const canJoinVideo = (c: Consultation): boolean => {
    if (c.consultation_type !== 'video') return false;
    if (!['scheduled', 'confirmed', 'in_progress'].includes(c.status)) return false;
    if (!c.scheduled_at) return false;
    const dt = new Date(c.scheduled_at);
    const now = new Date();
    const minsUntil = differenceInMinutes(dt, now);
    return minsUntil <= 15 || c.status === 'in_progress';
  };

  // ─── Loading skeleton (role="status") ───────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background" role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">{t('myConsultations.loading')}</span>
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 rounded mb-1" />
            <Skeleton className="h-3 w-48 rounded" />
          </div>
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </header>
        <div className="p-4 space-y-3">
          <ShimmerCard className="h-12" lines={1} />
          <div className="flex gap-2" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-28 rounded-full" />
            ))}
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error state (role="alert") ─────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-background" role="alert">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label={t('common.back')}
            className="min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <h1 className="font-bold flex-1">{t('home.my_consultations')}</h1>
        </header>
        <div className="flex flex-col items-center justify-center text-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-bold text-foreground">{t('myConsultations.error_title')}</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            {t('myConsultations.error_desc')}
          </p>
          <Button
            onClick={() => fetchData(false)}
            className="mt-5 min-h-[44px] gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label={t('myConsultations.retry')}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('myConsultations.retry')}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Empty-state config per tab ─────────────────────────────────────────
  const emptyConfig: Record<
    TabKey,
    { titleKey: string; descKey: string; ctaKey?: string; icon: typeof Stethoscope }
  > = {
    upcoming: {
      titleKey: 'myConsultations.empty_upcoming_title',
      descKey: 'myConsultations.empty_upcoming_desc',
      ctaKey: 'myConsultations.empty_upcoming_cta',
      icon: Stethoscope,
    },
    past: {
      titleKey: 'myConsultations.empty_past_title',
      descKey: 'myConsultations.empty_past_desc',
      icon: CalendarCheck,
    },
    cancelled: {
      titleKey: 'myConsultations.empty_cancelled_title',
      descKey: 'myConsultations.empty_cancelled_desc',
      icon: Ban,
    },
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          aria-label={t('common.back')}
          className="min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Button>

        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-lg truncate">{t('home.my_consultations')}</h1>
          <p className="text-xs text-muted-foreground truncate">{t('myConsultations.subtitle')}</p>
        </div>

        {/* View toggle (segmented control) */}
        <div
          role="group"
          aria-label={t('myConsultations.view_toggle_label')}
          className="flex items-center rounded-lg bg-muted p-0.5"
        >
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            aria-pressed={viewMode === 'calendar'}
            aria-label={t('myConsultations.calendar_view')}
            className={cn(
              'min-h-[44px] min-w-[44px] p-2 rounded-md transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              viewMode === 'calendar'
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-pressed={viewMode === 'list'}
            aria-label={t('myConsultations.list_view')}
            className={cn(
              'min-h-[44px] min-w-[44px] p-2 rounded-md transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              viewMode === 'list'
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <List className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/health/prescriptions')}
          className="min-h-[44px] gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={t('myConsultations.recipes')}
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t('myConsultations.recipes')}</span>
        </Button>
      </header>

      <PullToRefresh onRefresh={() => fetchData(true)}>
      <div className="p-4 space-y-3">
        {/* ── Calendar view ─────────────────────────────────────────────── */}
        {viewMode === 'calendar' && (
          <ConsultationCalendar
            appointments={calendarAppointments}
            defaultView="month"
          />
        )}

        {/* ── List view ─────────────────────────────────────────────────── */}
        {viewMode === 'list' && (
          <>
            {/* Action row: refresh + filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="min-h-[44px] gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={t('myConsultations.refresh')}
              >
                <RefreshCw
                  className={cn('h-4 w-4', refreshing && 'animate-spin')}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">
                  {refreshing ? t('myConsultations.refreshing') : t('myConsultations.refresh')}
                </span>
              </Button>

              <Button
                variant={showFilters ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
                aria-controls="filters-panel"
                aria-label={
                  hasActiveFilters
                    ? t('myConsultations.filters_active')
                    : t('myConsultations.filters')
                }
                className="min-h-[44px] gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Filter className="h-4 w-4" aria-hidden="true" />
                <span>{t('myConsultations.filters')}</span>
                {hasActiveFilters && (
                  <span
                    className="ml-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-foreground/30 text-[10px] font-bold"
                    aria-hidden="true"
                  >
                    !
                  </span>
                )}
              </Button>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="min-h-[44px] gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={t('myConsultations.clear_filters')}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">{t('myConsultations.clear_filters')}</span>
                </Button>
              )}
            </div>

            {/* Filters panel (progressive disclosure) */}
            <AnimatePresence initial={false}>
              {showFilters && (
                <motion.div
                  id="filters-panel"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <Card>
                    <CardContent className="p-3 space-y-3">
                      {/* Search */}
                      <div className="relative">
                        <SearchIcon
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                          aria-hidden="true"
                        />
                        <Input
                          type="search"
                          placeholder={t('myConsultations.search_placeholder')}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          aria-label={t('myConsultations.search_aria_label')}
                          className="pl-8 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        />
                      </div>

                      {/* Filter selects */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Select value={filterDoctor} onValueChange={setFilterDoctor}>
                          <SelectTrigger
                            className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            aria-label={t('myConsultations.filter_doctor')}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              {t('myConsultations.filter_doctor_all')}
                            </SelectItem>
                            {doctorOptions.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
                          <SelectTrigger
                            className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            aria-label={t('myConsultations.filter_specialty')}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              {t('myConsultations.filter_specialty_all')}
                            </SelectItem>
                            {specialtyOptions.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={filterDateRange}
                          onValueChange={(v) => setFilterDateRange(v as DateRange)}
                        >
                          <SelectTrigger
                            className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            aria-label={t('myConsultations.filter_date_range')}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t('myConsultations.filter_date_all')}</SelectItem>
                            <SelectItem value="upcoming_30">
                              {t('myConsultations.filter_date_upcoming_30')}
                            </SelectItem>
                            <SelectItem value="past_30">
                              {t('myConsultations.filter_date_past_30')}
                            </SelectItem>
                            <SelectItem value="past_90">
                              {t('myConsultations.filter_date_past_90')}
                            </SelectItem>
                            <SelectItem value="past_year">
                              {t('myConsultations.filter_date_past_year')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tabs (progressive disclosure) */}
            <div
              role="tablist"
              aria-label={t('myConsultations.tablist_label')}
              className="flex gap-1 p-1 bg-muted rounded-lg overflow-x-auto"
            >
              {TAB_KEYS.map((key) => {
                const isActive = activeTab === key;
                const label = t(`myConsultations.tab_${key}`);
                const count = counts[key];
                const tabId = `tab-${key}`;
                const panelId = `panel-${key}`;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    id={tabId}
                    aria-selected={isActive}
                    aria-controls={panelId}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      'flex-1 min-h-[44px] px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                      isActive
                        ? 'bg-card shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span>{label}</span>
                    <span
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded-full',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted-foreground/10 text-muted-foreground',
                      )}
                      aria-hidden="true"
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tab panel */}
            <div
              role="tabpanel"
              id={`panel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
              tabIndex={0}
              className="space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
            >
              {/* Result count (aria-live) */}
              {filteredItems.length > 0 && (
                <p className="text-xs text-muted-foreground px-1" aria-live="polite">
                  {t('myConsultations.showing_count', {
                    count: String(filteredItems.length),
                    total: String(counts[activeTab]),
                  })}
                </p>
              )}

              <AnimatePresence mode="popLayout">
                {filteredItems.length === 0 ? (
                  /* ── Empty state (differentiated per tab + filter variant) ── */
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    role="status"
                    className="flex flex-col items-center justify-center text-center py-12 px-4"
                  >
                    {counts[activeTab] === 0 ? (
                      // Tab is fully empty — show tab-specific empty state
                      (() => {
                        const cfg = emptyConfig[activeTab];
                        const Icon = cfg.icon;
                        return (
                          <>
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                              className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"
                            >
                              <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                            </motion.div>
                            <h3 className="text-lg font-bold text-foreground">
                              {t(cfg.titleKey)}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                              {t(cfg.descKey)}
                            </p>
                            {cfg.ctaKey && (
                              <Button
                                onClick={() => navigate('/health/doctors')}
                                className="mt-5 min-h-[44px] gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                              >
                                <Stethoscope className="h-4 w-4" aria-hidden="true" />
                                {t(cfg.ctaKey)}
                              </Button>
                            )}
                          </>
                        );
                      })()
                    ) : (
                      // Tab has items but filters narrowed to 0 — show filter empty state
                      <>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                          className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"
                        >
                          <Filter className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                        </motion.div>
                        <h3 className="text-lg font-bold text-foreground">
                          {t('myConsultations.empty_filter_title')}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                          {t('myConsultations.empty_filter_desc')}
                        </p>
                        <Button
                          onClick={clearFilters}
                          variant="outline"
                          className="mt-5 min-h-[44px] gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                          {t('myConsultations.clear_filters')}
                        </Button>
                      </>
                    )}
                  </motion.div>
                ) : (
                  /* ── Consultation cards with stagger animation ── */
                  <motion.div
                    layout
                    role="list"
                    aria-label={t(`myConsultations.panel_${activeTab}_label`)}
                    className="space-y-3"
                  >
                    {filteredItems.map((c, idx) => {
                      const statusCfg =
                        STATUS_CONFIG[c.status] || STATUS_CONFIG.scheduled;
                      const countdown = getCountdown(c);
                      const modifiable = canModify(c);
                      const joinable = canJoinVideo(c);
                      const isBusy = busy === c.id;
                      const doctorInitial =
                        c.doctor_name?.[0]?.toUpperCase() || 'M';

                      return (
                        <motion.div
                          key={c.id}
                          layout
                          role="listitem"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{
                            duration: 0.25,
                            delay: Math.min(idx * 0.04, 0.32),
                          }}
                        >
                          <Card
                            className={cn(
                              'overflow-hidden transition-shadow',
                              countdown?.urgency === 'high' && 'ring-2 ring-amber-300',
                            )}
                          >
                            <CardContent className="p-0">
                              {/* ── Card header (button → view details) ── */}
                              <button
                                type="button"
                                onClick={() => viewDetails(c)}
                                aria-label={`${t('common.doctor')}: ${
                                  c.doctor_name || t('myConsultations.doctor_unknown')
                                } — ${formatDateTime(c.scheduled_at)}`}
                                className="w-full text-left p-4 flex gap-3 items-start hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                              >
                                {/* Doctor avatar/photo */}
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pharmacy to-primary flex items-center justify-center text-pharmacy-foreground font-bold shrink-0 overflow-hidden">
                                  {c.doctor_avatar ? (
                                    <img
                                      src={c.doctor_avatar}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span aria-hidden="true">{doctorInitial}</span>
                                  )}
                                </div>

                                {/* Doctor info */}
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold truncate">
                                    {t('myConsultations.doctor_prefix')}{' '}
                                    {c.doctor_name || t('myConsultations.doctor_unknown')}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {c.doctor_specialty?.icon && (
                                      <span aria-hidden="true">
                                        {c.doctor_specialty.icon}{' '}
                                      </span>
                                    )}
                                    {c.doctor_specialty?.name ||
                                      t('myConsultations.specialty_unknown')}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                                    <Clock
                                      className="h-3 w-3 shrink-0"
                                      aria-hidden="true"
                                    />
                                    <time dateTime={c.scheduled_at}>
                                      {formatDateTime(c.scheduled_at)}
                                    </time>
                                    <span aria-hidden="true">·</span>
                                    <span>
                                      {t('myConsultations.duration_minutes', {
                                        minutes: String(c.duration_minutes || 30),
                                      })}
                                    </span>
                                  </div>
                                  {c.doctor_city && (
                                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                                      <MapPin
                                        className="h-3 w-3 shrink-0"
                                        aria-hidden="true"
                                      />
                                      <span className="truncate">{c.doctor_city}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Status badge + type icon */}
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                  <Badge
                                    variant="outline"
                                    className={cn('text-xs gap-1', statusCfg.badgeClass)}
                                  >
                                    <span
                                      className={cn(
                                        'w-1.5 h-1.5 rounded-full',
                                        statusCfg.dotClass,
                                      )}
                                      aria-hidden="true"
                                    />
                                    {t(statusCfg.labelKey)}
                                  </Badge>
                                  {c.consultation_type === 'video' && (
                                    <Video
                                      className="h-4 w-4 text-muted-foreground"
                                      aria-hidden="true"
                                    />
                                  )}
                                  {c.consultation_type === 'chat' && (
                                    <MessageCircle
                                      className="h-4 w-4 text-muted-foreground"
                                      aria-hidden="true"
                                    />
                                  )}
                                  {c.consultation_type === 'in_person' && (
                                    <MapPin
                                      className="h-4 w-4 text-muted-foreground"
                                      aria-hidden="true"
                                    />
                                  )}
                                </div>
                              </button>

                              {/* ── Countdown indicator ── */}
                              {countdown && (
                                <div
                                  role="status"
                                  className={cn(
                                    'px-4 py-2 text-xs font-medium border-t flex items-center gap-1.5',
                                    countdown.urgency === 'high' &&
                                      'bg-amber-50 text-amber-700 border-amber-100',
                                    countdown.urgency === 'medium' &&
                                      'bg-blue-50 text-blue-700 border-blue-100',
                                    countdown.urgency === 'low' &&
                                      'bg-muted text-muted-foreground border-muted',
                                  )}
                                >
                                  <CalendarClock
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                  <span>{countdown.text}</span>
                                </div>
                              )}

                              {/* ── Quick actions ── */}
                              {(modifiable || joinable) && (
                                <div className="flex flex-wrap gap-2 p-3 border-t bg-muted/20">
                                  {joinable && (
                                    <Button
                                      size="sm"
                                      className="flex-1 min-h-[44px] gap-1.5 bg-green-600 hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                                      disabled={isBusy}
                                      onClick={() => joinVideoCall(c)}
                                      aria-label={t('myConsultations.join_video_label')}
                                    >
                                      <Video className="h-3.5 w-3.5" aria-hidden="true" />
                                      {t('myConsultations.join_video')}
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="min-h-[44px] gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                    disabled={isBusy}
                                    onClick={() => viewDetails(c)}
                                    aria-label={t('common.view_details')}
                                  >
                                    {t('common.view_details')}
                                  </Button>
                                  {modifiable && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="min-h-[44px] gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                        disabled={isBusy}
                                        onClick={() => rescheduleConsultation(c)}
                                        aria-label={t('myConsultations.reschedule')}
                                      >
                                        {isBusy ? (
                                          <Loader2
                                            className="h-3.5 w-3.5 animate-spin"
                                            aria-hidden="true"
                                          />
                                        ) : (
                                          <CalIcon
                                            className="h-3.5 w-3.5"
                                            aria-hidden="true"
                                          />
                                        )}
                                        <span className="hidden sm:inline">
                                          {t('myConsultations.reschedule')}
                                        </span>
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="min-h-[44px] gap-1.5 text-destructive hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                                        disabled={isBusy}
                                        onClick={() => cancelConsultation(c)}
                                        aria-label={t('myConsultations.cancel')}
                                      >
                                        <X
                                          className="h-3.5 w-3.5"
                                          aria-hidden="true"
                                        />
                                        <span className="hidden sm:inline">
                                          {t('myConsultations.cancel')}
                                        </span>
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}

                              {/* ── Footer: booked-on date ── */}
                              {c.created_at && (
                                <div className="px-4 py-2 text-[10px] text-muted-foreground/70 border-t bg-muted/10">
                                  {t('myConsultations.booked_on')}: {formatBookedDate(c.created_at)}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
      </PullToRefresh>
    </div>
  );
}
