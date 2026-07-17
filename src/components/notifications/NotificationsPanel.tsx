/**
 * NotificationsPanel — feed unificado num Popover a partir do sino do Header.
 * ---------------------------------------------------------------
 * Combina 4 fontes em tempo real (Supabase Realtime):
 *   - Consultas (status: confirmed / in_progress / completed)
 *   - Pedidos (status: out_for_delivery / delivered / ready)
 *   - Receitas (INSERT)
 *   - Consultation reminders (sent_at)
 *
 * O utilizador pode:
 *   - Ver a lista cronológica
 *   - Abrir o item (link para a página relevante)
 *   - Ver todas em /notifications
 *
 * Não persiste "lidas" (a tabela não existe ainda) — usa localStorage
 * para marcar como vistas e limpar o badge do Header.
 */
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, Stethoscope, Package, FileText, Clock, CheckCheck, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationType = "consultation" | "order" | "prescription" | "reminder";

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  created_at: string;
  read_key?: string;
}

const since = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

const ICON: Record<NotificationType, typeof Stethoscope> = {
  consultation: Stethoscope,
  order: Package,
  prescription: FileText,
  reminder: Clock,
};

const COLOR: Record<NotificationType, string> = {
  consultation: "bg-secondary/10 text-secondary",
  order: "bg-pharmacy/10 text-pharmacy",
  prescription: "bg-primary/10 text-primary",
  reminder: "bg-gold/10 text-gold-foreground",
};

export function NotificationsPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega notificações de 4 fontes em paralelo
  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [rx, orders, consults, reminders] = await Promise.all([
        // Receitas novas (últimos 7 dias)
        (supabase as any)
          .from("prescriptions")
          .select("id, created_at")
          .eq("patient_id", user.id)
          .gte("created_at", since())
          .order("created_at", { ascending: false })
          .limit(20),
        // Pedidos em trânsito ou prontos
        (supabase as any)
          .from("orders")
          .select("id, status, updated_at, items")
          .eq("customer_id", user.id)
          .in("status", ["out_for_delivery", "in_transit", "ready", "delivered"])
          .order("updated_at", { ascending: false })
          .limit(20),
        // Consultas (confirmadas / in_progress / completed)
        (supabase as any)
          .from("consultations")
          .select("id, status, updated_at")
          .eq("patient_id", user.id)
          .in("status", ["confirmed", "in_progress", "completed"])
          .order("updated_at", { ascending: false })
          .limit(20),
        // Reminders enviados
        (supabase as any)
          .from("consultation_reminders")
          .select("id, sent_at, scheduled_at, consultation_id")
          .eq("patient_id", user.id)
          .not("sent_at", "is", null)
          .order("sent_at", { ascending: false })
          .limit(10),
      ]);

      const all: NotificationItem[] = [];

      // Prescriptions
      (rx.data || []).forEach((r: any) => {
        all.push({
          id: `rx-${r.id}`,
          type: "prescription",
          title: "Nova receita médica",
          body: "O médico emitiu uma receita para ti. Toca para ver.",
          href: `/health/prescription/${r.id}`,
          created_at: r.created_at,
        });
      });

      // Orders
      (orders.data || []).forEach((o: any) => {
        const map: Record<string, string> = {
          out_for_delivery: "O teu pedido está a caminho 🚴",
          in_transit: "Pedido em trânsito 📦",
          ready: "Pedido pronto para levantamento ✅",
          delivered: "Pedido entregue 🎉",
        };
        all.push({
          id: `order-${o.id}`,
          type: "order",
          title: "Atualização de pedido",
          body: map[o.status] || `Estado: ${o.status}`,
          href: `/order/${o.id}`,
          created_at: o.updated_at,
        });
      });

      // Consultations
      (consults.data || []).forEach((c: any) => {
        const map: Record<string, string> = {
          confirmed: "Consulta confirmada ✅",
          in_progress: "Médico disponível agora 🩺",
          completed: "Consulta concluída 📋",
        };
        all.push({
          id: `consult-${c.id}`,
          type: "consultation",
          title: "Atualização de consulta",
          body: map[c.status] || `Estado: ${c.status}`,
          href: `/health/consultation/${c.id}`,
          created_at: c.updated_at,
        });
      });

      // Reminders
      (reminders.data || []).forEach((r: any) => {
        const when = new Date(r.scheduled_at).toLocaleString("pt-PT", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
        all.push({
          id: `rem-${r.id}`,
          type: "reminder",
          title: "Lembrete de consulta",
          body: `Tens consulta agendada para ${when}.`,
          href: `/health/consultation/${r.consultation_id}`,
          created_at: r.sent_at,
        });
      });

      // Ordena por created_at desc
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setItems(all.slice(0, 20));
    } catch (e) {
      console.warn("NotificationsPanel load falhou:", e);
    } finally {
      setLoading(false);
    }
  };

  // Carrega quando abre
  useEffect(() => {
    if (open && user) load();
  }, [open, user]);

  // Realtime: recarrega quando há mudanças
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-panel-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prescriptions", filter: `patient_id=eq.${user.id}` },
        () => open && load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `customer_id=eq.${user.id}` },
        () => open && load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "consultations", filter: `patient_id=eq.${user.id}` },
        () => open && load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, open]);

  // Marca como vistas (limpa badge via localStorage)
  const markAllSeen = () => {
    localStorage.setItem("notif-last-seen", new Date().toISOString());
  };

  // Conta "não vistas" = itens mais recentes que o último "visto"
  const unseenCount = useMemo(() => {
    const lastSeen = localStorage.getItem("notif-last-seen");
    if (!lastSeen) return items.length;
    const t = new Date(lastSeen).getTime();
    return items.filter((i) => new Date(i.created_at).getTime() > t).length;
  }, [items]);

  // Quando o popover fecha, marca tudo como visto
  useEffect(() => {
    if (!open && items.length > 0) {
      markAllSeen();
    }
  }, [open, items.length]);

  const handleClick = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notificações"
          className="relative hover:bg-primary/10 rounded-xl transition-all h-10 w-10 no-tap-target"
          data-size="icon"
        >
          <Bell className="h-4 w-4" />
          {unseenCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-accent text-accent-foreground text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-background shadow-md">
              {unseenCount > 9 ? "9+" : unseenCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(92vw,380px)] p-0 glass rounded-2xl border-border/50 shadow-premium"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="font-black text-sm">Notificações</h3>
            {unseenCount > 0 && (
              <span className="ml-1 text-[10px] font-bold bg-accent text-accent-foreground rounded-full px-1.5 py-0.5">
                {unseenCount} novas
              </span>
            )}
          </div>
          {items.length > 0 && (
            <button
              onClick={markAllSeen}
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 no-tap-target"
            >
              <CheckCheck className="h-3 w-3" /> Marcar vistas
            </button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              A carregar...
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <Bell className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-bold">Sem notificações</p>
              <p className="text-xs text-muted-foreground mt-1">
                As novidades de consultas, pedidos e receitas aparecem aqui.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/30">
              {items.map((item) => {
                const Icon = ICON[item.type];
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleClick(item.href)}
                      className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex gap-3 no-tap-target"
                    >
                      <div
                        className={cn(
                          "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                          COLOR[item.type]
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold leading-tight">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {item.body}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {relativeTime(item.created_at)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border/40 p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs font-bold rounded-xl no-tap-target"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
          >
            Ver todas as notificações
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
