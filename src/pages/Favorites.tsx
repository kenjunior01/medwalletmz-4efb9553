import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Heart, Pill, Stethoscope, Building2, Hospital, X, Package, Store,
} from "@/components/icons/lucide-compat";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/contexts/CountryContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { logger } from '@/lib/logger';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type FavoriteType = "pharmacy" | "doctor" | "clinic" | "hospital";

interface Favorite {
  id: string;
  type: FavoriteType;
  name: string;
  addedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const TYPE_META: Record<
  FavoriteType,
  { icon: typeof Pill; label: string; path: (id: string) => string; color: string }
> = {
  pharmacy: {
    icon: Pill,
    label: "Farmácia",
    path: (id) => `/store/${id}`,
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
  doctor: {
    icon: Stethoscope,
    label: "Médico",
    path: (id) => `/health/book/${id}`,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  },
  clinic: {
    icon: Building2,
    label: "Clínica",
    path: (id) => `/health/facilities/${id}`,
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  },
  hospital: {
    icon: Hospital,
    label: "Hospital",
    path: (id) => `/health/facilities/${id}`,
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400",
  },
};

const STORAGE_KEY = "medwallet_favorites";

function readFavorites(): Favorite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeFavorites(favs: Favorite[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

function groupByType(
  favs: Favorite[]
): { type: FavoriteType; items: Favorite[] }[] {
  const order: FavoriteType[] = ["pharmacy", "doctor", "clinic", "hospital"];
  const map = new Map<FavoriteType, Favorite[]>();
  for (const f of favs) {
    if (!map.has(f.type)) map.set(f.type, []);
    map.get(f.type)!.push(f);
  }
  return order
    .filter((t) => map.has(t))
    .map((type) => ({ type, items: map.get(type)! }));
}

/* ------------------------------------------------------------------ */
/*  Sincronizados — tabela `favorites` (MESMA do app, realtime)        */
/* ------------------------------------------------------------------ */

interface SyncedStore {
  id: string;
  name: string;
  type: string | null;
  image_url: string | null;
}

interface SyncedProduct {
  id: string;
  name: string;
  image_url: string | null;
  price: number | null;
  store_id: string | null;
}

interface SyncedFavorite {
  id: string;
  store: SyncedStore | null;
  product: SyncedProduct | null;
}

function useSyncedFavorites(userId: string | undefined) {
  const [items, setItems] = useState<SyncedFavorite[]>([]);

  const fetchSynced = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          store:stores(id, name, type, image_url),
          product:products(id, name, image_url, price, store_id)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems((data as unknown as SyncedFavorite[]) || []);
    } catch (error) {
      logger.error('Erro ao carregar favoritos sincronizados:', { error });
    }
  }, [userId]);

  useEffect(() => {
    fetchSynced();
    if (!userId) return;

    /* realtime: o coração posto no app aparece aqui sem refresh */
    const channel = supabase
      .channel('favorites-sync-web')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'favorites',
          filter: `user_id=eq.${userId}`,
        },
        () => fetchSynced()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchSynced]);

  return items;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Favorites() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>(readFavorites);
  const synced = useSyncedFavorites(user?.id);

  const syncedStores = synced.filter((s) => s.store);
  const syncedProducts = synced.filter((s) => s.product);

  /* sync with other tabs */
  useEffect(() => {
    const handler = () => setFavorites(readFavorites());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.id !== id);
      writeFavorites(next);
      return next;
    });
  }, []);

  const grouped = groupByType(favorites);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="bg-background min-h-screen">
      {/* ---- Header ---- */}
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 backdrop-blur-md border-b px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => navigate(-1)}
          aria-label={t('favorites.back')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
        <h1 className="text-lg font-semibold">{t('favorites.title')}</h1>
      </header>

      <main className="px-4 pt-4 space-y-6">
        {/* ---- Empty state (só sem locais nem sincronizados) ---- */}
        {favorites.length === 0 && synced.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="rounded-full bg-muted p-6 mb-5">
              <Heart className="h-11 w-11 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-muted-foreground">
              {t('favorites.empty_title')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70 max-w-xs">
              {t('favorites.empty_desc')}
            </p>
          </div>
        )}

        {/* ---- Secção sincronizada com o app (tabela favorites) ---- */}
        {synced.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Sincronizados com o app
              </h2>
              <Badge variant="secondary" className="ml-auto text-xs">
                {synced.length}
              </Badge>
            </div>

            {syncedStores.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Store className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Farmácias
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {syncedStores.map(({ store }) => (
                    <Card
                      key={`sync-store-${store!.id}`}
                      className="group cursor-pointer transition-shadow hover:shadow-md"
                      onClick={() => navigate(`/store/${store!.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") navigate(`/store/${store!.id}`);
                      }}
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex items-center justify-center rounded-full p-2.5 shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                          <Store className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{store!.name}</p>
                          <Badge variant="outline" className="mt-1 text-[11px] font-normal">
                            Farmácia · tempo real
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {syncedProducts.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Produtos
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {syncedProducts.map(({ product }) => (
                    <Card
                      key={`sync-product-${product!.id}`}
                      className="group cursor-pointer transition-shadow hover:shadow-md"
                      onClick={() =>
                        product!.store_id && navigate(`/store/${product!.store_id}`)
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && product!.store_id)
                          navigate(`/store/${product!.store_id}`);
                      }}
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex items-center justify-center rounded-full p-2.5 shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                          <Package className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product!.name}</p>
                          {product!.price != null && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {product!.price} MZN
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* ---- Grouped sections (neste dispositivo) ---- */}
        {grouped.map(({ type, items }) => {
          const meta = TYPE_META[type];
          const Icon = meta.icon;

          return (
            <section key={type}>
              {/* Section header */}
              <div className="flex items-center gap-2 mb-3">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {meta.label}s
                </h2>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {items.length}
                </Badge>
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((fav) => (
                  <Card
                    key={`${fav.type}-${fav.id}`}
                    className="group cursor-pointer transition-shadow hover:shadow-md"
                    onClick={() => navigate(meta.path(fav.id))}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") navigate(meta.path(fav.id));
                    }}
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      {/* Icon circle */}
                      <div
                        className={`flex items-center justify-center rounded-full p-2.5 shrink-0 ${meta.color}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Name + badge */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{fav.name}</p>
                        <Badge
                          variant="outline"
                          className="mt-1 text-[11px] font-normal"
                        >
                          {meta.label}
                        </Badge>
                      </div>

                      {/* Remove button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFavorite(fav.id);
                        }}
                        aria-label={`Remover ${fav.name}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
