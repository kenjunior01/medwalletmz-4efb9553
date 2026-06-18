import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Store, Loader2, MapPin, Clock, Upload } from 'lucide-react';

const storeTypes = [
  { value: 'food', label: 'Restaurante / Comida' },
  { value: 'grocery', label: 'Mercearia / Supermercado' },
  { value: 'pharmacy', label: 'Farmácia' },
];

const cities = [
  'Maputo', 'Beira', 'Nampula', 'Quelimane', 'Tete', 
  'Chimoio', 'Nacala', 'Pemba', 'Lichinga', 'Xai-Xai'
];

export default function StoreOwnerRegister() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    storeName: '',
    storeType: '',
    description: '',
    address: '',
    city: '',
    phone: '',
    deliveryTime: '30-45 min',
    deliveryFee: '50',
    imageUrl: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    if (!formData.storeName || !formData.storeType || !formData.city) {
      toast.error('Preencha todos os campos obrigatórios');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.address || !formData.phone) {
      toast.error('Preencha todos os campos obrigatórios');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Faça login para continuar');
      navigate('/auth');
      return;
    }

    setLoading(true);
    try {
      // Create the store
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert({
          name: formData.storeName,
          type: formData.storeType,
          description: formData.description,
          address: formData.address,
          city: formData.city,
          delivery_time: formData.deliveryTime,
          delivery_fee: parseFloat(formData.deliveryFee),
          image_url: formData.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
          owner_id: user.id,
          is_active: true,
          rating: 0
        })
        .select()
        .single();

      if (storeError) throw storeError;

      // Add store_owner role if not exists
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: user.id,
          role: 'store_owner'
        }, { onConflict: 'user_id,role' });

      if (roleError && !roleError.message.includes('duplicate')) {
        console.error('Role error:', roleError);
      }

      // Update profile with phone
      await supabase
        .from('profiles')
        .update({ phone: formData.phone })
        .eq('user_id', user.id);

      toast.success('Farmácia criada com sucesso!');
      navigate('/store/dashboard');
    } catch (error: any) {
      console.error('Error creating store:', error);
      toast.error('Erro ao criar farmácia: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">Cadastrar Farmácia</h1>
            <p className="text-sm text-muted-foreground">Passo {step} de 3</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="flex gap-2 mt-4">
          {[1, 2, 3].map(i => (
            <div 
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="p-4 pb-24">
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Informações da Farmácia</h2>
              <p className="text-muted-foreground">Conte-nos sobre o seu negócio</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storeName">Nome da Farmácia *</Label>
                <Input
                  id="storeName"
                  placeholder="Ex: Restaurante Sabores de Maputo"
                  value={formData.storeName}
                  onChange={(e) => handleInputChange('storeName', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Negócio *</Label>
                <Select value={formData.storeType} onValueChange={(v) => handleInputChange('storeType', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
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
                <Label>Cidade *</Label>
                <Select value={formData.city} onValueChange={(v) => handleInputChange('city', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva sua farmácia, especialidades, etc."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <Button className="w-full" onClick={() => validateStep1() && setStep(2)}>
              Continuar
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Localização e Contato</h2>
              <p className="text-muted-foreground">Onde podemos encontrar sua farmácia?</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Endereço Completo *</Label>
                <Textarea
                  id="address"
                  placeholder="Rua, número, bairro..."
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone de Contato *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+258 84 XXX XXXX"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">URL da Imagem da Farmácia</Label>
                <div className="flex gap-2">
                  <Input
                    id="imageUrl"
                    placeholder="https://..."
                    value={formData.imageUrl}
                    onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                  />
                  <Button variant="outline" size="icon">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para usar uma imagem padrão
                </p>
              </div>
            </div>

            <Button className="w-full" onClick={() => validateStep2() && setStep(3)}>
              Continuar
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Configurações de Entrega</h2>
              <p className="text-muted-foreground">Defina as opções de entrega</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tempo Estimado de Entrega</Label>
                <Select value={formData.deliveryTime} onValueChange={(v) => handleInputChange('deliveryTime', v)}>
                  <SelectTrigger>
                    <SelectValue />
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
                <Label htmlFor="deliveryFee">Taxa de Entrega (MZN)</Label>
                <Input
                  id="deliveryFee"
                  type="number"
                  placeholder="50"
                  value={formData.deliveryFee}
                  onChange={(e) => handleInputChange('deliveryFee', e.target.value)}
                />
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="font-semibold">Resumo da Farmácia</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nome:</span>
                  <span className="font-medium">{formData.storeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-medium">
                    {storeTypes.find(t => t.value === formData.storeType)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cidade:</span>
                  <span className="font-medium">{formData.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa de Entrega:</span>
                  <span className="font-medium">{formData.deliveryFee} MZN</span>
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando farmácia...
                </>
              ) : (
                'Criar Minha Farmácia'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
