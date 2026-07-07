import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Droplet } from "lucide-react";

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

export default function BloodDonorRegister() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { city, coordinates } = useLocation();
  const [form, setForm] = useState<any>({
    full_name: "", phone: "", birth_date: "", weight_kg: "",
    blood_type: "O+", city: city || "", neighborhood: "",
    is_available: true, health_notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("blood_donors").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setForm({ ...form, ...data });
    });
  }, [user]);

  async function submit() {
    if (!user) return nav("/auth");
    const age = form.birth_date ? Math.floor((Date.now() - new Date(form.birth_date).getTime()) / (365.25 * 86400000)) : 0;
    if (age < 18 || age > 65) return toast({ title: "Idade fora do intervalo", description: "Doadores devem ter entre 18 e 65 anos.", variant: "destructive" });
    if (Number(form.weight_kg) < 50) return toast({ title: "Peso mínimo 50 kg", variant: "destructive" });
    if (!form.blood_type || !form.city || !form.full_name || !form.phone)
      return toast({ title: "Preencha nome, telefone, tipo sanguíneo e cidade", variant: "destructive" });

    setSaving(true);
    const payload = {
      user_id: user.id,
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      birth_date: form.birth_date || null,
      weight_kg: Number(form.weight_kg) || null,
      blood_type: form.blood_type,
      city: form.city,
      neighborhood: form.neighborhood || null,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      is_available: form.is_available,
      health_notes: form.health_notes || null,
      is_active: true,
    };
    const { error } = await supabase.from("blood_donors").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Registo guardado", description: "Obrigado! Vais receber alertas quando houver pedidos compatíveis." });
    nav("/blood");
  }

  return (
    <div className="p-4 max-w-xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Droplet className="h-6 w-6 text-red-500" />
        <h1 className="text-2xl font-black">Registo de doador</h1>
      </div>
      <div className="bento-card p-5 space-y-4">
        <div>
          <Label>Nome completo *</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Telefone *</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+258 84..." />
          </div>
          <div>
            <Label>Data de nascimento</Label>
            <Input type="date" value={form.birth_date || ""} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo sanguíneo *</Label>
            <Select value={form.blood_type} onValueChange={(v) => setForm({ ...form, blood_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BLOOD_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Peso (kg)</Label>
            <Input type="number" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Cidade *</Label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <Label>Bairro</Label>
            <Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Notas de saúde (opcional)</Label>
          <Textarea value={form.health_notes} onChange={(e) => setForm({ ...form, health_notes: e.target.value })} placeholder="Alergias, medicação..." />
        </div>
        <div className="flex items-center justify-between">
          <Label>Disponível para doar</Label>
          <Switch checked={form.is_available} onCheckedChange={(v) => setForm({ ...form, is_available: v })} />
        </div>
        <Button className="w-full" onClick={submit} disabled={saving}>
          {saving ? "A guardar..." : "Guardar registo"}
        </Button>
      </div>
    </div>
  );
}