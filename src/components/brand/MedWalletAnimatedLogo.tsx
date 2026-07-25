/**
 * MedWallet Animated SVG Logo
 * 
 * Creative combination of:
 * - M + W letterforms forming a wallet shape
 * - Health cross in the center
 * - Star element from Mozambique flag (configurable per region)
 * - Smooth gradient transitions matching the region theme
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRegionTheme } from '@/themes/RegionThemeProvider';
import { cn } from '@/lib/utils';

interface MedWalletLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  showText?: boolean;
  className?: string;
}

const SIZES = {
  sm: { icon: 28, fontSize: 12 },
  md: { icon: 40, fontSize: 16 },
  lg: { icon: 56, fontSize: 20 },
  xl: { icon: 80, fontSize: 28 },
};

export function MedWalletAnimatedLogo({
  size = 'md',
  animated = true,
  showText = false,
  className,
}: MedWalletLogoProps) {
  const theme = useRegionTheme();
  const { icon, fontSize } = SIZES[size];
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn('flex items-center gap-2', className)} style={{ height: icon }}>
        <div className={cn('rounded-xl bg-gray-200 animate-pulse')} style={{ width: icon, height: icon }} />
      </div>
    );
  }

  const primary = `var(--region-primary, ${theme.colors.primary})`;
  const secondary = `var(--region-secondary, ${theme.colors.secondary})`;
  const accent = `var(--region-accent, ${theme.colors.accent})`;

  return (
    <motion.div
      className={cn('flex items-center gap-2', className)}
      initial={animated ? { opacity: 0, scale: 0.8 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* SVG Logo */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="mw-gradient-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primary} />
            <stop offset="50%" stopColor={secondary} />
            <stop offset="100%" stopColor={accent} />
          </linearGradient>
          <linearGradient id="mw-gradient-m" x1="0%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor={primary} />
            <stop offset="100%" stopColor={secondary} />
          </linearGradient>
          <linearGradient id="mw-gradient-w" x1="50%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={secondary} />
            <stop offset="100%" stopColor={accent} />
          </linearGradient>
          <filter id="mw-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <clipPath id="mw-clip">
            <rect x="10" y="10" width="100" height="100" rx="20" />
          </clipPath>
        </defs>

        {/* Background rounded square (wallet shape) */}
        <motion.rect
          x="10"
          y="10"
          width="100"
          height="100"
          rx="20"
          fill="url(#mw-gradient-bg)"
          filter="url(#mw-glow)"
          initial={animated ? { rx: 60 } : false}
          animate={{ rx: 20 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        />

        {/* Wallet flap line */}
        <motion.line
          x1="10" y1="60" x2="110" y2="60"
          stroke="rgba(255,255,255,0.15)" strokeWidth="1"
          initial={animated ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        />

        {/* M Letter */}
        <motion.g
          initial={animated ? { opacity: 0, d: '' } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          {/* Left stroke of M */}
          <motion.path
            d="M28 78 L28 32 L40 55 L52 32 L52 78"
            fill="none"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={animated ? { pathLength: 0 } : false}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
          />
        </motion.g>

        {/* Health Cross (center) */}
        <motion.g
          initial={animated ? { scale: 0, rotate: -90 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.6, duration: 0.4, type: 'spring', stiffness: 200 }}
        >
          <rect x="56" y="42" width="8" height="28" rx="2" fill="rgba(255,255,255,0.9)" />
          <rect x="46" y="52" width="28" height="8" rx="2" fill="rgba(255,255,255,0.9)" />
        </motion.g>

        {/* W Letter */}
        <motion.g
          initial={animated ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <motion.path
            d="M66 78 L76 32 L86 60 L96 32 L96 78"
            fill="none"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={animated ? { pathLength: 0 } : false}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.6, duration: 0.6, ease: 'easeOut' }}
          />
        </motion.g>

        {/* Star accent (top-right) */}
        <motion.g
          initial={animated ? { scale: 0, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 0.8 }}
          transition={{ delay: 0.9, duration: 0.3, type: 'spring' }}
        >
          <polygon
            points="95,18 97,24 104,24 99,28 101,35 95,31 89,35 91,28 86,24 93,24"
            fill="white"
            opacity="0.7"
          />
        </motion.g>

        {/* Pulse ring animation */}
        {animated && (
          <motion.circle
            cx="60"
            cy="60"
            r="55"
            fill="none"
            stroke={primary}
            strokeWidth="1"
            opacity="0.3"
            initial={{ scale: 0.8, opacity: 0.6 }}
            animate={{ scale: 1.1, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </svg>

      {/* Text */}
      {showText && (
        <motion.span
          className="font-bold tracking-tight"
          style={{ fontSize, color: primary }}
          initial={animated ? { opacity: 0, x: -5 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8, duration: 0.3 }}
        >
          MedWallet
        </motion.span>
      )}
    </motion.div>
  );
}

export default MedWalletAnimatedLogo;
