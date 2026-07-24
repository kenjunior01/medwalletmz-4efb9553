import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useManagedCountry } from '@/hooks/useManagedCountry';
import { useCountry } from '@/contexts/CountryContext';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, UserCheck, UserX, Shield, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email?: string;
  created_at: string;
  role?: string;
}

export default function ManagerUsers() {
  const { managedCountryId, countryCode, countryName } = useManagedCountry();
  const { t } = useCountry();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (!managedCountryId) return;

    async function loadUsers() {
      setLoading(true);
      try {
        // Query ISOLADA por país — NUNCA carrega outros países
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, count, error } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone, created_at', { count: 'exact' })
          .eq('country_id', managedCountryId)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) {
          console.error('Erro ao carregar utilizadores:', error);
          return;
        }

        // Buscar roles destes utilizadores
        const userIds = (data || []).map(u => u.user_id);
        const { data: roles } = userIds.length > 0
          ? await supabase.from('user_roles').select('user_id, role').in('user_id', userIds)
          : { data: [] };

        const roleMap: Record<string, string[]> = {};
        (roles || []).forEach((r: any) => {
          if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
          roleMap[r.user_id].push(r.role);
        });

        const usersWithRoles = (data || []).map(u => ({
          ...u,
          role: (roleMap[u.user_id] || []).join(', '),
        }));

        setUsers(usersWithRoles);
        setTotal(count || 0);
      } catch (err) {
        console.error('Erro:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [managedCountryId, page]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.phone || '').includes(q)
    );
  }, [users, search]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const getRoleColor = (role: string) => {
    if (role.includes('admin')) return 'destructive';
    if (role.includes('country_manager')) return 'default';
    if (role.includes('doctor')) return 'secondary';
    if (role.includes('store_owner')) return 'outline';
    if (role.includes('driver')) return 'outline';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-xl font-bold">{t('manager.users_title') || 'Gestão de Utilizadores'}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('manager.users_subtitle') || 'Apenas utilizadores da sua região'} — {countryName} ({countryCode})
        </p>
        <Badge variant="outline" className="mt-2 text-[10px]">
            {t('manager.total_users') || 'Total'}: {total}
          </Badge>
      </div>

      {/* Pesquisa */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('manager.search_users') || 'Pesquisar por nome ou telefone...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de usuários */}
      <div className="space-y-2">
        {loading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
          ))
        ) : filteredUsers.length === 0 ? (
          <Card className="border-none shadow-sm">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">{t('manager.no_users_found') || 'Nenhum utilizador encontrado.'}</p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.user_id} className="border-none shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center font-bold text-sm">
                      {(user.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{user.full_name || '—'}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {user.phone && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />{user.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.role && (
                      <Badge variant={getRoleColor(user.role) as any} className="text-[10px]">
                        {user.role}
                      </Badge>
                    )}
                    <p className="text-[10px] text-muted-foreground hidden sm:block">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Paginação */}
      {!search && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline" size="sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
              ← {t('manager.prev') || 'Anterior'}
          </Button>
          <span className="text-xs text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline" size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            {t('manager.next') || 'Próximo'} →
          </Button>
        </div>
      )}
    </div>
  );
}
