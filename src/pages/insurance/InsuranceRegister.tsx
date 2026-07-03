import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

export default function InsuranceRegister() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", phone: "", email: "", website: "", city: "Maputo", address: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return navigate("/auth");
    if (form.name.trim().length < 3) return toast({ title: "Nome inválido", variant: "destructive" });
    setLoading(true);
    const { data, error } = await supabase.from("insurance_companies").insert({
      owner_id: user.id, ...form, cities: [form.city],
      is_active: false, is_verified: false,
    }).select().single();
    if (!error) await supabase.from("user_roles").insert({ user_id: user.id, role: "insurance" as any });
    setLoading(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Perfil criado", description: "Aguarda aprovação do admin para aparecer publicamente." });
    navigate(`/insurance/dashboard`);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-6">
        <div className="inline-flex h-14 w-14 rounded-2xl bg-primary/10 items-center justify-center mb-3"><Shield className="h-7 w-7 text-primary" /></div>
        <h1 className="text-2xl font-black">Registar seguradora</h1>
        <p className="text-sm text-muted-foreground">Cria o teu perfil e publica planos de saúde.</p>
      </div>
      <form onSubmit={submit} className="bento-card p-5 space-y-4">
        <div><Label>Nome da seguradora *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required maxLength={100} /></div>
        <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength={500} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Website</Label><Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
          <div><Label>Cidade *</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} required /></div>
        </div>
        <div><Label>Morada</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
        <Button type="submit" disabled={loading} className="w-full">{loading ? "A criar..." : "Criar perfil"}</Button>
      </form>
    </div>
  );
}