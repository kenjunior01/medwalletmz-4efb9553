import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import {
  User,
  Heart,
  Droplets,
  AlertTriangle,
  Pill,
  FileText,
  Share2,
  Download,
  QrCode,
  Shield,
  Phone,
  RotateCcw,
} from 'lucide-react';
import { useCountry } from '@/contexts/CountryContext';
import { getTheme } from '@/themes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// ─── Patient Data Interface ───────────────────────────────────────
interface PatientData {
  fullName: string;
  dateOfBirth: string;
  medicalId: string;
  bloodType: string;
  province?: string;
  emergencyContact: string;
  allergies: string[];
  currentMedications: string[];
  chronicConditions: string[];
  vaccinationLastUpdate?: string;
}

// ─── Props ─────────────────────────────────────────────────────────
interface HealthCardProps {
  patient?: PatientData;
  className?: string;
}

// ─── 3-D Flip Animation Variants ────────────────────────────────────
const flipVariants = {
  front: { rotateY: 0 },
  back: { rotateY: 180 },
};

const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

// ─── Component ─────────────────────────────────────────────────────
export function HealthCard({ patient, className }: HealthCardProps) {
  const { t, country } = useCountry();
  const [isFlipped, setIsFlipped] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const theme = getTheme(country?.id || 'MZ');

  // ─── Placeholder when no patient data is provided ──────────────
  if (!patient) {
    return (
      <div className={cn('flex flex-col items-center gap-3', className)}>
        <div
          className="flex h-full w-full flex-col items-center justify-center rounded-2xl bg-muted p-8"
          style={{ aspectRatio: '1.586 / 1' }}
        >
          <Shield className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-muted-foreground">
            {t('healthWallet.no_profile')}
          </p>
        </div>
      </div>
    );
  }

  // Generate QR code from patient data
  const generateQR = useCallback(async () => {
    try {
      const payload = JSON.stringify({
        id: patient.medicalId,
        name: patient.fullName,
        dob: patient.dateOfBirth,
        blood: patient.bloodType,
      });
      const url = await QRCode.toDataURL(payload, {
        width: 120,
        margin: 1,
        color: {
          dark: theme.colors.primaryDark,
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      });
      setQrDataUrl(url);
    } catch {
      // QR generation fallback — leave empty
    }
  }, [patient, theme.colors.primaryDark]);

  useEffect(() => {
    generateQR();
  }, [generateQR]);

  const toggleFlip = () => setIsFlipped((prev) => !prev);

  // Format date of birth
  const formatDate = (iso: string): string => {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('pt-MZ', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  // Blood type badge colour
  const bloodColor = (bt: string) => {
    if (bt.startsWith('O')) return 'bg-red-500 text-white';
    if (bt.startsWith('A')) return 'bg-blue-500 text-white';
    if (bt.startsWith('B')) return 'bg-amber-500 text-white';
    return 'bg-purple-500 text-white';
  };

  const initials = patient.fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // ─── Card Face (Front) ──────────────────────────────────────────
  const cardFront = (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl p-5 print:rounded-none print:p-6"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.primaryDark} 0%, ${theme.colors.primary} 40%, ${theme.colors.primaryLight} 100%)`,
        backfaceVisibility: 'hidden',
      }}
    >
      {/* Decorative circles */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-10"
        style={{ background: theme.colors.secondary }}
      />
      <div
        className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full opacity-10"
        style={{ background: theme.colors.secondary }}
      />

      {/* Header row: logo + title */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
              {t('healthWallet.title')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-medium text-white/50">MedWallet</p>
        </div>
      </div>

      {/* Patient info + QR section */}
      <div className="relative z-10 mt-4 flex flex-1 gap-4">
        {/* Left: Photo + Details */}
        <div className="flex flex-1 flex-col gap-3">
          <Avatar className="h-16 w-16 border-2 border-white/30 shadow-lg">
            <AvatarFallback
              className="text-lg font-black text-white"
              style={{ background: `${theme.colors.secondary}30` }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>

          <div>
            <h2 className="text-base font-black leading-tight text-white">
              {patient.fullName}
            </h2>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-white/70">
              <User className="h-3 w-3" />
              {formatDate(patient.dateOfBirth)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={cn('border-0 text-[10px] font-black px-2 py-0.5', bloodColor(patient.bloodType))}
            >
              <Droplets className="mr-1 h-3 w-3" />
              {patient.bloodType}
            </Badge>
            <Badge
              className="border-0 bg-white/20 text-[10px] font-bold px-2 py-0.5 text-white backdrop-blur-sm"
            >
              <QrCode className="mr-1 h-3 w-3" />
              {t('healthWallet.medical_id')}: {patient.medicalId}
            </Badge>
          </div>

          <div className="mt-auto flex items-center gap-1.5 text-[10px] text-white/60">
            <Heart className="h-3 w-3" />
            {patient.province ? `${patient.province}, Moçambique` : 'Moçambique'}
          </div>
        </div>

        {/* Right: QR Code */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex h-[100px] w-[100px] items-center justify-center rounded-xl bg-white p-1.5 shadow-lg">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={t('healthWallet.qr_code')}
                className="h-full w-full rounded-md"
              />
            ) : (
              <QrCode className="h-10 w-10 text-gray-300" />
            )}
          </div>
          <p className="text-[8px] font-medium text-white/50">
            {t('healthWallet.scan_to_verify')}
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 mt-3 flex items-center justify-between border-t border-white/10 pt-2">
        <p className="text-[8px] text-white/40">{t('healthWallet.subtitle')}</p>
        <p className="text-[8px] text-white/40">
          {patient.vaccinationLastUpdate
            ? `${t('healthWallet.last_updated')}: ${patient.vaccinationLastUpdate}`
            : t('healthWallet.last_updated')}
        </p>
      </div>
    </div>
  );

  // ─── Card Back ──────────────────────────────────────────────────
  const cardBack = (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-white p-5 print:rounded-none print:p-6"
      style={{
        backfaceVisibility: 'hidden',
        transform: 'rotateY(180deg)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ background: `${theme.colors.primary}15` }}
          >
            <FileText className="h-3.5 w-3.5" style={{ color: theme.colors.primary }} />
          </div>
          <h3 className="text-xs font-black" style={{ color: theme.colors.text }}>
            {t('healthWallet.title')}
          </h3>
        </div>
        <Badge
          variant="outline"
          className="border-red-200 bg-red-50 text-[9px] font-bold text-red-600"
        >
          <AlertTriangle className="mr-1 h-2.5 w-2.5" />
          {t('healthWallet.emergency_access')}
        </Badge>
      </div>

      {/* Info rows */}
      <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto">
        {/* Emergency Contact */}
        <InfoRow
          icon={<Phone className="h-3.5 w-3.5" />}
          label={t('healthWallet.emergency_access')}
          value={patient.emergencyContact}
          color={theme.colors.primary}
        />

        {/* Allergies */}
        <InfoRow
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label={t('healthWallet.allergies')}
          value={patient.allergies.join(', ')}
          color="#D40000"
        />

        {/* Current Medications */}
        <InfoRow
          icon={<Pill className="h-3.5 w-3.5" />}
          label={t('healthWallet.current_medications')}
          value={patient.currentMedications.join(', ')}
          color={theme.colors.primary}
        />

        {/* Chronic Conditions */}
        <InfoRow
          icon={<Heart className="h-3.5 w-3.5" />}
          label={t('healthWallet.chronic_conditions')}
          value={patient.chronicConditions.join(', ')}
          color={theme.colors.accent}
        />

        {/* Vaccination Status */}
        {patient.vaccinationLastUpdate && (
          <InfoRow
            icon={<Shield className="h-3.5 w-3.5" />}
            label={t('healthWallet.vaccination_record')}
            value={`${t('healthWallet.last_updated')}: ${patient.vaccinationLastUpdate}`}
            color={theme.colors.primary}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex gap-2 border-t pt-3">
        <Button
          size="sm"
          className="flex-1 gap-1.5 text-[11px] font-bold"
          style={{
            background: theme.colors.primary,
            color: '#FFFFFF',
          }}
        >
          <Share2 className="h-3.5 w-3.5" />
          {t('healthWallet.share_with_doctor')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 text-[11px] font-bold"
        >
          <Download className="h-3.5 w-3.5" />
          {t('healthWallet.download_pdf')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {/* The 3-D card container */}
      <div
        className="relative w-full cursor-pointer select-none"
        style={{ perspective: '1200px' }}
        onClick={toggleFlip}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') toggleFlip();
        }}
        aria-label={isFlipped ? t('healthWallet.title') : t('healthWallet.title')}
      >
        {/* Aspect ratio wrapper — 85.6mm x 53.98mm ≈ 1.586:1 */}
        <div style={{ aspectRatio: '1.586 / 1' }}>
          <motion.div
            className="relative h-full w-full"
            style={{ transformStyle: 'preserve-3d' }}
            animate={isFlipped ? 'back' : 'front'}
            variants={flipVariants}
            transition={springTransition}
          >
            {cardFront}
            {cardBack}
          </motion.div>
        </div>
      </div>

      {/* Flip hint */}
      <button
        onClick={toggleFlip}
        className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-muted/80 print:hidden"
      >
        <RotateCcw className="h-3 w-3" />
        {isFlipped ? t('common.back') : t('healthWallet.emergency_access')}
      </button>
    </div>
  );
}

// ─── Info Row Sub-component ─────────────────────────────────────────
function InfoRow({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
        style={{ background: `${color}12` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-[11px] font-semibold leading-snug text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default HealthCard;
