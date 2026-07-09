import { useState, useEffect } from 'react';
import { useCountry } from '@/contexts/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Building2, Pill, Stethoscope, Beaker, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const icons: Record<string, any> = {
  hospital: <Building2 className="text-red-500" />,
  pharmacy: <Pill className="text-emerald-500" />,
  clinic: <Stethoscope className="text-blue-500" />,
  lab: <Beaker className="text-purple-500" />
};

export default function FacilityExplorer() {
  const { country, t } = useCountry();
  const [facilities, setFacilities] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function load() {
      let q = supabase.from('health_facilities').select('*').eq('country_id', country?.id);
      if (filter !== 'all') q = q.eq('type', filter);
      const { data } = await q;
      setFacilities(data || []);
    }
    load();
  }, [country, filter]);

  return (
    <div className="p-4 space-y-6 pb-20">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black">Centro de Saúde Global</h1>
        <p className="text-sm text-muted-foreground">Tudo o que precisas em {country?.name}</p>
      </header>

      {/* Tabs de Filtro */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {['all', 'hospital', 'clinic', 'pharmacy', 'lab'].map(type => (
          <Badge
            key={type}
            variant={filter === type ? 'default' : 'outline'}
            className="cursor-pointer capitalize px-4 py-1.5 rounded-full"
            onClick={() => setFilter(type)}
          >
            {type === 'all' ? 'Todos' : type}
          </Badge>
        ))}
      </div>

      <div className="grid gap-4">
        {facilities.map(f => (
          <Card key={f.id} className="p-4 flex gap-4 items-start hover:shadow-md transition-shadow">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center shrink-0">
              {icons[f.type] || <Building2 />}
            </div>
            <div className="flex-1">
              <h3 className="font-bold">{f.name}</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {f.address?.city || 'Localização central'}
              </p>
              <div className="flex gap-1 mt-2">
                {f.services?.slice(0, 3).map((s: string) => (
                  <span key={s} className="text-[10px] bg-secondary/20 text-secondary-foreground px-2 py-0.5 rounded">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-primary font-bold">★ {f.rating}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
