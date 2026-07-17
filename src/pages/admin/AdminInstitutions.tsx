import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Search, Edit, Star, MapPin, Phone, Building2, FlaskConical, Stethoscope, PawPrint } from 'lucide-react';
import { SafeImage } from '@/components/ui/safe-image';

type EntityType = 'pharmacy' | 'hospital' | 'clinic' | 'laboratory' | 'veterinary';

const ENTITY_META: Record<EntityType, { label: string; table: string; icon: any; color: string; imageField: string }> = {
  pharmacy:    { label: 'Farmácia',         table: 'stores',              icon: Building2,     color: 'bg-emerald-500',  imageField: 'image_url' },
  hospital:    { label: 'Hospital',         table: 'clinics',             icon: Stethoscope,   color: 'bg-red-500',      imageField: 'image_url' },
  clinic:      { label: 'Clínica',          table: 'clinics',             icon: Stethoscope,   color: 'bg-blue-500',     imageField: 'image_url' },
  laboratory:  { label: 'Laboratório',      table: 'laboratories',        icon: FlaskConical,  color: 'bg-purple-500',   imageField: 'logo_url' },
  veterinary:  { label: 'Veterinária',      table: 'veterinary_clinics',  icon: PawPrint,      color: 'bg-orange-500',   imageField: 'image_url' },
};

const MZ_PROVINCES = [
  'Maputo Cidade', 'Maputo Província', 'Gaza', 'Inhambane', 'Sofala',
  'Manica', 'Tete', 'Zambézia', 'Nampula', 'Cabo Delgado', 'Niassa'
];

export default function AdminInstitutions() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<EntityType>('pharmacy');
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch data for current tab
  const { data, isLoading } = useQuery({
    queryKey: ['admin-institutions', activeTab, search, cityFilter],
    queryFn: async () => {
      const meta = ENTITY_META[activeTab];
      let query: any = (supabase as any).from(meta.table).select('*').eq('country_id', 'MZ');

      // For clinics table, filter by type when activeTab is hospital/clinic
      if (activeTab === 'hospital') {
        query = query.eq('type', 'hospital');
      } else if (activeTab === 'clinic') {
        query = query.eq('type', 'clinic');
      }

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      if (cityFilter !== 'all') {
        query = query.eq('city', cityFilter);
      }

      const { data, error } = await query.order('name', { ascending: true }).limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  // Get unique cities from data for filter dropdown
  const cities = useMemo(() => {
    if (!data) return [];
    const unique = [...new Set(data.map((d: any) => d.city).filter(Boolean))];
    return unique.sort();
  }, [data]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const meta = ENTITY_META[activeTab];
      const { error } = await (supabase as any).from(meta.table).update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Instituição atualizada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['admin-institutions'] });
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error('Erro ao atualizar: ' + err.message),
  });

  const toggleActive = async (entity: any) => {
    const meta = ENTITY_META[activeTab];
    const { error } = await (supabase as any).from(meta.table)
      .update({ is_active: !entity.is_active })
      .eq('id', entity.id);
    if (error) {
      toast.error('Erro: ' + error.message);
    } else {
      toast.success(entity.is_active ? 'Desativado' : 'Ativado');
      queryClient.invalidateQueries({ queryKey: ['admin-institutions'] });
    }
  };

  const openEdit = (entity: any) => {
    setEditingEntity(entity);
    setIsDialogOpen(true);
  };

  const handleSave = (updated: any) => {
    if (!editingEntity) return;
    const meta = ENTITY_META[activeTab];
    const payload: any = {
      name: updated.name,
      city: updated.city,
      address: updated.address,
      phone: updated.phone,
      description: updated.description,
      [meta.imageField]: updated[meta.imageField] || updated.image_url || updated.logo_url,
      latitude: updated.latitude ? Number(updated.latitude) : null,
      longitude: updated.longitude ? Number(updated.longitude) : null,
      is_active: updated.is_active,
    };
    if (activeTab === 'veterinary') {
      payload.emergency_24h = updated.emergency_24h;
      payload.services = updated.services;
      payload.rating = updated.rating;
    } else if (activeTab === 'pharmacy') {
      payload.delivery_fee = updated.delivery_fee ? Number(updated.delivery_fee) : null;
      payload.delivery_time = updated.delivery_time;
      payload.rating = updated.rating;
    }
    updateMutation.mutate({ id: editingEntity.id, payload });
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Curadoria de Instituições</h1>
          <p className="text-sm text-muted-foreground">
            Edita diretamente farmácias, hospitais, clínicas, laboratórios e veterinárias
          </p>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary">
          {data?.length || 0} registos
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EntityType)}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="pharmacy" className="text-xs">
            <Building2 className="h-3 w-3 mr-1" /> Farmácias
          </TabsTrigger>
          <TabsTrigger value="hospital" className="text-xs">
            <Stethoscope className="h-3 w-3 mr-1" /> Hospitais
          </TabsTrigger>
          <TabsTrigger value="clinic" className="text-xs">
            <Stethoscope className="h-3 w-3 mr-1" /> Clínicas
          </TabsTrigger>
          <TabsTrigger value="laboratory" className="text-xs">
            <FlaskConical className="h-3 w-3 mr-1" /> Laboratórios
          </TabsTrigger>
          <TabsTrigger value="veterinary" className="text-xs">
            <PawPrint className="h-3 w-3 mr-1" /> Veterinárias
          </TabsTrigger>
        </TabsList>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mt-4 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas as cidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as cidades</SelectItem>
              {cities.map((c) => {
                const s = String(c);
                return <SelectItem key={s} value={s}>{s}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Data list */}
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Nenhuma instituição encontrada. Verifica se a migration{' '}
            <code className="bg-muted px-1 rounded">20260716000000_mz_institutions_expanded_696.sql</code>{' '}
            foi executada no Supabase.
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {data.map((entity: any) => {
              const meta = ENTITY_META[activeTab];
              const Icon = meta.icon;
              const imgUrl = entity[meta.imageField] || entity.image_url || entity.logo_url;
              return (
                <Card key={entity.id} className="overflow-hidden">
                  <div className="flex gap-3 p-3">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                      <SafeImage
                        src={imgUrl}
                        alt={entity.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <Icon className={`h-4 w-4 ${meta.color} text-white rounded p-0.5 shrink-0`} />
                        <p className="font-bold text-sm truncate flex-1">{entity.name}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <MapPin className="h-3 w-3" /> {entity.city}
                      </div>
                      {entity.phone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Phone className="h-3 w-3" /> {entity.phone}
                        </div>
                      )}
                      {entity.rating > 0 && (
                        <div className="flex items-center gap-1 text-xs">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{Number(entity.rating).toFixed(1)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(entity)}
                          className="h-7 text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" /> Editar
                        </Button>
                        <Switch
                          checked={entity.is_active}
                          onCheckedChange={() => toggleActive(entity)}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Hidden TabsContent just to satisfy the Tabs API */}
        <TabsContent value={activeTab} className="hidden" />
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Instituição</DialogTitle>
          </DialogHeader>
          {editingEntity && (
            <EditForm
              entity={editingEntity}
              entityType={activeTab}
              onSave={handleSave}
              onCancel={() => setIsDialogOpen(false)}
              saving={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditForm({
  entity, entityType, onSave, onCancel, saving
}: {
  entity: any;
  entityType: EntityType;
  onSave: (updated: any) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: entity.name || '',
    city: entity.city || '',
    address: entity.address || '',
    phone: entity.phone || '',
    description: entity.description || '',
    image_url: entity.image_url || entity.logo_url || '',
    latitude: entity.latitude?.toString() || '',
    longitude: entity.longitude?.toString() || '',
    is_active: entity.is_active ?? true,
    delivery_fee: entity.delivery_fee?.toString() || '',
    delivery_time: entity.delivery_time || '',
    rating: entity.rating?.toString() || '',
    emergency_24h: entity.emergency_24h ?? false,
    services: Array.isArray(entity.services) ? entity.services.join(', ') : '',
  });

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Nome *</Label>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Cidade</Label>
          <Select value={form.city} onValueChange={(v) => set('city', v)}>
            <SelectTrigger><SelectValue placeholder="Selecionar cidade" /></SelectTrigger>
            <SelectContent>
              {MZ_PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Endereço</Label>
        <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Telefone</Label>
          <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+258 84 XXX XXXX" />
        </div>
        <div>
          <Label className="text-xs">Rating (0-5)</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="5"
            value={form.rating}
            onChange={(e) => set('rating', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Descrição</Label>
        <Textarea
          rows={3}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </div>

      <div>
        <Label className="text-xs">URL da Imagem</Label>
        <Input
          value={form.image_url}
          onChange={(e) => set('image_url', e.target.value)}
          placeholder="/institutions/pharmacy.svg ou URL completa"
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          Imagens SVG locais disponíveis: /institutions/[pharmacy|hospital|clinic|laboratory|veterinary].svg
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Latitude</Label>
          <Input value={form.latitude} onChange={(e) => set('latitude', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Longitude</Label>
          <Input value={form.longitude} onChange={(e) => set('longitude', e.target.value)} />
        </div>
      </div>

      {entityType === 'pharmacy' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Taxa de Entrega (MZN)</Label>
            <Input value={form.delivery_fee} onChange={(e) => set('delivery_fee', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Tempo de Entrega</Label>
            <Input value={form.delivery_time} onChange={(e) => set('delivery_time', e.target.value)} placeholder="ex: 30 min" />
          </div>
        </div>
      )}

      {entityType === 'veterinary' && (
        <>
          <div>
            <Label className="text-xs">Serviços (separados por vírgula)</Label>
            <Input
              value={form.services}
              onChange={(e) => set('services', e.target.value)}
              placeholder="consulta, vacinacao, cirurgia, banho"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.emergency_24h}
              onCheckedChange={(v) => set('emergency_24h', v)}
            />
            <Label className="text-xs">Urgência 24h</Label>
          </div>
        </>
      )}

      <div className="flex items-center gap-2">
        <Switch
          checked={form.is_active}
          onCheckedChange={(v) => set('is_active', v)}
        />
        <Label className="text-xs">Ativo</Label>
      </div>

      <div className="flex gap-2 pt-2 border-t">
        <Button onClick={() => onSave(form)} disabled={saving} className="flex-1">
          {saving ? 'A guardar...' : 'Guardar Alterações'}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
