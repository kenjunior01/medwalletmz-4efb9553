import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, Tag, Percent, Calendar } from 'lucide-react';

interface CouponFormData {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  expires_at: string;
  is_active: boolean;
}

const initialFormData: CouponFormData = {
  code: '',
  discount_type: 'percentage',
  discount_value: 10,
  min_order_value: 0,
  max_uses: null,
  expires_at: '',
  is_active: true
};

export default function AdminCoupons() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [formData, setFormData] = useState<CouponFormData>(initialFormData);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['admin-coupons', search],
    queryFn: async () => {
      let query = supabase.from('coupons').select('*').order('created_at', { ascending: false });
      
      if (search) {
        query = query.ilike('code', `%${search}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: CouponFormData) => {
      const payload: any = { ...data };
      if (!payload.expires_at) delete payload.expires_at;
      if (!payload.max_uses) delete payload.max_uses;
      
      const { error } = await supabase.from('coupons').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Cupom criado com sucesso');
      setIsDialogOpen(false);
      setFormData(initialFormData);
    },
    onError: () => {
      toast.error('Erro ao criar cupom');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CouponFormData> }) => {
      const { error } = await supabase.from('coupons').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Cupom atualizado');
      setIsDialogOpen(false);
      setEditingCoupon(null);
      setFormData(initialFormData);
    },
    onError: () => {
      toast.error('Erro ao atualizar cupom');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Cupom removido');
    },
    onError: () => {
      toast.error('Erro ao remover cupom');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (coupon: any) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_value: coupon.min_order_value || 0,
      max_uses: coupon.max_uses,
      expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : '',
      is_active: coupon.is_active
    });
    setIsDialogOpen(true);
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Cupons</h1>
          <p className="text-muted-foreground">Gerencie cupons de desconto</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingCoupon(null);
            setFormData(initialFormData);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cupom
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Código do Cupom</Label>
                <Input 
                  value={formData.code} 
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="EX: PROMO20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Desconto</Label>
                  <select
                    className="w-full h-10 px-3 border rounded-md"
                    value={formData.discount_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_type: e.target.value as any }))}
                  >
                    <option value="percentage">Percentagem (%)</option>
                    <option value="fixed">Valor Fixo (MZN)</option>
                  </select>
                </div>
                <div>
                  <Label>Valor do Desconto</Label>
                  <Input 
                    type="number"
                    value={formData.discount_value} 
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_value: parseInt(e.target.value) || 0 }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pedido Mínimo (MZN)</Label>
                  <Input 
                    type="number"
                    value={formData.min_order_value} 
                    onChange={(e) => setFormData(prev => ({ ...prev, min_order_value: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label>Máximo de Usos</Label>
                  <Input 
                    type="number"
                    value={formData.max_uses || ''} 
                    onChange={(e) => setFormData(prev => ({ ...prev, max_uses: parseInt(e.target.value) || null }))}
                    placeholder="Ilimitado"
                  />
                </div>
              </div>

              <div>
                <Label>Data de Expiração</Label>
                <Input 
                  type="date"
                  value={formData.expires_at} 
                  onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch 
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Cupom ativo</Label>
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingCoupon ? 'Atualizar' : 'Criar'} Cupom
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar cupons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 max-w-sm"
        />
      </div>

      {/* Coupons Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : coupons && coupons.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((coupon) => (
            <Card key={coupon.id} className={`overflow-hidden ${!coupon.is_active || isExpired(coupon.expires_at) ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    <span className="font-mono font-bold text-lg">{coupon.code}</span>
                  </div>
                  <div className={`px-2 py-0.5 text-xs rounded-full ${
                    !coupon.is_active 
                      ? 'bg-gray-100 text-gray-600'
                      : isExpired(coupon.expires_at)
                        ? 'bg-red-100 text-red-600'
                        : 'bg-green-100 text-green-600'
                  }`}>
                    {!coupon.is_active ? 'Inativo' : isExpired(coupon.expires_at) ? 'Expirado' : 'Ativo'}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-semibold">
                    {coupon.discount_type === 'percentage' 
                      ? `${coupon.discount_value}%` 
                      : `${coupon.discount_value} MZN`}
                  </span>
                </div>

                <div className="text-sm text-muted-foreground space-y-1 mb-3">
                  <p>Mínimo: {coupon.min_order_value} MZN</p>
                  <p>Usos: {coupon.used_count || 0}{coupon.max_uses ? ` / ${coupon.max_uses}` : ' (ilimitado)'}</p>
                  {coupon.expires_at && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Expira: {new Date(coupon.expires_at).toLocaleDateString('pt-PT')}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => openEditDialog(coupon)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm('Tem certeza que deseja remover este cupom?')) {
                        deleteMutation.mutate(coupon.id);
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
            <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Nenhum cupom encontrado</h3>
            <p className="text-muted-foreground">Comece criando seu primeiro cupom de desconto</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
