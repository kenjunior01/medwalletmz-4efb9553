import { useEffect, useState } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { useManagedCountry } from '@/hooks/useManagedCountry';
import {
  Home,
  Users,
  Store,
  ShoppingBag,
  Stethoscope,
  Truck,
  BarChart3,
  LogOut,
  ShieldCheck,
  MapPin,
  Menu,
  ChevronLeft,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type NavItem = { icon: any; labelKey: string; path: string; accent?: string };

const navItems: NavItem[] = [
  { icon: Home, labelKey: 'nav.dashboard', path: '/manager', accent: 'from-blue-500/20 to-blue-600/5' },
  { icon: Users, labelKey: 'nav.users', path: '/manager/users', accent: 'from-violet-500/20 to-violet-600/5' },
  { icon: Store, labelKey: 'nav.pharmacy', path: '/manager/stores', accent: 'from-purple-500/20 to-purple-600/5' },
  { icon: Stethoscope, labelKey: 'home.clinics', path: '/manager/clinics', accent: 'from-teal-500/20 to-teal-600/5' },
  { icon: ShoppingBag, labelKey: 'nav.orders', path: '/manager/orders', accent: 'from-green-500/20 to-green-600/5' },
  { icon: Truck, labelKey: 'nav.drivers', path: '/manager/drivers', accent: 'from-amber-500/20 to-amber-600/5' },
  { icon: BarChart3, labelKey: 'nav.reports', path: '/manager/reports', accent: 'from-rose-500/20 to-rose-600/5' },
];

export default function RegionalManagerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasRole, loading, signOut } = useAuth();
  const { managedCountryId, countryCode, countryName, isGlobalAdmin } = useManagedCountry();
  const { t } = useCountry();
  const isManager = hasRole('country_manager');

  useEffect(() => {
    if (!loading && (!user || (!isManager && !isGlobalAdmin))) {
      navigate('/auth');
      return;
    }
  }, [user, loading, isManager, isGlobalAdmin, navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
      <div className="text-center space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 animate-pulse mx-auto" />
        <p className="text-sm text-muted-foreground">{t('common.loading') || 'A carregar...'} </p>
      </div>
    </div>
  );

  if (!user || (!isManager && !isGlobalAdmin)) return null;

  const activeLabel = navItems.find(m => m.path === location.pathname)
    ? t(navItems.find(m => m.path === location.pathname)!.labelKey)
    : t('nav.dashboard');

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/manager' && location.pathname.startsWith(path));

  // ===== SIDEBAR COMPLETAMENTE DIFERENTE DO ADMIN =====
  // Usa cards coloridos em vez de lista simples,
  // identidade visual própria com gradientes.
  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {/* Header com identidade regional */}
      <div className="p-5 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" />
          <div>
            <h1 className="font-black text-base leading-tight">MedWallet</h1>
            <p className="text-[10px] opacity-80 font-medium uppercase tracking-wider">
              {t('manager.panel_label') || 'Gestor Regional'}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
          <MapPin className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">{countryName}</span>
          <Badge className="bg-white/20 text-white border-0 text-[9px] ml-auto">{countryCode}</Badge>
        </div>
      </div>

      {/* Navegação com cards coloridos — DIFERENTE do admin */}
      <nav className="flex-1 p-3 overflow-y-auto no-scrollbar space-y-1">
        {navItems.map(({ icon: Icon, labelKey, path, accent }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              to={path}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all no-tap-target',
                active
                  ? cn('font-bold text-foreground shadow-sm bg-gradient-to-r', accent)
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="h-4.5 w-4.5" />
              <span className="font-medium truncate">{t(labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer — aviso de isolamento */}
      <div className="p-3 mx-3 mb-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {t('manager.isolation_notice') || 'Acesso restrito. Apenas dados da sua região são visíveis.'}
          </p>
        </div>
      </div>

      <div className="p-3 border-t border-border safe-area-bottom">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 no-tap-target"
          onClick={() => signOut().then(() => navigate('/'))}
        >
          <LogOut className="h-4 w-4" />
          {t('profile.logout') || 'Sair'}
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Sidebar desktop — visual próprio */}
      <aside className="hidden md:flex w-72 bg-card/80 backdrop-blur-sm border-r border-border/50 flex-col">
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile — estilo diferente do admin */}
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
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 text-primary" />
                <p className="text-[10px] text-muted-foreground font-medium">{countryName} ({countryCode})</p>
              </div>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl hover:bg-primary/10 no-tap-target"
                  data-size="icon"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <SheetHeader className="sr-only">
                  <SheetTitle>{t('manager.panel_label') || 'Menu do Gestor Regional'}</SheetTitle>
                </SheetHeader>
                <SidebarContent onNavigate={() => {}} />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Header desktop — borda inferior colorida */}
        <header className="hidden md:flex h-14 items-center justify-between px-6 border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-lg">{activeLabel}</h2>
            <Badge variant="secondary" className="text-[10px]">
              <MapPin className="h-3 w-3 mr-1" />{countryCode}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] text-muted-foreground font-medium">
              {t('manager.isolated_session') || 'Sessão isolada por região'}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
