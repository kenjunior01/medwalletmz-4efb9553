import { useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
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
  Shield,
  Megaphone,
  Globe,
  ShieldCheck,
  Bot,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardShell, type DashboardMenuItem } from '@/components/layout/DashboardShell';

const menuItems: DashboardMenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard Global', path: '/admin' },
  { icon: Globe, label: 'Métricas Mundiais', path: '/admin/global-metrics', highlight: true },
  { icon: Globe, label: 'Painel do País', path: '/admin/country-dashboard', highlight: true },
  { icon: Sparkles, label: 'Curadoria', path: '/admin/curation', highlight: true },
  { icon: Globe, label: '☁️ Google Cloud Hub', path: '/admin/google-cloud', highlight: true },
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
  { icon: ShieldCheck, label: 'Compliance Command Center', path: '/admin/compliance', highlight: true },
  { icon: Bot, label: 'Meddy IA Copilot', path: '/admin/compliance/copilot', highlight: true },
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
        <div className="hidden md:block w-64 bg-card border-r border-border p-4">
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
    <DashboardShell
      title="Painel Admin"
      badge="Global Admin"
      menuItems={menuItems}
      onSignOut={handleSignOut}
    >
      <Outlet />
    </DashboardShell>
  );
}
