import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wallet, ArrowDownToLine, Clock, CheckCircle2, XCircle } from "lucide-react";

const METHODS = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "emola", label: "e-Mola" },
  { value: "mkesh", label: "Mkesh" },
  { value: "bank", label: "Transferência bancária" },
];

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: Clock },
  paid: { label: "Pago", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
  rejected: { label: "Rejeitado", color: "bg-rose-500/15 text-rose-600 border-rose-500/30", icon: XCircle },
};

export default function Withdraw() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [minAmt, setMinAmt] = useState<number>(100);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("mpesa");
  const [destination, setDestination] = useState("");
  const [destName, setDestName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const [{ data: w }, { data: roles }, { data: ps }, { data: hist }] = await Promise.all([
      supabase.from("wallets").select("balance_mzn").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("platform_settings").select("value").eq("key", "withdrawal_min_mzn").maybeSingle(),
      supabase.from("withdrawal_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setBalance(Number(w?.balance_mzn ?? 0));
    const pro = (roles ?? []).some((r: any) => ["doctor", "clinic", "store_owner", "driver", "admin"].includes(r.role));
    setIsPro(pro);
    if (ps?.value != null) setMinAmt(Number(ps.value));
    setHistory(hist ?? []);
  };

  useEffect(() => { load(); }, [user?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt < minAmt) { toast.error(`Valor mínimo ${minAmt} MZN`); return; }
    if (amt > balance) { toast.error("Saldo insuficiente"); return; }
    if (!destination.trim()) { toast.error("Indica o número/conta de destino"); return; }
    setLoading(true);
    const { error } = await supabase.rpc("request_withdrawal", {
      _amount: amt, _method: method, _destination: destination.trim(),
      _destination_name: destName.trim() || null, _notes: notes.trim() || null,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Pedido enviado. Vais receber uma notificação quando for pago.");
    setAmount(""); setDestination(""); setDestName(""); setNotes("");
    load();
  };

  if (isPro === false) {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardHeader><CardTitle>Levantamentos</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Os levantamentos estão disponíveis apenas para profissionais (médicos, farmácias, clínicas, estafetas).
            Se és profissional, contacta o suporte para ativar o teu perfil.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-6 space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-6 text-primary-foreground shadow-lg">
        <div className="flex items-center gap-2 text-sm opacity-90"><Wallet className="h-4 w-4" /> Saldo disponível</div>
        <div className="text-4xl font-bold mt-1">{balance.toLocaleString("pt-PT")} <span className="text-lg opacity-80">MZN</span></div>
        <div className="text-xs mt-2 opacity-80">Mínimo por pedido: {minAmt} MZN</div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ArrowDownToLine className="h-5 w-5" /> Novo levantamento</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Valor (MZN)</Label>
              <Input type="number" min={minAmt} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Ex: ${minAmt}`} />
            </div>
            <div>
              <Label>Método</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>{method === "bank" ? "Nº da conta / IBAN" : "Número"}</Label>
              <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={method === "bank" ? "IBAN / conta" : "84xxxxxxx"} />
            </div>
            <div className="md:col-span-2">
              <Label>Nome do destinatário</Label>
              <Input value={destName} onChange={(e) => setDestName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="md:col-span-2">
              <Label>Notas (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <Button className="md:col-span-2" disabled={loading}>{loading ? "A enviar..." : "Pedir levantamento"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 && <p className="text-sm text-muted-foreground">Sem pedidos ainda.</p>}
          {history.map((h) => {
            const s = STATUS_META[h.status] ?? STATUS_META.pending;
            const Icon = s.icon;
            return (
              <div key={h.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-semibold">{Number(h.amount).toLocaleString("pt-PT")} MZN <span className="text-xs text-muted-foreground">via {h.method}</span></div>
                  <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-PT")} · {h.destination}</div>
                  {h.admin_notes && <div className="text-xs mt-1">Nota: {h.admin_notes}</div>}
                </div>
                <Badge variant="outline" className={s.color}><Icon className="h-3 w-3 mr-1" /> {s.label}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}