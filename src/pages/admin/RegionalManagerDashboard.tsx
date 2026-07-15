import { useEffect } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingBag,
  Users,
  Truck,
  Shield,
  Megaphone,
  Sparkles,
  BarChart3,
  Upload,
  LogOut,
  Globe,
  Stethoscope,
  HeartPulse,
  ShieldCheck,
  Bot,
  Globe2,
  Users as UsersIcon,
  Activity,
  Droplet,
  Baby,
  Menu,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

type MenuItem = { icon: any; label: string; path: string; highlight?: boolean };

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Resumo Nacional', path: '/manager' },
  { icon: Globe2, label: '🇮🇳 India Command Center', path: '/manager/india', highlight: true },
  { icon: Users, label: '🇲🇿 APE Digital', path: '/manager/mz-verticals/ape', highlight: true },
  { icon: Activity, label: 'TB DOT Digital', path: '/manager/mz-verticals/tb-dot', highlight: true },
  { icon: Droplet, label: 'Malaria Test-Treat', path: '/manager/mz-verticals/malaria', highlight: true },
  { icon: HeartPulse, label: 'ART Adherence HIV', path: '/manager/mz-verticals/art', highlight: true },
  { icon: Baby, label: 'Saúde Materna', path: '/manager/mz-verticals/maternal', highlight: true },
  { icon: ShieldCheck, label: 'Compliance Center', path: '/manager/compliance', highlight: true },
  { icon: Bot, label: 'Meddy IA Copilot', path: '/manager/compliance/copilot', highlight: true },
  { icon: Sparkles, label: 'Curadoria Local', path: '/manager/curation', highlight: true },
  { icon: Globe2, label: '☁️ Google Cloud Hub', path: '/manager/google-cloud', highlight: true },
  { icon: Store, label: 'Farmácias', path: '/manager/stores' },
  { icon: HeartPulse, label: 'Clínicas & Hospitais', path: '/manager/clinics' },
  { icon: Stethoscope, label: 'Veterinária', path: '/manager/veterinary' },
  { icon: Sparkles, label: 'Laboratórios', path: '/manager/labs' },
  { icon: ShoppingBag, label: 'Pedidos Nacionais', path: '/manager/orders' },
  { icon: Users, label: 'Usuários Nacionais', path: '/manager/users' },
  { icon: Truck, label: 'Estafetas', path: '/manager/drivers' },
  { icon: Shield, label: 'Seguros Nacionais', path: '/manager/insurance' },
  { icon: Megaphone, label: 'Anúncios', path: '/manager/ads' },
  { icon: BarChart3, label: 'Relatórios', path: '/manager/reports' },
  { icon: Upload, label: 'Importação Nacional', path: '/manager/import' },
];

export default function RegionalManagerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasRole, userRoles, loading, signOut } = useAuth();
  const { country, setCountryById } = useCountry();
  const isAdmin = hasRole('admin');
  const isManager = hasRole('country_manager') || isAdmin;

  // Find the country managed by this user
  const managedCountryId = userRoles.find(r => r.role === 'country_manager')?.country_id;

  useEffect(() => {
    if (!loading && (!user || !isManager)) {
      navigate('/auth');
      return;
    }

    // Force country context to match managed country for non-admins
    if (!loading && user && !isAdmin && managedCountryId && country?.id !== managedCountryId) {
      console.log(`Locking manager to country: ${managedCountryId}`);
      setCountryById(managedCountryId);
    }
  }, [user, loading, isManager, isAdmin, managedCountryId, country?.id, setCountryById, navigate]);

  if (loading) return <div className="p-8">A carregar painel nacional...</div>;
  if (!user || !isManager) return null;

  const activeLabel = menuItems.find(m => m.path === location.pathname)?.label || 'Painel Nacional';

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="p-6 border-b border-border bg-primary/5">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-primary">MedWallet</h1>
          <Badge variant="outline" className="text-[10px] uppercase">{country?.id}</Badge>
        </div>
        <p className="text-xs text-muted-foreground font-medium">Gestor Nacional: {country?.name}</p>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto no-scrollbar">
        <ul className="space-y-1">
          {menuItems.map(({ icon: Icon, label, path, highlight }) => {
            const isActive = location.pathname === path;
            return (
              <li key={path}>
                <Link
                  to={path}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all no-tap-target ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md font-bold'
                      : highlight
                        ? 'text-secondary hover:bg-secondary/10 bg-secondary/5'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium truncate">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border mt-auto safe-area-bottom">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 no-tap-target"
          onClick={() => signOut().then(() => navigate('/'))}
        >
          <LogOut className="h-4 w-4" />
          Sair do Painel
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 bg-card border-r border-border flex-col shadow-sm">
        <SidebarContent />
      </aside>

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
            <div className="flex-1 min-w-0">
              <h1 className="font-black text-sm truncate">{activeLabel}</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Gestor {country?.id}</p>
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
                  <SheetTitle>Menu do Gestor Nacional</SheetTitle>
                </SheetHeader>
                <SidebarContent />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-muted/20">
          {/* Header desktop */}
          <header className="hidden md:flex h-16 border-b bg-card px-8 items-center justify-between sticky top-0 z-10 shadow-sm">
            <h2 className="font-semibold text-lg">{activeLabel}</h2>
            <span className="text-xs text-muted-foreground italic">Operação 100% Protegida por Backend RLS</span>
          </header>
          <div className="p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
