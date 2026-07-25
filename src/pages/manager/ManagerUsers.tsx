import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useManagedCountry } from '@/hooks/useManagedCountry';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Users, Search, Filter, ChevronRight, MoreVertical,
  Shield, Ban, CheckCircle, AlertCircle, Eye,
  Stethoscope, Store, Building2, UserCircle
} from 'lucide-react';
import {
  GlassCard, BentoCard, BentoGrid,
} from '@/components/ui/design-system';

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

export default function ManagerUsers() {
  const { user } = useAuth();
  const { managedCountryId, countryCode } = useManagedCountry();
  const { t } = useCountry();
  const navigate = useNavigate();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    if (!user || !managedCountryId) return;
    loadUsers();
  }, [user, managedCountryId]);

  const loadUsers = async () => {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('country_id', managedCountryId)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data, error } = await query;
    if (data) {
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
    }
    setLoading(false);
  };

  const toggleUserActive = async (userId: string, isActive: boolean) => {
    await supabase
      .from('profiles')
      .update({ is_active: !isActive } as any)
      .eq('id', userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !isActive } : u));
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = searchQuery === '' ||
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleIcon = (role: string) => {
    switch (role) {
      case 'doctor': return <Stethoscope className="h-3.5 w-3.5" />;
      case 'store_owner': case 'pharmacy': return <Store className="h-3.5 w-3.5" />;
      case 'clinic': case 'hospital': return <Building2 className="h-3.5 w-3.5" />;
      default: return <UserCircle className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-black">{t('manager.users_title') || 'Utilizadores da Região'}</h1>
        <p className="text-sm text-muted-foreground">{t('manager.users_desc') || 'Gerir utilizadores do seu país'}</p>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('manager.search_users') || 'Pesquisar utilizadores...'}
            className="pl-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['all', 'user', 'doctor', 'store_owner', 'clinic'].map(role => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              roleFilter === role
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            {role === 'all' ? (t('manager.all') || 'Todos') : role}
          </button>
        ))}
      </div>

      {/* User count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{filteredUsers.length} {t('manager.users_found') || 'utilizadores encontrados'}</p>
      </div>

      {/* User list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <GlassCard className="!p-8 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">{t('manager.no_users') || 'Nenhum utilizador encontrado'}</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map(u => (
            <GlassCard key={u.id} className="!p-3 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
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
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant="outline" className="text-[10px]">{u.role}</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className={`h-8 w-8 p-0 ${u.is_active ? 'text-red-500 hover:bg-red-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                  onClick={() => toggleUserActive(u.id, u.is_active)}
                  title={u.is_active ? 'Desactivar' : 'Activar'}
                >
                  {u.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
