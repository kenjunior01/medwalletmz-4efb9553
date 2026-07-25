/**
 * MedWallet Logo — Fused M+W Medical Mark
 *
 * Design concept:
 * - M (Medicine) and W (Wallet/Wellness) share a central vertical structural element
 * - M's inner V descends to a valley, then rises to a shared central peak
 * - W continues from the shared vertical: peak → valley → peak (classic W zigzag)
 * - A medical cross (+) is formed by the shared vertical crossing a horizontal stroke
 * - A heartbeat/ECG line weaves through the entire mark left to right
 * - A wallet silhouette (rounded rectangle) frames the letterforms
 * - A Mozambique 5-pointed star crowns the fusion point
 *
 * Animation sequence (GSAP):
 *  Phase 1: Wallet silhouette draws (stroke-dasharray)
 *  Phase 2: M letterform draws left to right (includes shared vertical)
 *  Phase 3: Central cross/intersection scales in with pulse
 *  Phase 4: W letterform draws from shared base
 *  Phase 5: Heartbeat/ECG line traces through
 *  Phase 6: Star appears with sparkle rotation
 *  Phase 7: Text fades in
 *  Continuous: Cross pulses subtly, star rotates slowly
 *
 * All colors adapt to the active region theme via getTheme().
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

  const height = variant === 'icon' ? size : size * 0.5;
  const viewBox =
    variant === 'icon' ? '0 0 100 100' : variant === 'compact' ? '0 0 140 70' : '0 0 200 100';

  // Center coordinates for animation transform origins
  const cx = variant === 'icon' ? 50 : variant === 'compact' ? 70 : 100;
  const cy = variant === 'icon' ? 57 : variant === 'compact' ? 37 : 53;
  const starCy = variant === 'icon' ? 12 : variant === 'compact' ? 5 : 8;

  useGSAP(() => {
    if (!svgRef.current || !animated) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // Phase 1: Wallet silhouette draws
    const wallet = svgRef.current.querySelector('#mw-wallet');
    if (wallet) {
      const el = wallet as SVGRectElement;
      // Approximate perimeter for dash animation
      const w = parseFloat(el.getAttribute('width') || '0');
      const h = parseFloat(el.getAttribute('height') || '0');
      const perimeter = 2 * (w + h);
      gsap.set(wallet, {
        strokeDasharray: perimeter,
        strokeDashoffset: perimeter,
        opacity: 0,
      });
      tl.to(wallet, { strokeDashoffset: 0, opacity: 1, duration: 0.8 });
    }

    // Phase 2: M letterform draws left to right (includes shared vertical)
    const mPath = svgRef.current.querySelector('#mw-m');
    if (mPath) {
      const length = (mPath as SVGPathElement).getTotalLength();
      gsap.set(mPath, {
        strokeDasharray: length,
        strokeDashoffset: length,
        opacity: 0,
      });
      tl.to(mPath, { strokeDashoffset: 0, opacity: 1, duration: 1.0 }, '-=0.5');
    }

    // Phase 3: Central cross scales in with a pulse
    const crossH = svgRef.current.querySelector('#mw-cross-h');
    const crossV = svgRef.current.querySelector('#mw-cross-v');
    if (crossH && crossV) {
      gsap.set([crossH, crossV], {
        scale: 0,
        opacity: 0,
        transformOrigin: 'center center',
      });
      tl.to(
        [crossH, crossV],
        { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(3)' },
        '-=0.4',
      );
    }

    // Phase 4: W letterform draws from shared base
    const wPath = svgRef.current.querySelector('#mw-w');
    if (wPath) {
      const length = (wPath as SVGPathElement).getTotalLength();
      gsap.set(wPath, {
        strokeDasharray: length,
        strokeDashoffset: length,
        opacity: 0,
      });
      tl.to(wPath, { strokeDashoffset: 0, opacity: 1, duration: 1.0 }, '-=0.7');
    }

    // Phase 5: Heartbeat line traces through
    const hb = svgRef.current.querySelector('#mw-heartbeat');
    if (hb) {
      const length = (hb as SVGPathElement).getTotalLength();
      gsap.set(hb, { strokeDasharray: length, strokeDashoffset: length });
      tl.to(hb, { strokeDashoffset: 0, duration: 0.8 }, '-=0.5');
    }

    // Phase 6: Star appears with sparkle
    const star = svgRef.current.querySelector('#mw-star');
    if (star) {
      gsap.set(star, {
        scale: 0,
        opacity: 0,
        rotation: -90,
      });
      tl.to(
        star,
        {
          scale: 1,
          opacity: 1,
          rotation: 0,
          duration: 0.5,
          ease: 'back.out(2)',
          svgOrigin: `${cx} ${starCy}`,
        },
        '-=0.3',
      );
    }

    // Phase 7: Text fades in
    const text = svgRef.current.querySelector('#mw-text');
    if (text && showText) {
      gsap.set(text, { opacity: 0, y: 5 });
      tl.to(text, { opacity: 0.8, y: 0, duration: 0.4 }, '-=0.2');
    }

    // Continuous: Cross pulses subtly
    if (crossH && crossV) {
      gsap.to([crossH, crossV], {
        scale: 1.1,
        transformOrigin: 'center center',
        duration: 1.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 3,
      });
    }

    // Continuous: Star rotates slowly
    if (star) {
      gsap.to(star, {
        rotation: 360,
        svgOrigin: `${cx} ${starCy}`,
        duration: 25,
        repeat: -1,
        ease: 'none',
        delay: 3.5,
      });
    }
  }, { scope: svgRef, dependencies: [animated, country?.id, variant] });

  // ═══════════════════════════════════════════════════════════════════
  //  Shared SVG Definitions
  // ═══════════════════════════════════════════════════════════════════
  const sharedDefs = (
    <>
      <linearGradient id="mw-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={theme.logo.primary} />
        <stop offset="50%" stopColor={theme.logo.secondary} />
        <stop offset="100%" stopColor={theme.logo.primary} />
      </linearGradient>
      <filter id="mw-glow">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="mw-glow-accent">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feFlood floodColor={theme.logo.glow} result="color" />
        <feComposite in="color" in2="blur" operator="in" result="shadow" />
        <feMerge>
          <feMergeNode in="shadow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════
  //  ICON VARIANT (100 × 100)
  // ═══════════════════════════════════════════════════════════════════
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
        {sharedDefs}

        {/* Wallet silhouette — rounded rectangle suggesting a wallet */}
        <rect
          id="mw-wallet"
          x="4" y="6" width="92" height="88" rx="8" ry="8"
          fill="none" stroke="url(#mw-grad)" strokeWidth="2" opacity="0.2"
        />

        {/*
          M letterform (left half) — includes the shared right vertical.
          Traces: left vertical up → V down to valley → V up to shared peak → shared vertical down.
        */}
        <path
          id="mw-m"
          d="M 10,88 L 10,26 C 10,44 22,66 32,66 C 42,66 50,26 50,26 L 50,88"
          fill="none" stroke="url(#mw-grad)" strokeWidth="4.5"
          strokeLinecap="round" strokeLinejoin="round" filter="url(#mw-glow)"
        />

        {/*
          W letterform (right half) — starts from shared base.
          Traces: shared base → ^ up to peak → ^ down to valley → right vertical up.
        */}
        <path
          id="mw-w"
          d="M 50,88 C 50,72 60,50 70,50 C 80,50 90,72 90,88 L 90,26"
          fill="none" stroke="url(#mw-grad)" strokeWidth="4.5"
          strokeLinecap="round" strokeLinejoin="round" filter="url(#mw-glow)"
        />

        {/*
          Medical cross — formed by the shared vertical (x=50) intersecting
          with a horizontal stroke at the center, creating a natural + shape.
        */}
        <line
          id="mw-cross-h" x1="44" y1="57" x2="56" y2="57"
          stroke={theme.logo.accent} strokeWidth="2.5" strokeLinecap="round" opacity="0.9"
        />
        <line
          id="mw-cross-v" x1="50" y1="51" x2="50" y2="63"
          stroke={theme.logo.accent} strokeWidth="2.5" strokeLinecap="round" opacity="0.9"
        />

        {/* Heartbeat/ECG line weaving through M → cross → W */}
        <path
          id="mw-heartbeat"
          d="M 2,57 L 10,57 L 16,57 L 22,50 L 28,64 L 34,50 L 40,57
             L 44,57 L 50,51 L 56,63 L 62,51 L 68,57
             L 72,57 L 78,50 L 84,64 L 90,50 L 98,57"
          fill="none" stroke={theme.logo.accent} strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.6"
        />

        {/* Mozambique 5-pointed star at the fusion apex */}
        <polygon
          id="mw-star"
          points="50,8 51.1,10.5 53.8,10.8 51.7,12.6 52.4,15.2 50,13.8 47.6,15.2 48.3,12.6 46.2,10.8 48.9,10.5"
          fill={theme.logo.accent} opacity="0.9" filter="url(#mw-glow-accent)"
        />
      </svg>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  //  COMPACT VARIANT (140 × 70) — no text
  // ═══════════════════════════════════════════════════════════════════
  if (variant === 'compact') {
    return (
      <svg
        ref={svgRef}
        viewBox="0 0 140 70"
        width={size}
        height={size * 0.5}
        className={className}
        aria-label="MedWallet"
        role="img"
      >
        {sharedDefs}

        {/* Wallet silhouette */}
        <rect
          id="mw-wallet"
          x="4" y="2" width="132" height="66" rx="8" ry="8"
          fill="none" stroke="url(#mw-grad)" strokeWidth="1.5" opacity="0.2"
        />

        {/* M letterform with shared vertical */}
        <path
          id="mw-m"
          d="M 14,58 L 14,16 C 14,30 22,44 34,44 C 44,44 62,16 70,16 L 70,58"
          fill="none" stroke="url(#mw-grad)" strokeWidth="3.5"
          strokeLinecap="round" strokeLinejoin="round" filter="url(#mw-glow)"
        />

        {/* W letterform from shared base */}
        <path
          id="mw-w"
          d="M 70,58 C 70,48 80,32 91,32 C 101,32 109,48 112,58 C 115,48 125,16 127,16"
          fill="none" stroke="url(#mw-grad)" strokeWidth="3.5"
          strokeLinecap="round" strokeLinejoin="round" filter="url(#mw-glow)"
        />

        {/* Medical cross at fusion intersection */}
        <line
          id="mw-cross-h" x1="64" y1="37" x2="76" y2="37"
          stroke={theme.logo.accent} strokeWidth="2" strokeLinecap="round" opacity="0.85"
        />
        <line
          id="mw-cross-v" x1="70" y1="31" x2="70" y2="43"
          stroke={theme.logo.accent} strokeWidth="2" strokeLinecap="round" opacity="0.85"
        />

        {/* Heartbeat/ECG line */}
        <path
          id="mw-heartbeat"
          d="M 4,37 L 14,37 L 18,37 L 23,32 L 28,42 L 33,32 L 38,37
             L 48,37 L 54,33 L 60,41 L 66,33 L 72,41 L 78,33 L 84,37
             L 94,37 L 100,32 L 105,42 L 110,32 L 116,37 L 136,37"
          fill="none" stroke={theme.logo.accent} strokeWidth="1.2"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.55"
        />

        {/* Mozambique star */}
        <polygon
          id="mw-star"
          points="70,1.5 70.9,3.8 73.3,3.9 71.4,5.5 72.1,7.8 70,6.5 67.9,7.8 68.6,5.5 66.7,3.9 69.1,3.8"
          fill={theme.logo.accent} opacity="0.85" filter="url(#mw-glow-accent)"
        />
      </svg>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FULL VARIANT (200 × 100) — with text
  // ═══════════════════════════════════════════════════════════════════
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 100"
      width={size}
      height={height}
      className={className}
      aria-label="MedWallet"
      role="img"
    >
      {sharedDefs}

      {/* Wallet silhouette — rounded rectangle outer contour */}
      <rect
        id="mw-wallet"
        x="6" y="2" width="188" height="96" rx="14" ry="14"
        fill="none" stroke="url(#mw-grad)" strokeWidth="2" opacity="0.18"
      />

      {/*
        M letterform (left half) — draws the complete M including
        the shared right vertical that W also uses.

        Path: left vertical up → smooth V down to valley →
              smooth V up to shared central peak → shared vertical down
      */}
      <path
        id="mw-m"
        d="M 20,84 L 20,22 C 20,44 32,62 48,62 C 64,62 88,22 100,22 L 100,84"
        fill="none" stroke="url(#mw-grad)" strokeWidth="5"
        strokeLinecap="round" strokeLinejoin="round" filter="url(#mw-glow)"
      />

      {/*
        W letterform (right half) — starts from the shared base
        and draws the W's zigzag pattern.

        Path: shared base → smooth ^ up to middle peak →
              smooth ^ down to right valley → right vertical up
      */}
      <path
        id="mw-w"
        d="M 100,84 C 100,70 116,46 130,46 C 144,46 156,70 160,84 C 164,70 178,22 182,22"
        fill="none" stroke="url(#mw-grad)" strokeWidth="5"
        strokeLinecap="round" strokeLinejoin="round" filter="url(#mw-glow)"
      />

      {/*
        Medical cross — formed naturally by the shared vertical stroke (x=100)
        intersecting with a horizontal stroke at the center, creating a +.
        Not a separate rectangle; the cross emerges from structural intersections.
      */}
      <line
        id="mw-cross-h" x1="92" y1="53" x2="108" y2="53"
        stroke={theme.logo.accent} strokeWidth="2.5" strokeLinecap="round" opacity="0.9"
      />
      <line
        id="mw-cross-v" x1="100" y1="45" x2="100" y2="61"
        stroke={theme.logo.accent} strokeWidth="2.5" strokeLinecap="round" opacity="0.9"
      />

      {/*
        Heartbeat/ECG line — weaves through the entire mark left to right,
        passing through M peaks, the cross zone, and W peaks.
        Features three ECG QRS complexes at key structural points.
      */}
      <path
        id="mw-heartbeat"
        d="M 6,53 L 20,53 L 28,53 L 34,46 L 40,60 L 46,46 L 52,53
           L 66,53 L 74,46 L 82,60 L 88,46 L 94,53
           L 108,53 L 116,46 L 122,60 L 128,46 L 134,53
           L 148,53 L 156,46 L 162,60 L 168,46 L 174,53 L 194,53"
        fill="none" stroke={theme.logo.accent} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.6"
      />

      {/* Mozambique 5-pointed star at the fusion apex (top center) */}
      <polygon
        id="mw-star"
        points="100,2 101.5,5.9 105.7,6.2 102.5,8.8 103.5,12.9 100,10.6 96.5,12.9 97.5,8.8 94.3,6.2 98.5,5.9"
        fill={theme.logo.accent} opacity="0.9" filter="url(#mw-glow-accent)"
      />

      {/* Brand text */}
      {showText && (
        <text
          id="mw-text"
          x="100" y="98"
          textAnchor="middle"
          fontSize="11"
          fontWeight="800"
          letterSpacing="2.5"
          fill={theme.colors.text}
          opacity="0.75"
        >
          MEDWALLET
        </text>
      )}
    </svg>
  );
}

export default MedWalletLogo;
