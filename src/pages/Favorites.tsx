import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Heart, Store, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';
import { supabase } from '@/integrations/supabase/client';

export default function Favorites() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { favorites, isStoreFavorite, isProductFavorite, toggleStoreFavorite, toggleProductFavorite } = useFavorites();

  const storeIds = favorites.filter(f => f.store_id).map(f => f.store_id!);
  const productIds = favorites.filter(f => f.product_id).map(f => f.product_id!);

  const { data: stores, isLoading: storesLoading } = useQuery({
    queryKey: ['favorite-stores', storeIds],
    queryFn: async () => {
      if (storeIds.length === 0) return [];
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .in('id', storeIds);
      if (error) throw error;
      return data;
    },
    enabled: storeIds.length > 0
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['favorite-products', productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      const { data, error } = await supabase
        .from('products')
        .select('*, store:stores(name)')
        .in('id', productIds);
      if (error) throw error;
      return data;
    },
    enabled: productIds.length > 0
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 animate-fade-in">
        <div className="p-6 bg-muted rounded-full mb-4">
          <Heart className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold mb-2">Faça Login</h2>
        <p className="text-muted-foreground text-center text-sm mb-4">
          Entre na sua conta para ver seus favoritos
        </p>
        <Button onClick={() => navigate('/auth')}>Entrar</Button>
      </div>
    );
  }

  const loading = storesLoading || productsLoading;

  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      <h1 className="text-2xl font-bold">Meus Favoritos</h1>

      <Tabs defaultValue="stores">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stores">
            Lojas {stores && stores.length > 0 && `(${stores.length})`}
          </TabsTrigger>
          <TabsTrigger value="products">
            Produtos {products && products.length > 0 && `(${products.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stores" className="flex flex-col gap-3 mt-4">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          ) : stores && stores.length > 0 ? (
            stores.map((store) => (
              <div
                key={store.id}
                className="flex gap-3 bg-card rounded-xl border border-border p-3 cursor-pointer hover:shadow-medium transition-all"
                onClick={() => navigate(`/store/${store.id}`)}
              >
                <img
                  src={store.image_url || '/placeholder.svg'}
                  alt={store.name}
                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold line-clamp-1">{store.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {store.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">{store.type}</Badge>
                    <span className="text-xs text-muted-foreground">{store.city}</span>
                  </div>
                </div>
                <FavoriteButton
                  isFavorite={isStoreFavorite(store.id)}
                  onToggle={() => toggleStoreFavorite(store.id)}
                  size="sm"
                />
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Store className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma loja favorita</p>
              <Button variant="link" onClick={() => navigate('/food')}>
                Explorar lojas
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="products" className="flex flex-col gap-3 mt-4">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          ) : products && products.length > 0 ? (
            products.map((product: any) => (
              <div
                key={product.id}
                className="flex gap-3 bg-card rounded-xl border border-border p-3"
              >
                <img
                  src={product.image_url || '/placeholder.svg'}
                  alt={product.name}
                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                    {product.store?.name}
                  </p>
                  <p className="text-primary font-bold mt-2">{product.price} MZN</p>
                </div>
                <FavoriteButton
                  isFavorite={isProductFavorite(product.id)}
                  onToggle={() => toggleProductFavorite(product.id)}
                  size="sm"
                />
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum produto favorito</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
