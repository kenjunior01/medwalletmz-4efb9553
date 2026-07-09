import { Seo } from "@/components/Seo";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Droplet, AlertCircle, Calendar, MapPin, Plus, Heart, Users, Share2, Info } from "lucide-react";
import { toast } from "sonner";
import { GoogleMap } from "@/components/maps/GoogleMap";
import { useLocation } from "@/contexts/LocationContext";

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

  return (
    <>
      <Seo title="Doação de sangue em Moçambique | MedWallet" description="Registe-se como dador ou peça sangue. Ligue doadores e pacientes em Moçambique." path="/blood" />
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="bento-card p-5 bg-gradient-to-br from-red-500/15 via-rose-500/10 to-transparent border-red-500/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-11 w-11 rounded-2xl bg-red-500/20 flex items-center justify-center">
            <Droplet className="h-6 w-6 text-red-500 fill-red-500/40" />
          </div>
          <div>
            <h1 className="text-2xl font-black">MedWallet Sangue</h1>
            <p className="text-xs text-muted-foreground">Doar sangue salva vidas. Ganha 100 MZN + 200 Joy Coins por doação.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue={donor ? "requests" : "donor"}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="donor"><Heart className="h-4 w-4 mr-1" />Doador</TabsTrigger>
          <TabsTrigger value="requests"><AlertCircle className="h-4 w-4 mr-1" />Pedidos</TabsTrigger>
          <TabsTrigger value="campaigns"><Calendar className="h-4 w-4 mr-1" />Campanhas</TabsTrigger>
          <TabsTrigger value="history"><Users className="h-4 w-4 mr-1" />Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="donor" className="mt-4 space-y-4">
          {!user ? (
            <div className="bento-card p-6 text-center">
              <p className="mb-3">Precisas de conta para te registares como doador.</p>
              <Button onClick={() => nav("/auth")}>Entrar</Button>
            </div>
          ) : donor ? (
            <div className="bento-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500 text-white">Tipo {donor.blood_type}</Badge>
                <Badge variant={donor.is_available ? "default" : "outline"}>
                  {donor.is_available ? "Disponível" : "Indisponível"}
                </Badge>
                {donor.verified_at && <Badge variant="outline">Verificado</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">Total de doações: <strong>{donor.total_donations ?? 0}</strong></p>
              {donor.last_donation_date && <p className="text-sm">Última: {new Date(donor.last_donation_date).toLocaleDateString("pt-MZ")}</p>}
              <Button variant="outline" className="w-full" onClick={() => nav("/blood/register-donor")}>Editar perfil</Button>
            </div>
          ) : (
            <div className="bento-card p-6 text-center space-y-3">
              <Droplet className="h-10 w-10 mx-auto text-red-500" />
              <p className="font-bold">Torna-te doador</p>
              <p className="text-sm text-muted-foreground">Registo em 2 minutos. Recebes alertas quando alguém precisar do teu tipo perto de ti.</p>
              <Button className="w-full" onClick={() => nav("/blood/register-donor")}>Quero ser doador</Button>
            </div>
          )}

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
            <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <p className="font-bold mb-1">Dica Meddy Sangue:</p>
              Hidrata-te bem antes de doar e certifica-te que tiveste uma refeição leve. O teu gesto pode salvar até 4 vidas em Moçambique!
            </div>
          </div>
        </TabsContent>

        <TabsContent value="requests" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{requests.length} pedidos abertos</p>
            <Button size="sm" onClick={() => nav("/blood/request")}><Plus className="h-4 w-4 mr-1" />Novo pedido</Button>
          </div>
          {requests.length === 0 ? (
            <div className="bento-card p-6 text-center text-muted-foreground">Sem pedidos ativos.</div>
          ) : requests.map((r) => (
            <div key={r.id} className="bento-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-red-500 text-white">{r.blood_type}</Badge>
                    {r.urgency === "critical" && <Badge variant="destructive">Crítico</Badge>}
                    {r.urgency === "urgent" && <Badge className="bg-orange-500">Urgente</Badge>}
                  </div>
                  <p className="font-semibold">{r.hospital_name_manual || "Hospital"}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{r.city}</p>
                  {r.reason && <p className="text-xs mt-1">{r.reason}</p>}
                  <p className="text-xs mt-1">{r.units_received ?? 0}/{r.units_needed ?? 1} unidades</p>
                </div>
                {donor?.blood_type === r.blood_type && donor?.is_available && (
                  <Button size="sm" onClick={async () => {
                    await supabase.from("blood_donation_matches").insert({ request_id: r.id, donor_user_id: user!.id });
                    toast.success("Ofereceste-te para doar. O hospital vai contactar-te.");
                  }}>Doar</Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shareRequest(r)}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4 space-y-4">
          {campaigns.length > 0 && (
            <div className="h-44 rounded-xl overflow-hidden border border-border">
              <GoogleMap
                center={coordinates ? { lat: coordinates.latitude, lng: coordinates.longitude } : undefined}
                zoom={12}
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
            </div>
          )}

          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <div className="bento-card p-6 text-center text-muted-foreground">Sem campanhas ativas.</div>
            ) : campaigns.map((c) => (
              <div key={c.id} className="bento-card p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-bold text-sm">{c.title}</p>
                  <Badge variant="secondary" className="text-[9px]">Campanha Ativa</Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {new Date(c.starts_at).toLocaleDateString("pt-MZ")} – {new Date(c.ends_at).toLocaleDateString("pt-MZ")}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" /> {c.city}
                </p>
                {c.description && <p className="text-xs mt-2 text-muted-foreground line-clamp-2">{c.description}</p>}
                {c.blood_types_needed?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {c.blood_types_needed.map((t: string) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-3">
          {matches.length === 0 ? (
            <div className="bento-card p-6 text-center text-muted-foreground">Ainda não tens histórico de doações.</div>
          ) : matches.map((m) => (
            <div key={m.id} className="bento-card p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{m.blood_requests?.hospital_name_manual || "Pedido"}</p>
                <p className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString("pt-MZ")}</p>
              </div>
              <Badge variant={m.status === "completed" ? "default" : "outline"}>{m.status}</Badge>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}
