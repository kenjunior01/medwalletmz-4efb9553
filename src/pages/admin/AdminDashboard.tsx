import { useEffect } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingBag,
  Users,
  Truck,
  Tag,
  Settings,
  LogOut,
  BarChart3,
  Crown,
  Wallet,
  Percent,
  Gift,
  Sliders,
  Receipt,
  Upload,
  Sparkles,
  ArrowDownToLine,
  Shield,
  Megaphone,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

type MenuItem = {
  icon: any;
  label: string;
  path: string;
  highlight?: boolean;
};

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard Global', path: '/admin' },
  { icon: Globe, label: 'Métricas Mundiais', path: '/admin/global-metrics', highlight: true },
  { icon: Globe, label: 'Painel do País', path: '/admin/country-dashboard', highlight: true },
  { icon: Sparkles, label: 'Curadoria', path: '/admin/curation', highlight: true },
  { icon: Store, label: 'Farmácias', path: '/admin/stores' },
  { icon: Package, label: 'Produtos', path: '/admin/products' },
  { icon: ShoppingBag, label: 'Pedidos', path: '/admin/orders' },
  { icon: Users, label: 'Usuários', path: '/admin/users' },
  { icon: Truck, label: 'Entregadores', path: '/admin/drivers' },
  { icon: Tag, label: 'Cupons', path: '/admin/coupons' },
  { icon: Gift, label: 'Convites', path: '/admin/referrals' },
  { icon: Wallet, label: 'Carteiras', path: '/admin/wallets' },
  { icon: Receipt, label: 'Transações', path: '/admin/transactions' },
  { icon: Shield, label: 'Seguradoras', path: '/admin/insurance' },
  { icon: Megaphone, label: 'Anúncios', path: '/admin/ads' },
  { icon: Sparkles, label: 'Laboratórios', path: '/admin/labs' },
  { icon: Percent, label: 'Comissões', path: '/admin/commissions' },
  { icon: Sliders, label: 'Carteira & Bónus', path: '/admin/platform-settings' },
  { icon: Crown, label: 'Inscritos (Subs)', path: '/admin/subscriptions' },
  { icon: Crown, label: 'Planos (Gestão)', path: '/admin/subscription-plans', highlight: true },
  { icon: Wallet, label: 'Contas Pagamento', path: '/admin/payment-accounts' },
  { icon: BarChart3, label: 'Relatórios', path: '/admin/reports' },
  { icon: Upload, label: 'Importar Dados', path: '/admin/import', highlight: true },
  { icon: Globe, label: 'Gestão do País', path: '/admin/country-settings', highlight: true },
  { icon: Settings, label: 'Configurações', path: '/admin/settings' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasRole, loading, signOut } = useAuth();
  const isAdmin = hasRole('admin');
  const isCountryManager = hasRole('country_manager');

  useEffect(() => {
    if (!loading && (!user || (!isAdmin && !isCountryManager))) {
      navigate('/auth');
      return;
    }

    // Gestores regionais devem usar APENAS o /manager dashboard para isolamento total
    if (!loading && user && !isAdmin && isCountryManager) {
      if (!location.pathname.startsWith('/manager')) {
        navigate('/manager', { replace: true });
      }
    }
  }, [user, loading, isAdmin, isCountryManager, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <div className="w-64 bg-card border-r border-border p-4">
          <Skeleton className="h-8 w-32 mb-8" />
          {Array(8).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full mb-2" />
          ))}
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Apenas admins globais entram aqui. Gestores são redirecionados no useEffect.
  if (!user || !isAdmin) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border bg-primary/5">
          <h1 className="text-xl font-bold text-primary">MedWallet</h1>
          <Badge variant="outline" className="text-[10px] uppercase">Global Admin</Badge>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map(({ icon: Icon, label, path, highlight }) => {
              const isActive = location.pathname === path ||
                (path !== '/admin' && location.pathname.startsWith(path));

              return (
                <li key={path}>
                  <Link
                    to={path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : highlight
                          ? 'hover:bg-secondary/15 text-secondary hover:text-secondary bg-secondary/5'
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
        </nav>


        <div className="p-4 border-t border-border">
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
        <Outlet />
      </main>
    </div>
  );
}
