import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCountry } from '@/contexts/CountryContext';
import { BentoCard, BentoGrid, GlassCard } from '@/components/ui/design-system';
import NumberFlow from '@number-flow/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, ShieldCheck, Shield, Settings, Globe, User, Trash2, Stethoscope,
  Building2, Truck, Download, Pencil, Users, Loader2, Eye, DollarSign, MapPin,
} from '@/components/icons/lucide-compat';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CountryManagerData {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  managed_country: string | null;
  permissions: Record<string, boolean>;
}

interface PermDef { key: string; label: string; icon: any; color: string; }

const PERMS: PermDef[] = [
  { key: 'can_approve_doctors', label: 'Médicos', icon: Stethoscope, color: 'bg-teal-500/10 text-teal-500' },
  { key: 'can_approve_pharmacies', label: 'Farmácias', icon: Building2, color: 'bg-purple-500/10 text-purple-500' },
  { key: 'can_view_financials', label: 'Financeiros', icon: DollarSign, color: 'bg-amber-500/10 text-amber-500' },
  { key: 'can_manage_drivers', label: 'Motoristas', icon: Truck, color: 'bg-blue-500/10 text-blue-500' },
  { key: 'can_export_data', label: 'Exportar', icon: Download, color: 'bg-emerald-500/10 text-emerald-500' },
  { key: 'can_manage_content', label: 'Conteúdo', icon: Pencil, color: 'bg-pink-500/10 text-pink-500' },
  { key: 'can_manage_coupons', label: 'Cupões', icon: Shield, color: 'bg-indigo-500/10 text-indigo-500' },
  { key: 'can_manage_settings', label: 'Definições', icon: Settings, color: 'bg-orange-500/10 text-orange-500' },
];

const COUNTRY_FLAGS: Record<string, string> = {
  MZ: '🇲🇿', BR: '🇧🇷', AO: '🇦🇴', ZA: '🇿🇦', PT: '🇵🇹', IN: '🇮🇳',
  CV: '🇨🇻', ST: '🇸🇹', GW: '🇬🇼', KE: '🇰🇪', TZ: '🇹🇿', UG: '🇺🇬',
  ET: '🇪🇹', RW: '🇷🇼', NG: '🇳🇬', GH: '🇬🇭', SN: '🇸🇳', CI: '🇨🇮',
  MA: '🇲🇦', EG: '🇪🇬', CM: '🇨🇲', CD: '🇨🇩',
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ManageCountryPermissions() {
  const queryClient = useQueryClient();
  const { allCountries } = useCountry();

  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [removeTarget, setRemoveTarget] = useState<CountryManagerData | null>(null);

  // Fetch all country managers with their permissions
  const { data: managers, isLoading } = useQuery({
    queryKey: ['country-managers-permissions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_roles')
        .select('user_id, role, profiles!user_id(full_name, email, avatar_url, managed_country)')
        .eq('role', 'country_manager');

      if (error) throw error;

      // Fetch permissions for each manager
      const managers = (data || []) as any[];
      const result: CountryManagerData[] = [];

      for (const m of managers) {
        const { data: perms } = await (supabase as any)
          .from('manager_permissions')
          .select('*')
          .eq('user_id', m.user_id)
          .maybeSingle();

        result.push({
          user_id: m.user_id,
          full_name: m.profiles?.full_name,
          email: m.profiles?.email,
          avatar_url: m.profiles?.avatar_url,
          managed_country: m.profiles?.managed_country,
          permissions: {
            can_approve_doctors: perms?.can_approve_doctors ?? false,
            can_approve_pharmacies: perms?.can_approve_pharmacies ?? false,
            can_view_financials: perms?.can_view_financials ?? false,
            can_manage_drivers: perms?.can_manage_drivers ?? false,
            can_export_data: perms?.can_export_data ?? false,
            can_manage_content: perms?.can_manage_content ?? false,
            can_manage_coupons: perms?.can_manage_coupons ?? false,
            can_manage_settings: perms?.can_manage_settings ?? false,
          },
        });
      }

      return result;
    },
  });

  // Toggle permission mutation
  const togglePerm = useMutation({
    mutationFn: async ({ userId, key, value }: { userId: string; key: string; value: boolean }) => {
      await supabase.from('manager_permissions').upsert(
        { user_id: userId, [key]: value },
        { onConflict: 'user_id' }
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['country-managers-permissions'] }),
  });

  // Remove manager mutation
  const removeManager = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'country_manager');
      await supabase.from('manager_permissions').delete().eq('user_id', userId);
      await supabase.from('profiles').update({ managed_country: null }).eq('id', userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['country-managers-permissions'] });
      toast.success('Gestor de país removido com sucesso.');
      setRemoveTarget(null);
    },
    onError: () => toast.error('Erro ao remover gestor.'),
  });

  // Filter managers
  const filteredManagers = useMemo(() => {
    if (!managers) return [];
    return managers.filter((m) => {
      const matchesSearch = !search || 
        (m.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.email || '').toLowerCase().includes(search.toLowerCase());
      const matchesCountry = filterCountry === 'all' || m.managed_country === filterCountry;
      return matchesSearch && matchesCountry;
    });
  }, [managers, search, filterCountry]);

  // Countries covered
  const countriesCovered = new Set((managers || []).map(m => m.managed_country).filter(Boolean));

  if (isLoading) {
    return (
      <div className="space-y-4 p-1">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-xl font-black">Permissões dos Gestores de País</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerir permissões e acessos dos gestores de cada país
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp}>
        <BentoGrid className="grid-cols-3">
          <BentoCard size="sm" className="text-center">
            <Users className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={managers?.length || 0} /></p>
            <p className="text-[10px] text-muted-foreground uppercase">Gestores Activos</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <Globe className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={countriesCovered.size} /></p>
            <p className="text-[10px] text-muted-foreground uppercase">Países Cobertos</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <ShieldCheck className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={allCountries.length - countriesCovered.size} /></p>
            <p className="text-[10px] text-muted-foreground uppercase">Sem Cobertura</p>
          </BentoCard>
        </BentoGrid>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar gestores..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCountry} onValueChange={setFilterCountry}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filtrar por País" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Países</SelectItem>
            {allCountries.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {COUNTRY_FLAGS[c.id] || '🌍'} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Manager Cards */}
      <div className="space-y-3">
        {filteredManagers.length === 0 ? (
          <GlassCard className="!p-8 text-center">
            <Users className="h-11 w-11 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum gestor encontrado.</p>
          </GlassCard>
        ) : (
          filteredManagers.map((manager) => {
            const country = allCountries.find(c => c.id === manager.managed_country);
            const flag = COUNTRY_FLAGS[manager.managed_country || ''] || '🌍';
            const activePerms = Object.values(manager.permissions).filter(Boolean).length;

            return (
              <motion.div key={manager.user_id} variants={fadeUp}>
                <GlassCard className="!p-4">
                  {/* Top: Avatar + Info + Country */}
                  <div className="flex items-start gap-3">
                    {manager.avatar_url ? (
                      <img src={manager.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{manager.full_name || 'Sem nome'}</p>
                      <p className="text-xs text-muted-foreground truncate">{manager.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg">{flag}</span>
                      <p className="text-[10px] text-muted-foreground">{country?.name || '?'}</p>
                    </div>
                  </div>

                  {/* Permissions */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {PERMS.map((perm) => {
                      const isActive = manager.permissions[perm.key];
                      return (
                        <div
                          key={perm.key}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                            isActive ? perm.color : 'bg-muted text-muted-foreground'
                          }`}
                          onClick={() => togglePerm.mutate({ userId: manager.user_id, key: perm.key, value: !isActive })}
                        >
                          <perm.icon className="h-3 w-3" />
                          {perm.label}
                          {isActive && <span className="w-1 h-1 rounded-full bg-current" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      {activePerms}/{PERMS.length} permissões activas
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-1"
                      onClick={() => setRemoveTarget(manager)}
                    >
                      <Trash2 className="h-3 w-3" />
                      Remover
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Gestor de País?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja remover <strong>{removeTarget?.full_name}</strong> como gestor de{' '}
              {allCountries.find(c => c.id === removeTarget?.managed_country)?.name || 'este país'}?
              Esta acção é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={() => removeTarget && removeManager.mutate(removeTarget.user_id)}
            >
              Confirmar Remoção
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
