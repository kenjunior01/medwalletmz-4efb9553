import { useState } from 'react';
import { uploadImageToStorage } from '@/lib/imageUpload';
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

import { GoogleAddressInput } from '@/components/maps/GoogleAddressInput';
import { GoogleMap } from '@/components/maps/GoogleMap';

import { useCountry } from '@/contexts/CountryContext';

const ENTITY_TYPES = [
  { v: 'pharmacy', label: 'pharmacy', icon: Store, hint: 'Vende medicamentos ao público' },
  { v: 'clinic', label: 'clinic', icon: Building2, hint: 'Consultas e exames ambulatórios' },
  { v: 'hospital', label: 'hospitals', icon: Hospital, hint: 'Atendimento com internamento' },
  { v: 'lab', label: 'laboratories', icon: Building2, hint: 'Análises clínicas / imagens' },
];

/**
 * /suggest-place — qualquer utilizador autenticado pode sugerir
 * uma farmácia/clínica/hospital/laboratório novo.
 *
 * - Vai para `place_proposals` com source='user_submit', status='pending'.
 * - O admin revê em /admin/curation e aprova.
 * - Na aprovação: o utilizador recebe saldo na wallet + Pulse
 *   (configurável em place_proposal_settings).
 */
export default function SuggestPlace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { country, t } = useCountry();
  const { coordinates, requestLocation, loading: gpsLoading } = useLocation();

  const availableCities = country?.config?.cities || ['Maputo', 'Matola', 'Beira', 'Nampula'];

  const [entityType, setEntityType] = useState("pharmacy");
  const [name, setName] = useState("");
  const [city, setCity] = useState(availableCities[0]);
  const [neighborhood, setNeighborhood] = useState("");
  const [referencePoint, setReferencePoint] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
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
          <h2 className="font-bold text-lg">{t('health.suggest_place')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('profile.login_to_continue')}
          </p>
          <Button className="mt-4 w-full" onClick={() => navigate("/auth")}>
            {t('auth.login')} / {t('auth.register')}
          </Button>
          <Button variant="ghost" className="mt-2 w-full" onClick={() => navigate(-1)}>
            {t('common.back')}
          </Button>
        </Card>
      </div>
    );
  }

  const handleImageUpload = async (file: File) => {
    if (!user) {
      toast.error('Inicia sessão para carregar a imagem');
      return;
    }

    setUploadingImage(true);
    try {
      const path = await uploadImageToStorage(file, { bucket: 'licenses', folder: 'place-images' });
      const { data } = await supabase.storage.from('licenses').createSignedUrl(path, 60 * 60 * 24 * 365);
      if (data?.signedUrl) {
        setImageUrl(data.signedUrl);
        toast.success('Imagem carregada com sucesso');
      } else {
        throw new Error('Não foi possível gerar a URL da imagem');
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao carregar a imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  const submit = async () => {
    if (!name.trim()) return toast.error(t('health.place_name_label'));
    if (!city) return toast.error(t('common.error'));
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
        country_id: country?.id || 'MZ',
        status: "pending",
      };

      const { error } = await (supabase as any).from("place_proposals").insert(payload);
      if (error) throw error;
      setDone(true);
      toast.success(t('health.suggest_success_title'));
    } catch (e: any) {
      toast.error(e?.message ?? t('common.error'));
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
            <h2 className="font-bold text-lg">{t('health.suggest_success_title')}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t('health.suggest_success_desc')}
            </p>
            <div className="bg-primary/5 rounded-lg p-3 mt-3 flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-black text-primary">+{rewardMzn}</p>
                <p className="text-[10px] text-muted-foreground">{country?.currency_code || 'MZN'}</p>
              </div>
              <div className="text-2xl text-muted-foreground">+</div>
              <div className="text-center">
                <p className="text-2xl font-black text-gold">+{rewardJoy}</p>
                <p className="text-[10px] text-muted-foreground">Pulse</p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => { setDone(false); setName(""); setAddress(""); setPhone(""); setDescription(""); setImageUrl(""); setNeighborhood(""); setReferencePoint(""); }}>
                {t('health.suggest_another')}
              </Button>
              <Button className="flex-1" onClick={() => navigate("/")}>{t('health.done')}</Button>
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
          <h1 className="text-lg font-bold">{t('health.suggest_place')}</h1>
          <p className="text-[11px] text-muted-foreground">
            {t('home.suggest_place_desc')}
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
              <p className="text-sm font-bold">+{rewardMzn} {country?.currency_code || 'MZN'} + {rewardJoy} 🪙</p>
              <p className="text-[11px] text-muted-foreground">{t('health.suggest_place_hero_desc')}</p>
            </div>
            <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] uppercase font-black">BÓNUS</Badge>
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
              {ENTITY_TYPES.map((type) => {
                const Icon = type.icon;
                const active = entityType === type.v;
                return (
                  <button
                    type="button"
                    key={type.v}
                    onClick={() => setEntityType(type.v)}
                    className={`p-2 rounded-xl border text-center transition ${active ? "border-primary bg-primary/10" : "border-border bg-card"
                      }`}
                  >
                    <Icon className={`h-5 w-5 mx-auto ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-[10px] font-semibold mt-1">{t(`nav.${type.label}`)}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('health.identification')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div>
              <Label>{t('health.place_name_label')}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('health.place_name_placeholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>{t('doctor_register.country_of_practice')} / {t('common.in')}</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableCities.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('health.neighborhood_label')}</Label>
                <Input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder={t('health.neighborhood_placeholder')}
                />
              </div>
            </div>

            <div>
              <Label>{t('health.reference_point_label')}</Label>
              <Input
                value={referencePoint}
                onChange={(e) => setReferencePoint(e.target.value)}
                placeholder={t('health.reference_point_placeholder')}
              />
            </div>

            <div>
              <Label>{t('health.address_label')}</Label>
              <GoogleAddressInput
                value={address}
                onChange={(val, info) => {
                  setAddress(val);
                  if (info) {
                    setLat(String(info.lat));
                    setLng(String(info.lng));
                    if (info.neighborhood) setNeighborhood(info.neighborhood);
                  }
                }}
                placeholder={t('health.address_placeholder')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('health.contacts_and_image')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>{t('doctor_register.phone')}</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={country?.config?.phone_placeholder || "+258 ..."}
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
              <Label>{t('health.photo_url_label')}</Label>
              <div className="flex gap-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
                <label className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background hover:bg-accent cursor-pointer">
                  {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                </label>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {t('health.photo_upload_hint')}
              </p>
            </div>
            <div>
              <Label>{t('health.observations_label')}</Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('health.observations_placeholder')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" /> {t('health.exact_location')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="h-48 rounded-lg overflow-hidden border border-border">
              <GoogleMap
                center={lat && lng ? { lat: Number(lat), lng: Number(lng) } : (coordinates ? { lat: coordinates.latitude, lng: coordinates.longitude } : undefined)}
                zoom={15}
                height="100%"
                markers={[{
                  id: 'current',
                  lat: Number(lat) || coordinates?.latitude || -25.9692,
                  lng: Number(lng) || coordinates?.longitude || 32.5732,
                  draggable: true,
                  onDragEnd: (la, ln) => {
                    setLat(String(la));
                    setLng(String(ln));
                  }
                }]}
                onMapClick={(la, ln) => {
                  setLat(String(la));
                  setLng(String(ln));
                }}
              />
            </div>
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
              {t('health.use_my_location')}
            </Button>
            <p className="text-[10px] text-muted-foreground">
              {t('health.map_hint')}
            </p>
          </CardContent>
        </Card>

        <Button type="submit" disabled={submitting} className="w-full h-12 font-black">
          {submitting
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('common.loading')}</>
            : <><Sparkles className="h-4 w-4 mr-2" /> {t('health.submit_and_earn')} +{rewardMzn} {country?.currency_code || 'MZN'}</>}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          {t('health.submit_notice')}
        </p>
      </form>
    </div>
  );
}