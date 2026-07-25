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
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
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
  Clock,
  Phone,
  MapPin,
  CheckCircle2,
  Loader2,
  Link2,
  IdCard,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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

const TYPE_CONFIG: Record<string, { labelKey: string; icon: typeof Heart; color: string; bgColor: string }> = {
  vaccination: { labelKey: 'healthWallet.vaccines', icon: Shield, color: 'text-green-600', bgColor: 'bg-green-50' },
  allergy: { labelKey: 'healthWallet.allergies', icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50' },
  condition: { labelKey: 'healthWallet.conditions', icon: Activity, color: 'text-amber-600', bgColor: 'bg-amber-50' },
  medication: { labelKey: 'healthWallet.medications', icon: Pill, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  lab_result: { labelKey: 'healthWallet.lab_results', icon: FileText, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  consultation: { labelKey: 'healthWallet.consultations', icon: Heart, color: 'text-teal-600', bgColor: 'bg-teal-50' },
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface HealthWalletProps {
  isDoctorView?: boolean;
  patientId?: string;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function HealthWallet({ isDoctorView = false, patientId }: HealthWalletProps) {
  const { user } = useAuth();
  const { t, country } = useCountry();

  // The target user id: either a specific patient (doctor view) or the logged-in user
  const targetUserId = isDoctorView && patientId ? patientId : user?.id;

  // ─── State ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showEmergency, setShowEmergency] = useState(false);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [medicalId, setMedicalId] = useState<string>('');

  // MISAU dialog
  const [misauDialogOpen, setMisauDialogOpen] = useState(false);
  const [misauInput, setMisauInput] = useState('');
  const [misauSaving, setMisauSaving] = useState(false);

  // ─── Derived medical ID ──────────────────────────────────────────────────
  const derivedMedicalId = useMemo(() => {
    if (!targetUserId) return '';
    return `${country?.id || 'XX'}-HW-${targetUserId.slice(0, 8)}`;
  }, [country, targetUserId]);

  // ─── Fetch all data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);

      try {
        // 1. Patient profile
        const { data: ppData } = await supabase
          .from('patient_profiles' as any)
          .select('*')
          .eq('user_id', targetUserId)
          .maybeSingle();

        if (!cancelled && ppData) {
          setPatientProfile(ppData as unknown as PatientProfile);
        }

        // 2. User profile
        const { data: upData } = await supabase
          .from('profiles' as any)
          .select('full_name, phone, avatar_url, country_id, default_city')
          .eq('id', targetUserId)
          .maybeSingle();

        if (!cancelled && upData) {
          setUserProfile(upData as unknown as UserProfile);
        }

        // 3. Medical records
        const { data: mrData } = await supabase
          .from('medical_records' as any)
          .select('*')
          .eq('patient_id', targetUserId)
          .order('issued_at', { ascending: false });

        if (!cancelled) {
          setMedicalRecords((mrData || []) as unknown as MedicalRecord[]);
        }

        // Set medical ID: prefer the one stored in patient_profiles, otherwise derive
        if (!cancelled) {
          const storedId = (ppData as any)?.medical_id;
          setMedicalId(storedId || derivedMedicalId);
        }
      } catch (err) {
        console.error('HealthWallet: failed to fetch data', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
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
    return () => { cancelled = true; };
  }, [medicalId, patientProfile, userProfile]);

  // ─── Filtered records & counts ──────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    if (selectedType === 'all') return medicalRecords;
    return medicalRecords.filter((r) => r.record_type === selectedType);
  }, [selectedType, medicalRecords]);

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
    return d.toLocaleDateString(country?.id === 'MZ' ? 'pt-MZ' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // ─── Emergency summary strings ──────────────────────────────────────────
  const allergiesSummary = useMemo(
    () => (patientProfile?.allergies || []).join(', ') || '—',
    [patientProfile]
  );
  const conditionsSummary = useMemo(
    () => (patientProfile?.chronic_conditions || []).join(', ') || '—',
    [patientProfile]
  );
  const medicationsSummary = useMemo(
    () => (patientProfile?.current_medications || []).join(', ') || '—',
    [patientProfile]
  );

  // ─── MISAU link save ────────────────────────────────────────────────────
  const handleSaveMisau = async () => {
    if (!targetUserId || !misauInput.trim()) return;
    setMisauSaving(true);
    try {
      const { error } = await supabase
        .from('patient_profiles' as any)
        .upsert(
          {
            user_id: targetUserId,
            medical_id: misauInput.trim(),
          },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
      setMedicalId(misauInput.trim());
      setPatientProfile((prev) => prev ? { ...prev, medical_id: misauInput.trim() } : null);
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
      await navigator.clipboard.writeText(shareText);
      toast.success(t('healthWallet.copied'));
    }
  };

  // ─── PDF handler ───────────────────────────────────────────────────────
  const handlePdf = () => {
    toast.info(t('healthWallet.pdf_coming_soon'));
  };

  // ─── Loading skeleton ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-56 bg-muted rounded-xl" />
        <div className="flex gap-2 overflow-x-auto">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-8 w-20 bg-muted rounded-full" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── MISAU Integration Section ─────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <IdCard className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t('healthWallet.misau_section_title')}</p>
              <p className="text-xs text-muted-foreground">{t('healthWallet.misau_section_desc')}</p>
            </div>
          </div>
          {patientProfile?.medical_id ? (
            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {t('healthWallet.misau_linked')}
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => setMisauDialogOpen(true)}
            >
              <Link2 className="h-3.5 w-3.5" />
              {t('healthWallet.link_misau')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* MISAU Dialog */}
      <Dialog open={misauDialogOpen} onOpenChange={setMisauDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IdCard className="h-5 w-5 text-green-600" />
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
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setMisauDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button size="sm" onClick={handleSaveMisau} disabled={misauSaving || !misauInput.trim()}>
                {misauSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            {t('healthWallet.title')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('healthWallet.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={handlePdf}>
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            {t('healthWallet.share')}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1"
            onClick={() => setShowEmergency(!showEmergency)}
          >
            <Phone className="h-4 w-4" />
            {t('healthWallet.emergency_btn')}
          </Button>
        </div>
      </div>

      {/* Emergency Banner */}
      {showEmergency && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 bg-red-50 border-2 border-red-200 rounded-xl"
        >
          <h3 className="font-bold text-red-800 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {t('healthWallet.emergency_info')}
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">{t('healthWallet.blood_type')}:</span>{' '}
              <span className="font-bold text-red-700">{patientProfile?.blood_type || '—'}</span>
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
              <span className="text-muted-foreground">{t('healthWallet.current_medications')}:</span>{' '}
              <span className="font-bold text-red-700">{medicationsSummary}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">{t('healthWallet.emergency_contact')}:</span>{' '}
              <span className="font-bold text-red-700">
                {patientProfile?.emergency_contact_name
                  ? `${patientProfile.emergency_contact_name} — ${patientProfile.emergency_contact_phone || ''}`
                  : patientProfile?.emergency_contact_phone || '—'}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Patient Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">
                {userProfile?.full_name || (isDoctorView ? t('healthWallet.unknown_patient') : t('healthWallet.no_profile'))}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-red-100">
                <span>
                  {t('healthWallet.medical_id')}: {medicalId}
                </span>
                <span>{'\u2022'}</span>
                <span>{country?.name || ''}</span>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-white/30 text-xs">
              <Droplets className="h-3 w-3 mr-1" />
              {patientProfile?.blood_type || '—'}
            </Badge>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground truncate">
                {userProfile?.default_city || country?.name || '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{userProfile?.phone || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {t('healthWallet.last_updated')}: {formatDate(patientProfile?.health_onboarding_completed_at || '') || '—'}
              </span>
            </div>
          </div>

          {/* QR Code */}
          <div className="mt-4 flex items-center gap-4">
            {qrDataUrl ? (
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-white border border-gray-200">
                <img
                  src={qrDataUrl}
                  alt={t('healthWallet.qr_code')}
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="w-24 h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                <QrCode className="h-8 w-8 text-gray-400" />
                <span className="text-[8px] text-gray-400 mt-0.5">QR</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">{t('healthWallet.scan_to_verify')}</p>
              <p>{t('healthWallet.qr_description')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterTab
          label={t('healthWallet.all')}
          count={counts.all}
          active={selectedType === 'all'}
          onClick={() => setSelectedType('all')}
        />
        {Object.entries(TYPE_CONFIG).map(([key, config]) => (
          <FilterTab
            key={key}
            label={t(config.labelKey)}
            count={counts[key] || 0}
            active={selectedType === key}
            onClick={() => setSelectedType(key)}
          />
        ))}
      </div>

      {/* Records */}
      <div className="space-y-2">
        {filteredRecords.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            {t('healthWallet.no_records')}
          </div>
        )}
        {filteredRecords.map((record) => {
          const config = TYPE_CONFIG[record.record_type];
          const Icon = config?.icon || FileText;
          const bg = config?.bgColor || 'bg-gray-50';
          const color = config?.color || 'text-gray-600';
          return (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-3 rounded-lg border hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', bg)}>
                  <Icon className={cn('h-4 w-4', color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{record.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{record.description}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span>{formatDate(record.issued_at)}</span>
                    <span>{'\u2022'}</span>
                    <span>{record.issued_by}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── FilterTab Component (unchanged) ────────────────────────────────────────

function FilterTab({ label, count, active, onClick }: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      )}
    >
      {label}
      <span className={cn(
        'w-5 h-5 rounded-full flex items-center justify-center text-[10px]',
        active ? 'bg-primary-foreground/20' : 'bg-muted-foreground/10'
      )}>
        {count}
      </span>
    </button>
  );
}

export default HealthWallet;
