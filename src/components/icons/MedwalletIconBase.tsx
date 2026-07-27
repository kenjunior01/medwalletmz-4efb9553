/**
 * MedWallet MZ — Icon System Foundation
 * 
 * Every MedWallet icon inherits from this base.
 * Shared SVG defs: gradients, glow filters, stroke animations.
 * Theme-aware via CSS custom properties (--region-logo-primary, etc.)
 */
import { forwardRef, type SVGProps } from 'react';

// ─── Public Types ─────────────────────────────────────────────
export interface MWIconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  /** Tailwind size class or pixel number. Default "h-5 w-5" */
  size?: number | string;
  /** Current color for stroke-based icons. Default "currentColor" */
  color?: string;
  /** Stroke width. Default 2 */
  strokeWidth?: number;
  /** Apply glow filter? Default true */
  glow?: boolean;
  /** Apply gradient fill? Default true */
  gradient?: boolean;
  /** Animation variant */
  pulse?: boolean;
  spin?: boolean;
  /** Extra CSS classes */
  className?: string;
}

export type MWIconComponent = React.FC<MWIconProps>;

// ─── Size helper ───────────────────────────────────────────────
export function parseSize(size?: number | string): { w: string; h: string } {
  if (typeof size === 'number') return { w: `${size}px`, h: `${size}px` };
  if (typeof size === 'string' && /^\d+(px|rem|em)$/.test(size)) return { w: size, h: size };
  return { w: '20px', h: '20px' };
}

// ─── SVG Unique ID counter (SSR-safe) ──────────────────────────
let _uid = 0;
function uid(prefix: string) {
  return `${prefix}-${++_uid}`;
}

// ─── Shared Defs Component ─────────────────────────────────────
export function MWDefs({ id }: { id: string }) {
  return (
    <defs>
      {/* Primary gradient — vertical */}
      <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="var(--region-logo-primary, #009739)" />
        <stop offset="50%" stopColor="var(--region-logo-secondary, #FFD100)" />
        <stop offset="100%" stopColor="var(--region-logo-primary, #009739)" />
      </linearGradient>
      {/* Diagonal accent gradient */}
      <linearGradient id={`${id}-accent`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--region-logo-primary, #009739)" />
        <stop offset="100%" stopColor="var(--region-logo-accent, #D40000)" />
      </linearGradient>
      {/* Radial glow */}
      <radialGradient id={`${id}-radial`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="var(--region-logo-glow, #00973940)" stopOpacity="0.6" />
        <stop offset="100%" stopColor="var(--region-logo-glow, #00973940)" stopOpacity="0" />
      </radialGradient>
      {/* Soft glow filter */}
      <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="1.2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      {/* Strong glow filter */}
      <filter id={`${id}-glow-strong`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feFlood floodColor="var(--region-logo-glow, #00973940)" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="shadow" />
        <feMerge>
          <feMergeNode in="shadow" />
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      {/* Drop shadow */}
      <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="var(--region-logo-primary, #009739)" floodOpacity="0.3" />
      </filter>
    </defs>
  );
}

// ─── Base Wrapper ──────────────────────────────────────────────
export const MWBase = forwardRef<SVGSVGElement, MWIconProps & { children: React.ReactNode }>(
  function MWBase(
    {
      size,
      color = 'currentColor',
      strokeWidth: sw = 2,
      glow = true,
      gradient = true,
      pulse = false,
      spin = false,
      className,
      children,
      viewBox = '0 0 24 24',
      fill = 'none',
      ...rest
    },
    ref
  ) {
    const { w, h } = parseSize(size);
    const id = uid('mw');

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={viewBox}
        width={w}
        height={h}
        fill={fill}
        className={[
          'inline-flex shrink-0',
          pulse && 'animate-pulse',
          spin && 'animate-spin',
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="img"
        {...rest}
      >
        <MWDefs id={id} />
        {children}
      </svg>
    );
  }
);

// ─── Keyframe CSS (injected once) ──────────────────────────────
const STYLE_ID = 'mw-icons-style';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    /* MedWallet exclusive icon animations */
    @keyframes mw-pulse-ring {
      0% { transform: scale(1); opacity: 0.5; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    @keyframes mw-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-2px); }
    }
    @keyframes mw-glow-breathe {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.3); }
    }
    @keyframes mw-shimmer {
      0% { stroke-dashoffset: 20; }
      100% { stroke-dashoffset: 0; }
    }
    .mw-icon-glow-breathe {
      animation: mw-glow-breathe 3s ease-in-out infinite;
    }
    .mw-icon-float {
      animation: mw-float 2s ease-in-out infinite;
    }
    .mw-icon-shimmer path, .mw-icon-shimmer circle, .mw-icon-shimmer line, .mw-icon-shimmer polyline {
      stroke-dasharray: 5 3;
      animation: mw-shimmer 1.5s linear infinite;
    }
  `;
  document.head.appendChild(s);
}

// ─── Utility: create icon component factory ───────────────────
export function createMWIcon(
  /** SVG inner elements (paths, circles, etc.) */
  paths: (id: string, glow: boolean, grad: boolean) => React.ReactNode,
  opts?: {
    viewBox?: string;
    defaultFill?: string;
    defaultStroke?: string;
  }
): MWIconComponent {
  const Comp = forwardRef<SVGSVGElement, MWIconProps>(function Comp(
    { glow: gl = true, gradient: gr = true, color, fill, stroke, ...rest },
    ref
  ) {
    const id = uid('mw');
    return (
      <MWBase
        ref={ref}
        glow={gl}
        gradient={gr}
        fill={fill ?? opts?.defaultFill ?? 'none'}
        stroke={stroke ?? color ?? opts?.defaultStroke ?? 'currentColor'}
        viewBox={opts?.viewBox}
        {...rest}
      >
        {paths(id, gl, gr)}
      </MWBase>
    );
  });
  Comp.displayName = 'MWIcon';
  return Comp;
}
