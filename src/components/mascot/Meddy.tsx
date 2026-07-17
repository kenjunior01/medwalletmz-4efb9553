import { cn } from '@/lib/utils';
import meddyPatient from '@/assets/meddy/meddy-patient.png';
import meddyDoctor from '@/assets/meddy/meddy-doctor.png';
import meddyPharmacist from '@/assets/meddy/meddy-pharmacist.png';
import meddyDriver from '@/assets/meddy/meddy-driver.png';
import meddyClinic from '@/assets/meddy/meddy-clinic.png';
import meddyAdmin from '@/assets/meddy/meddy-admin.png';

const MEDDY_IMAGES: Record<MeddyRole, string> = {
  patient: meddyPatient,
  doctor: meddyDoctor,
  pharmacist: meddyPharmacist,
  driver: meddyDriver,
  clinic: meddyClinic,
  admin: meddyAdmin,
};

const STATE_ANIM: Record<MeddyState, string> = {
  idle: '',
  happy: 'animate-[meddy-bounce_1.6s_ease-in-out_infinite]',
  thinking: 'opacity-90',
  encouraging: 'animate-[meddy-bounce_1.2s_ease-in-out_infinite]',
  concerned: 'saturate-75',
  celebrating: 'animate-[meddy-wiggle_0.6s_ease-in-out_infinite]',
  waving: 'animate-[meddy-wiggle_1.4s_ease-in-out_infinite]',
};

export type MeddyRole = 'patient' | 'doctor' | 'pharmacist' | 'driver' | 'clinic' | 'admin';
export type MeddyState = 'idle' | 'happy' | 'thinking' | 'encouraging' | 'concerned' | 'celebrating' | 'waving';

interface Props {
  role?: MeddyRole;
  state?: MeddyState;
  size?: number;            // px
  className?: string;
  showRoleLabel?: boolean;  // mostra "Dr.", "Farmacêutico" etc por baixo
}

/**
 * Meddy — mascote oficial da MedWallet MZ.
 *
 * Corpo redondo branco com bata de médico, estetoscópio, olhos expressivos.
 * Adapta-se automaticamente ao role do utilizador:
 *   - patient     : bata simples, sorriso de boas-vindas
 *   - doctor      : estetoscópio + badge "Dr."
 *   - pharmacist  : bata + mortar/pilula no bolso
 *   - driver      : boné + mochila de entregas
 *   - clinic      : bata + cruz hospitalar
 *   - admin       : bata + clip de relatórios
 *
 * Estados emocionais (variam olhos + boca):
 *   - idle, happy, thinking, encouraging, concerned, celebrating, waving
 */
export function Meddy({ role = 'patient', state = 'idle', size = 120, className, showRoleLabel = false }: Props) {
  const src = MEDDY_IMAGES[role] ?? MEDDY_IMAGES.patient;
  return (
    <div className={cn("inline-flex flex-col items-center gap-1", className)}>
      <img
        src={src}
        alt={`Meddy ${roleLabel(role)}`}
        width={size}
        height={size}
        loading="lazy"
        draggable={false}
        style={{ width: size, height: size }}
        className={cn("object-contain select-none", STATE_ANIM[state])}
      />
      {showRoleLabel && (
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Meddy · {roleLabel(role)}
        </span>
      )}
    </div>
  );
}

// Legacy SVG renderer kept for reference / fallback (unused).
function MeddySvg({ role = 'patient', state = 'idle', size = 120, className, showRoleLabel = false }: Props) {
  const eyes = eyeFor(state);
  const mouth = mouthFor(state);
  const accessory = accessoryFor(role, state);
  return (
    <div className={cn("inline-flex flex-col items-center gap-1", className)}>
      <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`Meddy ${roleLabel(role)}`}>
        <defs>
          <linearGradient id="meddy-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>
          <linearGradient id="meddy-coat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
          <linearGradient id="meddy-bg-glow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#dbeafe" />
          </linearGradient>
        </defs>

        {/* Background glow */}
        <circle cx="100" cy="100" r="92" fill="url(#meddy-bg-glow)" opacity="0.55" />

        {/* Body — white coat */}
        <ellipse cx="100" cy="118" rx="62" ry="68" fill="url(#meddy-coat)" />

        {/* Coat collar V-shape */}
        <path d="M70 90 L100 122 L130 90 L122 82 L100 102 L78 82 Z" fill="#ffffff" />

        {/* Medical cross on chest */}
        <g transform="translate(100,138)">
          <rect x="-12" y="-3" width="24" height="6" rx="1.5" fill="#ffffff" />
          <rect x="-3" y="-12" width="6" height="24" rx="1.5" fill="#ffffff" />
        </g>

        {/* Head — round, warm */}
        <circle cx="100" cy="76" r="48" fill="#fde8d4" />
        {/* Cheeks */}
        <circle cx="74" cy="86" r="6" fill="#fb7185" opacity="0.45" />
        <circle cx="126" cy="86" r="6" fill="#fb7185" opacity="0.45" />

        {/* Hair tuft — small */}
        <path d="M82 36 Q100 22 118 36 Q108 28 100 30 Q92 28 82 36 Z" fill="#1f2937" />

        {/* Stethoscope */}
        <path d="M72 100 Q60 110 70 130 Q66 138 76 138" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
        <path d="M128 100 Q140 110 130 130 Q134 138 124 138" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="160" r="6" fill="#0f172a" />
        <circle cx="100" cy="160" r="3" fill="#06b6d4" />

        {/* Eyes */}
        {eyes}

        {/* Mouth */}
        {mouth}

        {/* Arms */}
        <ellipse cx="40" cy="140" rx="10" ry="14" fill="#fde8d4" />
        <ellipse cx="160" cy="140" rx="10" ry="14" fill="#fde8d4" />

        {/* Role-specific accessory */}
        {accessory}

        {/* Role indicator badge (bottom-right) */}
        <g transform="translate(160,160)">
          <circle r="18" fill="#ffffff" stroke="#06b6d4" strokeWidth="2.5" />
          {badgeIconFor(role)}
        </g>
      </svg>
      {showRoleLabel && (
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Meddy · {roleLabel(role)}
        </span>
      )}
    </div>
  );
}

function eyeFor(state: MeddyState) {
  switch (state) {
    case 'happy':
      return (
        <g>
          <path d="M78 70 Q84 64 90 70" fill="none" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M110 70 Q116 64 122 70" fill="none" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case 'thinking':
      return (
        <g>
          <ellipse cx="84" cy="76" rx="4" ry="5" fill="#1f2937" />
          <ellipse cx="116" cy="76" rx="4" ry="5" fill="#1f2937" />
          <circle cx="86" cy="74" r="1.5" fill="#ffffff" />
        </g>
      );
    case 'encouraging':
      return (
        <g>
          <ellipse cx="84" cy="76" rx="5" ry="6" fill="#1f2937" />
          <ellipse cx="116" cy="76" rx="5" ry="6" fill="#1f2937" />
          <path d="M86 74 Q88 72 90 74" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M118 74 Q120 72 122 74" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'celebrating':
      return (
        <g>
          <path d="M76 78 L90 70 L88 78 M124 78 L110 70 L112 78" fill="#1f2937" stroke="#1f2937" strokeWidth="2.5" strokeLinejoin="round" />
        </g>
      );
    default:
      return (
        <g>
          <ellipse cx="84" cy="76" rx="5" ry="6" fill="#1f2937" />
          <ellipse cx="116" cy="76" rx="5" ry="6" fill="#1f2937" />
          <circle cx="86" cy="74" r="1.8" fill="#ffffff" />
          <circle cx="118" cy="74" r="1.8" fill="#ffffff" />
        </g>
      );
  }
}

function mouthFor(state: MeddyState) {
  switch (state) {
    case 'happy':
      return <path d="M88 92 Q100 104 112 92" fill="none" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />;
    case 'thinking':
      return <path d="M92 96 L108 96" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />;
    case 'encouraging':
      return (
        <g>
          <path d="M86 92 Q100 108 114 92" fill="#dc2626" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case 'concerned':
      return <path d="M90 98 Q100 90 110 98" fill="none" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />;
    case 'celebrating':
      return <path d="M84 92 Q100 110 116 92 L100 100 Z" fill="#dc2626" stroke="#1f2937" strokeWidth="2.5" strokeLinejoin="round" />;
    case 'waving':
      return <path d="M86 94 Q100 102 114 94" fill="none" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />;
    default:
      return <path d="M88 94 Q100 100 112 94" fill="none" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" />;
  }
}

function accessoryFor(role: MeddyRole, state: MeddyState) {
  switch (role) {
    case 'doctor':
      // Name badge
      return (
        <g>
          <rect x="76" y="106" width="22" height="14" rx="2" fill="#ffffff" stroke="#1f2937" strokeWidth="1" />
          <text x="87" y="116" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#0891b2">Dr</text>
        </g>
      );
    case 'pharmacist':
      // Pill on pocket
      return (
        <g transform="translate(108,120) rotate(15)">
          <rect x="0" y="0" width="10" height="4" rx="2" fill="#fb923c" />
          <rect x="0" y="0" width="5" height="4" rx="2" fill="#fb923c" />
          <rect x="5" y="0" width="5" height="4" rx="0" fill="#fef3c7" />
        </g>
      );
    case 'driver':
      // Cap
      return (
        <g>
          <path d="M80 36 Q100 22 120 36 Q116 42 100 42 Q84 42 80 36 Z" fill="#dc2626" />
          <rect x="78" y="40" width="44" height="6" rx="2" fill="#dc2626" />
          <text x="100" y="34" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#ffffff">MZ</text>
        </g>
      );
    case 'clinic':
      // Hospital cross
      return (
        <g transform="translate(100,30)">
          <rect x="-3" y="-8" width="6" height="16" fill="#dc2626" />
          <rect x="-8" y="-3" width="16" height="6" fill="#dc2626" />
        </g>
      );
    case 'admin':
      // Clipboard
      return (
        <g transform="translate(108,110)">
          <rect x="0" y="0" width="18" height="22" rx="2" fill="#1f2937" />
          <rect x="6" y="-3" width="6" height="4" rx="1" fill="#1f2937" />
          <rect x="3" y="4" width="12" height="2" fill="#ffffff" />
          <rect x="3" y="8" width="12" height="2" fill="#ffffff" />
          <rect x="3" y="12" width="8" height="2" fill="#ffffff" />
        </g>
      );
    default:
      // Nothing extra for patient
      return null;
  }
}

function badgeIconFor(role: MeddyRole) {
  switch (role) {
    case 'doctor':
      return (
        <g>
          <path d="M-5 -2 L-2 -2 L-2 4 L-5 4 Z M-2 -2 L1 -2 L1 4 L-2 4 Z M-3 -5 L-1 -5 L-1 0 L-3 0 Z M-1 -5 L1 -5 L1 0 L-1 0 Z" fill="#dc2626" />
        </g>
      );
    case 'pharmacist':
      return (
        <g transform="translate(-7,-3)">
          <rect width="14" height="6" rx="3" fill="#fb923c" />
          <rect width="7" height="6" rx="3" fill="#fb923c" />
          <rect x="7" width="7" height="6" rx="0" fill="#fef3c7" />
          <line x1="7" y1="0" x2="7" y2="6" stroke="#ffffff" strokeWidth="0.8" />
        </g>
      );
    case 'driver':
      return (
        <g>
          <path d="M-7 -2 Q0 -7 7 -2 L5 2 L-5 2 Z" fill="#dc2626" />
          <rect x="-7" y="2" width="14" height="3" rx="1" fill="#dc2626" />
        </g>
      );
    case 'clinic':
      return (
        <g>
          <rect x="-2" y="-7" width="4" height="14" fill="#dc2626" />
          <rect x="-7" y="-2" width="14" height="4" fill="#dc2626" />
        </g>
      );
    case 'admin':
      return (
        <g>
          <rect x="-5" y="-6" width="10" height="12" rx="1" fill="#1f2937" />
          <rect x="-2" y="-7" width="4" height="2" rx="1" fill="#1f2937" />
          <line x1="-3" y1="-2" x2="3" y2="-2" stroke="#ffffff" strokeWidth="1" />
          <line x1="-3" y1="0" x2="3" y2="0" stroke="#ffffff" strokeWidth="1" />
          <line x1="-3" y1="2" x2="2" y2="2" stroke="#ffffff" strokeWidth="1" />
        </g>
      );
    default:
      return (
        <g>
          <path d="M0 -6 L0 -1 M-4 -3 L4 -3" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
  }
}

function roleLabel(role: MeddyRole): string {
  return {
    patient: 'Paciente',
    doctor: 'Médico',
    pharmacist: 'Farmacêutico',
    driver: 'Entregador',
    clinic: 'Clínica',
    admin: 'Admin',
  }[role];
}