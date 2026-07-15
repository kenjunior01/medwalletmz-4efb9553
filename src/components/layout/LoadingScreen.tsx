import { Loader2, HeartPulse } from 'lucide-react';

/**
 * LoadingScreen — ecrã de carregamento branded para Suspense fallback.
 *
 * Design:
 *  - Fundo emerald gradient (alinhado com MedWallet MZ)
 *  - Ícone de batimento cardíaco animado
 *  - Spinner + mensagem "A carregar..."
 *  - Mobile-first (centrado, compacto)
 *
 * Ocupa ecrã inteiro para evitar layout shift durante o code-splitting.
 */
export function LoadingScreen({ message = 'A carregar...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="flex flex-col items-center gap-4">
        {/* Logo animado */}
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
          <div className="relative h-16 w-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <HeartPulse className="h-8 w-8 text-white animate-pulse" />
          </div>
        </div>

        {/* Nome + Spinner */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-lg font-black text-emerald-700 tracking-tight">
            MedWallet <span className="text-emerald-500">MZ</span>
          </h1>
          <div className="flex items-center gap-2 text-sm text-emerald-600">
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
 * (substitui o "A carregar..." textual sem design).
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
 * LoadingCard — skeleton card para listas (prescriptions, doctors, etc.)
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
