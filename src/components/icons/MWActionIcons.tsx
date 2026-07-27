/**
 * MedWallet MZ — Batch 2: UI Action Icons
 *
 * 30 unique hand-crafted SVG icons with gradients, glow effects,
 * and premium MedWallet branding. Each icon features medical/wallet
 * themed accents and Mozambique-inspired color references.
 */
import { createMWIcon } from './MedwalletIconBase';

// ─── 1. MWArrowLeft ─────────────────────────────────────────────
// Arrow pointing left with heartbeat peak at arrowhead tip and motion trail dots
export const MWArrowLeft = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.15" />
      {/* Motion trail dots */}
      <circle cx="20" cy="12" r="0.7" fill={`url(#${id}-accent)`} opacity="0.3" />
      <circle cx="22" cy="12" r="0.5" fill={`url(#${id}-accent)`} opacity="0.15" />
      <circle cx="19" cy="10.5" r="0.5" fill={`url(#${id}-accent)`} opacity="0.2" />
      {/* Main arrow shaft */}
      <line x1="20" y1="12" x2="8" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Arrowhead arms with heartbeat peak at tip */}
      <path d="M9 6 L3 12 L9 18" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Heartbeat peak at arrowhead tip */}
      <polyline points="3,12 2.2,11 2.8,10 3,10.5 3.2,13 2.5,12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Accent dot */}
      <circle cx="3" cy="12" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 2. MWArrowRight ────────────────────────────────────────────
// Arrow pointing right with heartbeat peak at tip and motion trail
export const MWArrowRight = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.15" />
      {/* Motion trail dots */}
      <circle cx="4" cy="12" r="0.7" fill={`url(#${id}-accent)`} opacity="0.3" />
      <circle cx="2" cy="12" r="0.5" fill={`url(#${id}-accent)`} opacity="0.15" />
      <circle cx="5" cy="13.5" r="0.5" fill={`url(#${id}-accent)`} opacity="0.2" />
      {/* Main arrow shaft */}
      <line x1="4" y1="12" x2="16" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Arrowhead arms with heartbeat peak at tip */}
      <path d="M15 6 L21 12 L15 18" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Heartbeat peak at arrowhead tip */}
      <polyline points="21,12 21.8,11 21.2,10 21,10.5 20.8,13 21.5,12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Accent dot */}
      <circle cx="21" cy="12" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 3. MWArrowUp ───────────────────────────────────────────────
// Arrow up with sparkle at peak tip and accent dots
export const MWArrowUp = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.15" />
      {/* Main arrow shaft */}
      <line x1="12" y1="20" x2="12" y2="7" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Arrowhead */}
      <path d="M6 13 L12 3 L18 13" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Sparkle at tip */}
      <path d="M12 3 L11.5 4.5 L10 5 L11.5 5.5 L12 7 L12.5 5.5 L14 5 L12.5 4.5 Z" fill={`url(#${id}-accent)`} filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Accent dots */}
      <circle cx="8" cy="6" r="0.6" fill={`url(#${id}-accent)`} opacity="0.5" />
      <circle cx="16" cy="7" r="0.5" fill={`url(#${id}-accent)`} opacity="0.35" />
      <circle cx="12" cy="20" r="0.7" fill={`url(#${id}-accent)`} opacity="0.25" />
    </>
  )
);

// ─── 4. MWArrowDown ─────────────────────────────────────────────
// Arrow down with medical cross replacing arrowhead
export const MWArrowDown = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.15" />
      {/* Main arrow shaft */}
      <line x1="12" y1="4" x2="12" y2="14" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Arrowhead arms (partial) */}
      <path d="M6 11 L12 14 M18 11 L12 14" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Medical cross replacing arrowhead tip */}
      <path d="M12 14 L12 21 M8.5 17.5 L15.5 17.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Small cross accent */}
      <circle cx="12" cy="17.5" r="1" fill={`url(#${id}-accent)`} opacity="0.3" />
    </>
  )
);

// ─── 5. MWPlus ──────────────────────────────────────────────────
// Plus/cross with rounded ends, pulse ring, corner accents
export const MWPlus = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Pulse ring behind */}
      <circle cx="12" cy="12" r="7" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1" fill="none" opacity="0.25" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="12" cy="12" r="9" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.5" fill="none" opacity="0.12" />
      {/* Main plus cross */}
      <line x1="12" y1="5.5" x2="12" y2="18.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <line x1="5.5" y1="12" x2="18.5" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Corner accents */}
      <circle cx="6" cy="6" r="0.8" fill={`url(#${id}-accent)`} opacity="0.6" />
      <circle cx="18" cy="6" r="0.8" fill={`url(#${id}-accent)`} opacity="0.6" />
      <circle cx="6" cy="18" r="0.8" fill={`url(#${id}-accent)`} opacity="0.6" />
      <circle cx="18" cy="18" r="0.8" fill={`url(#${id}-accent)`} opacity="0.6" />
    </>
  )
);

// ─── 6. MWX ─────────────────────────────────────────────────────
// X/close with curved arms, circles at arm tips, gradient
export const MWX = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.15" />
      {/* Curved arm top-left to bottom-right */}
      <path d="M7 7 Q8.5 10.5 12 12 Q15.5 13.5 17 17" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Curved arm top-right to bottom-left */}
      <path d="M17 7 Q15.5 10.5 12 12 Q8.5 13.5 7 17" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Circles at each arm tip */}
      <circle cx="7" cy="7" r="1.3" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="17" cy="7" r="1.3" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="7" cy="17" r="1.3" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="17" cy="17" r="1.3" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Center dot */}
      <circle cx="12" cy="12" r="0.6" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 7. MWCheck ─────────────────────────────────────────────────
// Checkmark with shield outline, sparkle dot at end
export const MWCheck = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Shield outline behind */}
      <path d="M12 3 L19 6.5 L19 12.5 Q19 18 12 21 Q5 18 5 12.5 L5 6.5 Z" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.3" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Checkmark */}
      <polyline points="6,12.5 10,17 18,7" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Sparkle at end of check */}
      <path d="M18 7 L17.4 8.2 L16.2 8.8 L17.4 9.4 L18 10.6 L18.6 9.4 L19.8 8.8 L18.6 8.2 Z" fill={`url(#${id}-accent)`} filter={glow ? `url(#${id}-glow-strong)` : undefined} />
    </>
  )
);

// ─── 8. MWCheckCircle2 ──────────────────────────────────────────
// Circle with checkmark, gradient ring, pulse ring outside
export const MWCheckCircle2 = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.1" />
      {/* Outer pulse ring */}
      <circle cx="12" cy="12" r="11" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.5" fill="none" opacity="0.2" />
      {/* Gradient ring circle */}
      <circle cx="12" cy="12" r="8.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Second thin ring */}
      <circle cx="12" cy="12" r="9.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.6" fill="none" opacity="0.3" />
      {/* Checkmark inside */}
      <polyline points="8,12 11,15.5 16.5,9" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Sparkle dot at check end */}
      <circle cx="16.5" cy="9" r="1" fill={`url(#${id}-accent)`} filter={glow ? `url(#${id}-glow-strong)` : undefined} />
    </>
  )
);

// ─── 9. MWChevronRight ──────────────────────────────────────────
// Chevron with arrowhead notch at tip and accent dots
export const MWChevronRight = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.15" />
      {/* Main chevron */}
      <path d="M9 4.5 L17 12 L9 19.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Arrowhead notch at tip */}
      <path d="M15 10 L17 12 L15 14" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Tiny accent dots */}
      <circle cx="10.5" cy="7.5" r="0.6" fill={`url(#${id}-accent)`} opacity="0.5" />
      <circle cx="10.5" cy="16.5" r="0.6" fill={`url(#${id}-accent)`} opacity="0.5" />
      <circle cx="17" cy="12" r="0.7" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 10. MWChevronLeft ──────────────────────────────────────────
// Chevron left with arrowhead notch and accent dots
export const MWChevronLeft = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.15" />
      {/* Main chevron */}
      <path d="M15 4.5 L7 12 L15 19.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Arrowhead notch at tip */}
      <path d="M9 10 L7 12 L9 14" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Tiny accent dots */}
      <circle cx="13.5" cy="7.5" r="0.6" fill={`url(#${id}-accent)`} opacity="0.5" />
      <circle cx="13.5" cy="16.5" r="0.6" fill={`url(#${id}-accent)`} opacity="0.5" />
      <circle cx="7" cy="12" r="0.7" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 11. MWChevronDown ──────────────────────────────────────────
// Chevron down with arrowhead notch and accent dots
export const MWChevronDown = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.15" />
      {/* Main chevron */}
      <path d="M4.5 9 L12 17 L19.5 9" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Arrowhead notch at tip */}
      <path d="M10 15 L12 17 L14 15" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Tiny accent dots */}
      <circle cx="7.5" cy="10.5" r="0.6" fill={`url(#${id}-accent)`} opacity="0.5" />
      <circle cx="16.5" cy="10.5" r="0.6" fill={`url(#${id}-accent)`} opacity="0.5" />
      <circle cx="12" cy="17" r="0.7" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 12. MWChevronUp ────────────────────────────────────────────
// Chevron up with arrowhead notch and accent dots
export const MWChevronUp = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.15" />
      {/* Main chevron */}
      <path d="M4.5 15 L12 7 L19.5 15" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Arrowhead notch at tip */}
      <path d="M10 9 L12 7 L14 9" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Tiny accent dots */}
      <circle cx="7.5" cy="13.5" r="0.6" fill={`url(#${id}-accent)`} opacity="0.5" />
      <circle cx="16.5" cy="13.5" r="0.6" fill={`url(#${id}-accent)`} opacity="0.5" />
      <circle cx="12" cy="7" r="0.7" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 13. MWMenu ─────────────────────────────────────────────────
// Three horizontal lines, middle with heartbeat bump
export const MWMenu = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.15" />
      {/* Top line */}
      <line x1="4" y1="6" x2="20" y2="6" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Middle line with heartbeat bump */}
      <path d="M4 12 L9 12 L10 10 L11.5 14 L13 8 L14.5 14 L16 10 L17 12 L20 12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Bottom line */}
      <line x1="4" y1="18" x2="20" y2="18" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Accent dots at line ends */}
      <circle cx="4" cy="6" r="0.7" fill={`url(#${id}-accent)`} />
      <circle cx="20" cy="6" r="0.7" fill={`url(#${id}-accent)`} />
      <circle cx="4" cy="18" r="0.7" fill={`url(#${id}-accent)`} />
      <circle cx="20" cy="18" r="0.7" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 14. MWSearch ───────────────────────────────────────────────
// Magnifying glass with medical cross in lens, gradient handle
export const MWSearch = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Lens glow */}
      <circle cx="10" cy="10" r="6.5" fill={`url(#${id}-radial)`} opacity="0.3" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Main lens circle */}
      <circle cx="10" cy="10" r="6" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Handle */}
      <line x1="14.5" y1="14.5" x2="20" y2="20" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Medical cross inside lens */}
      <line x1="10" y1="7.5" x2="10" y2="12.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7.5" y1="10" x2="12.5" y2="10" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      {/* Lens shine accent */}
      <path d="M7.5 6.5 Q8 5.5 9 5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.5" />
    </>
  )
);

// ─── 15. MWFilter ───────────────────────────────────────────────
// Funnel with gradient, droplets, measurement lines
export const MWFilter = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Funnel body with gradient fill */}
      <path d="M4 5 L20 5 L14 13 L14 19 L10 21 L10 13 Z" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill={grad ? `url(#${id}-radial)` : 'none'} fillOpacity="0.15" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Funnel top rim highlight */}
      <line x1="4" y1="5" x2="20" y2="5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Droplets falling from funnel */}
      <ellipse cx="12" cy="22" rx="0.8" ry="1.2" fill={`url(#${id}-accent)`} opacity="0.7" />
      <ellipse cx="10" cy="21.5" rx="0.5" ry="0.8" fill={`url(#${id}-accent)`} opacity="0.4" />
      <ellipse cx="14" cy="21.8" rx="0.4" ry="0.6" fill={`url(#${id}-accent)`} opacity="0.3" />
      {/* Measurement lines on the side */}
      <line x1="21" y1="7" x2="22" y2="7" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="21" y1="10" x2="22.5" y2="10" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="21" y1="13" x2="22" y2="13" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </>
  )
);

// ─── 16. MWBell ─────────────────────────────────────────────────
// Bell with heartbeat line, notification dot with pulse ring
export const MWBell = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Bell body */}
      <path d="M12 3 Q7 3 5.5 7.5 L4 14 L20 14 L18.5 7.5 Q17 3 12 3 Z" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Bell bottom rim */}
      <line x1="3" y1="14" x2="21" y2="14" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Bell clapper */}
      <path d="M10 14 Q10 18 12 18 Q14 18 14 14" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Heartbeat line across bell face */}
      <polyline points="6,10 8.5,10 9.5,8 11,13 12.5,7 14,12 15,10 18,10" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Notification dot at top */}
      <circle cx="18" cy="4.5" r="2.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.6" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.2" />
      <circle cx="18" cy="4.5" r="1.5" fill={grad ? `url(#${id}-accent)` : 'currentColor'} filter={glow ? `url(#${id}-glow-strong)` : undefined} />
    </>
  )
);

// ─── 17. MWMoreHorizontal ──────────────────────────────────────
// Three dots with gradient fill and connecting lines
export const MWMoreHorizontal = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Subtle connecting line */}
      <line x1="6" y1="12" x2="18" y2="12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.25" />
      {/* Left dot with gradient fill */}
      <circle cx="6" cy="12" r="2" fill={grad ? `url(#${id}-grad)` : 'currentColor'} filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Center dot with gradient fill */}
      <circle cx="12" cy="12" r="2" fill={grad ? `url(#${id}-grad)` : 'currentColor'} filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Right dot with gradient fill */}
      <circle cx="18" cy="12" r="2" fill={grad ? `url(#${id}-grad)` : 'currentColor'} filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Tiny sparkle accents */}
      <circle cx="9" cy="9" r="0.5" fill={`url(#${id}-accent)`} opacity="0.3" />
      <circle cx="15" cy="15" r="0.5" fill={`url(#${id}-accent)`} opacity="0.3" />
    </>
  )
);

// ─── 18. MWEdit ─────────────────────────────────────────────────
// Pencil/pen with cross at tip, gradient stroke, writing line
export const MWEdit = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Pencil body */}
      <path d="M16 4 L20 8 L8 20 L3 21 L4 16 Z" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Pencil tip line */}
      <line x1="4" y1="16" x2="8" y2="20" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      {/* Pencil top eraser line */}
      <line x1="16" y1="4" x2="20" y2="8" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
      {/* Plus/cross at pencil tip */}
      <line x1="2" y1="21" x2="4" y2="23" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <line x1="0.5" y1="22.5" x2="5.5" y2="21.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Writing line representation */}
      <path d="M7 17 L10 14" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.4" strokeDasharray="1 2" />
    </>
  )
);

// ─── 19. MWTrash2 ───────────────────────────────────────────────
// Trash bin with biohazard-style lid, gradient body
export const MWTrash2 = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Biohazard-style lid - three curved arcs */}
      <path d="M6 7 Q9 5 12 6 Q15 5 18 7" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      <path d="M7 5 Q9.5 2.5 12 3 Q14.5 2.5 17 5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Lid handle */}
      <line x1="10" y1="3" x2="14" y2="3" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Lid base */}
      <line x1="4" y1="8" x2="20" y2="8" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" />
      {/* Trash body with gradient fill */}
      <path d="M5 8 L6.5 20 L17.5 20 L19 8" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill={grad ? `url(#${id}-radial)` : 'none'} fillOpacity="0.2" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Body lines */}
      <line x1="9" y1="11" x2="9" y2="17" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <line x1="12" y1="11" x2="12" y2="17" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <line x1="15" y1="11" x2="15" y2="17" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      {/* Small accent details */}
      <circle cx="6.5" cy="8" r="0.7" fill={`url(#${id}-accent)`} />
      <circle cx="17.5" cy="8" r="0.7" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 20. MWCopy ─────────────────────────────────────────────────
// Two overlapping rectangles with MW watermark on front
export const MWCopy = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Back rectangle */}
      <rect x="6" y="3" width="13" height="15" rx="1.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill="none" opacity="0.4" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Front rectangle */}
      <rect x="3" y="6" width="13" height="15" rx="1.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" fill={grad ? `url(#${id}-radial)` : 'none'} fillOpacity="0.1" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* MW watermark on front rectangle */}
      <text x="9.5" y="15" textAnchor="middle" fontSize="5" fontWeight="bold" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.35">MW</text>
      {/* Small text lines */}
      <line x1="5" y1="10" x2="11" y2="10" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
      <line x1="5" y1="12.5" x2="14" y2="12.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.2" />
      {/* Corner accent */}
      <circle cx="15" cy="7" r="0.8" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 21. MWDownload ─────────────────────────────────────────────
// Downward arrow in rounded tray with sparkle dots
export const MWDownload = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Rounded tray/box at bottom */}
      <path d="M3 14 Q3 12 5 12 L19 12 Q21 12 21 14 L21 18 Q21 21 18 21 L6 21 Q3 21 3 18 Z" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill={grad ? `url(#${id}-radial)` : 'none'} fillOpacity="0.15" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Downward arrow shaft */}
      <line x1="12" y1="3" x2="12" y2="14" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Arrowhead */}
      <path d="M7 11 L12 15 L17 11" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Sparkle dots */}
      <circle cx="7" cy="5" r="0.7" fill={`url(#${id}-accent)`} opacity="0.5" />
      <circle cx="17" cy="5" r="0.7" fill={`url(#${id}-accent)`} opacity="0.5" />
      <circle cx="5" cy="8" r="0.5" fill={`url(#${id}-accent)`} opacity="0.3" />
      <circle cx="19" cy="8" r="0.5" fill={`url(#${id}-accent)`} opacity="0.3" />
    </>
  )
);

// ─── 22. MWUpload ───────────────────────────────────────────────
// Upward arrow from rounded tray with motion lines
export const MWUpload = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Rounded tray at bottom */}
      <path d="M3 15 Q3 13 5 13 L19 13 Q21 13 21 15 L21 18 Q21 21 18 21 L6 21 Q3 21 3 18 Z" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill={grad ? `url(#${id}-radial)` : 'none'} fillOpacity="0.15" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Upward arrow shaft */}
      <line x1="12" y1="21" x2="12" y2="5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Arrowhead */}
      <path d="M7 9 L12 4 L17 9" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Motion lines */}
      <line x1="8" y1="3" x2="8" y2="1" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="12" y1="2" x2="12" y2="0" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="16" y1="3" x2="16" y2="1" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      {/* Accent dots */}
      <circle cx="5" cy="6" r="0.6" fill={`url(#${id}-accent)`} opacity="0.3" />
      <circle cx="19" cy="6" r="0.6" fill={`url(#${id}-accent)`} opacity="0.3" />
    </>
  )
);

// ─── 23. MWShare2 ───────────────────────────────────────────────
// Three connected nodes in triangle with gradient fills
export const MWShare2 = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Connecting lines forming triangle */}
      <line x1="12" y1="6" x2="6" y2="16" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <line x1="12" y1="6" x2="18" y2="16" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      <line x1="6" y1="16" x2="18" y2="16" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Top node with gradient fill */}
      <circle cx="12" cy="6" r="3" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill={grad ? `url(#${id}-radial)` : 'none'} fillOpacity="0.4" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="12" cy="6" r="1.2" fill={grad ? `url(#${id}-accent)` : 'currentColor'} />
      {/* Bottom-left node */}
      <circle cx="6" cy="16" r="3" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill={grad ? `url(#${id}-radial)` : 'none'} fillOpacity="0.4" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="6" cy="16" r="1.2" fill={grad ? `url(#${id}-accent)` : 'currentColor'} />
      {/* Bottom-right node */}
      <circle cx="18" cy="16" r="3" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill={grad ? `url(#${id}-radial)` : 'none'} fillOpacity="0.4" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="18" cy="16" r="1.2" fill={grad ? `url(#${id}-accent)` : 'currentColor'} />
    </>
  )
);

// ─── 24. MWRefreshCw ────────────────────────────────────────────
// Two curved arrows forming circle, medical cross at center
export const MWRefreshCw = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Top-right curved arrow */}
      <path d="M16 5 A7 7 0 0 1 19 13 L21 13 L18.5 16 L16 13 L18 13 A5 5 0 0 0 16 7" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Bottom-left curved arrow */}
      <path d="M8 19 A7 7 0 0 1 5 11 L3 11 L5.5 8 L8 11 L6 11 A5 5 0 0 0 8 17" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Medical cross at center */}
      <line x1="12" y1="10" x2="12" y2="14" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      <line x1="10" y1="12" x2="14" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Center dot */}
      <circle cx="12" cy="12" r="0.6" fill={`url(#${id}-accent)`} />
    </>
  )
);

// ─── 25. MWExternalLink ─────────────────────────────────────────
// Square with arrow exiting top-right, MW initial, gradient
export const MWExternalLink = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.12" />
      {/* Square */}
      <rect x="3" y="3" width="13" height="13" rx="2" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" fill={grad ? `url(#${id}-radial)` : 'none'} fillOpacity="0.1" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* MW initial inside square */}
      <text x="9.5" y="10.5" textAnchor="middle" fontSize="4.5" fontWeight="bold" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.4">MW</text>
      {/* Arrow exiting from top-right corner */}
      <path d="M15 9 L21 3 M21 3 L21 8 M21 3 L16 3" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Corner accent dot */}
      <circle cx="21" cy="3" r="0.8" fill={`url(#${id}-accent)`} filter={glow ? `url(#${id}-glow-strong)` : undefined} />
    </>
  )
);

// ─── 26. MWEye ──────────────────────────────────────────────────
// Eye with medical cross iris pattern (concentric circles + cross)
export const MWEye = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.1" />
      {/* Eye shape - upper lid */}
      <path d="M2 12 Q6 5 12 5 Q18 5 22 12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Eye shape - lower lid */}
      <path d="M2 12 Q6 19 12 19 Q18 19 22 12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Iris outer ring */}
      <circle cx="12" cy="12" r="4.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" fill={grad ? `url(#${id}-radial)` : 'none'} fillOpacity="0.3" />
      {/* Iris inner ring */}
      <circle cx="12" cy="12" r="2.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" fill={grad ? `url(#${id}-accent)` : 'none'} fillOpacity="0.2" />
      {/* Medical cross in iris */}
      <line x1="12" y1="8" x2="12" y2="16" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
      <line x1="8" y1="12" x2="16" y2="12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
      {/* Pupil */}
      <circle cx="12" cy="12" r="1" fill={grad ? `url(#${id}-accent)` : 'currentColor'} filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Eye shine */}
      <circle cx="14" cy="10" r="0.8" fill="white" opacity="0.7" />
    </>
  )
);

// ─── 27. MWEyeOff ───────────────────────────────────────────────
// Eye with diagonal line crossing and small X accent
export const MWEyeOff = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.1" />
      {/* Eye shape - upper lid */}
      <path d="M2 12 Q6 5 12 5 Q18 5 22 12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.5" />
      {/* Eye shape - lower lid */}
      <path d="M2 12 Q6 19 12 19 Q18 19 22 12" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.5" />
      {/* Iris ring */}
      <circle cx="12" cy="12" r="3.5" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.2" fill="none" opacity="0.4" />
      {/* Diagonal crossing line with gradient */}
      <line x1="3" y1="3" x2="21" y2="21" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="2.2" strokeLinecap="round" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Small X accent */}
      <path d="M18 4 L20 6 M20 4 L18 6" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Slashed pupil hint */}
      <circle cx="12" cy="12" r="1" fill={grad ? `url(#${id}-accent)` : 'currentColor'} opacity="0.3" />
    </>
  )
);

// ─── 28. MWHeart ────────────────────────────────────────────────
// Heart with ECG heartbeat line, gradient fill, plus accent
export const MWHeart = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.1" />
      {/* Heart shape with gradient fill */}
      <path d="M12 21 Q12 21 5 14 Q1 10 4 6 Q7 2 12 7 Q17 2 20 6 Q23 10 19 14 Q12 21 12 21 Z" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill={grad ? `url(#${id}-radial)` : 'none'} fillOpacity="0.25" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* ECG heartbeat line through heart */}
      <polyline points="5,12 7,12 8.5,9 10,15 11.5,8 13,16 14.5,10 15.5,12 19,12" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter={glow ? `url(#${id}-glow)` : undefined} />
      {/* Small plus/cross accent at top right */}
      <line x1="19" y1="3" x2="19" y2="6" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="17.5" y1="4.5" x2="20.5" y2="4.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </>
  )
);

// ─── 29. MWStar ─────────────────────────────────────────────────
// 5-pointed star with Mozambique flag reference, gradient, inner glow, sparkle accents
export const MWStar = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.1" />
      {/* 5-pointed star path */}
      <path d="M12 2 L14.5 8.5 L21.5 8.5 L16 13 L18 20 L12 16 L6 20 L8 13 L2.5 8.5 L9.5 8.5 Z" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill={grad ? `url(#${id}-radial)` : 'none'} fillOpacity="0.3" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Inner glow star (smaller) */}
      <path d="M12 5.5 L13.5 9.5 L17.5 9.5 L14.5 12.5 L15.5 16.5 L12 14 L8.5 16.5 L9.5 12.5 L6.5 9.5 L10.5 9.5 Z" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.4" />
      {/* Sparkle accents at each point */}
      <circle cx="12" cy="2" r="0.8" fill={`url(#${id}-accent)`} filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      <circle cx="21.5" cy="8.5" r="0.6" fill={`url(#${id}-accent)`} filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="18" cy="20" r="0.6" fill={`url(#${id}-accent)`} filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="6" cy="20" r="0.6" fill={`url(#${id}-accent)`} filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="2.5" cy="8.5" r="0.6" fill={`url(#${id}-accent)`} filter={glow ? `url(#${id}-glow)` : undefined} />
    </>
  )
);

// ─── 30. MWZap ──────────────────────────────────────────────────
// Lightning bolt with medical cross at center, gradient fill, strong glow, energy dots
export const MWZap = createMWIcon(
  (id, glow, grad) => (
    <>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-radial)`} opacity="0.15" />
      {/* Lightning bolt body with gradient fill */}
      <path d="M13 2 L7 13 L11.5 13 L10 22 L17 10 L12.5 10 Z" stroke={grad ? `url(#${id}-grad)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill={grad ? `url(#${id}-radial)` : 'none'} fillOpacity="0.35" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Medical cross at bolt center */}
      <line x1="11.8" y1="9" x2="11.8" y2="14" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      <line x1="9.5" y1="11.5" x2="14.5" y2="11.5" stroke={grad ? `url(#${id}-accent)` : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" filter={glow ? `url(#${id}-glow-strong)` : undefined} />
      {/* Energy dots */}
      <circle cx="4" cy="6" r="0.7" fill={`url(#${id}-accent)`} opacity="0.6" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="19" cy="8" r="0.5" fill={`url(#${id}-accent)`} opacity="0.4" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="5" cy="17" r="0.6" fill={`url(#${id}-accent)`} opacity="0.5" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="20" cy="18" r="0.4" fill={`url(#${id}-accent)`} opacity="0.3" filter={glow ? `url(#${id}-glow)` : undefined} />
      <circle cx="3" cy="12" r="0.5" fill={`url(#${id}-accent)`} opacity="0.35" />
      <circle cx="21" cy="13" r="0.5" fill={`url(#${id}-accent)`} opacity="0.35" />
    </>
  )
);

// ─── Re-export types ─────────────────────────────────────────────
export type { MWIconProps, MWIconComponent } from './MedwalletIconBase';
