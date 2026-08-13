import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCountry } from '@/contexts/CountryContext';
import { provinces, getProvinceTheme, type ProvinceTheme } from '@/themes/provinces';
import { BentoCard, BentoGrid, GlassCard } from '@/components/ui/design-system';
import NumberFlow from '@number-flow/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, UserPlus, MapPin, User, Mail, Shield, Check, X,
  Users, Stethoscope, Building2, Truck, Download, FileEdit, Loader2, AlertCircle,
} from '@/components/icons/lucide-compat';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ManagerProfile {
  user_id: string;
  full_name: string | null;
  email?: string;
  avatar_url?: string | null;
}

interface ProvinceManager {
  province_id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface PermissionKey {
  key: string;
  labelKey: string;
  fallback: string;
  icon: any;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PERMISSIONS: PermissionKey[] = [
  { key: 'can_approve_doctors', labelKey: 'regional.assign_manager_perm_doctors', fallback: 'Aprovar Médicos', icon: Stethoscope },
  { key: 'can_approve_pharmacies', labelKey: 'regional.assign_manager_perm_pharmacies', fallback: 'Aprovar Farmácias', icon: Building2 },
  { key: 'can_view_financials', labelKey: 'regional.assign_manager_perm_financials', fallback: 'Ver Financeiros', icon: Shield },
  { key: 'can_manage_drivers', labelKey: 'regional.assign_manager_perm_drivers', fallback: 'Gerir Motoristas', icon: Truck },
  { key: 'can_export_data', labelKey: 'regional.assign_manager_perm_export', fallback: 'Exportar Dados', icon: Download },
  { key: 'can_manage_content', labelKey: 'regional.assign_manager_perm_content', fallback: 'Gerir Conteúdo', icon: FileEdit },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AssignRegionalManager() {
  const queryClient = useQueryClient();
  const { t } = useCountry();

  const [selectedProvince, setSelectedProvince] = useState<ProvinceTheme | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>(
    Object.fromEntries(PERMISSIONS.map(p => [p.key, false]))
  );
  const [assigning, setAssigning] = useState(false);

  // ── Fetch current province managers ──
  const { data: currentManagers, isLoading: managersLoading } = useQuery({
    queryKey: ['province-managers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_roles')
        .select('user_id, role, profiles!user_id(full_name, email, avatar_url, managed_province)')
        .eq('role', 'provincial_manager');
      if (error) throw error;
      return ((data || []) as any[]).map((r: any) => ({
        province_id: r.profiles?.managed_province,
        user_id: r.user_id,
        full_name: r.profiles?.full_name,
        email: r.profiles?.email,
        avatar_url: r.profiles?.avatar_url,
      }));
    },
  });

  const managersMap = useMemo(() => {
    const map = new Map<string, ProvinceManager>();
    (currentManagers || []).forEach((m) => {
      if (m.province_id) map.set(m.province_id, m);
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
  const assignedCount = (currentManagers || []).filter(m => m.province_id).length;
  const unassignedCount = 11 - assignedCount;

  // ── Assignment mutation ──
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProvince || !selectedUserId) return;
      setAssigning(true);
      try {
        // 1. Add regional_manager role
        const { error: roleError } = await (supabase as any)
          .from('user_roles')
          .upsert({ user_id: selectedUserId, role: 'provincial_manager', country_id: 'mz' }, { onConflict: 'user_id,role' });
        if (roleError) throw roleError;

        // 2. Upsert manager_permissions
        const permRow = {
          user_id: selectedUserId,
          province_id: selectedProvince.id,
          ...Object.fromEntries(Object.entries(permissions).map(([k, v]) => [k, v])),
        };
        const { error: permError } = await (supabase as any)
          .from('manager_permissions')
          .upsert(permRow, { onConflict: 'user_id,province_id' });
        if (permError) {
          // Table might not exist yet — log but don't fail the whole flow
          logger.warn('manager_permissions upsert warning:', permError);
        }

        // 3. Update profiles.managed_province
        const { error: profileError } = await (supabase as any)
          .from('profiles')
          .update({ managed_province: selectedProvince.id })
          .eq('user_id', selectedUserId);
        if (profileError) throw profileError;
      } finally {
        setAssigning(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['province-managers'] });
      toast.success(t('regional.assign_manager_success') || 'Gestor atribuído com sucesso!');
      closeSheet();
    },
    onError: (err: any) => {
      logger.error('Assignment error:', err);
      toast.error('Erro ao atribuir gestor: ' + (err?.message || 'Erro desconhecido'));
    },
  });

  // ── Helpers ──
  const openProvince = useCallback((prov: ProvinceTheme) => {
    setSelectedProvince(prov);
    setSheetOpen(true);
    setUserSearch('');
    setSelectedUserId(null);
    setPermissions(Object.fromEntries(PERMISSIONS.map(p => [p.key, false])));
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSelectedProvince(null);
    setUserSearch('');
    setSelectedUserId(null);
    setPermissions(Object.fromEntries(PERMISSIONS.map(p => [p.key, false])));
  }, []);

  const togglePermission = useCallback((key: string) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl md:text-3xl font-bold">
          {t('regional.assign_manager_title') || 'Atribuir Gestor Provincial'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('regional.assign_manager_subtitle') || 'Selecione uma província para atribuir um gestor regional'}
        </p>
      </motion.div>

      {/* ── Stats Row ── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8"
      >
        <motion.div variants={fadeUp}>
          <GlassCard className="text-center">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Províncias</p>
            <p className="text-2xl font-black tabular-nums mt-1"><NumberFlow value={11} /></p>
          </GlassCard>
        </motion.div>
        <motion.div variants={fadeUp}>
          <GlassCard className="text-center">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Atribuídas</p>
            <p className="text-2xl font-black tabular-nums mt-1 text-emerald-600"><NumberFlow value={assignedCount} /></p>
          </GlassCard>
        </motion.div>
        <motion.div variants={fadeUp}>
          <GlassCard className="text-center">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Sem Gestor</p>
            <p className="text-2xl font-black tabular-nums mt-1 text-amber-600"><NumberFlow value={unassignedCount} /></p>
          </GlassCard>
        </motion.div>
        <motion.div variants={fadeUp}>
          <GlassCard className="text-center">
            <p className="text-xs text-muted-foreground uppercase font-semibold flex items-center justify-center gap-1">
              <UserPlus className="h-3.5 w-3.5" /> Gestores
            </p>
            <p className="text-2xl font-black tabular-nums mt-1"><NumberFlow value={(currentManagers || []).length} /></p>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* ── Province Grid ── */}
      {managersLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5"
        >
          {provinces.map((prov) => {
            const theme = getProvinceTheme(prov.id)!;
            const manager = managersMap.get(prov.id);
            return (
              <motion.div key={prov.id} variants={fadeUp}>
                <BentoCard
                  className="relative overflow-hidden cursor-pointer group transition-shadow hover:shadow-lg"
                  onClick={() => openProvince(prov)}
                >
                  {/* Gradient top bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl"
                    style={{ background: theme.gradients.hero }}
                  />

                  <div className="flex items-start justify-between mt-1">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl" role="img" aria-label={prov.name}>
                        {prov.culturalSymbol}
                      </span>
                      <div>
                        <h3 className="font-bold text-base">{prov.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {prov.capital}
                        </p>
                      </div>
                    </div>

                    {/* Status indicator */}
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: manager ? theme.colors.primary : '#d1d5db',
                        boxShadow: manager ? `0 0 8px ${theme.colors.primary}60` : 'none',
                      }}
                    />
                  </div>

                  {/* Manager info */}
                  <div className="mt-4">
                    {manager ? (
                      <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: `${theme.colors.primary}10` }}>
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: theme.colors.primary }}
                        >
                          {(manager.full_name || '?')[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {t('regional.assign_manager_current') || 'Gestor Actual'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {manager.full_name || '—'}
                          </p>
                        </div>
                        <Check className="h-4 w-4 shrink-0" style={{ color: theme.colors.primary }} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <X className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('regional.assign_manager_no_manager') || 'Sem gestor atribuído'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Hover action */}
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground uppercase font-semibold">
                      {manager ? 'Gerir' : 'Atribuir'}
                    </p>
                    <UserPlus
                      className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors"
                    />
                  </div>
                </BentoCard>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ── Assignment Drawer ── */}
      <Drawer open={sheetOpen} onOpenChange={(open) => { if (!open) closeSheet(); }} snapPoints={[0.5, 0.9]}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="px-4 pt-2 pb-0">
            <DrawerTitle className="flex items-center gap-2">
              {selectedProvince && (
                <>
                  <span>{selectedProvince.culturalSymbol}</span>
                  <span>{selectedProvince.name}</span>
                </>
              )}
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-6 mt-2 space-y-6 overflow-y-auto max-h-[70vh]">
            {/* Current manager info */}
            {selectedProvince && managersMap.get(selectedProvince.id) && (
              <GlassCard className="border-amber-200 bg-amber-50/50">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      {t('regional.assign_manager_current') || 'Gestor Actual'}
                    </p>
                    <p className="text-xs text-amber-600">
                      {managersMap.get(selectedProvince.id)?.full_name}
                    </p>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* ── User Search ── */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                {t('regional.assign_manager_select') || 'Selecionar Utilizador'}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('regional.assign_manager_search') || 'Pesquisar utilizador por email ou nome...'}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Search results */}
              {userSearch.length >= 2 && (
                <div className="max-h-48 overflow-y-auto rounded-lg border bg-background">
                  {searchFetching ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Nenhum utilizador encontrado
                    </div>
                  ) : (
                    searchResults.map((user: any) => (
                      <button
                        key={user.user_id}
                        type="button"
                        onClick={() => setSelectedUserId(user.user_id)}
                        className={
                          'w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors border-b last:border-b-0 ' +
                          (selectedUserId === user.user_id ? 'bg-primary/5 border-l-2 border-l-primary' : '')
                        }
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.full_name || 'Sem nome'}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.phone || user.user_id.slice(0, 8)}</p>
                        </div>
                        {selectedUserId === user.user_id && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* ── Permissions ── */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                {t('regional.assign_manager_permissions') || 'Permissões do Gestor'}
              </Label>
              <div className="space-y-2">
                {PERMISSIONS.map((perm) => {
                  const Icon = perm.icon;
                  return (
                    <div
                      key={perm.key}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{t(perm.labelKey) || perm.fallback}</span>
                      </div>
                      <Switch
                        checked={permissions[perm.key]}
                        onCheckedChange={() => togglePermission(perm.key)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Confirm Button ── */}
            <Button
              className="w-full font-bold"
              disabled={!selectedUserId || assigning}
              onClick={() => assignMutation.mutate()}
            >
              {assigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A processar...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('regional.assign_manager_confirm') || 'Confirmar Atribuição'}
                </>
              )}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
