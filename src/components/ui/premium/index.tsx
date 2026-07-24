/**
 * Premium UI Components — inspired by 21st.dev, React Bits, Aceternity UI
 *
 * Contains reusable animation/micro-interaction components:
 * - SplitText: Staggered text reveal animation
 * - GradientText: Animated gradient text
 * - Spotlight: Cursor-following spotlight effect
 * - NumberTicker: Animated number counter
 * - ShimmerButton: Button with shimmer sweep effect
 * - MagneticWrapper: Magnetic hover attraction effect
 * - FloatingParticles: Ambient floating particles
 * - ShimmerCard: Card with shimmer loading overlay
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

// =============================================================================
// SplitText — Staggered character reveal (21st.dev style)
// =============================================================================
interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
}

export function SplitText({ text, className = '', delay = 0, stagger = 0.03, as: Tag = 'h1' }: SplitTextProps) {
  const chars = text.split('');
  return (
    <Tag className={className} aria-label={text}>
      {chars.map((char, i) => (
        <motion.span
          key={`${char}-${i}`}
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{
            duration: 0.4,
            delay: delay + i * stagger,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="inline-block"
          aria-hidden="true"
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </Tag>
  );
}

// =============================================================================
// GradientText — Animated gradient text (21st.dev style)
// =============================================================================
interface GradientTextProps {
  children: string;
  className?: string;
  from?: string;
  via?: string;
  to?: string;
  animate?: boolean;
}

export function GradientText({
  children,
  className = '',
  from = 'hsl(var(--primary))',
  via = 'hsl(var(--secondary))',
  to = 'hsl(var(--accent))',
  animate = true,
}: GradientTextProps) {
  return (
    <motion.span
      className={`inline-block bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${from}, ${via}, ${to}, ${from})`,
        backgroundSize: animate ? '300% 300%' : '100% 100%',
      }}
      animate={animate ? {
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      } : undefined}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {children}
    </motion.span>
  );
}

// =============================================================================
// Spotlight — Cursor-following spotlight overlay (Aceternity/21st.dev)
// =============================================================================
interface SpotlightProps {
  children: ReactNode;
  className?: string;
  size?: number;
  color?: string;
}

export function Spotlight({ children, className = '', size = 300, color = 'hsl(var(--primary) / 0.08)' }: SpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isVisible, setIsVisible] = useState(false);

  const springX = useSpring(mouseX, { stiffness: 150, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 20 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    };
    const handleEnter = () => setIsVisible(true);
    const handleLeave = () => setIsVisible(false);

    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseenter', handleEnter);
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseenter', handleEnter);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, [mouseX, mouseY]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      <motion.div
        className="pointer-events-none absolute rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          left: useTransform(springX, (x) => x - size / 2),
          top: useTransform(springY, (y) => y - size / 2),
          opacity: isVisible ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
      />
      {children}
    </div>
  );
}

// =============================================================================
// NumberTicker — Animated counter (21st.dev style)
// =============================================================================
interface NumberTickerProps {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
}

export function NumberTicker({ value, className = '', prefix = '', suffix = '', duration = 1.5, decimals = 0 }: NumberTickerProps) {
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const start = performance.now();
    const startVal = 0;

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (value - startVal) * eased;
      setDisplay(current.toFixed(decimals));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, duration, decimals]);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}{display}{suffix}
    </span>
  );
}

// =============================================================================
// ShimmerButton — Button with shimmer sweep (Aceternity style)
// =============================================================================
interface ShimmerButtonProps {
  children: ReactNode;
  className?: string;
  shimmerColor?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function ShimmerButton({ children, className = '', shimmerColor = 'rgba(255,255,255,0.15)', onClick, disabled }: ShimmerButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden rounded-2xl font-bold text-white bg-gradient-to-r from-primary via-secondary to-accent p-4 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(105deg, transparent 40%, ${shimmerColor} 50%, transparent 60%)`,
          backgroundSize: '200% 100%',
        }}
        animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
    </motion.button>
  );
}

// =============================================================================
// MagneticWrapper — Magnetic hover attraction (21st.dev style)
// =============================================================================
interface MagneticWrapperProps {
  children: ReactNode;
  className?: string;
  strength?: number;
}

export function MagneticWrapper({ children, className = '', strength = 0.3 }: MagneticWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { stiffness: 200, damping: 15 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      x.set((e.clientX - centerX) * strength);
      y.set((e.clientY - centerY) * strength);
    };
    const handleLeave = () => {
      x.set(0);
      y.set(0);
    };

    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, [x, y, strength]);

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// =============================================================================
// FloatingParticles — Ambient floating particles (React Bits style)
// =============================================================================
interface FloatingParticlesProps {
  count?: number;
  className?: string;
  color?: string;
}

export function FloatingParticles({ count = 20, className = '', color = 'hsl(var(--primary) / 0.3)' }: FloatingParticlesProps) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 10 + 15,
    delay: Math.random() * 5,
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: color,
            filter: 'blur(1px)',
          }}
          animate={{
            y: [0, -30, 0, 20, 0],
            x: [0, 15, -10, 5, 0],
            opacity: [0.2, 0.6, 0.3, 0.7, 0.2],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// ShimmerCard — Card with shimmer overlay (loading/placeholder)
// =============================================================================
interface ShimmerCardProps {
  className?: string;
  lines?: number;
}

export function ShimmerCard({ className = '', lines = 3 }: ShimmerCardProps) {
  return (
    <div className={`rounded-[2rem] border bg-card p-5 space-y-3 ${className}`}>
      <div className="h-4 w-3/4 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full w-full"
          style={{
            background: 'linear-gradient(90deg, transparent 25%, hsl(var(--primary)/0.1) 50%, transparent 75%)',
            backgroundSize: '200% 100%',
          }}
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <div key={i} className="h-3 rounded-full bg-muted overflow-hidden" style={{ width: `${100 - (i + 1) * 15}%` }}>
          <motion.div
            className="h-full w-full"
            style={{
              background: 'linear-gradient(90deg, transparent 25%, hsl(var(--primary)/0.1) 50%, transparent 75%)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: i * 0.2 }}
          />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// TextMorph — Animated word morph (21st.dev style)
// =============================================================================
interface TextMorphProps {
  words: string[];
  className?: string;
  interval?: number;
}

export function TextMorph({ words, className = '', interval = 3000 }: TextMorphProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, interval);
    return () => clearInterval(timer);
  }, [words.length, interval]);

  return (
    <span className={`relative inline-flex overflow-hidden ${className}`}>
      {words.map((word, i) => (
        <motion.span
          key={word}
          className="absolute"
          initial={{ y: 30, opacity: 0, filter: 'blur(4px)' }}
          animate={{
            y: i === index ? 0 : -30,
            opacity: i === index ? 1 : 0,
            filter: i === index ? 'blur(0px)' : 'blur(4px)',
          }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {word}
        </motion.span>
      ))}
      {/* Invisible spacer to maintain layout */}
      <span className="invisible">{words[0]}</span>
    </span>
  );
}

// =============================================================================
// PulseRing — Expanding pulse ring effect (for CTA emphasis)
// =============================================================================
interface PulseRingProps {
  className?: string;
  color?: string;
}

export function PulseRing({ className = '', color = 'hsl(var(--primary))' }: PulseRingProps) {
  return (
    <span className={`absolute inset-0 rounded-full ${className}`}>
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ border: `2px solid ${color}` }}
        animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
      />
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ border: `1px solid ${color}` }}
        animate={{ scale: [1, 2.2], opacity: [0.3, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
      />
    </span>
  );
}
