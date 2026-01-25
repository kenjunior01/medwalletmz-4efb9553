import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useLocation } from '@/contexts/LocationContext';
import { useFavorites } from '@/hooks/useFavorites';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';
import { StoreReviews } from '@/components/reviews/StoreReviews';
import { toast } from 'sonner';
import { ArrowLeft, Star, Clock, MapPin, Plus, Minus, MessageSquare } from 'lucide-react';

export default function StoreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem, items, updateQuantity } = useCart();
  const { calculateDistance } = useLocation();
  const { isStoreFavorite, isProductFavorite, toggleStoreFavorite, toggleProductFavorite } = useFavorites();

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ['store', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', id)
        .eq('is_available', true)
        .order('category');
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const getItemQuantity = (productId: string) => {
    const item = items.find(i => i.id === productId);
    return item?.quantity || 0;
  };

  const handleAddItem = (product: any) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      store_id: product.store_id,
      store_name: store?.name
    });
    toast.success('Adicionado ao carrinho');
  };

  const distance = store?.latitude && store?.longitude 
    ? calculateDistance(store.latitude, store.longitude)
    : null;

  // Group products by category
  const productsByCategory = products?.reduce((acc: Record<string, typeof products>, product) => {
    const category = product.category || 'Outros';
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {} as Record<string, typeof products>);

  if (storeLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">Loja não encontrada</p>
        <Button variant="link" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-24">
      {/* Header Image */}
      <div className="relative h-48">
        <img
          src={store.image_url || '/placeholder.svg'}
          alt={store.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm rounded-full"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <FavoriteButton
          isFavorite={isStoreFavorite(store.id)}
          onToggle={() => toggleStoreFavorite(store.id)}
          variant="overlay"
          className="absolute top-4 right-4"
        />
      </div>

      {/* Store Info */}
      <div className="p-4 -mt-6 relative">
        <div className="bg-card rounded-xl border border-border p-4 shadow-lg">
          <h1 className="text-xl font-bold mb-2">{store.name}</h1>
          <p className="text-sm text-muted-foreground mb-3">{store.description}</p>
          
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="font-medium">{store.rating?.toFixed(1) || '4.5'}</span>
            </div>
            
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{store.delivery_time}</span>
            </div>
            
            {distance && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{distance.toFixed(1)} km</span>
              </div>
            )}
            
            <Badge variant="secondary">
              Taxa: {store.delivery_fee} MZN
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs for Menu and Reviews */}
      <div className="p-4">
        <Tabs defaultValue="menu">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1">
              <MessageSquare className="h-4 w-4" />
              Avaliações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="menu" className="space-y-6 mt-4">
            {productsLoading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-6 w-32" />
                  <div className="grid grid-cols-1 gap-3">
                    {Array(2).fill(0).map((_, j) => (
                      <Skeleton key={j} className="h-24 w-full rounded-xl" />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              Object.entries(productsByCategory || {}).map(([category, categoryProducts]) => (
                <div key={category}>
                  <h2 className="text-lg font-semibold mb-3">{category}</h2>
                  <div className="space-y-3">
                    {categoryProducts?.map((product) => {
                      const quantity = getItemQuantity(product.id);
                      
                      return (
                        <div
                          key={product.id}
                          className="flex gap-3 bg-card rounded-xl border border-border p-3"
                        >
                          <div className="relative">
                            <img
                              src={product.image_url || '/placeholder.svg'}
                              alt={product.name}
                              className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                            />
                            <FavoriteButton
                              isFavorite={isProductFavorite(product.id)}
                              onToggle={() => toggleProductFavorite(product.id)}
                              size="sm"
                              className="absolute -top-2 -right-2 h-7 w-7 bg-background shadow-md"
                            />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm line-clamp-1">{product.name}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {product.description}
                            </p>
                            <p className="text-primary font-bold mt-2">{product.price} MZN</p>
                          </div>
                          
                          <div className="flex flex-col justify-end">
                            {quantity > 0 ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 rounded-full"
                                  onClick={() => updateQuantity(product.id, quantity - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="font-medium w-6 text-center">{quantity}</span>
                                <Button
                                  size="icon"
                                  className="h-8 w-8 rounded-full"
                                  onClick={() => handleAddItem(product)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                className="rounded-full"
                                onClick={() => handleAddItem(product)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Adicionar
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="reviews" className="mt-4">
            <StoreReviews storeId={store.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
