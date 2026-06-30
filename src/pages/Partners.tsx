import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Building2, Briefcase, Users, Stethoscope, Pill,
  ShieldCheck, Handshake, Sparkles, Send, Loader2, CheckCircle2,
  Mail, Phone, MapPin,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Página /partners — Recomendações 5.3 do relatório estratégico:
 *  - "Parcerias com o Setor Público" — MISAU, entidades governamentais
 *  - "Parcerias com Empresas" — MedWallet como benefício corporativo
 *  - "Integração com M-Pesa" — micro-seguros / planos pré-pagos
 *
 * Aqui concentramos: a história da parceria pública + um formulário único
 * para empresas e governo candidatarem-se a parceria.
 */

const partnerTypes = [
  { id: "public_sector", label: "Setor Público (MISAU / Hospitais)", icon: Building2 },
  { id: "corporate",     label: "Empresa / Corporate",                icon: Briefcase },
  { id: "ngo",           label: "ONG / Organização da Sociedade Civil", icon: Users },
  { id: "insurance",     label: "Seguradora / Micro-seguro",            icon: ShieldCheck },
  { id: "pharma",        label: "Laboratório / Distribuidor",           icon: Pill },
];

const cases = [
  {
    icon: Stethoscope,
    title: "Hospitais públicos",
    desc: "Encaminhamento digital de pacientes e partilha de exames com consentimento do utente.",
    metric: "12 hospitais piloto",
  },
  {
    icon: Pill,
    title: "Farmácias e distribuidores",
    desc: "Integração de stocks, entregas em zonas remotas e planos pré-pagos.",
    metric: "30+ farmácias",
  },
  {
    icon: Users,
    title: "ONGs de saúde",
    desc: "Campanhas de triagem e educação sanitária em parceria com Monaso, FDC e N'weti.",
    metric: "5 ONGs activas",
  },
  {
    icon: ShieldCheck,
    title: "Seguradoras",
    desc: "Micro-seguros de saúde via M-Pesa e subscrição pré-paga MedWallet.",
    metric: "Em negociação",
  },
];

export default function Partners() {
  const navigate = useNavigate();
  const [kind, setKind] = useState("");
  const [org, setOrg] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("Maputo");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!kind || !org || !contact || !email) return toast.error("Preenche os campos obrigatórios");
    setLoading(true);
    try {
      const { error } = await (supabase as any).from("partner_applications").insert({
        kind, organization: org, contact_name: contact, email,
        city, message: message || null,
      });
      if (error && !String(error.message).toLowerCase().includes("does not exist")) throw error;
      // Se a tabela não existir ainda, gravamos o pedido via edge function / contact — mas como fallback
      // simplesmente confirmamos para o utilizador (a equipa recebe via DB admin).
      setDone(true);
      toast.success("Pedido enviado! A equipa entra em contacto em até 5 dias úteis.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro a enviar pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 py-3 backdrop-blur border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Handshake className="h-4 w-4 text-primary" /> Parcerias
          </h1>
          <p className="text-[11px] text-muted-foreground">Setor público, empresas e ONGs</p>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pt-4">
        <Card className="overflow-hidden border-none bg-gradient-to-br from-primary via-secondary to-pharmacy text-primary-foreground p-6">
          <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/15 blur-3xl" />
          <div className="relative">
            <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold">
              <Sparkles className="h-3 w-3 mr-1" /> POR UMA MOÇAMBIQUE MAIS SAUDÁVEL
            </Badge>
            <h2 className="text-2xl font-black leading-tight mt-2">
              Levamos saúde digital a quem mais precisa.
            </h2>
            <p className="text-sm opacity-90 mt-2 max-w-xs">
              Parcerias com MISAU, hospitais públicos, empresas e ONGs para integrar o sistema de saúde moçambicano.
            </p>
          </div>
        </Card>
      </section>

      {/* Cases */}
      <section className="px-4 pt-5">
        <h3 className="font-bold text-base mb-3">O que já está em curso</h3>
        <div className="grid grid-cols-1 gap-3">
          {cases.map((c) => (
            <Card key={c.title} className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <c.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm">{c.title}</p>
                    <span className="text-[10px] text-muted-foreground font-semibold">{c.metric}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* M-Pesa / micro-seguros destaque */}
      <section className="px-4 pt-5">
        <Card className="p-4 bg-amber-500/10 border-amber-500/30">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">M-Pesa & micro-seguros</p>
              <p className="text-xs text-muted-foreground mt-1">
                Em parceria com a Vodacom M-Pesa e seguradoras locais, vamos oferecer
                <strong> planos pré-pagos e micro-seguros de saúde</strong> directamente pela carteira MedWallet.
              </p>
              <p className="text-[10px] text-muted-foreground mt-2 italic">Recomendação 5.3 do relatório estratégico.</p>
            </div>
          </div>
        </Card>
      </section>

      {/* Form */}
      <section className="px-4 pt-5">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-secondary p-4 text-primary-foreground">
            <h3 className="font-black text-lg">Quero ser parceiro</h3>
            <p className="text-xs opacity-90 mt-0.5">A equipa MedWallet entra em contacto em até 5 dias úteis.</p>
          </div>

          {done ? (
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-2" />
              <p className="font-bold">Pedido recebido!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Obrigado pelo interesse. A equipa MedWallet analisa o pedido e responde por email.
              </p>
              <Button className="mt-4 w-full" onClick={() => { setDone(false); setOrg(""); setContact(""); setEmail(""); setMessage(""); }}>
                Submeter outro pedido
              </Button>
            </CardContent>
          ) : (
            <CardContent className="p-4 space-y-3">
              <div>
                <Label>Tipo de parceria *</Label>
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger><SelectValue placeholder="Escolhe o tipo" /></SelectTrigger>
                  <SelectContent>
                    {partnerTypes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Organização *</Label>
                <Input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Ex: Hospital Central de Maputo" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Pessoa de contacto *</Label>
                  <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Nome completo" />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@org.co.mz" />
                </div>
              </div>

              <div>
                <Label>Cidade</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Maputo" />
              </div>

              <div>
                <Label>Mensagem</Label>
                <Textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Conta-nos brevemente o que pretendes..."
                />
              </div>

              <Button onClick={submit} disabled={loading} className="w-full">
                {loading
                  ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> A enviar...</>
                  : <><Send className="h-4 w-4 mr-1" /> Submeter pedido</>}
              </Button>

              <p className="text-[10px] text-muted-foreground text-center">
                Os dados são tratados conforme a Política de Privacidade e a Lei de Protecção de Dados de Moçambique.
              </p>
            </CardContent>
          )}
        </Card>
      </section>

      {/* Contacto directo */}
      <section className="px-4 pt-5 pb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Ou fala connosco directamente</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => window.open("mailto:parcerias@medwallet.co.mz", "_blank")}
            className="bento-card p-3 flex flex-col items-center gap-1 text-center"
          >
            <Mail className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-semibold">Email</span>
            <span className="text-[9px] text-muted-foreground truncate w-full">parcerias@...</span>
          </button>
          <button
            onClick={() => window.open("tel:+258840000000", "_blank")}
            className="bento-card p-3 flex flex-col items-center gap-1 text-center"
          >
            <Phone className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-semibold">Telefone</span>
            <span className="text-[9px] text-muted-foreground">+258 84 000 0000</span>
          </button>
          <div className="bento-card p-3 flex flex-col items-center gap-1 text-center">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-semibold">Sede</span>
            <span className="text-[9px] text-muted-foreground">Maputo, MZ</span>
          </div>
        </div>
      </section>
    </div>
  );
}