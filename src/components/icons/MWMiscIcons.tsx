/**
 * MedWallet MZ — Batch 4: Miscellaneous Icons
 *
 * 50 unique hand-crafted SVG icons with gradients, glow effects,
 * and premium MedWallet branding. Each icon features medical/wallet
 * themed accents and Mozambique-inspired color references.
 */
import { createMWIcon } from './MedwalletIconBase';

// ─── 1. MWClock ───────────────────────────────────────────────
// Clock face with heartbeat ECG replacing the minute hand, gradient rim, small cross at 12 o'clock
export const MWClock = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Clock rim */}
      <circle cx="12" cy="12" r="9.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Small cross at 12 o'clock */}
      <line x1="12" y1="3" x2="12" y2="4.8" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="10.8" y1="3.9" x2="13.2" y2="3.9" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      {/* Hour hand pointing to ~10 */}
      <line x1="12" y1="12" x2="8.5" y2="8.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Minute hand replaced by ECG heartbeat line */}
      <polyline points="12,12 13,10.5 13.8,10.5 14.2,8 14.6,13 15,11 15.5,11 16,10" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Hour tick marks */}
      <line x1="12" y1="3" x2="12" y2="4" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="12" y1="20" x2="12" y2="21" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="3" y1="12" x2="4" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="20" y1="12" x2="21" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Center dot */}
      <circle cx="12" cy="12" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 2. MWClock3 ──────────────────────────────────────────────
// Clock variant with digital-style heartbeat display in center
export const MWClock3 = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Clock outer ring */}
      <circle cx="12" cy="12" r="9.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Hour marks around rim */}
      <line x1="12" y1="3.5" x2="12" y2="5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19" y1="5" x2="18" y2="6.2" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" />
      <line x1="20.5" y1="12" x2="19" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19" y1="19" x2="18" y2="17.8" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" />
      <line x1="12" y1="20.5" x2="12" y2="19" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="19" x2="6.2" y2="17.8" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" />
      <line x1="3.5" y1="12" x2="5" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="5" x2="6.2" y2="6.2" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" />
      {/* Digital heartbeat display panel in center */}
      <rect x="6" y="9.5" width="12" height="5" rx="1" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" fill="none" opacity="0.5" />
      {/* Heartbeat line inside display */}
      <polyline points="7,12 8.5,12 9,12 9.5,10 10.2,14 11,11 11.5,12 12,12 13,12 13.5,10 14.2,14 15,11 15.5,12 17,12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Small digital text lines */}
      <line x1="7.5" y1="11" x2="8.5" y2="11" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.4" />
      <line x1="15.5" y1="11" x2="17" y2="11" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" strokeLinecap="round" opacity="0.4" />
      {/* Center dot */}
      <circle cx="12" cy="12" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 3. MWLoader2 ──────────────────────────────────────────────
// Loading spinner made of connected heartbeat peaks forming a circle, gradient
export const MWLoader2 = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.1" />
      {/* Circular spinner made of heartbeat peaks */}
      <path d="M12 3 L12.8 4.5 L13.5 4.5 L13.8 3 L14.2 6 L14.6 4.5 L15 4.5 L16 5 L17 3.5 L17.5 4.5 L18 4.5 L19.5 6 L21 7.5 L20 8 L20.5 9 L20.5 9.5 L19 10 L21 11 L20.5 12 L21 13 L19 14 L20.5 14.5 L20.5 15 L20 16 L21 17.5 L19.5 18 L18 19.5 L17.5 19.5 L17 20.5 L16 19 L15 19.5 L14.6 18 L14.2 21 L13.8 18 L13.5 19.5 L12.8 19.5 L12 21 L11.2 19.5 L10.5 19.5 L10.2 21 L9.8 18 L9.4 21 L9 19.5 L8 19 L7 20.5 L6.5 19.5 L6 19.5 L4.5 18 L3 17.5 L4 16 L3.5 15 L3.5 14.5 L5 14 L3 13 L3.5 12 L3 11 L5 10 L3.5 9.5 L3.5 9 L4 8 L3 6.5 L4.5 6 L6 4.5 L6.5 4.5 L7 3.5 L8 5 L9 4.5 L9.4 6 L9.8 3 L10.2 6 L10.5 4.5 L11.2 4.5 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Inner circle accent */}
      <circle cx="12" cy="12" r="4" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" fill="none" opacity="0.4" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Medical cross at center */}
      <line x1="12" y1="10" x2="12" y2="14" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="12" x2="14" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      {/* Accent dots */}
      <circle cx="12" cy="3" r="0.8" fill={`url(#${id}-accent)`} />
      <circle cx="21" cy="12" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 4. MWCloud ────────────────────────────────────────────────
// Cloud with a small medical cross floating inside, gradient fill, rain dots shaped like small crosses
export const MWCloud = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Cloud body */}
      <path d="M6 18.5 L4.5 18.5 C2.8 18.5 1.5 17 1.5 15.5 C1.5 14 2.8 12.5 4.5 12.5 C4.5 12.5 4.5 12.5 4.5 12.5 C5 9.5 7.5 7.5 10.5 7.5 C13 7.5 15.2 9 16 11.2 C16.3 11 16.7 11 17 11 C19.2 11 21 12.8 21 15 C21 15.5 20.9 16 20.7 16.5 L19.5 18.5 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Medical cross floating inside cloud */}
      <line x1="11" y1="13" x2="11" y2="17" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="9" y1="15" x2="13" y2="15" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Cross-shaped rain dots */}
      <line x1="7" y1="20.5" x2="7" y2="22" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <line x1="6.2" y1="21.2" x2="7.8" y2="21.2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <line x1="11" y1="20.5" x2="11" y2="22" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <line x1="10.2" y1="21.2" x2="11.8" y2="21.2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <line x1="15" y1="20.5" x2="15" y2="22" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
      <line x1="14.2" y1="21.2" x2="15.8" y2="21.2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
      <circle cx="11" cy="15" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 5. MWCloudOff ─────────────────────────────────────────────
// Cloud with diagonal medical-cross line through it
export const MWCloudOff = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Cloud body */}
      <path d="M6 18.5 L4.5 18.5 C2.8 18.5 1.5 17 1.5 15.5 C1.5 14 2.8 12.5 4.5 12.5 C5 9.5 7.5 7.5 10.5 7.5 C13 7.5 15.2 9 16 11.2 C16.3 11 16.7 11 17 11 C19.2 11 21 12.8 21 15 L19.5 18.5 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5" />
      {/* Diagonal slash line */}
      <line x1="3" y1="3" x2="21" y2="21" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Medical cross on the slash */}
      <line x1="12" y1="11" x2="12" y2="15" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="13" x2="14" y2="13" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Small cross accent dots */}
      <circle cx="6" cy="6" r="0.6" fill={`url(#${id}-accent)`} opacity="0.4" />
      <circle cx="18" cy="18" r="0.6" fill={`url(#${id}-accent)`} opacity="0.4" />
    </>
  )
);

// ─── 6. MWCloudRain ────────────────────────────────────────────
// Cloud with medical-cross shaped raindrops falling
export const MWCloudRain = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Cloud body */}
      <path d="M6 16 L4.5 16 C2.8 16 1.5 14.5 1.5 13 C1.5 11.5 2.8 10 4.5 10 C5 7 7.5 5 10.5 5 C13 5 15.2 6.5 16 8.7 C16.3 8.5 16.7 8.5 17 8.5 C19.2 8.5 21 10.3 21 12.5 L19.5 16 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Cross-shaped raindrops falling */}
      <line x1="6" y1="18" x2="6" y2="21.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4.5" y1="19.5" x2="7.5" y2="19.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <line x1="12" y1="17.5" x2="12" y2="22" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10.5" y1="19.5" x2="13.5" y2="19.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <line x1="18" y1="18" x2="18" y2="21.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16.5" y1="19.5" x2="19.5" y2="19.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Small motion lines */}
      <line x1="5" y1="17" x2="4.5" y2="17.8" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
      <line x1="19" y1="17" x2="19.5" y2="17.8" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
      <circle cx="11" cy="13" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 7. MWCoffee ──────────────────────────────────────────────
// Coffee cup with heartbeat ECG as steam rising, gradient
export const MWCoffee = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Coffee cup body */}
      <path d="M4 10 L5 19 C5.3 20.5 6.5 21.5 8 21.5 L14 21.5 C15.5 21.5 16.7 20.5 17 19 L18 10 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Cup handle */}
      <path d="M18 12.5 C20 12.5 21.5 14 21.5 16 C21.5 18 20 19.5 18 19"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Saucer line */}
      <path d="M3 22 L19 22" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Heartbeat ECG as steam */}
      <polyline points="7,8 8,7 8.5,7 9,4.5 9.5,9 10,6 10.5,7 11,7" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      <polyline points="12,7 12.5,5.5 13,5.5 13.5,3 14,7.5 14.5,5 15,5.5 15.5,5.5 16,5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Small medical cross on cup */}
      <line x1="11" y1="14.5" x2="11" y2="16.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="10" y1="15.5" x2="12" y2="15.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="11" cy="15.5" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 8. MWCoins ───────────────────────────────────────────────
// Stacked coins with medical cross on top coin, gradient
export const MWCoins = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Bottom coin */}
      <ellipse cx="12" cy="19" rx="8" ry="3" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill="none" opacity="0.4" />
      {/* Middle coin */}
      <ellipse cx="12" cy="16" rx="8" ry="3" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M4 16 L4 19" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d="M20 16 L20 19" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      {/* Top coin */}
      <ellipse cx="12" cy="13" rx="8" ry="3" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      <path d="M4 13 L4 16" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M20 13 L20 16" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      {/* Medical cross on top coin */}
      <line x1="12" y1="11" x2="12" y2="15" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="10" y1="13" x2="14" y2="13" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Dollar sign hint on middle coin */}
      <line x1="12" y1="15" x2="12" y2="17" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
      <circle cx="12" cy="13" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 9. MWDollarSign ──────────────────────────────────────────
// Dollar sign with heartbeat baseline, gradient
export const MWDollarSign = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Dollar sign S-curve */}
      <path d="M9 9 C9 6.5 15 6.5 15 9 C15 11 10 11.5 10 14 C10 16.5 15 17 15 15"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Dollar vertical line */}
      <line x1="12" y1="4" x2="12" y2="20" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Heartbeat baseline at bottom */}
      <polyline points="4,19 6,19 7.5,19 8.5,16.5 9.5,21.5 10.5,18 11.5,19 20,19" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Small medical cross accent */}
      <line x1="17" y1="4" x2="17" y2="6.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="15.8" y1="5.2" x2="18.2" y2="5.2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 10. MWLock ────────────────────────────────────────────────
// Padlock with medical cross on the body, gradient shackle
export const MWLock = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Lock shackle */}
      <path d="M7 11 L7 7.5 C7 5 9 3 12 3 C15 3 17 5 17 7.5 L17 11"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2.5" strokeLinecap="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Lock body */}
      <rect x="4.5" y="11" width="15" height="10.5" rx="2" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" />
      {/* Medical cross on lock body */}
      <line x1="12" y1="14" x2="12" y2="19" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="9.5" y1="16.5" x2="14.5" y2="16.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Small keyhole hint */}
      <circle cx="12" cy="16.5" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 11. MWLogIn ───────────────────────────────────────────────
// Door/arrow entering with medical cross above door
export const MWLogIn = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Door frame */}
      <path d="M5 3 L5 21" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <path d="M5 3 L18 3 L18 21 L5 21" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Door interior line */}
      <path d="M13 3 L13 21" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      {/* Arrow entering */}
      <path d="M9 12 L15 12 M13 9 L16 12 L13 15" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Medical cross above door */}
      <line x1="9" y1="5.5" x2="9" y2="8.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="7.5" y1="7" x2="10.5" y2="7" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      <circle cx="9" cy="7" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 12. MWLogOut ──────────────────────────────────────────────
// Door/arrow exiting with medical cross
export const MWLogOut = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Door frame */}
      <path d="M5 3 L5 21 L18 21 L18 3" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Door interior line */}
      <path d="M11 3 L11 21" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      {/* Arrow exiting */}
      <path d="M15 12 L9 12 M11 9 L8 12 L11 15" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Medical cross above door */}
      <line x1="15" y1="5.5" x2="15" y2="8.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="13.5" y1="7" x2="16.5" y2="7" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      <circle cx="15" cy="7" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 13. MWMail ───────────────────────────────────────────────
// Envelope with medical cross seal, gradient
export const MWMail = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Envelope body */}
      <rect x="2" y="6" width="20" height="14" rx="2" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Envelope flap */}
      <path d="M2 6 L12 14 L22 6" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Medical cross seal on flap */}
      <line x1="12" y1="10.5" x2="12" y2="14" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="10.5" y1="12.2" x2="13.5" y2="12.2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Bottom flap lines */}
      <path d="M2 20 L8 15" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <path d="M22 20 L16 15" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <circle cx="12" cy="12" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 14. MWImage ──────────────────────────────────────────────
// Image frame with medical cross watermark, gradient border
export const MWImage = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Image frame */}
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Mountain/landscape inside */}
      <path d="M3 17 L8 10 L12 15 L16 9 L21 14 L21 19 L3 19 Z" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5" />
      {/* Sun circle */}
      <circle cx="8" cy="8" r="2" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" fill="none" opacity="0.5" />
      {/* Medical cross watermark overlay */}
      <line x1="12" y1="8" x2="12" y2="16" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="8" y1="12" x2="16" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="12" cy="12" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 15. MWInfo ─────────────────────────────────────────────────
// Info circle with medical cross replacing the "i" dot, gradient
export const MWInfo = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Info circle */}
      <circle cx="12" cy="12" r="9.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* "i" body */}
      <line x1="12" y1="13" x2="12" y2="19" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2.5" strokeLinecap="round" />
      {/* Medical cross replacing dot */}
      <line x1="12" y1="6" x2="12" y2="10" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="8" x2="14" y2="8" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      <circle cx="12" cy="8" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 16. MWHelpCircle ──────────────────────────────────────────
// Question mark circle with small medical cross accent, gradient
export const MWHelpCircle = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Circle */}
      <circle cx="12" cy="12" r="9.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Question mark */}
      <path d="M9 9 C9 7 10.5 6 12 6 C13.5 6 15 7 15 9 C15 10.5 13.5 11 12.5 11.5 L12 13"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Dot of question mark */}
      <circle cx="12" cy="16.5" r="1" fill={grad ? `url(#${id}-accent)` : 'currentColor'} />
      {/* Small medical cross accent */}
      <line x1="18" y1="4.5" x2="18" y2="6.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="17" y1="5.5" x2="19" y2="5.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="18" cy="5.5" r="0.6" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 17. MWKeyRound ────────────────────────────────────────────
// Key with medical cross on the bow (handle), gradient
export const MWKeyRound = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Key bow (handle) */}
      <circle cx="7.5" cy="10" r="4" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Medical cross on bow */}
      <line x1="7.5" y1="8" x2="7.5" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5.5" y1="10" x2="9.5" y2="10" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Key shaft */}
      <line x1="11.5" y1="10" x2="21" y2="10" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Key teeth */}
      <line x1="18" y1="10" x2="18" y2="13" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="21" y1="10" x2="21" y2="13.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="15" y1="10" x2="15" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7.5" cy="10" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 18. MWLanguages ───────────────────────────────────────────
// Speech bubbles with medical cross accents, gradient connecting line
export const MWLanguages = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Left speech bubble */}
      <path d="M2 10 C2 7 5 5 8.5 5 C12 5 15 7 15 10 C15 13 12 15 8.5 15 C7.5 15 6.5 14.8 6 14.5 L3 16 L4 13.5 C2.8 12.5 2 11.3 2 10 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Medical cross in left bubble */}
      <line x1="8.5" y1="8" x2="8.5" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" />
      <line x1="6.5" y1="10" x2="10.5" y2="10" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" />
      {/* Connecting line */}
      <path d="M15 12 C16 11 17 11 18 11.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" strokeDasharray="2 2" />
      {/* Right speech bubble */}
      <path d="M14 15 C14 13.5 16 12 19 12 C22 12 24 13.5 24 15 C24 16.5 22 18 19 18 C18.3 18 17.5 17.8 17 17.5 L14.5 19 L15.5 16.5 C14.5 16 14 15.5 14 15 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" transform="translate(-3, 0)" />
      {/* Small cross in right bubble */}
      <line x1="18" y1="14" x2="18" y2="16.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <line x1="16.8" y1="15.2" x2="19.2" y2="15.2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <circle cx="8.5" cy="10" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 19. MWLayers ──────────────────────────────────────────────
// Stacked layers with medical cross on top layer, gradient
export const MWLayers = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Bottom layer */}
      <path d="M3 18 L12 22 L21 18" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.4" />
      {/* Middle layer */}
      <path d="M3 13 L12 17 L21 13" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
      {/* Top layer */}
      <path d="M3 8 L12 12 L21 8" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Medical cross on top layer */}
      <line x1="12" y1="5.5" x2="12" y2="10.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9.5" y1="8" x2="14.5" y2="8" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Side connecting lines */}
      <line x1="12" y1="12" x2="12" y2="17" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <line x1="12" y1="17" x2="12" y2="22" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.2" />
      <circle cx="12" cy="8" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 20. MWList ────────────────────────────────────────────────
// List with heartbeat-style bullet points, gradient
export const MWList = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Line 1 */}
      <line x1="8" y1="6" x2="21" y2="6" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Heartbeat bullet 1 */}
      <polyline points="2,6 3,6 3.5,4 4,8 4.5,5 5,6 6,6" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Line 2 */}
      <line x1="8" y1="12" x2="21" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Heartbeat bullet 2 */}
      <polyline points="2,12 3,12 3.5,10 4,14 4.5,11 5,12 6,12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Line 3 */}
      <line x1="8" y1="18" x2="21" y2="18" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Heartbeat bullet 3 */}
      <polyline points="2,18 3,18 3.5,16 4,20 4.5,17 5,18 6,18" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Small medical cross accent */}
      <line x1="20" y1="2.5" x2="20" y2="4.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" />
      <line x1="19" y1="3.5" x2="21" y2="3.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" />
      <circle cx="12" cy="12" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 21. MWPanelLeft ───────────────────────────────────────────
// Side panel with medical cross on panel header
export const MWPanelLeft = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Main container */}
      <rect x="2" y="3" width="20" height="18" rx="2" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Side panel */}
      <rect x="2" y="3" width="7" height="18" rx="2" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill="none" />
      {/* Panel header line */}
      <line x1="3" y1="7" x2="8" y2="7" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      {/* Medical cross on panel header */}
      <line x1="5.5" y1="9.5" x2="5.5" y2="13.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3.5" y1="11.5" x2="7.5" y2="11.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Content lines on right */}
      <line x1="11" y1="7" x2="20" y2="7" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="11" y1="10" x2="18" y2="10" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <line x1="11" y1="13" x2="19" y2="13" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <line x1="11" y1="16" x2="17" y2="16" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <line x1="11" y1="19" x2="20" y2="19" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <circle cx="5.5" cy="11.5" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 22. MWPaperclip ───────────────────────────────────────────
// Paperclip shaped with a small medical cross at the curve
export const MWPaperclip = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Paperclip shape */}
      <path d="M15.5 6.5 L8 14 C6.5 15.5 6.5 17.5 8 19 C9.5 20.5 11.5 20.5 13 19 L19 13 C20.5 11.5 21 9.5 19.5 8 C18 6.5 16 7 14.5 8.5 L9 14 C8 15 8 16 9 17 C10 18 11 18 12 17 L17 12"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Small medical cross at the top curve */}
      <line x1="16.5" y1="5" x2="16.5" y2="7.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" />
      <line x1="15.2" y1="6.2" x2="17.8" y2="6.2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      <circle cx="16.5" cy="6.2" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 23. MWPause ───────────────────────────────────────────────
// Pause bars with small medical cross between them
export const MWPause = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Left pause bar */}
      <rect x="5" y="4" width="4" height="16" rx="1" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Right pause bar */}
      <rect x="15" y="4" width="4" height="16" rx="1" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Medical cross between bars */}
      <line x1="12" y1="9" x2="12" y2="15" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="9" y1="12" x2="15" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      <circle cx="12" cy="12" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 24. MWPauseCircle ─────────────────────────────────────────
// Circle with pause bars and medical cross accent
export const MWPauseCircle = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Outer circle */}
      <circle cx="12" cy="12" r="9.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Left pause bar */}
      <rect x="8.5" y="8" width="3" height="8" rx="0.8" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" fill="none" />
      {/* Right pause bar */}
      <rect x="12.5" y="8" width="3" height="8" rx="0.8" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" fill="none" />
      {/* Medical cross accent at bottom */}
      <line x1="12" y1="17" x2="12" y2="20" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" />
      <line x1="10.5" y1="18.5" x2="13.5" y2="18.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="12" cy="12" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 25. MWPencil ─────────────────────────────────────────────
// Pencil with medical cross near tip, gradient
export const MWPencil = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Pencil body */}
      <path d="M17 3 L21 7 L8 20 L3 21 L4 16 L17 3 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Pencil tip line */}
      <path d="M3 21 L6 18" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      {/* Eraser band */}
      <path d="M17 3 L15 5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      {/* Medical cross near tip */}
      <line x1="7" y1="14.5" x2="7" y2="17.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5.5" y1="16" x2="8.5" y2="16" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      <circle cx="7" cy="16" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 26. MWPercent ────────────────────────────────────────────
// Percent sign with heartbeat baseline, gradient
export const MWPercent = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Percent slash */}
      <line x1="6" y1="18" x2="18" y2="6" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Top circle */}
      <circle cx="7" cy="7" r="2.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" />
      {/* Bottom circle */}
      <circle cx="17" cy="17" r="2.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" />
      {/* Heartbeat baseline */}
      <polyline points="3,20 5,20 6,20 6.8,17.5 7.8,22.5 8.5,19 9.2,20 21,20" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Small medical cross accent */}
      <line x1="18" y1="3" x2="18" y2="5.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="16.8" y1="4.2" x2="19.2" y2="4.2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 27. MWSave ────────────────────────────────────────────────
// Floppy disk with medical cross, gradient
export const MWSave = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Floppy disk body */}
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Top metal slider */}
      <rect x="7" y="3" width="10" height="8" rx="0.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill="none" />
      {/* Slider window */}
      <rect x="9" y="5" width="6" height="4" rx="0.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" fill="none" opacity="0.5" />
      {/* Medical cross on disk body */}
      <line x1="12" y1="13.5" x2="12" y2="18.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="9.5" y1="16" x2="14.5" y2="16" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Bottom label lines */}
      <line x1="5" y1="12" x2="8" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <line x1="5" y1="19" x2="8" y2="19" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <circle cx="12" cy="16" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 28. MWScale ───────────────────────────────────────────────
// Balance scale with medical cross on the pivot, gradient
export const MWScale = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Scale base */}
      <line x1="12" y1="20" x2="12" y2="22" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="22" x2="16" y2="22" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Scale pillar */}
      <line x1="12" y1="6" x2="12" y2="20" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Scale beam */}
      <line x1="3" y1="7" x2="21" y2="7" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Left pan chains */}
      <line x1="4" y1="7" x2="4" y2="10" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="7" x2="8" y2="10" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      {/* Left pan */}
      <path d="M2 10 L10 10 L9.5 13 C9.2 14 8 14.5 6 14.5 C4 14.5 2.8 14 2.5 13 Z" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Right pan chains */}
      <line x1="16" y1="7" x2="16" y2="10" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="7" x2="20" y2="10" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      {/* Right pan */}
      <path d="M14 10 L22 10 L21.5 13 C21.2 14 20 14.5 18 14.5 C16 14.5 14.8 14 14.5 13 Z" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Medical cross on pivot */}
      <line x1="12" y1="4" x2="12" y2="8" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="6" x2="14" y2="6" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      <circle cx="12" cy="6" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 29. MWSend ────────────────────────────────────────────────
// Send arrow with medical cross trail, gradient
export const MWSend = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Send arrow / paper plane */}
      <path d="M22 2 L11 13"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      <path d="M22 2 L15 22 L11 13 L2 9 L22 2 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Medical cross trail behind */}
      <line x1="3" y1="15" x2="3" y2="18" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="1.5" y1="16.5" x2="4.5" y2="16.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="5.5" y1="17" x2="5.5" y2="20" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <line x1="4.3" y1="18.5" x2="6.7" y2="18.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <line x1="8" y1="19" x2="8" y2="21.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <line x1="7" y1="20.2" x2="9" y2="20.2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <circle cx="11" cy="13" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 30. MWTag ─────────────────────────────────────────────────
// Price tag with medical cross replacing the hole, gradient
export const MWTag = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Tag shape */}
      <path d="M4 2 L14 2 L22 10 L14 18 L4 8 L4 2 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Tag string */}
      <path d="M3 8 L2 9" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Medical cross replacing the hole */}
      <line x1="9" y1="5" x2="9" y2="9" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="7" y1="7" x2="11" y2="7" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Price lines on tag */}
      <line x1="14" y1="7" x2="18" y2="7" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="15" y1="10" x2="17" y2="10" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <circle cx="9" cy="7" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 31. MWTarget ──────────────────────────────────────────────
// Target with medical cross at center instead of dot, gradient rings
export const MWTarget = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Outer ring */}
      <circle cx="12" cy="12" r="9.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill="none" opacity="0.4" />
      {/* Middle ring */}
      <circle cx="12" cy="12" r="7" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill="none" opacity="0.6" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Inner ring */}
      <circle cx="12" cy="12" r="4.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Medical cross at center replacing the dot */}
      <line x1="12" y1="9" x2="12" y2="15" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="9" y1="12" x2="15" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Corner accent dots */}
      <circle cx="12" cy="2.5" r="0.5" fill={`url(#${id}-accent)`} opacity="0.4" />
      <circle cx="12" cy="21.5" r="0.5" fill={`url(#${id}-accent)`} opacity="0.4" />
      <circle cx="2.5" cy="12" r="0.5" fill={`url(#${id}-accent)`} opacity="0.4" />
      <circle cx="21.5" cy="12" r="0.5" fill={`url(#${id}-accent)`} opacity="0.4" />
      <circle cx="12" cy="12" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 32. MWCamera ──────────────────────────────────────────────
// Camera with medical cross on lens center, gradient
export const MWCamera = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Camera body */}
      <path d="M3 8 L3 18 C3 19.5 4.5 21 6 21 L18 21 C19.5 21 21 19.5 21 18 L21 8 C21 6.5 19.5 5 18 5 L16 5 L14.5 3 L9.5 3 L8 5 L6 5 C4.5 5 3 6.5 3 8 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Lens outer ring */}
      <circle cx="12" cy="13" r="4.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill="none" />
      {/* Lens inner ring */}
      <circle cx="12" cy="13" r="2.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" fill="none" opacity="0.5" />
      {/* Medical cross on lens center */}
      <line x1="12" y1="11" x2="12" y2="15" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="13" x2="14" y2="13" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Flash unit */}
      <rect x="16" y="7" width="3" height="2" rx="0.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" fill="none" opacity="0.5" />
      <circle cx="12" cy="13" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 33. MWGripVertical ────────────────────────────────────────
// Grip dots arranged vertically, small medical cross accent
export const MWGripVertical = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Left column of grip dots */}
      <circle cx="8" cy="6" r="1.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill="none" />
      <circle cx="8" cy="12" r="1.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill="none" />
      <circle cx="8" cy="18" r="1.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill="none" />
      {/* Right column of grip dots */}
      <circle cx="16" cy="6" r="1.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill="none" />
      <circle cx="16" cy="12" r="1.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill="none" />
      <circle cx="16" cy="18" r="1.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill="none" />
      {/* Small medical cross accent between columns */}
      <line x1="12" y1="10.5" x2="12" y2="13.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10.5" y1="12" x2="13.5" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="12" cy="12" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 34. MWHash ────────────────────────────────────────────────
// Hash symbol with medical cross replacing center intersection, gradient
export const MWHash = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Hash lines - top-left to bottom-right pair */}
      <line x1="5" y1="4" x2="5" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <line x1="19" y1="12" x2="19" y2="20" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Hash lines - top-right to bottom-left pair */}
      <line x1="19" y1="4" x2="19" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <line x1="5" y1="12" x2="5" y2="20" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Horizontal hash bars */}
      <line x1="3" y1="8" x2="21" y2="8" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="16" x2="21" y2="16" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Medical cross replacing center intersection */}
      <line x1="12" y1="10" x2="12" y2="14" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="12" x2="14" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      <circle cx="12" cy="12" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 35. MWHistory ─────────────────────────────────────────────
// Clock with circular arrow and medical cross on face
export const MWHistory = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Clock face */}
      <circle cx="12" cy="12" r="8.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Clock hands */}
      <line x1="12" y1="12" x2="12" y2="7" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="12" x2="15.5" y2="14" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      {/* Circular arrow around clock */}
      <path d="M4.5 8 C3 10 3 14.5 5 17 C7 19.5 10.5 20 13.5 19 L14 21 C10 22.5 5.5 21.5 3 18 C0.5 14.5 0.5 9 3 6.5 L4.5 8 Z"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Arrowhead */}
      <path d="M4.5 8 L2.5 7.5 L3.5 5.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Medical cross on clock face */}
      <line x1="12" y1="14.5" x2="12" y2="17.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" />
      <line x1="10.5" y1="16" x2="13.5" y2="16" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="12" cy="12" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 36. MWSmartphone ──────────────────────────────────────────
// Phone with heartbeat line on screen, medical cross home button
export const MWSmartphone = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Phone body */}
      <rect x="6" y="2" width="12" height="20" rx="2.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Screen area */}
      <rect x="8" y="5" width="8" height="12" rx="0.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" fill="none" opacity="0.4" />
      {/* Heartbeat line on screen */}
      <polyline points="8.5,11 9.5,11 10,11 10.5,8.5 11.2,13.5 12,10 12.5,11 13,11 13.5,11 14,11 14.5,8.5 15.2,13.5 15.5,11 15.5,11" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Speaker at top */}
      <line x1="10" y1="3.5" x2="14" y2="3.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      {/* Medical cross home button */}
      <circle cx="12" cy="20" r="1.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" fill="none" />
      <line x1="12" y1="19" x2="12" y2="21" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" />
      <line x1="11" y1="20" x2="13" y2="20" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" />
      <circle cx="12" cy="20" r="0.5" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 37. MWMoon ───────────────────────────────────────────────
// Moon with small medical cross crater, gradient
export const MWMoon = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Moon crescent */}
      <path d="M21 12.79 C19.5 16.5 15.5 18.5 11.5 17.3 C7.5 16.1 5.5 12 6.5 8 C4 10 3 13 4 16 C5 19 8 21 11.5 20.5 C15 20 18 17.5 19.5 14.5 C20 13.5 21 12.8 21 12.79 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Small medical cross crater */}
      <line x1="13" y1="9" x2="13" y2="12.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11.3" y1="10.8" x2="14.7" y2="10.8" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Small crater circles */}
      <circle cx="8" cy="13" r="1" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" fill="none" opacity="0.4" />
      <circle cx="10" cy="16" r="0.7" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" fill="none" opacity="0.3" />
      {/* Star accents */}
      <circle cx="5" cy="5" r="0.5" fill={`url(#${id}-accent)`} opacity="0.5" />
      <circle cx="19" cy="7" r="0.6" fill={`url(#${id}-accent)`} opacity="0.4" />
      <circle cx="16" cy="4" r="0.4" fill={`url(#${id}-accent)`} opacity="0.6" />
      <circle cx="13" cy="10.8" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 38. MWSun ─────────────────────────────────────────────────
// Sun with medical cross center, gradient rays
export const MWSun = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Sun center circle */}
      <circle cx="12" cy="12" r="4" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Medical cross at center of sun */}
      <line x1="12" y1="9.5" x2="12" y2="14.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="9.5" y1="12" x2="14.5" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Sun rays */}
      <line x1="12" y1="2" x2="12" y2="5.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="18.5" x2="12" y2="22" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="2" y1="12" x2="5.5" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="18.5" y1="12" x2="22" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Diagonal rays */}
      <line x1="4.9" y1="4.9" x2="7.4" y2="7.4" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16.6" y1="16.6" x2="19.1" y2="19.1" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19.1" y1="4.9" x2="16.6" y2="7.4" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7.4" y1="16.6" x2="4.9" y2="19.1" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 39. MWMonitor ────────────────────────────────────────────
// Monitor screen with heartbeat line display, medical cross power indicator
export const MWMonitor = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Monitor body */}
      <rect x="2" y="3" width="20" height="14" rx="2" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Screen area */}
      <rect x="4" y="5" width="16" height="10" rx="1" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" fill="none" opacity="0.3" />
      {/* Heartbeat line on screen */}
      <polyline points="5,10 7,10 8,10 8.8,7 9.5,13 10.5,9 11,10 12,10 13,10 13.8,7 14.5,13 15.5,9 16,10 19,10" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Stand neck */}
      <line x1="12" y1="17" x2="12" y2="20" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Stand base */}
      <path d="M7 20 L17 20" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Medical cross power indicator */}
      <line x1="19" y1="4.5" x2="19" y2="6.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="18" y1="5.5" x2="20" y2="5.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="12" cy="10" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 40. MWWind ───────────────────────────────────────────────
// Wind lines with small medical cross accents, gradient
export const MWWind = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Wind line 1 - top */}
      <path d="M3 8 C6 8 6 11 9 11 C11 11 12 10 15 10 C17 10 17 11 19 11"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Wind line 2 - middle */}
      <path d="M3 14 C5 14 6 16 8 16 C10 16 10 14 13 14 C15 14 15 15 17 15"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Wind line 3 - bottom */}
      <path d="M3 19 C5 19 6 17 8 17 C9 17 10 18 13 18"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5" />
      {/* Small medical cross accents riding wind */}
      <line x1="20" y1="10" x2="20" y2="12.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="18.8" y1="11.2" x2="21.2" y2="11.2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <line x1="19" y1="14" x2="19" y2="16.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <line x1="17.9" y1="15.2" x2="20.1" y2="15.2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      <circle cx="20" cy="11.2" r="0.6" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 41. MWFlame ──────────────────────────────────────────────
// Flame with medical cross at center, gradient from red to gold
export const MWFlame = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Flame outer shape */}
      <path d="M12 2 C12 2 6 9 6 14 C6 17.5 8.5 21 12 21 C15.5 21 18 17.5 18 14 C18 9 12 2 12 2 Z"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Inner flame */}
      <path d="M12 7 C12 7 9 12 9 15 C9 16.5 10.5 18 12 18 C13.5 18 15 16.5 15 15 C15 12 12 7 12 7 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
      {/* Medical cross at center of flame */}
      <line x1="12" y1="11" x2="12" y2="16" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="9.5" y1="13.5" x2="14.5" y2="13.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Flame tip flicker */}
      <path d="M12 2 L11.5 3.5 L12 3 L12.5 3.5 Z" fill={`url(#${id}-accent)`} opacity="0.5" />
      <circle cx="12" cy="13.5" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 42. MWBeaker ──────────────────────────────────────────────
// Lab beaker with liquid gradient, measurement marks, cross accent
export const MWBeaker = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Beaker body */}
      <path d="M5 3 L5 18 C5 20.5 8 21.5 12 21.5 C16 21.5 19 20.5 19 18 L19 3"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Beaker rim */}
      <path d="M3 3 L5 3 M19 3 L21 3" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Liquid level */}
      <path d="M6 12 C8 11.5 10 12 12 11.5 C14 11 16 11.5 18 12 L18 18 C18 19.5 15.5 20.5 12 20.5 C8.5 20.5 6 19.5 6 18 Z"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Measurement marks */}
      <line x1="5" y1="7" x2="8" y2="7" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="5" y1="10" x2="7" y2="10" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="5" y1="14" x2="8" y2="14" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="5" y1="17" x2="7" y2="17" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      {/* Medical cross accent on beaker */}
      <line x1="12" y1="14.5" x2="12" y2="17.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10.5" y1="16" x2="13.5" y2="16" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      <circle cx="12" cy="16" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 43. MWPalette ────────────────────────────────────────────
// Artist palette with small medical cross on thumb hole, gradient color dots
export const MWPalette = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Palette shape */}
      <path d="M12 2 C6.5 2 2 6.5 2 12 C2 17.5 6.5 22 12 22 C14 22 15 21 15 19.5 C15 18.5 14 17.5 14 16.5 C14 15.5 15 15 16 15 C17 15 18.5 15 19.5 14 C21 13 22 12 22 12 C22 6.5 17.5 2 12 2 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Thumb hole with medical cross */}
      <circle cx="12" cy="12" r="3" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill="none" />
      <line x1="12" y1="10" x2="12" y2="14" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" />
      <line x1="10" y1="12" x2="14" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Color dots */}
      <circle cx="7" cy="6" r="1.5" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.7" />
      <circle cx="12" cy="4" r="1.5" fill={grad ? `url(#${id}-grad)` : 'currentColor'} opacity="0.6" />
      <circle cx="17" cy="6" r="1.5" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.5" />
      <circle cx="19" cy="10" r="1.5" fill={grad ? `url(#${id}-grad)` : 'currentColor'} opacity="0.5" />
      <circle cx="7" cy="16" r="1.2" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4" />
      <circle cx="12" cy="12" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 44. MWSlidersHorizontal ───────────────────────────────────
// Slider controls with medical cross accent on one slider
export const MWSlidersHorizontal = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Slider track 1 */}
      <line x1="3" y1="6" x2="21" y2="6" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Slider knob 1 */}
      <circle cx="8" cy="6" r="2.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Slider track 2 */}
      <line x1="3" y1="12" x2="21" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Slider knob 2 */}
      <circle cx="16" cy="12" r="2.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Slider track 3 */}
      <line x1="3" y1="18" x2="21" y2="18" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Slider knob 3 with medical cross */}
      <circle cx="11" cy="18" r="2.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" fill="none" />
      <line x1="11" y1="16.5" x2="11" y2="19.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="9.5" y1="18" x2="12.5" y2="18" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      <circle cx="11" cy="18" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 45. MWSmile ──────────────────────────────────────────────
// Smile face with medical cross bandana/forehead accent
export const MWSmile = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Face circle */}
      <circle cx="12" cy="12" r="9.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Bandana/forehead band */}
      <path d="M3 9 C3 6 7 4 12 4 C17 4 21 6 21 9" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
      {/* Medical cross on forehead/bandana */}
      <line x1="12" y1="4.5" x2="12" y2="7.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="10.5" y1="6" x2="13.5" y2="6" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Eyes */}
      <circle cx="8.5" cy="11" r="1" fill={grad ? `url(#${id}-accent)` : 'currentColor'} />
      <circle cx="15.5" cy="11" r="1" fill={grad ? `url(#${id}-accent)` : 'currentColor'} />
      {/* Smile */}
      <path d="M8 15 C9 17.5 15 17.5 16 15" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="12" cy="6" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 46. MWChefHat ────────────────────────────────────────────
// Chef hat with medical cross on the band, gradient
export const MWChefHat = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Hat top */}
      <path d="M4 12 C4 5 8 2 12 2 C16 2 20 5 20 12"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Hat puffy top details */}
      <path d="M6 8 C7 6 9 4 12 4 C15 4 17 6 18 8" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4" />
      {/* Hat band */}
      <rect x="4" y="12" width="16" height="3" rx="1" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" />
      {/* Medical cross on the band */}
      <line x1="12" y1="11" x2="12" y2="16" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="9.5" y1="13.5" x2="14.5" y2="13.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Bottom brim */}
      <line x1="3" y1="15" x2="21" y2="15" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Puffy sections */}
      <circle cx="7" cy="9" r="2" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" fill="none" opacity="0.2" />
      <circle cx="12" cy="7" r="2.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" fill="none" opacity="0.2" />
      <circle cx="17" cy="9" r="2" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" fill="none" opacity="0.2" />
      <circle cx="12" cy="13.5" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 47. MWWifiOff ────────────────────────────────────────────
// Wifi signal crossed with medical cross line
export const MWWifiOff = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Wifi arcs */}
      <path d="M2 7 C5 4 9 3 12 3 C15 3 19 4 22 7" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
      <path d="M5 11 C7.5 8.5 9.5 8 12 8 C14.5 8 16.5 8.5 19 11" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M8 15 C9.5 13.5 10.5 13 12 13 C13.5 13 14.5 13.5 16 15" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Center dot */}
      <circle cx="12" cy="18" r="1.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" />
      {/* Diagonal cross slash through wifi */}
      <line x1="2" y1="2" x2="22" y2="22" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Small medical cross on the slash */}
      <line x1="16" y1="8" x2="16" y2="11" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="14.5" y1="9.5" x2="17.5" y2="9.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      <circle cx="16" cy="9.5" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 48. MWAlertCircle ────────────────────────────────────────
// Alert triangle inside circle with medical cross, gradient
export const MWAlertCircle = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Outer circle */}
      <circle cx="12" cy="12" r="9.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Inner triangle */}
      <path d="M12 6 L19 18 L5 18 Z" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Medical cross at bottom of triangle */}
      <line x1="12" y1="13" x2="12" y2="17" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="10" y1="15" x2="14" y2="15" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Exclamation at top of triangle */}
      <line x1="12" y1="9" x2="12" y2="11.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="15" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 49. MWAlertTriangle ───────────────────────────────────────
// Triangle with medical cross and exclamation, gradient
export const MWAlertTriangle = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Triangle */}
      <path d="M12 3 L22 20 L2 20 Z" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Exclamation line */}
      <line x1="12" y1="8" x2="12" y2="14" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Medical cross replacing the dot */}
      <line x1="12" y1="16" x2="12" y2="18.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      <line x1="10.2" y1="17.2" x2="13.8" y2="17.2" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Corner accent */}
      <circle cx="4" cy="18" r="0.5" fill={`url(#${id}-accent)`} opacity="0.4" />
      <circle cx="20" cy="18" r="0.5" fill={`url(#${id}-accent)`} opacity="0.4" />
      <circle cx="12" cy="17.2" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 50. MWFolderHeart ────────────────────────────────────────
// Folder with heart-shaped tab containing medical cross
export const MWFolderHeart = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Folder back */}
      <path d="M2 6 L2 19 C2 20.5 3 21.5 4.5 21.5 L19.5 21.5 C21 21.5 22 20.5 22 19 L22 9 C22 7.5 21 6.5 19.5 6.5 L12 6.5 L10 4 L4.5 4 C3 4 2 5 2 6.5 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.4" />
      {/* Folder front */}
      <path d="M2 10 L22 10 L22 19 C22 20.5 21 21.5 19.5 21.5 L4.5 21.5 C3 21.5 2 20.5 2 19 Z"
        stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Heart shape on folder front */}
      <path d="M12 12 C12 12 8 10 8 13 C8 15 12 18 12 18 C12 18 16 15 16 13 C16 10 12 12 12 12 Z"
        stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Medical cross inside heart */}
      <line x1="12" y1="13.5" x2="12" y2="16.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" />
      <line x1="10.5" y1="15" x2="13.5" y2="15" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.3" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Folder tab accent lines */}
      <line x1="14" y1="5" x2="17" y2="5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <circle cx="12" cy="15" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── Re-export types ───────────────────────────────────────────
export type { MWIconProps, MWIconComponent } from './MedwalletIconBase';
