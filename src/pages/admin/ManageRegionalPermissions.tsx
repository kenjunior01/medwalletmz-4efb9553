import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCountry } from '@/contexts/CountryContext';
import { provinces, getProvinceTheme } from '@/themes/provinces';
import { GlassCard } from '@/components/ui/design-system';
import NumberFlow from '@number-flow/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, ShieldCheck, Shield, MapPin, User, Trash2, Stethoscope,
  Building2, Truck, Download, FileEdit, Users, Check, X, Loader2, Eye,
} from '@/components/icons/lucide-compat';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ManagerWithPermissions {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  managed_province: string | null;
  permissions: Record<string, boolean>;
}

interface PermDef {
  key: string;
  labelKey: string;
  fallback: string;
  icon: any;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PERMISSIONS: PermDef[] = [
  { key: 'can_approve_doctors', labelKey: 'regional.assign_manager_perm_doctors', fallback: 'Aprovar Médicos', icon: Stethoscope },
  { key: 'can_approve_pharmacies', labelKey: 'regional.assign_manager_perm_pharmacies', fallback: 'Aprovar Farmácias', icon: Building2 },
  { key: 'can_view_financials', labelKey: 'regional.assign_manager_perm_financials', fallback: 'Ver Financeiros', icon: Eye },
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

export default function ManageRegionalPermissions() {
  const queryClient = useQueryClient();
  const { t } = useCountry();

  const [search, setSearch] = useState('');
  const [provinceFilter, setProvinceFilter] = useState<string>('all');
  const [removeTarget, setRemoveTarget] = useState<ManagerWithPermissions | null>(null);
  const [editingPerms, setEditingPerms] = useState<Record<string, Record<string, boolean>>>({});

  // ── Fetch all regional managers with permissions ──
  const { data: managers = [], isLoading } = useQuery({
    queryKey: ['regional-managers-permissions'],
    queryFn: async () => {
      // Fetch regional_manager roles
      const { data: roles, error: rolesErr } = await (supabase as any)
        .from('user_roles')
        .select('user_id')
        .eq('role', 'regional_manager');
      if (rolesErr) throw rolesErr;

      if (!roles || roles.length === 0) return [];

      const userIds = roles.map((r: any) => r.user_id);

      // Fetch profiles for these users
      const { data: profiles, error: profErr } = await (supabase as any)
        .from('profiles')
        .select('user_id, full_name, email, avatar_url, managed_province')
        .in('user_id', userIds);
      if (profErr) throw profErr;

      // Fetch permissions
      const { data: perms, error: permsErr } = await (supabase as any)
        .from('manager_permissions')
        .select('*')
        .in('user_id', userIds);
      if (permsErr) {
        // Table might not exist yet
        console.warn('manager_permissions query warning:', permsErr);
      }

      const permsMap = new Map<string, Record<string, boolean>>();
      (perms || []).forEach((p: any) => {
        const entry: Record<string, boolean> = {};
        PERMISSIONS.forEach(def => {
          entry[def.key] = !!p[def.key];
        });
        permsMap.set(p.user_id, entry);
      });

      return (profiles || []).map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        avatar_url: p.avatar_url,
        managed_province: p.managed_province,
        permissions: permsMap.get(p.user_id) || {},
      }));
    },
  });

  // ── Filtered list ──
  const filtered = useMemo(() => {
    let list = managers;

    if (provinceFilter !== 'all') {
      list = list.filter(m => m.managed_province === provinceFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        (m.full_name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [managers, provinceFilter, search]);

  // ── Toggle permission mutation ──
  const togglePermMutation = useMutation({
    mutationFn: async ({ userId, key, value }: { userId: string; key: string; value: boolean }) => {
      const { error } = await (supabase as any)
        .from('manager_permissions')
        .upsert(
          { user_id: userId, province_id: managers.find(m => m.user_id === userId)?.managed_province, [key]: value },
          { onConflict: 'user_id,province_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regional-managers-permissions'] });
    },
    onError: () => {
      toast.error('Erro ao actualizar permissão');
    },
  });

  // ── Remove manager mutation ──
  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Remove role
      await (supabase as any)
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'regional_manager');

      // Clear managed_province
      await (supabase as any)
        .from('profiles')
        .update({ managed_province: null })
        .eq('user_id', userId);

      // Remove permissions
      try {
        await (supabase as any)
          .from('manager_permissions')
          .delete()
          .eq('user_id', userId);
      } catch {
        // Ignore if table doesn't exist
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regional-managers-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['province-managers'] });
      toast.success('Gestor removido com sucesso');
      setRemoveTarget(null);
    },
    onError: () => {
      toast.error('Erro ao remover gestor');
    },
  });

  const handleTogglePerm = (userId: string, key: string, currentVal: boolean) => {
    setEditingPerms(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [key]: !currentVal },
    }));
    togglePermMutation.mutate({ userId, key, value: !currentVal });
  };

  // ── Stats ──
  const totalManagers = managers.length;
  const provincesCovered = new Set(managers.map(m => m.managed_province).filter(Boolean)).size;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl md:text-3xl font-bold">
          {t('regional.permissions_title') || 'Permissões dos Gestores Regionais'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('regional.permissions_subtitle') || 'Gerir permissões e acessos dos gestores provinciais'}
        </p>
      </motion.div>

      {/* ── Stats ── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8"
      >
        <motion.div variants={fadeUp}>
          <GlassCard className="text-center">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Gestores Activos</p>
            <p className="text-2xl font-black tabular-nums mt-1 text-emerald-600"><NumberFlow value={totalManagers} /></p>
          </GlassCard>
        </motion.div>
        <motion.div variants={fadeUp}>
          <GlassCard className="text-center">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Províncias Cobertas</p>
            <p className="text-2xl font-black tabular-nums mt-1"><NumberFlow value={provincesCovered} /></p>
          </GlassCard>
        </motion.div>
        <motion.div variants={fadeUp}>
          <GlassCard className="text-center">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Sem Cobertura</p>
            <p className="text-2xl font-black tabular-nums mt-1 text-amber-600"><NumberFlow value={11 - provincesCovered} /></p>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* ── Filters ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-3 mb-6"
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('regional.permissions_search') || 'Pesquisar gestores...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={provinceFilter} onValueChange={setProvinceFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder={t('regional.permissions_filter_province') || 'Filtrar por Província'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Províncias</SelectItem>
            {provinces.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.culturalSymbol} {p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* ── Manager List ── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="text-center py-12">
          <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-1">Nenhum gestor regional encontrado</h3>
          <p className="text-muted-foreground text-sm">
            {managers.length === 0
              ? 'Ainda não existem gestores provinciais atribuídos.'
              : 'Tente ajustar os filtros de pesquisa.'}
          </p>
        </GlassCard>
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {filtered.map((manager) => {
            const theme = getProvinceTheme(manager.managed_province);
            const activePerms = Object.entries(manager.permissions).filter(([, v]) => v).length;
            return (
              <motion.div key={manager.user_id} variants={fadeUp}>
                <GlassCard className="overflow-hidden">
                  {/* Province color bar */}
                  {theme && (
                    <div
                      className="h-1"
                      style={{ background: theme.gradients.hero }}
                    />
                  )}

                  <div className="p-4 md:p-5">
                    {/* Top row: user info + actions */}
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                        style={{ backgroundColor: theme?.colors.primary || '#6b7280' }}
                      >
                        {manager.avatar_url ? (
                          <img
                            src={manager.avatar_url}
                            alt={manager.full_name || ''}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          (manager.full_name || '?')[0]?.toUpperCase()
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-base truncate">
                            {manager.full_name || 'Sem nome'}
                          </h3>
                          {theme && (
                            <Badge
                              variant="secondary"
                              className="text-xs"
                              style={{
                                backgroundColor: `${theme.colors.primary}15`,
                                color: theme.colors.primary,
                                borderColor: `${theme.colors.primary}30`,
                              }}
                            >
                              <MapPin className="h-3 w-3 mr-1" />
                              {theme.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {manager.email || '—'}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => setRemoveTarget(manager)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Permissions grid */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PERMISSIONS.map((perm) => {
                        const Icon = perm.icon;
                        const currentVal = editingPerms[manager.user_id]?.[perm.key] ?? manager.permissions[perm.key];
                        const isMutating = togglePermMutation.isPending &&
                          togglePermMutation.variables?.userId === manager.user_id &&
                          togglePermMutation.variables?.key === perm.key;

                        return (
                          <div
                            key={perm.key}
                            className={
                              'flex items-center justify-between p-2.5 rounded-lg border transition-all ' +
                              (currentVal
                                ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
                                : 'bg-muted/30 border-transparent')
                            }
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon
                                className={
                                  'h-3.5 w-3.5 shrink-0 ' +
                                  (currentVal ? 'text-emerald-600' : 'text-muted-foreground')
                                }
                              />
                              <span className="text-xs font-medium truncate">
                                {t(perm.labelKey) || perm.fallback}
                              </span>
                            </div>
                            <Switch
                              checked={!!currentVal}
                              disabled={isMutating}
                              onCheckedChange={() => handleTogglePerm(manager.user_id, perm.key, !!currentVal)}
                              className="scale-75"
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Active perm count */}
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">
                        <Shield className="h-3 w-3 inline mr-1" />
                        {activePerms}/{PERMISSIONS.length} permissões activas
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ── Remove Confirmation Dialog ── */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              {t('regional.assign_manager_remove') || 'Remover Gestor'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('regional.assign_manager_remove_confirm') || 'Tem a certeza que deseja remover este gestor?'}
              <br />
              <span className="font-semibold text-foreground">
                {removeTarget?.full_name || '—'}
              </span>
              {' — '}
              {removeTarget?.managed_province
                ? getProvinceTheme(removeTarget.managed_province)?.name
                : 'Sem província'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeTarget && removeMutation.mutate(removeTarget.user_id)}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
