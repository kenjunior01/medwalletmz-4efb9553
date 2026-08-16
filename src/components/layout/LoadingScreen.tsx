import { Loader2, HeartPulse, Pill, Stethoscope, Syringe, Activity } from "@/components/icons/lucide-compat";

/** Floating medical particle icons for the loading screen */
const MEDICAL_PARTICLES = [
  { icon: Pill, delay: '0s', left: '10%', size: 14, duration: '8s' },
  { icon: Stethoscope, delay: '2s', left: '25%', size: 12, duration: '10s' },
  { icon: HeartPulse, delay: '4s', left: '50%', size: 16, duration: '7s' },
  { icon: Syringe, delay: '1s', left: '70%', size: 11, duration: '9s' },
  { icon: Activity, delay: '3s', left: '85%', size: 13, duration: '11s' },
  { icon: Pill, delay: '5s', left: '40%', size: 10, duration: '12s' },
  { icon: HeartPulse, delay: '6s', left: '60%', size: 14, duration: '8.5s' },
] as const;

/**
 * LoadingScreen — ecrã de carregamento branded para Suspense fallback.
 *
 * ⚡ PERFORMANCE: Esta versão usa CSS puro (sem GSAP) para o logo,
 * evitando ~30KB gzip na critical path. O logo animado com GSAP
 * (MedWalletLogo) é lazy-loaded apenas onde necessário.
 */
export function LoadingScreen({ message = 'A carregar...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden">
      {/* Province-themed gradient overlay */}
      <div className="absolute inset-0 mw-province-gradient pointer-events-none" />

      {/* Gradient orb accents — static, no animation */}
      <div className="absolute top-[20%] left-[15%] w-32 h-32 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: 'var(--region-logo-primary, #0D9488)' }} />
      <div className="absolute bottom-[25%] right-[10%] w-24 h-24 rounded-full opacity-8 blur-2xl pointer-events-none" style={{ background: 'var(--region-logo-accent, #F59E0B)' }} />

      {/* Floating medical particles — CSS animations only */}
      <div className="hidden sm:block">
        {MEDICAL_PARTICLES.map((p, i) => {
          const Icon = p.icon;
          return (
            <span
              key={i}
              className="mw-particle text-muted-foreground/20"
              style={{
                left: p.left,
                bottom: '-5%',
                animationDelay: p.delay,
                animationDuration: p.duration,
                fontSize: p.size,
              }}
            >
              <Icon style={{ width: p.size, height: p.size }} />
            </span>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-5 relative z-10">
        {/* Lightweight CSS-only logo for loading screen */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center animate-pulse">
            <HeartPulse className="h-10 w-10 text-white" />
          </div>
          {/* Soft glow behind logo — CSS only */}
          <div className="absolute inset-0 rounded-2xl blur-2xl opacity-30 pointer-events-none bg-emerald-500" />
        </div>

        {/* ECG Heartbeat line — pure CSS animation */}
        <div className="w-48 h-8 flex items-center overflow-hidden">
          <svg viewBox="0 0 200 40" className="w-full h-full" preserveAspectRatio="none">
            <path
              className="mw-ecg-line"
              d="M 0 20 L 40 20 L 50 20 L 55 8 L 60 32 L 65 5 L 70 35 L 75 20 L 85 20 L 90 15 L 95 20 L 140 20 L 145 12 L 150 28 L 155 20 L 200 20"
              fill="none"
              stroke="var(--region-logo-primary, #0D9488)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Nome + Spinner */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-lg font-black text-emerald-700 tracking-tight dark:text-white">
            MedWallet <span className="text-emerald-500">MZ</span>
          </h1>
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{message}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * LoadingInline — versão compacta para usar dentro de páginas
 */
export function LoadingInline({ message = 'A carregar...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
      <span>{message}</span>
    </div>
  );
}

/**
 * LoadingCard — skeleton card para listas
 */
export function LoadingCard() {
  return (
    <div className="rounded-2xl border border-emerald-500/10 bg-white p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-2/3 rounded bg-muted" />
          <div className="h-2 w-1/3 rounded bg-muted/70" />
        </div>
      </div>
    </div>
  );
}

/**
 * LoadingList — vários LoadingCards empilhados
 */
export function LoadingList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}