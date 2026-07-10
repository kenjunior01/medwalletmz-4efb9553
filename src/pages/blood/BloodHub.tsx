import { Seo } from "@/components/Seo";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Droplet, AlertCircle, Calendar, MapPin, Plus, Heart, Users,
  Share2, Info, Zap, Award, ShieldCheck, ChevronRight, Activity,
  Gift, Star
} from "lucide-react";
import { toast } from "sonner";
import { GoogleMap } from "@/components/maps/GoogleMap";
import { useLocation } from "@/contexts/LocationContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function BloodHub() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { coordinates, city: userCity } = useLocation();
  const [donor, setDonor] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (user) {
        const { data: d } = await supabase.from("blood_donors").select("*").eq("user_id", user.id).maybeSingle();
        setDonor(d);
        const { data: mm } = await supabase.from("blood_donation_matches").select("*, blood_requests(*)").eq("donor_user_id", user.id).order("created_at", { ascending: false }).limit(10);
        setMatches(mm || []);
      }
      const { data: rq } = await supabase.from("blood_requests").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(20);
      setRequests(rq || []);
      const { data: c } = await supabase.from("blood_donation_campaigns").select("*").eq("is_active", true).gte("ends_at", new Date().toISOString()).order("starts_at").limit(10);
      setCampaigns(c || []);
    })();
  }, [user]);

  const shareRequest = (r: any) => {
    const text = `🚨 PEDIDO DE SANGUE URGENTE (${r.blood_type}) em ${r.city}!\nHospital: ${r.hospital_name_manual}\nPor favor, ajuda a partilhar ou doa se puderes. #MedWalletSangue #DoarFazBem`;
    const url = `${window.location.origin}/blood/request/${r.id}`;
    if (navigator.share) {
      navigator.share({ title: 'Pedido de Sangue Urgente', text, url });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank");
    }
  };

  const getPulseLevel = (donations: number) => {
    if (donations >= 10) return { name: "Herói Diamante", color: "text-cyan-500", icon: Star };
    if (donations >= 5) return { name: "Herói Ouro", color: "text-gold", icon: Award };
    if (donations >= 1) return { name: "Herói Bronze", color: "text-orange-500", icon: ShieldCheck };
    return { name: "Novo Doador", color: "text-muted-foreground", icon: Heart };
  };

  const pulse = getPulseLevel(donor?.total_donations ?? 0);

  return (
    <>
      <Seo title="Doação de sangue em Moçambique | MedWallet" description="Registe-se como dador ou peça sangue. Ligue doadores e pacientes em Moçambique." path="/blood" />
    <div className="p-4 space-y-4 max-w-4xl mx-auto pb-32">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center shadow-sm">
            <Droplet className="h-7 w-7 text-red-500 fill-red-500/20" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">MedWallet Sangue</h1>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Salvar vidas em Moçambique</p>
          </div>
        </div>
        {user && (
          <div className="bg-white/50 backdrop-blur-md px-4 py-2 rounded-2xl border flex items-center gap-3 shadow-sm">
            <Activity className="h-4 w-4 text-red-500 animate-pulse" />
            <div>
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">O Teu Pulse</p>
              <p className={cn("text-xs font-black", pulse.color)}>{pulse.name}</p>
            </div>
          </div>
        )}
      </header>

      {/* Rewards Highlight */}
      <section className="px-1">
        <div className="bg-gradient-to-r from-red-600 to-rose-500 rounded-[2rem] p-6 text-white relative overflow-hidden shadow-premium">
          <div className="relative z-10 flex items-center justify-between">
            <div className="max-w-[65%]">
              <Badge className="bg-white/20 text-white border-0 text-[9px] font-black uppercase mb-2">Incentivo Real</Badge>
              <h2 className="text-xl font-black leading-tight">Ganha 100 MZN + Pulse</h2>
              <p className="text-xs opacity-90 mt-1 font-medium leading-relaxed">
                Por cada doação verificada em hospitais parceiros, recebes saldo direto na tua carteira.
              </p>
            </div>
            <div className="h-16 w-16 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20">
              <Gift className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-white/5 rounded-full blur-3xl" />
        </div>
      </section>

      <Tabs defaultValue={donor ? "requests" : "donor"} className="w-full">
        <TabsList className="grid grid-cols-4 w-full h-12 bg-muted/50 p-1 rounded-2xl">
          <TabsTrigger value="donor" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">Doador</TabsTrigger>
          <TabsTrigger value="requests" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">Pedidos</TabsTrigger>
          <TabsTrigger value="campaigns" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">Campanhas</TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="donor" className="mt-6 space-y-6">
          {!user ? (
            <Card className="p-8 text-center space-y-4 border-dashed border-2">
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-black text-lg">Faz parte da rede</p>
                <p className="text-sm text-muted-foreground">Precisas de conta para te registares como doador e receber recompensas.</p>
              </div>
              <Button onClick={() => nav("/auth")} className="w-full h-12 rounded-xl font-bold">Entrar Agora</Button>
            </Card>
          ) : donor ? (
            <Card className="p-6 relative overflow-hidden border-none shadow-premium bg-white/50">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-3xl bg-red-500/10 flex items-center justify-center relative">
                  <pulse.icon className={cn("h-8 w-8", pulse.color)} />
                  <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-white">
                    {donor.blood_type}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black">{pulse.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <Badge variant={donor.is_available ? "default" : "outline"} className={cn("text-[9px] font-black", donor.is_available ? "bg-emerald-500" : "")}>
                      {donor.is_available ? "Disponível para Doar" : "Pausa Temporária"}
                    </Badge>
                    {donor.verified_at && <Badge className="bg-blue-500 text-[9px] font-black">Identidade Verificada</Badge>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 p-4 rounded-2xl">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Total de Doações</p>
                  <p className="text-2xl font-black">{donor.total_donations ?? 0}</p>
                </div>
                <div className="bg-muted/30 p-4 rounded-2xl">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Última Doação</p>
                  <p className="text-sm font-bold">
                    {donor.last_donation_date ? new Date(donor.last_donation_date).toLocaleDateString("pt-MZ") : "Nenhuma ainda"}
                  </p>
                </div>
              </div>

              <Button variant="outline" className="w-full mt-6 h-12 rounded-xl font-bold border-2" onClick={() => nav("/blood/register-donor")}>
                Gerir Perfil de Doador
              </Button>
            </Card>
          ) : (
            <Card className="p-8 text-center space-y-6 shadow-premium border-none">
              <div className="w-20 h-20 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto relative group">
                <Droplet className="h-10 w-10 text-red-500 group-hover:scale-110 transition-transform" />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1 bg-white p-1.5 rounded-full shadow-md"
                >
                  <Plus className="h-4 w-4 text-red-500" />
                </motion.div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black">Torna-te um Herói</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  O teu sangue pode salvar até 4 vidas. Recebe alertas urgentes em <strong>{userCity || "Moçambique"}</strong> e ajuda a tua comunidade.
                </p>
              </div>
              <Button className="w-full h-14 rounded-2xl font-black text-lg bg-red-500 hover:bg-red-600 shadow-lg" onClick={() => nav("/blood/register-donor")}>
                Registar-me como Doador
              </Button>
            </Card>
          )}

          <div className="bg-amber-500/5 border-2 border-amber-500/10 rounded-2xl p-5 flex gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-amber-600" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black text-amber-700 uppercase tracking-widest">Dica de Saúde</p>
              <p className="text-xs text-amber-900/80 leading-relaxed font-medium">
                Alimenta-te bem e bebe muita água antes de doar. O processo é rápido, seguro e faz toda a diferença nos hospitais nacionais.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="requests" className="mt-6 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" /> Pedidos Ativos ({requests.length})
            </h3>
            <Button size="sm" className="rounded-xl font-bold bg-primary" onClick={() => nav("/blood/request")}>
              <Plus className="h-4 w-4 mr-1" /> Novo Pedido
            </Button>
          </div>

          {requests.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed border-2">
              Não há pedidos de sangue abertos no momento.
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {requests.map((r) => (
                <Card key={r.id} className="p-5 hover:border-red-500/30 transition-all relative group overflow-hidden">
                  {r.urgency === "critical" && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-600" />
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-red-600 text-white border-0 font-black px-2 py-0.5">{r.blood_type}</Badge>
                        {r.urgency === "critical" && <Badge className="bg-red-100 text-red-700 border-red-200 animate-pulse text-[9px] font-black uppercase tracking-tighter">Crítico</Badge>}
                        {r.urgency === "urgent" && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] font-black uppercase tracking-tighter">Urgente</Badge>}
                      </div>
                      <h4 className="font-black text-base">{r.hospital_name_manual || "Hospital de Referência"}</h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 font-medium">
                        <MapPin className="h-3 w-3 text-red-500" /> {r.city}
                      </p>

                      <div className="mt-4 flex items-center gap-3">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 transition-all duration-1000"
                            style={{ width: `${Math.min(100, ((r.units_received ?? 0) / (r.units_needed ?? 1)) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase">
                          {r.units_received ?? 0}/{r.units_needed ?? 1} Units
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => shareRequest(r)}>
                        <Share2 className="h-4 w-4" />
                      </Button>
                      {donor?.blood_type === r.blood_type && donor?.is_available && (
                        <Button className="h-10 px-4 rounded-xl font-bold bg-red-600" onClick={async () => {
                          await supabase.from("blood_donation_matches").insert({ request_id: r.id, donor_user_id: user!.id });
                          toast.success("Obrigado! Receberás instruções para a doação em breve.");
                        }}>
                          Doar
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6 space-y-6">
          <Card className="h-64 rounded-3xl overflow-hidden shadow-premium border-none">
            <GoogleMap
              center={coordinates ? { lat: coordinates.latitude, lng: coordinates.longitude } : undefined}
              zoom={11}
              height="100%"
              markers={campaigns.map(c => ({
                id: c.id,
                lat: Number(c.latitude) || -25.9692,
                lng: Number(c.longitude) || 32.5732,
                title: c.title,
                description: c.city,
                color: "#ef4444"
              }))}
            />
          </Card>

          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Campanhas na tua Região</h3>
            {campaigns.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground italic text-sm">Sem campanhas de colheita móvel ativas agora.</div>
            ) : campaigns.map((c) => (
              <Card key={c.id} className="p-5 border-none shadow-sm bg-white hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-black text-base">{c.title}</h4>
                  <Badge className="bg-emerald-500 text-white border-0 text-[9px] font-black">Ativa</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-bold uppercase tracking-tighter">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    {new Date(c.starts_at).toLocaleDateString("pt-MZ")} – {new Date(c.ends_at).toLocaleDateString("pt-MZ")}
                  </p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-bold uppercase tracking-tighter">
                    <MapPin className="h-3.5 w-3.5 text-red-500" /> {c.city}
                  </p>
                </div>
                {c.description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4">{c.description}</p>}

                <div className="flex items-center justify-between border-t pt-4 mt-2">
                  <div className="flex -space-x-2">
                    {c.blood_types_needed?.slice(0, 3).map((t: string) => (
                      <div key={t} className="h-7 w-7 rounded-full bg-red-500 border-2 border-white text-white text-[8px] font-black flex items-center justify-center">
                        {t}
                      </div>
                    ))}
                    {c.blood_types_needed?.length > 3 && (
                      <div className="h-7 w-7 rounded-full bg-muted border-2 border-white text-[8px] font-black flex items-center justify-center">
                        +{c.blood_types_needed.length - 3}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="font-bold text-primary group">
                    Ver Detalhes <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6 space-y-4">
          <div className="bg-red-500/5 rounded-2xl p-6 border border-red-500/10 text-center space-y-2">
            <h3 className="font-black text-lg">A tua Jornada de Herói</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Cada gota conta. Aqui podes ver o impacto real que tiveste na saúde de Moçambique.
            </p>
          </div>

          {matches.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed border-2 text-sm italic">
              Ainda não tens histórico de doações registadas.
            </Card>
          ) : (
            <div className="space-y-3">
              {matches.map((m) => (
                <Card key={m.id} className="p-4 flex items-center justify-between border-none shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{m.blood_requests?.hospital_name_manual || "Doação Hospitalar"}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">{new Date(m.created_at).toLocaleDateString("pt-MZ")}</p>
                    </div>
                  </div>
                  <Badge variant={m.status === "completed" ? "default" : "outline"} className={cn("text-[9px] font-black uppercase", m.status === "completed" ? "bg-emerald-500" : "")}>
                    {m.status === "completed" ? "Validada" : m.status}
                  </Badge>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}
