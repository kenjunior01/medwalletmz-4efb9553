import { useEffect, useState } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  BarChart3,
  Settings,
  LogOut,
  Store,
  Plus,
  Menu,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';

interface StoreData {
  id: string;
  name: string;
  type: string;
  image_url: string | null;
  is_active: boolean;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/store/dashboard' },
  { icon: Package, label: 'Produtos', path: '/store/dashboard/products' },
  { icon: ShoppingBag, label: 'Pedidos', path: '/store/dashboard/orders' },
  { icon: BarChart3, label: 'Relatórios', path: '/store/dashboard/reports' },
  { icon: Settings, label: 'Configurações', path: '/store/dashboard/settings' },
];

export default function StoreOwnerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, loading: authLoading, hasRole } = useAuth();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }
      fetchStores();
    }
  }, [user, authLoading]);

  const fetchStores = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, type, image_url, is_active')
        .eq('owner_id', user.id);

      if (error) throw error;

      if (data && data.length > 0) {
        setStores(data);
        setSelectedStore(data[0]);
      } else {
        // No stores, redirect to register
        navigate('/store/register');
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('Erro ao carregar farmácias');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen">
        <div className="w-64 bg-card border-r border-border p-4">
          <Skeleton className="h-8 w-32 mb-8" />
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full mb-2" />
          ))}
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid grid-cols-3 gap-4">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — desktop apenas */}
      <aside className="hidden md:flex w-64 bg-card border-r border-border flex-col">
        <StoreSidebarContent
          selectedStore={selectedStore}
          stores={stores}
          onSelectStore={setSelectedStore}
          menuItems={menuItems}
          location={location}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile */}
        <header className="md:hidden sticky top-0 z-40 glass border-b border-border/50 safe-area-top">
          <div className="flex items-center gap-2 px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              aria-label="Voltar"
              className="h-10 w-10 rounded-xl hover:bg-primary/10 no-tap-target"
              data-size="icon"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 overflow-hidden shrink-0">
                {selectedStore?.image_url ? (
                  <img src={selectedStore.image_url} alt={selectedStore.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Store className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-black text-sm truncate">{selectedStore?.name || 'Minha Farmácia'}</h1>
                <p className="text-[10px] text-muted-foreground uppercase font-bold capitalize">{selectedStore?.type}</p>
              </div>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Abrir menu"
                  className="h-10 w-10 rounded-xl hover:bg-primary/10 no-tap-target"
                  data-size="icon"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu da Farmácia</SheetTitle>
                </SheetHeader>
                <StoreSidebarContent
                  selectedStore={selectedStore}
                  stores={stores}
                  onSelectStore={setSelectedStore}
                  menuItems={menuItems}
                  location={location}
                  onSignOut={handleSignOut}
                />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Outlet context={{ selectedStore, stores, refreshStores: fetchStores }} />
        </main>
      </div>
    </div>
  );
}

/**
 * Sidebar content reutilizado entre desktop e mobile drawer.
 */
function StoreSidebarContent({
  selectedStore,
  stores,
  onSelectStore,
  menuItems,
  location,
  onSignOut,
}: {
  selectedStore: StoreData | null;
  stores: StoreData[];
  onSelectStore: (s: StoreData) => void;
  menuItems: { icon: any; label: string; path: string }[];
  location: ReturnType<typeof useLocation>;
  onSignOut: () => void;
}) {
  return (
    <>
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 overflow-hidden">
            {selectedStore?.image_url ? (
              <img
                src={selectedStore.image_url}
                alt={selectedStore.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Store className="h-5 w-5 text-primary" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-sm truncate">
              {selectedStore?.name || 'Minha Farmácia'}
            </h1>
            <p className="text-xs text-muted-foreground capitalize">
              {selectedStore?.type}
            </p>
          </div>
        </div>

        {stores.length > 1 && (
          <select
            className="w-full mt-3 text-sm bg-background border border-border rounded-lg px-3 py-2"
            value={selectedStore?.id}
            onChange={(e) => {
              const store = stores.find((s) => s.id === e.target.value);
              if (store) onSelectStore(store);
            }}
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        )}
      </div>

      <nav className="flex-1 p-4 overflow-y-auto no-scrollbar">
        <ul className="space-y-1">
          {menuItems.map(({ icon: Icon, label, path }) => {
            const isActive =
              location.pathname === path ||
              (path !== '/store/dashboard' && location.pathname.startsWith(path));

            return (
              <li key={path}>
                <Link
                  to={path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors no-tap-target ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 pt-6 border-t border-border">
          <Link
            to="/store/register"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors no-tap-target"
          >
            <Plus className="h-4 w-4" />
            Adicionar Farmácia
          </Link>
        </div>
      </nav>

      <div className="p-4 border-t border-border space-y-2 safe-area-bottom">
        <Link to="/">
          <Button variant="ghost" className="w-full justify-start gap-3 no-tap-target">
            <Store className="h-4 w-4" />
            Ver como Cliente
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive no-tap-target"
          onClick={onSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </>
  );
}
