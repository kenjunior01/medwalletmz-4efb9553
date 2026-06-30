import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ArrowLeft, Store, Building2, Hospital, MapPin, Phone,
  Upload, Sparkles, Award, Loader2, CheckCircle2, Navigation, Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

const ENTITY_TYPES = [
  { v: 'pharmacy', label: 'Farmácia',         icon: Store,     hint: 'Vende medicamentos ao público' },
  { v: 'clinic',   label: 'Clínica',          icon: Building2, hint: 'Consultas e exames ambulatórios' },
  { v: 'hospital', label: 'Hospital',         icon: Hospital,  hint: 'Atendimento com internamento' },
  { v: 'lab',      label: 'Laboratório',      icon: Building2, hint: 'Análises clínicas / imagens' },
];

const MZ_CITIES = ['Maputo', 'Matola', 'Beira', 'Nampula', 'Quelimane', 'Tete', 'Xai-Xai', 'Lichinga', 'Pemba', 'Inhambane'];

/**
 * /suggest-place — qualquer utilizador autenticado pode sugerir
 * uma farmácia/clínica/hospital/laboratório novo.
 *
 * - Vai para `place_proposals` com source='user_submit', status='pending'.
 * - O admin revê em /admin/curation e aprova.
 * - Na aprovação: o utilizador recebe +25 MZN na wallet + +50 JoyCoins
 *   (configurável em place_proposal_settings).
 */
export default function SuggestPlace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { coordinates, requestLocation, loading: gpsLoading } = useLocation();

  const [entityType, setEntityType] = useState("pharmacy");
  const [name, setName] = useState("");
  const [city, setCity] = useState("Maputo");
  const [neighborhood, setNeighborhood] = useState("");
  const [referencePoint, setReferencePoint] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const { data: rewardSettings } = useQuery({
    queryKey: ["place-proposal-settings", "reward"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("place_proposal_settings")
        .select("key,value")
        .in("key", ["reward_mzn_per_approval", "reward_joy_coins_per_approval", "max_pending_per_user"]);
      const out: Record<string, any> = {};
      (data ?? []).forEach((s: any) => { out[s.key] = s.value; });
      return out;
    },
  });

  const rewardMzn = Number(rewardSettings?.reward_mzn_per_approval ?? 25);
  const rewardJoy = Number(rewardSettings?.reward_joy_coins_per_approval ?? 50);

  const useCurrentLocation = () => {
    requestLocation();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6">
          <Store className="h-10 w-10 mx-auto text-primary mb-2" />
          <h2 className="font-bold text-lg">Sugerir farmácia ou clínica</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Para sugerir um novo local, precisas estar autenticado.
          </p>
          <Button className="mt-4 w-full" onClick={() => navigate("/auth")}>
            Entrar / Criar conta
          </Button>
          <Button variant="ghost" className="mt-2 w-full" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </Card>
      </div>
    );
  }

  const submit = async () => {
    if (!name.trim()) return toast.error("Indica o nome do local");
    if (!city) return toast.error("Indica a cidade");
    setSubmitting(true);
    try {
      const payload: any = {
        source: "user_submit",
        entity_type: entityType,
        name: name.trim(),
        address: address || null,
        city,
        neighborhood: neighborhood || null,
        reference_point: referencePoint || null,
        phone: phone || null,
        website: website || null,
        description: description || null,
        image_url: imageUrl || null,
        latitude: lat ? Number(lat) : coordinates?.latitude ?? null,
        longitude: lng ? Number(lng) : coordinates?.longitude ?? null,
        proposed_by: user.id,
        reward_mzn: rewardMzn,
        reward_joy_coins: rewardJoy,
        status: "pending",
      };

      const { error } = await (supabase as any).from("place_proposals").insert(payload);
      if (error) throw error;
      setDone(true);
      toast.success("Sugestão enviada! Vamos analisar e avisar-te.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro a enviar");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-6">
            <CheckCircle2 className="h-14 w-14 text-primary mx-auto mb-2" />
            <h2 className="font-bold text-lg">Sugestão enviada!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Vamos validar as informações e publicar. Quando for aprovada, recebes:
            </p>
            <div className="bg-primary/5 rounded-lg p-3 mt-3 flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-black text-primary">+{rewardMzn}</p>
                <p className="text-[10px] text-muted-foreground">MZN</p>
              </div>
              <div className="text-2xl text-muted-foreground">+</div>
              <div className="text-center">
                <p className="text-2xl font-black text-gold">+{rewardJoy}</p>
                <p className="text-[10px] text-muted-foreground">JoyCoins</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              A notificação chega via push + email assim que o admin publicar.
            </p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => { setDone(false); setName(""); setAddress(""); setPhone(""); setDescription(""); setImageUrl(""); setNeighborhood(""); setReferencePoint(""); }}>
                Sugerir outro
              </Button>
              <Button className="flex-1" onClick={() => navigate("/")}>Concluído</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Sugerir local</h1>
          <p className="text-[11px] text-muted-foreground">
            Ajuda a comunidade — ganhas saldo quando publicarmos.
          </p>
        </div>
      </header>

      {/* Reward hero */}
      <section className="px-4 pt-4">
        <Card className="overflow-hidden border-none bg-gradient-to-br from-gold/20 via-secondary/10 to-primary/10 p-4 relative">
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-gold/15 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gold flex items-center justify-center shrink-0">
              <Award className="h-5 w-5 text-gold-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">+{rewardMzn} MZN + {rewardJoy} 🪙</p>
              <p className="text-[11px] text-muted-foreground">quando o local for aprovado pelo admin</p>
            </div>
            <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">BÓNUS</Badge>
          </div>
        </Card>
      </section>

      {/* Form */}
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="px-4 pt-4 space-y-4"
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Tipo de local
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-4 gap-2">
              {ENTITY_TYPES.map((t) => {
                const Icon = t.icon;
                const active = entityType === t.v;
                return (
                  <button
                    type="button"
                    key={t.v}
                    onClick={() => setEntityType(t.v)}
                    className={`p-2 rounded-xl border text-center transition ${
                      active ? "border-primary bg-primary/10" : "border-border bg-card"
                    }`}
                  >
                    <Icon className={`h-5 w-5 mx-auto ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-[10px] font-semibold mt-1">{t.label}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Identificação</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div>
              <Label>Nome do local *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Farmácia do Bairro"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Cidade *</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MZ_CITIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bairro / Zona</Label>
                <Input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Ex: Polana Caniço"
                />
              </div>
            </div>

            <div>
              <Label>Ponto de referência</Label>
              <Input
                value={referencePoint}
                onChange={(e) => setReferencePoint(e.target.value)}
                placeholder="Ex: perto do mercado municipal, ao lado do BCI"
              />
            </div>

            <div>
              <Label>Endereço (rua, número)</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Av. 24 de Julho, nº 123"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Contactos e imagem</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Telefone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+258 84 ..."
                />
              </div>
              <div>
                <Label>Website</Label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div>
              <Label>URL da foto (opcional)</Label>
              <div className="flex gap-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
                <Button type="button" variant="outline" size="icon">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Carrega uma foto para ajudar a identificar o local.
              </p>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Horário, especialidade, se tem atendimento 24h..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Localização
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Latitude</Label>
                <Input
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="-25.9692"
                />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="32.5732"
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={useCurrentLocation}
              disabled={gpsLoading}
            >
              {gpsLoading
                ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                : <Navigation className="h-3.5 w-3.5 mr-1" />}
              Usar minha localização
            </Button>
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <AlertTitle className="text-xs">Importante</AlertTitle>
              <AlertDescription className="text-[11px]">
                Enviamos a tua localização <strong>apenas</strong> para ajudar a equipa a
                confirmar no mapa. Não é partilhada com terceiros.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Button type="submit" disabled={submitting} className="w-full h-12">
          {submitting
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A enviar…</>
            : <><Sparkles className="h-4 w-4 mr-2" /> Submeter e ganhar +{rewardMzn} MZN</>}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          Submetendo, confirmas que as informações são verdadeiras. A equipa MedWallet
          pode ajustar antes de publicar.
        </p>
      </form>
    </div>
  );
}