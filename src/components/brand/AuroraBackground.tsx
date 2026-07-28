/**
 * AuroraBackground — cinematic, brand-aware ambient background.
 *
 * Layers (bottom → top):
 *   1. Deep gradient wash tied to the theme (primary/secondary/accent tokens)
 *   2. Slowly rotating aurora blobs (conic + radial gradients)
 *   3. Animated silk-noise via SVG turbulence for organic grain
 *   4. Drifting light beams (diagonal shafts)
 *   5. Twinkling star field (pure CSS, GPU cheap)
 *
 * All motion respects `prefers-reduced-motion` and Data Saver.
 * Uses only semantic tokens — never hardcoded colors.
 */
import { useMemo } from "react";
import { useDataSaver } from "@/contexts/DataSaverContext";
import { cn } from "@/lib/utils";

export interface AuroraBackgroundProps {
  /** Extra classes for the wrapper */
  className?: string;
  /** 'soft' for content pages, 'vivid' for hero moments */
  intensity?: "soft" | "vivid";
  /** Optional overlay children rendered above the effects */
  children?: React.ReactNode;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export function AuroraBackground({
  className,
  intensity = "soft",
  children,
}: AuroraBackgroundProps) {
  const { enabled: dataSaver } = useDataSaver();
  const reduced = prefersReducedMotion();
  const still = dataSaver || reduced;

  const stars = useMemo(
    () =>
      Array.from({ length: intensity === "vivid" ? 60 : 32 }, (_, i) => ({
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 2 + 0.6,
        delay: Math.random() * 6,
        dur: 3 + Math.random() * 5,
        key: i,
      })),
    [intensity]
  );

  const opacityBlob = intensity === "vivid" ? 0.55 : 0.35;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
      aria-hidden="true"
    >
      {/* 1. Base wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 0%, hsl(var(--background)) 0%, hsl(var(--background)) 55%, hsl(var(--primary) / 0.08) 100%)",
        }}
      />

      {/* 2. Aurora blobs */}
      <div
        className={cn(
          "absolute -top-1/3 -left-1/4 h-[80vh] w-[80vh] rounded-full blur-3xl",
          !still && "animate-[aurora-drift_28s_ease-in-out_infinite]"
        )}
        style={{
          background:
            "conic-gradient(from 90deg at 50% 50%, hsl(var(--primary) / 0.55), hsl(var(--accent) / 0.35), hsl(var(--secondary) / 0.45), hsl(var(--primary) / 0.55))",
          opacity: opacityBlob,
        }}
      />
      <div
        className={cn(
          "absolute -bottom-1/3 -right-1/4 h-[70vh] w-[70vh] rounded-full blur-3xl",
          !still && "animate-[aurora-drift-alt_34s_ease-in-out_infinite]"
        )}
        style={{
          background:
            "radial-gradient(circle at 30% 40%, hsl(var(--secondary) / 0.6), transparent 60%), radial-gradient(circle at 70% 60%, hsl(var(--accent) / 0.5), transparent 65%)",
          opacity: opacityBlob,
        }}
      />
      <div
        className={cn(
          "absolute top-1/3 left-1/3 h-[45vh] w-[45vh] rounded-full blur-3xl",
          !still && "animate-[aurora-pulse_18s_ease-in-out_infinite]"
        )}
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)",
          opacity: opacityBlob * 0.9,
        }}
      />

      {/* 3. Silk noise — organic grain */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.07] mix-blend-overlay"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="silk-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#silk-noise)" />
      </svg>

      {/* 4. Diagonal light beams */}
      {!still && (
        <>
          <div className="absolute -inset-x-1/2 top-0 h-[140%] rotate-12 opacity-40 animate-[beam-drift_22s_linear_infinite]"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, transparent 45%, hsl(var(--primary) / 0.18) 50%, transparent 55%, transparent 100%)",
            }}
          />
          <div className="absolute -inset-x-1/2 top-0 h-[140%] -rotate-6 opacity-30 animate-[beam-drift-slow_38s_linear_infinite]"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, transparent 40%, hsl(var(--secondary) / 0.14) 50%, transparent 60%, transparent 100%)",
            }}
          />
        </>
      )}

      {/* 5. Star field */}
      <div className="absolute inset-0">
        {stars.map((s) => (
          <span
            key={s.key}
            className={cn(
              "absolute rounded-full bg-foreground/70",
              !still && "animate-[star-twinkle_var(--dur)_ease-in-out_infinite]"
            )}
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: 0.35,
              // @ts-expect-error CSS var
              "--dur": `${s.dur}s`,
              animationDelay: `${s.delay}s`,
              boxShadow: "0 0 6px hsl(var(--primary) / 0.35)",
            }}
          />
        ))}
      </div>

      {/* Foreground children */}
      {children ? <div className="relative z-10">{children}</div> : null}
    </div>
  );
}

export default AuroraBackground;