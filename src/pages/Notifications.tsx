/**
 * Notifications Page — feed completo de notificações do utilizador.
 * Rota: /notifications
 *
 * Mostra os últimos 30 dias de:
 *   - Receitas médicas emitidas
 *   - Atualizações de pedidos (transito / entregue / pronto)
 *   - Atualizações de consultas (confirmada / in_progress / concluída)
 *   - Lembretes de consulta enviados
 *
 * + Banner para ativar permissões de notificação do browser/Capacitor.
 */
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Bell,
  Stethoscope,
  Package,
  FileText,
  Clock,
  BellOff,
  BellRing,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationType = "consultation" | "order" | "prescription" | "reminder";

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  created_at: string;
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

const FILTERS: { key: NotificationType | "all"; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "consultation", label: "Consultas" },
  { key: "order", label: "Pedidos" },
  { key: "prescription", label: "Receitas" },
  { key: "reminder", label: "Lembretes" },
];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

const since = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { permission, request } = useNotifications();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationType | "all">("all");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const sinceIso = since();
      const [rx, orders, consults, reminders] = await Promise.all([
        (supabase as any)
          .from("prescriptions")
          .select("id, created_at")
          .eq("patient_id", user.id)
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: false })
          .limit(50),
        (supabase as any)
          .from("orders")
          .select("id, status, updated_at")
          .eq("customer_id", user.id)
          .in("status", ["out_for_delivery", "in_transit", "ready", "delivered"])
          .order("updated_at", { ascending: false })
          .limit(50),
        (supabase as any)
          .from("consultations")
          .select("id, status, updated_at")
          .eq("patient_id", user.id)
          .in("status", ["confirmed", "in_progress", "completed"])
          .order("updated_at", { ascending: false })
          .limit(50),
        (supabase as any)
          .from("consultation_reminders")
          .select("id, sent_at, scheduled_at, consultation_id")
          .eq("patient_id", user.id)
          .not("sent_at", "is", null)
          .order("sent_at", { ascending: false })
          .limit(30),
      ]);

      const all: NotificationItem[] = [];

      (rx.data || []).forEach((r: any) => {
        all.push({
          id: `rx-${r.id}`,
          type: "prescription",
          title: "Nova receita médica",
          body: "O médico emitiu uma receita para ti. Toca para ver os detalhes.",
          href: `/health/prescription/${r.id}`,
          created_at: r.created_at,
        });
      });

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

      all.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setItems(all);
    } catch (e) {
      console.warn("NotificationsPage load falhou:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  // Realtime: recarrega quando há mudanças
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-page-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prescriptions", filter: `patient_id=eq.${user.id}` },
        load
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `customer_id=eq.${user.id}` },
        load
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "consultations", filter: `patient_id=eq.${user.id}` },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.type === filter);
  }, [items, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    items.forEach((i) => {
      c[i.type] = (c[i.type] || 0) + 1;
    });
    return c;
  }, [items]);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/50 safe-area-top">
        <div className="flex items-center gap-2 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Voltar"
            className="h-10 w-10 rounded-xl hover:bg-primary/10 no-tap-target"
            data-size="icon"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="font-black text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notificações
            </h1>
            <p className="text-[10px] text-muted-foreground">
              {items.length} notificações nos últimos 30 dias
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Ativar notificações — banner */}
        {permission !== "granted" && (
          <Card className="p-4 flex items-center gap-3 bg-primary/5 border-primary/20">
            <div className="h-11 w-11 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
              {permission === "denied" ? (
                <BellOff className="h-5 w-5 text-primary" />
              ) : (
                <BellRing className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">
                {permission === "denied"
                  ? "Notificações bloqueadas"
                  : "Ativa as notificações"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {permission === "denied"
                  ? "Vai às definições do navegador/Capacitor para permitir notificações da MedWallet."
                  : "Recebe alertas em tempo real de consultas, receitas e entregas."}
              </p>
            </div>
            {permission !== "denied" && (
              <Button size="sm" onClick={request} className="no-tap-target">
                Ativar
              </Button>
            )}
          </Card>
        )}

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all no-tap-target",
                filter === f.key
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              )}
            >
              {f.label}
              {counts[f.key] ? (
                <span className="ml-1.5 opacity-70">({counts[f.key]})</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
            <p className="text-sm">A carregar notificações...</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="py-16 px-6 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-base font-bold">Sem notificações</p>
            <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
              {filter === "all"
                ? "As novidades de consultas, pedidos e receitas vão aparecer aqui automaticamente."
                : "Não tens notificações desta categoria nos últimos 30 dias."}
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((item) => {
              const Icon = ICON[item.type];
              return (
                <li key={item.id}>
                  <Card
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(item.href)}
                    onKeyDown={(e) => e.key === "Enter" && navigate(item.href)}
                    className="p-3 flex gap-3 hover:shadow-md transition-all cursor-pointer active:scale-[0.99] no-tap-target"
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                        COLOR[item.type]
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold leading-tight">{item.title}</p>
                        <span className="text-[10px] text-muted-foreground/70 shrink-0">
                          {relativeTime(item.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">
                        {item.body}
                      </p>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer informativo */}
        {!loading && filtered.length > 0 && (
          <p className="text-center text-[10px] text-muted-foreground/60 pt-4">
            As notificações são geradas a partir de eventos reais (consultas, pedidos, receitas).
            <br />
            Mostramos os últimos 30 dias. Lembretes de consultas e atualizações em tempo real
            aparecem aqui automaticamente.
          </p>
        )}
      </main>
    </div>
  );
}
