import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { Sparkles } from 'lucide-react';

type Item = { id: number; slug: string; title: string; file: any };

export function KlipyBanner({ query }: { query?: string }) {
  const { user } = useAuth();
  const { country, t } = useCountry();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const countryName = country?.name || 'Moçambique';
  const countryQuery = country?.name ? `${country.name.toLowerCase()} healthcare` : 'africa doctor';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Mescla termo pedido + termos locais para devolver conteúdo mais relevante.
      const baseQuery = query || countryQuery;
      const { data, error } = await supabase.functions.invoke('klipy', {
        body: {
          kind: query ? 'search' : 'trending',
          media: 'gifs',
          query: baseQuery,
          per_page: 12,
          customer_id: user?.id || 'guest',
        },
      });
      if (cancelled) return;
      if (!error && data?.data?.data) setItems(data.data.data.slice(0, 12));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [query, user?.id, countryQuery]);

  if (!loading && items.length === 0) return null;

  return (
    <section className="px-4 mt-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-secondary" />
        <h2 className="text-sm font-black tracking-tight">{t('common.moments')} · {countryName}</h2>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar snap-x">
        {(loading ? Array.from({ length: 6 }) : items).map((it: any, i) => (
          <div key={it?.id ?? i} className="snap-start shrink-0 w-32 h-32 rounded-2xl overflow-hidden bg-muted border border-border/50">
            {it?.file && (
              <img
                src={it.file?.sm?.gif?.url || it.file?.md?.gif?.url || it.file?.xs?.gif?.url}
                alt={it.title}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
