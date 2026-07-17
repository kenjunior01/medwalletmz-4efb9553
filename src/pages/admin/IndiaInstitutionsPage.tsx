/**
 * IndiaInstitutionsPage — Command Center for Indian healthcare institutions
 * Shows: stats, filterable grid of 50+ hospitals/clinics/pharmacies/labs,
 * each card with image, address, rating, Google Maps embed preview, contact info.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { useCountry } from "@/contexts/CountryContext";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Building2, Hospital, Store, FlaskConical, MapPin, Phone, Globe,
  Star, ShieldCheck, Search, Navigation, Activity, TrendingUp, Users,
  Heart, Pill, Microscope,
} from "lucide-react";
import { GoogleMap, type GMarker } from "@/components/maps/GoogleMap";
import { GoogleMapEmbed } from "@/components/maps/GoogleMapEmbed";
import { useLocation } from "@/contexts/LocationContext";

type Institution = {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'lab';
  city: string;
  address: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  image_url?: string;
  logo_url?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  is_verified?: boolean;
  source: 'stores' | 'clinics' | 'laboratories';
};

const CITIES = ['all','Mumbai','Delhi','Bangalore','Chennai','Hyderabad','Pune','Jaipur','Kochi','Gurgaon','Vellore','Mohali'];
const TYPES  = [
  { value:'all',           label:'Todos os Tipos' },
  { value:'hospital',      label:'Hospitais' },
  { value:'clinic',        label:'Clínicas' },
  { value:'pharmacy',      label:'Farmácias' },
  { value:'lab',           label:'Laboratórios' },
];

const TYPE_META: Record<Institution['type'], { label:string; icon:any; color:string; gradient:string }> = {
  hospital:  { label:'Hospital',     icon: Hospital,        color:'#dc2626', gradient:'from-red-500/20 to-orange-500/10' },
  clinic:    { label:'Clínica',      icon: Building2,       color:'#7c3aed', gradient:'from-purple-500/20 to-fuchsia-500/10' },
  pharmacy:  { label:'Farmácia',     icon: Store,           color:'#0ea5e9', gradient:'from-sky-500/20 to-cyan-500/10' },
  lab:       { label:'Laboratório',  icon: FlaskConical,    color:'#f59e0b', gradient:'from-amber-500/20 to-yellow-500/10' },
};

export default function IndiaInstitutionsPage() {
  const { country, setCountryById } = useCountry();
  // Force-lock the country context to India on this page
  if (country?.id !== 'IN') setCountryById('IN');

  // Localização do utilizador (para o modo "Direções" do GoogleMapEmbed)
  const { coordinates } = useLocation();
  const userOrigin = coordinates
    ? { lat: coordinates.latitude, lng: coordinates.longitude }
    : null;

  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fetch all India institutions in parallel
  const { data: institutions = [], isLoading } = useQuery<Institution[]>({
    queryKey: ['india-institutions'],
    queryFn: async () => {
      const [
        { data: stores, error: e1 },
        { data: clinics, error: e2 },
        { data: labs, error: e3 },
      ] = await Promise.all([
        (supabase as any).from('stores').select('id,name,type,city,address,phone,image_url,latitude,longitude,rating,description,country_id').eq('country_id','IN'),
        (supabase as any).from('clinics').select('id,name,type,city,address,phone,email,website,image_url,latitude,longitude,is_verified,rating,description,country_id').eq('country_id','IN'),
        (supabase as any).from('laboratories').select('id,name,city,address,phone,email,website,logo_url,latitude,longitude,rating,description,country_id').eq('country_id','IN'),
      ]);
      if (e1) console.warn(e1);
      if (e2) console.warn(e2);
      if (e3) console.warn(e3);

      const pharmacyRows: Institution[] = ((stores || []) as any[])
        .filter((s:any) => s.type === 'pharmacy')
        .map((s:any) => ({
          id: s.id, name: s.name, type: 'pharmacy', city: s.city, address: s.address,
          phone: s.phone, image_url: s.image_url, latitude: s.latitude, longitude: s.longitude,
          rating: Number(s.rating) || 0, is_verified: true, description: s.description, source: 'stores',
        }));
      const clinicRows: Institution[] = ((clinics || []) as any[])
        .map((c:any) => ({
          id: c.id, name: c.name,
          type: (c.type === 'hospital' ? 'hospital' : c.type === 'laboratory' ? 'lab' : 'clinic') as Institution['type'],
          city: c.city, address: c.address, phone: c.phone, email: c.email, website: c.website,
          image_url: c.image_url, latitude: c.latitude, longitude: c.longitude,
          rating: Number(c.rating) || 0, is_verified: c.is_verified, description: c.description, source: 'clinics',
        }));
      const labRows: Institution[] = ((labs || []) as any[])
        .map((l:any) => ({
          id: l.id, name: l.name, type: 'lab', city: l.city, address: l.address, phone: l.phone,
          email: l.email, website: l.website, image_url: l.logo_url, latitude: l.latitude, longitude: l.longitude,
          rating: Number(l.rating) || 0, is_verified: true, description: l.description, source: 'laboratories',
        }));

      return [...pharmacyRows, ...clinicRows, ...labRows];
    },
    staleTime: 60_000,
  });

  // Computed stats
  const stats = useMemo(() => {
    const s = {
      total: institutions.length,
      hospital: institutions.filter(i => i.type === 'hospital').length,
      clinic:  institutions.filter(i => i.type === 'clinic').length,
      pharmacy:institutions.filter(i => i.type === 'pharmacy').length,
      lab:     institutions.filter(i => i.type === 'lab').length,
      verified: institutions.filter(i => i.is_verified).length,
      cities: new Set(institutions.map(i => i.city)).size,
      avgRating: institutions.length
        ? (institutions.reduce((sum,i) => sum + (i.rating||0), 0) / institutions.length).toFixed(2)
        : '0.00',
    };
    return s;
  }, [institutions]);

  // Apply filters
  const filtered = useMemo(() => {
    return institutions.filter(i => {
      if (cityFilter !== 'all' && i.city !== cityFilter) return false;
      if (typeFilter !== 'all' && i.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          i.name.toLowerCase().includes(q) ||
          (i.city || '').toLowerCase().includes(q) ||
          (i.address || '').toLowerCase().includes(q) ||
          (i.description || '').toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a,b) => (b.rating||0) - (a.rating||0));
  }, [institutions, cityFilter, typeFilter, search]);

  const selected = useMemo(
    () => institutions.find(i => i.id === selectedId) || null,
    [institutions, selectedId]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* HERO — India banner */}
      <div className="relative overflow-hidden border-b border-orange-500/30">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'linear-gradient(135deg,#FF9933 0%,#FFFFFF 50%,#138808 100%)',
            backgroundSize: 'cover',
          }}
        />
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
        <div className="relative px-8 py-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🇮🇳</span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">India Command Center</h1>
              <p className="text-sm text-slate-400 mt-1">
                Rede de saúde MedWallet · {stats.total} instituições · {stats.cities} cidades · ⭐ {stats.avgRating} médio
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">GST · 18%</Badge>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">UPI · Razorpay</Badge>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">DPDP Act 2023</Badge>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">CDSCO · NMC</Badge>
            <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30">Ayushman Bharat</Badge>
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 px-8 py-6">
        <StatCard label="Total" value={stats.total} icon={Activity}     color="#0ea5e9" />
        <StatCard label="Hospitais" value={stats.hospital} icon={Hospital}     color="#dc2626" />
        <StatCard label="Clínicas" value={stats.clinic}   icon={Building2}    color="#7c3aed" />
        <StatCard label="Farmácias" value={stats.pharmacy} icon={Store}        color="#0ea5e9" />
        <StatCard label="Labs" value={stats.lab}      icon={FlaskConical} color="#f59e0b" />
        <StatCard label="Verificadas" value={stats.verified} icon={ShieldCheck} color="#10b981" />
        <StatCard label="Cidades" value={stats.cities}  icon={MapPin}        color="#ec4899" />
      </div>

      {/* FILTERS */}
      <div className="px-8 pb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Procurar por nome, cidade, endereço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-900/60 border-slate-700 text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[160px] bg-slate-900/60 border-slate-700 text-slate-100">
            <SelectValue placeholder="Cidade" />
          </SelectTrigger>
          <SelectContent>
            {CITIES.map(c => (
              <SelectItem key={c} value={c}>{c === 'all' ? 'Todas as Cidades' : c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[170px] bg-slate-900/60 border-slate-700 text-slate-100">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="ml-auto border-slate-700 text-slate-300">
          {filtered.length} resultados
        </Badge>
      </div>

      {/* GRID OF CARDS */}
      <div className="px-8 pb-12">
        {isLoading ? (
          <div className="text-slate-400 text-sm">A carregar instituições indianas...</div>
        ) : filtered.length === 0 ? (
          <div className="text-slate-500 text-sm py-12 text-center">
            Nenhuma instituição encontrada com esses filtros.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((inst) => {
              const meta = TYPE_META[inst.type];
              const Icon = meta.icon;
              return (
                <Card
                  key={inst.id}
                  onClick={() => setSelectedId(inst.id)}
                  className={`group cursor-pointer bg-slate-900/60 border-slate-800 hover:border-${meta.color.replace('#','')}/60 transition-all hover:shadow-2xl overflow-hidden`}
                >
                  <div className={`relative h-40 bg-gradient-to-br ${meta.gradient} overflow-hidden`}>
                    {inst.image_url ? (
                      <img
                        src={inst.image_url}
                        alt={inst.name}
                        loading="lazy"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : null}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <Badge className={`bg-${meta.color.replace('#','')}/90 text-white`}>
                        <Icon className="h-3 w-3 mr-1" />
                        {meta.label}
                      </Badge>
                    </div>
                    {inst.is_verified && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-emerald-500/90 text-white">
                          <ShieldCheck className="h-3 w-3 mr-1" /> Verificado
                        </Badge>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-950 to-transparent">
                      <h3 className="font-semibold text-sm text-white line-clamp-2 leading-tight">
                        {inst.name}
                      </h3>
                    </div>
                  </div>
                  <CardContent className="p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-400">
                        <MapPin className="h-3 w-3" />
                        {inst.city}
                      </span>
                      {inst.rating ? (
                        <span className="flex items-center gap-1 text-amber-400">
                          <Star className="h-3 w-3 fill-current" />
                          {Number(inst.rating).toFixed(1)}
                        </span>
                      ) : null}
                    </div>
                    {inst.address ? (
                      <p className="text-slate-500 line-clamp-1">{inst.address}</p>
                    ) : null}
                    {inst.phone ? (
                      <p className="flex items-center gap-1 text-slate-400">
                        <Phone className="h-3 w-3" />
                        {inst.phone}
                      </p>
                    ) : null}
                    <div className="flex gap-2 pt-1">
                      {inst.latitude && inst.longitude ? (
                        <a
                          href={`https://www.google.com/maps?q=${inst.latitude},${inst.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-400 hover:text-sky-300"
                        >
                          <Navigation className="h-3 w-3" /> Ver no Google Maps
                        </a>
                      ) : null}
                      {inst.website ? (
                        <a
                          href={inst.website}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300"
                        >
                          <Globe className="h-3 w-3" /> Site
                        </a>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAIL DRAWER */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-56 overflow-hidden">
              {selected.image_url ? (
                <img src={selected.image_url} alt={selected.name} className="w-full h-full object-cover" />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
              <button
                className="absolute top-3 right-3 bg-slate-950/70 hover:bg-slate-950 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm"
                onClick={() => setSelectedId(null)}
              >×</button>
              <div className="absolute bottom-3 left-4 right-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-orange-500/90 text-white">
                    {TYPE_META[selected.type].label}
                  </Badge>
                  {selected.is_verified ? (
                    <Badge className="bg-emerald-500/90 text-white">
                      <ShieldCheck className="h-3 w-3 mr-1" /> Verificado
                    </Badge>
                  ) : null}
                  {selected.rating ? (
                    <Badge className="bg-amber-500/90 text-white">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      {Number(selected.rating).toFixed(1)}
                    </Badge>
                  ) : null}
                </div>
                <h2 className="text-2xl font-bold text-white">{selected.name}</h2>
                <p className="text-sm text-slate-300 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {selected.address}, {selected.city}
                </p>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              {selected.description ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Descrição</h3>
                  <p className="text-sm text-slate-200">{selected.description}</p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selected.phone ? (
                  <ContactLine icon={Phone} label="Telefone" value={selected.phone} href={`tel:${selected.phone}`} />
                ) : null}
                {selected.email ? (
                  <ContactLine icon={Activity} label="Email" value={selected.email} href={`mailto:${selected.email}`} />
                ) : null}
                {selected.website ? (
                  <ContactLine icon={Globe} label="Website" value={selected.website.replace(/^https?:\/\//,'')} href={selected.website} />
                ) : null}
                {selected.latitude && selected.longitude ? (
                  <ContactLine
                    icon={Navigation}
                    label="Coordenadas"
                    value={`${selected.latitude.toFixed(4)}, ${selected.longitude.toFixed(4)}`}
                    href={`https://www.google.com/maps?q=${selected.latitude},${selected.longitude}`}
                  />
                ) : null}
              </div>

              {selected.latitude && selected.longitude ? (
                <GoogleMapEmbed
                  lat={selected.latitude}
                  lng={selected.longitude}
                  title={selected.name}
                  address={selected.address || selected.city}
                  origin={userOrigin}
                  mode="place"
                  height={300}
                />
              ) : null}

              {selected.website ? (
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline" className="border-slate-700 text-slate-200">
                    <a href={selected.website} target="_blank" rel="noreferrer">
                      <Globe className="h-3 w-3 mr-1" /> Visitar Site
                    </a>
                  </Button>
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                <MetricBox label="Cidade" value={selected.city} />
                <MetricBox label="Tipo" value={TYPE_META[selected.type].label} />
                <MetricBox label="Origem DB" value={selected.source} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- helpers ----------
function StatCard({ label, value, icon: Icon, color }: { label:string; value:number; icon:any; color:string }) {
  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 flex items-center gap-3"
      style={{ borderColor: `${color}40` }}
    >
      <div className="p-2 rounded-lg" style={{ background: `${color}20`, color }}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-xl font-bold text-slate-50 leading-none">{value}</div>
        <div className="text-[11px] uppercase tracking-wider text-slate-400 mt-1">{label}</div>
      </div>
    </div>
  );
}

function ContactLine({ icon: Icon, label, value, href }: { icon:any; label:string; value:string; href?:string }) {
  const content = (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
      <div className="p-1.5 rounded bg-slate-700/50 text-sky-400">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
        <div className="text-sm text-slate-200 truncate">{value}</div>
      </div>
    </div>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="block hover:scale-[1.02] transition-transform">
      {content}
    </a>
  ) : content;
}

function MetricBox({ label, value }: { label:string; value:string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-sm font-medium text-slate-200 capitalize">{value}</div>
    </div>
  );
}
