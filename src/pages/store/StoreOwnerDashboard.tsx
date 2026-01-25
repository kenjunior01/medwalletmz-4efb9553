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
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
      toast.error('Erro ao carregar lojas');
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
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
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
                {selectedStore?.name || 'Minha Loja'}
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
                const store = stores.find(s => s.id === e.target.value);
                if (store) setSelectedStore(store);
              }}
            >
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          )}
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {menuItems.map(({ icon: Icon, label, path }) => {
              const isActive = location.pathname === path || 
                (path !== '/store/dashboard' && location.pathname.startsWith(path));
              
              return (
                <li key={path}>
                  <Link
                    to={path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
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
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Plus className="h-4 w-4" />
              Adicionar Loja
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <Link to="/">
            <Button variant="ghost" className="w-full justify-start gap-3">
              <Store className="h-4 w-4" />
              Ver como Cliente
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-destructive hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet context={{ selectedStore, stores, refreshStores: fetchStores }} />
      </main>
    </div>
  );
}
