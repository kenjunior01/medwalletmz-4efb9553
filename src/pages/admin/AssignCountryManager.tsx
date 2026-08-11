import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCountry } from '@/contexts/CountryContext';
import { BentoCard, BentoGrid, GlassCard } from '@/components/ui/design-system';
import NumberFlow from '@number-flow/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, UserPlus, Globe, User, Mail, Shield, Check,
  Users, Stethoscope, Building2, Truck, Download, Pencil, Loader2, AlertCircle, MapPin, DollarSign,
} from '@/components/icons/lucide-compat';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ManagerProfile {
  user_id: string;
  full_name: string | null;
  email?: string;
  avatar_url?: string | null;
}

interface CountryManager {
  country_id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface PermissionKey {
  key: string;
  label: string;
  icon: any;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PERMISSIONS: PermissionKey[] = [
  { key: 'can_approve_doctors', label: 'Aprovar Médicos', icon: Stethoscope },
  { key: 'can_approve_pharmacies', label: 'Aprovar Farmácias', icon: Building2 },
  { key: 'can_view_financials', label: 'Ver Financeiros', icon: DollarSign },
  { key: 'can_manage_drivers', label: 'Gerir Motoristas', icon: Truck },
  { key: 'can_export_data', label: 'Exportar Dados', icon: Download },
  { key: 'can_manage_content', label: 'Gerir Conteúdo', icon: Pencil },
  { key: 'can_manage_coupons', label: 'Gerir Cupões', icon: Shield },
  { key: 'can_manage_settings', label: 'Gerir Definições', icon: Pencil },
];

const COUNTRY_FLAGS: Record<string, string> = {
  MZ: '🇲🇿', BR: '🇧🇷', AO: '🇦🇴', ZA: '🇿🇦', PT: '🇵🇹', IN: '🇮🇳',
  CV: '🇨🇻', ST: '🇸🇹', GW: '🇬🇼', KE: '🇰🇪', TZ: '🇹🇿', UG: '🇺🇬',
  ET: '🇪🇹', RW: '🇷🇼', NG: '🇳🇬', GH: '🇬🇭', SN: '🇸🇳', CI: '🇨🇮',
  MA: '🇲🇦', EG: '🇪🇬', CM: '🇨🇲', CD: '🇨🇩',
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AssignCountryManager() {
  const queryClient = useQueryClient();
  const { allCountries, t } = useCountry();

  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>(
    Object.fromEntries(PERMISSIONS.map(p => [p.key, false]))
  );
  const [assigning, setAssigning] = useState(false);

  const selectedCountry = allCountries.find(c => c.id === selectedCountryId);

  // ── Fetch current country managers ──
  const { data: currentManagers, isLoading: managersLoading } = useQuery({
    queryKey: ['country-managers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_roles')
        .select('user_id, role, profiles!user_id(full_name, email, avatar_url, managed_country)')
        .eq('role', 'country_manager');
      if (error) throw error;
      return ((data || []) as any[]).map((r: any) => ({
        country_id: r.profiles?.managed_country,
        user_id: r.user_id,
        full_name: r.profiles?.full_name,
        email: r.profiles?.email,
        avatar_url: r.profiles?.avatar_url,
      }));
    },
  });

  const managersMap = useMemo(() => {
    const map = new Map<string, CountryManager>();
    (currentManagers || []).forEach((m) => {
      if (m.country_id) map.set(m.country_id, m);
    });
    return map;
  }, [currentManagers]);

  // ── Search users ──
  const { data: searchResults = [], isFetching: searchFetching } = useQuery({
    queryKey: ['user-search-assign', userSearch],
    queryFn: async () => {
      if (!userSearch || userSearch.length < 2) return [];
      const q = userSearch.toLowerCase();
      const { data, error } = await (supabase as any)
        .rpc('list_profiles_admin_full')
        .then(res => {
          if (res.error) throw res.error;
          return (res.data || []).filter((p: any) =>
            (p.full_name || '').toLowerCase().includes(q) ||
            (p.phone || '').toLowerCase().includes(q)
          ).slice(0, 15);
        });
      return data as any[];
    },
    enabled: userSearch.length >= 2,
  });

  // ── Stats ──
  const assignedCount = (currentManagers || []).filter(m => m.country_id && allCountries.some(c => c.id === m.country_id)).length;
  const totalCountries = allCountries.length;

  // ── Open assignment sheet ──
  const openAssign = (countryId: string) => {
    setSelectedCountryId(countryId);
    setSelectedUserId(null);
    setUserSearch('');
    setPermissions(Object.fromEntries(PERMISSIONS.map(p => [p.key, false])));
    setSheetOpen(true);
  };

  // ── Assignment mutation ──
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId || !selectedCountryId) return;
      setAssigning(true);

      // 1. Add country_manager role
      await (supabase as any).from('user_roles').upsert({
        user_id: selectedUserId,
        role: 'country_manager',
      }, { onConflict: 'user_id,role' });

      // 2. Update permissions
      const activePerms = Object.entries(permissions).filter(([, v]) => v).map(([k]) => k);
      await (supabase as any).from('manager_permissions').upsert({
        user_id: selectedUserId,
        managed_country: selectedCountryId,
        ...Object.fromEntries(PERMISSIONS.map(p => [p.key, permissions[p.key]])),
      }, { onConflict: 'user_id' });

      // 3. Set managed_country on profile
      await (supabase as any).from('profiles').update({
        managed_country: selectedCountryId,
      }).eq('id', selectedUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['country-managers'] });
      toast.success(`Gestor de país atribuído com sucesso a ${selectedCountry?.name || selectedCountryId}!`);
      setSheetOpen(false);
      setSelectedUserId(null);
      setAssigning(false);
    },
    onError: () => {
      toast.error('Erro ao atribuir gestor de país. Tente novamente.');
      setAssigning(false);
    },
  });

  if (managersLoading) {
    return (
      <div className="space-y-4 p-1">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-xl font-black">Atribuir Gestor de País</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Seleccione um país para atribuir um gestor responsável
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp}>
        <BentoGrid className="grid-cols-3">
          <BentoCard size="sm" className="text-center">
            <Globe className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={totalCountries} /></p>
            <p className="text-[10px] text-muted-foreground uppercase">Países</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <UserPlus className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={assignedCount} /></p>
            <p className="text-[10px] text-muted-foreground uppercase">Com Gestor</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <AlertCircle className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={totalCountries - assignedCount} /></p>
            <p className="text-[10px] text-muted-foreground uppercase">Sem Gestor</p>
          </BentoCard>
        </BentoGrid>
      </motion.div>

      {/* Countries Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {allCountries.map((country) => {
          const manager = managersMap.get(country.id);
          const flag = COUNTRY_FLAGS[country.id] || '🌍';
          return (
            <motion.div key={country.id} variants={fadeUp}>
              <GlassCard
                className="!p-4 cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                onClick={() => openAssign(country.id)}
              >
                {/* Top gradient bar */}
                <div className="h-1 rounded-full mb-3"
                  style={{
                    background: `linear-gradient(90deg, ${country.branding_config?.primary_color || '#0D9488'}, ${country.branding_config?.secondary_color || '#6366F1'})`,
                  }}
                />

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{flag}</span>
                    <div>
                      <p className="font-bold text-sm">{country.name}</p>
                      <p className="text-[10px] text-muted-foreground">{country.region_label} · {country.currency_code}</p>
                    </div>
                  </div>

                  {manager ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Activo
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px]">
                      Sem gestor
                    </Badge>
                  )}
                </div>

                {/* Current manager info */}
                {manager && (
                  <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    {manager.avatar_url ? (
                      <img src={manager.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-3 w-3 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{manager.full_name || 'Sem nome'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{manager.email}</p>
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Assignment Drawer */}
      <Drawer open={sheetOpen} onOpenChange={(open) => { if (!open) setSheetOpen(false); }} snapPoints={[0.5, 0.85]}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="px-4 pt-4 pb-2">
            <DrawerTitle className="flex items-center gap-2">
              <span className="text-xl">{COUNTRY_FLAGS[selectedCountryId || ''] || '🌍'}</span>
              {selectedCountry?.name || 'País'}
            </DrawerTitle>
            <DrawerDescription>
              {managersMap.has(selectedCountryId || '')
                ? 'Já existe um gestor. Pode substituir seleccionando um novo utilizador.'
                : 'Seleccione um utilizador e defina as permissões.'}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-6 space-y-4 overflow-y-auto max-h-[60vh]">
            {/* User search */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase">Pesquisar Utilizador</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome, email ou telefone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9"
                />
                {searchFetching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {searchResults.map((u: any) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                      selectedUserId === u.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedUserId === u.id ? 'bg-primary-foreground/20' : 'bg-muted'}`}>
                        <User className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{u.full_name || 'Sem nome'}</p>
                      <p className="text-[10px] truncate opacity-80">{u.email || u.phone}</p>
                    </div>
                    {selectedUserId === u.id && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {/* Permissions */}
            {selectedUserId && (
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase">Permissões do Gestor</Label>
                <div className="grid gap-2">
                  {PERMISSIONS.map((perm) => (
                    <div key={perm.key} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                          <perm.icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm">{perm.label}</span>
                      </div>
                      <Switch
                        checked={permissions[perm.key]}
                        onCheckedChange={(v) => setPermissions(prev => ({ ...prev, [perm.key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit */}
            <Button
              className="w-full h-12 gap-2 text-sm font-bold"
              disabled={!selectedUserId || assigning}
              onClick={() => assignMutation.mutate()}
            >
              {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {assigning ? 'A atribuir...' : 'Confirmar Atribuição'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </motion.div>
  );
}
