import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles } from 'lucide-react';

type Item = { id: number; slug: string; title: string; file: any };

export function KlipyBanner({ query }: { query?: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke('klipy', {
        body: {
          kind: query ? 'search' : 'trending',
          media: 'gifs',
          query,
          per_page: 12,
          customer_id: user?.id || 'guest',
        },
      });
      if (cancelled) return;
      if (!error && data?.data?.data) setItems(data.data.data.slice(0, 12));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [query, user?.id]);

  if (!loading && items.length === 0) return null;

  return (
    <section className="px-4 mt-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-secondary" />
        <h2 className="text-sm font-bold">Momentos MedWallet</h2>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar snap-x">
        {(loading ? Array.from({ length: 6 }) : items).map((it: any, i) => (
          <div key={it?.id ?? i} className="snap-start shrink-0 w-28 h-28 rounded-xl overflow-hidden bg-muted">
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