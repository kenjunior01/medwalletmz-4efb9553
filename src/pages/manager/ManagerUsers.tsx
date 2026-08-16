import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useManagedCountry } from '@/hooks/useManagedCountry';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users, Search, ChevronRight, ChevronLeft,
  Shield, Ban, CheckCircle, AlertCircle,
  Stethoscope, Store, Building2, UserCircle, Loader2,
} from "@/components/icons/lucide-compat";
import {
  GlassCard, BentoGrid, BentoCard,
} from '@/components/ui/design-system';
import { toast } from 'sonner';

interface ManagedUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  country_code: string;
  is_active: boolean;
  created_at: string;
  last_sign_in?: string;
}

const PAGE_SIZE = 30;

export default function ManagerUsers() {
  const { user } = useAuth();
  const { managedCountryId, countryCode } = useManagedCountry();
  const { t } = useCountry();
  const navigate = useNavigate();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ userId: string; activate: boolean; name: string } | null>(null);

  const loadUsers = useCallback(async (pageNum: number, search: string, role: string) => {
    if (!managedCountryId) return;
    setLoading(true);

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('country_id', managedCountryId)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    if (role !== 'all') {
      query = query.eq('primary_role', role);
    }

    const { data, error, count } = await query;

    if (error) {
      toast.error('Erro ao carregar utilizadores');
    } else if (data) {
      setUsers(data.map((p: any) => ({
        id: p.id,
        full_name: p.full_name || p.email,
        email: p.email,
        phone: p.phone || '',
        role: p.primary_role || 'user',
        country_code: p.country_code || countryCode,
        is_active: p.is_active ?? true,
        created_at: p.created_at,
        last_sign_in: p.last_sign_in_at,
      })));
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [managedCountryId, countryCode]);

  useEffect(() => {
    if (!user || !managedCountryId) return;
    setPage(0);
    loadUsers(0, searchQuery, roleFilter);
  }, [user, managedCountryId, searchQuery, roleFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      loadUsers(0, searchQuery, roleFilter);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleUserActive = async (userId: string, isActive: boolean) => {
    setTogglingId(userId);
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !isActive } as any)
      .eq('id', userId);

    if (error) {
      toast.error('Erro ao alterar estado do utilizador');
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !isActive } : u));
      toast.success(isActive ? 'Utilizador desactivado' : 'Utilizador activado');
    }
    setTogglingId(null);
    setConfirmAction(null);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasMore = page < totalPages - 1;

  const roleIcon = (role: string) => {
    switch (role) {
      case 'doctor': return <Stethoscope className="h-3.5 w-3.5" />;
      case 'store_owner': case 'pharmacy': return <Store className="h-3.5 w-3.5" />;
      case 'clinic': case 'hospital': return <Building2 className="h-3.5 w-3.5" />;
      default: return <UserCircle className="h-3.5 w-3.5" />;
    }
  };

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = {
      user: 'Utilizador', doctor: 'Médico', store_owner: 'Farmácia',
      pharmacy: 'Farmácia', clinic: 'Clínica', hospital: 'Hospital',
      lab: 'Laboratório', driver: 'Motorista', country_manager: 'Gestor',
      provincial_manager: 'Gestor Prov.',
    };
    return labels[role] || role;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-black">{t('manager.users_title') || 'Utilizadores da Região'}</h1>
        <p className="text-sm text-muted-foreground">{t('manager.users_desc') || 'Gerir utilizadores do seu país'}</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('manager.search_users') || 'Pesquisar por nome, email ou telefone...'}
          className="pl-9"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Role filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['all', 'user', 'doctor', 'store_owner', 'clinic', 'driver'].map(role => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              roleFilter === role
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            {role === 'all' ? (t('manager.all') || 'Todos') : roleLabel(role)}
          </button>
        ))}
      </div>

      {/* Count & stats */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {totalCount} {t('manager.users_found') || 'utilizadores'}
          {searchQuery && ` — filtrando por "${searchQuery}"`}
        </p>
        {totalPages > 1 && (
          <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</p>
        )}
      </div>

      {/* User list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <GlassCard className="!p-8 text-center">
          <Users className="h-11 w-11 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">{t('manager.no_users') || 'Nenhum utilizador encontrado'}</p>
          {searchQuery && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSearchQuery('')}>
              Limpar pesquisa
            </Button>
          )}
        </GlassCard>
      ) : (
        <>
          <div className="space-y-2">
            {users.map(u => (
              <GlassCard key={u.id} className="!p-3 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                  {roleIcon(u.role)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{u.full_name}</p>
                    {!u.is_active && (
                      <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px]">
                        Inactivo
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {roleLabel(u.role)}
                    {u.last_sign_in && ` · Último acesso: ${new Date(u.last_sign_in).toLocaleDateString('pt-PT')}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="outline" className="text-[10px]">{roleLabel(u.role)}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-8 w-8 p-0 ${
                      u.is_active
                        ? 'text-red-500 hover:bg-red-500/10'
                        : 'text-emerald-500 hover:bg-emerald-500/10'
                    } ${togglingId === u.id ? 'opacity-50' : ''}`}
                    onClick={() => setConfirmAction({ userId: u.id, activate: !u.is_active, name: u.full_name })}
                    disabled={togglingId === u.id}
                    title={u.is_active ? 'Desactivar' : 'Activar'}
                  >
                    {togglingId === u.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : u.is_active
                        ? <Ban className="h-4 w-4" />
                        : <CheckCircle className="h-4 w-4" />
                    }
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline" size="sm"
                className="h-9 px-3"
                disabled={page === 0}
                onClick={() => { const p = page - 1; setPage(p); loadUsers(p, searchQuery, roleFilter); }}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i;
                  } else if (page < 3) {
                    pageNum = i;
                  } else if (page > totalPages - 4) {
                    pageNum = totalPages - 5 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => { setPage(pageNum); loadUsers(pageNum, searchQuery, roleFilter); }}
                      className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors ${
                        page === pageNum
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="outline" size="sm"
                className="h-9 px-3"
                disabled={!hasMore}
                onClick={() => { const p = page + 1; setPage(p); loadUsers(p, searchQuery, roleFilter); }}
              >
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmAction(null)}>
          <GlassCard className="!p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                confirmAction.activate ? 'bg-emerald-500/10' : 'bg-red-500/10'
              }`>
                {confirmAction.activate
                  ? <CheckCircle className="h-5 w-5 text-emerald-500" />
                  : <Ban className="h-5 w-5 text-red-500" />
                }
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm">
                  {confirmAction.activate ? 'Activar utilizador?' : 'Desactivar utilizador?'}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {confirmAction.activate
                    ? `${confirmAction.name} voltará a ter acesso à plataforma.`
                    : `${confirmAction.name} perderá acesso à plataforma.`
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmAction(null)}>
                Cancelar
              </Button>
              <Button
                className={`flex-1 ${confirmAction.activate ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                onClick={() => toggleUserActive(confirmAction.userId, !confirmAction.activate)}
              >
                {confirmAction.activate ? 'Activar' : 'Desactivar'}
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
