import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InfluencerPick {
  id: string;
  featured_text: string | null;
  product: { id: string; name: string; price: number; image_url: string | null; store_id: string } | null;
  store: { id: string; name: string; image_url: string | null; rating: number | null } | null;
  influencer: { full_name: string | null; avatar_url: string | null } | null;
}

export function InfluencerPicks() {
  const navigate = useNavigate();

  const { data: picks, isLoading } = useQuery({
    queryKey: ['influencer-picks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('influencer_picks')
        .select(`
          id,
          featured_text,
          product_id,
          store_id,
          influencer_id
        `)
        .limit(6);

      if (!data || data.length === 0) return [];

      // Fetch related data
      const productIds = data.map(d => d.product_id).filter(Boolean) as string[];
      const storeIds = data.map(d => d.store_id).filter(Boolean) as string[];
      const influencerIds = [...new Set(data.map(d => d.influencer_id))];

      const [products, stores, influencers] = await Promise.all([
        productIds.length > 0
          ? supabase.from('products').select('id, name, price, image_url, store_id').in('id', productIds)
          : { data: [] },
        storeIds.length > 0
          ? supabase.from('stores').select('id, name, image_url, rating').in('id', storeIds)
          : { data: [] },
        supabase.from('profiles').select('id, full_name, avatar_url').in('id', influencerIds)
      ]);

      return data.map(pick => ({
        id: pick.id,
        featured_text: pick.featured_text,
        product: (products.data || []).find(p => p.id === pick.product_id) || null,
        store: (stores.data || []).find(s => s.id === pick.store_id) || null,
        influencer: (influencers.data || []).find(i => i.id === pick.influencer_id) || null,
      })) as InfluencerPick[];
    }
  });

  if (isLoading || !picks || picks.length === 0) return null;

  // Group by influencer
  const influencerName = picks[0]?.influencer?.full_name || 'Influenciador';
  const influencerAvatar = picks[0]?.influencer?.avatar_url;

  return (
    <section className="px-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={influencerAvatar || undefined} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {influencerName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <h2 className="font-bold text-base">
            Escolhas de {influencerName}
          </h2>
        </div>
        <Button variant="ghost" size="sm" className="text-primary text-xs h-7 px-2">
          Ver tudo <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {picks.map((pick) => {
          const item = pick.product || pick.store;
          if (!item) return null;

          const isProduct = !!pick.product;
          const name = isProduct ? pick.product!.name : pick.store!.name;
          const image = isProduct ? pick.product!.image_url : pick.store!.image_url;
          const navigateTo = isProduct
            ? `/store/${pick.product!.store_id}`
            : `/store/${pick.store!.id}`;

          return (
            <Card
              key={pick.id}
              className="min-w-[150px] max-w-[150px] flex-shrink-0 overflow-hidden cursor-pointer hover:shadow-md transition-shadow border-border/50"
              onClick={() => navigate(navigateTo)}
            >
              <div className="h-24 bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
                {image && (
                  <img src={image} alt={name} className="w-full h-full object-cover" />
                )}
              </div>
              <CardContent className="p-2.5">
                <p className="font-semibold text-xs truncate">{name}</p>
                {pick.featured_text && (
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5 italic">
                    "{pick.featured_text}"
                  </p>
                )}
                {isProduct && (
                  <p className="text-xs font-bold text-primary mt-1">{pick.product!.price} MZN</p>
                )}
                {!isProduct && pick.store?.rating && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    <span className="text-xs text-muted-foreground">{pick.store.rating.toFixed(1)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
