import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FlaskConical, CheckCircle2, XCircle, Pause, Upload, Download, Loader2 } from "lucide-react";

export default function AdminLabs() {
  const [labs, setLabs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: l }, { data: o }] = await Promise.all([
      supabase.from("clinics").select("*").eq("type", "laboratory").order("created_at", { ascending: false }),
      supabase.from("lab_exam_orders").select("*, lab:clinics(name)").in("status", ["confirmed", "collected"]).order("created_at", { ascending: false }).limit(100),
    ]);
    setLabs(l || []);
    setOrders(o || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const moderate = async (id: string, action: "approve" | "reject" | "suspend") => {
    const { error } = await supabase.rpc("moderate_lab", { _lab_id: id, _action: action });
    if (error) return toast.error(error.message);
    toast.success("Laboratório atualizado");
    load();
  };

  const upload = async (order: any, file: File) => {
    setUploading(order.id);
    try {
      const path = `${order.lab_id}/${order.id}.pdf`;
      const { error: upErr } = await supabase.storage.from("lab-results").upload(path, file, { upsert: true, contentType: file.type || "application/pdf" });
      if (upErr) throw upErr;
      const { error: rpcErr } = await supabase.rpc("lab_order_set_result", { _order_id: order.id, _result_url: path });
      if (rpcErr) throw rpcErr;
      toast.success("Resultado enviado e pedido concluído");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(null); }
  };

  const pending = labs.filter((l) => !l.is_verified);
  const approved = labs.filter((l) => l.is_verified && l.is_active);
  const suspended = labs.filter((l) => l.is_verified && !l.is_active);

  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="text-2xl font-black flex items-center gap-2"><FlaskConical className="h-6 w-6 text-primary" /> Laboratórios</h1>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pendentes ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Aprovados ({approved.length})</TabsTrigger>
          <TabsTrigger value="suspended">Suspensos ({suspended.length})</TabsTrigger>
          <TabsTrigger value="orders">Pedidos ({orders.length})</TabsTrigger>
        </TabsList>

        {[
          { v: "pending", list: pending },
          { v: "approved", list: approved },
          { v: "suspended", list: suspended },
        ].map(({ v, list }) => (
          <TabsContent key={v} value={v} className="space-y-2">
            {loading ? <p className="text-sm text-muted-foreground">A carregar...</p> :
              list.length === 0 ? <p className="text-sm text-muted-foreground">Sem registos.</p> :
                list.map((l) => (
                  <div key={l.id} className="bento-card p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{l.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{l.city} · {l.phone || "sem telefone"}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!l.is_verified && <Button size="sm" onClick={() => moderate(l.id, "approve")}><CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar</Button>}
                      {l.is_verified && l.is_active && <Button size="sm" variant="outline" onClick={() => moderate(l.id, "suspend")}><Pause className="h-4 w-4 mr-1" /> Suspender</Button>}
                      {l.is_verified && !l.is_active && <Button size="sm" onClick={() => moderate(l.id, "approve")}>Reativar</Button>}
                      <Button size="sm" variant="ghost" onClick={() => moderate(l.id, "reject")}><XCircle className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
          </TabsContent>
        ))}

        <TabsContent value="orders" className="space-y-2">
          {orders.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum pedido a aguardar resultado.</p> :
            orders.map((o) => (
              <div key={o.id} className="bento-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{o.lab?.name} · {o.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-PT")} · {Number(o.total_mzn).toLocaleString()} MZN</p>
                  </div>
                  <Badge>{o.status}</Badge>
                </div>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Input type="file" accept="application/pdf,image/*" className="h-8 text-xs"
                    disabled={uploading === o.id}
                    onChange={(e) => e.target.files?.[0] && upload(o, e.target.files[0])} />
                  {uploading === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </label>
              </div>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}