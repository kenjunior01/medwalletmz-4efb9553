/**
 * Admin Verification Workflow
 *
 * Page for admins/regional_ceo/regional_manager to:
 *   - View pending rider + worker verifications (from pending_verifications view)
 *   - Review submitted documents and details
 *   - Approve → entity becomes visible on marketplace / deliveries
 *   - Reject → user receives rejection_reason and can edit profile
 *
 * Stats:
 *   - Pending count
 *   - Approved today
 *   - Rejected today
 *   - Average review time (mock for now)
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, AlertTriangle, CheckCircle2, X, RefreshCw,
  Bike, Stethoscope, MapPin, Languages, FileText, Phone,
  Calendar, Award, Clock, TrendingUp, Eye, Send, Filter,
  ChevronRight, ExternalLink, Star,
} from '@/components/icons/lucide-compat';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { PROFESSION_LABELS } from '@/services/healthWorkers';
const VEHICLE_LABELS: Record<string, { label: string; emoji: string }> = {};
import { VEHICLE_LABELS as RIDER_VEHICLE_LABELS } from '@/services/healthRiders';
import {
  PendingVerification,
  getPendingVerifications,
  approveRider, rejectRider,
  approveWorker, rejectWorker,
} from '@/services/userTypes';

type Tab = 'pending' | 'approved' | 'rejected';
type EntityType = 'all' | 'rider' | 'worker';

export default function AdminVerificationWorkflow() {
  const { t } = useCountry();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('pending');
  const [entityType, setEntityType] = useState<EntityType>('all');
  const [pending, setPending] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<PendingVerification | null>(null);
  const [rejecting, setRejecting] = useState<PendingVerification | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPendingVerifications();
      setPending(result);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Erro ao carregar');
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (item: PendingVerification) => {
    if (!user?.id) return;
    setActionLoading(true);
    try {
      if (item.kind === 'rider') {
        await approveRider(item.entity_id, user.id);
      } else {
        await approveWorker(item.entity_id, user.id);
      }
      setReviewing(null);
      await load();
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Erro ao aprovar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!user?.id || !rejecting || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      if (rejecting.kind === 'rider') {
        await rejectRider(rejecting.entity_id, user.id, rejectReason);
      } else {
        await rejectWorker(rejecting.entity_id, user.id, rejectReason);
      }
      setRejecting(null);
      setRejectReason('');
      await load();
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Erro ao rejeitar');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredPending = pending.filter(p => {
    if (entityType !== 'all' && p.kind !== entityType) return false;
    return true;
  });

  const pendingCount = pending.length;
  const ridersCount = pending.filter(p => p.kind === 'rider').length;
  const workersCount = pending.filter(p => p.kind === 'worker').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 p-6 sm:p-8 text-white shadow-xl"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {t('adminVerification.title')}
              </h1>
              <p className="mt-1 text-white/90 text-sm sm:text-base">
                {t('adminVerification.subtitle')}
              </p>
            </div>
            <button
              onClick={() => load()}
              className="rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25"
            >
              <RefreshCw className="h-4 w-4 inline mr-1.5" />
              {t('adminVerification.refresh')}
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label={t('adminVerification.statPending')}
            value={pendingCount}
            color="bg-amber-50 text-amber-900"
            icon={<Clock className="h-4 w-4" />}
          />
          <StatCard
            label={t('adminVerification.statRiders')}
            value={ridersCount}
            color="bg-emerald-50 text-emerald-900"
            icon={<Bike className="h-4 w-4" />}
          />
          <StatCard
            label={t('adminVerification.statWorkers')}
            value={workersCount}
            color="bg-purple-50 text-purple-900"
            icon={<Stethoscope className="h-4 w-4" />}
          />
          <StatCard
            label={t('adminVerification.statToday')}
            value={0}
            color="bg-blue-50 text-blue-900"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>

        {/* Filter chips */}
        <div className="mb-4 flex flex-wrap gap-2">
          {(['all', 'rider', 'worker'] as EntityType[]).map(k => {
            const isActive = entityType === k;
            const label = k === 'all' ? t('adminVerification.filterAll') :
              k === 'rider' ? t('adminVerification.filterRiders') :
              t('adminVerification.filterWorkers');
            return (
              <button
                key={k}
                onClick={() => setEntityType(k)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {k === 'rider' && <Bike className="h-3 w-3" />}
                {k === 'worker' && <Stethoscope className="h-3 w-3" />}
                {label}
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center" role="status" aria-busy aria-live="polite">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-2 text-sm text-slate-600">{t('adminVerification.loading')}</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900" role="alert">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{t('adminVerification.errorTitle')}</p>
                <p className="text-sm mt-1">{error}</p>
                <p className="text-xs mt-2 text-amber-700">{t('adminVerification.viewMissingHint')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredPending.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="mt-4 font-medium text-slate-900">{t('adminVerification.allClearTitle')}</p>
            <p className="mt-1 text-sm text-slate-600">{t('adminVerification.allClearBody')}</p>
          </div>
        )}

        {/* Pending list */}
        {!loading && !error && filteredPending.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredPending.map((item, idx) => (
              <PendingCard
                key={`${item.kind}-${item.entity_id}`}
                item={item}
                onReview={() => setReviewing(item)}
                onApprove={() => handleApprove(item)}
                onReject={() => { setRejecting(item); setRejectReason(''); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Review modal */}
      <AnimatePresence>
        {reviewing && (
          <ReviewModal
            item={reviewing}
            onClose={() => setReviewing(null)}
            onApprove={() => handleApprove(reviewing)}
            onReject={() => { setRejecting(reviewing); setRejectReason(''); setReviewing(null); }}
            actionLoading={actionLoading}
          />
        )}
      </AnimatePresence>

      {/* Reject modal */}
      <AnimatePresence>
        {rejecting && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
            onClick={() => setRejecting(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-slate-900">{t('adminVerification.rejectTitle')}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {rejecting.kind === 'rider' ? t('adminVerification.rejectRiderBody') : t('adminVerification.rejectWorkerBody')}
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('adminVerification.rejectReasonPlaceholder')}
                rows={4}
                className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setRejecting(null)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  {t('adminVerification.cancel')}
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || actionLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  {t('adminVerification.confirmReject')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
 * Stat card
 * ============================================================ */

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <div className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </div>
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

/* ============================================================
 * Pending card
 * ============================================================ */

function PendingCard({
  item,
  onReview,
  onApprove,
  onReject,
}: {
  item: PendingVerification;
  onReview: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { t } = useCountry();
  const isRider = item.kind === 'rider';
  const Icon = isRider ? Bike : Stethoscope;
  const accent = isRider ? 'emerald' : 'purple';
  const submittedDate = new Date(item.created_at);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-${accent}-100 text-${accent}-700`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-900 text-sm truncate">{item.full_name}</p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-${accent}-100 text-${accent}-700`}>
              {isRider ? t('adminVerification.kindRider') : t('adminVerification.kindWorker')}
            </span>
          </div>
          <div className="mt-1 space-y-0.5 text-xs text-slate-600">
            {isRider && (
              <>
                <p className="flex items-center gap-1">
                  <Bike className="h-3 w-3" />
                  {item.details.vehicle_type ? t(`healthRiders.vehicleType_${item.details.vehicle_type}`) : '—'}
                  {item.details.vehicle_plate && ` · ${item.details.vehicle_plate}`}
                </p>
                {item.details.accepts_cold_chain && (
                  <p className="text-cyan-700 font-medium">❄️ Aceita cold chain</p>
                )}
              </>
            )}
            {!isRider && (
              <>
                <p className="flex items-center gap-1">
                  <Stethoscope className="h-3 w-3" />
                  {item.details.profession ? PROFESSION_LABELS[item.details.profession as keyof typeof PROFESSION_LABELS]?.label : '—'}
                  {item.details.specialization && ` · ${item.details.specialization}`}
                </p>
                {item.details.years_of_experience != null && (
                  <p>{item.details.years_of_experience} anos de experiência</p>
                )}
              </>
            )}
            {item.phone && (
              <p className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {item.phone}
              </p>
            )}
            <p className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {item.country_code}
              {item.details.service_zones?.length > 0 && ` · ${item.details.service_zones.join(', ')}`}
            </p>
            <p className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {submittedDate.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        <button
          onClick={onReview}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Eye className="h-3.5 w-3.5" />
          {t('adminVerification.review')}
        </button>
        <button
          onClick={onApprove}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t('adminVerification.approve')}
        </button>
        <button
          onClick={onReject}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
        >
          <X className="h-3.5 w-3.5" />
          {t('adminVerification.reject')}
        </button>
      </div>
    </motion.div>
  );
}

/* ============================================================
 * Review modal — full details
 * ============================================================ */

function ReviewModal({
  item,
  onClose,
  onApprove,
  onReject,
  actionLoading,
}: {
  item: PendingVerification;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  actionLoading: boolean;
}) {
  const { t } = useCountry();
  const isRider = item.kind === 'rider';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className={`p-6 ${isRider ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-purple-600 to-fuchsia-600'} text-white sticky top-0 z-10`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                {isRider ? <Bike className="h-6 w-6" /> : <Stethoscope className="h-6 w-6" />}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold opacity-80">
                  {isRider ? t('adminVerification.kindRider') : t('adminVerification.kindWorker')}
                </p>
                <h2 className="text-lg font-bold">{item.full_name}</h2>
                <p className="text-xs opacity-90">{item.country_code}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label={t('adminVerification.close')}
              className="rounded-lg p-2 text-white/80 hover:bg-white/20 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Documents */}
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              {t('adminVerification.documents')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {isRider ? (
                <>
                  <DocumentLink label={t('adminVerification.licenseDoc')} url={item.details.license_url} />
                  <DocumentLink label={t('adminVerification.idDoc')} url={item.details.id_document_url} />
                  <DocumentLink label={t('adminVerification.vehicleDoc')} url={item.details.vehicle_document_url} />
                </>
              ) : (
                <>
                  <DocumentLink label={t('adminVerification.licenseDoc')} url={item.details.license_url} />
                  <DocumentLink label={t('adminVerification.idDoc')} url={item.details.id_document_url} />
                  <DocumentLink label={t('adminVerification.profilePhoto')} url={item.details.profile_photo_url} />
                </>
              )}
            </div>
          </div>

          {/* Personal info */}
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
            <Row label={t('adminVerification.fullName')} value={item.full_name} />
            {item.phone && <Row label={t('adminVerification.phone')} value={item.phone} icon={<Phone className="h-3 w-3" />} />}
            <Row label={t('adminVerification.country')} value={item.country_code} icon={<MapPin className="h-3 w-3" />} />
            {item.details.languages?.length > 0 && (
              <Row label={t('adminVerification.languages')} value={item.details.languages.map((l: string) => l.toUpperCase()).join(', ')} icon={<Languages className="h-3 w-3" />} />
            )}
            {item.details.service_zones?.length > 0 && (
              <Row label={t('adminVerification.serviceZones')} value={item.details.service_zones.join(', ')} icon={<MapPin className="h-3 w-3" />} />
            )}
          </div>

          {/* Rider-specific */}
          {isRider && (
            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
              <Row label={t('adminVerification.vehicleType')} value={item.details.vehicle_type ? t(`healthRiders.vehicleType_${item.details.vehicle_type}`) : '—'} />
              {item.details.vehicle_plate && <Row label={t('adminVerification.vehiclePlate')} value={item.details.vehicle_plate} />}
              {item.details.vehicle_color && <Row label={t('adminVerification.vehicleColor')} value={item.details.vehicle_color} />}
              <Row label={t('adminVerification.coldChain')} value={item.details.accepts_cold_chain ? t('adminVerification.yes') : t('adminVerification.no')} />
              {item.details.mobile_money_number && <Row label={t('adminVerification.mobileMoney')} value={item.details.mobile_money_number} />}
            </div>
          )}

          {/* Worker-specific */}
          {!isRider && (
            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
              <Row label={t('adminVerification.profession')} value={item.details.profession ? PROFESSION_LABELS[item.details.profession as keyof typeof PROFESSION_LABELS]?.label : '—'} />
              {item.details.specialization && <Row label={t('adminVerification.specialization')} value={item.details.specialization} />}
              {item.details.license_number && <Row label={t('adminVerification.licenseNumber')} value={item.details.license_number} />}
              {item.details.years_of_experience != null && <Row label={t('adminVerification.yearsExperience')} value={`${item.details.years_of_experience} anos`} />}
              {item.details.consultation_fee != null && <Row label={t('adminVerification.consultationFee')} value={`${item.details.consultation_fee} MZN`} />}
              {item.details.home_visit_fee != null && <Row label={t('adminVerification.homeVisitFee')} value={`${item.details.home_visit_fee} MZN`} />}
              {item.details.telehealth_fee != null && <Row label={t('adminVerification.telehealthFee')} value={`${item.details.telehealth_fee} MZN`} />}
            </div>
          )}

          {/* Verification notes */}
          <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
            <ShieldCheck className="inline h-3.5 w-3.5 mr-1" />
            {t('adminVerification.reviewHint')}
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex justify-end gap-2">
          <button
            onClick={onReject}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            {t('adminVerification.reject')}
          </button>
          <button
            onClick={onApprove}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {actionLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {t('adminVerification.approve')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <span className="text-xs text-slate-500 flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="text-sm font-medium text-slate-900 text-right">{value || '—'}</span>
    </div>
  );
}

function DocumentLink({ label, url }: { label: string; url?: string }) {
  if (!url) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
        <FileText className="mx-auto h-4 w-4 mb-1" />
        {label}
        <p className="text-[10px] mt-0.5">Não carregado</p>
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 hover:border-blue-300 hover:bg-blue-50 transition"
    >
      <FileText className="h-4 w-4 text-blue-600" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-900">{label}</p>
        <p className="text-[10px] text-blue-600 truncate">Abrir documento</p>
      </div>
      <ExternalLink className="h-3 w-3 text-slate-400" />
    </a>
  );
}
