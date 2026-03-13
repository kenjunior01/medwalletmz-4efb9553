import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, ArrowRight, Sparkles, UtensilsCrossed } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function DailyHighlights() {
  const navigate = useNavigate();

  // Fetch today's highlights, or fallback to random featured stores/products
  const { data: highlights } = useQuery({
    queryKey: ['daily-highlights', new Date().toISOString().slice(0, 10)],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      
      // Try daily_highlights table first
      const { data: manual } = await supabase
        .from('daily_highlights')
        .select('*, store:stores(id, name, image_url, rating, delivery_time, delivery_fee, type), product:products(id, name, image_url, price, store_id)')
        .eq('highlight_date', today)
        .eq('is_active', true);
      
      if (manual && manual.length > 0) return manual;

      // Fallback: auto-select top-rated store and a random product
      const { data: topStore } = await supabase
        .from('stores')
        .select('id, name, image_url, rating, delivery_time, delivery_fee, type')
        .eq('is_active', true)
        .order('rating', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: featuredProduct } = await supabase
        .from('products')
        .select('id, name, image_url, price, store_id')
        .eq('is_available', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const results: any[] = [];
      if (topStore) results.push({ 
        id: 'auto-store', highlight_type: 'store', store: topStore, product: null,
        title: 'Restaurante do Dia', subtitle: `⭐ ${topStore.rating || '4.5'} • ${topStore.type}`
      });
      if (featuredProduct) results.push({ 
        id: 'auto-product', highlight_type: 'product', store: null, product: featuredProduct,
        title: 'Prato em Destaque', subtitle: `${featuredProduct.price} MZN`
      });
      return results;
    }
  });

  if (!highlights?.length) return null;

  return (
    <section className="px-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-gold" />
        <h2 className="font-bold text-lg">Destaques do Dia</h2>
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {highlights.map((item: any) => {
          const isStore = item.highlight_type === 'store';
          const image = isStore ? item.store?.image_url : item.product?.image_url;
          const navigateTo = isStore 
            ? `/store/${item.store?.id}` 
            : `/store/${item.product?.store_id}`;

          return (
            <div
              key={item.id}
              className="flex-shrink-0 w-[260px] rounded-2xl overflow-hidden border border-gold/20 bg-gradient-to-br from-gold/5 to-secondary/5 cursor-pointer group transition-all hover:shadow-premium active:scale-[0.98]"
              onClick={() => navigateTo && navigate(navigateTo)}
            >
              <div className="relative h-28 bg-muted overflow-hidden">
                {image ? (
                  <img src={image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                    {isStore ? <UtensilsCrossed className="h-8 w-8 text-muted-foreground" /> : <Star className="h-8 w-8 text-gold" />}
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-gold text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> {isStore ? 'RESTAURANTE DO DIA' : 'DESTAQUE'}
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-bold text-sm">
                  {isStore ? item.store?.name : item.product?.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                {isStore && item.store && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-gold text-gold" /> {item.store.rating}
                    </span>
                    <span>•</span>
                    <span>{item.store.delivery_time || '20-40 min'}</span>
                    <span>•</span>
                    <span>{item.store.delivery_fee} MZN</span>
                  </div>
                )}
                <div className="flex items-center text-primary text-xs font-medium mt-2 group-hover:gap-1 transition-all">
                  Ver mais <ArrowRight className="h-3 w-3 ml-0.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
