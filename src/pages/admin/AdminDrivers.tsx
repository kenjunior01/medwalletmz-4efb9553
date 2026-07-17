import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Search, Truck, Phone, MapPin, Calendar, CheckCircle, XCircle, Clock, Package, ShieldCheck, Snowflake, Globe } from 'lucide-react';
import { useCountry } from '@/contexts/CountryContext';

interface Driver {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  vehicle_type: string | null;
  license_plate: string | null;
  is_available: boolean | null;
  created_at: string;
  default_city: string | null;
  is_verified_driver?: boolean | null;
  health_certified?: boolean | null;
}

interface DriverStats {
  totalDeliveries: number;
  pendingDeliveries: number;
  todayDeliveries: number;
}

export default function AdminDrivers() {
  const queryClient = useQueryClient();
  const { country } = useCountry();
  const [search, setSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [driverStats, setDriverStats] = useState<DriverStats | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: drivers, isLoading } = useQuery({
    queryKey: ['admin-drivers', search, availabilityFilter, country?.id],
    queryFn: async () => {
      const { data: raw, error } = await (supabase.rpc as any)('list_profiles_admin_full', {
        p_country_id: country?.id
      });
      if (error) throw error;
      let list: any[] = (raw || []).filter((p: any) => p.vehicle_type);
      if (search) {
        const q = search.toLowerCase();
        list = list.filter((p: any) =>
          (p.full_name || '').toLowerCase().includes(q) ||
          (p.phone || '').toLowerCase().includes(q) ||
          (p.license_plate || '').toLowerCase().includes(q)
        );
      }
      if (availabilityFilter === 'available') list = list.filter((p: any) => p.is_available === true);
      else if (availabilityFilter === 'unavailable') list = list.filter((p: any) => p.is_available === false);
      return list as Driver[];
    }
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_available: isAvailable })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] });
      toast.success('Disponibilidade atualizada');
    },
    onError: () => {
      toast.error('Erro ao atualizar');
    }
  });

  const updateCertMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: 'is_verified_driver' | 'health_certified'; value: boolean }) => {
      const patch: any = { [field]: value };
      if (field === 'is_verified_driver' && value) patch.verified_at = new Date().toISOString();
      const { error } = await supabase.from('profiles').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] });
      setSelectedDriver(prev => prev ? { ...prev, [vars.field]: vars.value } : null);
      toast.success('Certificação atualizada');
    },
    onError: () => toast.error('Erro ao atualizar certificação'),
  });

  const openDriverDetails = async (driver: Driver) => {
    setSelectedDriver(driver);
    setIsDialogOpen(true);

    // Fetch driver stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: assignments } = await supabase
      .from('driver_assignments')
      .select('id, status, assigned_at')
      .eq('driver_id', driver.user_id);

    const todayAssignments = assignments?.filter(a => 
      new Date(a.assigned_at) >= today
    ).length || 0;

    const pendingAssignments = assignments?.filter(a => 
      a.status !== 'delivered' && a.status !== 'cancelled'
    ).length || 0;

    setDriverStats({
      totalDeliveries: assignments?.length || 0,
      pendingDeliveries: pendingAssignments,
      todayDeliveries: todayAssignments
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const vehicleLabels: Record<string, string> = {
    motorcycle: 'Moto',
    bicycle: 'Bicicleta',
    car: 'Carro',
    scooter: 'Scooter'
  };

  const stats = {
    total: drivers?.length || 0,
    available: drivers?.filter(d => d.is_available).length || 0,
    unavailable: drivers?.filter(d => !d.is_available).length || 0
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Entregadores</h1>
        <p className="text-muted-foreground">Gerencie todos os entregadores da plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Truck className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-green-600 mb-1" />
            <p className="text-2xl font-bold text-green-600">{stats.available}</p>
            <p className="text-xs text-muted-foreground">Disponíveis</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4 text-center">
            <XCircle className="h-5 w-5 mx-auto text-red-600 mb-1" />
            <p className="text-2xl font-bold text-red-600">{stats.unavailable}</p>
            <p className="text-xs text-muted-foreground">Indisponíveis</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, telefone ou matrícula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Disponibilidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="available">Disponíveis</SelectItem>
            <SelectItem value="unavailable">Indisponíveis</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Drivers List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : drivers && drivers.length > 0 ? (
        <div className="space-y-3">
          {drivers.map((driver) => (
            <Card 
              key={driver.id} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => openDriverDetails(driver)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {driver.avatar_url ? (
                      <img src={driver.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Truck className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate">
                        {driver.full_name || 'Sem nome'}
                      </p>
                      <Badge variant={driver.is_available ? 'default' : 'secondary'}>
                        {driver.is_available ? 'Disponível' : 'Indisponível'}
                      </Badge>
                      {driver.is_verified_driver && (
                        <Badge className="bg-green-500 text-white gap-1"><ShieldCheck className="h-3 w-3" /> Verificado</Badge>
                      )}
                      {driver.health_certified && (
                        <Badge className="bg-blue-500 text-white gap-1"><Snowflake className="h-3 w-3" /> Saúde</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {vehicleLabels[driver.vehicle_type || ''] || driver.vehicle_type}
                      </span>
                      {driver.license_plate && (
                        <span className="font-mono">{driver.license_plate}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={driver.is_available || false}
                      onCheckedChange={(checked) => {
                        toggleAvailabilityMutation.mutate({ 
                          id: driver.id, 
                          isAvailable: checked 
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Nenhum entregador encontrado</h3>
            <p className="text-muted-foreground">Os entregadores aparecem aqui após se registarem</p>
          </CardContent>
        </Card>
      )}

      {/* Driver Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Entregador</DialogTitle>
          </DialogHeader>
          {selectedDriver && (
            <div className="space-y-6">
              {/* Profile Info */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {selectedDriver.avatar_url ? (
                    <img src={selectedDriver.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Truck className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-lg font-semibold">{selectedDriver.full_name || 'Sem nome'}</p>
                  <Badge variant={selectedDriver.is_available ? 'default' : 'secondary'}>
                    {selectedDriver.is_available ? 'Disponível' : 'Indisponível'}
                  </Badge>
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Veículo</p>
                  <p className="font-medium">
                    {vehicleLabels[selectedDriver.vehicle_type || ''] || selectedDriver.vehicle_type}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Matrícula</p>
                  <p className="font-mono font-medium">{selectedDriver.license_plate || '-'}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 text-sm">
                {selectedDriver.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${selectedDriver.phone}`} className="hover:underline">
                      {selectedDriver.phone}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedDriver.default_city || country?.config?.cities?.[0] || 'Maputo'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Registado em {formatDate(selectedDriver.created_at)}</span>
                </div>
              </div>

              {/* Stats */}
              {driverStats && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Package className="h-4 w-4 mx-auto text-primary mb-1" />
                    <p className="text-lg font-bold">{driverStats.totalDeliveries}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <Clock className="h-4 w-4 mx-auto text-yellow-600 mb-1" />
                    <p className="text-lg font-bold text-yellow-600">{driverStats.pendingDeliveries}</p>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </div>
                  <div className="text-center p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="h-4 w-4 mx-auto text-green-600 mb-1" />
                    <p className="text-lg font-bold text-green-600">{driverStats.todayDeliveries}</p>
                    <p className="text-xs text-muted-foreground">Hoje</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
              </div>

              {/* Certifications */}
              <div className="space-y-2 p-3 border rounded-lg">
                <p className="text-sm font-semibold">Certificações</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                    <span>Motorista verificado</span>
                  </div>
                  <Switch
                    checked={!!selectedDriver.is_verified_driver}
                    onCheckedChange={(v) => updateCertMutation.mutate({ id: selectedDriver.id, field: 'is_verified_driver', value: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Snowflake className="h-4 w-4 text-blue-500" />
                    <span>Apto para friagem / saúde</span>
                  </div>
                  <Switch
                    checked={!!selectedDriver.health_certified}
                    onCheckedChange={(v) => updateCertMutation.mutate({ id: selectedDriver.id, field: 'health_certified', value: v })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    toggleAvailabilityMutation.mutate({
                      id: selectedDriver.id,
                      isAvailable: !selectedDriver.is_available
                    });
                    setSelectedDriver(prev => prev ? {
                      ...prev,
                      is_available: !prev.is_available
                    } : null);
                  }}
                >
                  {selectedDriver.is_available ? 'Marcar Indisponível' : 'Marcar Disponível'}
                </Button>
                {selectedDriver.phone && (
                  <Button asChild>
                    <a href={`https://wa.me/${selectedDriver.phone.replace(/\D/g, '')}`} target="_blank">
                      Contactar
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
