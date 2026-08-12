/**
 * Health Worker Profile — Worker onboarding + Dashboard
 *
 * Two views:
 *  1. Onboarding wizard (6 steps): basics → profession → credentials → availability → pricing → review
 *  2. After verified: dashboard with:
 *     - Available toggle
 *     - Earnings summary (today/week/month + pending)
 *     - Incoming bookings list with accept/reject/status flow
 *     - Profile preview (how customers see you)
 *
 * Professions: doctor, nurse, midwife, ape, pharmacist, lab_tech,
 *   caregiver, translator, traditional_healer, community_health_worker
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Power, PowerOff, TrendingUp, Calendar, Star, CheckCircle2,
  AlertTriangle, X, Upload, FileText, ShieldCheck, Sparkles,
  Phone, RefreshCw, ChevronRight, ChevronLeft, Award, Briefcase,
  Languages, MapPin, Clock, DollarSign, Stethoscope, Heart,
  Home, Video, Eye, Send, Building2, User, GraduationCap, Wallet,
  Package, Bike, UserCircle,
} from '@/components/icons/lucide-compat';
import { useCountry } from '@/contexts/CountryContext';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  HealthWorker, WorkerBooking, Profession, WorkerOnboardingStep, ServiceType, BookingStatus,
  PROFESSION_LABELS, SERVICE_TYPE_LABELS, BOOKING_STATUS_LABELS,
  DEFAULT_FEES_BY_PROFESSION,
  getMyWorkerProfile, createWorker, updateWorker, updateWorkerProgress,
  toggleWorkerAvailable, uploadWorkerDocument,
  getMyBookingsAsWorker, updateBookingStatus,
  getWorkerEarningsSummary,
  computeBookingFee,
} from '@/services/healthWorkers';
import { cn } from '@/lib/utils';

type View = 'onboarding' | 'dashboard';

const ONBOARDING_STEPS: WorkerOnboardingStep[] = ['basics', 'profession', 'credentials', 'availability', 'pricing', 'review'];

export default function HealthWorkerProfile() {
  const { t, country } = useCountry();
  const { user } = useAuth();
  const [worker, setWorker] = useState<HealthWorker | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('onboarding');
  const [step, setStep] = useState<WorkerOnboardingStep>('basics');

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const w = await getMyWorkerProfile(user.id);
      setWorker(w);
      if (w?.is_verified) setView('dashboard');
      else if (w?.onboarding_step) setStep(w.onboarding_step);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" role="status" aria-busy aria-live="polite">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-600">{t('healthWorkers.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={worker?.is_verified && view === 'dashboard' ? 'min-h-screen bg-slate-950 pb-24' : 'min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 pb-24'}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Back to marketplace */}
        <Link
          to="/health/workers"
          className={cn(
            "inline-flex items-center gap-1.5 text-sm font-medium mb-4 transition-colors",
            view === 'dashboard'
              ? "text-slate-500 hover:text-slate-300"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          {t('healthWorkers.backToMarketplace')}
        </Link>

        {view === 'onboarding' || !worker?.is_verified ? (
          <OnboardingView
            worker={worker}
            step={step}
            setStep={setStep}
            onUpdated={(w) => {
              setWorker(w);
              if (w?.is_verified) setView('dashboard');
            }}
            userId={user?.id ?? ''}
            countryCode={country?.id ?? 'MZ'}
          />
        ) : (
          <DashboardView worker={worker} onUpdated={setWorker} />
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * ONBOARDING VIEW
 * ============================================================ */

function OnboardingView({
  worker,
  step,
  setStep,
  onUpdated,
  userId,
  countryCode,
}: {
  worker: HealthWorker | null;
  step: WorkerOnboardingStep;
  setStep: (s: WorkerOnboardingStep) => void;
  onUpdated: (w: HealthWorker | null) => void;
  userId: string;
  countryCode: string;
}) {
  const { t } = useCountry();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state — initialize from existing worker or defaults
  const [form, setForm] = useState<HealthWorker>(() => ({
    country_code: countryCode,
    full_name: worker?.full_name ?? '',
    bio: worker?.bio ?? '',
    profession: worker?.profession ?? 'doctor',
    specialization: worker?.specialization ?? '',
    years_of_experience: worker?.years_of_experience ?? 0,
    license_number: worker?.license_number ?? '',
    license_url: worker?.license_url,
    id_document_url: worker?.id_document_url,
    certificates: worker?.certificates ?? [],
    is_available: worker?.is_available ?? true,
    home_visits_enabled: worker?.home_visits_enabled ?? false,
    telehealth_enabled: worker?.telehealth_enabled ?? true,
    service_radius_km: worker?.service_radius_km ?? 10,
    base_address: worker?.base_address ?? '',
    service_zones: worker?.service_zones ?? [],
    languages: worker?.languages ?? ['pt'],
    conditions_treated: worker?.conditions_treated ?? [],
    consultation_fee: worker?.consultation_fee ?? DEFAULT_FEES_BY_PROFESSION.doctor.consultation,
    home_visit_fee: worker?.home_visit_fee ?? DEFAULT_FEES_BY_PROFESSION.doctor.home_visit,
    telehealth_fee: worker?.telehealth_fee ?? DEFAULT_FEES_BY_PROFESSION.doctor.telehealth,
    currency: worker?.currency ?? (countryCode === 'AO' ? 'AOA' : 'MZN'),
    onboarding_step: worker?.onboarding_step ?? 'basics',
    onboarding_progress: worker?.onboarding_progress ?? 0,
  }));

  const setField = <K extends keyof HealthWorker>(key: K, value: HealthWorker[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const stepIdx = ONBOARDING_STEPS.indexOf(step);

  const saveAndAdvance = async (nextStep: WorkerOnboardingStep) => {
    if (!userId) return;
    setSubmitting(true);
    setError(null);
    try {
      let w = worker;
      const nextIdx = ONBOARDING_STEPS.indexOf(nextStep);
      const progress = Math.round((nextIdx / ONBOARDING_STEPS.length) * 100);

      if (!w) {
        // Create new
        w = await createWorker(userId, {
          ...form,
          onboarding_step: nextStep,
          onboarding_progress: progress,
        });
      } else {
        // Update existing
        w = await updateWorker(w.id!, {
          ...form,
          onboarding_step: nextStep,
          onboarding_progress: progress,
        });
      }
      onUpdated(w);
      setStep(nextStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Erro ao guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const submitForReview = async () => {
    if (!worker?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      const w = await updateWorker(worker.id, {
        ...form,
        onboarding_step: 'completed',
        onboarding_progress: 100,
      });
      onUpdated(w);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Erro ao submeter');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Hero */}
      <div className="mb-8 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <Briefcase className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {t('healthWorkers.becomeWorkerTitle')}
            </h1>
            <p className="mt-1 text-white/90 text-sm sm:text-base">
              {t('healthWorkers.becomeWorkerHeroBody')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                <DollarSign className="h-3.5 w-3.5" /> {t('healthWorkers.heroEarn80')}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5" /> {t('healthWorkers.heroVerifiedBadge')}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                <Wallet className="h-3.5 w-3.5" /> {t('healthWorkers.heroDailyPayout')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <ol className="mb-8 flex flex-wrap items-center gap-2">
        {ONBOARDING_STEPS.map((s, idx) => {
          const isDone = idx < stepIdx;
          const isCurrent = idx === stepIdx;
          const label = t(`healthWorkers.step${s.charAt(0).toUpperCase() + s.slice(1)}`);
          return (
            <li key={s} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                  isDone ? 'bg-emerald-600 text-white'
                  : isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                  : 'bg-slate-200 text-slate-500'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
              </div>
              <span className={`ml-1.5 mr-2 text-xs font-medium ${isCurrent ? 'text-slate-900' : 'text-slate-500'}`}>
                {label}
              </span>
              {idx < ONBOARDING_STEPS.length - 1 && (
                <ChevronRight className="h-3 w-3 text-slate-300" />
              )}
            </li>
          );
        })}
      </ol>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm" role="alert">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {step === 'basics' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{t('healthWorkers.basicsTitle')}</h2>
            <div>
              <label className="text-sm font-medium text-slate-700">{t('healthWorkers.fullName')} *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setField('full_name', e.target.value)}
                placeholder="Dr. Ana Mucavele"
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">{t('healthWorkers.bio')}</label>
              <textarea
                value={form.bio}
                onChange={(e) => setField('bio', e.target.value)}
                placeholder={t('healthWorkers.bioPlaceholder')}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">{t('healthWorkers.baseAddress')}</label>
              <input
                type="text"
                value={form.base_address}
                onChange={(e) => setField('base_address', e.target.value)}
                placeholder="Av. Julius Nyerere, Maputo"
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">{t('healthWorkers.languages')}</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {['pt', 'en', 'mgh', 'tsn', 'ndh', 'sw', 'fr'].map(l => {
                  const active = form.languages?.includes(l);
                  return (
                    <button
                      key={l}
                      onClick={() => {
                        const langs = new Set(form.languages ?? []);
                        if (active) langs.delete(l); else langs.add(l);
                        setField('languages', Array.from(langs));
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {l.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 'profession' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{t('healthWorkers.professionTitle')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(PROFESSION_LABELS) as Profession[]).map(p => {
                const cfg = PROFESSION_LABELS[p];
                const active = form.profession === p;
                return (
                  <button
                    key={p}
                    onClick={() => {
                      setField('profession', p);
                      // Reset fees to defaults for this profession
                      const dflt = DEFAULT_FEES_BY_PROFESSION[p];
                      setForm(prev => ({
                        ...prev,
                        profession: p,
                        consultation_fee: dflt.consultation,
                        home_visit_fee: dflt.home_visit,
                        telehealth_fee: dflt.telehealth,
                        telehealth_enabled: dflt.telehealth > 0,
                      }));
                    }}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-3 transition ${
                      active ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="text-2xl">{cfg.emoji}</span>
                    <span className="text-xs font-medium text-slate-900 text-center">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">{t('healthWorkers.specialization')}</label>
              <input
                type="text"
                value={form.specialization}
                onChange={(e) => setField('specialization', e.target.value)}
                placeholder="Cardiologia, Pediatria, ..."
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">{t('healthWorkers.yearsExperience')}</label>
              <input
                type="number"
                min={0}
                max={60}
                value={form.years_of_experience ?? 0}
                onChange={(e) => setField('years_of_experience', Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">{t('healthWorkers.conditionsTreated')}</label>
              <input
                type="text"
                value={(form.conditions_treated ?? []).join(', ')}
                onChange={(e) => setField('conditions_treated', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="maternal, pediatric, hypertension"
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <p className="mt-1 text-xs text-slate-500">{t('healthWorkers.conditionsHint')}</p>
            </div>
          </div>
        )}

        {step === 'credentials' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{t('healthWorkers.credentialsTitle')}</h2>
            <div>
              <label className="text-sm font-medium text-slate-700">{t('healthWorkers.licenseNumber')}</label>
              <input
                type="text"
                value={form.license_number ?? ''}
                onChange={(e) => setField('license_number', e.target.value)}
                placeholder="OMM-4521 / OE-22310"
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <DocumentUpload
              label={t('healthWorkers.licenseDoc')}
              userId={userId}
              docType="license"
              currentUrl={form.license_url}
              onUploaded={(url) => setField('license_url', url)}
            />
            <DocumentUpload
              label={t('healthWorkers.idDoc')}
              userId={userId}
              docType="id"
              currentUrl={form.id_document_url}
              onUploaded={(url) => setField('id_document_url', url)}
            />
            <DocumentUpload
              label={t('healthWorkers.profilePhoto')}
              userId={userId}
              docType="photo"
              currentUrl={form.profile_photo_url}
              onUploaded={(url) => setField('profile_photo_url', url)}
            />
            <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
              <ShieldCheck className="inline h-3.5 w-3.5 mr-1" />
              {t('healthWorkers.credentialsHint')}
            </div>
          </div>
        )}

        {step === 'availability' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{t('healthWorkers.availabilityTitle')}</h2>
            <div className="space-y-2">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={form.telehealth_enabled ?? false}
                  onChange={(e) => setField('telehealth_enabled', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <Video className="h-4 w-4 text-cyan-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{t('healthWorkers.telehealthEnabled')}</p>
                  <p className="text-xs text-slate-600">{t('healthWorkers.telehealthEnabledHint')}</p>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={form.home_visits_enabled ?? false}
                  onChange={(e) => setField('home_visits_enabled', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <Home className="h-4 w-4 text-rose-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{t('healthWorkers.homeVisitsEnabled')}</p>
                  <p className="text-xs text-slate-600">{t('healthWorkers.homeVisitsEnabledHint')}</p>
                </div>
              </label>
            </div>
            {(form.home_visits_enabled) && (
              <div>
                <label className="text-sm font-medium text-slate-700">
                  {t('healthWorkers.serviceRadius')} ({form.service_radius_km} km)
                </label>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={form.service_radius_km ?? 10}
                  onChange={(e) => setField('service_radius_km', Number(e.target.value))}
                  className="mt-2 w-full"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-700">{t('healthWorkers.serviceZones')}</label>
              <input
                type="text"
                value={(form.service_zones ?? []).join(', ')}
                onChange={(e) => setField('service_zones', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="Maputo Cidade, Matola, Boane"
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <p className="mt-1 text-xs text-slate-500">{t('healthWorkers.serviceZonesHint')}</p>
            </div>
          </div>
        )}

        {step === 'pricing' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{t('healthWorkers.pricingTitle')}</h2>
            <p className="text-sm text-slate-600">{t('healthWorkers.pricingHint')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">{t('healthWorkers.consultationFee')}</label>
                <div className="mt-1 relative">
                  <input
                    type="number"
                    min={0}
                    value={form.consultation_fee ?? 0}
                    onChange={(e) => setField('consultation_fee', Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-3 pr-12 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                    {form.currency}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">{t('healthWorkers.homeVisitFee')}</label>
                <div className="mt-1 relative">
                  <input
                    type="number"
                    min={0}
                    value={form.home_visit_fee ?? 0}
                    onChange={(e) => setField('home_visit_fee', Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-3 pr-12 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                    {form.currency}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">{t('healthWorkers.telehealthFee')}</label>
                <div className="mt-1 relative">
                  <input
                    type="number"
                    min={0}
                    value={form.telehealth_fee ?? 0}
                    onChange={(e) => setField('telehealth_fee', Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-3 pr-12 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                    {form.currency}
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
              <DollarSign className="inline h-3.5 w-3.5 mr-1" />
              {t('healthWorkers.earningSplitInfo')}
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{t('healthWorkers.reviewTitle')}</h2>
            <p className="text-sm text-slate-600">{t('healthWorkers.reviewBody')}</p>

            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
              <ReviewRow label={t('healthWorkers.fullName')} value={form.full_name} />
              <ReviewRow label={t('healthWorkers.profession')} value={`${PROFESSION_LABELS[form.profession].emoji} ${PROFESSION_LABELS[form.profession].label}`} />
              <ReviewRow label={t('healthWorkers.specialization')} value={form.specialization} />
              <ReviewRow label={t('healthWorkers.yearsExperience')} value={`${form.years_of_experience} anos`} />
              <ReviewRow label={t('healthWorkers.languages')} value={(form.languages ?? []).map(l => l.toUpperCase()).join(', ')} />
              <ReviewRow label={t('healthWorkers.serviceZones')} value={(form.service_zones ?? []).join(', ')} />
              <ReviewRow label={t('healthWorkers.consultationFee')} value={`${form.consultation_fee} ${form.currency}`} />
              <ReviewRow label={t('healthWorkers.telehealthFee')} value={`${form.telehealth_fee} ${form.currency}`} />
              <ReviewRow label={t('healthWorkers.homeVisitFee')} value={`${form.home_visit_fee} ${form.currency}`} />
              <ReviewRow label={t('healthWorkers.licenseNumber')} value={form.license_number ?? '—'} />
              <ReviewRow label={t('healthWorkers.licenseDoc')} value={form.license_url ? t('healthWorkers.uploaded') : t('healthWorkers.notUploaded')} />
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <Sparkles className="inline h-3.5 w-3.5 mr-1" />
              {t('healthWorkers.reviewSubmitInfo')}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
          {stepIdx > 0 ? (
            <button
              onClick={() => setStep(ONBOARDING_STEPS[stepIdx - 1])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('healthWorkers.back')}
            </button>
          ) : <div />}

          {step !== 'review' ? (
            <button
              onClick={() => saveAndAdvance(ONBOARDING_STEPS[stepIdx + 1])}
              disabled={submitting || (step === 'basics' && !form.full_name)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              {t('healthWorkers.next')}
            </button>
          ) : (
            <button
              onClick={submitForReview}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t('healthWorkers.submitForReview')}
            </button>
          )}
        </div>
      </div>

      {/* Pending review notice */}
      {worker?.onboarding_step === 'completed' && !worker?.is_verified && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
          role="status"
        >
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('healthWorkers.pendingReviewTitle')}</p>
              <p className="text-sm mt-1">{t('healthWorkers.pendingReviewBody')}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Rejection notice */}
      {worker?.rejection_reason && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900" role="alert">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('healthWorkers.rejectedTitle')}</p>
              <p className="text-sm mt-1">{worker.rejection_reason}</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900 text-right">{value || '—'}</span>
    </div>
  );
}

function DocumentUpload({
  label,
  userId,
  docType,
  currentUrl,
  onUploaded,
}: {
  label: string;
  userId: string;
  docType: 'license' | 'id' | 'photo';
  currentUrl?: string;
  onUploaded: (url: string) => void;
}) {
  const { t } = useCountry();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadWorkerDocument(userId, docType, file);
      onUploaded(url);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Erro no upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <label className="mt-1 block cursor-pointer">
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="sr-only"
        />
        <div
          className={`rounded-xl border-2 border-dashed p-4 text-center transition ${
            currentUrl ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400'
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-blue-700">
              <RefreshCw className="h-4 w-4 animate-spin" />
              {t('healthWorkers.uploading')}
            </div>
          ) : currentUrl ? (
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {t('healthWorkers.uploaded')}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-slate-500">
              <Upload className="h-5 w-5" />
              <span className="text-xs">{t('healthWorkers.uploadDoc')}</span>
            </div>
          )}
        </div>
      </label>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

/* ============================================================
 * DASHBOARD VIEW (verified worker)
 * ============================================================ */

function DashboardView({
  worker,
  onUpdated,
}: {
  worker: HealthWorker;
  onUpdated: (w: HealthWorker) => void;
}) {
  const { t } = useCountry();
  const [bookings, setBookings] = useState<WorkerBooking[]>([]);
  const [earnings, setEarnings] = useState<{ today_count: number; today_earnings: number; week_count: number; week_earnings: number; month_count: number; month_earnings: number; pending_payout: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'incoming' | 'history'>('incoming');

  const load = useCallback(async () => {
    if (!worker.id) return;
    setLoading(true);
    try {
      const [b, e] = await Promise.all([
        getMyBookingsAsWorker(worker.id),
        getWorkerEarningsSummary(worker.id),
      ]);
      setBookings(b);
      setEarnings(e);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [worker.id]);

  useEffect(() => { load(); }, [load]);

  const toggleAvailable = async () => {
    if (!worker.id) return;
    try {
      await toggleWorkerAvailable(worker.id, !worker.is_available);
      onUpdated({ ...worker, is_available: !worker.is_available });
    } catch (e: any) {
      console.error(e);
    }
  };

  const incoming = bookings.filter(b => b.status === 'requested' || b.status === 'confirmed' || b.status === 'in_progress');
  const history = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled' || b.status === 'no_show');

  const handleBookingAction = async (bookingId: string, status: BookingStatus) => {
    try {
      await updateBookingStatus(bookingId, status);
      await load();
    } catch (e: any) {
      console.error(e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* 1 ── Profile header */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 border-2 border-purple-500/40 text-4xl">
          {PROFESSION_LABELS[worker.profession].emoji}
        </div>
        <h1 className="mt-3 text-xl font-bold text-white">{worker.full_name}</h1>
        <p className="text-sm text-slate-400">{PROFESSION_LABELS[worker.profession].label}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-medium text-purple-300">
            <Star className="h-3 w-3 fill-purple-400 text-purple-400" />
            {(worker.rating ?? 5).toFixed(1)}
          </span>
          {worker.is_verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
              <ShieldCheck className="h-3 w-3" />
              {t('healthWorkers.verified')}
            </span>
          )}
        </div>
      </div>

      {/* 2 ── Big availability toggle */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={toggleAvailable}
        className={`w-full mb-6 rounded-2xl p-4 flex items-center justify-center gap-3 text-lg font-bold transition-all ${
          worker.is_available
            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
            : 'bg-slate-800 text-slate-500 border border-slate-700'
        }`}
      >
        {worker.is_available ? <Power className="h-6 w-6" /> : <PowerOff className="h-6 w-6" />}
        {worker.is_available ? 'DISPONÍVEL' : 'INDISPONÍVEL'}
      </motion.button>

      {/* 3 ── Earnings: 3 tiles (today / week / month) */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium text-slate-500">{t('healthWorkers.today')}</span>
          </div>
          <p className="mt-2 text-xl font-bold text-white">
            {(earnings?.today_earnings ?? 0).toLocaleString('pt-MZ')}
            <span className="ml-1 text-[10px] font-medium text-slate-500">{worker.currency ?? 'MZN'}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">{(earnings?.today_count ?? 0)} {(earnings?.today_count ?? 0) === 1 ? 'reserva' : 'reservas'}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
              <Calendar className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium text-slate-500">{t('healthWorkers.week')}</span>
          </div>
          <p className="mt-2 text-xl font-bold text-white">
            {(earnings?.week_earnings ?? 0).toLocaleString('pt-MZ')}
            <span className="ml-1 text-[10px] font-medium text-slate-500">{worker.currency ?? 'MZN'}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">{(earnings?.week_count ?? 0)} {(earnings?.week_count ?? 0) === 1 ? 'reserva' : 'reservas'}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
              <Award className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium text-slate-500">{t('healthWorkers.month')}</span>
          </div>
          <p className="mt-2 text-xl font-bold text-white">
            {(earnings?.month_earnings ?? 0).toLocaleString('pt-MZ')}
            <span className="ml-1 text-[10px] font-medium text-slate-500">{worker.currency ?? 'MZN'}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">{(earnings?.month_count ?? 0)} {(earnings?.month_count ?? 0) === 1 ? 'reserva' : 'reservas'}</p>
        </div>
      </div>

      {/* 4 ── Incoming Requests */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">{t('healthWorkers.tabIncoming')}</h2>
          {incoming.length > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-600 px-1.5 text-[10px] font-bold text-white">
              {incoming.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center" role="status" aria-busy aria-live="polite">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-purple-500" />
            <p className="mt-2 text-sm text-slate-500">{t('healthWorkers.loading')}</p>
          </div>
        ) : incoming.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <Calendar className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-2 text-sm text-slate-500">{t('healthWorkers.noIncomingBookings')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {incoming.map((b, idx) => (
              <WorkerBookingCard
                key={b.id ?? idx}
                booking={b}
                onAction={handleBookingAction}
              />
            ))}
          </div>
        )}

        {/* History (collapsible) */}
        {history.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors">
              {t('healthWorkers.tabHistory')} ({history.length})
            </summary>
            <div className="mt-3 space-y-3">
              {history.map((b, idx) => (
                <WorkerBookingCard
                  key={b.id ?? idx}
                  booking={b}
                  onAction={handleBookingAction}
                />
              ))}
            </div>
          </details>
        )}
      </div>

      {/* 5 ── Quick Actions: 4-icon grid */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        <Link to="/health/workers/profile" className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-slate-400 transition hover:border-purple-500/40 hover:text-purple-400">
          <UserCircle className="h-5 w-5" />
          <span className="text-[10px] font-medium">{t('healthWorkers.myProfile') ?? 'Meu Perfil'}</span>
        </Link>
        <Link to="/health/workers" className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-slate-400 transition hover:border-purple-500/40 hover:text-purple-400">
          <Briefcase className="h-5 w-5" />
          <span className="text-[10px] font-medium">{t('healthWorkers.marketplace') ?? 'Marketplace'}</span>
        </Link>
        <Link to="/health/riders" className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-slate-400 transition hover:border-purple-500/40 hover:text-purple-400">
          <Bike className="h-5 w-5" />
          <span className="text-[10px] font-medium">{t('ecosystem.health_worker.requestRider') ?? 'Pedir Rider'}</span>
        </Link>
        <Link to="/wallet" className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-slate-400 transition hover:border-purple-500/40 hover:text-purple-400">
          <Wallet className="h-5 w-5" />
          <span className="text-[10px] font-medium">{t('roleHome.worker.wallet') ?? 'Carteira'}</span>
        </Link>
      </div>

      {/* 6 ── Trust Strip: 3 badges */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-center">
          <ShieldCheck className="mx-auto h-5 w-5 text-purple-400" />
          <p className="mt-1.5 text-[10px] font-medium text-slate-400">{t('healthWorkers.trustVerifiedWorker')}</p>
        </div>
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-center">
          <Wallet className="mx-auto h-5 w-5 text-purple-400" />
          <p className="mt-1.5 text-[10px] font-medium text-slate-400">{t('healthWorkers.trustDailyPayout')}</p>
        </div>
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 text-center">
          <Award className="mx-auto h-5 w-5 text-purple-400" />
          <p className="mt-1.5 text-[10px] font-medium text-slate-400">{t('healthWorkers.trustFiveStarBonus')}</p>
        </div>
      </div>
    </motion.div>
  );
}

function EarningsTile({
  label, count, amount, currency, color, icon, hideCount,
}: {
  label: string; count: number; amount: number; currency: string; color: string; icon: React.ReactNode; hideCount?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-2">
        <div className={`inline-flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400`}>
          {icon}
        </div>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold text-white">
        {amount.toLocaleString('pt-MZ')}
        <span className="ml-1 text-xs font-medium text-slate-500">{currency}</span>
      </p>
      {!hideCount && (
        <p className="text-[11px] text-slate-500 mt-0.5">
          {count} {count === 1 ? 'reserva' : 'reservas'}
        </p>
      )}
    </div>
  );
}

function WorkerBookingCard({
  booking,
  onAction,
}: {
  booking: WorkerBooking;
  onAction: (bookingId: string, status: BookingStatus) => void;
}) {
  const { t } = useCountry();
  const status = BOOKING_STATUS_LABELS[booking.status];
  const svc = SERVICE_TYPE_LABELS[booking.service_type];
  const scheduled = new Date(booking.scheduled_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-xl">
          {svc.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-white text-sm truncate">{booking.customer_name}</p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-800 text-slate-300`}>
              {status.label}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {svc.label} · {scheduled.toLocaleString('pt-MZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </p>
          {booking.reason && (
            <p className="text-xs text-slate-400 mt-1 italic">"{booking.reason}"</p>
          )}
          {booking.address && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{booking.address}</span>
            </p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="font-bold text-purple-300">
              +{booking.worker_earnings.toLocaleString('pt-MZ')} {booking.currency ?? 'MZN'}
            </span>
            <span className="text-slate-500">{booking.duration_minutes ?? 30} min</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-800 pt-3">
        {booking.status === 'requested' && (
          <>
            <button
              onClick={() => booking.id && onAction(booking.id, 'confirmed')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t('healthWorkers.confirm')}
            </button>
            <button
              onClick={() => booking.id && onAction(booking.id, 'cancelled')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-slate-800"
            >
              <X className="h-3.5 w-3.5" />
              {t('healthWorkers.reject')}
            </button>
          </>
        )}
        {booking.status === 'confirmed' && (
          <button
            onClick={() => booking.id && onAction(booking.id, 'in_progress')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
          >
            <Phone className="h-3.5 w-3.5" />
            {t('healthWorkers.startSession')}
          </button>
        )}
        {booking.status === 'in_progress' && (
          <button
            onClick={() => booking.id && onAction(booking.id, 'completed')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('healthWorkers.markCompleted')}
          </button>
        )}
        {booking.status === 'completed' && booking.rating && (
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {booking.rating}/5
            {booking.rating_comment && (
              <span className="ml-2 italic text-slate-500 truncate">"{booking.rating_comment}"</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
