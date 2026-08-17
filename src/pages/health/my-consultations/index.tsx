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
import { Button } from '@/components/ui/button';
import { ConsultationCalendar } from '@/components/calendar';
import type { Appointment } from '@/components/calendar';
import { RefreshCw, Filter, X } from '@/components/icons/lucide-compat';
import { toast } from 'sonner';
import {
  format,
  parseISO,
  differenceInMinutes,
  differenceInHours,
  differenceInCalendarDays,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { logger } from '@/lib/logger';

import type { ViewMode, TabKey, DateRange, Consultation } from './types';
import { DATE_FNS_LOCALES, STATUS_MAP, TYPE_MAP } from './types';
import { LoadingSkeleton } from './LoadingSkeleton';
import { ErrorState } from './ErrorState';
import { PageHeader } from './PageHeader';
import { FiltersPanel } from './FiltersPanel';
import { TabBar } from './TabBar';
import { EmptyState } from './EmptyState';
import { ConsultationCard } from './ConsultationCard';

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
      logger.error('MyConsultations: fetch failed', { error: err });
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
  const dateFnsLocale = DATE_FNS_LOCALES[locale] || DATE_FNS_LOCALES['pt'];

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
    return <LoadingSkeleton t={t} />;
  }

  // ─── Error state (role="alert") ─────────────────────────────────────────
  if (error) {
    return (
      <ErrorState
        t={t}
        onRetry={() => fetchData(false)}
        onBack={() => navigate(-1)}
      />
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        t={t}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onBack={() => navigate(-1)}
        onPrescriptions={() => navigate('/health/prescriptions')}
      />

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

            <FiltersPanel
              t={t}
              show={showFilters}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterDoctor={filterDoctor}
              onDoctorChange={setFilterDoctor}
              filterSpecialty={filterSpecialty}
              onSpecialtyChange={setFilterSpecialty}
              filterDateRange={filterDateRange}
              onDateRangeChange={setFilterDateRange}
              doctorOptions={doctorOptions}
              specialtyOptions={specialtyOptions}
            />

            <TabBar
              t={t}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              counts={counts}
            />

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
                  <EmptyState
                    t={t}
                    activeTab={activeTab}
                    totalInTab={counts[activeTab]}
                    onBookDoctor={() => navigate('/health/doctors')}
                    onClearFilters={clearFilters}
                  />
                ) : (
                  /* ── Consultation cards with stagger animation ── */
                  <motion.div
                    layout
                    role="list"
                    aria-label={t(`myConsultations.panel_${activeTab}_label`)}
                    className="space-y-3"
                  >
                    {filteredItems.map((c, idx) => (
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
                        <ConsultationCard
                          c={c}
                          t={t}
                          isBusy={busy === c.id}
                          countdown={getCountdown(c)}
                          modifiable={canModify(c)}
                          joinable={canJoinVideo(c)}
                          formatDateTime={formatDateTime}
                          formatBookedDate={formatBookedDate}
                          onViewDetails={viewDetails}
                          onJoinVideo={joinVideoCall}
                          onReschedule={rescheduleConsultation}
                          onCancel={cancelConsultation}
                        />
                      </motion.div>
                    ))}
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
