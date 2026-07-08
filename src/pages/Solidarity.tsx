import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Heart, Plus, Share2, MapPin, Phone, Hospital,
  ArrowLeft, Info, Loader2, CheckCircle2, AlertCircle,
  ShieldCheck, Award, HandHeart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Solidarity() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ["medical-aid-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("medical_aid_requests")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const [form, setForm] = useState({
    title: "",
    patient_name: "",
    patient_age: "",
    condition_description: "",
    hospital_name: "",
    treating_doctor: "",
    urgency_level: "normal",
    goal_amount_mzn: "",
    contact_phone: "",
    image_url: "",
    document_url: ""
  });

  const handleSubmit = async () => {
    if (!user) return navigate("/auth");
    if (!form.title || !form.patient_name || !form.goal_amount_mzn || !form.hospital_name) {
      return toast.error("Preenche os campos obrigatórios (*)");
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("medical_aid_requests").insert({
        user_id: user.id,
        ...form,
        patient_age: form.patient_age ? Number(form.patient_age) : null,
        goal_amount_mzn: Number(form.goal_amount_mzn),
        status: "pending"
      });
      if (error) throw error;
      toast.success("Pedido enviado para revisão. O MedWallet valida todos os casos clínicos com o hospital indicado.");
      setOpen(false);
      setForm({ title: "", patient_name: "", patient_age: "", condition_description: "", hospital_name: "", treating_doctor: "", urgency_level: "normal", goal_amount_mzn: "", contact_phone: "", image_url: "", document_url: "" });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const share = (r: any) => {
    const text = `🚨 APOIO MÉDICO URGENTE: ${r.patient_name} precisa de ajuda para ${r.title}. Podes ajudar via MedWallet:`;
    const url = `${window.location.origin}/solidarity/${r.id}`;
    if (navigator.share) {
      navigator.share({ title: 'MedWallet Solidariedade', text, url });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 py-3 backdrop-blur border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <HandHeart className="h-5 w-5 text-primary" /> Solidariedade
          </h1>
          <p className="text-[11px] text-muted-foreground">Apoio para cirurgias e tratamentos em Moçambique</p>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pt-4">
        <Card className="bg-gradient-to-br from-primary to-secondary text-primary-foreground border-none overflow-hidden p-6 relative">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Heart className="h-20 w-20 fill-current" />
          </div>
          <div className="relative">
            <h2 className="text-2xl font-black">Pequenos gestos, grandes curas.</h2>
            <p className="text-sm opacity-90 mt-2 max-w-xs">
              Plataforma de apoio a custos médicos. Todos os casos são verificados pela nossa equipa clínica.
            </p>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="mt-4 bg-white text-primary hover:bg-white/90">
                  <Plus className="h-4 w-4 mr-1" /> Pedir Apoio
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Formulário de Pedido de Apoio</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="bg-amber-500/10 p-3 rounded-lg flex gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                    <p className="text-[10px] text-amber-800">
                      O MedWallet transfere os fundos diretamente para a conta do Hospital. É obrigatório anexar/indicar o relatório médico para validação.
                    </p>
                  </div>
                  <div>
                    <Label>Título do Caso * (Ex: Cirurgia Cardíaca Urgente)</Label>
                    <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Resumo do pedido" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Label>Nome do Paciente *</Label>
                      <Input value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} />
                    </div>
                    <div>
                      <Label>Idade</Label>
                      <Input type="number" value={form.patient_age} onChange={e => setForm({...form, patient_age: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Hospital/Clínica *</Label>
                      <Input value={form.hospital_name} onChange={e => setForm({...form, hospital_name: e.target.value})} placeholder="Onde será feito o tratamento" />
                    </div>
                    <div>
                      <Label>Médico Assistente</Label>
                      <Input value={form.treating_doctor} onChange={e => setForm({...form, treating_doctor: e.target.value})} placeholder="Nome do médico (opcional)" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Valor Meta * (MZN)</Label>
                      <Input type="number" value={form.goal_amount_mzn} onChange={e => setForm({...form, goal_amount_mzn: e.target.value})} />
                    </div>
                    <div>
                      <Label>Nível de Urgência</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={form.urgency_level}
                        onChange={e => setForm({...form, urgency_level: e.target.value})}
                      >
                        <option value="normal">Normal</option>
                        <option value="urgent">Urgente</option>
                        <option value="critical">Crítico / Imediato</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label>Descrição Detalhada da Condição *</Label>
                    <Textarea rows={3} value={form.condition_description} onChange={e => setForm({...form, condition_description: e.target.value})} placeholder="Explique o caso clínico, o que já foi feito e a urgência..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Telefone de Contacto</Label>
                      <Input value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} />
                    </div>
                    <div>
                      <Label>URL do Relatório Médico (PDF/Foto)</Label>
                      <Input value={form.document_url} onChange={e => setForm({...form, document_url: e.target.value})} placeholder="Link para documento de validação" />
                    </div>
                  </div>
                  <div>
                    <Label>URL da Foto do Paciente</Label>
                    <Input value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="https://..." />
                  </div>
                  <Button onClick={handleSubmit} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submeter para Revisão"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Card>
      </section>

      {/* Verification Badge Info */}
      <section className="px-4 mt-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-xl">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Todos os casos marcados com <CheckCircle2 className="h-3 w-3 inline text-primary" /> têm relatórios médicos validados pela MedWallet.</span>
        </div>
      </section>

      {/* Requests List */}
      <section className="px-4 mt-6 space-y-4">
        <h3 className="font-bold text-lg">Casos Urgentes</h3>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-2xl" />)}
          </div>
        ) : !requests || requests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>Nenhum pedido de apoio ativo.</p>
          </div>
        ) : (
          requests.map((r: any) => (
            <Card key={r.id} className="overflow-hidden border-none shadow-md">
              <div className="relative h-48 w-full bg-muted">
                {r.image_url ? (
                  <img src={r.image_url} className="w-full h-full object-cover" alt={r.patient_name} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground italic">Sem imagem</div>
                )}
                <div className="absolute top-3 right-3">
                  <Badge className="bg-white/90 text-primary border-none shadow-sm">
                    {Math.round((r.collected_amount_mzn || 0) / r.goal_amount_mzn * 100)}%
                  </Badge>
                </div>
              </div>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-black text-lg">{r.title}</h4>
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-2 mb-3">
                  <MapPin className="h-3 w-3" /> Paciente: {r.patient_name} · <Hospital className="h-3 w-3 ml-1" /> {r.hospital_name}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {r.condition_description}
                </p>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{Number(r.collected_amount_mzn || 0).toLocaleString()} MZN</span>
                    <span className="text-muted-foreground">Meta: {Number(r.goal_amount_mzn).toLocaleString()} MZN</span>
                  </div>
                  <Progress value={(r.collected_amount_mzn || 0) / r.goal_amount_mzn * 100} className="h-2" />
                </div>

                <div className="flex gap-2 mt-5">
                  <Button className="flex-1 bg-primary" onClick={() => navigate(`/solidarity/${r.id}`)}>
                    Ajudar agora
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => share(r)}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {/* Transparency */}
      <section className="px-4 mt-8">
        <div className="bento-card p-4 bg-primary/5 border-primary/20 text-center">
          <Award className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-xs font-bold text-primary uppercase tracking-wider">Transparência Total</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            100% dos fundos arrecadados são transferidos diretamente para a conta do Hospital/Clínica indicado no processo.
          </p>
        </div>
      </section>
    </div>
  );
}
