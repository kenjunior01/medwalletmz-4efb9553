import { useCountry } from "@/contexts/CountryContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, FlaskConical, ArrowLeft, Download, Clock, CheckCircle2, Truck, XCircle } from "lucide-react";
import { toast } from "sonner";

const STATUS_META: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Pendente", icon: Clock, color: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
  confirmed: { label: "Confirmado", icon: CheckCircle2, color: "bg-blue-500/20 text-blue-700 dark:text-blue-300" },
  collected: { label: "Amostra recolhida", icon: Truck, color: "bg-purple-500/20 text-purple-700 dark:text-purple-300" },
  completed: { label: "Concluído", icon: CheckCircle2, color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "bg-red-500/20 text-red-700 dark:text-red-300" },
};

export default function MyLabOrders() {
  const { country } = useCountry();
  const currency = country?.currency_code || 'MZN';
  const nav = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const downloadResult = async (path: string) => {
    const { data, error } = await supabase.storage.from("lab-results").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) return toast.error("Não foi possível abrir o resultado");
    window.open(data.signedUrl, "_blank");
  };

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { nav("/auth"); return; }
      const { data } = await supabase
        .from("lab_exam_orders")
        .select("*, lab:clinics(name, city, phone)")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false });
      setOrders(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-4 flex flex-col gap-4 animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => nav(-1)} className="w-fit -ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>
      <h1 className="text-2xl font-black flex items-center gap-2">
        <ClipboardList className="h-6 w-6 text-primary" /> Meus exames
      </h1>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : orders.length === 0 ? (
        <div className="bento-card p-8 text-center text-muted-foreground">
          <FlaskConical className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="font-semibold">Ainda não tens pedidos de exames.</p>
          <Button className="mt-3" size="sm" onClick={() => nav("/health/exams")}>Marcar exame</Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {orders.map((o) => {
            const meta = STATUS_META[o.status] || STATUS_META.pending;
            const Icon = meta.icon;
            return (
              <div key={o.id} className="bento-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm">{o.lab?.name || "Laboratório"}</h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("pt-PT")}
                    </p>
                  </div>
                  <Badge className={meta.color}>
                    <Icon className="h-3 w-3 mr-1" />{meta.label}
                  </Badge>
                </div>
                <div className="text-xs space-y-1">
                  {(o.items as any[]).map((it, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{it.qty}× {it.name}</span>
                      <span className="text-muted-foreground">{(it.price * it.qty).toLocaleString()} {currency}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    {o.home_collection ? "Recolha ao domicílio" : "No laboratório"}
                    {o.scheduled_at && ` · ${new Date(o.scheduled_at).toLocaleString("pt-PT")}`}
                  </span>
                  <span className="font-bold text-primary">{Number(o.total_mzn).toLocaleString()} {currency}</span>
                </div>
                {o.status === "completed" && o.result_url ? (
                  <Button size="sm" variant="outline" className="w-full" onClick={() => downloadResult(o.result_url)}>
                    <Download className="h-4 w-4 mr-1" /> Descarregar resultado
                  </Button>
                ) : o.status !== "completed" ? (
                  <p className="text-xs text-muted-foreground text-center pt-1">Resultado disponível após conclusão.</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}