import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Search,
  MapPin,
  Star,
  PawPrint,
  ShieldCheck,
  Phone,
  ExternalLink
} from '@/components/icons/lucide-compat';
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface VetClinic {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  rating: number | null;
  is_verified: boolean;
  emergency_24h: boolean;
  services: string[] | null;
}

const SERVICE_LABELS: Record<string, string> = {
  consulta: 'Consulta',
  vacinacao: 'Vacinação',
  cirurgia: 'Cirurgia',
  banho: 'Banho & Tosa',
  emergencia: 'Emergência',
  laboratorio: 'Laboratório',
};

export default function Veterinary() {
  const navigate = useNavigate();
  const { t } = useCountry();
  const [vets, setVets] = useState<VetClinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: e } = await supabase
          .from('veterinary_clinics')
          .select('id,name,city,address,phone,rating,is_verified,emergency_24h,services')
          .eq('is_active', true)
          .order('rating', { ascending: false })
          .limit(60);
        if (e) throw e;
        if (!cancelled) setVets((data ?? []) as VetClinic[]);
      } catch (err) {
        logger.error('veterinary fetch failed', { error: err });
        if (!cancelled) setError('Não foi possível carregar as clínicas veterinárias.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vets;
    return vets.filter((v) =>
      v.name.toLowerCase().includes(q) ||
      (v.city ?? '').toLowerCase().includes(q) ||
      (v.address ?? '').toLowerCase().includes(q)
    );
  }, [vets, query]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">{t('veterinary.title')}</h1>
        <PawPrint className="h-6 w-6 text-primary" />
      </header>

      <div className="p-4 bg-primary/5 border-b flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-full">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">{t('veterinary.subtitle')}</p>
          <p className="text-[10px] text-muted-foreground">{t('veterinary.subtitle_desc')}</p>
        </div>
      </div>

      <div className="p-4">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder={t('veterinary.search_placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4" /> {t('veterinary.nearby')}
          </h2>

          {loading && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="p-4 animate-pulse bg-muted/40 h-24" />
              ))}
            </div>
          )}

          {!loading && error && (
            <Card className="p-4 text-sm text-muted-foreground">{error}</Card>
          )}

          {!loading && !error && filtered.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              {query
                ? 'Nenhuma clínica veterinária corresponde à pesquisa.'
                : 'Ainda não há clínicas veterinárias registadas na tua região.'}
            </Card>
          )}

          {!loading && filtered.map((vet) => (
            <Card key={vet.id} className="overflow-hidden p-0">
              <div className="flex">
                <div className="w-20 h-24 shrink-0 bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <PawPrint className="h-8 w-8 text-emerald-700 dark:text-emerald-300" />
                </div>
                <div className="flex-1 p-3 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-sm truncate">{vet.name}</h3>
                    {vet.is_verified && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none h-4 px-1 shrink-0">{t('veterinary.verified')}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1 truncate">
                    {[vet.address, vet.city].filter(Boolean).join(', ') || 'Moçambique'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground mb-2">
                    {(vet.rating ?? 0) > 0 && (
                      <span className="flex items-center gap-0.5 text-yellow-600 font-bold">
                        <Star className="h-3 w-3 fill-current" /> {Number(vet.rating).toFixed(1)}
                      </span>
                    )}
                    {vet.emergency_24h && (
                      <Badge variant="destructive" className="h-4 px-1 text-[9px]">24h</Badge>
                    )}
                    {(vet.services ?? []).slice(0, 3).map((s) => (
                      <span key={s} className="bg-muted rounded px-1.5 py-0.5">
                        {SERVICE_LABELS[s] ?? s}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {vet.phone && (
                      <Button size="sm" className="h-7 text-[10px] flex-1" asChild>
                        <a href={`tel:${vet.phone.replace(/\s/g, '')}`}>
                          <Phone className="h-3 w-3 mr-1" /> {t('veterinary.details') === 'Detalhes' ? 'Ligar' : 'Call'}
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] flex-1"
                      onClick={() => {
                        const q = encodeURIComponent([vet.name, vet.address, vet.city].filter(Boolean).join(', '));
                        window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank', 'noopener');
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" /> Mapa
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
