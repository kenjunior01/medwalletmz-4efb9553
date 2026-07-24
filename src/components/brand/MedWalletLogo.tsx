/**
 * MedWallet Logo — M + W Medical Mark
 * 
 * Design concept:
 * - The M (Medicine) and W (Wallet/Wellness) are mirror letterforms
 * - A medical cross sits at their intersection
 * - A heartbeat pulse line weaves through both letters
 * - A subtle circular aura represents health/wellness wholeness
 * 
 * All colors adapt to the active region theme via CSS custom properties.
 */
import { useRef, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { getTheme } from '@/themes';
import { useCountry } from '@/contexts/CountryContext';

gsap.registerPlugin(useGSAP);

interface MedWalletLogoProps {
  size?: number;
  animated?: boolean;
  showText?: boolean;
  className?: string;
  variant?: 'full' | 'icon' | 'compact';
}

export function MedWalletLogo({
  size = 200,
  animated = true,
  showText = true,
  className = '',
  variant = 'full',
}: MedWalletLogoProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { country } = useCountry();
  const theme = getTheme(country?.id || 'MZ');

  const height = variant === 'icon' ? size : size * 0.52;
  const viewBox = variant === 'compact' ? '0 0 120 50' : '0 0 200 100';

  useGSAP(() => {
    if (!svgRef.current || !animated) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // 1. Draw M letterform
    const mPath = svgRef.current.querySelector('#mw-m');
    if (mPath) {
      const length = (mPath as SVGPathElement).getTotalLength();
      gsap.set(mPath, { strokeDasharray: length, strokeDashoffset: length, opacity: 0 });
      tl.to(mPath, { strokeDashoffset: 0, opacity: 1, duration: 1.2 });
    }

    // 2. Draw W letterform (overlapping)
    const wPath = svgRef.current.querySelector('#mw-w');
    if (wPath) {
      const length = (wPath as SVGPathElement).getTotalLength();
      gsap.set(wPath, { strokeDasharray: length, strokeDashoffset: length, opacity: 0 });
      tl.to(wPath, { strokeDashoffset: 0, opacity: 1, duration: 1.2 }, '-=0.9');
    }

    // 3. Heartbeat pulse line draws through
    const hb = svgRef.current.querySelector('#mw-heartbeat');
    if (hb) {
      const length = (hb as SVGPathElement).getTotalLength();
      gsap.set(hb, { strokeDasharray: length, strokeDashoffset: length });
      tl.to(hb, { strokeDashoffset: 0, duration: 0.9 }, '-=0.6');
    }

    // 4. Medical cross scales in
    const cross = svgRef.current.querySelector('#mw-cross');
    if (cross) {
      gsap.set(cross, { scale: 0, transformOrigin: 'center center' });
      tl.to(cross, { scale: 1, duration: 0.4, ease: 'back.out(2)' }, '-=0.4');
    }

    // 5. Text fades in
    const text = svgRef.current.querySelector('#mw-text');
    if (text && showText) {
      gsap.set(text, { opacity: 0, y: 5 });
      tl.to(text, { opacity: 1, y: 0, duration: 0.5 }, '-=0.2');
    }

    // 6. Aura ring rotates continuously
    const aura = svgRef.current.querySelector('#mw-aura');
    if (aura) {
      gsap.to(aura, {
        rotation: 360,
        svgOrigin: variant === 'compact' ? '60 25' : '100 50',
        duration: 30,
        repeat: -1,
        ease: 'none',
      });
    }

    // 7. Subtle pulse on medical cross
    if (cross) {
      gsap.to(cross, {
        scale: 1.06,
        transformOrigin: 'center center',
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 2,
      });
    }
  }, { scope: svgRef, dependencies: [animated, country?.id] });

  if (variant === 'icon') {
    return (
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={className}
        aria-label="MedWallet"
        role="img"
      >
        <defs>
          <linearGradient id="mw-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.logo.primary} />
            <stop offset="100%" stopColor={theme.logo.secondary} />
          </linearGradient>
          <filter id="mw-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Aura ring */}
        <circle id="mw-aura" cx="50" cy="50" r="44" fill="none"
          stroke="url(#mw-grad)" strokeWidth="1" opacity="0.15" strokeDasharray="6 4" />

        {/* M letterform */}
        <path id="mw-m"
          d="M 15 80 L 15 25 L 32 52 L 50 25 L 50 80"
          fill="none" stroke="url(#mw-grad)" strokeWidth="5.5"
          strokeLinecap="round" strokeLinejoin="round" filter="url(#mw-glow)" />

        {/* W letterform */}
        <path id="mw-w"
          d="M 50 25 L 50 80 L 68 52 L 85 80 L 85 25"
          fill="none" stroke="url(#mw-grad)" strokeWidth="5.5"
          strokeLinecap="round" strokeLinejoin="round" filter="url(#mw-glow)" />

        {/* Heartbeat pulse */}
        <path id="mw-heartbeat"
          d="M 50 50 L 55 50 L 58 38 L 62 62 L 66 38 L 70 50 L 75 50
             L 78 62 L 82 38 L 86 62 L 89 50 L 95 50"
          fill="none" stroke={theme.logo.accent} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />

        {/* Medical cross */}
        <g id="mw-cross">
          <rect x="44" y="37" width="12" height="12" rx="2.5"
            fill={theme.logo.accent} opacity="0.9" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      width={variant === 'compact' ? size : size}
      height={variant === 'compact' ? size * 0.42 : height}
      className={className}
      aria-label="MedWallet"
      role="img"
    >
      <defs>
        <linearGradient id="mw-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={theme.logo.primary} />
          <stop offset="100%" stopColor={theme.logo.secondary} />
        </linearGradient>
        <filter id="mw-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Subtle aura */}
      <circle id="mw-aura" cx="100" cy="50" r="44" fill="none"
        stroke="url(#mw-grad)" strokeWidth="1" opacity="0.12" strokeDasharray="5 4" />

      {/* M letterform */}
      <path id="mw-m"
        d="M 20 85 L 20 30 L 47 55 L 74 30 L 74 85"
        fill="none" stroke="url(#mw-grad)" strokeWidth="5.5"
        strokeLinecap="round" strokeLinejoin="round" filter="url(#mw-glow)" />

      {/* W letterform */}
      <path id="mw-w"
        d="M 126 30 L 126 85 L 153 55 L 180 85 L 180 30"
        fill="none" stroke="url(#mw-grad)" strokeWidth="5.5"
        strokeLinecap="round" strokeLinejoin="round" filter="url(#mw-glow)" />

      {/* Heartbeat pulse line connecting M→cross→W */}
      <path id="mw-heartbeat"
        d="M 74 55 L 82 55 L 86 42 L 91 65 L 96 42 L 100 55 L 104 55
           L 108 68 L 113 42 L 118 68 L 122 55 L 126 55"
        fill="none" stroke={theme.logo.accent} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />

      {/* Medical cross at center */}
      <g id="mw-cross">
        <rect x="91" y="41" width="18" height="18" rx="3.5"
          fill={theme.logo.accent} opacity="0.9" />
      </g>

      {/* Text: "MedWallet" below the mark */}
      {showText && variant !== 'compact' && (
        <text id="mw-text" x="100" y="98" textAnchor="middle"
          fontSize="11" fontWeight="800" letterSpacing="2"
          fill={theme.colors.text} opacity="0.8">
          MEDWALLET
        </text>
      )}
    </svg>
  );
}

export default MedWalletLogo;
