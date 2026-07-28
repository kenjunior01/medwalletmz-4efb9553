/**
 * MedWallet MZ — Navigation Icon Set (Batch 1: Core Nav)
 *
 * 20 unique, hand-crafted SVG icons with gradients, glow effects,
 * and distinctive creative designs. Every path is original.
 */
import { createMWIcon } from './MedwalletIconBase';

// ═══════════════════════════════════════════════════════════════
// 1. MWHome — Stylized house with heart-shaped roof & plus accent
// ═══════════════════════════════════════════════════════════════
export const MWHome = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.25" />
      {/* House body with curved eaves */}
      <path
        d="M4.5 12.5L7 10.5L10.5 7.5C11 7.1 11.5 6.9 12 6.9C12.5 6.9 13 7.1 13.5 7.5L17 10.5L19.5 12.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Heart-shaped roof peak */}
      <path
        d="M9 6.5C9 5.5 9.8 4.5 10.8 4.5C11.5 4.5 12 5 12 5C12 5 12.5 4.5 13.2 4.5C14.2 4.5 15 5.5 15 6.5C15 8 12 10.5 12 10.5C12 10.5 9 8 9 6.5Z"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
        fill={grad ? `url(#${id}-radial)` : 'none'}
        filter={glow ? `url(#${id}-glow)` : undefined}
        opacity="0.9"
      />
      {/* Main house walls */}
      <rect x="6" y="11.5" width="12" height="8" rx="1.2" ry="1.2"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Door with arch */}
      <path
        d="M9.5 19.5V15.5C9.5 14.2 10.2 13 11 13H13C13.8 13 14.5 14.2 14.5 15.5V19.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.5" strokeLinecap="round" fill="none"
      />
      {/* Plus/cross accent on roof */}
      <line x1="17.5" y1="9" x2="17.5" y2="11" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="16.5" y1="10" x2="18.5" y2="10" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      {/* Decorative dots on eaves */}
      <circle cx="7.5" cy="11.2" r="0.7" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.7" />
      <circle cx="16.5" cy="11.2" r="0.7" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.7" />
      {/* Window accents */}
      <rect x="7.5" y="13" width="2" height="2" rx="0.4" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" fill="none" opacity="0.6" />
      <rect x="15" y="13" width="2" height="2" rx="0.4" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" fill="none" opacity="0.6" />
    </>
  )
);

// ═══════════════════════════════════════════════════════════════
// 2. MWStethoscope — Heartbeat line weaving through tube
// ═══════════════════════════════════════════════════════════════
export const MWStethoscope = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.2" />
      {/* Left earpiece */}
      <circle cx="6" cy="4.5" r="1.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="6" cy="4.5" r="0.5" fill={grad ? `url(#${id}-accent)` : 'currentColor'} />
      {/* Right earpiece */}
      <circle cx="15" cy="4.5" r="1.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="15" cy="4.5" r="0.5" fill={grad ? `url(#${id}-accent)` : 'currentColor'} />
      {/* Left tube from earpiece down */}
      <path
        d="M6 6C6 9 6.5 10 8 11C9.5 12 10 13 10 15.5C10 17 10.5 18 12 18"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Right tube from earpiece down */}
      <path
        d="M15 6C15 9 14.5 10 13 11C12.5 11.3 12 11.8 12 12.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Heartbeat ECG line weaving through tube */}
      <path
        d="M7.5 8.5L9 8.5L9.5 6.5L10.5 10.5L11.5 7.5L12 8.5L13.5 8.5"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
        opacity="0.8"
      />
      {/* Chest piece — bell shape */}
      <path
        d="M9.5 18C9.5 18 9.5 17.5 10 17L14 17C14.5 17.5 14.5 18 14.5 18C14.5 20.2 13.4 21 12 21C10.6 21 9.5 20.2 9.5 18Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Inner ring of chest piece */}
      <circle cx="12" cy="19.2" r="1.2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" fill="none" opacity="0.7" />
      <circle cx="12" cy="19.2" r="0.4" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.6" />
    </>
  )
);

// ═══════════════════════════════════════════════════════════════
// 3. MWPill — Split capsule with sparkles, slightly rotated
// ═══════════════════════════════════════════════════════════════
export const MWPill = createMWIcon(
  (id, glow, grad) => (
    <g>
      <g transform="rotate(-25 12 12)">
        <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.2" />
        {/* Left half of capsule */}
        <path
          d="M8.5 12C8.5 8.5 10 6.5 12 6.5C14 6.5 15.5 8.5 15.5 12L15.5 12C15.5 12 15.5 12 15.5 12"
          stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
          strokeWidth="1.8" strokeLinecap="round" fill={grad ? `url(#${id}-radial)` : 'none'}
          filter={glow ? `url(#${id}-glow)` : undefined}
          opacity="0.8"
        />
        {/* Right half of capsule */}
        <path
          d="M15.5 12C15.5 15.5 14 17.5 12 17.5C10 17.5 8.5 15.5 8.5 12"
          stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
          strokeWidth="1.8" strokeLinecap="round" fill={grad ? `url(#${id}-accent)` : 'none'}
          filter={glow ? `url(#${id}-glow)` : undefined}
          opacity="0.6"
        />
        {/* Full capsule outline */}
        <path
          d="M8.5 12C8.5 8.5 10 6.5 12 6.5C14 6.5 15.5 8.5 15.5 12C15.5 15.5 14 17.5 12 17.5C10 17.5 8.5 15.5 8.5 12Z"
          stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
          strokeWidth="1.8" strokeLinecap="round" fill="none"
          filter={glow ? `url(#${id}-glow)` : undefined}
        />
        {/* Dividing line */}
        <line x1="8.5" y1="12" x2="15.5" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
        {/* Left half detail — small circles (powder) */}
        <circle cx="10.5" cy="9.5" r="0.6" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.5" />
        <circle cx="13" cy="10" r="0.4" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
        <circle cx="11.5" cy="8.2" r="0.35" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.3" />
      </g>
      {/* Sparkle dots around capsule */}
      <circle cx="4" cy="5" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.7" />
      <circle cx="19" cy="18" r="0.6" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.5" />
      <circle cx="20" cy="7" r="0.5" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.6" />
      <circle cx="3.5" cy="17" r="0.4" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
      {/* Cross sparkle */}
      <line x1="18.5" y1="4.5" x2="18.5" y2="6" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />
      <line x1="17.75" y1="5.25" x2="19.25" y2="5.25" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />
    </g>
  )
);

// ═══════════════════════════════════════════════════════════════
// 4. MWBuilding2 — Hospital with cross, curved entrance, flag
// ═══════════════════════════════════════════════════════════════
export const MWBuilding2 = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.2" />
      {/* Main building */}
      <rect x="4" y="7" width="14" height="14" rx="1" ry="1"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Roof line */}
      <line x1="3" y1="7" x2="19" y2="7" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Cross on top */}
      <line x1="11" y1="3" x2="11" y2="6" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9.5" y1="4.5" x2="12.5" y2="4.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      {/* Flag / pennant */}
      <path
        d="M17 3.5V7L19 5.5L17 3.5Z"
        fill={grad ? `url(#${id}-accent)` : 'currentColor'}
        opacity="0.8"
      />
      <line x1="17" y1="3" x2="17" y2="7.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" />
      {/* Curved entrance */}
      <path
        d="M9.5 21V16C9.5 14.5 10.5 13.5 12 13.5C13.5 13.5 14.5 14.5 14.5 16V21"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.5" strokeLinecap="round" fill="none"
      />
      {/* Windows — unique grid pattern */}
      <rect x="5.5" y="8.5" width="2.5" height="2" rx="0.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" fill={grad ? `url(#${id}-radial)` : 'none'} opacity="0.7" />
      <rect x="14" y="8.5" width="2.5" height="2" rx="0.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" fill={grad ? `url(#${id}-radial)` : 'none'} opacity="0.7" />
      <rect x="5.5" y="11.5" width="2.5" height="1.5" rx="0.3" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" fill="none" opacity="0.5" />
      <rect x="14" y="11.5" width="2.5" height="1.5" rx="0.3" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" fill="none" opacity="0.5" />
      {/* Side wing */}
      <rect x="19" y="11" width="3" height="10" rx="0.8"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.3" fill="none" opacity="0.6"
      />
      <circle cx="20.5" cy="15" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.5" />
      <circle cx="20.5" cy="18" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.5" />
    </>
  )
);

// ═══════════════════════════════════════════════════════════════
// 5. MWFlaskConical — Erlenmeyer flask with liquid, bubbles, marks
// ═══════════════════════════════════════════════════════════════
export const MWFlaskConical = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.2" />
      {/* Flask neck */}
      <path
        d="M10 3.5H14M10 3.5V8L4.5 19.5C4 20.5 4.5 21 5.5 21H18.5C19.5 21 20 20.5 19.5 19.5L14 8V3.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Flask rim — wider collar */}
      <path
        d="M9 3.5C9 2.8 9.5 2.5 10 2.5H14C14.5 2.5 15 2.8 15 3.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.5" strokeLinecap="round" fill="none"
      />
      {/* Liquid inside */}
      <path
        d="M6.5 16L8 13H16L17.5 16C18 17 17.5 19.5 17 20.5H7C6.5 19.5 6 17 6.5 16Z"
        fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity="0.5"
      />
      {/* Measurement lines */}
      <line x1="15.2" y1="14" x2="16.5" y2="14" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
      <line x1="14.5" y1="16" x2="16" y2="16" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
      <line x1="13.8" y1="18" x2="15.5" y2="18" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
      {/* Bubbles rising */}
      <circle cx="10" cy="15" r="0.7" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" fill="none" opacity="0.6" />
      <circle cx="13.5" cy="13.5" r="0.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" fill="none" opacity="0.5" />
      <circle cx="11.5" cy="11.5" r="0.4" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
      <circle cx="12.5" cy="16.5" r="0.9" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" fill="none" opacity="0.5" />
    </>
  )
);

// ═══════════════════════════════════════════════════════════════
// 6. MWCalendar — Page-turn effect, heartbeat line, gradient header
// ═══════════════════════════════════════════════════════════════
export const MWCalendar = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.2" />
      {/* Calendar body */}
      <rect x="3" y="5" width="17" height="16" rx="2" ry="2"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Gradient header */}
      <rect x="3.5" y="5.5" width="16" height="4.5" rx="1.5" ry="1.5"
        fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity="0.5"
      />
      <line x1="3" y1="10" x2="20" y2="10" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" />
      {/* Page-turn corner */}
      <path
        d="M15 5V8C15 8.5 15.5 9 16 9H20"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity="0.7"
      />
      {/* Calendar rings */}
      <line x1="7" y1="3.5" x2="7" y2="6.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="3.5" x2="16" y2="6.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      {/* Row lines */}
      <line x1="5" y1="13" x2="18" y2="13" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" opacity="0.3" />
      <line x1="5" y1="16" x2="18" y2="16" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" opacity="0.3" />
      {/* Heartbeat line replacing one row */}
      <path
        d="M5 19L7.5 19L8.5 17L9.5 21L10.5 18L11.5 20L12.5 19L18 19"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
        opacity="0.8"
      />
      {/* Date dots */}
      <circle cx="6.5" cy="11.5" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.5" />
      <circle cx="10" cy="11.5" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.5" />
      <circle cx="13.5" cy="11.5" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.5" />
      <circle cx="17" cy="11.5" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.5" />
      {/* More date dots */}
      <circle cx="8" cy="14.5" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
      <circle cx="12" cy="14.5" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
      <circle cx="16" cy="14.5" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
    </>
  )
);

// ═══════════════════════════════════════════════════════════════
// 7. MWUsers — Two overlapping silhouettes with connecting arc
// ═══════════════════════════════════════════════════════════════
export const MWUsers = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.2" />
      {/* Person 1 — back */}
      <circle cx="15" cy="8" r="2.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" fill={grad ? `url(#${id}-radial)` : 'none'}
        filter={glow ? `url(#${id}-glow)` : undefined}
        opacity="0.7"
      />
      <path
        d="M20 20C20 16.5 17.8 14 15 14C13.5 14 12.2 14.5 11.2 15.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" fill="none"
        opacity="0.7"
      />
      {/* Person 2 — front */}
      <circle cx="9" cy="8.5" r="2.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" fill={grad ? `url(#${id}-radial)` : 'none'}
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      <path
        d="M4 20C4 16.5 6.2 14 9 14C11.8 14 14 16.5 14 20"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Connecting arc between them */}
      <path
        d="M9 5C9 2.5 10.5 1.5 12 1.5C13.5 1.5 15 2.5 15 5"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1.2" strokeLinecap="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
        opacity="0.6"
      />
      {/* Node circles at heads */}
      <circle cx="9" cy="8.5" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.8" />
      <circle cx="15" cy="8" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.6" />
      {/* Decorative dots */}
      <circle cx="12" cy="3.5" r="0.5" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.5" />
    </>
  )
);

// ═══════════════════════════════════════════════════════════════
// 8. MWMessageSquare — Speech bubble with ECG peaks & MW watermark
// ═══════════════════════════════════════════════════════════════
export const MWMessageSquare = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.2" />
      {/* Speech bubble background fill */}
      <path
        d="M4 4.5H20C20.8 4.5 21.5 5.2 21.5 6V15C21.5 15.8 20.8 16.5 20 16.5H13.5L9.5 20.5V16.5H4C3.2 16.5 2.5 15.8 2.5 15V6C2.5 5.2 3.2 4.5 4 4.5Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity="0.15"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Speech bubble stroke */}
      <path
        d="M4 4.5H20C20.8 4.5 21.5 5.2 21.5 6V15C21.5 15.8 20.8 16.5 20 16.5H13.5L9.5 20.5V16.5H4C3.2 16.5 2.5 15.8 2.5 15V6C2.5 5.2 3.2 4.5 4 4.5Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* ECG heartbeat peaks inside */}
      <path
        d="M6 10.5L8.5 10.5L9.5 7.5L10.8 13.5L12 9.5L13 12L14 10.5L18 10.5"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* MW watermark text */}
      <text x="17" y="14.5" fontSize="3.5" fontFamily="sans-serif" fontWeight="bold"
        fill={grad ? `url(#${id}-grad)` : 'currentColor'}
        opacity="0.25"
      >MW</text>
      {/* Accent dot */}
      <circle cx="5.5" cy="7" r="0.6" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
    </>
  )
);

// ═══════════════════════════════════════════════════════════════
// 9. MWTruck — Delivery vehicle with cross, rounded, motion lines
// ═══════════════════════════════════════════════════════════════
export const MWTruck = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.2" />
      {/* Truck cargo body — rounded */}
      <path
        d="M2.5 9.5C2.5 8.5 3.3 7.5 4.5 7.5H13.5C14.7 7.5 15.5 8.5 15.5 9.5V16H2.5V9.5Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Cab — rounded modern shape */}
      <path
        d="M15.5 10.5H18.5C19.3 10.5 20 11 20.2 11.8L21 14.5V16H15.5V10.5Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Windshield */}
      <path
        d="M16 11.5H18.2C18.6 11.5 18.9 11.7 19 12L19.5 13.5H16V11.5Z"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
        fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity="0.5"
      />
      {/* Medical cross on side panel */}
      <line x1="8" y1="10" x2="8" y2="14" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6" y1="12" x2="10" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      {/* Wheels */}
      <circle cx="6.5" cy="17" r="2" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="6.5" cy="17" r="0.7" fill={grad ? `url(#${id}-accent)` : 'currentColor'} />
      <circle cx="18.5" cy="17" r="2" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="18.5" cy="17" r="0.7" fill={grad ? `url(#${id}-accent)` : 'currentColor'} />
      {/* Ground line */}
      <line x1="2" y1="19" x2="22" y2="19" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
      {/* Motion lines behind truck */}
      <line x1="1" y1="10" x2="3" y2="10" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="0.5" y1="12.5" x2="2.5" y2="12.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
      <line x1="1" y1="15" x2="3" y2="15" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.3" />
      {/* Decorative seam line */}
      <line x1="2.5" y1="9" x2="15.5" y2="9" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.5" opacity="0.3" />
    </>
  )
);

// ═══════════════════════════════════════════════════════════════
// 10. MWPackage — Box with medical seal, tape seams, MW monogram
// ═══════════════════════════════════════════════════════════════
export const MWPackage = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.2" />
      {/* Main box */}
      <rect x="3" y="7" width="18" height="13" rx="1.5" ry="1.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Tape seam — vertical */}
      <line x1="12" y1="7" x2="12" y2="20" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Tape seam — horizontal */}
      <line x1="3" y1="13.5" x2="21" y2="13.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Tape cross center overlay */}
      <rect x="10.5" y="12" width="3" height="3" rx="0.3"
        fill={grad ? `url(#${id}-radial)` : 'none'}
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1" opacity="0.4"
      />
      {/* Medical seal — cross in circle (top right) */}
      <circle cx="18" cy="10" r="2.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      <line x1="18" y1="8.5" x2="18" y2="11.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" />
      <line x1="16.5" y1="10" x2="19.5" y2="10" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" />
      {/* MW monogram on lower left panel */}
      <text x="5.5" y="17.5" fontSize="3" fontFamily="sans-serif" fontWeight="bold"
        fill={grad ? `url(#${id}-grad)` : 'currentColor'}
        opacity="0.4"
      >MW</text>
      {/* Decorative corner dots */}
      <circle cx="4.5" cy="8.5" r="0.5" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.5" />
      <circle cx="19.5" cy="8.5" r="0.5" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.5" />
      <circle cx="4.5" cy="18.5" r="0.5" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.5" />
      <circle cx="19.5" cy="18.5" r="0.5" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.5" />
    </>
  )
);

// ═══════════════════════════════════════════════════════════════
// 11. MWBarChart3 — 4 gradient bars with curved trend line & arrow
// ═══════════════════════════════════════════════════════════════
export const MWBarChart3 = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.2" />
      {/* Axis lines */}
      <line x1="3" y1="20" x2="21" y2="20" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <line x1="3" y1="3" x2="3" y2="20" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      {/* Bar 1 */}
      <rect x="5" y="15" width="3" height="5" rx="0.8"
        fill={grad ? `url(#${id}-radial)` : 'none'}
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.5"
        filter={glow ? `url(#${id}-glow)` : undefined}
        opacity="0.6"
      />
      {/* Bar 2 */}
      <rect x="9" y="12" width="3" height="8" rx="0.8"
        fill={grad ? `url(#${id}-radial)` : 'none'}
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.5"
        filter={glow ? `url(#${id}-glow)` : undefined}
        opacity="0.7"
      />
      {/* Bar 3 */}
      <rect x="13" y="9" width="3" height="11" rx="0.8"
        fill={grad ? `url(#${id}-radial)` : 'none'}
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.5"
        filter={glow ? `url(#${id}-glow)` : undefined}
        opacity="0.85"
      />
      {/* Bar 4 */}
      <rect x="17" y="5.5" width="3" height="14.5" rx="0.8"
        fill={grad ? `url(#${id}-radial)` : 'none'}
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.5"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Curved trend line weaving through bar tops */}
      <path
        d="M6.5 14.5C7.5 13.5 9.5 11.5 10.5 11.5C11.5 11.5 13 8 14.5 8.5C16 9 17.5 5 18.5 5"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1.3" strokeLinecap="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Arrow at end of trend line */}
      <path
        d="M17.5 4.5L18.5 5L17.2 5.8"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
    </>
  )
);

// ═══════════════════════════════════════════════════════════════
// 12. MWShield — Shield with cross, circuit pattern, checkmark ring
// ═══════════════════════════════════════════════════════════════
export const MWShield = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.2" />
      {/* Shield shape — background fill */}
      <path
        d="M12 2.5L20 6V12C20 17.5 16.5 21.5 12 22.5C7.5 21.5 4 17.5 4 12V6L12 2.5Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity="0.15"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Shield shape — stroke */}
      <path
        d="M12 2.5L20 6V12C20 17.5 16.5 21.5 12 22.5C7.5 21.5 4 17.5 4 12V6L12 2.5Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Medical cross in center */}
      <line x1="12" y1="8" x2="12" y2="16" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="12" x2="16" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Circuit-board pattern — subtle lines */}
      <path d="M6.5 9H8" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" strokeLinecap="round" opacity="0.3" />
      <path d="M6.5 15H8" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" strokeLinecap="round" opacity="0.3" />
      <path d="M16 9H17.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" strokeLinecap="round" opacity="0.3" />
      <path d="M16 15H17.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" strokeLinecap="round" opacity="0.3" />
      <path d="M8 7V5.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" strokeLinecap="round" opacity="0.3" />
      <path d="M16 7V5.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" strokeLinecap="round" opacity="0.3" />
      <path d="M8 17V18.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" strokeLinecap="round" opacity="0.3" />
      <path d="M16 17V18.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" strokeLinecap="round" opacity="0.3" />
      {/* Circuit nodes */}
      <circle cx="8" cy="9" r="0.5" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
      <circle cx="16" cy="9" r="0.5" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
      <circle cx="8" cy="15" r="0.5" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
      <circle cx="16" cy="15" r="0.5" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
      {/* Checkmark pulse ring at top */}
      <circle cx="12" cy="4" r="2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" fill="none" opacity="0.4" />
      <circle cx="12" cy="4" r="3" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.5" fill="none" opacity="0.2" />
      <path d="M10.8 4L11.6 4.8L13.2 3.2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  )
);

// ═══════════════════════════════════════════════════════════════
// 13. MWWallet — Wallet with MW monogram, cards peeking, coin
// ═══════════════════════════════════════════════════════════════
export const MWWallet = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.2" />
      {/* Cards peeking out top */}
      <rect x="7" y="3" width="10" height="6" rx="1" ry="1"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1" fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity="0.5"
      />
      <rect x="8.5" y="4.5" width="10" height="6" rx="1" ry="1"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1" fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity="0.6"
      />
      {/* Main wallet body */}
      <rect x="3.5" y="8" width="17" height="12" rx="2" ry="2"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Glow seam — clasp line */}
      <line x1="3.5" y1="13" x2="20.5" y2="13"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1" strokeLinecap="round" opacity="0.4"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* MW monogram embossed center */}
      <text x="8" y="17" fontSize="4" fontFamily="sans-serif" fontWeight="bold"
        fill={grad ? `url(#${id}-grad)` : 'currentColor'}
        opacity="0.5"
      >MW</text>
      {/* Coin/medal element */}
      <circle cx="18" cy="16.5" r="2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" fill={grad ? `url(#${id}-radial)` : 'none'} filter={glow ? `url(#${id}-glow)` : undefined} />
      <text x="17" y="17.8" fontSize="2.5" fontFamily="sans-serif" fontWeight="bold"
        fill={grad ? `url(#${id}-accent)` : 'currentColor'}
        opacity="0.7"
      >M</text>
      {/* Card edge gradients — small accent lines */}
      <line x1="8" y1="5.5" x2="11" y2="5.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
      <line x1="9.5" y1="7" x2="13" y2="7" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
    </>
  )
);

// ═══════════════════════════════════════════════════════════════
// 14. MWSettings — Gear with cross-shaped inner space, tooth dots
// ═══════════════════════════════════════════════════════════════
export const MWSettings = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.2" />
      {/* Gear outer shape — 8 teeth with background fill */}
      <path
        d="M12 2L13.5 4L15.5 2.5L16.5 5L18.8 4.5L18.5 7L21 7.5L19.5 9.5L21.5 11L19.5 12.5L21 14.5L18.5 15L18.8 17.5L16.5 17L15.5 19.5L13.5 18L12 20L10.5 18L8.5 19.5L7.5 17L5.2 17.5L5.5 15L3 14.5L4.5 12.5L2.5 11L4.5 9.5L3 7.5L5.5 7L5.2 4.5L7.5 5L8.5 2.5L10.5 4L12 2Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity="0.15"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Gear outer shape — stroke */}
      <path
        d="M12 2L13.5 4L15.5 2.5L16.5 5L18.8 4.5L18.5 7L21 7.5L19.5 9.5L21.5 11L19.5 12.5L21 14.5L18.5 15L18.8 17.5L16.5 17L15.5 19.5L13.5 18L12 20L10.5 18L8.5 19.5L7.5 17L5.2 17.5L5.5 15L3 14.5L4.5 12.5L2.5 11L4.5 9.5L3 7.5L5.5 7L5.2 4.5L7.5 5L8.5 2.5L10.5 4L12 2Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Inner circle cutout — background */}
      <circle cx="12" cy="11" r="5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill={grad ? `url(#${id}-radial)` : 'none'} opacity="0.2" />
      {/* Inner circle cutout — stroke */}
      <circle cx="12" cy="11" r="5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill="none" />
      {/* Medical cross in inner negative space */}
      <line x1="12" y1="8" x2="12" y2="14" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="11" x2="15" y2="11" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      {/* Dots at each tooth tip */}
      <circle cx="12" cy="2" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.6" />
      <circle cx="21.5" cy="11" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.6" />
      <circle cx="12" cy="20" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.6" />
      <circle cx="2.5" cy="11" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.6" />
      <circle cx="19.5" cy="4.5" r="0.6" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
      <circle cx="4.5" cy="4.5" r="0.6" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
      <circle cx="19.5" cy="17.5" r="0.6" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
      <circle cx="4.5" cy="17.5" r="0.6" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
    </>
  )
);

// ═══════════════════════════════════════════════════════════════
// 15. MWLayoutDashboard — 4 panels with mini visualizations
// ═══════════════════════════════════════════════════════════════
export const MWLayoutDashboard = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.15" />
      {/* Panel 1 — top left: heartbeat line */}
      <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="1.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.5" fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity="0.2"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      <rect x="2.5" y="2.5" width="8.5" height="8.5" rx="1.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.5" fill="none"
      />
      <path d="M4.5 7L6 7L6.8 5.5L7.8 8.5L8.8 6.5L9.5 7" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Panel 2 — top right: mini chart bars */}
      <rect x="13" y="2.5" width="8.5" height="8.5" rx="1.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.5" fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity="0.15"
      />
      <rect x="13" y="2.5" width="8.5" height="8.5" rx="1.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.5" fill="none"
      />
      <rect x="15" y="7" width="1.5" height="3" rx="0.3" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.5" />
      <rect x="17.5" y="5.5" width="1.5" height="4.5" rx="0.3" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.6" />
      <rect x="20" y="4" width="1.5" height="6" rx="0.3" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.7" />
      {/* Panel 3 — bottom left: dots pattern */}
      <rect x="2.5" y="13" width="8.5" height="8.5" rx="1.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.5" fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity="0.15"
      />
      <rect x="2.5" y="13" width="8.5" height="8.5" rx="1.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.5" fill="none"
      />
      <circle cx="5" cy="16" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.5" />
      <circle cx="8.5" cy="16" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.6" />
      <circle cx="5" cy="19" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
      <circle cx="8.5" cy="19" r="0.8" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.7" />
      <line x1="5.8" y1="16" x2="7.7" y2="16" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.6" opacity="0.3" />
      <line x1="5.8" y1="19" x2="7.7" y2="19" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.6" opacity="0.3" />
      {/* Panel 4 — bottom right: medical cross */}
      <rect x="13" y="13" width="8.5" height="8.5" rx="1.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.5" fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity="0.15"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      <rect x="13" y="13" width="8.5" height="8.5" rx="1.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.5" fill="none"
      />
      <line x1="17.25" y1="15.5" x2="17.25" y2="19" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" />
      <line x1="15.5" y1="17.25" x2="19" y2="17.25" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" />
    </>
  )
);

// ═══════════════════════════════════════════════════════════════
// 16. MWHospital — Hospital with A-frame, cross, awning, ambulance
// ═══════════════════════════════════════════════════════════════
export const MWHospital = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.2" />
      {/* A-frame roof */}
      <path
        d="M2 10L12 2L22 10"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Roof ridge detail */}
      <path d="M5 9L12 3.5L19 9" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.3" />
      {/* Main building body */}
      <rect x="4" y="10" width="16" height="11" rx="0.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Large medical cross — centered */}
      <line x1="12" y1="7" x2="12" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <line x1="9.5" y1="9.5" x2="14.5" y2="9.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Entrance awning */}
      <path
        d="M9.5 15H14.5L14 17H10L9.5 15Z"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
        fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity="0.5"
      />
      {/* Entrance door */}
      <rect x="10.5" y="17" width="3" height="4" rx="0.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.2" fill="none"
      />
      {/* Windows */}
      <rect x="5.5" y="11.5" width="2.5" height="2" rx="0.3" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" fill={grad ? `url(#${id}-radial)` : 'none'} opacity="0.5" />
      <rect x="16" y="11.5" width="2.5" height="2" rx="0.3" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" fill={grad ? `url(#${id}-radial)` : 'none'} opacity="0.5" />
      {/* Ambulance silhouette parked outside */}
      <rect x="2" y="18.5" width="5.5" height="3" rx="0.8"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1" fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity="0.4"
      />
      <rect x="5" y="17" width="2.5" height="1.8" rx="0.5"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="0.8" fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity="0.3"
      />
      <circle cx="3.5" cy="21.5" r="0.8" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" fill="none" opacity="0.4" />
      <circle cx="6.5" cy="21.5" r="0.8" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" fill="none" opacity="0.4" />
      {/* Small cross on ambulance */}
      <line x1="4" y1="19.5" x2="4" y2="21" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
      <line x1="3" y1="20.25" x2="5" y2="20.25" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
    </>
  )
);

// ═══════════════════════════════════════════════════════════════
// 17. MWVideo — Camera with iris lens, record dot, heartbeat line
// ═══════════════════════════════════════════════════════════════
export const MWVideo = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.2" />
      {/* Camera body */}
      <rect x="2" y="6" width="15" height="12" rx="2" ry="2"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Lens housing — iris-like concentric circles */}
      <circle cx="9.5" cy="12" r="4"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.5" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      <circle cx="9.5" cy="12" r="2.5"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1" fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity="0.6"
      />
      <circle cx="9.5" cy="12" r="1.2"
        fill={grad ? `url(#${id}-accent)` : 'currentColor'}
        opacity="0.7"
      />
      {/* Lens flare dot */}
      <circle cx="8" cy="10.5" r="0.5" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
      {/* Viewfinder / side panel */}
      <path
        d="M17 8H20C20.8 8 21.5 8.7 21.5 9.5V14.5C21.5 15.3 20.8 16 20 16H17"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
      {/* Heartbeat line on side panel */}
      <path
        d="M17.5 12L18.5 12L19 10.5L19.5 13.5L20 11.5L20.5 12L21 12"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none"
        opacity="0.7"
      />
      {/* Record indicator dot (gradient red/accent) */}
      <circle cx="5" cy="8" r="1.2"
        fill={grad ? `url(#${id}-accent)` : 'currentColor'}
        filter={glow ? `url(#${id}-glow-strong)` : undefined}
        opacity="0.9"
      />
      {/* Top handle / mic */}
      <path
        d="M7 6V4C7 3 8 2 9.5 2C11 2 12 3 12 4V6"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.2" strokeLinecap="round" fill="none"
        opacity="0.6"
      />
      {/* Decorative accent lines on body */}
      <line x1="3" y1="15" x2="6" y2="15" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.3" />
    </>
  )
);

// ═══════════════════════════════════════════════════════════════
// 18. MWCrown — Hexagonal Elite Shield with pulse wave center
// Unique identity: premium shield badge, NOT a crown
// ═══════════════════════════════════════════════════════════════
export const MWCrown = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.2" />
      {/* Hexagonal shield outer */}
      <path
        d="M12 2 L19.5 6 L19.5 15 L12 22 L4.5 15 L4.5 6 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity={grad ? 0.15 : 0}
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Hexagonal shield stroke */}
      <path
        d="M12 2 L19.5 6 L19.5 15 L12 22 L4.5 15 L4.5 6 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Inner hexagon */}
      <path
        d="M12 5 L16.5 7.5 L16.5 13.5 L12 16 L7.5 13.5 L7.5 7.5 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none"
        opacity="0.4"
      />
      {/* Pulse/heartbeat wave at center */}
      <polyline
        points="7,10.5 9,10.5 10,8 11.2,13 12.5,9 13.5,10.5 17,10.5"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow-strong)` : undefined}
      />
      {/* Top accent diamond */}
      <path
        d="M12 2.5 L12.8 3.8 L14 3.8 L13 4.7 L13.4 6 L12 5.2 L10.6 6 L11 4.7 L10 3.8 L11.2 3.8 Z"
        fill={grad ? `url(#${id}-accent)` : 'currentColor'}
        filter={glow ? `url(#${id}-glow)` : undefined}
        opacity="0.9"
      />
      {/* Corner accent dots */}
      <circle cx="4.5" cy="6" r="1" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.6" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="19.5" cy="6" r="1" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.6" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Bottom signal arcs */}
      <path d="M9 19 Q12 17.5 15 19" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.4" />
    </>
  )
);

// ═══════════════════════════════════════════════════════════════
// 19. MWTrendingUp — ECG-peak upward arrow with sparkles
// ═══════════════════════════════════════════════════════════════
export const MWTrendingUp = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.2" />
      {/* ECG-peak trending arrow */}
      <path
        d="M3 18L6 18L7 15L8.5 19L10 14.5L11 17L12.5 12L14 16L15.5 8L17 13L19 6L21 4"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Arrowhead at the end */}
      <path
        d="M19 3.5L21 4L20 6"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Baseline reference */}
      <line x1="3" y1="20" x2="21" y2="20" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
      {/* Sparkle elements at peaks */}
      <circle cx="8.5" cy="19" r="0.7" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.6" />
      <circle cx="15.5" cy="8" r="0.7" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.7" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="19" cy="6" r="0.7" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.8" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Cross sparkle at highest peak */}
      <line x1="19" y1="3" x2="19" y2="5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
      <line x1="18" y1="4" x2="20" y2="4" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
      {/* Small upward indicators */}
      <circle cx="5" cy="17" r="0.4" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.3" />
      <circle cx="12.5" cy="12" r="0.4" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
    </>
  )
);

// ═══════════════════════════════════════════════════════════════
// 20. MWBookOpen — Open book with heartbeat across pages, plus signs
// ═══════════════════════════════════════════════════════════════
export const MWBookOpen = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.2" />
      {/* Left page — background */}
      <path
        d="M12 4.5C10 3.5 7 3 4 3.5V18.5C7 18 10 18.5 12 19.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity="0.2"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Left page — stroke */}
      <path
        d="M12 4.5C10 3.5 7 3 4 3.5V18.5C7 18 10 18.5 12 19.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Right page — background */}
      <path
        d="M12 4.5C14 3.5 17 3 20 3.5V18.5C17 18 14 18.5 12 19.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        fill={grad ? `url(#${id}-radial)` : 'none'}
        opacity="0.2"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Right page — stroke */}
      <path
        d="M12 4.5C14 3.5 17 3 20 3.5V18.5C17 18 14 18.5 12 19.5"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Spine line */}
      <line x1="12" y1="4.5" x2="12" y2="19.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      {/* Heartbeat line weaving across both pages */}
      <path
        d="M5.5 10L7.5 10L8.2 8L9 12L9.8 9.5L10.5 10.5L12 10.5L13.5 10.5L14.2 9.5L15 12L15.8 8L16.5 10L18.5 10"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'}
        strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      {/* Text lines on left page */}
      <line x1="5.5" y1="7" x2="10" y2="7" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.3" />
      <line x1="6" y1="14" x2="10" y2="14" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.3" />
      <line x1="6" y1="16" x2="9.5" y2="16" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.3" />
      {/* Text lines on right page */}
      <line x1="14" y1="7" x2="18.5" y2="7" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.3" />
      <line x1="14" y1="14" x2="18" y2="14" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.3" />
      <line x1="14" y1="16" x2="18" y2="16" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.3" />
      {/* Plus signs in margins */}
      <line x1="5.5" y1="18" x2="5.5" y2="19.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
      <line x1="4.75" y1="18.75" x2="6.25" y2="18.75" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
      <line x1="18.5" y1="18" x2="18.5" y2="19.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
      <line x1="17.75" y1="18.75" x2="19.25" y2="18.75" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
      {/* Gradient page edge accents */}
      <line x1="4.2" y1="5" x2="4.2" y2="17" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.5" strokeLinecap="round" opacity="0.2" />
      <line x1="19.8" y1="5" x2="19.8" y2="17" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.5" strokeLinecap="round" opacity="0.2" />
    </>
  )
);

// ─── Re-export types ─────────────────────────────────────────
export type { MWIconProps, MWIconComponent } from './MedwalletIconBase';
