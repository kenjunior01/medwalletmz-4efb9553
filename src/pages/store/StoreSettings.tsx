import { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useCountry } from '@/contexts/CountryContext';
import { Save, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface StoreData {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string;
  type: string;
  delivery_time: string | null;
  delivery_fee: number | null;
  image_url: string | null;
  is_active: boolean | null;
}

interface StoreContext {
  selectedStore: StoreData | null;
  refreshStores: () => void;
}

const storeTypes = [
  { value: 'food', label: 'Restaurante / Comida' },
  { value: 'grocery', label: 'Mercearia / Supermercado' },
  { value: 'pharmacy', label: 'Farmácia' },
];

const cities = [
  'Maputo', 'Beira', 'Nampula', 'Quelimane', 'Tete', 
  'Chimoio', 'Nacala', 'Pemba', 'Lichinga', 'Xai-Xai'
];

export default function StoreSettings() {
  const navigate = useNavigate();
  const { country } = useCountry();
  const { selectedStore, refreshStores } = useOutletContext<StoreContext>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    type: '',
    delivery_time: '',
    delivery_fee: '',
    image_url: '',
    is_active: true
  });

  useEffect(() => {
    if (selectedStore) {
      setFormData({
        name: selectedStore.name || '',
        description: selectedStore.description || '',
        address: selectedStore.address || '',
        city: selectedStore.city || '',
        type: selectedStore.type || '',
        delivery_time: selectedStore.delivery_time || '',
        delivery_fee: selectedStore.delivery_fee?.toString() || '',
        image_url: selectedStore.image_url || '',
        is_active: selectedStore.is_active ?? true
      });
      setLoading(false);
    }
  }, [selectedStore]);

  const handleSave = async () => {
    if (!selectedStore) return;

    if (!formData.name || !formData.city || !formData.type) {
      toast.error('Nome, cidade e tipo são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({
          name: formData.name,
          description: formData.description || null,
          address: formData.address || null,
          city: formData.city,
          type: formData.type,
          delivery_time: formData.delivery_time || null,
          delivery_fee: formData.delivery_fee ? parseFloat(formData.delivery_fee) : null,
          image_url: formData.image_url || null,
          is_active: formData.is_active
        })
        .eq('id', selectedStore.id);

      if (error) throw error;

      toast.success('Configurações salvas!');
      refreshStores();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStore) return;

    setDeleting(true);
    try {
      // First delete all products
      await supabase
        .from('products')
        .delete()
        .eq('store_id', selectedStore.id);

      // Then delete the store
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', selectedStore.id);

      if (error) throw error;

      toast.success('Farmácia excluída com sucesso');
      navigate('/');
    } catch (error: any) {
      console.error('Error deleting store:', error);
      toast.error('Erro ao excluir farmácia');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as informações da sua farmácia
        </p>
      </div>

      {/* Store Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Farmácia *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Negócio *</Label>
            <Select 
              value={formData.type} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {storeTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">URL da Imagem</Label>
            <Input
              id="image_url"
              value={formData.image_url}
              onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle>Localização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Cidade *</Label>
            <Select 
              value={formData.city} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, city: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(country?.config?.cities || cities).map((city: string) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço Completo</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delivery */}
      <Card>
        <CardHeader>
          <CardTitle>Entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tempo Estimado</Label>
            <Select 
              value={formData.delivery_time} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, delivery_time: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15-25 min">15-25 minutos</SelectItem>
                <SelectItem value="30-45 min">30-45 minutos</SelectItem>
                <SelectItem value="45-60 min">45-60 minutos</SelectItem>
                <SelectItem value="60-90 min">60-90 minutos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery_fee">Taxa de Entrega ({country?.currency_code || 'MZN'})</Label>
            <Input
              id="delivery_fee"
              type="number"
              value={formData.delivery_fee}
              onChange={(e) => setFormData(prev => ({ ...prev, delivery_fee: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Farmácia Ativa</p>
              <p className="text-sm text-muted-foreground">
                Desative para ocultar sua farmácia dos clientes
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Excluir sua farmácia removerá permanentemente todos os produtos e dados associados.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Farmácia
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente sua farmácia
                  "{selectedStore?.name}" e todos os produtos associados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
