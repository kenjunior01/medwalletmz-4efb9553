import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Edit } from "lucide-react";

const audiences = ["customer", "doctor", "clinic", "hospital", "lab", "store_owner", "driver"];
const periods = ["monthly", "quarterly", "yearly"];

export default function AdminSubscriptionPlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const empty = {
    name: "",
    slug: "",
    description: "",
    price_mzn: 0,
    billing_period: "monthly",
    target_audience: "doctor",
    features_text: "",
    is_active: true,
    badge: "",
  };
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("target_audience")
      .order("price_mzn");
    setPlans(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p: any) => {
    setEditing(p);
    const feats = Array.isArray(p.features) ? p.features : (p.features?.items ?? []);
    setForm({
      name: p.name,
      slug: p.slug || "",
      description: p.description || "",
      price_mzn: p.price_mzn,
      billing_period: p.billing_period,
      target_audience: p.target_audience,
      features_text: feats.join("\n"),
      is_active: p.is_active,
      badge: p.badge || "",
    });
    setOpen(true);
  };

  const save = async () => {
    const features = form.features_text.split("\n").map((x: string) => x.trim()).filter(Boolean);
    const slug = (form.slug || form.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const payload = {
      name: form.name,
      slug,
      description: form.description || null,
      price_mzn: Number(form.price_mzn),
      billing_period: form.billing_period,
      target_audience: form.target_audience,
      features: features as any,
      is_active: form.is_active,
      badge: form.badge || null,
    };
    const { error } = editing
      ? await supabase.from("subscription_plans").update(payload).eq("id", editing.id)
      : await supabase.from("subscription_plans").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Plano atualizado" : "Plano criado");
    setOpen(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Eliminar este plano?")) return;
    const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planos de Subscrição</h1>
          <p className="text-sm text-muted-foreground">Criar e gerir planos por tipo de utilizador</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Plano</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} plano</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Preço (MZN)</Label>
                  <Input type="number" value={form.price_mzn} onChange={e => setForm({ ...form, price_mzn: e.target.value })} />
                </div>
                <div>
                  <Label>Período</Label>
                  <Select value={form.billing_period} onValueChange={v => setForm({ ...form, billing_period: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {periods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Público-alvo</Label>
                <Select value={form.target_audience} onValueChange={v => setForm({ ...form, target_audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {audiences.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Funcionalidades (uma por linha)</Label>
                <Textarea rows={5} value={form.features_text} onChange={e => setForm({ ...form, features_text: e.target.value })} placeholder="Consultas ilimitadas&#10;Aparecer em destaque&#10;..." />
              </div>
              <div>
                <Label>Badge (opcional, ex: "Popular")</Label>
                <Input value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /> Ativo
                </label>
              </div>
              <Button className="w-full" onClick={save}>Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <p className="text-muted-foreground">A carregar...</p> : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {plans.map(p => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{p.name}</h3>
                    {p.badge && <Badge>{p.badge}</Badge>}
                    {!p.is_active && <Badge variant="secondary">Inativo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.target_audience} · {p.billing_period}</p>
                  <p className="text-lg font-black text-primary mt-1">{p.price_mzn.toLocaleString("pt-MZ")} MZN</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}