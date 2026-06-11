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
  Sliders
  ,
  Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Store, label: 'Lojas', path: '/admin/stores' },
  { icon: Package, label: 'Produtos', path: '/admin/products' },
  { icon: ShoppingBag, label: 'Pedidos', path: '/admin/orders' },
  { icon: Users, label: 'Usuários', path: '/admin/users' },
  { icon: Truck, label: 'Entregadores', path: '/admin/drivers' },
  { icon: Tag, label: 'Cupons', path: '/admin/coupons' },
  { icon: Gift, label: 'Convites', path: '/admin/referrals' },
  { icon: Wallet, label: 'Carteiras', path: '/admin/wallets' },
  { icon: Receipt, label: 'Transações', path: '/admin/transactions' },
  { icon: Percent, label: 'Comissões', path: '/admin/commissions' },
  { icon: Sliders, label: 'Carteira & Bónus', path: '/admin/platform-settings' },
  { icon: Crown, label: 'Subscrições', path: '/admin/subscriptions' },
  { icon: Wallet, label: 'Contas Pagamento', path: '/admin/payment-accounts' },
  { icon: BarChart3, label: 'Relatórios', path: '/admin/reports' },
  { icon: Settings, label: 'Configurações', path: '/admin/settings' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasRole, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !hasRole('admin'))) {
      navigate('/auth');
    }
  }, [user, loading, hasRole, navigate]);

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

  if (!user || !hasRole('admin')) {
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
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-primary">MoçambiApp</h1>
          <p className="text-xs text-muted-foreground">Painel Administrativo</p>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {menuItems.map(({ icon: Icon, label, path }) => {
              const isActive = location.pathname === path || 
                (path !== '/admin' && location.pathname.startsWith(path));
              
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
