import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { bottomNavByRole, sidebarByRole } from '@/config/navigation';
import { usePrimaryRole } from '@/hooks/usePrimaryRole';
import { useUserType } from '@/hooks/useUserType';
import {
  Menu, ChevronRight, MapPin, PhoneCall, Globe, Sparkles, Stethoscope,
  Building2, FlaskConical, Truck, Store, ArrowRight, Briefcase, ChevronDown,
  ChevronUp, Home, Bike, Heart, Users, Megaphone, Gift, Wallet, UserPlus, CheckCircle2, Plus
} from '@/components/icons/lucide-compat';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { ViralShareSheet } from '@/components/growth/ViralShareSheet';
import { useCountry } from '@/contexts/CountryContext';
import { useLocation as useAppLocation } from '@/contexts/LocationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

/** Professional institution roles with their metadata */
const INSTITUTION_ROLES = [
  { role: 'doctor' as const, icon: Stethoscope, color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', gradient: 'from-blue-500/5 to-blue-500/10', dashboard: '/doctor/dashboard', register: '/doctor/register' },
  { role: 'clinic' as const, icon: Building2, color: 'text-gold', bgColor: 'bg-gold/10', borderColor: 'border-gold/20', gradient: 'from-gold/5 to-gold/10', dashboard: '/clinic/dashboard', register: '/clinic/register' },
  { role: 'store_owner' as const, icon: Store, color: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20', gradient: 'from-green-500/5 to-green-500/10', dashboard: '/store/dashboard', register: '/store/register' },
  { role: 'lab' as const, icon: FlaskConical, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20', gradient: 'from-cyan-500/5 to-cyan-500/10', dashboard: '/lab/dashboard', register: '/lab/register' },
  { role: 'driver' as const, icon: Truck, color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20', gradient: 'from-orange-500/5 to-orange-500/10', dashboard: '/driver/dashboard', register: '/driver/register' },
] as const;

const ROLE_LABELS: Record<string, string> = {
  doctor: 'Médico', clinic: 'Clínica', hospital: 'Hospital', store_owner: 'Farmácia/Loja',
  lab: 'Laboratório', driver: 'Condutor', veterinary: 'Veterinário',
};

/** Lightweight haptic — no-op on web, uses Capacitor Haptics on native */
const haptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  try {
    const { Haptics, ImpactStyle } = (window as any).Capacitor?.Plugins || {};
    if (Haptics) {
      Haptics.impact({ style: ImpactStyle?.[style === 'heavy' ? 'Heavy' : style === 'medium' ? 'Medium' : 'Light'] || 'Light' });
    }
  } catch { /* web fallback — silent */ }
};

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = usePrimaryRole();
  const { country, t } = useCountry();
  const { city } = useAppLocation();
  const { hasRole, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [institutionsOpen, setInstitutionsOpen] = useState(true);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);

  // Sliding pill indicator
  const navRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 });

  const updatePill = useCallback(() => {
    const container = navRef.current;
    if (!container) return;
    const activeBtn = container.querySelector('[data-active="true"]') as HTMLElement;
    if (!activeBtn) { setPillStyle(s => ({ ...s, opacity: 0 })); return; }
    const containerRect = container.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    setPillStyle({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
      opacity: 1,
    });
  }, []);

  useEffect(() => { updatePill(); }, [location.pathname, updatePill]);

  const navItems = bottomNavByRole[role] ?? bottomNavByRole.customer;
  const allItems = sidebarByRole[role] ?? sidebarByRole.customer;
  const { userType } = useUserType();

  const TYPE_NAV: Record<string, typeof navItems> = {
    rider: [
      { path: '/', icon: Home, label: 'common.home', highlight: false },
      { path: '/health/riders', icon: Bike, label: 'healthRiders.title', highlight: true },
      { path: '/health/maps', icon: MapPin, label: 'mapsPremium.title', highlight: false },
      { path: '/wallet', icon: Wallet, label: 'home.wallet_card', highlight: false },
    ],
    health_worker: [
      { path: '/', icon: Home, label: 'common.home', highlight: false },
      { path: '/health/workers/profile', icon: Stethoscope, label: 'healthWorkers.myProfile', highlight: true },
      { path: '/health/workers', icon: Briefcase, label: 'healthWorkers.marketplace', highlight: false },
      { path: '/wallet', icon: Wallet, label: 'home.wallet_card', highlight: false },
    ],
    promoter: [
      { path: '/', icon: Home, label: 'common.home', highlight: false },
      { path: '/referrals', icon: Megaphone, label: 'referrals.title', highlight: true },
      { path: '/rewards', icon: Gift, label: 'rewards.title', highlight: false },
      { path: '/wallet', icon: Wallet, label: 'home.wallet_card', highlight: false },
    ],
  };

  const finalNavItems = userType && TYPE_NAV[userType] ? TYPE_NAV[userType] : navItems;
  const bottomPaths = new Set(finalNavItems.map(i => i.path));
  const moreItems = allItems.filter(i => !bottomPaths.has(i.path));

  const groups = moreItems.reduce((acc, item) => {
    const group = item.group || 'Outros';
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, typeof moreItems>);

  const activeInstitutionRoles = useMemo(() => {
    if (!user) return [];
    return INSTITUTION_ROLES.filter(ir => hasRole(ir.role));
  }, [user, hasRole]);

  const displayItems = finalNavItems.slice(0, 4);

  return (
    <>
      {/* Floating Invite Button — smaller, no gradient glow */}
      {user && (
        <button
          onClick={() => setShareSheetOpen(true)}
          className="fixed bottom-20 right-3 z-40 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform no-tap-target"
          aria-label="Convida Amigos"
        >
          <UserPlus className="h-5 w-5" />
        </button>
      )}
      <ViralShareSheet open={shareSheetOpen} onOpenChange={setShareSheetOpen} />

      {/* Bottom nav — native feel with sliding pill indicator */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-t border-border/50 safe-area-bottom">
        <div ref={navRef} className="relative flex items-center justify-around py-1.5 px-2 max-w-md mx-auto">
          {/* Sliding pill indicator — CSS transition */}
          <div
            className="absolute top-1 h-[calc(100%-8px)] rounded-xl bg-primary/10 transition-all duration-300 ease-out pointer-events-none"
            style={{ left: pillStyle.left, width: pillStyle.width, opacity: pillStyle.opacity }}
          />
          {displayItems.map(({ path, icon: Icon, label, highlight }, idx) => {
            const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
            const translatedLabel = t(label);

            if (highlight) {
              return (
                <NavLink
                  key={path}
                  to={path}
                  data-active={isActive || undefined}
                  aria-label={translatedLabel}
                  onClick={() => haptic('medium')}
                  className="flex flex-col items-center -mt-5 mx-1 mb-0.5 no-tap-target relative z-10"
                >
                  <div className={cn(
                    'h-12 w-12 rounded-full flex items-center justify-center shadow-md transition-all duration-200',
                    'bg-primary text-primary-foreground',
                    isActive ? 'scale-105' : 'active:scale-95'
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[9px] font-bold mt-1 text-primary">{translatedLabel}</span>
                </NavLink>
              );
            }

            return (
              <NavLink
                key={path}
                to={path}
                data-active={isActive || undefined}
                onClick={() => haptic('light')}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors duration-150 flex-1 no-tap-target relative z-10',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <div className="p-1.5 rounded-xl">
                  <Icon className="h-5 w-5" />
                </div>
                <span className={cn(
                  'text-[9px] font-semibold',
                  isActive && 'text-primary font-bold'
                )}>{translatedLabel}</span>
              </NavLink>
            );
          })}

          {/* More Button */}
          <Drawer open={open} onOpenChange={setOpen} snapPoints={[0.4, 0.85]}>
            <DrawerTrigger asChild>
              <button
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors duration-150 flex-1 no-tap-target',
                  open ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <div className={cn('p-1.5 rounded-xl transition-colors duration-150', open && 'bg-primary/10')}>
                  <Menu className="h-5 w-5" />
                </div>
                <span className='text-[9px] font-semibold'>{t('common.more') || 'Mais'}</span>
              </button>
            </DrawerTrigger>
            <DrawerContent className="px-0 pb-10 max-h-[85vh] overflow-y-auto">
              <div className="px-5">
                <DrawerHeader className="mb-5 flex flex-row items-center justify-between space-y-0">
                  <DrawerTitle className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {t('bottomnav.hub_title') || 'MedWallet Hub'}
                  </DrawerTitle>
                </DrawerHeader>

                {/* User Context Quick Card */}
                <div className="bg-muted/50 border border-border/50 rounded-2xl p-3.5 mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-background flex items-center justify-center shadow-sm border border-border">
                      {country?.id === 'MZ' ? '🇲🇿' : country?.id === 'BR' ? '🇧🇷' : <Globe className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t('bottomnav.current_location') || 'Localização'}</p>
                      <p className="font-bold text-sm">{city}, {country?.name}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="rounded-lg text-xs text-primary hover:bg-primary/10" onClick={() => { setOpen(false); navigate('/profile'); }}>
                    {t('bottomnav.change') || 'Alterar'}
                  </Button>
                </div>

                {/* My Institutions */}
                <div className="mb-6">
                  <button
                    onClick={() => setInstitutionsOpen(!institutionsOpen)}
                    className="flex items-center gap-2 w-full mb-3 px-1"
                  >
                    <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Briefcase className="h-3 w-3 text-primary" />
                    </div>
                    <h3 className="text-[10px] uppercase font-bold tracking-wider text-primary flex-1 text-left">
                      {t('bottomnav.my_institutions') || 'As Minhas Instituições'}
                    </h3>
                    {institutionsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {institutionsOpen && (
                    <>
                      {activeInstitutionRoles.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {activeInstitutionRoles.map((inst) => {
                            const Icon = inst.icon;
                            return (
                              <button
                                key={inst.role}
                                onClick={() => { navigate(inst.dashboard); setOpen(false); }}
                                className={cn(
                                  'rounded-xl border p-3 text-left transition-all active:scale-[0.98]',
                                  'bg-gradient-to-br ' + inst.gradient + ' ' + inst.borderColor,
                                )}
                              >
                                <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center mb-2 border', inst.bgColor, inst.borderColor)}>
                                  <Icon className={cn('h-4 w-4', inst.color)} />
                                </div>
                                <p className="font-bold text-sm leading-tight">{ROLE_LABELS[inst.role] || inst.role}</p>
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 rounded-full border bg-emerald-500/10 text-emerald-600 border-emerald-500/30 mt-1.5">
                                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                  {t('bottomnav.active') || 'Activo'}
                                </Badge>
                              </button>
                            );
                          })}
                          {activeInstitutionRoles.length < INSTITUTION_ROLES.length && (
                            <button
                              onClick={() => { setOpen(false); navigate('/profile'); }}
                              className="rounded-xl border border-dashed border-primary/20 p-3 text-left active:scale-[0.98]"
                            >
                              <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center mb-2">
                                <Plus className="h-4 w-4 text-primary" />
                              </div>
                              <p className="font-bold text-sm text-primary">{t('bottomnav.add_institution') || 'Adicionar'}</p>
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => { setOpen(false); navigate('/profile'); }}
                          className="w-full rounded-xl p-4 text-left active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <Stethoscope className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm">{t('bottomnav.join_professional') || 'Entrar como Profissional'}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {t('bottomnav.join_professional_desc') || 'Registe a sua clínica, farmácia, laboratório ou comece como médico'}
                              </p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-6">
                  {Object.entries(groups).map(([group, items]) => (
                    <div key={group} className="space-y-2">
                      <h3 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60 px-1">{group}</h3>
                      <div className="space-y-1">
                        {items.map((item) => (
                          <button
                            key={item.path}
                            onClick={() => { navigate(item.path); setOpen(false); }}
                            className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/50 hover:border-primary/20 active:bg-muted transition-colors w-full"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-11 w-11 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center">
                                <item.icon className="h-4.5 w-4.5" />
                              </div>
                              <span className="font-semibold text-sm">{t(item.label)}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Emergency Block */}
                  <div className="pt-2">
                    <button
                      onClick={() => { setOpen(false); navigate('/health/triage'); }}
                      className="w-full flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive"
                    >
                      <div className="h-11 w-11 rounded-xl bg-destructive text-white flex items-center justify-center">
                        <PhoneCall className="h-5 w-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-bold text-sm">{t('bottomnav.emergency') || 'Emergência'}</p>
                        <p className="text-[10px] opacity-80 mt-0.5">{t('bottomnav.emergency_desc') || 'Triagem imediata com IA'}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    </button>
                  </div>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </nav>
    </>
  );
}
