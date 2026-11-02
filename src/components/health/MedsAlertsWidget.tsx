/**
 * MedsAlertsWidget — F48: alertas de medicação no Home.
 * Padrão Uber: o estado activo do utilizador sempre visível no primeiro ecrã.
 *
 * - Corre o motor lazy run_watch_checks() ao abrir o Home (alertas de preço
 *   com anti-spam 12h + lembretes de reserva a expirar <3h — escritos no
 *   servidor em automated_notifications; o catchup entrega-os como push).
 * - Mostra um cartão compacto quando há reservas activas (código + contagem
 *   decrescente) e/ou vigias de preço com alvo atingido.
 * - Renderiza null quando não há nada — zero ruído no Home.
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BellRing, Clock, ShoppingBag, ChevronRight } from '@/components/icons/lucide-compat';

interface ReservationLite {
  id: string;
  product_name: string;
  pickup_code: string;
  status: string;
  expires_at: string;
}

interface WatchLite {
  id: string;
  query: string;
  triggered: boolean;
  current_lowest: number | null;
  target_price: number | null;
}

export default function MedsAlertsWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<ReservationLite[]>([]);
  const [triggered, setTriggered] = useState<WatchLite[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      // Motor de alertas lazy (F48) — best-effort: se a migração ainda não
      // foi aplicada, o widget continua a funcionar só com o estado local.
      try { await (supabase as any).rpc('run_watch_checks'); } catch { /* noop */ }
      const [res, wat] = await Promise.all([
        (supabase as any).rpc('my_med_reservations'),
        (supabase as any).rpc('my_price_watches'),
      ]);
      const items = ((res?.data as any)?.items ?? []) as ReservationLite[];
      setReservations(items.filter((r) => r.status === 'reserved' || r.status === 'ready'));
      const w = ((wat?.data as any)?.items ?? []) as WatchLite[];
      setTriggered(w.filter((x) => x.triggered));
    } catch {
      /* silencioso — o widget é opcional */
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  /* Contagem decrescente viva — re-render a cada 30s */
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!user || (reservations.length === 0 && triggered.length === 0)) return null;

  const next = reservations.length
    ? reservations.reduce((a, b) =>
        new Date(a.expires_at).getTime() < new Date(b.expires_at).getTime() ? a : b)
    : null;
  const hoursLeft = next
    ? Math.max(0, (new Date(next.expires_at).getTime() - Date.now()) / 36e5)
    : 0;
  const leftLabel = next
    ? hoursLeft >= 1
      ? `${Math.floor(hoursLeft)}h`
      : `${Math.max(1, Math.round(hoursLeft * 60))} min`
    : '';

  return (
    <section className="px-4">
      <button
        onClick={() => navigate('/health/meds-availability')}
        className="w-full rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 flex items-center gap-3 hover:border-emerald-500/40 transition-colors text-left"
      >
        <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
          <ShoppingBag className="h-5 w-5 text-emerald-500" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">
            {reservations.length > 0
              ? `${reservations.length} reserva${reservations.length > 1 ? 's' : ''} de medicamento${reservations.length > 1 ? 's' : ''} activa${reservations.length > 1 ? 's' : ''}`
              : `Alvo de preço atingido: ${triggered[0]?.query ?? ''}`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
            {next ? (
              <>
                <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">código {next.pickup_code} · {leftLabel} restantes</span>
              </>
            ) : (
              <>
                <BellRing className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">ver «Onde há stock?»</span>
              </>
            )}
          </p>
        </div>
        {triggered.length > 0 && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <BellRing className="h-3 w-3" aria-hidden="true" /> {triggered.length}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
      </button>
    </section>
  );
}
