/**
 * MedWallet MZ — Health & Medical Icon Pack (Batch 3)
 *
 * 30 premium hand-crafted SVG icons with gradients, glow effects,
 * and medical/health theming for the MedWallet MZ platform.
 * Each icon incorporates unique medical design elements not found
 * in generic icon libraries.
 */
import { createMWIcon } from './MedwalletIconBase';

// ─── 1. MWDroplet ────────────────────────────────────────────────
// Blood drop with small plus cross inside, gradient fill, reflection arc
export const MWDroplet = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.15" />
      {/* Drop body with subtle gradient fill */}
      <path
        d="M12 3 C12 3 5 10.5 5 15 C5 18.87 8.13 22 12 22 C15.87 22 19 18.87 19 15 C19 10.5 12 3 12 3Z"
        fill={grad ? `url(#${id}-grad)` : 'currentColor'} opacity={grad ? 0.1 : 0}
      />
      {/* Drop outline */}
      <path
        d="M12 3 C12 3 5 10.5 5 15 C5 18.87 8.13 22 12 22 C15.87 22 19 18.87 19 15 C19 10.5 12 3 12 3Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Plus cross inside drop */}
      <line x1="10" y1="15" x2="14" y2="15" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="13" x2="12" y2="17" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      {/* Reflection arc on left */}
      <path d="M8.5 8.5 Q9.5 7.5 10.5 8" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" fill="none" />
      <circle cx="8" cy="7.5" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 2. MWHeartPulse ────────────────────────────────────────────
// Heart with detailed ECG waveform through it, gradient stroke, pulse rings
export const MWHeartPulse = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Outer pulse rings */}
      <circle cx="4" cy="4" r="2.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.5" fill="none" opacity="0.15" />
      <circle cx="3" cy="3" r="1.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.4" fill="none" opacity="0.25" />
      {/* Heart outline */}
      <path
        d="M12 20.5 L3.5 12 C2.5 11 2 9.5 2.5 8 C3 6.5 4.5 5.5 6 5.5 C7.5 5.5 9 6.5 10 8 L12 10 L14 8 C15 6.5 16.5 5.5 18 5.5 C19.5 5.5 21 6.5 21.5 8 C22 9.5 21.5 11 20.5 12 L12 20.5Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* ECG waveform through heart center */}
      <polyline
        points="4 13 7 13 8 10.5 9.2 15.5 10.5 9 12 14 13.2 10.5 14.5 13 17 13 20 13"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      <circle cx="3" cy="3" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 3. MWFileText ──────────────────────────────────────────────
// Document with medical header bar, heartbeat bumps as text lines, medical stamp corner
export const MWFileText = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Document body */}
      <path
        d="M5 2.5 L14 2.5 L19 7.5 L19 21.5 C19 21.78 18.78 22 18.5 22 L5.5 22 C5.22 22 5 21.78 5 21.5 L5 3 C5 2.72 5.22 2.5 5.5 2.5Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Corner fold */}
      <path d="M14 2.5 L14 6.5 C14 7.05 14.45 7.5 15 7.5 L19 7.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Medical header bar */}
      <rect x="7" y="5" width="5" height="1.5" rx="0.75" fill={grad ? `url(#${id}-grad)` : 'currentColor'} opacity="0.7" />
      {/* Small header cross */}
      <path d="M11 5.2 L11 6.3 M10.2 5.75 L11.8 5.75" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" />
      {/* Text line 1 */}
      <rect x="7" y="9" width="3" height="1.2" rx="0.6" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.35" />
      {/* Heartbeat bump replacing text line 2 */}
      <polyline points="7 12 8 12 8.5 11.3 9 12.7 9.5 11 11.5 12"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Heartbeat bump replacing text line 3 */}
      <polyline points="7 15 8.5 15 9 14.3 9.5 15.7 10 15 12 15"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.65" />
      {/* Standard text line */}
      <line x1="7" y1="18" x2="12" y2="18" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.1" strokeLinecap="round" opacity="0.4" />
      <line x1="7" y1="20" x2="10" y2="20" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.1" strokeLinecap="round" opacity="0.25" />
      {/* Medical stamp circle in corner */}
      <circle cx="16" cy="17" r="2.8" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" fill="none" opacity="0.45" />
      <path d="M15 17 L17 17 M16 16 L16 18" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.45" />
      <circle cx="14.5" cy="5" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 4. MWClipboardList ─────────────────────────────────────────
// Clipboard with cross at clip, checkbox items with some filled, heartbeat replacing one item
export const MWClipboardList = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Clipboard body */}
      <rect x="5" y="4" width="14" height="17" rx="1.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.6" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Clipboard clip with medical cross */}
      <rect x="9" y="2" width="6" height="4" rx="1.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.4" fill="none" />
      <line x1="12" y1="3" x2="12" y2="5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" />
      <line x1="11" y1="4" x2="13" y2="4" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" />
      {/* Checkbox item 1 - filled */}
      <rect x="8" y="9" width="2.5" height="2.5" rx="0.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" fill={grad ? `url(#${id}-grad)` : 'currentColor'} opacity="0.3" />
      <polyline points="8.8 10.5 9.5 11.2 11 9.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="12" y1="10.2" x2="17" y2="10.2" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      {/* Checkbox item 2 - unfilled */}
      <rect x="8" y="13" width="2.5" height="2.5" rx="0.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" fill="none" />
      {/* Heartbeat replacing third item */}
      <polyline points="8 17 9 17 9.5 16.2 10 17.8 10.5 16.5 11.5 17 17 17"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Decorative dots */}
      <circle cx="7" cy="7" r="0.5" fill={`url(#${id}-accent)`} opacity="0.3" />
      <circle cx="17" cy="7" r="0.5" fill={`url(#${id}-accent)`} opacity="0.3" />
      <circle cx="5" cy="4" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 5. MWScan ───────────────────────────────────────────────────
// Scanning corner brackets with medical cross at center, gradient beam lines
export const MWScan = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Top-left bracket */}
      <path d="M4 8 L4 4 L8 4" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Top-right bracket */}
      <path d="M16 4 L20 4 L20 8" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Bottom-left bracket */}
      <path d="M4 16 L4 20 L8 20" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Bottom-right bracket */}
      <path d="M20 16 L20 20 L16 20" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Medical cross at center */}
      <line x1="12" y1="9.5" x2="12" y2="14.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <line x1="9.5" y1="12" x2="14.5" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Gradient beam lines */}
      <line x1="4" y1="12" x2="8" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.35" />
      <line x1="16" y1="12" x2="20" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.35" />
      <line x1="12" y1="4" x2="12" y2="8" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.35" />
      <line x1="12" y1="16" x2="12" y2="20" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.35" />
      {/* Scan sweep arc */}
      <path d="M6 9 Q12 7 18 9" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.25" strokeDasharray="2 2" />
      {/* Corner accent dots */}
      <circle cx="4" cy="4" r="0.8" fill={`url(#${id}-accent)`} />
      <circle cx="20" cy="4" r="0.6" fill={`url(#${id}-accent)`} opacity="0.5" />
    </>
  )
);

// ─── 6. MWActivity ──────────────────────────────────────────────
// Full ECG monitor waveform (P, QRS, T waves), gradient stroke, grid dots
export const MWActivity = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Grid dots */}
      {[...Array(5)].map((_, row) =>
        [...Array(9)].map((_, col) => (
          <circle key={`${row}-${col}`} cx={4 + col * 2} cy={4 + row * 4} r="0.3" fill={grad ? `url(#${id}-grad)` : 'currentColor'} opacity="0.15" />
        ))
      )}
      {/* ECG baseline */}
      <line x1="2" y1="12" x2="22" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.4" opacity="0.2" />
      {/* Full ECG waveform: P wave, QRS complex, T wave */}
      <polyline
        points="2 12 4 12 5 11 6 11.5 7 12 8 12 9 10 10 16 11 8 12 12 13 14 14 10 15 12 17 12 19 11 20 11 21 12 22 12"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Secondary faint wave */}
      <polyline
        points="2 12 4 12 5 11.2 6 11.8 7 12 22 12"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.25"
      />
      {/* Peak accent */}
      <circle cx="11" cy="8" r="0.8" fill={`url(#${id}-accent)`} />
      {/* Valley accent */}
      <circle cx="10" cy="16" r="0.6" fill={`url(#${id}-accent)`} opacity="0.5" />
    </>
  )
);

// ─── 7. MWShieldCheck ────────────────────────────────────────────
// Shield with checkmark having cross in stem, circuit pattern, gradient fill
export const MWShieldCheck = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Shield body with gradient fill */}
      <path
        d="M12 2 L4 6 L4 12 C4 16.5 7.5 20 12 21.5 C16.5 20 20 16.5 20 12 L20 6 L12 2Z"
        fill={grad ? `url(#${id}-grad)` : 'currentColor'} opacity={grad ? 0.08 : 0}
      />
      <path
        d="M12 2 L4 6 L4 12 C4 16.5 7.5 20 12 21.5 C16.5 20 20 16.5 20 12 L20 6 L12 2Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Checkmark with cross in stem */}
      <polyline points="7.5 12 10.5 15 16.5 9"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Cross on checkmark stem */}
      <line x1="10.5" y1="13" x2="10.5" y2="17" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="9" y1="15" x2="12" y2="15" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      {/* Circuit pattern dots */}
      <circle cx="6" cy="10" r="0.5" fill={`url(#${id}-accent)`} opacity="0.3" />
      <circle cx="18" cy="10" r="0.5" fill={`url(#${id}-accent)`} opacity="0.3" />
      <circle cx="8" cy="17" r="0.4" fill={`url(#${id}-accent)`} opacity="0.2" />
      <circle cx="16" cy="17" r="0.4" fill={`url(#${id}-accent)`} opacity="0.2" />
      {/* Top accent */}
      <circle cx="12" cy="2" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 8. MWThermometerSun ────────────────────────────────────────
// Thermometer with gradient mercury, sun rays, cross on bulb
export const MWThermometerSun = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Thermometer body */}
      <rect x="9.5" y="4" width="3" height="12" rx="1.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.6" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Thermometer bulb */}
      <circle cx="11" cy="18" r="2.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.6" fill="none"
      />
      {/* Gradient mercury inside */}
      <rect x="10.3" y="9" width="1.4" height="7" rx="0.7"
        fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity={grad ? 0.7 : 0.4}
      />
      <circle cx="11" cy="18" r="1.5" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity={grad ? 0.5 : 0.3} />
      {/* Cross on bulb */}
      <line x1="10" y1="18" x2="12" y2="18" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" />
      <line x1="11" y1="17" x2="11" y2="19" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" />
      {/* Tick marks */}
      <line x1="13" y1="6" x2="14.5" y2="6" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
      <line x1="13" y1="9" x2="14.5" y2="9" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
      <line x1="13" y1="12" x2="14.5" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
      {/* Sun with rays */}
      <circle cx="18" cy="6" r="2"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" fill="none"
      />
      <line x1="18" y1="2.5" x2="18" y2="3.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" />
      <line x1="18" y1="8.5" x2="18" y2="9.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" />
      <line x1="14.5" y1="6" x2="15.5" y2="6" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" />
      <line x1="20.5" y1="6" x2="21.5" y2="6" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" />
      <line x1="15.8" y1="3.8" x2="16.5" y2="4.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" />
      <line x1="19.5" y1="7.5" x2="20.2" y2="8.2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" />
      <line x1="20.2" y1="3.8" x2="19.5" y2="4.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" />
      <line x1="16.5" y1="7.5" x2="15.8" y2="8.2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="18" cy="6" r="0.7" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 9. MWMapPin ────────────────────────────────────────────────
// Location pin with medical cross in circle, pulse ring, gradient
export const MWMapPin = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Pulse ring behind */}
      <circle cx="12" cy="9" r="7" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.5" fill="none" opacity="0.15" />
      <circle cx="12" cy="9" r="9" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.3" fill="none" opacity="0.08" />
      {/* Pin body */}
      <path
        d="M12 2 C8.13 2 5 5.13 5 9 C5 14 12 22 12 22 C12 22 19 14 19 9 C19 5.13 15.87 2 12 2Z"
        fill={grad ? `url(#${id}-grad)` : 'currentColor'} opacity={grad ? 0.08 : 0}
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      <path
        d="M12 2 C8.13 2 5 5.13 5 9 C5 14 12 22 12 22 C12 22 19 14 19 9 C19 5.13 15.87 2 12 2Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Medical cross inside circle */}
      <circle cx="12" cy="9" r="4" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" fill="none" opacity="0.6" />
      <line x1="10.2" y1="9" x2="13.8" y2="9" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="12" y1="7.2" x2="12" y2="10.8" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="12" cy="22" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 10. MWBaby ──────────────────────────────────────────────────
// Baby face silhouette with heartbeat headband, star accent
export const MWBaby = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Head circle */}
      <circle cx="12" cy="11" r="6.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.6" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Eyes */}
      <circle cx="9.5" cy="10" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} />
      <circle cx="14.5" cy="10" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} />
      {/* Smile */}
      <path d="M9.5 14 Q12 16 14.5 14" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" fill="none" />
      {/* Heartbeat headband */}
      <polyline points="5.5 8 7 8 7.5 7.2 8 8.8 8.5 7.5 9.5 8 14.5 8 15.5 7.5 16 8.8 16.5 7.2 17 8 18.5 8"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Star accent */}
      <path d="M12 4 L11.6 5 L10.5 5.3 L11.4 6 L11.2 7 L12 6.5 L12.8 7 L12.6 6 L13.5 5.3 L12.4 5 Z" fill={`url(#${id}-accent)`} opacity="0.7" />
      {/* Body hint */}
      <path d="M7 17 Q12 21 17 17" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.4" />
      <circle cx="18" cy="6" r="0.6" fill={`url(#${id}-accent)`} opacity="0.4" />
    </>
  )
);

// ─── 11. MWPawPrint ─────────────────────────────────────────────
// Paw with heart-shaped main pad, cross on pad, gradient toe circles
export const MWPawPrint = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Heart-shaped main pad */}
      <path
        d="M12 22 C12 22 6 17 6 14 C6 11.5 8 10 10 10.5 C11 10.8 11.5 11.5 12 12 C12.5 11.5 13 10.8 14 10.5 C16 10 18 11.5 18 14 C18 17 12 22 12 22Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Cross on main pad */}
      <line x1="10" y1="14.5" x2="14" y2="14.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="12" y1="12.5" x2="12" y2="16.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.4" strokeLinecap="round" />
      {/* Toe circles with gradient */}
      <circle cx="7.5" cy="8" r="2" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.3" fill={grad ? `url(#${id}-grad)` : 'currentColor'} opacity={grad ? 0.1 : 0} />
      <circle cx="12" cy="6.5" r="2" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.3" fill={grad ? `url(#${id}-grad)` : 'currentColor'} opacity={grad ? 0.1 : 0} />
      <circle cx="16.5" cy="8" r="2" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.3" fill={grad ? `url(#${id}-grad)` : 'currentColor'} opacity={grad ? 0.1 : 0} />
      {/* Toe accent dots */}
      <circle cx="7.5" cy="8" r="0.6" fill={`url(#${id}-accent)`} />
      <circle cx="12" cy="6.5" r="0.6" fill={`url(#${id}-accent)`} />
      <circle cx="16.5" cy="8" r="0.6" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 12. MWMegaphone ────────────────────────────────────────────
// Speaker with medical cross on bell, heartbeat sound waves
export const MWMegaphone = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Megaphone body */}
      <path
        d="M3 10 L3 14 L6 14 L12 19 L12 5 L6 10 L3 10Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Bell flare */}
      <path
        d="M12 5 L16 3 L16 21 L12 19"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
      {/* Medical cross on bell */}
      <line x1="14" y1="10" x2="14" y2="14" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12.5" y1="12" x2="15.5" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      {/* Heartbeat sound waves */}
      <polyline points="17 8 18 8 18.3 7.2 18.7 8.8 19 7.5 19.5 8 20 8"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7"
      />
      <polyline points="17 12 18.5 12 18.8 11 19.2 13 19.5 11.5 20 12 21 12"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5"
      />
      <polyline points="17 16 17.8 16 18 15.3 18.3 16.7 18.5 16 19 16"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.3"
      />
      <circle cx="3" cy="12" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 13. MWStore ────────────────────────────────────────────────
// Pharmacy storefront with cross, gradient awning stripes
export const MWStore = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Building body */}
      <rect x="4" y="9" width="16" height="12" rx="1"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.6" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Awning stripes */}
      <path d="M2 9 L4 9 L4 4 L8 4 L8 9" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
      <path d="M8 4 L8 9 M12 4 L12 9 M16 4 L16 9" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.3" />
      {/* Awning top curve */}
      <path d="M4 4 Q8 2 12 4 Q16 2 20 4" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      {/* Door */}
      <rect x="10" y="14" width="4" height="7" rx="0.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" fill="none" />
      {/* Medical cross on building */}
      <line x1="12" y1="10" x2="12" y2="13" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="10.5" y1="11.5" x2="13.5" y2="11.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" />
      {/* Window */}
      <rect x="5" y="11" width="3" height="3" rx="0.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" fill="none" opacity="0.5" />
      <rect x="16" y="11" width="3" height="3" rx="0.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" fill="none" opacity="0.5" />
      {/* Awning dot accents */}
      <circle cx="4" cy="4" r="0.8" fill={`url(#${id}-accent)`} />
      <circle cx="12" cy="3" r="0.5" fill={`url(#${id}-accent)`} opacity="0.5" />
      <circle cx="20" cy="4" r="0.6" fill={`url(#${id}-accent)`} opacity="0.4" />
    </>
  )
);

// ─── 14. MWBriefcase ────────────────────────────────────────────
// Professional briefcase with medical cross on clasp
export const MWBriefcase = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Briefcase body */}
      <rect x="3" y="8" width="18" height="12" rx="2"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.6" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Handle */}
      <path d="M8 8 L8 6 C8 4.9 8.9 4 10 4 L14 4 C15.1 4 16 4.9 16 6 L16 8"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {/* Clasp line */}
      <line x1="12" y1="8" x2="12" y2="14" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      {/* Medical cross on clasp */}
      <line x1="12" y1="11" x2="12" y2="17" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <line x1="9" y1="14" x2="15" y2="14" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Bottom accent line */}
      <line x1="6" y1="17" x2="18" y2="17" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.25" />
      {/* Corner rivets */}
      <circle cx="6" cy="10" r="0.5" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
      <circle cx="18" cy="10" r="0.5" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
      <circle cx="12" cy="4" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 15. MWPhone ────────────────────────────────────────────────
// Phone with heartbeat line on screen, gradient stroke
export const MWPhone = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Phone body */}
      <rect x="6" y="2" width="12" height="20" rx="2.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.6" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Screen area */}
      <rect x="8" y="5" width="8" height="12" rx="0.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" fill="none" opacity="0.4"
      />
      {/* Heartbeat on screen */}
      <polyline points="9 11 10 11 10.5 10.2 11 11.8 11.5 10.5 12 11 13 11 14 11 14.5 10.2 15 11.8"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Home button */}
      <circle cx="12" cy="19.5" r="1" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" fill="none" opacity="0.5" />
      {/* Small cross on home button */}
      <line x1="11.5" y1="19.5" x2="12.5" y2="19.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.5" strokeLinecap="round" />
      <line x1="12" y1="19" x2="12" y2="20" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.5" strokeLinecap="round" />
      {/* Speaker slit */}
      <line x1="10" y1="3.5" x2="14" y2="3.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.3" />
      <circle cx="6" cy="2" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 16. MWPhoneCall ────────────────────────────────────────────
// Phone with heartbeat-shaped call waves
export const MWPhoneCall = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Phone handset */}
      <path
        d="M5.5 4.5 C6 3 8 2.5 9.5 3.5 L10.5 4.5 C11 5 11 6 10.5 6.5 L9 8 C9.5 9.5 10.5 11 12 12.5 C13.5 14 15 15 16.5 15.5 L18 14 C18.5 13.5 19.5 13.5 20 14 L21 15 C22 16.5 21.5 18.5 20 19 L18.5 19.5 C14 20.5 8.5 16 5.5 10 L5.5 4.5Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Heartbeat call waves */}
      <polyline points="1 9 2 9 2.3 8.2 2.7 9.8 3 8.5 3.5 9"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6"
      />
      <polyline points="1 12 2.5 12 2.8 11 3.2 13 3.5 11.5 4 12"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.45"
      />
      <polyline points="1 15 1.8 15 2 14.3 2.3 15.7 2.5 15"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.3"
      />
      {/* Keypad dots */}
      <circle cx="14" cy="10" r="0.4" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.3" />
      <circle cx="16" cy="10" r="0.4" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.3" />
      <circle cx="14" cy="12" r="0.4" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.3" />
      <circle cx="16" cy="12" r="0.4" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.3" />
      <circle cx="5" cy="4" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 17. MWGlobe ────────────────────────────────────────────────
// Globe with medical cross at intersection of lat/long lines, small star at Mozambique position
export const MWGlobe = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Globe circle */}
      <circle cx="12" cy="12" r="9"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.6" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Longitude lines */}
      <ellipse cx="12" cy="12" rx="4" ry="9" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.7" fill="none" opacity="0.3" />
      {/* Latitude lines */}
      <ellipse cx="12" cy="12" rx="9" ry="3.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.7" fill="none" opacity="0.3" />
      <line x1="3" y1="12" x2="21" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.7" opacity="0.3" />
      <line x1="12" y1="3" x2="12" y2="21" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.7" opacity="0.3" />
      {/* Medical cross at intersection */}
      <line x1="12" y1="10" x2="12" y2="14" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <line x1="10" y1="12" x2="14" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Star at approximate Mozambique position (southeast Africa) */}
      <path d="M15.5 8.5 L15.3 9.2 L14.7 9.4 L15.3 9.6 L15.5 10.3 L15.7 9.6 L16.3 9.4 L15.7 9.2 Z" fill={`url(#${id}-accent)`} opacity="0.8" />
      {/* Orbital ring */}
      <ellipse cx="12" cy="12" rx="10" ry="3" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.4" fill="none" opacity="0.15" transform="rotate(-20 12 12)" />
      <circle cx="3" cy="12" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 18. MWMap ──────────────────────────────────────────────────
// Folded map with medical pin, heartbeat route lines
export const MWMap = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Map body — folded triangular shape */}
      <path
        d="M2 6 L2 18 L8 15 L16 18 L22 15 L22 3 L16 6 L8 3 L2 6Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Fold lines */}
      <line x1="8" y1="3" x2="8" y2="15" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
      <line x1="16" y1="6" x2="16" y2="18" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
      {/* Medical pin */}
      <path d="M12 7.5 C10.3 7.5 9 8.8 9 10.5 C9 13 12 16 12 16 C12 16 15 13 15 10.5 C15 8.8 13.7 7.5 12 7.5Z"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
      <circle cx="12" cy="10.5" r="1.2" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.5" />
      {/* Heartbeat route line */}
      <polyline points="4 12 5.5 12 6 11.3 6.5 12.7 7 12 8 12"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5"
      />
      <polyline points="16 12 17 12 17.3 11.3 17.7 12.7 18 12 20 12"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5"
      />
      <circle cx="2" cy="6" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 19. MWNavigate ──────────────────────────────────────────────
// Compass arrow with medical cross at pivot, gradient
export const MWNavigate = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Arrow shaft pointing up */}
      <path
        d="M12 21 L12 6 L7 14 L12 12 L17 14 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Arrow head */}
      <path
        d="M7 14 L12 4 L17 14"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill={grad ? `url(#${id}-grad)` : 'currentColor'}
        opacity={grad ? 0.15 : 0.1}
      />
      {/* Medical cross at pivot */}
      <circle cx="12" cy="12" r="2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" fill="none" />
      <line x1="12" y1="11" x2="12" y2="13" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="11" y1="12" x2="13" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      {/* Direction indicator — small heartbeat at top */}
      <polyline points="10 5 11 5 11.2 4.5 11.5 5.5 11.8 5 14 5"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5"
      />
      {/* Motion trail */}
      <circle cx="12" cy="22" r="0.6" fill={`url(#${id}-accent)`} opacity="0.4" />
      <circle cx="12" cy="23" r="0.4" fill={`url(#${id}-accent)`} opacity="0.2" />
      <circle cx="12" cy="4" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 20. MWCompass ──────────────────────────────────────────────
// Compass with medical cross at needle center, gradient N/S
export const MWCompass = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Outer ring */}
      <circle cx="12" cy="12" r="9"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.6" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Tick marks — N, E, S, W */}
      <line x1="12" y1="3" x2="12" y2="5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="12" y1="19" x2="12" y2="21" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="3" y1="12" x2="5" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="19" y1="12" x2="21" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      {/* Diagonal ticks */}
      <line x1="5.4" y1="5.4" x2="6.8" y2="6.8" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.3" />
      <line x1="17.2" y1="6.8" x2="18.6" y2="5.4" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.3" />
      <line x1="5.4" y1="18.6" x2="6.8" y2="17.2" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.3" />
      <line x1="17.2" y1="17.2" x2="18.6" y2="18.6" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.3" />
      {/* Needle — North */}
      <path d="M12 6 L14 12 L12 14 L10 12 Z" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinejoin="round" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity={grad ? 0.3 : 0.15} />
      {/* Needle — South */}
      <path d="M12 18 L14 12 L12 14 L10 12 Z" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinejoin="round" fill="none" />
      {/* Medical cross at center */}
      <circle cx="12" cy="12" r="1.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" fill="none" />
      <line x1="12" y1="11" x2="12" y2="13" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" />
      <line x1="11" y1="12" x2="13" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" />
      <circle cx="12" cy="3" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 21. MWUser ──────────────────────────────────────────────────
// Person silhouette with medical cross on chest, aura circle
export const MWUser = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Aura circle */}
      <circle cx="12" cy="12" r="9.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.4" fill="none" opacity="0.15" />
      {/* Head */}
      <circle cx="12" cy="7" r="3.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.6" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Body */}
      <path
        d="M5 21 C5 16.5 8 13.5 12 13.5 C16 13.5 19 16.5 19 21"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" fill="none"
      />
      {/* Medical cross on chest */}
      <line x1="12" y1="15" x2="12" y2="18.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <line x1="10.2" y1="16.7" x2="13.8" y2="16.7" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Aura dots */}
      <circle cx="4" cy="10" r="0.4" fill={`url(#${id}-accent)`} opacity="0.25" />
      <circle cx="20" cy="10" r="0.4" fill={`url(#${id}-accent)`} opacity="0.25" />
      <circle cx="8" cy="4" r="0.5" fill={`url(#${id}-accent)`} opacity="0.3" />
      <circle cx="12" cy="3" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 22. MWUserPlus ─────────────────────────────────────────────
// Person with medical-cross styled plus sign
export const MWUserPlus = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Head */}
      <circle cx="9" cy="7" r="3"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.6" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Body */}
      <path
        d="M3 20 C3 16 5.5 13 9 13 C12.5 13 15 16 15 20"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" fill="none"
      />
      {/* Medical-cross styled plus sign */}
      <circle cx="18" cy="13" r="4" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" fill="none" />
      <line x1="18" y1="11" x2="18" y2="15" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <line x1="16" y1="13" x2="20" y2="13" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Small cross accents on the plus circle */}
      <line x1="18" y1="10" x2="18" y2="10.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.4" />
      <line x1="17.8" y1="10.2" x2="18.2" y2="10.2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.4" />
      {/* Decorative dots */}
      <circle cx="6" cy="4" r="0.5" fill={`url(#${id}-accent)`} opacity="0.3" />
      <circle cx="22" cy="8" r="0.6" fill={`url(#${id}-accent)`} opacity="0.4" />
      <circle cx="9" cy="3.5" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 23. MWTrophy ───────────────────────────────────────────────
// Diamond achievement frame with inner glow and medical cross
// Unique identity: geometric diamond, NOT a traditional trophy cup
export const MWTrophy = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Diamond outer frame */}
      <path
        d="M12 2 L20 8 L20 16 L12 22 L4 16 L4 8 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity={grad ? 0.12 : 0}
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Diamond stroke */}
      <path
        d="M12 2 L20 8 L20 16 L12 22 L4 16 L4 8 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Inner diamond */}
      <path
        d="M12 5.5 L17 9 L17 15 L12 18.5 L7 15 L7 9 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"
        fill="none" opacity="0.35"
      />
      {/* Medical cross at center */}
      <line x1="12" y1="8.5" x2="12" y2="15.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      <line x1="9" y1="12" x2="15" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Horizontal decorative lines */}
      <line x1="5" y1="8" x2="8" y2="8" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="5" y1="16" x2="8" y2="16" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="16" y1="8" x2="19" y2="8" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="16" y1="16" x2="19" y2="16" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      {/* Top glow dot */}
      <circle cx="12" cy="2" r="1.2" fill={grad ? `url(#${id}-accent)` : 'currentColor'} filter={glow ? `url(#${id}-glow-strong)` : undefined} opacity="0.8" />
    </>
  )
);

// ─── 24. MWMedal ─────────────────────────────────────────────────
// Circular badge with concentric rings, medical cross, pulse arcs
// Unique identity: tech badge with signal arcs, NOT a traditional medal
export const MWMedal = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Outer ring */}
      <circle cx="12" cy="13" r="8"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Middle ring */}
      <circle cx="12" cy="13" r="5.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" fill="none" opacity="0.4" />
      {/* Inner filled circle */}
      <circle cx="12" cy="13" r="3" fill={grad ? `url(#${id}-radial)` : 'currentColor'} opacity={grad ? 0.3 : 0.1} />
      {/* Medical cross at center */}
      <line x1="12" y1="11" x2="12" y2="15" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <line x1="10" y1="13" x2="14" y2="13" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Signal arcs radiating outward */}
      <path d="M5 7 Q7 5.5 9 7" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M15 7 Q17 5.5 19 7" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M3.5 9 Q6 6.5 8.5 9" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.3" />
      <path d="M15.5 9 Q18 6.5 20.5 9" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.3" />
      {/* Bottom accent lines */}
      <line x1="9" y1="21" x2="12" y2="23" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <line x1="12" y1="23" x2="15" y2="21" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    </>
  )
);

// ─── 25. MWSparkles ──────────────────────────────────────────────
// Concentric signal waves with central pulse — unique identity
// NOT generic sparkle stars; this is a medical signal/radar pulse
export const MWSparkles = createMWIcon(
  (id, glow, grad) => (
    <>
      {/* Outer signal arc */}
      <path d="M3 7 Q5 3 12 2 Q19 3 21 7" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.3" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Middle signal arc */}
      <path d="M5 9 Q7 5.5 12 4.5 Q17 5.5 19 9" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.45" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Inner signal arc */}
      <path d="M7 11 Q8.5 8.5 12 7.5 Q15.5 8.5 17 11" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.6" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Central pulse dot */}
      <circle cx="12" cy="12" r="3" fill={grad ? `url(#${id}-radial)` : 'currentColor'} opacity={grad ? 0.3 : 0.1} />
      <circle cx="12" cy="12" r="1.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} filter={glow ? `url(#${id}-glow-strong)` : undefined} opacity="0.9" />
      {/* Medical cross in center */}
      <line x1="12" y1="10.5" x2="12" y2="13.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="10.5" y1="12" x2="13.5" y2="12" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
      {/* Bottom signal waves */}
      <path d="M7 15 Q8.5 17.5 12 18.5 Q15.5 17.5 17 15" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M5 17 Q7 20 12 21 Q17 20 19 17" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.45" />
      <path d="M3 19 Q5 22 12 22.5 Q19 22 21 19" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.3" />
    </>
  )
);

// ─── 26. MWHeartHandshake ────────────────────────────────────────
// Two hands forming heart shape between them, cross inside heart
export const MWHeartHandshake = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Heart outline formed by two hands */}
      <path
        d="M5 8 C5 6 7 4.5 9 5 L12 8 L15 5 C17 4.5 19 6 19 8 C19 10 17 12 12 18 C7 12 5 10 5 8Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Left hand (simplified) reaching from left */}
      <path
        d="M2 14 C2 12 3 10 5 10 L7 10 L9 8"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6"
      />
      {/* Right hand (simplified) reaching from right */}
      <path
        d="M22 14 C22 12 21 10 19 10 L17 10 L15 8"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6"
      />
      {/* Medical cross inside heart */}
      <line x1="12" y1="10" x2="12" y2="14" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <line x1="10" y1="12" x2="14" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Connection pulse lines */}
      <polyline points="3 16 4 16 4.2 15.5 4.5 16.5 4.8 16 5.5 16"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.35" />
      <polyline points="18.5 16 19.2 16 19.5 16.5 19.8 15.5 20 16 21 16"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.35" />
      <circle cx="5" cy="8" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 27. MWGlobe2 ───────────────────────────────────────────────
// Globe with Africa outline, medical cross overlay, orbit ring
export const MWGlobe2 = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Globe circle */}
      <circle cx="12" cy="12" r="9"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.6" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Latitude lines */}
      <ellipse cx="12" cy="9" rx="8.5" ry="1.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.5" fill="none" opacity="0.2" />
      <line x1="3" y1="12" x2="21" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.5" opacity="0.2" />
      <ellipse cx="12" cy="15" rx="8.5" ry="1.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.5" fill="none" opacity="0.2" />
      {/* Africa outline (simplified) */}
      <path
        d="M11 5 C11.5 5 12.5 5.5 13 6.5 L13.5 8 L14 9 L13.5 10 L14 11.5 L13.5 13 L14 14 L13.5 15 L13 16.5 L12 17 L11 16.5 L10.5 15 L10 14 L10.5 13 L10 11.5 L10.5 10 L10 9 L10.5 8 L11 7 L10.5 5.5 Z"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6"
      />
      {/* Madagascar bump */}
      <path d="M15 14 L15.5 13.5 L16 14 L15.5 14.5 Z" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.6" fill="none" opacity="0.4" />
      {/* Medical cross overlay at center */}
      <line x1="12" y1="10.5" x2="12" y2="13.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <line x1="10.5" y1="12" x2="13.5" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Orbit ring */}
      <ellipse cx="12" cy="12" rx="10" ry="3" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.5" fill="none" opacity="0.15" transform="rotate(-25 12 12)" />
      {/* Small satellite dot */}
      <circle cx="4" cy="6" r="0.7" fill={`url(#${id}-accent)`} opacity="0.5" />
      <circle cx="12" cy="3" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 28. MWCreditCard ───────────────────────────────────────────
// Credit card with MW monogram, gradient stripe, chip with cross
export const MWCreditCard = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Card body */}
      <rect x="2" y="5" width="20" height="14" rx="2.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.6" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Gradient stripe across top */}
      <rect x="2" y="5" width="20" height="4" rx="2.5" fill={grad ? `url(#${id}-grad)` : 'currentColor'} opacity={grad ? 0.12 : 0.06} />
      <line x1="2" y1="9" x2="22" y2="9" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" opacity="0.4" />
      {/* Chip with cross */}
      <rect x="5" y="10.5" width="4" height="3.5" rx="0.8"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'}
        fillOpacity={grad ? 0.1 : 0.05}
      />
      <line x1="7" y1="11.5" x2="7" y2="13" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" strokeLinecap="round" />
      <line x1="6" y1="12.2" x2="8" y2="12.2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" strokeLinecap="round" />
      {/* MW monogram text as paths */}
      <path d="M11 13 L11 11 L13 11 M13 11 L13 13 M13 11 L12 12.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Card number dots */}
      <circle cx="16" cy="12.2" r="0.4" fill={grad ? `url(#${id}-grad)` : 'currentColor'} opacity="0.5" />
      <circle cx="17.2" cy="12.2" r="0.4" fill={grad ? `url(#${id}-grad)` : 'currentColor'} opacity="0.5" />
      <circle cx="18.4" cy="12.2" r="0.4" fill={grad ? `url(#${id}-grad)` : 'currentColor'} opacity="0.5" />
      <circle cx="19.6" cy="12.2" r="0.4" fill={grad ? `url(#${id}-grad)` : 'currentColor'} opacity="0.5" />
      {/* Bottom line */}
      <rect x="5" y="16" width="8" height="1" rx="0.5" fill={grad ? `url(#${id}-grad)` : 'currentColor'} opacity="0.3" />
      <circle cx="2" cy="5" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 29. MWReceipt ───────────────────────────────────────────────
// Receipt with heartbeat total line, gradient, medical stamp
export const MWReceipt = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Receipt body with zigzag bottom */}
      <path
        d="M5 2.5 L19 2.5 L19 19.5 L17.5 18 L16 19.5 L14.5 18 L13 19.5 L11.5 18 L10 19.5 L8.5 18 L7 19.5 L5.5 18 L5 19.5 L5 2.5Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Header text line */}
      <rect x="8" y="5" width="8" height="1.2" rx="0.6" fill={grad ? `url(#${id}-grad)` : 'currentColor'} opacity="0.5" />
      {/* Text lines */}
      <rect x="7" y="8" width="10" height="1" rx="0.5" fill={grad ? `url(#${id}-grad)` : 'currentColor'} opacity="0.3" />
      <rect x="7" y="10" width="8" height="1" rx="0.5" fill={grad ? `url(#${id}-grad)` : 'currentColor'} opacity="0.25" />
      {/* Heartbeat total line */}
      <polyline points="7 13 8.5 13 9 12.2 9.5 13.8 10 13 11.5 13 17 13"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Amount line */}
      <rect x="14" y="15.5" width="4" height="1" rx="0.5" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
      {/* Medical stamp circle */}
      <circle cx="9" cy="16" r="1.8" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.6" fill="none" opacity="0.35" />
      <path d="M8.4 16 L9.6 16 M9 15.4 L9 16.6" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.5" strokeLinecap="round" opacity="0.35" />
      <circle cx="5" cy="2.5" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 30. MWSnowflake ────────────────────────────────────────────
// Snowflake with medical cross at center, gradient, health-cold theme
export const MWSnowflake = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Six main branches */}
      {/* Branch 1 — Up */}
      <line x1="12" y1="4" x2="12" y2="20" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Branch 2 — Upper-right (60°) */}
      <line x1="17" y1="7" x2="7" y2="17" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" />
      {/* Branch 3 — Lower-right (120°) */}
      <line x1="17" y1="17" x2="7" y2="7" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.6" strokeLinecap="round" />
      {/* Branch 1 sub-branches — Up */}
      <line x1="10.5" y1="6" x2="13.5" y2="6" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <line x1="10.5" y1="18" x2="13.5" y2="18" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      {/* Branch 2 sub-branches */}
      <line x1="15" y1="5" x2="16" y2="6.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <line x1="8" y1="17.5" x2="9" y2="19" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      {/* Branch 3 sub-branches */}
      <line x1="15" y1="19" x2="16" y2="17.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <line x1="8" y1="6.5" x2="9" y2="5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      {/* Medical cross at center */}
      <circle cx="12" cy="12" r="2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" fill="none" />
      <line x1="12" y1="10.8" x2="12" y2="13.2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <line x1="10.8" y1="12" x2="13.2" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Cold/health theme dots */}
      <circle cx="5" cy="6" r="0.5" fill={`url(#${id}-accent)`} opacity="0.2" />
      <circle cx="19" cy="6" r="0.5" fill={`url(#${id}-accent)`} opacity="0.2" />
      <circle cx="5" cy="18" r="0.5" fill={`url(#${id}-accent)`} opacity="0.2" />
      <circle cx="19" cy="18" r="0.5" fill={`url(#${id}-accent)`} opacity="0.2" />
      <circle cx="12" cy="4" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── Re-exports ─────────────────────────────────────────────────
export type { MWIconProps, MWIconComponent } from './MedwalletIconBase';
