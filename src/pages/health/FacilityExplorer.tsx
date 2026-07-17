import { useState, useEffect } from 'react';
import { useCountry } from '@/contexts/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Building2, Pill, Stethoscope, Beaker, MapPin, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SafeImage } from '@/components/ui/safe-image';
import { useNavigate } from 'react-router-dom';

const icons: Record<string, any> = {
  hospital: <Building2 className="text-red-500 h-5 w-5" />,
  pharmacy: <Pill className="text-emerald-500 h-5 w-5" />,
  clinic: <Stethoscope className="text-blue-500 h-5 w-5" />,
  laboratory: <Beaker className="text-purple-500 h-5 w-5" />,
  lab: <Beaker className="text-purple-500 h-5 w-5" />
};

export default function FacilityExplorer() {
  const { country, t } = useCountry();
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        let allData: any[] = [];

        // Se o filtro for 'all' ou 'pharmacy', buscamos nas 'stores'
        if (filter === 'all' || filter === 'pharmacy') {
          let sq: any = (supabase as any).from('stores').select('*').eq('is_active', true);
          if (country?.id) sq = sq.eq('country_id', country.id);
          if (filter === 'pharmacy') sq = sq.eq('type', 'pharmacy');
          const { data: stores } = await sq;
          if (stores) allData = [...allData, ...stores];
        }

        // Se o filtro for 'all' ou um dos tipos de clínicas
        if (filter !== 'pharmacy') {
          let cq: any = (supabase as any).from('clinics').select('*').eq('is_active', true);
          if (country?.id) cq = cq.eq('country_id', country.id);
          if (filter !== 'all') cq = cq.eq('type', filter === 'lab' ? 'laboratory' : filter);
          const { data: clinics } = await cq;
          if (clinics) allData = [...allData, ...clinics];
        }

        setFacilities(allData.sort((a, b) => (b.rating || 0) - (a.rating || 0)));
      } catch (e) {
        console.error("Erro ao carregar instituições:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [country, filter]);

  return (
    <div className="p-4 space-y-6 pb-24 animate-fade-in">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black">Centro de Saúde Global</h1>
        <p className="text-sm text-muted-foreground">Tudo o que precisas em {country?.name || 'Moçambique'}</p>
      </header>

      {/* Tabs de Filtro */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {['all', 'hospital', 'clinic', 'pharmacy', 'lab'].map(type => (
          <Badge
            key={type}
            variant={filter === type ? 'default' : 'outline'}
            className="cursor-pointer capitalize px-4 py-1.5 rounded-full whitespace-nowrap"
            onClick={() => setFilter(type)}
          >
            {type === 'all' ? 'Todos' : type}
          </Badge>
        ))}
      </div>

      <div className="grid gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 h-24 animate-pulse bg-muted/50 border-none" />
          ))
        ) : facilities.length === 0 ? (
          <div className="text-center py-12 opacity-50">
            <Building2 className="h-12 w-12 mx-auto mb-2" />
            <p>Nenhuma instituição encontrada nesta categoria.</p>
          </div>
        ) : (
          facilities.map(f => (
            <Card
              key={f.id}
              className="p-3 flex gap-4 items-center hover:shadow-md transition-all cursor-pointer border-2 hover:border-primary/20"
              onClick={() => navigate(f.type === 'pharmacy' ? `/store/${f.id}` : `/health/facilities/${f.id}`)}
            >
              <div className="h-16 w-16 rounded-2xl overflow-hidden shrink-0 bg-muted">
                <SafeImage
                  src={f.image_url || f.logo_url}
                  alt={f.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm truncate">{f.name}</h3>
                  <Badge variant="outline" className="text-[9px] h-4 px-1 uppercase opacity-70">
                    {f.type}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" /> {f.city} {f.address ? `· ${f.address}` : ''}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <span className="text-[11px] font-bold">{f.rating?.toFixed(1) || '5.0'}</span>
                  </div>
                  {f.is_verified && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] h-4">
                      Verificado
                    </Badge>
                  )}
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center border shrink-0">
                {icons[f.type] || <Building2 className="h-5 w-5 text-slate-400" />}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
