import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";

const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

export default function BloodRequestForm() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { city, coordinates } = useLocation();
  const [form, setForm] = useState<any>({
    blood_type: "O+", urgency: "urgent", units_needed: 1,
    hospital_name_manual: "", city: city || "", patient_name: "",
    contact_phone: "", reason: "", deadline: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!user) return nav("/auth");
    if (!form.blood_type || !form.city || !form.contact_phone || !form.hospital_name_manual)
      return toast({ title: "Preencha hospital, tipo, cidade e contacto", variant: "destructive" });
    setSaving(true);
    const { error } = await supabase.from("blood_requests").insert({
      created_by: user.id,
      blood_type: form.blood_type,
      urgency: form.urgency,
      units_needed: Number(form.units_needed) || 1,
      hospital_name_manual: form.hospital_name_manual,
      patient_name: form.patient_name || null,
      contact_phone: form.contact_phone,
      city: form.city,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      reason: form.reason || null,
      deadline: form.deadline || null,
      notes: form.notes || null,
      status: "open",
    });
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Pedido publicado", description: "Doadores compatíveis serão notificados." });
    nav("/blood");
  }

  return (
    <div className="p-4 max-w-xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="h-6 w-6 text-red-500" />
        <h1 className="text-2xl font-black">Pedir sangue</h1>
      </div>
      <div className="bento-card p-5 space-y-4">
        <div>
          <Label>Hospital / Unidade *</Label>
          <Input value={form.hospital_name_manual} onChange={(e) => setForm({ ...form, hospital_name_manual: e.target.value })} />
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
            <Label>Urgência</Label>
            <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Unidades necessárias</Label>
            <Input type="number" min={1} value={form.units_needed} onChange={(e) => setForm({ ...form, units_needed: e.target.value })} />
          </div>
          <div>
            <Label>Cidade *</Label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Nome do paciente</Label>
          <Input value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} />
        </div>
        <div>
          <Label>Contacto *</Label>
          <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="+258 84..." />
        </div>
        <div>
          <Label>Motivo (opcional)</Label>
          <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </div>
        <div>
          <Label>Prazo (opcional)</Label>
          <Input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        </div>
        <Button className="w-full bg-red-500 hover:bg-red-600" onClick={submit} disabled={saving}>
          {saving ? "A publicar..." : "Publicar pedido"}
        </Button>
      </div>
    </div>
  );
}