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
import { Search, Users, UserPlus, Shield, Mail, Phone, Calendar, ChevronRight } from 'lucide-react';

type AppRole = 'customer' | 'store_owner' | 'driver' | 'admin' | 'doctor' | 'clinic';

interface UserWithRoles {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  default_city: string | null;
  roles: AppRole[];
}

const roleLabels: Record<AppRole, string> = {
  customer: 'Cliente',
  store_owner: 'Lojista',
  driver: 'Entregador',
  admin: 'Admin',
  doctor: 'Médico',
  clinic: 'Clínica'
};

const roleColors: Record<AppRole, string> = {
  customer: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  store_owner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  driver: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  doctor: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  clinic: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
};

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
        .select('user_id, role');
      if (rolesError) throw rolesError;

      // Map roles to users
      const rolesMap = new Map<string, AppRole[]>();
      allRoles?.forEach(r => {
        const existing = rolesMap.get(r.user_id) || [];
        existing.push(r.role as AppRole);
        rolesMap.set(r.user_id, existing);
      });

      // Combine data
      const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => ({
        ...profile,
        roles: rolesMap.get(profile.user_id) || ['customer']
      }));

      // Filter by role if specified
      if (roleFilter !== 'all') {
        return usersWithRoles.filter(u => u.roles.includes(roleFilter as AppRole));
      }

      return usersWithRoles;
    }
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role adicionado com sucesso');
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
    customers: users?.filter(u => u.roles.includes('customer')).length || 0,
    storeOwners: users?.filter(u => u.roles.includes('store_owner')).length || 0,
    drivers: users?.filter(u => u.roles.includes('driver')).length || 0,
    admins: users?.filter(u => u.roles.includes('admin')).length || 0,
    doctors: users?.filter(u => u.roles.includes('doctor')).length || 0,
    clinics: users?.filter(u => u.roles.includes('clinic')).length || 0,
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
                      {user.roles.map(role => (
                        <Badge key={role} variant="secondary" className={roleColors[role]}>
                          {roleLabels[role]}
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
                  {selectedUser.roles.map(role => (
                    <Badge 
                      key={role} 
                      className={`${roleColors[role]} cursor-pointer`}
                      onClick={() => {
                        if (selectedUser.roles.length > 1) {
                          if (confirm(`Remover role "${roleLabels[role]}"?`)) {
                            removeRoleMutation.mutate({ userId: selectedUser.user_id, role });
                            setSelectedUser(prev => prev ? {
                              ...prev,
                              roles: prev.roles.filter(r => r !== role)
                            } : null);
                          }
                        } else {
                          toast.error('Utilizador precisa de pelo menos um role');
                        }
                      }}
                    >
                      {roleLabels[role]} ×
                    </Badge>
                  ))}
                </div>
                
                {/* Add Role */}
                <div className="flex gap-2">
                  <Select 
                    onValueChange={(role: AppRole) => {
                      if (!selectedUser.roles.includes(role)) {
                        addRoleMutation.mutate({ userId: selectedUser.user_id, role });
                        setSelectedUser(prev => prev ? {
                          ...prev,
                          roles: [...prev.roles, role]
                        } : null);
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Adicionar role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(['customer', 'doctor', 'clinic', 'store_owner', 'driver', 'admin'] as AppRole[])
                        .filter(r => !selectedUser.roles.includes(r))
                        .map(role => (
                          <SelectItem key={role} value={role}>
                            <span className="flex items-center gap-2">
                              <UserPlus className="h-3 w-3" />
                              {roleLabels[role]}
                            </span>
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
