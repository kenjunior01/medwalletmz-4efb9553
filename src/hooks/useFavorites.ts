import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Favorite {
  id: string;
  store_id: string | null;
  product_id: string | null;
}

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id, store_id, product_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const isStoreFavorite = useCallback((storeId: string) => {
    return favorites.some(f => f.store_id === storeId);
  }, [favorites]);

  const isProductFavorite = useCallback((productId: string) => {
    return favorites.some(f => f.product_id === productId);
  }, [favorites]);

  const toggleStoreFavorite = useCallback(async (storeId: string) => {
    if (!user) {
      toast.error('Faça login para adicionar favoritos');
      return;
    }

    const existing = favorites.find(f => f.store_id === storeId);

    if (existing) {
      // Remove favorite
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existing.id);

      if (error) {
        toast.error('Erro ao remover favorito');
        return;
      }

      setFavorites(prev => prev.filter(f => f.id !== existing.id));
      toast.success('Removido dos favoritos');
    } else {
      // Add favorite
      const { data, error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, store_id: storeId })
        .select()
        .single();

      if (error) {
        toast.error('Erro ao adicionar favorito');
        return;
      }

      setFavorites(prev => [...prev, data]);
      toast.success('Adicionado aos favoritos');
    }
  }, [user, favorites]);

  const toggleProductFavorite = useCallback(async (productId: string) => {
    if (!user) {
      toast.error('Faça login para adicionar favoritos');
      return;
    }

    const existing = favorites.find(f => f.product_id === productId);

    if (existing) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existing.id);

      if (error) {
        toast.error('Erro ao remover favorito');
        return;
      }

      setFavorites(prev => prev.filter(f => f.id !== existing.id));
      toast.success('Removido dos favoritos');
    } else {
      const { data, error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, product_id: productId })
        .select()
        .single();

      if (error) {
        toast.error('Erro ao adicionar favorito');
        return;
      }

      setFavorites(prev => [...prev, data]);
      toast.success('Adicionado aos favoritos');
    }
  }, [user, favorites]);

  return {
    favorites,
    loading,
    isStoreFavorite,
    isProductFavorite,
    toggleStoreFavorite,
    toggleProductFavorite,
    refetch: fetchFavorites
  };
}
