import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Meddy, type MeddyRole, type MeddyState } from './Meddy';
import { pickMeddyMessage, type Context } from './MeddyMessages';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Send, Sparkles, Minimize2, ChevronRight } from "@/components/icons/lucide-compat";
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface Props {
  context?: Context;
  position?: 'bottom-right' | 'bottom-left';
}

/**
 * MeddyFloating — lightweight mascote.
 * - No auto-nudge popup (removed for performance and UX)
 * - Queries only fire when panel is opened
 * - Smaller, less intrusive on mobile
 */
export function MeddyFloating({ context = 'default', position = 'bottom-left' }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, roles } = useAuth();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [lastText, setLastText] = useState<string | undefined>();

  // Detect role
  const role: MeddyRole = (() => {
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('doctor')) return 'doctor';
    if (roles.includes('store_owner')) return 'pharmacist';
    if (roles.includes('driver')) return 'driver';
    if (roles.includes('clinic')) return 'clinic';
    return 'patient';
  })();

  // Re-pick message on open
  useEffect(() => {
    if (open) setLastText(undefined);
  }, [open, context]);

  // Profile query — only when open (not on every page load)
  const { data: profile } = useQuery<any>({
    queryKey: ['meddy-profile', user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, default_city, phone')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    staleTime: 120_000,
  });

  // Metric query — only when open
  const { data: metric = 0 } = useQuery<number>({
    queryKey: ['meddy-metric', role, user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      if (role === 'patient') {
        const { count } = await (supabase as any)
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .in('status', ['pending', 'confirmed', 'preparing', 'out_for_delivery']);
        return count ?? 0;
      }
      return 0;
    },
    staleTime: 60_000,
  });

  const firstName = useMemo(() => {
    const source = profile?.full_name || user?.email?.split('@')[0] || 'amigo';
    return String(source).trim().split(/\s+/)[0];
  }, [profile?.full_name, user?.email]);

  const state: MeddyState = open ? 'waving' : 'idle';
  const message = pickMeddyMessage(role, context, lastText);

  const personalizedText = useMemo(() => {
    if (!message?.text) return "";
    return message.text
      .replace(/XXXX/g, String(metric))
      .replace(/{{name}}/g, firstName)
      .replace(/{{city}}/g, profile?.default_city || 'Moçambique');
  }, [message, metric, firstName, profile]);

  if (!user || dismissed) return null;

  const cycleMessage = () => {
    if (message) setLastText(message.text);
  };

  const posClass = position === 'bottom-right'
    ? 'left-4 fab-safe-bottom md:left-auto md:right-4 md:bottom-4'
    : 'left-4 fab-safe-bottom md:bottom-4';

  return (
    <>
      {/* Floating button — small, clean */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "fixed z-40 active:scale-95 transition-transform no-tap-target",
            posClass,
          )}
          aria-label="Abrir Meddy"
        >
          <Meddy role={role} state="happy" size={52} />
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div
          className={cn(
            "fixed z-50 w-[300px] max-w-[calc(100vw-2rem)]",
            posClass,
          )}
        >
          <Card className="overflow-hidden shadow-xl">
            <div className="bg-primary p-3 flex items-center gap-2 text-primary-foreground">
              <Meddy role={role} state="happy" size={40} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">Meddy <Sparkles className="h-3 w-3 inline" /></p>
                <p className="text-[10px] opacity-80">Assistente MedWallet</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)}
                className="text-primary-foreground hover:bg-white/20 h-7 w-7 no-tap-target" data-size="icon">
                <Minimize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            {message && (
              <div className="p-3">
                <p className="text-sm leading-relaxed">{personalizedText}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={cycleMessage}>
                    Outra mensagem
                  </Button>
                  {message.actionLabel && message.actionHref && (
                    <Button size="sm" className="h-7 text-xs ml-auto"
                      onClick={() => { setOpen(false); navigate(message.actionHref!); }}>
                      {message.actionLabel}
                      <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  )}
                </div>
              </div>
            )}
            <div className="px-3 py-2 flex items-center justify-between border-t">
              <button onClick={() => setDismissed(true)} className="text-[10px] text-muted-foreground">
                Esconder
              </button>
              <button onClick={cycleMessage} className="text-[10px] text-primary font-semibold">
                <Send className="h-3 w-3 inline" /> Dica
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Backdrop */}
      {open && (
        <button
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40"
          aria-label="Fechar Meddy"
        />
      )}
    </>
  );
}

function roleLabel(r: MeddyRole): string {
  return { patient: 'Paciente', doctor: 'Médico', pharmacist: 'Farmacêutico', driver: 'Entregador', clinic: 'Clínica', admin: 'Admin' }[r];
}
