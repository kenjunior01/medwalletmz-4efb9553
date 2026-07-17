import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * MedWallet Design System — reusable primitives
 * Wraps the CSS utilities defined in `src/index.css` (panel-shell, glass-card,
 * neu-card, bento-card, float-orb) so every page uses the same identity.
 */

type DivProps = React.HTMLAttributes<HTMLDivElement>;

/** Premium admin/dashboard shell with gradient border + soft glow. */
export const PanelShell = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...p }, ref) => (
    <div ref={ref} className={cn("panel-shell", className)} {...p} />
  ),
);
PanelShell.displayName = "PanelShell";

/** Frosted glass card with layered border. */
export const GlassCard = React.forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...p }, ref) => (
    <div ref={ref} className={cn("glass-card p-4", className)} {...p} />
  ),
);
GlassCard.displayName = "GlassCard";

/** Soft, tactile neumorphic surface. */
export const NeuCard = React.forwardRef<
  HTMLDivElement,
  DivProps & { inset?: boolean }
>(({ className, inset, ...p }, ref) => (
  <div
    ref={ref}
    className={cn(inset ? "neu-inset" : "neu-card", "p-4", className)}
    {...p}
  />
));
NeuCard.displayName = "NeuCard";

/** Bento grid cell with animated gradient border on hover. */
export const BentoCard = React.forwardRef<
  HTMLDivElement,
  DivProps & { size?: "sm" | "md" | "lg" | "xl" }
>(({ className, size = "md", ...p }, ref) => {
  const sizes: Record<string, string> = {
    sm: "col-span-1 row-span-1 p-4",
    md: "col-span-2 row-span-1 p-5",
    lg: "col-span-2 row-span-2 p-6",
    xl: "col-span-3 row-span-2 p-6",
  };
  return (
    <div ref={ref} className={cn("bento-card", sizes[size], className)} {...p} />
  );
});
BentoCard.displayName = "BentoCard";

/** Bento grid container — 4 cols on desktop, 2 on mobile. */
export const BentoGrid = ({ className, ...p }: DivProps) => (
  <div
    className={cn(
      "grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[minmax(120px,auto)]",
      className,
    )}
    {...p}
  />
);

/** Floating background orbs — decorative depth for hero sections. */
export function LayeredOrbs({
  className,
  variant = "ocean",
}: {
  className?: string;
  variant?: "ocean" | "gold" | "warm";
}) {
  const palette: Record<string, string[]> = {
    ocean: ["hsl(var(--secondary)/0.55)", "hsl(var(--accent)/0.4)", "hsl(var(--primary)/0.35)"],
    gold: ["hsl(var(--gold)/0.5)", "hsl(var(--accent)/0.35)", "hsl(var(--secondary)/0.4)"],
    warm: ["hsl(var(--terracotta)/0.5)", "hsl(var(--gold)/0.4)", "hsl(var(--primary)/0.3)"],
  };
  const [a, b, c] = palette[variant];
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <span className="float-orb" style={{ width: 260, height: 260, top: -80, left: -60, background: a }} />
      <span className="float-orb" style={{ width: 220, height: 220, bottom: -80, right: -40, background: b, animationDelay: "1.5s" }} />
      <span className="float-orb" style={{ width: 180, height: 180, top: "40%", right: "20%", background: c, animationDelay: "3s" }} />
    </div>
  );
}

/** Semantic status badge with themed colors. */
export function StatusBadge({
  status,
  className,
  children,
}: {
  status: "pending" | "confirmed" | "refunded" | "success" | "warning" | "danger" | "info";
  className?: string;
  children?: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    pending: "bg-gold/15 text-gold border-gold/30",
    confirmed: "bg-emerald/15 text-emerald border-emerald/30",
    success: "bg-emerald/15 text-emerald border-emerald/30",
    refunded: "bg-destructive/15 text-destructive border-destructive/30",
    danger: "bg-destructive/15 text-destructive border-destructive/30",
    warning: "bg-gold/15 text-gold border-gold/30",
    info: "bg-secondary/15 text-secondary border-secondary/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize",
        styles[status],
        className,
      )}
    >
      {children ?? status}
    </span>
  );
}

/** Skip link — first focusable element for keyboard users. */
export function SkipLink({ href = "#main" }: { href?: string }) {
  return (
    <a href={href} className="skip-link">
      Saltar para o conteúdo principal
    </a>
  );
}