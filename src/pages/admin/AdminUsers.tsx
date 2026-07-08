import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Search, Users, UserPlus, Shield, Mail, Phone, Calendar, ChevronRight, Globe } from 'lucide-react';
import { useCountry } from '@/contexts/CountryContext';

type AppRole = 'customer' | 'store_owner' | 'driver' | 'admin' | 'doctor' | 'clinic' | 'country_manager';

interface UserWithRoles {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  default_city: string | null;
  roles: { role: AppRole; country_id?: string | null }[];
}

const roleLabels: Record<AppRole, string> = {
  customer: 'Cliente',
  store_owner: 'Lojista',
  driver: 'Entregador',
  admin: 'Admin',
  doctor: 'Médico',
  clinic: 'Clínica',
  country_manager: 'Gestor de País'
};

const roleColors: Record<AppRole, string> = {
  customer: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  store_owner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  driver: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  doctor: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  clinic: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  country_manager: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
};

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCountryForRole, setSelectedCountryForRole] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<AppRole | null>(null);
  const { allCountries } = useCountry();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: async () => {
      // Fetch profiles via admin RPC (avoids exposing sensitive columns to signed-in users)
      const { data: profilesRaw, error: profilesError } = await (supabase.rpc as any)('list_profiles_admin_full');
      if (profilesError) throw profilesError;
      let profiles: any[] = profilesRaw || [];
      if (search) {
        const q = search.toLowerCase();
        profiles = profiles.filter((p: any) =>
          (p.full_name || '').toLowerCase().includes(q) ||
          (p.phone || '').toLowerCase().includes(q)
        );
      }

      // Fetch all user roles
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, country_id');
      if (rolesError) throw rolesError;

      // Map roles to users
      const rolesMap = new Map<string, { role: AppRole; country_id?: string | null }[]>();
      allRoles?.forEach(r => {
        const existing = rolesMap.get(r.user_id) || [];
        existing.push({ role: r.role as AppRole, country_id: r.country_id });
        rolesMap.set(r.user_id, existing);
      });

      // Combine data
      const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => ({
        ...profile,
        roles: rolesMap.get(profile.user_id) || [{ role: 'customer' as AppRole }]
      }));

      // Filter by role if specified
      if (roleFilter !== 'all') {
        return usersWithRoles.filter(u => u.roles.some(r => r.role === roleFilter));
      }

      return usersWithRoles;
    }
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role, countryId }: { userId: string; role: AppRole; countryId?: string | null }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role, country_id: countryId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role adicionado com sucesso');
      setSelectedCountryForRole(null);
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Utilizador já possui este role');
      } else {
        toast.error('Erro ao adicionar role');
      }
    }
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role removido com sucesso');
    },
    onError: () => {
      toast.error('Erro ao remover role');
    }
  });

  const openUserDetails = (user: UserWithRoles) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const stats = {
    total: users?.length || 0,
    customers: users?.filter(u => u.roles.some(r => r.role === 'customer')).length || 0,
    storeOwners: users?.filter(u => u.roles.some(r => r.role === 'store_owner')).length || 0,
    drivers: users?.filter(u => u.roles.some(r => r.role === 'driver')).length || 0,
    admins: users?.filter(u => u.roles.some(r => r.role === 'admin')).length || 0,
    doctors: users?.filter(u => u.roles.some(r => r.role === 'doctor')).length || 0,
    clinics: users?.filter(u => u.roles.some(r => r.role === 'clinic')).length || 0,
    countryManagers: users?.filter(u => u.roles.some(r => r.role === 'country_manager')).length || 0,
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Utilizadores</h1>
        <p className="text-muted-foreground">Gerencie todos os utilizadores da plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.customers}</p>
            <p className="text-xs text-muted-foreground">Clientes</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.storeOwners}</p>
            <p className="text-xs text-muted-foreground">Lojistas</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.drivers}</p>
            <p className="text-xs text-muted-foreground">Entregadores</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.admins}</p>
            <p className="text-xs text-muted-foreground">Admins</p>
          </CardContent>
        </Card>
        <Card className="border-teal-200 bg-teal-50/50 dark:bg-teal-950/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">{stats.doctors}</p>
            <p className="text-xs text-muted-foreground">Médicos</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.clinics}</p>
            <p className="text-xs text-muted-foreground">Clínicas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Roles</SelectItem>
            <SelectItem value="customer">Clientes</SelectItem>
            <SelectItem value="doctor">Médicos</SelectItem>
            <SelectItem value="clinic">Clínicas</SelectItem>
            <SelectItem value="store_owner">Lojistas</SelectItem>
            <SelectItem value="driver">Entregadores</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : users && users.length > 0 ? (
        <div className="space-y-3">
          {users.map((user) => (
            <Card 
              key={user.id} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => openUserDetails(user)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {user.full_name || 'Sem nome'}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user.roles.map((r, idx) => (
                        <Badge key={`${r.role}-${idx}`} variant="secondary" className={roleColors[r.role]}>
                          {roleLabels[r.role]} {r.country_id ? `(${r.country_id})` : ''}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground hidden md:block">
                    <p>{user.phone || '-'}</p>
                    <p className="text-xs">{formatDate(user.created_at)}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Nenhum utilizador encontrado</h3>
            <p className="text-muted-foreground">Tente ajustar os filtros de pesquisa</p>
          </CardContent>
        </Card>
      )}

      {/* User Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Utilizador</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {/* Profile Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Users className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-lg font-semibold">{selectedUser.full_name || 'Sem nome'}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.default_city || 'Maputo'}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 text-sm">
                {selectedUser.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedUser.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Registado em {formatDate(selectedUser.created_at)}</span>
                </div>
              </div>

              {/* Roles Management */}
              <div>
                <p className="font-medium mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Roles do Utilizador
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedUser.roles.map((r, idx) => (
                    <Badge 
                      key={`${r.role}-${idx}`}
                      className={`${roleColors[r.role]} cursor-pointer`}
                      onClick={() => {
                        if (selectedUser.roles.length > 1) {
                          if (confirm(`Remover role "${roleLabels[r.role]}"${r.country_id ? ` em ${r.country_id}` : ''}?`)) {
                            removeRoleMutation.mutate({ userId: selectedUser.user_id, role: r.role });
                            setSelectedUser(prev => prev ? {
                              ...prev,
                              roles: prev.roles.filter((_, i) => i !== idx)
                            } : null);
                          }
                        } else {
                          toast.error('Utilizador precisa de pelo menos um role');
                        }
                      }}
                    >
                      {roleLabels[r.role]} {r.country_id ? `(${r.country_id})` : ''} ×
                    </Badge>
                  ))}
                </div>
                
                {/* Add Role */}
                <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-dashed">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <UserPlus className="h-3 w-3" /> Atribuir Novo Role
                  </p>

                  <div className="flex gap-2">
                    <Select value={pendingRole || ''} onValueChange={(role: AppRole) => setPendingRole(role)}>
                      <SelectTrigger className="flex-1 h-9 text-xs">
                        <SelectValue placeholder="Escolha o role..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(['customer', 'doctor', 'clinic', 'store_owner', 'driver', 'admin', 'country_manager'] as AppRole[])
                          .map(role => (
                            <SelectItem key={role} value={role}>
                              {roleLabels[role]}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>

                    <Select value={selectedCountryForRole || 'global'} onValueChange={(v) => setSelectedCountryForRole(v === 'global' ? null : v)}>
                      <SelectTrigger className="w-[100px] h-9 text-xs">
                        <SelectValue placeholder="Global" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Global</SelectItem>
                        {allCountries.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    size="sm"
                    className="w-full h-8 text-xs font-bold"
                    disabled={!pendingRole || addRoleMutation.isPending}
                    onClick={() => {
                      if (pendingRole && selectedUser) {
                        addRoleMutation.mutate({
                          userId: selectedUser.user_id,
                          role: pendingRole,
                          countryId: selectedCountryForRole
                        });
                        // Optimistic update for UI
                        setSelectedUser(prev => prev ? {
                          ...prev,
                          roles: [...prev.roles, { role: pendingRole, country_id: selectedCountryForRole }]
                        } : null);
                        setPendingRole(null);
                      }
                    }}
                  >
                    {addRoleMutation.isPending ? 'A processar...' : 'Confirmar Atribuição'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
