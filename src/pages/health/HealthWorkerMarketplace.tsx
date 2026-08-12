/**
 * Health Worker Marketplace — Yango-style booking of healthcare professionals
 *
 * Flow (customer):
 *   - Browse verified workers by profession / filter / search
 *   - Click worker → open detail drawer with bio, fees, ratings
 *   - Choose service type (telehealth / home_visit / clinic / caregiver / translation)
 *   - Schedule + reason + symptoms → confirm booking
 *   - "My bookings" tab tracks status: requested → confirmed → in_progress → completed → rated
 *
 * Professions: doctor, nurse, midwife, ape, pharmacist, lab_tech,
 *   caregiver, translator, traditional_healer, community_health_worker
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, Star, Clock, Languages, ShieldCheck, Sparkles,
  Phone, X, Calendar, ChevronRight, CheckCircle2, AlertTriangle,
  RefreshCw, TrendingUp, Award, Heart, Stethoscope, Home, Video,
  FileText, ArrowRight, Filter, User, Briefcase, Send, Eye,
} from '@/components/icons/lucide-compat';
import { useCountry } from '@/contexts/CountryContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  HealthWorker, WorkerBooking, Profession, ServiceType, BookingStatus,
  PROFESSION_LABELS, SERVICE_TYPE_LABELS, BOOKING_STATUS_LABELS,
  DEFAULT_FEES_BY_PROFESSION, computeBookingFee,
  searchWorkers, getMyBookingsAsCustomer, createBooking, cancelBooking, rateBooking,
  MOCK_WORKERS,
} from '@/services/healthWorkers';
import { Link } from 'react-router-dom';

type Tab = 'browse' | 'bookings';

export default function HealthWorkerMarketplace() {
  const { t, country } = useCountry();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('browse');
  const [workers, setWorkers] = useState<HealthWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [professionFilter, setProfessionFilter] = useState<Profession | 'all'>('all');
  const [homeVisitsOnly, setHomeVisitsOnly] = useState(false);
  const [telehealthOnly, setTelehealthOnly] = useState(false);

  // Bookings
  const [bookings, setBookings] = useState<WorkerBooking[]>([]);

  // Booking modal
  const [selectedWorker, setSelectedWorker] = useState<HealthWorker | null>(null);
  const [bookingServiceType, setBookingServiceType] = useState<ServiceType>('telehealth');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingAddress, setBookingAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadWorkers = useCallback(async () => {
    if (!country?.id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await searchWorkers(country.id, {
        profession: professionFilter === 'all' ? undefined : professionFilter,
        home_visits_only: homeVisitsOnly,
        telehealth_only: telehealthOnly,
        limit: 30,
      });
      if (result.length === 0) {
        // Fall back to mock workers for demo / offline
        setWorkers(MOCK_WORKERS.filter(w => w.country_code === country.id));
      } else {
        setWorkers(result);
      }
    } catch (e: any) {
      console.error('searchWorkers error', e);
      setError(e?.message ?? 'Erro ao carregar profissionais');
      setWorkers(MOCK_WORKERS.filter(w => w.country_code === country.id));
    } finally {
      setLoading(false);
    }
  }, [country?.id, professionFilter, homeVisitsOnly, telehealthOnly]);

  const loadBookings = useCallback(async () => {
    if (!user?.id) return;
    try {
      const result = await getMyBookingsAsCustomer(user.id);
      setBookings(result);
    } catch (e: any) {
      console.error('getMyBookings error', e);
      setBookings([]);
    }
  }, [user?.id]);

  useEffect(() => { loadWorkers(); }, [loadWorkers]);
  useEffect(() => { if (tab === 'bookings') loadBookings(); }, [tab, loadBookings]);

  const filteredWorkers = useMemo(() => {
    if (!search.trim()) return workers;
    const q = search.toLowerCase();
    return workers.filter(w =>
      w.full_name.toLowerCase().includes(q) ||
      (w.specialization ?? '').toLowerCase().includes(q) ||
      (w.bio ?? '').toLowerCase().includes(q)
    );
  }, [workers, search]);

  const openBookingModal = (worker: HealthWorker) => {
    setSelectedWorker(worker);
    setBookingServiceType(worker.telehealth_enabled ? 'telehealth' : 'clinic_consultation');
    setBookingDate('');
    setBookingTime('');
    setBookingReason('');
    setBookingAddress('');
  };

  const closeBookingModal = () => {
    setSelectedWorker(null);
  };

  const submitBooking = async () => {
    if (!user?.id || !selectedWorker || !bookingDate || !bookingTime) return;
    setSubmitting(true);
    try {
      const scheduledAt = new Date(`${bookingDate}T${bookingTime}:00`).toISOString();
      const fees = computeBookingFee(bookingServiceType, selectedWorker);
      await createBooking(user.id, {
        worker_id: selectedWorker.id,
        customer_name: user.user_metadata?.full_name ?? user.email ?? 'Cliente',
        customer_phone: user.user_metadata?.phone ?? '',
        country_code: selectedWorker.country_code,
        service_type: bookingServiceType,
        scheduled_at: scheduledAt,
        duration_minutes: 30,
        address: bookingServiceType === 'home_visit' ? bookingAddress : undefined,
        reason: bookingReason,
        fee: fees.fee,
        worker_earnings: fees.worker_earnings,
        platform_fee: fees.platform_fee,
        currency: selectedWorker.currency ?? 'MZN',
        payment_status: 'pending',
      });
      closeBookingModal();
      setTab('bookings');
      await loadBookings();
    } catch (e: any) {
      console.error('submitBooking error', e);
      setError(e?.message ?? 'Erro ao criar reserva');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (bookingId: string, reason: string) => {
    if (!user?.id) return;
    try {
      await cancelBooking(bookingId, user.id, reason);
      await loadBookings();
    } catch (e: any) {
      console.error('cancelBooking error', e);
    }
  };

  const handleRate = async (bookingId: string, rating: number, comment: string) => {
    try {
      await rateBooking(bookingId, rating, comment);
      await loadBookings();
    } catch (e: any) {
      console.error('rateBooking error', e);
    }
  };

  const professions: (Profession | 'all')[] = [
    'all', 'doctor', 'nurse', 'midwife', 'ape', 'pharmacist',
    'caregiver', 'translator', 'traditional_healer', 'community_health_worker',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 p-6 sm:p-8 text-white shadow-xl"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <Briefcase className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {t('healthWorkers.marketplaceTitle')}
              </h1>
              <p className="mt-1 text-white/90 text-sm sm:text-base">
                {t('healthWorkers.marketplaceSubtitle')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                  <ShieldCheck className="h-3.5 w-3.5" /> {t('healthWorkers.trustVerified')}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                  <Star className="h-3.5 w-3.5" /> {t('healthWorkers.trustRatings')}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                  <Heart className="h-3.5 w-3.5" /> {t('healthWorkers.trustLocal')}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Become a worker CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm sm:text-base">
                {t('healthWorkers.becomeWorkerTitle')}
              </p>
              <p className="text-xs text-slate-600">
                {t('healthWorkers.becomeWorkerBody')}
              </p>
            </div>
          </div>
          <Link
            to="/health/workers/profile"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            {t('healthWorkers.becomeWorkerCta')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        {/* Tabs */}
        <div className="mb-6 inline-flex rounded-xl bg-slate-100 p-1" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'browse'}
            onClick={() => setTab('browse')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              tab === 'browse' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('healthWorkers.tabBrowse')}
          </button>
          <button
            role="tab"
            aria-selected={tab === 'bookings'}
            onClick={() => setTab('bookings')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              tab === 'bookings' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('healthWorkers.tabBookings')}
            {bookings.filter(b => b.status === 'requested' || b.status === 'confirmed').length > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">
                {bookings.filter(b => b.status === 'requested' || b.status === 'confirmed').length}
              </span>
            )}
          </button>
        </div>

        {/* BROWSE TAB */}
        {tab === 'browse' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            role="tabpanel"
          >
            {/* Filters */}
            <div className="mb-6 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('healthWorkers.searchPlaceholder')}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {professions.map((p) => {
                  const isActive = professionFilter === p;
                  const label = p === 'all' ? t('healthWorkers.filterAll') : PROFESSION_LABELS[p].label;
                  const emoji = p === 'all' ? '🌐' : PROFESSION_LABELS[p].emoji;
                  return (
                    <button
                      key={p}
                      onClick={() => setProfessionFilter(p)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span aria-hidden>{emoji}</span>
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={homeVisitsOnly}
                    onChange={(e) => setHomeVisitsOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Home className="h-3.5 w-3.5" />
                  {t('healthWorkers.filterHomeVisits')}
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={telehealthOnly}
                    onChange={(e) => setTelehealthOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Video className="h-3.5 w-3.5" />
                  {t('healthWorkers.filterTelehealth')}
                </label>
                <button
                  onClick={() => loadWorkers()}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t('healthWorkers.refresh')}
                </button>
              </div>
            </div>

            {/* Loading skeleton */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="status" aria-busy aria-live="polite">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-slate-200" />
                      <div className="flex-1">
                        <div className="h-4 w-2/3 bg-slate-200 rounded mb-1" />
                        <div className="h-3 w-1/2 bg-slate-200 rounded" />
                      </div>
                    </div>
                    <div className="mt-3 h-3 w-full bg-slate-100 rounded" />
                    <div className="mt-2 h-3 w-3/4 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800" role="alert">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{t('healthWorkers.errorTitle')}</p>
                    <p className="text-sm mt-1">{error}</p>
                    <p className="text-xs mt-2 text-amber-700">{t('healthWorkers.usingMockData')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && filteredWorkers.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <Search className="h-7 w-7 text-slate-400" />
                </div>
                <p className="mt-4 font-medium text-slate-900">{t('healthWorkers.noWorkersTitle')}</p>
                <p className="mt-1 text-sm text-slate-600">{t('healthWorkers.noWorkersBody')}</p>
              </div>
            )}

            {/* Workers grid */}
            {!loading && filteredWorkers.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWorkers.map((w, idx) => (
                  <motion.div
                    key={w.id ?? `mock-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-blue-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 text-2xl">
                        {PROFESSION_LABELS[w.profession].emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{w.full_name}</p>
                        <p className="text-xs text-slate-600 truncate">{w.specialization}</p>
                        <div className="mt-1 flex items-center gap-1 text-xs">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span className="font-medium text-amber-700">{(w.rating ?? 5).toFixed(1)}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500">{w.total_bookings ?? 0} {t('healthWorkers.bookingsCount')}</span>
                        </div>
                      </div>
                    </div>

                    {w.bio && (
                      <p className="mt-3 text-xs text-slate-600 line-clamp-2">{w.bio}</p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${PROFESSION_LABELS[w.profession].color}`}>
                        {PROFESSION_LABELS[w.profession].label}
                      </span>
                      {w.home_visits_enabled && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                          <Home className="h-2.5 w-2.5" /> {t('healthWorkers.homeVisit')}
                        </span>
                      )}
                      {w.telehealth_enabled && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-medium text-cyan-700">
                          <Video className="h-2.5 w-2.5" /> {t('healthWorkers.telehealth')}
                        </span>
                      )}
                    </div>

                    {w.service_zones && w.service_zones.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{w.service_zones.join(', ')}</span>
                      </div>
                    )}

                    <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-3">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t('healthWorkers.from')}</p>
                        <p className="text-sm font-bold text-slate-900">
                          {Math.min(
                            w.telehealth_fee ?? Infinity,
                            w.consultation_fee ?? Infinity,
                            w.home_visit_fee ?? Infinity,
                          ).toLocaleString('pt-MZ')} {w.currency ?? 'MZN'}
                        </p>
                      </div>
                      <button
                        onClick={() => openBookingModal(w)}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      >
                        {t('healthWorkers.book')}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* BOOKINGS TAB */}
        {tab === 'bookings' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            role="tabpanel"
          >
            {bookings.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <Calendar className="h-7 w-7 text-slate-400" />
                </div>
                <p className="mt-4 font-medium text-slate-900">{t('healthWorkers.noBookingsTitle')}</p>
                <p className="mt-1 text-sm text-slate-600">{t('healthWorkers.noBookingsBody')}</p>
                <button
                  onClick={() => setTab('browse')}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  {t('healthWorkers.browseWorkers')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b, idx) => (
                  <BookingCard
                    key={b.id ?? idx}
                    booking={b}
                    onCancel={(reason) => b.id && handleCancel(b.id, reason)}
                    onRate={(rating, comment) => b.id && handleRate(b.id, rating, comment)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Booking modal */}
      <AnimatePresence>
        {selectedWorker && (
          <BookingModal
            worker={selectedWorker}
            serviceType={bookingServiceType}
            setServiceType={setBookingServiceType}
            date={bookingDate}
            setDate={setBookingDate}
            time={bookingTime}
            setTime={setBookingTime}
            reason={bookingReason}
            setReason={setBookingReason}
            address={bookingAddress}
            setAddress={setBookingAddress}
            submitting={submitting}
            onClose={closeBookingModal}
            onSubmit={submitBooking}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
 * Booking card
 * ============================================================ */

function BookingCard({
  booking,
  onCancel,
  onRate,
}: {
  booking: WorkerBooking;
  onCancel: (reason: string) => void;
  onRate: (rating: number, comment: string) => void;
}) {
  const { t } = useCountry();
  const [showRateModal, setShowRateModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);

  const status = BOOKING_STATUS_LABELS[booking.status];
  const svc = SERVICE_TYPE_LABELS[booking.service_type];

  const scheduled = new Date(booking.scheduled_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl">
          {svc.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-900 text-sm truncate">
              {svc.label}
            </p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            {scheduled.toLocaleString('pt-MZ', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
          {booking.reason && (
            <p className="text-xs text-slate-600 mt-1 italic">"{booking.reason}"</p>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-700">
            <span className="font-medium">
              {booking.fee.toLocaleString('pt-MZ')} {booking.currency ?? 'MZN'}
            </span>
            {booking.payment_status && (
              <span className={
                booking.payment_status === 'paid' ? 'text-emerald-600 font-medium' :
                booking.payment_status === 'pending' ? 'text-amber-600 font-medium' :
                'text-rose-600 font-medium'
              }>
                {booking.payment_status === 'paid' ? t('healthWorkers.paid') :
                 booking.payment_status === 'pending' ? t('healthWorkers.paymentPending') :
                 t('healthWorkers.paymentFailed')}
              </span>
            )}
          </div>
        </div>
      </div>

      {booking.address && (
        <div className="mt-2 flex items-center gap-1 text-xs text-slate-600">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{booking.address}</span>
        </div>
      )}

      {booking.status === 'completed' && !booking.rating && (
        <button
          onClick={() => setShowRateModal(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-200"
        >
          <Star className="h-3.5 w-3.5" />
          {t('healthWorkers.rateBooking')}
        </button>
      )}

      {booking.rating && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map(s => (
              <Star
                key={s}
                className={`h-3.5 w-3.5 ${s <= (booking.rating ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
              />
            ))}
          </div>
          {booking.rating_comment && (
            <span className="text-xs text-slate-700 italic truncate">"{booking.rating_comment}"</span>
          )}
        </div>
      )}

      {(booking.status === 'requested' || booking.status === 'confirmed') && (
        <button
          onClick={() => setShowCancel(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
        >
          <X className="h-3.5 w-3.5" />
          {t('healthWorkers.cancelBooking')}
        </button>
      )}

      {/* Rate modal */}
      <AnimatePresence>
        {showRateModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowRateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-slate-900">{t('healthWorkers.rateBookingTitle')}</h3>
              <div className="mt-4 flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    onClick={() => setRating(s)}
                    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                    aria-label={`${s} estrelas`}
                  >
                    <Star className={`h-8 w-8 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('healthWorkers.commentPlaceholder')}
                rows={3}
                className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setShowRateModal(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  {t('healthWorkers.cancel')}
                </button>
                <button
                  onClick={() => {
                    onRate(rating, comment);
                    setShowRateModal(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                >
                  <Send className="h-4 w-4" />
                  {t('healthWorkers.submit')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancel modal */}
      <AnimatePresence>
        {showCancel && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowCancel(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-slate-900">{t('healthWorkers.cancelTitle')}</h3>
              <p className="mt-1 text-sm text-slate-600">{t('healthWorkers.cancelBody')}</p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t('healthWorkers.cancelReasonPlaceholder')}
                rows={3}
                className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setShowCancel(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  {t('healthWorkers.cancel')}
                </button>
                <button
                  onClick={() => {
                    onCancel(cancelReason || 'Cancelado pelo cliente');
                    setShowCancel(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  <X className="h-4 w-4" />
                  {t('healthWorkers.confirmCancel')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ============================================================
 * Booking modal — pick service type + schedule + reason
 * ============================================================ */

function BookingModal({
  worker,
  serviceType,
  setServiceType,
  date,
  setDate,
  time,
  setTime,
  reason,
  setReason,
  address,
  setAddress,
  submitting,
  onClose,
  onSubmit,
}: {
  worker: HealthWorker;
  serviceType: ServiceType;
  setServiceType: (s: ServiceType) => void;
  date: string;
  setDate: (d: string) => void;
  time: string;
  setTime: (t: string) => void;
  reason: string;
  setReason: (r: string) => void;
  address: string;
  setAddress: (a: string) => void;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const { t } = useCountry();

  const availableServices: ServiceType[] = [];
  if (worker.telehealth_enabled) availableServices.push('telehealth');
  availableServices.push('clinic_consultation');
  if (worker.home_visits_enabled) availableServices.push('home_visit');
  if (worker.profession === 'translator') availableServices.push('translation');
  if (worker.profession === 'caregiver') availableServices.push('caregiver_session');

  const fees = computeBookingFee(serviceType, worker);
  const minDate = new Date(Date.now() + 3600000).toISOString().split('T')[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 text-2xl">
              {PROFESSION_LABELS[worker.profession].emoji}
            </div>
            <div>
              <p className="font-bold text-slate-900">{worker.full_name}</p>
              <p className="text-xs text-slate-600">{worker.specialization}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('healthWorkers.close')}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Service type */}
        <div className="mt-5">
          <p className="text-sm font-semibold text-slate-900">{t('healthWorkers.serviceType')}</p>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup">
            {availableServices.map(s => {
              const cfg = SERVICE_TYPE_LABELS[s];
              const isActive = serviceType === s;
              return (
                <button
                  key={s}
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setServiceType(s)}
                  className={`flex items-start gap-2 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="text-lg" aria-hidden>{cfg.emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{cfg.label}</p>
                    <p className="text-[11px] text-slate-600">{cfg.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date / time */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-slate-900">{t('healthWorkers.date')}</label>
            <input
              type="date"
              min={minDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-900">{t('healthWorkers.time')}</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        {/* Address (if home visit) */}
        {(serviceType === 'home_visit' || serviceType === 'caregiver_session') && (
          <div className="mt-4">
            <label className="text-sm font-semibold text-slate-900">{t('healthWorkers.address')}</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('healthWorkers.addressPlaceholder')}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        )}

        {/* Reason */}
        <div className="mt-4">
          <label className="text-sm font-semibold text-slate-900">{t('healthWorkers.reason')}</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('healthWorkers.reasonPlaceholder')}
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* Fee summary */}
        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">{t('healthWorkers.fee')}</span>
            <span className="font-bold text-slate-900">
              {fees.fee.toLocaleString('pt-MZ')} {worker.currency ?? 'MZN'}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>{t('healthWorkers.platformFee')}</span>
            <span>{fees.platform_fee.toLocaleString('pt-MZ')} {worker.currency ?? 'MZN'}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>{t('healthWorkers.workerEarns')}</span>
            <span className="font-medium text-emerald-700">{fees.worker_earnings.toLocaleString('pt-MZ')} {worker.currency ?? 'MZN'}</span>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={onSubmit}
          disabled={!date || !time || submitting}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {submitting ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              {t('healthWorkers.submitting')}
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              {t('healthWorkers.confirmBooking')}
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
