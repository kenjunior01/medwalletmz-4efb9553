import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Smile, Loader2, Search } from 'lucide-react';

interface Props {
  customerId: string;
  onPick: (url: string, title: string) => void;
}

export function KlipyStickerPicker({ customerId, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'stickers' | 'gifs'>('stickers');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = async (query?: string) => {
    setLoading(true);
    const { data } = await supabase.functions.invoke('klipy', {
      body: { kind: query ? 'search' : 'trending', media: tab, query, per_page: 24, customer_id: customerId },
    });
    setItems(data?.data?.data || []);
    setLoading(false);
  };

  useEffect(() => { if (open) fetchItems(q || undefined); /* eslint-disable-next-line */ }, [open, tab]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" type="button" aria-label="Stickers"><Smile className="h-5 w-5" /></Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <div className="flex gap-1 mb-2">
          <Button size="sm" variant={tab === 'stickers' ? 'default' : 'ghost'} onClick={() => setTab('stickers')}>Stickers</Button>
          <Button size="sm" variant={tab === 'gifs' ? 'default' : 'ghost'} onClick={() => setTab('gifs')}>GIFs</Button>
        </div>
        <div className="flex gap-1 mb-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Procurar..." onKeyDown={(e) => e.key === 'Enter' && fetchItems(q)} />
          <Button size="icon" variant="outline" onClick={() => fetchItems(q || undefined)}><Search className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-3 gap-1 max-h-64 overflow-y-auto">
          {loading && <div className="col-span-3 flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>}
          {!loading && items.map((it: any) => {
            const url = it.file?.sm?.gif?.url || it.file?.md?.gif?.url || it.file?.xs?.gif?.url;
            if (!url) return null;
            return (
              <button key={it.id} type="button" className="aspect-square rounded overflow-hidden bg-muted hover:ring-2 ring-primary" onClick={() => { onPick(url, it.title || tab); setOpen(false); }}>
                <img src={url} alt={it.title} className="w-full h-full object-cover" loading="lazy" />
              </button>
            );
          })}
          {!loading && items.length === 0 && <p className="col-span-3 text-center text-xs text-muted-foreground p-4">Nada encontrado.</p>}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1">Powered by KLIPY</p>
      </PopoverContent>
    </Popover>
  );
}