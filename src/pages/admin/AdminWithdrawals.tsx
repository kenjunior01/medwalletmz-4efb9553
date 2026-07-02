import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ArrowDownToLine } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente", paid: "Pago", rejected: "Rejeitado", all: "Todos",
};

export default function AdminWithdrawals() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    let q = supabase.from("withdrawal_requests").select("*, profiles:user_id(full_name, phone)").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows(data ?? []);
  };

  useEffect(() => { load(); }, [filter]);

  // Realtime: refresh list when any withdrawal changes
  useEffect(() => {
    const ch = supabase
      .channel('admin-withdrawals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [filter]);

  const totals = rows.reduce(
    (a, r) => { a[r.status] = (a[r.status] ?? 0) + Number(r.amount); return a; },
    {} as Record<string, number>
  );

  const resolve = async (id: string, action: "paid" | "rejected") => {
    const { error } = await supabase.rpc("resolve_withdrawal", { _id: id, _action: action, _notes: notes[id] || null });
    if (error) return toast.error(error.message);
    toast.success(action === "paid" ? "Marcado como pago" : "Rejeitado e reembolsado");
    load();
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ArrowDownToLine className="h-6 w-6" /> Levantamentos</h1>
        <div className="flex gap-2">
          {["pending", "paid", "rejected", "all"].map((s) => (
            <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>{STATUS_LABEL[s]}</Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(["pending","paid","rejected"] as const).map((s) => (
          <Card key={s}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{STATUS_LABEL[s]}</div>
              <div className="text-xl font-bold">{(totals[s] ?? 0).toLocaleString("pt-PT")} <span className="text-xs font-normal text-muted-foreground">MZN</span></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rows.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground">Sem pedidos.</CardContent></Card>}
      {rows.map((r) => (
        <Card key={r.id}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span>{Number(r.amount).toLocaleString("pt-PT")} MZN · {r.method}</span>
              <Badge variant={r.status === "paid" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>{r.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><strong>Utilizador:</strong> {r.profiles?.full_name ?? r.user_id} {r.profiles?.phone && `· ${r.profiles.phone}`}</div>
            <div><strong>Destino:</strong> {r.destination} {r.destination_name && `(${r.destination_name})`}</div>
            {r.user_notes && <div><strong>Notas do utilizador:</strong> {r.user_notes}</div>}
            <div className="text-xs text-muted-foreground">Pedido em {new Date(r.created_at).toLocaleString("pt-PT")}</div>
            {r.admin_notes && <div className="text-xs">Admin: {r.admin_notes}</div>}
            {r.status === "pending" && (
              <div className="flex flex-col md:flex-row gap-2 pt-2">
                <Input placeholder="Notas / referência da transferência" value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
                <Button onClick={() => resolve(r.id, "paid")}><CheckCircle2 className="h-4 w-4 mr-1" /> Pago</Button>
                <Button variant="destructive" onClick={() => resolve(r.id, "rejected")}><XCircle className="h-4 w-4 mr-1" /> Rejeitar</Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}