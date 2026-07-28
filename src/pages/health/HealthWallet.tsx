/**
 * HealthWallet — National Digital Health Wallet
 *
 * Portable medical history card with:
 * - QR code for instant verification (real, encoded from patient data)
 * - Vaccination / allergy / condition / medication / lab / consultation records
 * - Blood type, allergies, chronic conditions, current medications
 * - Emergency access banner
 * - MISAU national health card integration
 * - PDF export (coming soon toast) & Share (navigator.share)
 * - Fully Supabase-backed — no sample/mock data
 *
 * UX:
 * - Skeleton loading (ShimmerCard) with role="status"
 * - Friendly error state with retry CTA (role="alert")
 * - Delightful empty state with CTAs
 * - Search across records (when ≥5)
 * - ARIA-compliant tablist (role="tablist"/role="tab"/role="tabpanel")
 * - WCAG 2.1 AA: 44px touch targets, focus-visible rings, aria-labels
 * - Progressive disclosure via tabs + collapsible emergency banner
 * - Trust indicators (verified, encrypted)
 * - Quick actions row (book consultation, view prescriptions, etc.)
 * - Staggered framer-motion entrance for record cards
 * - Refresh button with aria-label
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import {
  Heart,
  QrCode,
  Download,
  Share2,
  AlertCircle,
  Droplets,
  Pill,
  FileText,
  Activity,
  Shield,
  ShieldCheck,
  Lock,
  Clock,
  Phone,
  MapPin,
  CheckCircle2,
  Loader2,
  Link2,
  IdCard,
  RefreshCw,
  Search,
  X,
  Plus,
  Stethoscope,
} from '@/components/icons/lucide-compat';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ShimmerCard } from '@/components/ui/premium';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────

interface MedicalRecord {
  id: string;
  record_type: 'vaccination' | 'allergy' | 'condition' | 'medication' | 'lab_result' | 'consultation';
  title: string;
  description: string;
  issued_at: string;
  issued_by: string;
  file_url?: string;
}

interface PatientProfile {
  user_id: string;
  blood_type: string | null;
  allergies: string[];
  chronic_conditions: string[];
  current_medications: string[];
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  gender: string | null;
  health_onboarding_completed_at: string | null;
  medical_id?: string | null;
}

interface UserProfile {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  country_id: string | null;
  default_city: string | null;
}

// ─── Type config for filter tabs ─────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  { labelKey: string; icon: typeof Heart; color: string; bgColor: string }
> = {
  vaccination: { labelKey: 'healthWallet.vaccines', icon: Shield, color: 'text-green-600', bgColor: 'bg-green-50' },
  allergy: { labelKey: 'healthWallet.allergies', icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50' },
  condition: { labelKey: 'healthWallet.conditions', icon: Activity, color: 'text-amber-600', bgColor: 'bg-amber-50' },
  medication: { labelKey: 'healthWallet.medications', icon: Pill, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  lab_result: { labelKey: 'healthWallet.lab_results', icon: FileText, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  consultation: { labelKey: 'healthWallet.consultations', icon: Heart, color: 'text-teal-600', bgColor: 'bg-teal-50' },
};

const TAB_KEYS = ['all', ...Object.keys(TYPE_CONFIG)] as const;
type TabKey = (typeof TAB_KEYS)[number];

// ─── Props ───────────────────────────────────────────────────────────────────

interface HealthWalletProps {
  isDoctorView?: boolean;
  patientId?: string;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function HealthWallet({ isDoctorView = false, patientId }: HealthWalletProps) {
  const { user } = useAuth();
  const { t, country } = useCountry();
  const navigate = useNavigate();

  // The target user id: either a specific patient (doctor view) or the logged-in user
  const targetUserId = isDoctorView && patientId ? patientId : user?.id;

  // ─── State ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<TabKey>('all');
  const [showEmergency, setShowEmergency] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [medicalId, setMedicalId] = useState<string>('');

  // MISAU dialog
  const [misauDialogOpen, setMisauDialogOpen] = useState(false);
  const [misauInput, setMisauInput] = useState('');
  const [misauSaving, setMisauSaving] = useState(false);

  // Ref for pull-to-refresh / refresh callback reuse
  const fetchTokenRef = useRef(0);

  // ─── Derived medical ID ──────────────────────────────────────────────────
  const derivedMedicalId = useMemo(() => {
    if (!targetUserId) return '';
    return `${country?.id || 'XX'}-HW-${targetUserId.slice(0, 8)}`;
  }, [country, targetUserId]);

  // ─── Fetch all data ──────────────────────────────────────────────────────
  const fetchData = useCallback(async (isRefresh = false) => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const token = ++fetchTokenRef.current;

    try {
      // 1. Patient profile
      const { data: ppData, error: ppErr } = await supabase
        .from('patient_profiles' as any)
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (ppErr) throw ppErr;

      // 2. User profile
      const { data: upData, error: upErr } = await supabase
        .from('profiles' as any)
        .select('full_name, phone, avatar_url, country_id, default_city')
        .eq('id', targetUserId)
        .maybeSingle();

      if (upErr) throw upErr;

      // 3. Medical records
      const { data: mrData, error: mrErr } = await supabase
        .from('medical_records' as any)
        .select('*')
        .eq('patient_id', targetUserId)
        .order('issued_at', { ascending: false });

      if (mrErr) throw mrErr;

      // Ignore if a newer fetch has started
      if (token !== fetchTokenRef.current) return;

      setPatientProfile((ppData as unknown as PatientProfile) || null);
      setUserProfile((upData as unknown as UserProfile) || null);
      setMedicalRecords((mrData || []) as unknown as MedicalRecord[]);

      const storedId = (ppData as any)?.medical_id;
      setMedicalId(storedId || derivedMedicalId);

      if (isRefresh) {
        toast.success(t('healthWallet.refreshed'));
      }
    } catch (err) {
      console.error('HealthWallet: failed to fetch data', err);
      if (token === fetchTokenRef.current) {
        setError(t('healthWallet.error_title'));
      }
    } finally {
      if (token === fetchTokenRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [targetUserId, derivedMedicalId, t]);

  useEffect(() => {
    fetchData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId, derivedMedicalId]);

  // ─── Generate QR code ────────────────────────────────────────────────────
  useEffect(() => {
    if (!medicalId) return;
    let cancelled = false;

    const run = async () => {
      try {
        const payload = JSON.stringify({
          medicalId,
          bloodType: patientProfile?.blood_type || 'unknown',
          allergies: (patientProfile?.allergies || []).join(', ') || 'none',
          name: userProfile?.full_name || '',
          dob: patientProfile?.date_of_birth || '',
          emergencyContact: patientProfile?.emergency_contact_phone || '',
        });
        const url = await QRCode.toDataURL(payload, {
          width: 120,
          margin: 1,
          color: { dark: '#1a1a1a', light: '#FFFFFF' },
          errorCorrectionLevel: 'M',
        });
        if (!cancelled) setQrDataUrl(url);
      } catch {
        // QR generation fallback — leave empty
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [medicalId, patientProfile, userProfile]);

  // ─── Filtered + searched records ────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    let list = medicalRecords;
    if (selectedType !== 'all') {
      list = list.filter((r) => r.record_type === selectedType);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.issued_by?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [selectedType, medicalRecords, searchQuery]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: medicalRecords.length };
    medicalRecords.forEach((r) => {
      c[r.record_type] = (c[r.record_type] || 0) + 1;
    });
    return c;
  }, [medicalRecords]);

  // ─── Format helpers ─────────────────────────────────────────────────────
  const formatDate = (iso: string): string => {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(country?.id === 'MZ' ? 'pt-MZ' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // ─── Emergency summary strings ──────────────────────────────────────────
  const allergiesSummary = useMemo(
    () => (patientProfile?.allergies || []).join(', ') || '—',
    [patientProfile],
  );
  const conditionsSummary = useMemo(
    () => (patientProfile?.chronic_conditions || []).join(', ') || '—',
    [patientProfile],
  );
  const medicationsSummary = useMemo(
    () => (patientProfile?.current_medications || []).join(', ') || '—',
    [patientProfile],
  );

  // ─── MISAU link save ────────────────────────────────────────────────────
  const handleSaveMisau = async () => {
    if (!targetUserId || !misauInput.trim()) return;
    setMisauSaving(true);
    try {
      const { error: upErr } = await supabase
        .from('patient_profiles' as any)
        .upsert(
          {
            user_id: targetUserId,
            medical_id: misauInput.trim(),
          },
          { onConflict: 'user_id' },
        );
      if (upErr) throw upErr;
      setMedicalId(misauInput.trim());
      setPatientProfile((prev) =>
        prev ? { ...prev, medical_id: misauInput.trim() } : null,
      );
      setMisauDialogOpen(false);
      setMisauInput('');
      toast.success(t('healthWallet.misau_linked'));
    } catch (err) {
      toast.error(t('common.error'));
    } finally {
      setMisauSaving(false);
    }
  };

  // ─── Share handler ─────────────────────────────────────────────────────
  const handleShare = async () => {
    const shareText = [
      `${t('healthWallet.title')}`,
      `${t('healthWallet.medical_id')}: ${medicalId}`,
      `${t('healthWallet.blood_type')}: ${patientProfile?.blood_type || '—'}`,
      `${t('healthWallet.allergies')}: ${allergiesSummary}`,
      `${t('healthWallet.chronic_conditions')}: ${conditionsSummary}`,
      `${t('healthWallet.current_medications')}: ${medicationsSummary}`,
    ].join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: t('healthWallet.title'), text: shareText });
      } catch {
        // user cancelled — silent
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success(t('healthWallet.copied'));
      } catch {
        toast.error(t('common.error'));
      }
    }
  };

  // ─── PDF handler ───────────────────────────────────────────────────────
  const handlePdf = () => {
    toast.info(t('healthWallet.pdf_coming_soon'));
  };

  // ─── Quick actions ─────────────────────────────────────────────────────
  const handleAddDocument = () => {
    toast.info(t('healthWallet.add_document_coming_soon'));
  };
  const handleShareWithDoctor = () => {
    toast.info(t('healthWallet.share_with_doctor_coming_soon'));
  };
  const handleBookConsultation = () => {
    navigate('/health/doctors');
  };
  const handleViewPrescriptions = () => {
    navigate('/health/prescriptions');
  };
  const handleViewExams = () => {
    navigate('/health/exams');
  };
  const handleViewRecords = () => {
    navigate('/health/records');
  };

  const hasManyRecords = medicalRecords.length >= 5;
  const totalFiltered = filteredRecords.length;

  // ─── Loading skeleton (role="status") ──────────────────────────────────
  if (loading) {
    return (
      <div
        className="space-y-4"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={t('healthWallet.loading_profile')}
      >
        <span className="sr-only">{t('healthWallet.loading_profile')}</span>
        <ShimmerCard className="h-20" lines={2} />
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-56 rounded-xl" />
        <div className="flex gap-2 overflow-x-auto pb-1" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-full shrink-0" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  // ─── Error state (role="alert") ────────────────────────────────────────
  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center text-center py-12 px-4"
      >
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-bold text-foreground">{t('healthWallet.error_title')}</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          {t('healthWallet.error_desc')}
        </p>
        <Button
          onClick={() => fetchData(false)}
          className="mt-5 min-h-[44px] gap-2"
          aria-label={t('healthWallet.retry')}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t('healthWallet.retry')}
        </Button>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Trust indicators strip ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-2"
      >
        <Badge
          variant="outline"
          className="gap-1.5 bg-green-50/50 border-green-200 text-green-700 text-xs py-1"
        >
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t('healthWallet.verified_documents')}
        </Badge>
        <Badge
          variant="outline"
          className="gap-1.5 bg-blue-50/50 border-blue-200 text-blue-700 text-xs py-1"
        >
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          {t('healthWallet.encrypted_data')}
        </Badge>
      </motion.div>

      {/* ── MISAU Integration Section ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                <IdCard className="h-5 w-5 text-green-600" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {t('healthWallet.misau_section_title')}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {t('healthWallet.misau_section_desc')}
                </p>
              </div>
            </div>
            {patientProfile?.medical_id ? (
              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs gap-1 shrink-0">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                {t('healthWallet.misau_badge')}
              </Badge>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs min-h-[44px] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                onClick={() => setMisauDialogOpen(true)}
                aria-label={t('healthWallet.link_misau')}
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{t('healthWallet.link_misau')}</span>
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* MISAU Dialog */}
      <Dialog open={misauDialogOpen} onOpenChange={setMisauDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IdCard className="h-5 w-5 text-green-600" aria-hidden="true" />
              {t('healthWallet.link_misau')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              {t('healthWallet.misau_dialog_desc')}
            </p>
            <Input
              placeholder={t('healthWallet.misau_placeholder')}
              value={misauInput}
              onChange={(e) => setMisauInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveMisau();
              }}
              aria-label={t('healthWallet.misau_placeholder')}
              className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMisauDialogOpen(false)}
                className="min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveMisau}
                disabled={misauSaving || !misauInput.trim()}
                className="min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {misauSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />}
                {t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Header + actions ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" aria-hidden="true" />
            {t('healthWallet.title')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t('healthWallet.subtitle')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={handlePdf}
            aria-label={t('healthWallet.download_pdf')}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={handleShare}
            aria-label={t('healthWallet.share')}
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('healthWallet.share')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            aria-label={t('healthWallet.refresh')}
          >
            <RefreshCw
              className={cn('h-4 w-4', refreshing && 'animate-spin')}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">
              {refreshing ? t('healthWallet.refreshing') : t('healthWallet.refresh')}
            </span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
            onClick={() => setShowEmergency((v) => !v)}
            aria-expanded={showEmergency}
            aria-controls="emergency-banner"
            aria-label={
              showEmergency
                ? t('healthWallet.emergency_hide')
                : t('healthWallet.emergency_show')
            }
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('healthWallet.emergency_btn')}</span>
          </Button>
        </div>
      </div>

      {/* ── Emergency Banner (progressive disclosure) ──────────────────── */}
      <AnimatePresence initial={false}>
        {showEmergency && (
          <motion.div
            id="emergency-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <h3 className="font-bold text-red-800 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                {t('healthWallet.emergency_info')}
              </h3>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('healthWallet.blood_type')}:</span>{' '}
                  <span className="font-bold text-red-700">
                    {patientProfile?.blood_type || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('healthWallet.allergies')}:</span>{' '}
                  <span className="font-bold text-red-700">{allergiesSummary}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('healthWallet.conditions')}:</span>{' '}
                  <span className="font-bold text-red-700">{conditionsSummary}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t('healthWallet.current_medications')}:
                  </span>{' '}
                  <span className="font-bold text-red-700">{medicationsSummary}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">
                    {t('healthWallet.emergency_contact')}:
                  </span>{' '}
                  <span className="font-bold text-red-700">
                    {patientProfile?.emergency_contact_name
                      ? `${patientProfile.emergency_contact_name} — ${patientProfile.emergency_contact_phone || ''}`
                      : patientProfile?.emergency_contact_phone || '—'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Patient Card ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 text-white">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-lg font-bold truncate">
                  {userProfile?.full_name ||
                    (isDoctorView
                      ? t('healthWallet.unknown_patient')
                      : t('healthWallet.no_profile'))}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-red-100 flex-wrap">
                  <span className="truncate">
                    {t('healthWallet.medical_id')}: {medicalId || '—'}
                  </span>
                  <span aria-hidden="true">{'\u2022'}</span>
                  <span>{country?.name || ''}</span>
                </div>
              </div>
              <Badge className="bg-white/20 text-white border-white/30 text-xs shrink-0">
                <Droplets className="h-3 w-3 mr-1" aria-hidden="true" />
                {patientProfile?.blood_type || '—'}
              </Badge>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="text-muted-foreground truncate">
                  {userProfile?.default_city || country?.name || '—'}
                </span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="text-muted-foreground truncate">{userProfile?.phone || '—'}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="text-muted-foreground truncate">
                  {t('healthWallet.last_updated')}:{' '}
                  {formatDate(patientProfile?.health_onboarding_completed_at || '') || '—'}
                </span>
              </div>
            </div>

            {/* QR Code */}
            <div className="mt-4 flex items-center gap-4">
              {qrDataUrl ? (
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-white border border-gray-200 shrink-0">
                  <img
                    src={qrDataUrl}
                    alt={t('healthWallet.qr_code')}
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <div
                  className="w-24 h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center shrink-0"
                  role="status"
                  aria-live="polite"
                >
                  <QrCode className="h-8 w-8 text-gray-400" aria-hidden="true" />
                  <span className="text-[8px] text-gray-400 mt-0.5">
                    {t('healthWallet.loading_qr')}
                  </span>
                </div>
              )}
              <div className="text-xs text-muted-foreground space-y-1 min-w-0">
                <p className="font-medium text-foreground">{t('healthWallet.scan_to_verify')}</p>
                <p>{t('healthWallet.qr_description')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Quick Actions ──────────────────────────────────────────────── */}
      {!isDoctorView && (
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          aria-label={t('healthWallet.quick_actions')}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {t('healthWallet.quick_actions')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <QuickAction
              icon={Plus}
              label={t('healthWallet.add_document')}
              onClick={handleAddDocument}
            />
            <QuickAction
              icon={Share2}
              label={t('healthWallet.share_with_doctor')}
              onClick={handleShareWithDoctor}
            />
            <QuickAction
              icon={Stethoscope}
              label={t('healthWallet.book_consultation')}
              onClick={handleBookConsultation}
            />
            <QuickAction
              icon={FileText}
              label={t('healthWallet.view_prescriptions')}
              onClick={handleViewPrescriptions}
            />
          </div>
        </motion.section>
      )}

      {/* ── Search (when ≥5 records) ──────────────────────────────────── */}
      {hasManyRecords && (
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('healthWallet.search_placeholder')}
            aria-label={t('healthWallet.search_aria_label')}
            className="pl-9 pr-9 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={t('healthWallet.clear_search')}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* ── Filter Tabs (ARIA tablist) ────────────────────────────────── */}
      <div
        role="tablist"
        aria-label={t('healthWallet.tablist_label')}
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {TAB_KEYS.map((key) => {
          const isActive = selectedType === key;
          const label =
            key === 'all' ? t('healthWallet.tab_all') : t(TYPE_CONFIG[key].labelKey);
          const count = counts[key] || 0;
          const tabId = `hw-tab-${key}`;
          const panelId = `hw-panel-${key}`;
          return (
            <button
              key={key}
              role="tab"
              id={tabId}
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setSelectedType(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {label}
              <span
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px]',
                  isActive ? 'bg-primary-foreground/20' : 'bg-muted-foreground/10',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Records (tabpanel) ────────────────────────────────────────── */}
      <div
        role="tabpanel"
        id={`hw-panel-${selectedType}`}
        aria-labelledby={`hw-tab-${selectedType}`}
        className="space-y-2"
      >
        {/* Result count summary */}
        {totalFiltered > 0 && (
          <p className="text-xs text-muted-foreground px-1" aria-live="polite">
            {searchQuery
              ? t('healthWallet.showing_count', {
                  count: String(totalFiltered),
                  total: String(medicalRecords.length),
                })
              : totalFiltered === 1
                ? t('healthWallet.single_record')
                : t('healthWallet.records_count', { count: String(totalFiltered) })}
          </p>
        )}

        {/* Empty states */}
        {totalFiltered === 0 && (
          <EmptyState
            medicalRecordsEmpty={medicalRecords.length === 0}
            isSearchActive={!!searchQuery}
            isFiltered={selectedType !== 'all'}
            onAddDocument={handleAddDocument}
            onBookConsultation={handleBookConsultation}
            onClearSearch={() => setSearchQuery('')}
            onResetFilter={() => setSelectedType('all')}
          />
        )}

        {/* Records list (stagger animation) */}
        <AnimatePresence mode="popLayout">
          {filteredRecords.map((record, idx) => {
            const config = TYPE_CONFIG[record.record_type];
            const Icon = config?.icon || FileText;
            const bg = config?.bgColor || 'bg-gray-50';
            const color = config?.color || 'text-gray-600';
            return (
              <motion.div
                key={record.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(idx * 0.04, 0.32) } }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="p-3 rounded-lg border hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                      bg,
                    )}
                  >
                    <Icon className={cn('h-4 w-4', color)} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{record.title}</span>
                    </div>
                    {record.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {record.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground flex-wrap">
                      {formatDate(record.issued_at) && (
                        <>
                          <span>
                            {t('healthWallet.issued_on')} {formatDate(record.issued_at)}
                          </span>
                          <span aria-hidden="true">{'\u2022'}</span>
                        </>
                      )}
                      {record.issued_by && (
                        <span className="truncate">
                          {t('healthWallet.issued_by_label')} {record.issued_by}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── QuickAction sub-component ───────────────────────────────────────────────

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Heart;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border bg-card hover:bg-accent/40 transition-colors text-center min-h-[72px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      aria-label={label}
    >
      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
      <span className="text-[11px] font-medium leading-tight line-clamp-2">{label}</span>
    </button>
  );
}

// ─── EmptyState sub-component ────────────────────────────────────────────────

function EmptyState({
  medicalRecordsEmpty,
  isSearchActive,
  isFiltered,
  onAddDocument,
  onBookConsultation,
  onClearSearch,
  onResetFilter,
}: {
  medicalRecordsEmpty: boolean;
  isSearchActive: boolean;
  isFiltered: boolean;
  onAddDocument: () => void;
  onBookConsultation: () => void;
  onClearSearch: () => void;
  onResetFilter: () => void;
}) {
  const { t } = useCountry();

  // Search empty
  if (isSearchActive) {
    return (
      <div className="text-center py-10 px-4" role="status">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
          <Search className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="font-semibold text-sm">{t('healthWallet.empty_search_title')}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
          {t('healthWallet.empty_search_desc')}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearSearch}
          className="mt-4 min-h-[44px] gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {t('healthWallet.clear_search')}
        </Button>
      </div>
    );
  }

  // Filter empty (has records but not in this category)
  if (isFiltered && !medicalRecordsEmpty) {
    return (
      <div className="text-center py-10 px-4" role="status">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
          <FileText className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="font-semibold text-sm">{t('healthWallet.empty_filter_title')}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
          {t('healthWallet.empty_filter_desc')}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onResetFilter}
          className="mt-4 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {t('healthWallet.tab_all')}
        </Button>
      </div>
    );
  }

  // Truly empty (no records at all)
  return (
    <div className="text-center py-10 px-4" role="status">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4"
      >
        <Heart className="h-7 w-7 text-red-400" aria-hidden="true" />
      </motion.div>
      <p className="font-bold text-base">{t('healthWallet.empty_title')}</p>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
        {t('healthWallet.empty_desc')}
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center mt-5">
        <Button
          onClick={onAddDocument}
          className="min-h-[44px] gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('healthWallet.empty_cta_records')}
        </Button>
        <Button
          variant="outline"
          onClick={onBookConsultation}
          className="min-h-[44px] gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Stethoscope className="h-4 w-4" aria-hidden="true" />
          {t('healthWallet.empty_cta_consult')}
        </Button>
      </div>
    </div>
  );
}

export default HealthWallet;
