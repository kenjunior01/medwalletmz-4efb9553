import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Edit2, Trash2, Home, Briefcase, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getNeighborhoodsForCity } from '@/lib/regional-neighborhoods';

import { GoogleAddressInput } from '@/components/maps/GoogleAddressInput';

const labelIcons: Record<string, any> = {
  'Casa': Home,
  'Trabalho': Briefcase,
};

interface AddressForm {
  label: string;
  address_line: string;
  city: string;
  is_default: boolean;
  latitude?: number;
  longitude?: number;
}

export default function Addresses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { country } = useCountry();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const availableCities = country?.config?.cities || [
    'Maputo', 'Matola', 'Beira', 'Nampula', 'Quelimane',
    'Tete', 'Chimoio', 'Pemba', 'Inhambane', 'Xai-Xai'
  ];

  const [form, setForm] = useState<AddressForm>({
    label: 'Casa',
    address_line: '',
    city: availableCities[0] || 'Maputo',
    is_default: false
  });
  const [neighborhood, setNeighborhood] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const saveMutation = useMutation({
    mutationFn: async (data: AddressForm) => {
      if (!user) throw new Error('Not authenticated');

      // If setting as default, unset other defaults first
      if (data.is_default) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      if (editingId) {
        const { error } = await supabase
          .from('addresses')
          .update(data)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('addresses')
          .insert({ ...data, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success(editingId ? 'Endereço atualizado' : 'Endereço adicionado');
      resetForm();
    },
    onError: () => {
      toast.error('Erro ao salvar endereço');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Endereço removido');
    },
    onError: () => {
      toast.error('Erro ao remover endereço');
    }
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      
      // Unset all defaults first
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);
      
      // Set the new default
      const { error } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Endereço padrão definido');
    }
  });

  const resetForm = () => {
    setForm({ label: 'Casa', address_line: '', city: 'Maputo', is_default: false, latitude: undefined, longitude: undefined });
    setNeighborhood('');
    setEditingId(null);
    setIsOpen(false);
  };

  const handleEdit = (address: any) => {
    setForm({
      label: address.label,
      address_line: address.address_line,
      city: address.city,
      is_default: address.is_default,
      latitude: address.latitude,
      longitude: address.longitude
    });
    setEditingId(address.id);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.address_line.trim()) {
      toast.error('Preencha o endereço');
      return;
    }

    setIsValidating(true);
    toast.info("A validar morada...", { description: "Google Address Validation API em execução." });

    // Simulação da API
    await new Promise(r => setTimeout(r, 1500));
    setIsValidating(false);

    const finalLine = neighborhood
      ? `${neighborhood} — ${form.address_line.replace(new RegExp(`^${neighborhood}\\s*—\\s*`), '')}`
      : form.address_line;
    saveMutation.mutate({ ...form, address_line: finalLine });
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 animate-fade-in">
        <div className="p-6 bg-muted rounded-full mb-4">
          <MapPin className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold mb-2">Faça Login</h2>
        <p className="text-muted-foreground text-center text-sm mb-4">
          Entre na sua conta para gerir seus endereços
        </p>
        <Button onClick={() => navigate('/auth')}>Entrar</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meus Endereços</h1>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Endereço' : 'Novo Endereço'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.label} onValueChange={(v) => setForm(f => ({ ...f, label: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Casa">Casa</SelectItem>
                    <SelectItem value="Trabalho">Trabalho</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <GoogleAddressInput
                label="Endereço Completo"
                value={form.address_line}
                onChange={(val, info) => {
                  setForm(f => ({
                    ...f,
                    address_line: val,
                    latitude: info?.lat ?? f.latitude,
                    longitude: info?.lng ?? f.longitude
                  }));
                  if (info?.neighborhood) {
                    setNeighborhood(info.neighborhood);
                  }
                }}
                placeholder="Av. Julius Nyerere, 123, Polana"
              />

              <div className="space-y-2">
                <Label>Cidade</Label>
                <Select value={form.city} onValueChange={(v) => { setForm(f => ({ ...f, city: v })); setNeighborhood(''); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {getNeighborhoodsForCity(form.city).length > 0 && (
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Select value={neighborhood} onValueChange={setNeighborhood}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolhe o bairro" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {getNeighborhoodsForCity(form.city).map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    Ajuda os motoristas a encontrar a tua casa mais rápido.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={form.is_default}
                  onChange={(e) => setForm(f => ({ ...f, is_default: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="is_default" className="cursor-pointer">
                  Definir como endereço padrão
                </Label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={saveMutation.isPending || isValidating}>
                  {saveMutation.isPending || isValidating ? 'A processar...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : addresses && addresses.length > 0 ? (
        <div className="space-y-3">
          {addresses.map((address) => {
            const LabelIcon = labelIcons[address.label] || MapPin;
            return (
              <div
                key={address.id}
                className="bg-card rounded-xl border border-border p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <LabelIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{address.label}</span>
                        {address.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Padrão
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(address)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteMutation.mutate(address.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground pl-10">
                  {address.address_line}, {address.city}
                </p>
                {!address.is_default && (
                  <Button
                    variant="link"
                    size="sm"
                    className="pl-10 h-auto p-0"
                    onClick={() => setDefaultMutation.mutate(address.id)}
                  >
                    Definir como padrão
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nenhum endereço cadastrado</p>
          <p className="text-sm">Adicione um endereço para entregas mais rápidas</p>
        </div>
      )}
    </div>
  );
}
