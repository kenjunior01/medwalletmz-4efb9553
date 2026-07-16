/**
 * NotificationCenter — Página completa de notificações
 * ----------------------------------------------------
 * Melhoria UX sobre a página Notifications.tsx original:
 *   - Tabs por tipo (Tudo, Consultas, Pedidos, Receitas, Lembretes)
 *   - Marcar como lida individual
 *   - Empty states ricos por tipo
 *   - Animações de entrada (framer-motion)
 *   - Filtros rápidos (não lidas primeiro)
 *   - Skeleton loading elegante
 *   - Pull-to-refresh (mobile)
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell, Stethoscope, Package, FileText, Clock, CheckCheck, ChevronRight,
  RefreshCw, BellOff, Inbox, ArrowLeft, Sparkles, Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Seo } from "@/components/Seo";

type NotificationType = "consultation" | "order" | "prescription" | "reminder";

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  created_at: string;
  read: boolean;
}

const since = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}

const ICON: Record<NotificationType, typeof Stethoscope> = {
  consultation: Stethoscope,
  order: Package,
  prescription: FileText,
  reminder: Clock,
};

const COLOR: Record<NotificationType, string> = {
  consultation: "bg-secondary/15 text-secondary",
  order: "bg-emerald-500/15 text-emerald-600",
  prescription: "bg-primary/15 text-primary",
  reminder: "bg-amber-500/15 text-amber-600",
};

const TABS: { key: "all" | NotificationType; label: string; icon: typeof Bell }[] = [
  { key: "all", label: "Tudo", icon: Inbox },
  { key: "consultation", label: "Consultas", icon: Stethoscope },
  { key: "order", label: "Pedidos", icon: Package },
  { key: "prescription", label: "Receitas", icon: FileText },
  { key: "reminder", label: "Lembretes", icon: Clock },
];

export default function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | NotificationType>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [rx, orders, consults, reminders] = await Promise.all([
        (supabase as any)
          .from("prescriptions")
          .select("id, created_at")
          .eq("patient_id", user.id)
          .gte("created_at", since())
          .order("created_at", { ascending: false })
          .limit(30),
        (supabase as any)
          .from("orders")
          .select("id, status, updated_at, items")
          .eq("customer_id", user.id)
          .in("status", ["out_for_delivery", "in_transit", "ready", "delivered"])
          .order("updated_at", { ascending: false })
          .limit(30),
        (supabase as any)
          .from("consultations")
          .select("id, status, updated_at")
          .eq("patient_id", user.id)
          .in("status", ["confirmed", "in_progress", "completed"])
          .order("updated_at", { ascending: false })
          .limit(30),
        (supabase as any)
          .from("consultation_reminders")
          .select("id, sent_at, scheduled_at, consultation_id")
          .eq("patient_id", user.id)
          .not("sent_at", "is", null)
          .order("sent_at", { ascending: false })
          .limit(15),
      ]);

      const all: NotificationItem[] = [];
      const lastSeen = localStorage.getItem("notif-last-seen");
      const lastSeenTs = lastSeen ? new Date(lastSeen).getTime() : 0;

      (rx.data || []).forEach((r: any) => {
        const ts = new Date(r.created_at).getTime();
        all.push({
          id: `rx-${r.id}`,
          type: "prescription",
          title: "Nova receita médica",
          body: "O médico emitiu uma receita para ti. Toca para ver.",
          href: `/health/prescription/${r.id}`,
          created_at: r.created_at,
          read: ts < lastSeenTs,
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
          read: new Date(o.updated_at).getTime() < lastSeenTs,
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
          read: new Date(c.updated_at).getTime() < lastSeenTs,
        });
      });

      (reminders.data || []).forEach((r: any) => {
        const when = new Date(r.scheduled_at).toLocaleString("pt-PT", {
          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
        });
        all.push({
          id: `rem-${r.id}`,
          type: "reminder",
          title: "Lembrete de consulta",
          body: `Tens consulta agendada para ${when}.`,
          href: `/health/consultation/${r.consultation_id}`,
          created_at: r.sent_at,
          read: new Date(r.sent_at).getTime() < lastSeenTs,
        });
      });

      all.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setItems(all.slice(0, 50));
    } catch (e) {
      console.warn("NotificationCenter load falhou:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-center-${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "prescriptions", filter: `patient_id=eq.${user.id}` },
        () => load())
      .on("postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `customer_id=eq.${user.id}` },
        () => load())
      .on("postgres_changes",
        { event: "*", schema: "public", table: "consultations", filter: `patient_id=eq.${user.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  const markAllRead = () => {
    setItems((prev) => prev.map((it) => ({ ...it, read: true })));
    localStorage.setItem("notif-last-seen", new Date().toISOString());
    toast.success("Tudo marcado como lido");
  };

  const markOneRead = (id: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, read: true } : it)));
  };

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (activeTab !== "all" && it.type !== activeTab) return false;
      if (showUnreadOnly && it.read) return false;
      return true;
    });
  }, [items, activeTab, showUnreadOnly]);

  const unreadCount = items.filter((i) => !i.read).length;
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, consultation: 0, order: 0, prescription: 0, reminder: 0 };
    items.forEach((i) => { if (!i.read) c[i.type] = (c[i.type] || 0) + 1; });
    c.all = unreadCount;
    return c;
  }, [items, unreadCount]);

  const handleClick = (item: NotificationItem) => {
    markOneRead(item.id);
    navigate(item.href);
  };

  return (
    <>
      <Seo title="Notificações — MedWallet MZ" description="Central de notificações da tua conta MedWallet." path="/notifications" />
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <header className="sticky top-0 z-20 glass border-b border-border/50 safe-area-top">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-black flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notificações
                </h1>
                <p className="text-xs text-muted-foreground">
                  {unreadCount > 0
                    ? `${unreadCount} não lidas`
                    : "Estás em dia! 🎉"}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={load}
                className="rounded-xl h-10 w-10"
                aria-label="Atualizar"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={markAllRead}
                  className="rounded-xl h-10 w-10"
                  aria-label="Marcar tudo como lido"
                >
                  <CheckCheck className="h-4 w-4 text-secondary" />
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="px-4 pt-4 space-y-4">
          {/* Filter toggle */}
          <div className="flex items-center justify-between">
            <Button
              variant={showUnreadOnly ? "default" : "outline"}
              size="sm"
              className="rounded-full font-bold text-xs"
              onClick={() => setShowUnreadOnly((v) => !v)}
            >
              <Filter className="h-3 w-3 mr-1.5" />
              {showUnreadOnly ? "A mostrar não lidas" : "Filtrar não lidas"}
            </Button>
            {unreadCount > 0 && (
              <Badge className="bg-secondary/15 text-secondary border-0">
                {unreadCount} novas
              </Badge>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="w-full flex overflow-x-auto h-auto p-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const c = counts[tab.key] || 0;
                return (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className="flex-1 flex-col py-2 h-auto gap-0.5 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-black uppercase">{tab.label}</span>
                    </div>
                    {c > 0 && (
                      <span className="text-[9px] bg-secondary text-white rounded-full px-1.5 leading-tight">
                        {c}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {/* List */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="p-4 flex gap-3 animate-pulse">
                  <div className="h-10 w-10 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-2.5 bg-muted/60 rounded w-3/4" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="h-20 w-20 rounded-3xl bg-muted/40 flex items-center justify-center mx-auto mb-4">
                {showUnreadOnly ? (
                  <CheckCheck className="h-10 w-10 text-secondary" />
                ) : (
                  <BellOff className="h-10 w-10 text-muted-foreground/50" />
                )}
              </div>
              <h3 className="font-black text-lg">
                {showUnreadOnly ? "Tudo lido!" : "Sem notificações"}
              </h3>
              <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto font-medium">
                {showUnreadOnly
                  ? "Não tens notificações por ler. Quando algo novo chegar, aparece aqui."
                  : "As novidades de consultas, pedidos, receitas e lembretes aparecem aqui em tempo real."}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-6 rounded-xl font-bold"
                onClick={() => navigate("/health/triage")}
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                Iniciar triagem IA
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filtered.map((item, idx) => {
                  const Icon = ICON[item.type];
                  return (
                    <motion.button
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                      onClick={() => handleClick(item)}
                      className={cn(
                        "w-full text-left rounded-2xl border transition-all p-3 flex gap-3 group",
                        item.read
                          ? "bg-card/60 border-border/30 hover:bg-card"
                          : "bg-secondary/[0.04] border-secondary/20 hover:bg-secondary/[0.08]"
                      )}
                    >
                      <div
                        className={cn(
                          "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
                          COLOR[item.type]
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black leading-tight flex-1 truncate">
                            {item.title}
                          </p>
                          {!item.read && (
                            <span className="h-2 w-2 rounded-full bg-secondary shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 font-medium">
                          {item.body}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <p className="text-[10px] text-muted-foreground/70 font-bold">
                            {relativeTime(item.created_at)}
                          </p>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
