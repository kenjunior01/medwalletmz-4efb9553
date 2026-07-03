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
import { Megaphone } from "lucide-react";

const CATS = ["Saúde", "Serviços", "Produtos", "Empregos", "Aluguer", "Outros"];

export default function AdForm() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { city } = useLocation();
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({ title: "", description: "", category: "Serviços", price_mzn: "", contact_phone: "", contact_whatsapp: "", city, neighborhood: "", image_url: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return nav("/auth");
    if (f.title.trim().length < 4) return toast({ title: "Título muito curto", variant: "destructive" });
    setLoading(true);
    const { error } = await supabase.from("advertisements").insert({
      user_id: user.id, ...f,
      price_mzn: f.price_mzn ? Number(f.price_mzn) : null,
      status: "pending",
    });
    setLoading(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Anúncio enviado", description: "Aguarda aprovação do admin (normalmente < 24h)." });
    nav("/ads/mine");
  };

  return (
    <div className="p-4 max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-6">
        <div className="inline-flex h-14 w-14 rounded-2xl bg-primary/10 items-center justify-center mb-3"><Megaphone className="h-7 w-7 text-primary" /></div>
        <h1 className="text-2xl font-black">Publicar anúncio</h1>
        <p className="text-sm text-muted-foreground">Alcança milhares em {city}.</p>
      </div>
      <form onSubmit={submit} className="bento-card p-5 space-y-4">
        <div><Label>Título *</Label><Input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} required maxLength={100} /></div>
        <div><Label>Descrição</Label><Textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} maxLength={1000} rows={4} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Categoria</Label>
            <Select value={f.category} onValueChange={v => setF({ ...f, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Preço (MZN)</Label><Input type="number" value={f.price_mzn} onChange={e => setF({ ...f, price_mzn: e.target.value })} /></div>
          <div><Label>Cidade *</Label><Input value={f.city} onChange={e => setF({ ...f, city: e.target.value })} required /></div>
          <div><Label>Bairro</Label><Input value={f.neighborhood} onChange={e => setF({ ...f, neighborhood: e.target.value })} /></div>
          <div><Label>Telefone</Label><Input value={f.contact_phone} onChange={e => setF({ ...f, contact_phone: e.target.value })} /></div>
          <div><Label>WhatsApp</Label><Input value={f.contact_whatsapp} onChange={e => setF({ ...f, contact_whatsapp: e.target.value })} placeholder="258..." /></div>
        </div>
        <div><Label>URL da imagem (opcional)</Label><Input value={f.image_url} onChange={e => setF({ ...f, image_url: e.target.value })} placeholder="https://..." /></div>
        <Button type="submit" disabled={loading} className="w-full">{loading ? "A enviar..." : "Publicar"}</Button>
      </form>
    </div>
  );
}