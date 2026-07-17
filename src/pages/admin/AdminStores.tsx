import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, MapPin, Star, Store } from 'lucide-react';

interface StoreFormData {
  name: string;
  type: 'food' | 'grocery' | 'pharmacy';
  city: string;
  address: string;
  description: string;
  image_url: string;
  delivery_fee: number;
  delivery_time: string;
  latitude?: number;
  longitude?: number;
}

const initialFormData: StoreFormData = {
  name: '',
  type: 'food',
  city: 'Maputo',
  address: '',
  description: '',
  image_url: '',
  delivery_fee: 50,
  delivery_time: '25-35 min'
};

export default function AdminStores() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [formData, setFormData] = useState<StoreFormData>(initialFormData);

  const { data: stores, isLoading } = useQuery({
    queryKey: ['admin-stores', search],
    queryFn: async () => {
      let query = supabase.from('stores').select('*').order('created_at', { ascending: false });
      
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: StoreFormData) => {
      const { error } = await supabase.from('stores').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
      toast.success('Farmácia criada com sucesso');
      setIsDialogOpen(false);
      setFormData(initialFormData);
    },
    onError: () => {
      toast.error('Erro ao criar farmácia');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: StoreFormData }) => {
      const { error } = await supabase.from('stores').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
      toast.success('Farmácia atualizada');
      setIsDialogOpen(false);
      setEditingStore(null);
      setFormData(initialFormData);
    },
    onError: () => {
      toast.error('Erro ao atualizar farmácia');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('stores').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
      toast.success('Farmácia removida');
    },
    onError: () => {
      toast.error('Erro ao remover farmácia');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStore) {
      updateMutation.mutate({ id: editingStore.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (store: any) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      type: store.type,
      city: store.city,
      address: store.address || '',
      description: store.description || '',
      image_url: store.image_url || '',
      delivery_fee: store.delivery_fee || 50,
      delivery_time: store.delivery_time || '25-35 min',
      latitude: store.latitude,
      longitude: store.longitude
    });
    setIsDialogOpen(true);
  };

  const typeLabels = {
    food: 'Restaurante',
    grocery: 'Supermercado',
    pharmacy: 'Farmácia'
  };

  const typeColors = {
    food: 'bg-food/20 text-food',
    grocery: 'bg-grocery/20 text-grocery',
    pharmacy: 'bg-pharmacy/20 text-pharmacy'
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Farmácias</h1>
          <p className="text-muted-foreground">Gerencie restaurantes, supermercados e farmácias</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingStore(null);
            setFormData(initialFormData);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Farmácia
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingStore ? 'Editar Farmácia' : 'Nova Farmácia'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label>Tipo</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v: any) => setFormData(prev => ({ ...prev, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food">Restaurante</SelectItem>
                    <SelectItem value="grocery">Supermercado</SelectItem>
                    <SelectItem value="pharmacy">Farmácia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cidade</Label>
                <Select 
                  value={formData.city} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, city: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Maputo">Maputo</SelectItem>
                    <SelectItem value="Beira">Beira</SelectItem>
                    <SelectItem value="Nampula">Nampula</SelectItem>
                    <SelectItem value="Quelimane">Quelimane</SelectItem>
                    <SelectItem value="Tete">Tete</SelectItem>
                    <SelectItem value="Chimoio">Chimoio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Endereço</Label>
                <Input 
                  value={formData.address} 
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Input 
                  value={formData.description} 
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div>
                <Label>URL da Imagem</Label>
                <Input 
                  value={formData.image_url} 
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Taxa de Entrega (MZN)</Label>
                  <Input 
                    type="number"
                    value={formData.delivery_fee} 
                    onChange={(e) => setFormData(prev => ({ ...prev, delivery_fee: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label>Tempo de Entrega</Label>
                  <Input 
                    value={formData.delivery_time} 
                    onChange={(e) => setFormData(prev => ({ ...prev, delivery_time: e.target.value }))}
                    placeholder="25-35 min"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Latitude</Label>
                  <Input 
                    type="number"
                    step="any"
                    value={formData.latitude || ''} 
                    onChange={(e) => setFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) || undefined }))}
                  />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input 
                    type="number"
                    step="any"
                    value={formData.longitude || ''} 
                    onChange={(e) => setFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) || undefined }))}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingStore ? 'Atualizar' : 'Criar'} Farmácia
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar farmácias..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 max-w-sm"
        />
      </div>

      {/* Stores Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-32 w-full mb-3" />
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stores && stores.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <Card key={store.id} className="overflow-hidden">
              <div className="h-32 overflow-hidden">
                <img 
                  src={store.image_url || '/placeholder.svg'} 
                  alt={store.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{store.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[store.type as keyof typeof typeColors]}`}>
                      {typeLabels[store.type as keyof typeof typeLabels]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span>{store.rating?.toFixed(1) || '0.0'}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                  <MapPin className="h-3 w-3" />
                  <span>{store.city}</span>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => openEditDialog(store)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm('Tem certeza que deseja remover esta farmácia?')) {
                        deleteMutation.mutate(store.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Nenhuma farmácia encontrada</h3>
            <p className="text-muted-foreground">Comece adicionando sua primeira farmácia</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
