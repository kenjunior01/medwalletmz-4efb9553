/**
 * ConsultationCalendar — Full appointment calendar component
 *
 * Three views: Day (agenda), Week (7-column grid), Month (calendar grid)
 * Uses date-fns for date manipulation, framer-motion for transitions,
 * and the project's i18n / theme system.
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isSameMonth,
  isSameDay,
  isToday,
  differenceInMinutes,
  parseISO,
} from 'date-fns';
import { ptBR, pt, enUS, hi, es, fr, af } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Video,
  MessageSquare,
  MapPin,
} from "@/components/icons/lucide-compat";
import { cn } from '@/lib/utils';
import { useCountry } from '@/contexts/CountryContext';
import { getTheme } from '@/themes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ─── Locale map for date-fns ────────────────────────────────────────────────
const DATE_FNS_LOCALES: Record<string, Locale> = {
  pt,
  'pt-BR': ptBR,
  en: enUS,
  hi,
  es,
  fr,
  af,
  sw: af,   // Swahili – fallback to Afrikaans
  am: enUS, // Amharic – fallback to English
};

// ─── Data types ───────────────────────────────────────────────────────────

export interface Appointment {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  doctorName: string;
  specialty: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  type: 'video' | 'chat' | 'in-person';
}

export interface ConsultationCalendarProps {
  className?: string;
  defaultView?: 'day' | 'week' | 'month';
  userId?: string;
  appointments?: Appointment[];
}

type CalendarView = 'day' | 'week' | 'month';

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 08–18

// ─── Empty fallback (real data comes from Supabase via props) ──────────────

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusColor(status: Appointment['status']): string {
  switch (status) {
    case 'upcoming':
      return 'border-l-primary';
    case 'completed':
      return 'border-l-emerald';
    case 'cancelled':
      return 'border-l-destructive';
  }
}

function getStatusBadgeVariant(
  status: Appointment['status']
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'upcoming':
      return 'default';
    case 'completed':
      return 'secondary';
    case 'cancelled':
      return 'destructive';
  }
}

function getTypeIcon(type: Appointment['type']) {
  switch (type) {
    case 'video':
      return <Video className="h-3.5 w-3.5" />;
    case 'chat':
      return <MessageSquare className="h-3.5 w-3.5" />;
    case 'in-person':
      return <MapPin className="h-3.5 w-3.5" />;
  }
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function getAppointmentDuration(appointment: Appointment): number {
  return differenceInMinutes(
    parseISO(`2000-01-01T${appointment.endTime}:00`),
    parseISO(`2000-01-01T${appointment.startTime}:00`)
  );
}

// ─── Animation variants ────────────────────────────────────────────────────

const viewVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const cardVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// ─── Component ──────────────────────────────────────────────────────────────

export function ConsultationCalendar({
  className,
  defaultView = 'month',
  userId: _userId,
  appointments: externalAppointments,
}: ConsultationCalendarProps) {
  const navigate = useNavigate();
  const { t, locale, country } = useCountry();

  const dateFnsLocale = DATE_FNS_LOCALES[locale] || pt;
  const theme = getTheme(country?.id || 'MZ');

  // State
  const [view, setView] = useState<CalendarView>(defaultView);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Appointments data (external or empty)
  const appointments = useMemo<Appointment[]>(
    () => externalAppointments ?? [],
    [externalAppointments]
  );

  // ─── Navigation helpers ──────────────────────────────────────────────────

  const goToday = useCallback(() => setCurrentDate(new Date()), []);

  const goPrevious = useCallback(() => {
    switch (view) {
      case 'month':
        setCurrentDate((d) => subMonths(d, 1));
        break;
      case 'week':
        setCurrentDate((d) => subWeeks(d, 1));
        break;
      case 'day':
        setCurrentDate((d) => subDays(d, 1));
        break;
    }
  }, [view]);

  const goNext = useCallback(() => {
    switch (view) {
      case 'month':
        setCurrentDate((d) => addMonths(d, 1));
        break;
      case 'week':
        setCurrentDate((d) => addWeeks(d, 1));
        break;
      case 'day':
        setCurrentDate((d) => addDays(d, 1));
        break;
    }
  }, [view]);

  // ─── Derived data ─────────────────────────────────────────────────────────

  const headerLabel = useMemo(() => {
    switch (view) {
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: dateFnsLocale });
      case 'week': {
        const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
        const we = endOfWeek(currentDate, { weekStartsOn: 1 });
        if (isSameMonth(ws, we)) {
          return format(ws, 'MMMM yyyy', { locale: dateFnsLocale });
        }
        return `${format(ws, 'd MMM', { locale: dateFnsLocale })} – ${format(we, 'd MMM yyyy', { locale: dateFnsLocale })}`;
      }
      case 'day':
        return format(currentDate, 'EEEE, d MMMM yyyy', { locale: dateFnsLocale });
    }
  }, [view, currentDate, dateFnsLocale]);

  const viewPills: { key: CalendarView; label: string }[] = [
    { key: 'day', label: t('calendar.day_view') },
    { key: 'week', label: t('calendar.week_view') },
    { key: 'month', label: t('calendar.month_view') },
  ];

  // ─── Month view helpers ──────────────────────────────────────────────────

  const monthGrid = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      if (!map[a.date]) map[a.date] = [];
      map[a.date].push(a);
    }
    return map;
  }, [appointments]);

  // ─── Week view helpers ───────────────────────────────────────────────────

  const weekDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      }),
    [currentDate]
  );

  const getDayAppointments = useCallback(
    (day: Date) => {
      const key = format(day, 'yyyy-MM-dd');
      return appointmentsByDate[key] ?? [];
    },
    [appointmentsByDate]
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={cn('w-full max-w-4xl mx-auto', className)}>
      <Card className="overflow-hidden border shadow-soft bg-card">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b space-y-4">
          {/* Title + FAB row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: theme.colors.primary + '18' }}
              >
                <Calendar className="h-4.5 w-4.5" style={{ color: theme.colors.primary }} />
              </div>
              <h2 className="text-lg font-bold text-card-foreground">
                {t('calendar.title')}
              </h2>
            </div>

            <Button
              size="sm"
              className="rounded-xl font-bold gap-1.5"
              style={{
                backgroundColor: theme.colors.primary,
              }}
              onClick={() => navigate('/health/book')}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('calendar.book_new')}</span>
            </Button>
          </div>

          {/* Navigation row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={goPrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={goNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="ml-2 h-8 rounded-lg text-xs font-bold"
                onClick={goToday}
              >
                {t('calendar.today')}
              </Button>
            </div>

            {/* View toggle pills */}
            <div className="flex items-center rounded-lg bg-muted p-0.5">
              {viewPills.map((pill) => (
                <button
                  key={pill.key}
                  onClick={() => setView(pill.key)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200',
                    view === pill.key
                      ? 'bg-card text-card-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Month/Year display */}
          <p className="text-sm font-semibold text-card-foreground capitalize">{headerLabel}</p>
        </div>

        {/* ── Views ───────────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {view === 'month' && (
              <MonthView
                days={monthGrid}
                currentDate={currentDate}
                appointmentsByDate={appointmentsByDate}
                dateFnsLocale={dateFnsLocale}
                theme={theme}
                t={t}
                navigate={navigate}
              />
            )}
            {view === 'week' && (
              <WeekView
                days={weekDays}
                currentDate={currentDate}
                getDayAppointments={getDayAppointments}
                dateFnsLocale={dateFnsLocale}
                theme={theme}
                t={t}
              />
            )}
            {view === 'day' && (
              <DayView
                date={currentDate}
                appointments={getDayAppointments(currentDate)}
                t={t}
                theme={theme}
                navigate={navigate}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </Card>
    </div>
  );
}

// ─── Month View ────────────────────────────────────────────────────────────

interface MonthViewProps {
  days: Date[];
  currentDate: Date;
  appointmentsByDate: Record<string, Appointment[]>;
  dateFnsLocale: Locale;
  theme: ReturnType<typeof getTheme>;
  t: (path: string, params?: Record<string, string>) => string;
  navigate: (to: string) => void;
}

function MonthView({
  days,
  currentDate,
  appointmentsByDate,
  dateFnsLocale,
  theme,
  t,
  navigate,
}: MonthViewProps) {
  const weekdays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) =>
      format(addDays(start, i), 'EEE', { locale: dateFnsLocale })
    );
  }, [dateFnsLocale]);

  // Group days into weeks (rows of 7)
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  return (
    <div className="p-2 sm:p-4">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {weekdays.map((wd) => (
          <div
            key={wd}
            className="text-center text-[11px] font-bold uppercase text-muted-foreground py-2"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="space-y-px">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-px">
            {week.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayAppts = appointmentsByDate[key] ?? [];
              const inMonth = isSameMonth(day, currentDate);
              const today = isToday(day);
              const upcomingCount = dayAppts.filter((a) => a.status === 'upcoming').length;

              return (
                <motion.button
                  key={key}
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: wi * 0.02 + 0.05 }}
                  onClick={() => navigate(`/health/book?date=${key}`)}
                  className={cn(
                    'relative flex flex-col items-center justify-start p-1.5 sm:p-2 min-h-[52px] sm:min-h-[68px] rounded-lg transition-colors',
                    !inMonth && 'opacity-30',
                    today && 'bg-primary/10 ring-1 ring-primary/30'
                  )}
                >
                  <span
                    className={cn(
                      'text-xs sm:text-sm font-semibold leading-none',
                      today ? 'text-primary' : 'text-card-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </span>

                  {/* Appointment dots + badge */}
                  {dayAppts.length > 0 && (
                    <div className="flex items-center gap-0.5 mt-1">
                      <div className="flex gap-0.5">
                        {dayAppts.slice(0, 3).map((a) => (
                          <span
                            key={a.id}
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              a.status === 'upcoming' && 'bg-primary',
                              a.status === 'completed' && 'bg-emerald',
                              a.status === 'cancelled' && 'bg-destructive'
                            )}
                          />
                        ))}
                      </div>
                      {upcomingCount > 0 && (
                        <span
                          className="ml-0.5 text-[9px] font-bold text-primary bg-primary/15 px-1 rounded-full"
                          style={{ color: theme.colors.primary }}
                        >
                          {upcomingCount}
                        </span>
                      )}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Week View ──────────────────────────────────────────────────────────────

interface WeekViewProps {
  days: Date[];
  currentDate: Date;
  getDayAppointments: (day: Date) => Appointment[];
  dateFnsLocale: Locale;
  theme: ReturnType<typeof getTheme>;
  t: (path: string, params?: Record<string, string>) => string;
}

function WeekView({
  days,
  currentDate,
  getDayAppointments,
  dateFnsLocale,
  theme,
  t,
}: WeekViewProps) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* Day headers */}
        <div className="grid grid-cols-8 border-b bg-muted/40">
          <div className="p-2 text-center text-[11px] font-bold text-muted-foreground border-r">
            {format(new Date(), 'HH:mm').split(':')[0]}
          </div>
          {days.map((day) => {
            const today = isToday(day);
            const inMonth = isSameMonth(day, currentDate);
            return (
              <div
                key={format(day, 'yyyy-MM-dd')}
                className={cn(
                  'p-2 text-center border-r last:border-r-0',
                  today && 'bg-primary/10'
                )}
              >
                <div className="text-[10px] font-bold uppercase text-muted-foreground">
                  {format(day, 'EEE', { locale: dateFnsLocale })}
                </div>
                <div
                  className={cn(
                    'text-sm font-bold mt-0.5',
                    today
                      ? 'text-primary'
                      : !inMonth
                        ? 'text-muted-foreground/50'
                        : 'text-card-foreground'
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="relative">
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b last:border-b-0 min-h-[48px]">
              {/* Hour label */}
              <div className="p-1 text-right text-[10px] font-medium text-muted-foreground border-r flex items-start justify-end pr-2 pt-0.5">
                {String(hour).padStart(2, '0')}:00
              </div>

              {/* Hour cells per day */}
              {days.map((day) => {
                const dayAppts = getDayAppointments(day);
                const hourAppts = dayAppts.filter((a) => {
                  const startMin = parseTimeToMinutes(a.startTime);
                  return startMin >= hour * 60 && startMin < (hour + 1) * 60;
                });

                return (
                  <div
                    key={format(day, 'yyyy-MM-dd') + '-' + hour}
                    className="border-r last:border-r-0 relative"
                  >
                    {hourAppts.map((appt) => {
                      const startOffset = parseTimeToMinutes(appt.startTime) - hour * 60;
                      const duration = getAppointmentDuration(appt);
                      const heightPx = Math.max(
                        24,
                        (duration / 60) * 48
                      );

                      return (
                        <motion.div
                          key={appt.id}
                          initial={{ opacity: 0, scaleY: 0.8 }}
                          animate={{ opacity: 1, scaleY: 1 }}
                          transition={{ duration: 0.15 }}
                          className={cn(
                            'absolute inset-x-1 rounded-md px-1.5 py-0.5 text-[10px] leading-tight overflow-hidden cursor-pointer border-l-2 shadow-sm',
                            getStatusColor(appt.status),
                            appt.status === 'upcoming'
                              ? 'bg-primary/10 text-card-foreground'
                              : appt.status === 'completed'
                                ? 'bg-emerald/10 text-card-foreground'
                                : 'bg-destructive/10 text-card-foreground'
                          )}
                          style={{
                            top: `${startOffset}px`,
                            height: `${heightPx}px`,
                          }}
                        >
                          <div className="font-bold truncate">
                            {appt.startTime} {appt.doctorName}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Day View (Agenda) ─────────────────────────────────────────────────────

interface DayViewProps {
  date: Date;
  appointments: Appointment[];
  t: (path: string, params?: Record<string, string>) => string;
  theme: ReturnType<typeof getTheme>;
  navigate: (to: string) => void;
}

function DayView({ date, appointments, t, theme, navigate }: DayViewProps) {
  // Sort by start time
  const sorted = useMemo(
    () => [...appointments].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [appointments]
  );

  // Group by status
  const upcoming = sorted.filter((a) => a.status === 'upcoming');
  const completed = sorted.filter((a) => a.status === 'completed');
  const cancelled = sorted.filter((a) => a.status === 'cancelled');

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div
          className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: theme.colors.primary + '15' }}
        >
          <Calendar className="h-7 w-7" style={{ color: theme.colors.primary, opacity: 0.6 }} />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">
          {t('calendar.no_appointments')}
        </p>
        <Button
          size="sm"
          className="mt-4 rounded-xl font-bold gap-1.5"
          style={{ backgroundColor: theme.colors.primary }}
          onClick={() => navigate('/health/book')}
        >
          <Plus className="h-4 w-4" />
          {t('calendar.book_new')}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-6 max-h-[60vh] overflow-y-auto">
      {upcoming.length > 0 && (
        <section>
          <h3
            className="text-xs font-bold uppercase tracking-wider mb-2 px-1"
            style={{ color: theme.colors.primary }}
          >
            {t('calendar.upcoming')}
          </h3>
          <AnimatePresence>
            {upcoming.map((appt, i) => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                t={t}
                theme={theme}
                index={i}
              />
            ))}
          </AnimatePresence>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2 px-1 text-emerald">
            {t('calendar.completed')}
          </h3>
          <AnimatePresence>
            {completed.map((appt, i) => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                t={t}
                theme={theme}
                index={i}
              />
            ))}
          </AnimatePresence>
        </section>
      )}

      {cancelled.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2 px-1 text-destructive">
            {t('calendar.cancelled')}
          </h3>
          <AnimatePresence>
            {cancelled.map((appt, i) => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                t={t}
                theme={theme}
                index={i}
              />
            ))}
          </AnimatePresence>
        </section>
      )}
    </div>
  );
}

// ─── Appointment Card ───────────────────────────────────────────────────────

interface AppointmentCardProps {
  appointment: Appointment;
  t: (path: string, params?: Record<string, string>) => string;
  theme: ReturnType<typeof getTheme>;
  index: number;
}

function AppointmentCard({ appointment, t, theme, index }: AppointmentCardProps) {
  const { startTime, endTime, doctorName, specialty, status, type } = appointment;
  const duration = getAppointmentDuration(appointment);

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl mb-2 border-l-[3px] bg-card shadow-sm transition-shadow hover:shadow-medium',
        getStatusColor(status)
      )}
    >
      {/* Time block */}
      <div className="flex flex-col items-center justify-center shrink-0 min-w-[52px] bg-muted rounded-lg px-2 py-1.5">
        <div className="flex items-center gap-1 text-xs font-bold text-card-foreground">
          <Clock className="h-3 w-3 text-muted-foreground" />
          {startTime}
        </div>
        <div className="text-[10px] text-muted-foreground">{endTime}</div>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-card-foreground truncate">
            Dr(a). {doctorName}
          </span>
          <Badge variant={getStatusBadgeVariant(status)} className="text-[10px] px-1.5 py-0">
            {t(`calendar.${status}`)}
          </Badge>
        </div>

        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span className="font-medium">{specialty}</span>
          <span className="text-muted-foreground">·</span>
          <span className="flex items-center gap-0.5">{getTypeIcon(type)} {type}</span>
        </div>

        <p className="text-[10px] text-muted-foreground mt-0.5">
          {t('calendar.duration', { minutes: String(duration) })}
        </p>
      </div>
    </motion.div>
  );
}
